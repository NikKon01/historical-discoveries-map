// Визуализация исторических плаваний: карта Leaflet + маршруты + временная шкала + фильтры + озвучка.
let data = [];
let markers = new Map(); // id -> L.marker
let activeId = null;

let routeLayer = null;   // слой текущего маршрута (линия + точки)
let shipMarker = null;   // движущийся корабль
let tourRAF = null;      // id текущей покадровой анимации

const map = L.map("map", { worldCopyJump: true }).setView([62, 70], 3);

L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  maxZoom: 10,
}).addTo(map);

const panel = document.getElementById("detail-panel");
const slider = document.getElementById("year-slider");
const yearValue = document.getElementById("year-value");
const playBtn = document.getElementById("play-btn");
const ticks = document.getElementById("timeline-ticks");
const filterType = document.getElementById("filter-type");
const filterCentury = document.getElementById("filter-century");
const filterVoice = document.getElementById("filter-voice");
const filtersCount = document.getElementById("filters-count");

function initials(name) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("");
}

function makeIcon(item, active) {
  const img = item.thumb || item.image;
  const html = img
    ? `<div class="pin${active ? " active" : ""}" style="background-image:url('${img}')"></div>`
    : `<div class="pin pin-fallback${active ? " active" : ""}">${initials(item.explorer)}</div>`;
  return L.divIcon({ className: "", html, iconSize: [42, 42], iconAnchor: [21, 21] });
}

// ---------- Озвучка ----------
// Только готовые нейроголоса (Silero) из data/audio/<id>.mp3. Браузерный синтез не используется.
let audioEl = null; // текущий проигрываемый <audio>

function stopSpeak() {
  if (audioEl) {
    // сначала снимаем обработчики, иначе остановка вызовет лишнее событие error
    audioEl.onloadedmetadata = null;
    audioEl.onerror = null;
    audioEl.pause();
    audioEl = null;
  }
}

// ---------- Карточка ----------
function renderCard(item) {
  panel.innerHTML = "";

  const photo = document.createElement("div");
  if (item.image) {
    photo.className = "card-photo";
    const bg = document.createElement("div");
    bg.className = "bg";
    bg.style.backgroundImage = `url("${item.image}")`;
    const img = document.createElement("img");
    img.src = item.image;
    img.alt = item.explorer;
    img.onerror = () => {
      photo.outerHTML = `<div class="card-photo-fallback">${initials(item.explorer)}</div>`;
    };
    photo.append(bg, img);
  } else {
    photo.className = "card-photo-fallback";
    photo.textContent = initials(item.explorer);
  }

  const body = document.createElement("div");
  body.className = "card-body";
  body.innerHTML = `
    <span class="badge">${item.year} год · ${item.type} · ${item.century} в.</span>
    <h2>${item.title}</h2>
    <p class="explorer-name">${item.explorer}</p>
    <p class="place">📍 ${item.place} · ${item.coordinates[0].toFixed(2)}, ${item.coordinates[1].toFixed(2)}</p>
    <p class="desc">${item.description || "Описание недоступно."}</p>
    <button class="route-btn" id="route-btn">🚢 Пройти маршрут</button>
    <p class="source">Источник: ${item.source || "—"}${
      item.wikiUrl ? ` · <a href="${item.wikiUrl}" target="_blank" rel="noopener">статья в Википедии →</a>` : ""
    }</p>`;

  panel.append(photo, body);
  document.getElementById("route-btn").addEventListener("click", () => playTour(item));
}

// ---------- Маршруты ----------
function routeCoords(item) {
  return (item.route || []).map((w) => w.c);
}

function clearRoute() {
  if (tourRAF) { cancelAnimationFrame(tourRAF); tourRAF = null; }
  stopSpeak();
  if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
  if (shipMarker) { map.removeLayer(shipMarker); shipMarker = null; }
}

function drawRoute(item, fit = true) {
  if (!item.route || item.route.length < 2) return;
  const coords = routeCoords(item);
  routeLayer = L.layerGroup().addTo(map);

  L.polyline(coords, { color: "#f59e0b", weight: 3, opacity: 0.9, dashArray: "8 8" })
    .addTo(routeLayer);

  item.route.forEach((w, i) => {
    const isEnd = i === item.route.length - 1;
    L.circleMarker(w.c, {
      radius: isEnd ? 7 : 5,
      color: "#fff",
      weight: 2,
      fillColor: isEnd ? "#ef4444" : "#f59e0b",
      fillOpacity: 1,
    })
      .bindTooltip(`${i + 1}. ${w.n}`, { direction: "top", sticky: true, className: "wp-tooltip", offset: [0, -4] })
      .addTo(routeLayer);
  });

  if (fit) map.fitBounds(L.latLngBounds(coords).pad(0.25), { animate: true });
}

