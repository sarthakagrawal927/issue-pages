import { readdir, stat } from "node:fs/promises";

const assets = new URL("../public/assets/", import.meta.url);
const limits = [
  ["reader.js", 10_000],
  ["mermaid.js", 100_000],
];

for (const [file, maximumBytes] of limits) {
  const { size } = await stat(new URL(file, assets));
  if (size > maximumBytes) {
    throw new Error(`${file} is ${size} bytes; the performance budget is ${maximumBytes} bytes.`);
  }
}

const embed = await stat(new URL("../public/embed.js", import.meta.url));
if (embed.size > 10_000) {
  throw new Error(`embed.js is ${embed.size} bytes; the performance budget is 10000 bytes.`);
}

const chunks = (await readdir(new URL("chunks/", assets))).filter((file) => file.endsWith(".js"));
if (chunks.length === 0) {
  throw new Error("Mermaid must retain diagram-level code splitting.");
}

console.log(`Client asset budgets passed (${chunks.length} Mermaid chunks).`);
