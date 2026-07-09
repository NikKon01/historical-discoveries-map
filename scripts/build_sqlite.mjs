/**
 * Сборка SQLite-базы data/discoveries.sqlite из js/data.js и js/explorers.js.
 * Файл затем грузится в браузере через sql.js (WASM) для SQL-запросов.
 *
 * Таблицы:
 *   explorers(name PK, country, flag, years, image, source)
 *   discoveries(id PK, year, title, explorer FK, location, lat, lng, description, source)
 *   waypoints(discovery_id FK, seq, lat, lng)
 *
 * Запуск:  node --experimental-sqlite scripts/build_sqlite.mjs
 */
import { DatabaseSync } from "node:sqlite";
import { readFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

async function loadConst(file, name) {
  const src = await readFile(join(ROOT, "js", file), "utf8");
  return new Function(`${src}\n;return ${name};`)();
}

const discoveries = await loadConst("data.js", "discoveries");
const explorersInfo = await loadConst("explorers.js", "explorersInfo");

await mkdir(join(ROOT, "data"), { recursive: true });
const dbPath = join(ROOT, "data", "discoveries.sqlite");
if (existsSync(dbPath)) await rm(dbPath);

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON;");
db.exec(`
  CREATE TABLE explorers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL, country TEXT, flag TEXT, years TEXT, image TEXT, source TEXT
  );
  CREATE TABLE discoveries (
    id TEXT PRIMARY KEY, year INTEGER, title TEXT, explorer_id INTEGER, location TEXT,
    lat REAL, lng REAL, description TEXT, source TEXT,
    FOREIGN KEY (explorer_id) REFERENCES explorers(id)
  );
  CREATE TABLE waypoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discovery_id TEXT, seq INTEGER, lat REAL, lng REAL,
    FOREIGN KEY (discovery_id) REFERENCES discoveries(id)
  );
  CREATE INDEX idx_disc_explorer ON discoveries(explorer_id);
  CREATE INDEX idx_wp_disc ON waypoints(discovery_id);
`);

// исследователи получают числовой id; запоминаем name -> id
const insExp = db.prepare(`INSERT INTO explorers (name,country,flag,years,image,source) VALUES (?,?,?,?,?,?)`);
const idByName = new Map();
for (const [name, info] of Object.entries(explorersInfo)) {
  const r = insExp.run(name, info.country ?? null, info.flag ?? null, info.years ?? null, info.image ?? null, info.source ?? null);
  idByName.set(name, Number(r.lastInsertRowid));
}

const insDisc = db.prepare(`INSERT OR REPLACE INTO discoveries (id,year,title,explorer_id,location,lat,lng,description,source) VALUES (?,?,?,?,?,?,?,?,?)`);
const insWp = db.prepare(`INSERT INTO waypoints (discovery_id,seq,lat,lng) VALUES (?,?,?,?)`);
for (const d of discoveries) {
  const id = `${d.year}|${d.title}`;
  const explorerId = idByName.get(d.explorer) ?? null;
  if (explorerId === null) console.warn(`  ⚠ нет explorer_id для «${d.explorer}» (${d.title})`);
  insDisc.run(id, d.year, d.title, explorerId, d.location ?? null, d.lat, d.lng, d.description ?? null, d.source ?? null);
  (d.route || []).forEach((p, i) => insWp.run(id, i, p[0], p[1]));
}

const stat = (q) => db.prepare(q).get().n;
console.log("База собрана:", dbPath);
console.log("  explorers :", stat("SELECT COUNT(*) n FROM explorers"));
console.log("  discoveries:", stat("SELECT COUNT(*) n FROM discoveries"));
console.log("  waypoints :", stat("SELECT COUNT(*) n FROM waypoints"));
db.close();