// Разворачиваем долготы, чтобы маршрут не «огибал» Землю через 180-й меридиан
function buildPath(coords) {
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

function pointAt(path, frac) {
  const { uw, seg, total } = path;
  let target = frac * total;
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i] || i === seg.length - 1) {
      const t = seg[i] ? target / seg[i] : 0;
      return [uw[i][0] + (uw[i + 1][0] - uw[i][0]) * t, uw[i][1] + (uw[i + 1][1] - uw[i][1]) * t];
    }
    target -= seg[i];
  }
  return uw[uw.length - 1];
}

// easing для мягкого старта/финиша
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// Плавное движение кораблика вдоль маршрута + камера следует + озвучка
function playTour(item) {
  clearRoute();
  drawRoute(item, false);

  const coords = item.route ? routeCoords(item) : [item.coordinates];
  const btn = document.getElementById("route-btn");
  const voiceOn = filterVoice.checked;

  const shipIcon = L.divIcon({ className: "ship-marker", html: "⛵", iconSize: [22, 22] });
  shipMarker = L.marker(coords[0], { icon: shipIcon, zIndexOffset: 1000 }).addTo(map);

  if (coords.length < 2) return;

  const path = buildPath(coords);
  const fitZoom = map.getBoundsZoom(L.latLngBounds(coords).pad(0.3));
  const followZoom = Math.min(Math.max(fitZoom + 1, 3), 6);
  map.setView(coords[0], followZoom, { animate: true });

  const routeDur = Math.min(Math.max(path.total * 380, 6000), 18000);

  if (btn) { btn.disabled = true; btn.textContent = "🚢 В пути…"; }

  // запускаем анимацию на заданную длительность (мс)
  const runAnimation = (duration) => {
    const start = performance.now();
    function frame(now) {
      let frac = (now - start) / duration;
      if (frac > 1) frac = 1;
      const pos = pointAt(path, easeInOut(frac));
      shipMarker.setLatLng(pos);
      map.panTo(pos, { animate: false }); // камера держит корабль в центре
      if (frac < 1) {
        tourRAF = requestAnimationFrame(frame);
      } else {
        tourRAF = null;
        if (btn) { btn.disabled = false; btn.textContent = "🚢 Пройти маршрут заново"; }
      }
    }
    tourRAF = requestAnimationFrame(frame);
  };

  // Озвучка выключена или нет аудио — просто плывём по длине маршрута
  if (!voiceOn || !item.audio) { runAnimation(routeDur); return; }

  // Нейроголос (Silero): синхронизируем плавание с длительностью аудио
  const a = new Audio(item.audio);
  audioEl = a;
  a.onloadedmetadata = () => {
    if (audioEl !== a) return; // защита от устаревшего срабатывания
    const dur = Math.max(a.duration * 1000, routeDur);
    a.play().catch(() => {});
    runAnimation(dur);
  };
  a.onerror = () => {
    if (audioEl !== a) return; // файл не загрузился — плывём без звука
    runAnimation(routeDur);
  };
}

// ---------- Выбор точки ----------
function select(item) {
  if (activeId && markers.has(activeId)) {
    const prev = data.find((d) => d.id === activeId);
    markers.get(activeId).setIcon(makeIcon(prev, false));
  }
  activeId = item.id;
  markers.get(item.id).setIcon(makeIcon(item, true));
  renderCard(item);
  clearRoute();
  drawRoute(item);
}

// ---------- Фильтры + временная шкала ----------
function isVisible(item, year) {
  if (item.year > year) return false;
  if (filterType.value && item.type !== filterType.value) return false;
  if (filterCentury.value && item.century !== filterCentury.value) return false;
  return true;
}

function refresh() {
  const year = +slider.value;
  yearValue.textContent = year;
  let shown = 0;
  data.forEach((item) => {
    const m = markers.get(item.id);
    if (isVisible(item, year)) {
      if (!map.hasLayer(m)) m.addTo(map);
      shown++;
    } else if (map.hasLayer(m)) {
      map.removeLayer(m);
    }
  });
  filtersCount.textContent = `Показано: ${shown} из ${data.length}`;
}

function buildTicks(min, max) {
  const step = Math.round((max - min) / 5);
  let html = "";
  for (let y = min; y <= max; y += step) html += `<span>${y}</span>`;
  ticks.innerHTML = html;
}

async function load() {
  data = await fetch("data/explorers.json").then((r) => r.json());
  data.sort((a, b) => a.year - b.year);

  const years = data.map((d) => d.year);
  const min = Math.min(...years) - 5;
  const max = Math.max(...years) + 3;
  slider.min = min;
  slider.max = max;
  slider.value = max;
  buildTicks(min, max);

  data.forEach((item) => {
    const m = L.marker(item.coordinates, { icon: makeIcon(item, false) });
    m.bindTooltip(`${item.year} — ${item.explorer}`, { direction: "top" });
    m.on("click", () => select(item));
    markers.set(item.id, m);
  });

  refresh();
}

// ---------- События ----------
slider.addEventListener("input", refresh);
filterType.addEventListener("change", refresh);
filterCentury.addEventListener("change", refresh);
filterVoice.addEventListener("change", () => { if (!filterVoice.checked) stopSpeak(); });

