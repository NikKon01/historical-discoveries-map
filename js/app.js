const minYear = Math.min(...discoveries.map(item => item.year));
const maxYear = Math.max(...discoveries.map(item => item.year));

const yearRange = document.getElementById("yearRange");
const searchInput = document.getElementById("searchInput");
const explorerFilter = document.getElementById("explorerFilter");
const regionFilter = document.getElementById("regionFilter");
const sortSelect = document.getElementById("sortSelect");
const showAllButton = document.getElementById("showAllButton");

yearRange.min = minYear;
yearRange.max = maxYear;
yearRange.value = maxYear;

document.getElementById("selectedYear").textContent = `Год: ${maxYear}`;

function getRegion(item) {
    const text = `${item.title} ${item.location} ${item.description}`.toLowerCase();

    if (text.includes("кариб")) return "Северная Америка";
    if (text.includes("антаркти")) return "Антарктика";
    if (text.includes("аркти") || text.includes("гренланд") || text.includes("полюс")) return "Арктика";
    if (text.includes("африк") || text.includes("конго") || text.includes("виктория") || text.includes("танганьика")) return "Африка";
    if (text.includes("австрал") || text.includes("тасман") || text.includes("новая зеланд") || text.includes("таити") || text.includes("гавай")) return "Австралия и Океания";
    if (text.includes("южной америки") || text.includes("бразил") || text.includes("венесуэл") || text.includes("магелланов")) return "Южная Америка";
    if (text.includes("северной америки") || text.includes("северная америка") || text.includes("канада") || text.includes("аляска") || text.includes("ньюфаундленд") || text.includes("калифорния") || text.includes("нью-йорк")) return "Северная Америка";
    if (text.includes("индия") || text.includes("китай") || text.includes("филиппин") || text.includes("азия")) return "Азия";
    if (text.includes("европа") || text.includes("испания") || text.includes("португал")) return "Европа";

    return "Другие регионы";
}

discoveries.forEach(item => {
    item.region = getRegion(item);
});

function updateStats() {
    const uniqueExplorers = new Set(discoveries.map(item => item.explorer));
    const explorerCounts = {};

    discoveries.forEach(item => {
        if (!explorerCounts[item.explorer]) {
            explorerCounts[item.explorer] = 0;
        }

        explorerCounts[item.explorer]++;
    });

    let topExplorer = "";
    let topExplorerCount = 0;

    Object.keys(explorerCounts).forEach(explorer => {
        if (explorerCounts[explorer] > topExplorerCount) {
            topExplorer = explorer;
            topExplorerCount = explorerCounts[explorer];
        }
    });

    const sortedByYear = [...discoveries].sort((a, b) => a.year - b.year);
    const firstDiscovery = sortedByYear[0];
    const lastDiscovery = sortedByYear[sortedByYear.length - 1];

    document.getElementById("totalStats").textContent =
        `Всего событий: ${discoveries.length}`;

    document.getElementById("explorerStats").textContent =
        `Исследователей: ${uniqueExplorers.size}`;

    document.getElementById("periodStats").textContent =
        `Период: ${minYear}–${maxYear}`;

    document.getElementById("topExplorerStats").textContent =
        `Самый активный: ${topExplorer} (${topExplorerCount})`;

    document.getElementById("firstDiscoveryStats").textContent =
        `Первое: ${firstDiscovery.title}, ${firstDiscovery.year}`;

    document.getElementById("lastDiscoveryStats").textContent =
        `Последнее: ${lastDiscovery.title}, ${lastDiscovery.year}`;
}

function renderRegionChart() {
    const chartContainer = document.getElementById("regionChart");

    if (!chartContainer) {
        return;
    }

    const regionCounts = {};

    discoveries.forEach(item => {
        if (!regionCounts[item.region]) {
            regionCounts[item.region] = 0;
        }

        regionCounts[item.region]++;
    });

    const sortedRegions = Object.entries(regionCounts)
        .sort((a, b) => b[1] - a[1]);

    const maxCount = Math.max(...sortedRegions.map(region => region[1]));

    chartContainer.innerHTML = "";

    sortedRegions.forEach(([region, count]) => {
        const percent = (count / maxCount) * 100;

        const row = document.createElement("div");
        row.className = "region-chart-row";

        row.innerHTML = `
            <div class="region-chart-header">
                <span>${region}</span>
                <strong>${count}</strong>
            </div>

            <div class="region-chart-line">
                <div class="region-chart-fill" style="width: ${percent}%"></div>
            </div>
        `;

        chartContainer.appendChild(row);
    });
}

