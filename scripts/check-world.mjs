#!/usr/bin/env node
// 检查一个世界目录的产物完整度与门禁字段。
// 用法: node .opencode/skills/good-world/scripts/check-world.mjs <世界目录>
// 退出码: 0 = 可继续；1 = 有阻塞问题
import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const REQUIRED = {
  "state.json": [],
  "00-brief.md": ["## 原话", "## 一句话假设", "## 首批人群", "## 约束", "## 非目标", "## 成功指标"],
  "01-research.md": ["## 证据表", "## 同类拆解", "## 结论"],
  "02-candidates.md": ["## 候选 A", "## 候选 B", "## 候选 C", "## 选择"],
  "03-canvas.md": ["## 1. 基础信息", "## 2. 人群", "## 3. 钩子", "## 4. 循环", "## 5. 社交", "## 6. 传播", "## 7. 运营"],
  "04-review.md": ["## 结论", "## 三个致命伤", "## 修复动作"],
  "05-build-plan.md": ["## 技术边界", "## 范围与时间盒", "## 任务单", "## 风险与回退"],
  "06-playtest.md": ["## 观察记录", "## 首分钟卡点", "## 迭代日志"],
  "07-pitch.md": ["## 90 秒汇报", "## 邀请语", "## 首周运营表"],
};

const PHASE_ORDER = ["capture", "interview", "research", "concept", "design", "review", "build", "playtest", "package"];
const GATE_KEYS = Array.from({ length: 10 }, (_, i) => `G${i}`);

const dir = process.argv[2];
if (!dir) {
  console.error("用法: node check-world.mjs <世界目录>");
  process.exit(1);
}

const root = path.resolve(dir);
const errors = [];
const warnings = [];
const oks = [];

async function exists(p) {
  try { await access(p, constants.F_OK); return true; } catch { return false; }
}

const statePath = path.join(root, "state.json");
let state;
if (!(await exists(statePath))) {
  errors.push("缺少 state.json");
} else {
  try {
    state = JSON.parse(await readFile(statePath, "utf8"));
  } catch (e) {
    errors.push(`state.json 不是合法 JSON: ${e.message}`);
  }
  if (state) {
    if (!PHASE_ORDER.includes(state.phase)) errors.push(`state.phase 非法: ${state.phase}`);
    if (!["spark", "draft", "fix"].includes(state.mode)) errors.push(`state.mode 非法: ${state.mode}`);
    for (const g of GATE_KEYS) {
      const v = state.gates?.[g];
      if (!v) errors.push(`state.gates 缺少 ${g}`);
      else if (!["pending", "pass", "fail", "waived"].includes(v.status)) {
        errors.push(`${g}.status 非法: ${v.status}`);
      } else if (v.status === "waived" && !v.evidence) {
        errors.push(`${g} 为 waived 但没写 evidence/理由`);
      }
    }
    if (state.phase !== "capture" && (!state.next_action || !String(state.next_action).trim())) {
      warnings.push("state.next_action 为空");
    }
    if (state.platform !== "douyin-vcreate") {
      warnings.push(`state.platform 不是 douyin-vcreate（当前: ${state.platform ?? "空"}）`);
    }
    const nameLen = [...String(state.name || "")].length;
    if (nameLen < 4 || nameLen > 20) {
      warnings.push(`世界名 ${nameLen} 字，审核口径建议 4–20 字`);
    }
    const idx = PHASE_ORDER.indexOf(state.phase);
    const passed = GATE_KEYS.filter((g) => state.gates?.[g]?.status === "pass").length;
    oks.push(`phase=${state.phase} (${idx + 1}/${PHASE_ORDER.length})，已过门禁 ${passed}/10`);
  }
}

for (const [file, headings] of Object.entries(REQUIRED)) {
  if (file === "state.json") continue;
  const p = path.join(root, file);
  if (!(await exists(p))) {
    errors.push(`缺少 ${file}`);
    continue;
  }
  const text = await readFile(p, "utf8");
  if (!text.trim()) {
    errors.push(`${file} 为空`);
    continue;
  }
  const left = text.match(/\{\{[^{}]+\}\}/g);
  if (left) errors.push(`${file} 还有未替换占位符: ${[...new Set(left)].join(", ")}`);
  for (const h of headings) {
    if (!text.includes(h)) errors.push(`${file} 缺少小节: ${h}`);
  }
  oks.push(`${file} 存在 (${text.length} 字符)`);
}