let playing = null;
playBtn.addEventListener("click", () => {
  if (playing) {
    clearInterval(playing);
    playing = null;
    playBtn.textContent = "▶ Воспроизвести";
    return;
  }
  playBtn.textContent = "⏸ Пауза";
  slider.value = slider.min;
  refresh();
  playing = setInterval(() => {
    let y = +slider.value + 1;
    if (y > +slider.max) {
      clearInterval(playing);
      playing = null;
      playBtn.textContent = "▶ Воспроизвести";
      return;
    }
    slider.value = y;
    refresh();
  }, 60);
});

// ---------- Викторина «Кто этот мореплаватель?» ----------
const QUIZ_TOTAL = 8;
let quiz = null;

const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);

const quizEl = document.getElementById("quiz");
const quizProgress = document.getElementById("quiz-progress");
const quizTitle = document.getElementById("quiz-title");
const quizPhoto = document.getElementById("quiz-photo");
const quizOptions = document.getElementById("quiz-options");
const quizFeedback = document.getElementById("quiz-feedback");
const quizNext = document.getElementById("quiz-next");

function startQuiz() {
  clearRoute();
  stopSpeak();
  const pool = data.filter((d) => d.image); // вопросы только по тем, у кого есть портрет
  quiz = { idx: 0, score: 0, order: shuffle(pool).slice(0, QUIZ_TOTAL) };
  quizEl.classList.remove("hidden");
  showQuestion();
}

function closeQuiz() {
  quiz = null;
  quizEl.classList.add("hidden");
}

function showQuestion() {
  const q = quiz.order[quiz.idx];
  const others = shuffle(data.filter((d) => d.id !== q.id)).slice(0, 3);
  const options = shuffle([q, ...others]);

  quizProgress.textContent = `Вопрос ${quiz.idx + 1} из ${quiz.order.length} · Счёт: ${quiz.score}`;
  quizTitle.textContent = "Кто этот мореплаватель?";
  quizPhoto.style.display = "";
  quizPhoto.style.backgroundImage = `url('${q.image}')`;
  quizFeedback.textContent = "";
  quizFeedback.className = "quiz-feedback";
  quizNext.hidden = true;

  quizOptions.innerHTML = "";
  options.forEach((opt) => {
    const b = document.createElement("button");
    b.className = "quiz-opt";
    b.textContent = opt.explorer;
    b.addEventListener("click", () => answer(opt, q, b));
    quizOptions.append(b);
  });
}

function answer(chosen, correct, btnEl) {
  const correctName = correct.explorer;
  [...quizOptions.children].forEach((b) => {
    b.disabled = true;
    if (b.textContent === correctName) b.classList.add("correct");
  });
  if (chosen.id === correct.id) {
    quiz.score++;
    quizFeedback.textContent = "✓ Верно!";
    quizFeedback.className = "quiz-feedback ok";
  } else {
    btnEl.classList.add("wrong");
    quizFeedback.textContent = `✗ Это ${correctName} (${correct.year} — ${correct.title})`;
    quizFeedback.className = "quiz-feedback no";
  }
  quizProgress.textContent = `Вопрос ${quiz.idx + 1} из ${quiz.order.length} · Счёт: ${quiz.score}`;
  quizNext.hidden = false;
  quizNext.textContent = quiz.idx + 1 >= quiz.order.length ? "Показать результат" : "Дальше →";
}

function nextQuestion() {
  quiz.idx++;
  if (quiz.idx >= quiz.order.length) showResult();
  else showQuestion();
}

function showResult() {
  const n = quiz.order.length;
  const s = quiz.score;
  let verdict = "Неплохо для начала!";
  if (s === n) verdict = "Идеально! Вы настоящий штурман! ⚓";
  else if (s >= n * 0.75) verdict = "Отличный результат! 🧭";
  else if (s >= n * 0.5) verdict = "Хорошо, но есть куда расти.";

  quizProgress.textContent = "Викторина завершена";
  quizTitle.textContent = "Результат";
  quizPhoto.style.display = "none";
  quizOptions.innerHTML = "";
  quizFeedback.textContent = "";
  quizFeedback.className = "quiz-feedback";

  const res = document.createElement("div");
  res.className = "quiz-result";
  res.innerHTML = `Правильных ответов:<span class="score">${s} / ${n}</span>${verdict}`;
  quizOptions.append(res);

  quizNext.hidden = false;
  quizNext.textContent = "🔁 Играть снова";
}

document.getElementById("quiz-btn").addEventListener("click", startQuiz);
document.getElementById("quiz-close").addEventListener("click", closeQuiz);
quizNext.addEventListener("click", () => {
  if (quizNext.textContent.includes("снова")) startQuiz();
  else nextQuestion();
});
quizEl.addEventListener("click", (e) => { if (e.target === quizEl) closeQuiz(); });

load();
