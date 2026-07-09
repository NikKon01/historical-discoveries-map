/**
 * Экспорт маршрутов и точек открытий из js/data.js в GeoJSON для правки в QGIS.
 * Создаёт routes.geojson (линии) и points.geojson (точки) в корне проекта.
 *
 * Координаты в проекте хранятся как [lat, lng], а GeoJSON требует [lng, lat] —
 * перестановка делается здесь автоматически. СК: EPSG:4326.
 *
 * Запуск:  node scripts/export-geojson.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const src = await readFile(join(ROOT, "js", "data.js"), "utf8");
const discoveries = new Function(`${src}\n;return discoveries;`)();

const idOf = (d) => `${d.year}|${d.title}`;

// Линии маршрутов: [lat,lng] -> [lng,lat]
const routes = {
  type: "FeatureCollection",
  name: "routes",
  crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
  features: discoveries
    .filter((d) => Array.isArray(d.route) && d.route.length >= 2)
    .map((d) => ({
      type: "Feature",
      properties: { id: idOf(d), year: d.year, title: d.title, explorer: d.explorer },
      geometry: { type: "LineString", coordinates: d.route.map(([la, ln]) => [ln, la]) },
    })),
};

// Точки открытий: маркеры на карте
const points = {
  type: "FeatureCollection",
  name: "points",
  crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
  features: discoveries.map((d) => ({
    type: "Feature",
    properties: { id: idOf(d), year: d.year, title: d.title, explorer: d.explorer, location: d.location },
    geometry: { type: "Point", coordinates: [d.lng, d.lat] },
  })),
};

await writeFile(join(ROOT, "routes.geojson"), JSON.stringify(routes, null, 2), "utf8");
await writeFile(join(ROOT, "points.geojson"), JSON.stringify(points, null, 2), "utf8");

console.log(`Экспортировано:`);
console.log(`  routes.geojson — ${routes.features.length} маршрутов (линии)`);
console.log(`  points.geojson — ${points.features.length} точек открытий`);
console.log(`\nОткройте оба файла в QGIS (Слой → Добавить векторный слой). СК: EPSG:4326.`);
console.log(`Поле "id" НЕ редактируйте — по нему идёт обратная привязка. После правки`);
console.log(`сохраните слой(и) поверх тех же файлов и запустите: node scripts/import-geojson.mjs`);