function getExplorerCard(item) {
    const explorerData = explorersInfo[item.explorer];

    if (!explorerData) {
        return `
            <div class="explorer-card">
                <div class="explorer-placeholder">
                    Фото исследователя
                </div>

                <div class="explorer-name">${item.explorer}</div>

                <div class="explorer-country">
                    Страна: нет данных
                </div>
            </div>
        `;
    }

    return `
        <div class="explorer-card">
            <img
                class="explorer-photo"
                src="${explorerData.image}"
                alt="${item.explorer}"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            >

            <div class="explorer-placeholder" style="display: none;">
                Фото исследователя
            </div>

            <div class="explorer-name">${item.explorer}</div>

            <div class="explorer-country">
                ${explorerData.flag} ${explorerData.country}
            </div>

            <div class="explorer-years">
                ${explorerData.years}
            </div>
        </div>
    `;
}

function updateInfoPanel(item) {
    const infoContent = document.getElementById("infoContent");

    infoContent.innerHTML = `
        <h3 class="info-title">${item.title}</h3>

        ${getExplorerCard(item)}

        <div class="info-badge">${item.region}</div>

        <div class="info-item">
            <span class="info-label">Исследователь:</span><br>
            ${item.explorer}
        </div>

        <div class="info-item">
            <span class="info-label">Год события:</span><br>
            ${item.year}
        </div>

        <div class="info-item">
            <span class="info-label">Место:</span><br>
            ${item.location}
        </div>

        <div class="info-item">
            <span class="info-label">Координаты:</span><br>
            ${item.lat.toFixed(2)}, ${item.lng.toFixed(2)}
        </div>

        <div class="info-item">
            <span class="info-label">Количество точек маршрута:</span><br>
            ${item.route.length}
        </div>

        <div class="info-item">
            <span class="info-label">Описание:</span>
            <div class="info-description">
                ${item.description}
            </div>
        </div>

        <button id="voyageBtn" class="voyage-btn">🚢 Пройти маршрут с озвучкой</button>

        <div class="info-note">
            Нажмите кнопку выше — кораблик пройдёт маршрут, а голос зачитает описание.
        </div>
    `;
}

function clearActiveCards() {
    document
        .querySelectorAll(".discovery-card")
        .forEach(card => card.classList.remove("active"));
}

