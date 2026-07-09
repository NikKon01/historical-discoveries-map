/**
 * Экспорт SQLite-базы в текстовый .sql (схема с ключами + данные).
 * Файл data/discoveries.sql можно открыть в ER-инструменте (DBeaver,
 * dbdiagram.io → Import SQL, MySQL Workbench) и редактировать схему.
 *
 * Запуск:  node --experimental-sqlite scripts/dump_sql.mjs
 */
import { DatabaseSync } from "node:sqlite";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const db = new DatabaseSync(join(ROOT, "data", "discoveries.sqlite"));

const val = (v) =>
  v === null || v === undefined ? "NULL"
  : typeof v === "number" ? String(v)
  : `'${String(v).replace(/'/g, "''")}'`;

// порядок таблиц с учётом внешних ключей
const TABLES = ["explorers", "discoveries", "waypoints"];

let out = "-- База данных исторических географических открытий\n";
out += "-- Автогенерация: scripts/dump_sql.mjs\n";
out += "-- Связи: discoveries.explorer_id -> explorers.id, waypoints.discovery_id -> discoveries.id\n\n";
out += "PRAGMA foreign_keys = ON;\n\n";

// 1) Схема (CREATE TABLE ... с PK/FK/UNIQUE) — то, что читает ER-инструмент
out += "-- ================== СХЕМА ==================\n";
const schema = db.prepare(
  "SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY (type='index'), name"
).all();
// сначала таблицы в нужном порядке
for (const t of TABLES) {
  const row = schema.find((s) => s.type === "table" && s.name === t);
  if (row) out += row.sql.trim() + ";\n\n";
}
// затем индексы
for (const s of schema) if (s.type === "index") out += s.sql.trim() + ";\n";
out += "\n";

// 2) Данные (INSERT) в порядке зависимостей
out += "-- ================== ДАННЫЕ ==================\n";
for (const t of TABLES) {
  const cols = db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
  const rows = db.prepare(`SELECT * FROM ${t}`).all();
  out += `\n-- ${t} (${rows.length})\n`;
  for (const r of rows) {
    const vals = cols.map((c) => val(r[c])).join(", ");
    out += `INSERT INTO ${t} (${cols.join(", ")}) VALUES (${vals});\n`;
  }
}

db.close();
const dest = join(ROOT, "data", "discoveries.sql");
await writeFile(dest, out, "utf8");
console.log("Дамп записан:", dest);
console.log("Размер:", out.length, "символов");
