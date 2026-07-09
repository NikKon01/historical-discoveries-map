/**
 * Импорт отредактированных в QGIS маршрутов/точек обратно в js/data.js.
 * Читает routes.geojson (обязательно) и points.geojson (если есть).
 *
 * - GeoJSON [lng,lat] -> проект [lat,lng] (перестановка автоматически).
 * - Привязка к записям по свойству "id" = "год|название".
 * - Бэкап оригинала в js/data.js.bak (только если его ещё нет).
 * - Проверки качества и отчёт.
 *
 * Запуск:  node scripts/import-geojson.mjs
 *          node scripts/import-geojson.mjs --snap-end   (финиш маршрута = точка открытия)
 */
import { readFile, writeFile, copyFile, access } from "node:fs/promises";
import { constants as FS } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SNAP_END = process.argv.includes("--snap-end");

const exists = async (p) => { try { await access(p, FS.F_OK); return true; } catch { return false; } };
const r4 = (n) => Math.round(n * 1e4) / 1e4;
const clampLat = (lat) => Math.max(Math.min(lat, 85), -85);
const clampLng = (lng) => Math.max(Math.min(lng, 180), -180);
const idOf = (d) => `${d.year}|${d.title}`;

// Все звенья геометрии линии в один массив точек [lat,lng]
function lineToLatLng(geom) {
  let parts = [];
  if (geom.type === "LineString") parts = [geom.coordinates];
  else if (geom.type === "MultiLineString") parts = geom.coordinates;
  else return null;
  const pts = [];
  for (const seg of parts) for (const [ln, la] of seg) pts.push([clampLat(r4(la)), clampLng(r4(ln))]);
  return pts;
}

async function readGeo(file) {
  if (!(await exists(join(ROOT, file)))) return null;
  return JSON.parse(await readFile(join(ROOT, file), "utf8"));
}

async function main() {
  const routesGeo = await readGeo("routes.geojson");
  if (!routesGeo) { console.error("Не найден routes.geojson — сначала экспортируйте (node scripts/export-geojson.mjs)"); process.exit(1); }
  const pointsGeo = await readGeo("points.geojson");

  const src = await readFile(join(ROOT, "js", "data.js"), "utf8");
  const discoveries = new Function(`${src}\n;return discoveries;`)();
  const byId = new Map(discoveries.map((d) => [idOf(d), d]));

  const report = { routesUpdated: 0, pointsUpdated: 0, unmatched: [], problems: [], antimeridian: [] };

  // Маршруты
  for (const f of routesGeo.features) {
    const id = f.properties?.id;
    const d = byId.get(id);
    if (!d) { report.unmatched.push(`линия без совпадения: ${id ?? "(нет id)"}`); continue; }
    const pts = lineToLatLng(f.geometry);
    if (!pts || pts.length < 2) { report.problems.push(`маршрут <2 точек: ${id}`); continue; }
    d.route = pts;
    report.routesUpdated++;
  }

  // Точки открытий
  if (pointsGeo) {
    for (const f of pointsGeo.features) {
      const id = f.properties?.id;
      const d = byId.get(id);
      if (!d || f.geometry?.type !== "Point") continue;
      const [ln, la] = f.geometry.coordinates;
      d.lat = clampLat(r4(la));
      d.lng = clampLng(r4(ln));
      report.pointsUpdated++;
    }
  }

  // Опционально подтянуть финиш маршрута к точке открытия
  if (SNAP_END) {
    for (const d of discoveries) {
      if (Array.isArray(d.route) && d.route.length) d.route[d.route.length - 1] = [d.lat, d.lng];
    }
  }

  // Проверки §8
  for (const d of discoveries) {
    const id = idOf(d);
    if (Math.abs(d.lat) > 85 || Math.abs(d.lng) > 180) report.problems.push(`координаты вне диапазона: ${id}`);
    if (!Array.isArray(d.route) || d.route.length < 3) report.problems.push(`маршрут <3 точек: ${id}`);
    if (Array.isArray(d.route))
      for (let i = 1; i < d.route.length; i++)
        if (Math.abs(d.route[i][1] - d.route[i - 1][1]) > 180) report.antimeridian.push(`${id} (точка ${i + 1})`);
  }

  // Бэкап оригинала (один раз) + запись
  if (!(await exists(join(ROOT, "js", "data.js.bak")))) {
    await copyFile(join(ROOT, "js", "data.js"), join(ROOT, "js", "data.js.bak"));
  }
  const out = "// Обновлено scripts/import-geojson.mjs (правка маршрутов из QGIS).\nconst discoveries = " + JSON.stringify(discoveries, null, 4) + ";\n";
  await writeFile(join(ROOT, "js", "data.js"), out, "utf8");

  const line = (t, a) => `${t}: ${a.length}` + (a.length ? "\n  • " + a.join("\n  • ") : "");
  console.log("===== ИМПОРТ ИЗ QGIS =====");
  console.log(`Маршрутов обновлено: ${report.routesUpdated}`);
  console.log(`Точек открытий обновлено: ${report.pointsUpdated}`);
  console.log(line("Без совпадения по id (пропущено)", report.unmatched));
  console.log(line("Пересечения 180° (норма)", report.antimeridian));
  console.log(line("ПРОБЛЕМЫ (проверки §8)", report.problems));
  console.log(`\nФайл js/data.js обновлён (бэкап: js/data.js.bak).`);
  console.log(`Координаты открытий менялись? Перегенерируйте озвучку только если правили описания — маршруты на озвучку не влияют.`);
}

main().catch((e) => { console.error("ФАТАЛЬНО:", e); process.exit(1); });