function activateCard(item) {
    clearActiveCards();

    const selectedCard = document.querySelector(
        `[data-card-id="${item.title}-${item.year}"]`
    );

    if (selectedCard) {
        selectedCard.classList.add("active");

        selectedCard.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}

function showDiscoveryInfo(item, marker) {
    showRoute(item);
    marker.openPopup();
    updateInfoPanel(item);
    activateCard(item);

    const voyageBtn = document.getElementById("voyageBtn");
    if (voyageBtn) {
        voyageBtn.addEventListener("click", () => playVoyage(item));
    }

    document.getElementById("selectedYear").textContent =
        `Выбрано: ${item.title}, ${item.year} год`;
}

function renderDiscoveries(data) {
    clearMarkers();
    clearActiveRoute();

    const list = document.getElementById("discoveryList");
    const count = document.getElementById("discoveryCount");

    list.innerHTML = "";
    count.textContent = `Найдено открытий: ${data.length}`;

    data.forEach(item => {
        const safeLat = Math.max(Math.min(item.lat, 80), -75);
        const safeLng = Math.max(Math.min(item.lng, 180), -180);

        const marker = L.marker(
            [safeLat, safeLng],
            {
                icon: createPortraitIcon(item)
            }
        ).addTo(map);

        marker.bindPopup(`
            <b>${item.title}</b><br>
            <b>Год:</b> ${item.year}<br>
            <b>Исследователь:</b> ${item.explorer}<br>
            <b>Регион:</b> ${item.region}<br>
            <b>Место:</b> ${item.location}<br><br>
            ${item.description}
        `);

        marker.on("click", () => {
            showDiscoveryInfo(item, marker);
        });

        markers.push(marker);

        const card = document.createElement("div");
        card.className = "discovery-card";
        card.dataset.cardId = `${item.title}-${item.year}`;

        card.innerHTML = `
            <h3>${item.title}</h3>
            <p><b>Год:</b> ${item.year}</p>
            <p><b>Исследователь:</b> ${item.explorer}</p>
            <p><b>Регион:</b> ${item.region}</p>
            <p>${item.location}</p>
        `;

        card.addEventListener("click", () => {
            showDiscoveryInfo(item, marker);
        });

        list.appendChild(card);
    });
}

function fillExplorerFilter() {
    explorerFilter.innerHTML = `<option value="all">Все исследователи</option>`;

    const explorers = [...new Set(discoveries.map(item => item.explorer))];

    explorers.sort().forEach(explorer => {
        const option = document.createElement("option");
        option.value = explorer;
        option.textContent = explorer;
        explorerFilter.appendChild(option);
    });
}

function fillRegionFilter() {
    regionFilter.innerHTML = `<option value="all">Все регионы</option>`;

    const regions = [...new Set(discoveries.map(item => item.region))];

    regions.sort().forEach(region => {
        const option = document.createElement("option");
        option.value = region;
        option.textContent = region;
        regionFilter.appendChild(option);
    });
}

function sortDiscoveries(data) {
    const sorted = [...data];
    const sortType = sortSelect.value;

    if (sortType === "yearAsc") {
        sorted.sort((a, b) => a.year - b.year);
    }

    if (sortType === "yearDesc") {
        sorted.sort((a, b) => b.year - a.year);
    }

    if (sortType === "titleAsc") {
        sorted.sort((a, b) => a.title.localeCompare(b.title, "ru"));
    }

    if (sortType === "explorerAsc") {
        sorted.sort((a, b) => a.explorer.localeCompare(b.explorer, "ru"));
    }

    return sorted;
}

function getFilteredDiscoveries() {
    const year = Number(yearRange.value);
    const searchText = searchInput.value.toLowerCase();
    const selectedExplorer = explorerFilter.value;
    const selectedRegion = regionFilter.value;

    const filtered = discoveries.filter(item => {
        const matchesYear = item.year <= year;

        const searchableText = `
            ${item.title}
            ${item.explorer}
            ${item.location}
            ${item.description}
            ${item.region}
        `.toLowerCase();

        const matchesSearch = searchableText.includes(searchText);

        const matchesExplorer =
            selectedExplorer === "all" || item.explorer === selectedExplorer;

        const matchesRegion =
            selectedRegion === "all" || item.region === selectedRegion;

        return matchesYear && matchesSearch && matchesExplorer && matchesRegion;
    });

    return sortDiscoveries(filtered);
}

function applyFilters() {
    const year = Number(yearRange.value);
    const filtered = getFilteredDiscoveries();

    document.getElementById("selectedYear").textContent = `Год: ${year}`;

    renderDiscoveries(filtered);
}

function resetFilters() {
    yearRange.value = maxYear;
    searchInput.value = "";
    explorerFilter.value = "all";
    regionFilter.value = "all";
    sortSelect.value = "yearAsc";

    document.getElementById("selectedYear").textContent = `Год: ${maxYear}`;

    document.getElementById("infoContent").innerHTML = `
        <p class="empty-info">
            Выберите открытие из списка слева или нажмите на маркер на карте.
        </p>
    `;

    renderDiscoveries(sortDiscoveries(discoveries));
    clearActiveCards();
}

yearRange.addEventListener("input", applyFilters);
searchInput.addEventListener("input", applyFilters);
explorerFilter.addEventListener("change", applyFilters);
regionFilter.addEventListener("change", applyFilters);
sortSelect.addEventListener("change", applyFilters);
showAllButton.addEventListener("click", resetFilters);

fillExplorerFilter();
fillRegionFilter();
updateStats();
renderRegionChart();
renderDiscoveries(sortDiscoveries(discoveries));