// 轻量内容检查（警告级）
try {
  const canvas = await readFile(path.join(root, "03-canvas.md"), "utf8");
  const m = canvas.match(/\|\s*一句话介绍（≤25 字）\s*\|\s*([^|]*)\|/);
  if (m) {
    const v = m[1].trim();
    const count = [...v.replace(/[\s，。！？、；：""''（）《》…—·]/g, "")].length;
    if (!v) warnings.push("一句话介绍为空");
    else if (count > 25) errors.push(`一句话介绍 ${count} 字（不含标点），超过 25 字`);
  }
  if (!canvas.includes("### 1.5 平台适配（抖音虚拟世界）")) {
    warnings.push("03-canvas.md 缺少「1.5 平台适配」小节");
  }
  const players = canvas.match(/\|\s*同房人数（≤30[^）]*）\s*\|\s*([^|]*)\|/);
  if (players) {
    const n = Number((players[1].match(/\d+/) || [])[0]);
    if (Number.isFinite(n) && n > 30) errors.push(`同房人数 ${n} 超过平台上限 30`);
  } else {
    warnings.push("03-canvas.md 未填同房人数（≤30）");
  }
  const budget = canvas.match(/\|\s*资源预算[^|]*\|\s*([^|]*)\|/);
  if (budget && !budget[1].trim()) warnings.push("资源预算为空");
  const hookSection = canvas.split("### 一句话钩子")[1]?.split("###")[0] ?? "";
  const hook = hookSection.match(/^>[ \t]*(.+)$/m);
  if (hook && hook[1].trim()) oks.push(`钩子: ${hook[1].slice(0, 40)}`);
  else warnings.push("一句话钩子为空");
} catch { /* 上面已报缺失 */ }

try {
  const brief = await readFile(path.join(root, "00-brief.md"), "utf8");
  const quote = brief.match(/^>\s*「(.+)」/m);
  if (!quote || !quote[1].trim()) warnings.push("00-brief.md 的「原话」还是空的");
} catch { /* ignore */ }

try {
  const plan = await readFile(path.join(root, "05-build-plan.md"), "utf8");
  for (const h of ["## 预算", "## 联网模式", "## 发布检查"]) {
    if (!plan.includes(h)) warnings.push(`05-build-plan.md 缺少小节: ${h}`);
  }
} catch { /* ignore */ }

try {
  const research = await readFile(path.join(root, "01-research.md"), "utf8");
  const rows = research.split("\n").filter((l) => {
    const cells = l.split("|").map((c) => c.trim());
    return /^R\d+-\d+$/.test(cells[1] ?? "") && cells[3];
  }).length;
  if (rows === 0) warnings.push("01-research.md 还没有证据行");
  else oks.push(`证据行: ${rows}`);
} catch { /* ignore */ }

try {
  const playtest = await readFile(path.join(root, "06-playtest.md"), "utf8");
  const rows = playtest.split("\n").filter((l) => /^\|\s*\d+\s*\|/.test(l)).length;
  if (rows < 3) warnings.push(`06-playtest.md 只有 ${rows} 场试玩记录（建议 ≥3）`);
} catch { /* ignore */ }

console.log(`\n检查: ${root}\n`);
for (const s of oks) console.log(`  ✓ ${s}`);
for (const w of warnings) console.log(`  ! ${w}`);
for (const e of errors) console.log(`  ✗ ${e}`);

const structural = errors.length === 0;
const passed = state?.gates ? GATE_KEYS.filter((g) => state.gates[g]?.status === "pass").length : 0;

console.log(
  `\n${structural ? "结构完整。" : `结构未通过：${errors.length} 个阻塞问题。`}` +
  `门禁 ${passed}/10 通过。` +
  `${structural && passed === 0 ? "仍在 S1，填完内容后更新 state.json 再推进。" : ""}\n`
);
process.exit(structural ? 0 : 1);
