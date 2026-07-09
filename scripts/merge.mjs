// Мерджит маршруты и категории (data/routes.json) в data/explorers.json — без обращения к сети.
// Запуск: node scripts/merge.mjs
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const explorersPath = join(root, "data", "explorers.json");

const explorers = JSON.parse(await readFile(explorersPath, "utf8"));
const { items } = JSON.parse(await readFile(join(root, "data", "routes.json"), "utf8"));

let merged = 0;
for (const e of explorers) {
  const extra = items[e.id];
  if (extra) {
    e.type = extra.type;
    e.century = extra.century;
    e.route = extra.route;
    merged++;
  } else {
    console.warn(`нет маршрута для ${e.id}`);
  }
}

await writeFile(explorersPath, JSON.stringify(explorers, null, 2), "utf8");
console.log(`Обновлено записей: ${merged} из ${explorers.length}`);
