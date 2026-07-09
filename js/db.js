/* ==========================================================================
   SQL в браузере: загрузка SQLite-базы (data/discoveries.sqlite) через sql.js
   (WebAssembly) и интерактивная SQL-консоль. Полностью статично — для Pages.
   ========================================================================== */

let SQLdb = null;
let dbLoading = null;

// готовые запросы-примеры
const SQL_PRESETS = [
  { label: "Открытий по странам", sql:
"SELECT e.country AS страна, COUNT(*) AS открытий\nFROM discoveries d JOIN explorers e ON d.explorer_id = e.id\nGROUP BY e.country ORDER BY открытий DESC;" },
  { label: "XV–XVI века", sql:
"SELECT d.year AS год, d.title AS открытие, e.name AS исследователь\nFROM discoveries d JOIN explorers e ON d.explorer_id = e.id\nWHERE d.year BETWEEN 1400 AND 1600 ORDER BY d.year;" },
  { label: "Самые длинные маршруты", sql:
"SELECT d.title AS маршрут, COUNT(w.seq) AS точек\nFROM discoveries d JOIN waypoints w ON w.discovery_id = d.id\nGROUP BY d.id ORDER BY точек DESC LIMIT 10;" },
  { label: "Русские экспедиции", sql:
"SELECT d.year AS год, d.title AS открытие, e.name AS исследователь\nFROM discoveries d JOIN explorers e ON d.explorer_id = e.id\nWHERE e.country LIKE '%Росси%' ORDER BY d.year;" },
  { label: "Топ исследователей", sql:
"SELECT e.name AS исследователь, COUNT(*) AS открытий\nFROM discoveries d JOIN explorers e ON d.explorer_id = e.id\nGROUP BY e.id HAVING открытий > 1 ORDER BY открытий DESC;" },
];

async function loadDB() {
  if (SQLdb) return SQLdb;
  if (dbLoading) return dbLoading;
  dbLoading = (async () => {
    const SQL = await initSqlJs({
      locateFile: (f) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}`,
    });
    const buf = await fetch("data/discoveries.sqlite").then((r) => r.arrayBuffer());
    SQLdb = new SQL.Database(new Uint8Array(buf));
    return SQLdb;
  })();
  return dbLoading;
}

function renderTable(result) {
  const out = document.getElementById("sqlResult");
  if (!result || !result.length) { out.innerHTML = `<div class="sql-empty">Запрос выполнен. Строк нет.</div>`; return; }
  const { columns, values } = result[0];
  const head = columns.map((c) => `<th>${c}</th>`).join("");
  const rows = values.map((r) => `<tr>${r.map((v) => `<td>${v === null ? "—" : v}</td>`).join("")}</tr>`).join("");
  out.innerHTML = `<div class="sql-rows">Строк: ${values.length}</div>
    <div class="sql-table-wrap"><table class="sql-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

async function runSQL() {
  const input = document.getElementById("sqlInput");
  const status = document.getElementById("sqlStatus");
  const out = document.getElementById("sqlResult");
  status.textContent = "Загрузка базы…";
  try {
    const db = await loadDB();
    status.textContent = "Выполнение…";
    const res = db.exec(input.value);
    renderTable(res);
    status.textContent = "Готово";
  } catch (e) {
    out.innerHTML = `<div class="sql-error">Ошибка: ${e.message}</div>`;
    status.textContent = "";
  }
}

(function initSqlConsole() {
  const btn = document.getElementById("sqlBtn");
  const modal = document.getElementById("sqlModal");
  if (!btn || !modal) return;

  const presets = document.getElementById("sqlPresets");
  const input = document.getElementById("sqlInput");
  SQL_PRESETS.forEach((p, i) => {
    const b = document.createElement("button");
    b.className = "sql-preset";
    b.textContent = p.label;
    b.addEventListener("click", () => { input.value = p.sql; });
    presets.appendChild(b);
    if (i === 0) input.value = p.sql; // первый запрос по умолчанию
  });

  btn.addEventListener("click", () => modal.classList.remove("hidden"));
  document.getElementById("sqlClose").addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });
  document.getElementById("sqlRun").addEventListener("click", runSQL);
  // Ctrl+Enter — выполнить
  input.addEventListener("keydown", (e) => { if (e.ctrlKey && e.key === "Enter") runSQL(); });
})();
