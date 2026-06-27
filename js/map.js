const map = L.map("map", {
    center: [18, 0],
    zoom: 2,
    minZoom: 2,
    maxZoom: 8,
    worldCopyJump: false
});

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "&copy; OpenStreetMap"
    }
).addTo(map);

let markers = [];
let activeRoute = null;

function normalizeLatitude(lat) {
    if (lat > 80) return 80;
    if (lat < -75) return -75;
    return lat;
}

function normalizeLongitude(lng) {
    if (lng > 180) return 180;
    if (lng < -180) return -180;
    return lng;
}

function normalizePoint(point) {
    return [
        normalizeLatitude(point[0]),
        normalizeLongitude(point[1])
    ];
}

function getRegionColor(region) {
    if (region === "Европа") return "#1976d2";
    if (region === "Азия") return "#d32f2f";
    if (region === "Африка") return "#388e3c";
    if (region === "Северная Америка") return "#f57c00";
    if (region === "Южная Америка") return "#7b1fa2";
    if (region === "Австралия и Океания") return "#0097a7";
    if (region === "Арктика") return "#303f9f";
    if (region === "Антарктика") return "#757575";

    return "#1f4e79";
}

function createRegionIcon(region) {
    const color = getRegionColor(region);

    return L.divIcon({
        className: "custom-marker",
        html: `<div class="marker-dot" style="background:${color}"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        popupAnchor: [0, -8]
    });
}

function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

function clearActiveRoute() {
    if (activeRoute) {
        map.removeLayer(activeRoute);
        activeRoute = null;
    }
    clearVoyage();
}

function showRoute(item) {
    clearActiveRoute();

    const normalizedRoute = item.route.map(point =>
        normalizePoint(point)
    );

    activeRoute = L.polyline(normalizedRoute, {
        color: getRegionColor(item.region),
        weight: 4,
        opacity: 0.9
    }).addTo(map);

    map.fitBounds(activeRoute.getBounds(), {
        padding: [50, 50]
    });
}

/* ====================== Маркеры-портреты ====================== */

function initialsOf(name) {
    return name
        .split(/[\s—-]+/)
        .filter(Boolean)
        .map(w => w[0].toUpperCase())
        .slice(0, 2)
        .join("");
}

// Портрет исследователя в кружке с цветной рамкой региона (легенда сохраняется)
function createPortraitIcon(item) {
    const color = getRegionColor(item.region);
    const info = explorersInfo[item.explorer];
    const img = info && info.image;
    const ini = initialsOf(item.explorer);

    const html = img
        ? `<div class="pin" style="border-color:${color}">
               <img src="${img}" alt=""
                    onerror="this.parentElement.classList.add('pin-fallback');this.parentElement.style.color='${color}';this.parentElement.textContent='${ini}';">
           </div>`
        : `<div class="pin pin-fallback" style="border-color:${color};color:${color}">${ini}</div>`;

    return L.divIcon({
        className: "",
        html,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    });
}

/* ====================== Плавание кораблика вдоль маршрута ====================== */

let shipMarker = null;
let voyageRAF = null;
let waypointLayer = null;
let voyageAudio = null;

function clearVoyage() {
    if (voyageRAF) { cancelAnimationFrame(voyageRAF); voyageRAF = null; }
    if (voyageAudio) {
        voyageAudio.onloadedmetadata = null;
        voyageAudio.onerror = null;
        voyageAudio.pause();
        voyageAudio = null;
    }
    if (shipMarker) { map.removeLayer(shipMarker); shipMarker = null; }
    if (waypointLayer) { map.removeLayer(waypointLayer); waypointLayer = null; }
}

// Разворачиваем долготы, чтобы маршрут не «огибал» планету через 180-й меридиан
function unwrapPath(coords) {
    const uw = [coords[0].slice()];
    for (let i = 1; i < coords.length; i++) {
        const prev = uw[i - 1][1];
        let cur = coords[i][1];
        while (cur - prev > 180) cur -= 360;
        while (cur - prev < -180) cur += 360;
        uw.push([coords[i][0], cur]);
    }
    const seg = [];
    let total = 0;
    for (let i = 1; i < uw.length; i++) {
        const d = Math.hypot(uw[i][0] - uw[i - 1][0], uw[i][1] - uw[i - 1][1]);
        seg.push(d);
        total += d;
    }
    return { uw, seg, total };
}

function pointAtPath(path, frac) {
    const { uw, seg, total } = path;
    let t = frac * total;
    for (let i = 0; i < seg.length; i++) {
        if (t <= seg[i] || i === seg.length - 1) {
            const k = seg[i] ? t / seg[i] : 0;
            return [uw[i][0] + (uw[i + 1][0] - uw[i][0]) * k,
                    uw[i][1] + (uw[i + 1][1] - uw[i][1]) * k];
        }
        t -= seg[i];
    }
    return uw[uw.length - 1];
}

const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clampLat = lat => Math.max(Math.min(lat, 85), -85);

// Запуск плавания: линия + точки + кораблик с озвучкой, камера следует за судном
function playVoyage(item) {
    clearActiveRoute(); // также останавливает предыдущее плавание (clearVoyage)

    const coords = item.route;
    const color = getRegionColor(item.region);

    activeRoute = L.polyline(coords.map(normalizePoint), {
        color, weight: 4, opacity: 0.85, dashArray: "6 8"
    }).addTo(map);

    waypointLayer = L.layerGroup().addTo(map);
    coords.forEach((c, i) => {
        const end = i === coords.length - 1;
        L.circleMarker(normalizePoint(c), {
            radius: end ? 7 : 5,
            color: "#fff",
            weight: 2,
            fillColor: end ? "#e53935" : color,
            fillOpacity: 1
        })
            .bindTooltip(end ? `Прибытие: ${item.location}` : `Точка ${i + 1}`,
                { direction: "top", className: "wp-tip" })
            .addTo(waypointLayer);
    });

    const shipIcon = L.divIcon({ className: "ship-marker", html: "⛵", iconSize: [24, 24] });
    shipMarker = L.marker(normalizePoint(coords[0]), { icon: shipIcon, zIndexOffset: 1000 }).addTo(map);

    const path = unwrapPath(coords);
    const fitZoom = map.getBoundsZoom(activeRoute.getBounds().pad(0.3));
    const followZoom = Math.min(Math.max(fitZoom + 1, 3), map.getMaxZoom());
    map.setView(normalizePoint(coords[0]), followZoom, { animate: true });

    const routeDur = Math.min(Math.max(path.total * 220, 7000), 20000);

    const run = (duration) => {
        const start = performance.now();
        const frame = (now) => {
            let f = (now - start) / duration;
            if (f > 1) f = 1;
            const p = pointAtPath(path, easeInOut(f));
            const ll = [clampLat(p[0]), p[1]];
            shipMarker.setLatLng(ll);
            map.panTo(ll, { animate: false });
            if (f < 1) voyageRAF = requestAnimationFrame(frame);
            else voyageRAF = null;
        };
        voyageRAF = requestAnimationFrame(frame);
    };

    // озвучка (если включена и есть файл) синхронизирует длительность с аудио
    const key = `${item.year}|${item.title}`;
    const src = (typeof audioFiles !== "undefined") ? audioFiles[key] : null;
    const voiceOn = window.voiceEnabled !== false;

    if (voiceOn && src) {
        const a = new Audio(src);
        voyageAudio = a;
        a.onloadedmetadata = () => {
            if (voyageAudio !== a) return;
            a.play().catch(() => {});
            run(Math.max(a.duration * 1000, routeDur));
        };
        a.onerror = () => {
            if (voyageAudio !== a) return;
            run(routeDur);
        };
    } else {
        run(routeDur);
    }
}