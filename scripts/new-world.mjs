#!/usr/bin/env node
// 创建一个新的世界工作目录，并填充模板。
// 用法：
//   node .opencode/skills/good-world/scripts/new-world.mjs "雾岛精灵图鉴"
//   node ... "雾岛精灵图鉴" --slug mist-island --root ./worlds
//   node ... "雾岛精灵图鉴" --force
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.resolve(HERE, "..", "templates");

const FILES = [
  ["brief.md", "00-brief.md"],
  ["research.md", "01-research.md"],
  ["candidates.md", "02-candidates.md"],
  ["canvas.md", "03-canvas.md"],
  ["review.md", "04-review.md"],
  ["build-plan.md", "05-build-plan.md"],
  ["playtest.md", "06-playtest.md"],
  ["pitch.md", "07-pitch.md"],
  ["state.json", "state.json"],
];

function usage(code = 0) {
  console.log(`用法: node new-world.mjs "<世界名>" [--slug <目录名>] [--root <父目录>] [--force]

示例:
  node new-world.mjs "雾岛精灵图鉴"
  node new-world.mjs "雾岛精灵图鉴" --slug mist-island --root ./worlds`);
  process.exit(code);
}

const args = process.argv.slice(2);
let name = "";
let slug = "";
let root = path.resolve(process.cwd(), "worlds");
let force = false;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--slug") slug = args[++i] ?? "";
  else if (a === "--root") root = path.resolve(args[++i] ?? "");
  else if (a === "--force") force = true;
  else if (a === "-h" || a === "--help") usage(0);
  else if (a.startsWith("-")) {
    console.error(`未知参数: ${a}`);
    usage(1);
  } else name = a;
}

if (!name.trim()) usage(1);

function toSlug(s) {
  return s
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^[.\-]+|[.\-]+$/g, "")
    .slice(0, 60);
}

slug = toSlug(slug || name);
if (!slug) {
  console.error("无法从名称生成目录名，请用 --slug 指定。");
  process.exit(1);
}

const target = path.resolve(root, slug);
const today = new Date().toISOString().slice(0, 10);

if (!force) {
  try {
    await access(target, constants.F_OK);
    console.error(`目录已存在: ${target}\n加 --force 覆盖，或换一个 --slug。`);
    process.exit(1);
  } catch {
    // 不存在，继续
  }
}

await mkdir(target, { recursive: true });

const vars = {
  "{{WORLD_NAME}}": name.trim(),
  "{{SLUG}}": slug,
  "{{DATE}}": today,
  "{{VERBATIM}}": "",
  "{{ONE_LINER}}": "",
  "{{HOOK}}": "",
  "{{INVITE}}": "",
  "{{TIMEBOX}}": "",
  "{{OWNER}}": "",
  "{{OBSERVER}}": "",
  "{{REVIEWER}}": "",
  "{{VERSION}}": "v0.1",
  "{{WHO}}": "",
  "{{NAME}}": name.trim(),
  "{{AUDIENCE}}": "",
  "{{DISCOVERY}}": "",
  "{{FIRST_3_MIN}}": "",
  "{{LOOP}}": "",
  "{{SOCIAL}}": "",
  "{{SHAREABLE}}": "",
  "{{OPS}}": "",
  "{{RESOURCES}}": "",
  "{{TASK}}": "",
};

for (const [src, dest] of FILES) {
  let text = await readFile(path.join(TEMPLATE_DIR, src), "utf8");
  for (const [k, v] of Object.entries(vars)) text = text.split(k).join(v);
  await writeFile(path.join(target, dest), text, "utf8");
}

console.log(`已创建: ${target}`);
console.log(FILES.map(([, d]) => `  ${d}`).join("\n"));
console.log(`\n下一步: 从 00-brief.md 开始，先填 G0/G1，再进入 S2 调研。`);
