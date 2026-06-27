// Экспортирует массив discoveries из js/data.js в scripts/_discoveries.json
// (нужен для генерации озвучки). Запуск: node scripts/export-data.mjs
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = await readFile(join(root, "js", "data.js"), "utf8");

// data.js объявляет `const discoveries = [...]`; выполняем и забираем массив
const discoveries = new Function(src + "\n;return discoveries;")();

const slim = discoveries.map((d, i) => ({
  i,
  key: `${d.year}|${d.title}`,
  year: d.year,
  title: d.title,
  explorer: d.explorer,
  description: d.description,
}));

await writeFile(join(root, "scripts", "_discoveries.json"), JSON.stringify(slim, null, 2), "utf8");
console.log(`Экспортировано открытий: ${slim.length}`);
