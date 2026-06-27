/**
 * Пересборка датасета из Wikipedia + MediaWiki coordinates API.
 * Берёт текущие js/data.js и js/explorers.js как основу и:
 *   - уточняет координаты места открытия (геокодинг по полю location);
 *   - докачивает фото исследователей в images/explorers/;
 *   - добавляет поле source (ссылка на статью Wikipedia);
 *   - удлиняет слишком короткие описания за счёт сводки Wikipedia;
 *   - прогоняет проверки качества и пишет отчёт.
 *
 * Безопасность: уточнённые координаты применяются только если они в пределах
 * MAX_COORD_SHIFT° от исходных (иначе — пометка на ручную проверку).
 *
 * Запуск:  node scripts/build_dataset.mjs           (перезапись с бэкапом)
 *          node scripts/build_dataset.mjs --dry      (только отчёт, без записи)
 */
import { readFile, writeFile, copyFile, mkdir, access } from "node:fs/promises";
import { constants as FS } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");
const WIKI = "https://ru.wikipedia.org";
const HEADERS = { "User-Agent": "DiscoveriesDatasetBuilder/1.0 (educational project)" };
const MAX_COORD_SHIFT = 8;   // °, порог доверия к геокодингу
const MIN_DESC = 120;        // минимальная длина описания
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- сеть ---------- */
async function getJSON(url, attempt = 1) {
  const res = await fetch(url, { headers: HEADERS });
  if ((res.status === 429 || res.status === 503) && attempt <= 6) {
    const retryAfter = Number(res.headers.get("retry-after"));
    const wait = retryAfter ? retryAfter * 1000 : 1000 * Math.pow(1.7, attempt);
    await sleep(Math.min(wait, 15000));
    return getJSON(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function summary(title) {
  const url = `${WIKI}/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`;
  try {
    const j = await getJSON(url);
    return j && j.type !== "disambiguation" && j.extract ? j : null;
  } catch { return null; }
}

// Каноничный заголовок статьи через opensearch («Иван Крузенштерн» → нужная статья)
async function resolveTitle(name) {
  try {
    const u = `${WIKI}/w/api.php?action=opensearch&format=json&limit=1&namespace=0&search=${encodeURIComponent(name)}`;
    const r = await getJSON(u);
    return r?.[1]?.[0] || null;
  } catch { return null; }
}

// Координаты места через MediaWiki API (это значения GeoHack), с поиском-фолбэком
async function geocode(name) {
  const tryTitle = async (t) => {
    const u = `${WIKI}/w/api.php?action=query&format=json&formatversion=2&prop=coordinates&redirects=1&titles=${encodeURIComponent(t)}`;
    const j = await getJSON(u);
    const page = j?.query?.pages?.[0];
    const c = page?.coordinates?.[0];
    return c ? { lat: c.lat, lng: c.lon, via: page.title } : null;
  };
  const variants = [name];
  if (name.includes(",")) variants.push(name.split(",")[0].trim());
  for (const v of variants) {
    try { const r = await tryTitle(v); if (r) return r; } catch {}
    await sleep(120);
  }
  // поиск лучшего совпадения
  try {
    const su = `${WIKI}/w/api.php?action=query&format=json&formatversion=2&list=search&srlimit=1&srsearch=${encodeURIComponent(variants[variants.length - 1])}`;
    const sj = await getJSON(su);
    const hit = sj?.query?.search?.[0]?.title;
    if (hit) return await tryTitle(hit);
  } catch {}
  return null;
}

async function exists(p) { try { await access(p, FS.F_OK); return true; } catch { return false; } }

async function download(url, dest, attempt = 1) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    if ((res.status === 429 || res.status === 503 || res.status >= 500) && attempt <= 5) {
      await sleep(800 * attempt);
      return download(url, dest, attempt + 1);
    }
    throw new Error(`HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error("слишком маленький файл");
  await writeFile(dest, buf);
}

/* ---------- транслитерация для имён файлов ---------- */
const TR = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"c",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" };
function slugify(name) {
  return name.toLowerCase().split("").map((ch) => TR[ch] ?? (/[a-z0-9]/.test(ch) ? ch : " ")).join("")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}

const clampLat = (lat) => Math.max(Math.min(lat, 85), -85);
const clampLng = (lng) => Math.max(Math.min(lng, 180), -180);
const firstPerson = (name) => name.split(/\s+и\s+/)[0].trim(); // «X и Y» -> «X»

/* ---------- загрузка исходных JS как данных ---------- */
async function loadConst(file, name) {
  const src = await readFile(join(ROOT, "js", file), "utf8");
  return new Function(`${src}\n;return ${name};`)();
}

async function main() {
  const discoveries = await loadConst("data.js", "discoveries");
  const explorersInfo = await loadConst("explorers.js", "explorersInfo");
  const report = { coordsUpdated: [], coordsFlagged: [], descAugmented: [], photosDownloaded: [], antimeridian: [], failures: [], warnings: [] };

  // region нужен только в рантайме приложения; здесь не вычисляем
  const names = [...new Set(discoveries.map((d) => d.explorer))];

  // 1) Обогащаем исследователей: фото, биография, источник
  const bioByName = {};
  await mkdir(join(ROOT, "images", "explorers"), { recursive: true });

  let ei = 0;
  for (const name of names) {
    process.stderr.write(`\r[исследователи ${++ei}/${names.length}] ${name.slice(0, 28).padEnd(28)}`);
    const article = firstPerson(name);
    let s = await summary(article);
    if (!s) {
      const t = await resolveTitle(article);
      if (t && t !== article) s = await summary(t);
    }
    if (!s) { report.failures.push(`нет статьи Wikipedia: ${name}`); continue; }

    bioByName[name] = (s.extract || "").trim();
    const info = explorersInfo[name] || (explorersInfo[name] = { country: "нет данных", flag: "", years: "" });
    info.source = s.content_urls?.desktop?.page || `${WIKI}/wiki/${encodeURIComponent(article)}`;

    // фото: если текущего файла нет — пытаемся скачать
    const curPath = info.image ? join(ROOT, info.image) : null;
    const haveImg = curPath && (await exists(curPath));
    if (!haveImg) {
      const imgUrl = s.thumbnail?.source || s.originalimage?.source;
      const ext = imgUrl && /\.(jpe?g|png)(\?|$)/i.test(imgUrl) ? imgUrl.match(/\.(jpe?g|png)/i)[0].toLowerCase().replace("jpeg", "jpg") : null;
      if (imgUrl && ext) {
        const slug = info.image ? info.image.split("/").pop().replace(/\.\w+$/, "") : slugify(article);
        const rel = `images/explorers/${slug}${ext}`;
        try {
          if (!DRY) await download(imgUrl, join(ROOT, rel));
          info.image = rel;
          report.photosDownloaded.push(`${name} -> ${rel}`);
        } catch (e) { report.warnings.push(`фото не скачано (${name}): ${e.message}`); }
      } else {
        report.warnings.push(`нет подходящего фото: ${name}`);
      }
    }
    await sleep(400);
  }

  // 2) Обрабатываем открытия: координаты, описание, source, маршрут
  let di = 0;
  for (const d of discoveries) {
    process.stderr.write(`\r[открытия ${++di}/${discoveries.length}] ${d.title.slice(0, 32).padEnd(32)}`);
    // source — ссылка на исследователя (лучший доступный URL)
    d.source = explorersInfo[d.explorer]?.source || `${WIKI}/wiki/${encodeURIComponent(firstPerson(d.explorer))}`;

    // геокодинг места открытия
    const g = await geocode(d.location);
    if (g) {
      const shift = Math.hypot(g.lat - d.lat, g.lng - d.lng);
      if (shift <= MAX_COORD_SHIFT) {
        const oldLL = `${d.lat.toFixed(2)},${d.lng.toFixed(2)}`;
        d.lat = clampLat(g.lat);
        d.lng = clampLng(g.lng);
        report.coordsUpdated.push(`${d.title} (${d.year}): ${oldLL} -> ${d.lat.toFixed(2)},${d.lng.toFixed(2)} [${g.via}]`);
      } else {
        report.coordsFlagged.push(`${d.title} (${d.year}): API даёт ${g.lat.toFixed(2)},${g.lng.toFixed(2)} (${g.via}), отличие ${shift.toFixed(1)}° — оставлено исходное, проверить вручную`);
      }
    } else {
      report.warnings.push(`координаты не найдены для места «${d.location}» (${d.title})`);
    }

    // широта/долгота всегда в допустимом диапазоне (фикс полюсов)
    d.lat = clampLat(d.lat);
    d.lng = clampLng(d.lng);

    // нормализация маршрута: клампим широты, финиш = координаты открытия
    if (Array.isArray(d.route) && d.route.length) {
      d.route = d.route.map((p) => [clampLat(p[0]), clampLng(p[1])]);
      d.route[d.route.length - 1] = [d.lat, d.lng];
    }

    // описание: удлиняем короткие за счёт биографии исследователя
    if ((d.description || "").length < MIN_DESC) {
      const bio = bioByName[d.explorer];
      if (bio) {
        let desc = (d.description || "").trim();
        const sentences = bio.split(/(?<=\.)\s+/);
        let k = 0;
        while (desc.length < MIN_DESC && k < sentences.length) {
          desc = `${desc} ${sentences[k]}`.trim();
          k++;
        }
        d.description = desc;
        report.descAugmented.push(`${d.title} (${d.year})`);
      }
    }

    await sleep(400);
  }

  // 3) Проверки качества
  const problems = [];
  const seen = new Set();
  for (const d of discoveries) {
    const id = `${d.year}|${d.title}`;
    if (seen.has(id)) problems.push(`дубль: ${id}`);
    seen.add(id);
    if (Math.abs(d.lat) > 85 || Math.abs(d.lng) > 180) problems.push(`координаты вне диапазона: ${id}`);
    if ((d.description || "").length < MIN_DESC) problems.push(`короткое описание (<${MIN_DESC}): ${id}`);
    if (!Array.isArray(d.route) || d.route.length < 3) problems.push(`маршрут <3 точек: ${id}`);
    if (!explorersInfo[d.explorer]) problems.push(`нет explorersInfo: ${d.explorer}`);
    if (!d.source) problems.push(`нет source: ${id}`);
    if (Array.isArray(d.route)) {
      for (let i = 1; i < d.route.length; i++) {
        // пересечение 180-го меридиана — норма для тихоокеанских маршрутов
        // (анимация разворачивает долготы), поэтому это предупреждение, не ошибка
        if (Math.abs(d.route[i][1] - d.route[i - 1][1]) > 180) {
          report.antimeridian.push(`${id} (точка ${i + 1})`);
        }
      }
    }
  }

  // 4) Запись файлов
  if (!DRY) {
    // бэкап только при первом запуске — не затирать оригинал повторными прогонами
    for (const f of ["data.js", "explorers.js"]) {
      if (!(await exists(join(ROOT, "js", f + ".bak")))) {
        await copyFile(join(ROOT, "js", f), join(ROOT, "js", f + ".bak"));
      }
    }
    const dataOut = "// Пересобрано scripts/build_dataset.mjs (Wikipedia + GeoHack).\nconst discoveries = " + JSON.stringify(discoveries, null, 4) + ";\n";
    const explOut = "// Пересобрано scripts/build_dataset.mjs (Wikipedia + GeoHack).\nconst explorersInfo = " + JSON.stringify(explorersInfo, null, 4) + ";\n";
    await writeFile(join(ROOT, "js", "data.js"), dataOut, "utf8");
    await writeFile(join(ROOT, "js", "explorers.js"), explOut, "utf8");
  }

  // 5) Отчёт
  const line = (t, a) => `\n${t}: ${a.length}\n` + a.map((x) => "  • " + x).join("\n");
  console.log("===== ОТЧЁТ build_dataset =====");
  console.log(line("Координаты уточнены", report.coordsUpdated));
  console.log(line("Координаты на ручную проверку", report.coordsFlagged));
  console.log(line("Фото скачано", report.photosDownloaded));
  console.log(line("Описания удлинены", report.descAugmented));
  console.log(line("Пересечения 180° меридиана (норма)", report.antimeridian));
  console.log(line("Предупреждения", report.warnings));
  console.log(line("Ошибки", report.failures));
  console.log(line("ПРОБЛЕМЫ ПОСЛЕ СБОРКИ (проверки §8)", problems));
  console.log(`\n${DRY ? "[DRY] файлы не изменены" : "Файлы перезаписаны (бэкапы: js/*.js.bak)"}`);
  console.log("Не забудьте перегенерировать озвучку: python scripts/tts_discoveries.py");
}

main().catch((e) => { console.error("ФАТАЛЬНО:", e); process.exit(1); });
