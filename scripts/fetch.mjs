// Парсер данных: берёт seed-список и обогащает его фото + описанием из Wikipedia REST API.
// Запуск: node scripts/fetch.mjs
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Wikipedia требует осмысленный User-Agent, иначе блокирует запросы.
const HEADERS = {
  "User-Agent": "HistoricalVoyagesEduApp/1.0 (educational project)",
  Accept: "application/json",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchSummary(title, attempt = 1) {
  const url =
    "https://ru.wikipedia.org/api/rest_v1/page/summary/" +
    encodeURIComponent(title.replace(/ /g, "_"));
  const res = await fetch(url, { headers: HEADERS });
  if (res.status === 429 && attempt <= 4) {
    const wait = 1500 * attempt; // нарастающая пауза при ограничении частоты
    console.log(`  …429 для «${title}», повтор через ${wait} мс`);
    await sleep(wait);
    return fetchSummary(title, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} для «${title}»`);
  return res.json();
}

async function main() {
  const seedPath = join(root, "data", "explorers.seed.json");
  const seed = JSON.parse(await readFile(seedPath, "utf8"));
  const out = [];

  for (const item of seed) {
    try {
      const s = await fetchSummary(item.wiki);
      const enriched = {
        ...item,
        description: s.extract || "",
        image:
          s.originalimage?.source || s.thumbnail?.source || null,
        thumb: s.thumbnail?.source || null,
        wikiUrl: s.content_urls?.desktop?.page || null,
        source: "Wikipedia (ru) / Wikimedia Commons, CC BY-SA",
      };
      out.push(enriched);
      console.log(
        `OK  ${item.year}  ${item.explorer.padEnd(24)} ${
          enriched.image ? "📷 фото есть" : "⚠ без фото"
        }`
      );
    } catch (err) {
      console.error(`FAIL ${item.explorer}: ${err.message}`);
      out.push({ ...item, description: "", image: null, error: err.message });
    }
    await sleep(700); // вежливая пауза между запросами
  }

  // сортируем по году для временной шкалы
  out.sort((a, b) => a.year - b.year);

  const outPath = join(root, "data", "explorers.json");
  await writeFile(outPath, JSON.stringify(out, null, 2), "utf8");

  const withPhoto = out.filter((x) => x.image).length;
  console.log(`\nГотово: ${out.length} записей, из них с фото: ${withPhoto}`);
  console.log(`Файл: ${outPath}`);
}

main();
