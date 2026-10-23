#!/usr/bin/env node
// 调研执行器（agent 驱动）
// 脚本不直接联网搜索；它负责：出计划 → 归一化 agent 抓回的结果 → 校验证据。
//
// 用法:
//   node research-run.mjs plan   --world worlds/xxx [--force] [--keywords "a,b"]
//   node research-run.mjs ingest --world worlds/xxx --spike R1 --file raw.json [--query "..."]
//   node research-run.mjs check  --world worlds/xxx [--no-url-check]
//   node research-run.mjs status --world worlds/xxx
import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

const START = "<!-- AUTO-RESEARCH:START -->";
const END = "<!-- AUTO-RESEARCH:END -->";
const SPIKES = ["R1", "R2", "R3", "R4"];
const SPIKE_INFO = {
  R1: "需求验证：这群人真的有这个需求吗？现在怎么解决的？",
  R2: "同类拆解：跑出来的同类世界，机制上做对了什么？",
  R3: "可行性：以我们的时间/人手/平台，做得出吗？",
  R4: "诊断：这个卡点别人怎么修的？",
};

main().catch((e) => {
  console.error(`\n错误: ${e.message}\n`);
  process.exit(1);
});

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") return usage();
  const flags = parseFlags(rest);
  const world = await resolveWorld(flags);
  if (cmd === "plan") return cmdPlan(world, flags);
  if (cmd === "ingest") return cmdIngest(world, flags);
  if (cmd === "check") return cmdCheck(world, flags);
  if (cmd === "status") return cmdStatus(world, flags);
  throw new Error(`未知命令: ${cmd}（可用: plan / ingest / check / status）`);
}

function usage() {
  console.log(`调研执行器（agent 驱动）

  plan    生成 research/plan.json：4 个 spike 的问题、查询词、预算
  ingest  把 agent 抓回的原始 JSON 归一化、去重、分级，写入候选
  check   校验 01-research.md 的证据表（字段、URL、日期、重复）
  status  查看调研进度

示例:
  node research-run.mjs plan   --world worlds/social-tower-defense
  node research-run.mjs ingest --world worlds/social-tower-defense --spike R1 --file research/raw/R1-01.json
  node research-run.mjs check  --world worlds/social-tower-defense
  node research-run.mjs status --world worlds/social-tower-defense

说明:
  - 搜索由宿主的 web/tavily 工具执行，脚本不联网、不读 token。
  - ingest 只产出「候选」，不是证据；结论/影响/反证必须人工或 agent 补。
  - check 默认做 URL 可达性检查，离线时加 --no-url-check。`);
}

// ---------- CLI ----------

function parseFlags(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out[k] = next;
        i++;
      } else out[k] = true;
    } else out._.push(a);
  }
  return out;
}

async function resolveWorld(flags) {
  let dir = flags.world;
  if (!dir) {
    const base = path.resolve("worlds");
    const names = await readdir(base).catch(() => []);
    const dirs = [];
    for (const n of names) {
      const s = await stat(path.join(base, n)).catch(() => null);
      if (s?.isDirectory()) dirs.push(n);
    }
    if (dirs.length === 1) dir = path.join(base, dirs[0]);
    else throw new Error("请用 --world 指定世界目录（或确保 ./worlds 下只有一个世界）");
  }
  const p = path.resolve(dir);
  const s = await stat(p).catch(() => null);
  if (!s?.isDirectory()) throw new Error(`世界目录不存在: ${p}`);
  return p;
}

// ---------- plan ----------

async function cmdPlan(world, flags) {
  const researchDir = path.join(world, "research");
  const planPath = path.join(researchDir, "plan.json");
  await mkdir(path.join(researchDir, "raw"), { recursive: true });

  if (!flags.force && (await exists(planPath))) {
    console.log(`已存在: ${rel(planPath)}\n需要重建加 --force。`);
    return;
  }

  const brief = await readFile(path.join(world, "00-brief.md"), "utf8").catch(() => "");
  const name = extractName(brief) || path.basename(world);
  const quote = extractQuote(brief);
  const keywords = String(flags.keywords || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const maxQueries = clampInt(flags["max-queries"], 4, 1, 8);
  const maxResults = clampInt(flags["max-results"], 4, 1, 8);

  const isAscii = asciiRatio(name) > 0.6;
  const spikes = {};
  for (const s of SPIKES) {
    spikes[s] = {
      question: SPIKE_INFO[s],
      queries: buildQueries(s, name, quote, keywords, isAscii).slice(0, maxQueries),
      done: [],
      maxResults,
      extractTop: 0,
    };
  }

  const plan = {
    version: 1,
    world: name,
    created: new Date().toISOString().slice(0, 10),
    budget: { maxQueriesPerSpike: maxQueries, maxResults, maxExtracts: 0, maxTotalCalls: 12 },
    spikes,
  };
  await writeFile(planPath, JSON.stringify(plan, null, 2) + "\n", "utf8");

  console.log(`已生成: ${rel(planPath)}`);
  console.log(`世界: ${name}`);
  for (const s of SPIKES) {
    console.log(`  ${s} ${spikes[s].queries.length} 条查询  ${spikes[s].question}`);
  }
  console.log(`
下一步（agent 执行）:
  1. 逐条跑 query，用宿主搜索工具（tavily-search / web search）
  2. 每次结果原样存到 research/raw/<spike>-<序号>.json
  3. node research-run.mjs ingest --world <dir> --spike ${SPIKES[0]} --file research/raw/${SPIKES[0]}-01.json --query "<query>"
  4. 把候选提升为证据，再 check
一次只跑一个 spike，不要全跑。`);
}

function buildQueries(spike, name, quote, keywords, isAscii) {
  const base = keywords[0] || name;
  const q = quote || name;
  if (isAscii) {
    const en = {
      R1: [`${base} player demand`, `${base} review`, `${base} similar game`, `site:reddit.com ${base}`],
      R2: [`${base} core loop`, `${base} retention`, `${base} gameplay breakdown`, `${base} postmortem`],
      R3: [`${base} solo dev scope`, `${base} multiplayer sync`, `${base} production time`],
      R4: [`${base} churn reasons`, `UGC world first minute retention`, `Roblox D1 retention onboarding`],
    };
    return en[spike];
  }
  const zh = {
    R1: [`${q} 需求`, `${base} 类似 世界 推荐`, `site:xiaohongshu.com ${base}`, `site:bilibili.com ${base}`],
    R2: [`${base} 核心循环`, `${base} 玩法 拆解`, `${base} 留存`, `${base} 为什么 好玩`],
    R3: [`${base} 开发 工作量`, `${base} 多人 同步`, `${base} 独立开发 时间`],
    R4: [`${base} 流失 原因`, `UGC 世界 首日 留存`, `Roblox D1 留存 新手引导`],
  };
  const list = zh[spike];
  if (keywords.length > 1) list.push(`${keywords.join(" ")} 玩法`);
  return list;
}

// ---------- ingest ----------

async function cmdIngest(world, flags) {
  const spike = String(flags.spike || "").toUpperCase();
  if (!SPIKES.includes(spike)) throw new Error("--spike 必须是 R1/R2/R3/R4");

  const rawText = flags.file
    ? await readFile(path.resolve(flags.file), "utf8")
    : await readStdin();
  if (!rawText.trim()) throw new Error("输入为空（--file 或 stdin）");

  let payload;
  try {
    payload = JSON.parse(rawText);
  } catch {
    payload = rawText
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l));
  }

  const results = normalizeResults(payload);
  if (!results.length) {
    throw new Error("没有解析到结果。支持 {results:[...]}、数组、或搜索工具返回。");
  }

  const query = String(
    flags.query ||
    payload.query ||
    payload.structuredContent?.query ||
    payload.data?.query ||
    payload._query ||
    (flags.file ? path.basename(String(flags.file), ".json") : "")
  ).trim();
  const researchDir = path.join(world, "research");
  const candPath = path.join(researchDir, "candidates.json");
  await mkdir(path.join(researchDir, "raw"), { recursive: true });

  const planForName = await readJson(path.join(researchDir, "plan.json"), null);
  const worldName = planForName?.world || path.basename(world);
  const store = await readJson(candPath, { world: worldName, updated: "", items: [] });
  if (!store.world || store.world === "w") store.world = worldName;
  const seen = new Map(store.items.map((i) => [normUrl(i.url), i]));
  let added = 0;
  let dupes = 0;

  for (const r of results) {
    if (!r.url) continue;
    const key = normUrl(r.url);
    if (seen.has(key)) {
      const it = seen.get(key);
      if (!it.query && query) it.query = query;
      it.also_in = unique([...(it.also_in || []), query].filter(Boolean));
      if ((r.score ?? 0) > (it.score ?? 0)) it.score = r.score;
      dupes++;
      continue;
    }
    const item = {
      id: nextId(store.items, spike),
      spike,
      query,
      title: clean(r.title || r.url),
      url: r.url,
      domain: domainOf(r.url),
      snippet: truncate(clean(r.content || r.content_snippet || r.snippet || ""), 600),
      score: r.score ?? null,
      published_date: r.published_date || null,
      tier_guess: tierOf(r.url),
      status: "candidate",
      also_in: [],
      added_at: new Date().toISOString(),
    };
    seen.set(key, item);
    store.items.push(item);
    added++;
  }

  store.updated = new Date().toISOString();
  await writeFile(candPath, JSON.stringify(store, null, 2) + "\n", "utf8");
  await renderCandidates(world, store);

  const planPath = path.join(researchDir, "plan.json");
  const plan = planForName;
  if (plan?.spikes?.[spike] && query) {
    plan.spikes[spike].done = unique([...(plan.spikes[spike].done || []), query]);
    await writeFile(planPath, JSON.stringify(plan, null, 2) + "\n", "utf8");
  }

  await archiveRaw(world, spike, flags.file ? path.resolve(flags.file) : "", rawText);

  console.log(`ingest ${spike}: 新增 ${added}，重复 ${dupes}，累计 ${store.items.length}`);
  console.log(`候选: ${rel(candPath)}`);
  console.log(`下一步: 把候选提升为证据（补结论/日期/级别/置信度/影响/反证），再 check。`);
}

function normalizeResults(payload, depth = 0) {
  if (!payload || depth > 5) return [];
  if (Array.isArray(payload)) return payload.flatMap((x) => normalizeResults(x, depth + 1));
  if (Array.isArray(payload.results)) return payload.results.flatMap((x) => normalizeResults(x, depth + 1));
  if (payload.structuredContent) return normalizeResults(payload.structuredContent, depth + 1);
  if (payload.data?.results) return normalizeResults(payload.data.results, depth + 1);
  if (Array.isArray(payload.content)) {
    for (const c of payload.content) {
      if (c?.type === "text" && c.text) {
        try {
          return normalizeResults(JSON.parse(c.text), depth + 1);
        } catch { /* 非 JSON，忽略 */ }
      }
    }
  }
  if (typeof payload.raw === "string") {
    try { return normalizeResults(JSON.parse(payload.raw), depth + 1); } catch { /* ignore */ }
  }
  if (payload.url) return [payload];
  return [];
}

async function renderCandidates(world, store) {
  const mdPath = path.join(world, "research", "candidates.md");
  const lines = [
    `# ${store.world || path.basename(world)}｜调研候选`,
    "",
    `> 更新时间：${store.updated || new Date().toISOString()}`,
    "> **这些是机器抓取的候选，不是证据。** 提升前必须补：结论、日期、级别、置信度、对设计的影响、反证。",
    "",
  ];
  for (const s of SPIKES) {
    const items = store.items.filter((i) => i.spike === s).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    if (!items.length) continue;
    lines.push(`## ${s}（${items.length}）`, "", "| ID | 标题 | 链接 | 域名 | 级别猜测 | 分数 | 摘要 |", "|-|-|-|-|-|-|-|");
    for (const i of items) {
      lines.push(`| ${i.id} | ${esc(truncate(i.title, 60))} | ${i.url} | ${i.domain} | ${i.tier_guess} | ${i.score ?? "-"} | ${esc(truncate(i.snippet, 120))} |`);
    }
    lines.push("");
  }
  if (!store.items.length) lines.push("（暂无候选）", "");
  await writeFile(mdPath, lines.join("\n") + "\n", "utf8");

  const evidencePath = path.join(world, "01-research.md");
  if (!(await exists(evidencePath))) return;
  const block = [
    START,
    `## 自动抓取候选（${new Date().toISOString().slice(0, 10)}，待审）`,
    "",
    "> 候选不是证据。提升为证据前，必须补「结论 / 日期 / 级别 / 置信度 / 对设计的影响 / 反证」。",
    "",
    "| ID | 标题 | 链接 | 级别猜测 | 摘要 |",
    "|-|-|-|-|-|",
    ...store.items.map((i) => `| ${i.id} | ${esc(truncate(i.title, 50))} | ${i.url} | ${i.tier_guess} | ${esc(truncate(i.snippet, 80))} |`),
    "",
    END,
  ].join("\n");

  const text = await readFile(evidencePath, "utf8");
  let next;
  if (text.includes(START) && text.includes(END)) {
    next = text.replace(new RegExp(`${escapeRe(START)}[\\s\\S]*?${escapeRe(END)}`), block);
  } else {
    next = text.trimEnd() + "\n\n" + block + "\n";
  }
  await writeFile(evidencePath, next, "utf8");
}

// ---------- check ----------

async function cmdCheck(world, flags) {
  const file = path.join(world, "01-research.md");
  const text = await readFile(file, "utf8").catch(() => null);
  if (text === null) throw new Error(`缺少 ${rel(file)}`);

  const errors = [];
  const warnings = [];
  const rows = [];
  const seenUrls = new Map();

  for (const line of text.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = splitRow(line);
    if (cells.length < 9) continue;
    const [id, question, conclusion, source, date, level, confidence, impact, counter] = cells;
    if (!/^R\d+-\d+$/.test(id)) continue;
    if (isPlaceholderRow({ conclusion, source, level, confidence })) {
      warnings.push(`${id}: 模板占位行未填`);
      continue;
    }
    rows.push(id);

    if (!question) errors.push(`${id}: 缺少研究问题`);
    if (!conclusion) errors.push(`${id}: 缺少结论`);
    if (!impact || /^(有启发|无|暂无|-)$/.test(impact)) errors.push(`${id}: 「对设计的影响」为空或无效`);
    if (!counter || /^(无|-|暂无)$/.test(counter)) errors.push(`${id}: 「反证/边界」不能为空`);
    if (!/^\d{4}-\d{2}$/.test(date)) errors.push(`${id}: 日期格式应为 YYYY-MM`);
    if (!/^T[1-4]$/.test(level)) errors.push(`${id}: 级别应为 T1–T4`);
    if (!/^(高|中|低)$/.test(confidence)) errors.push(`${id}: 置信度应为 高/中/低`);

    if (/未找到|待验证/.test(source)) {
      warnings.push(`${id}: 来源标记为「${source}」，确认有验证动作`);
    } else {
      const url = (source.match(/https?:\/\/[^\s)）]+/) || [])[0];
      if (!url) errors.push(`${id}: 来源不是 URL（或写「未找到」）`);
      else {
        const key = normUrl(url);
        if (seenUrls.has(key)) warnings.push(`${id}: 与 ${seenUrls.get(key)} 来源重复`);
        else seenUrls.set(key, id);
      }
    }

    const d = new Date(`${date}-01T00:00:00Z`);
    if (!Number.isNaN(d.getTime())) {
      const months = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      if (months > 18 && level !== "T2" && level !== "T4") {
        warnings.push(`${id}: 来源已 ${Math.round(months)} 个月，平台机制可能过期`);
      }
    }
  }

  if (!rows.length) warnings.push("还没有证据行（表格里的示例行不算）");

  if (!flags["no-url-check"] && seenUrls.size) {
    console.log(`检查 ${seenUrls.size} 个来源 URL …`);
    for (const [url, id] of seenUrls) {
      const r = await checkUrl(url);
      if (r.error) errors.push(`${id}: URL 打不开（${r.error}）`);
      else if (r.status === 404 || r.status === 410) errors.push(`${id}: URL 返回 ${r.status}`);
      else if (r.status === 403) warnings.push(`${id}: URL 拒绝访问（403，可能反爬）`);
      else if (r.status >= 400) warnings.push(`${id}: URL 返回 ${r.status}`);
      await sleep(250);
    }
  }

  console.log(`\n证据检查: ${rel(file)}`);
  console.log(`  证据行: ${rows.length}`);
  for (const w of warnings) console.log(`  ! ${w}`);
  for (const e of errors) console.log(`  ✗ ${e}`);
  console.log(`\n${errors.length ? `未通过：${errors.length} 个错误。` : "通过。"}\n`);
  if (errors.length) process.exitCode = 1;
}

async function checkUrl(url) {
  const opt = {
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
    headers: { "user-agent": "good-world-evidence-check/1.0" },
  };
  try {
    let res = await fetch(url, { method: "HEAD", ...opt });
    if ([403, 405, 501].includes(res.status)) {
      res = await fetch(url, { ...opt, headers: { ...opt.headers, range: "bytes=0-2048" } });
    }
    return { status: res.status };
  } catch (e) {
    return { error: e.name === "TimeoutError" ? "超时" : e.message };
  }
}

// ---------- status ----------

async function cmdStatus(world) {
  const plan = await readJson(path.join(world, "research", "plan.json"), null);
  const cand = await readJson(path.join(world, "research", "candidates.json"), { items: [] });
  const text = await readFile(path.join(world, "01-research.md"), "utf8").catch(() => "");
  const state = await readJson(path.join(world, "state.json"), null);

  let evidence = 0;
  for (const line of text.split("\n")) {
    const cells = splitRow(line);
    if (cells.length < 9 || !/^R\d+-\d+$/.test(cells[0])) continue;
    const [, , conclusion, source, , level, confidence] = cells;
    if (isPlaceholderRow({ conclusion, source, level, confidence })) continue;
    evidence++;
  }

  console.log(`\n世界: ${plan?.world || path.basename(world)}`);
  console.log(`阶段: ${state?.phase || "?"}  门禁: ${Object.values(state?.gates || {}).filter((g) => g.status === "pass").length}/10`);
  if (!plan) {
    console.log("调研: 还没生成计划。先跑 plan。\n");
    return;
  }
  for (const s of SPIKES) {
    const p = plan.spikes?.[s];
    if (!p) continue;
    console.log(`  ${s}: 查询 ${p.done?.length || 0}/${p.queries?.length || 0}  候选 ${cand.items.filter((i) => i.spike === s).length}`);
  }
  console.log(`证据行: ${evidence}  候选: ${cand.items.length}`);
  const next = !cand.items.length
    ? "按 plan 跑第一轮搜索，然后 ingest"
    : evidence < cand.items.length
      ? "把候选提升为证据（补结论/影响/反证），再 check"
      : "跑 check 验证证据表";
  console.log(`下一步: ${next}\n`);
}

// ---------- utils ----------

function extractName(brief) {
  const m = brief.match(/^#\s*(.+?)(?:｜|\|)\s*Brief/m);
  if (m) return m[1].trim();
  const h = brief.match(/^#\s*(.+)$/m);
  return h ? h[1].trim() : "";
}

function extractQuote(brief) {
  const m = brief.match(/^>\s*「(.+?)」/m);
  return m ? truncate(clean(m[1]), 30) : "";
}

function asciiRatio(s) {
  if (!s) return 0;
  return [...s].filter((c) => /[\x00-\x7F]/.test(c)).length / [...s].length;
}

function clampInt(v, dflt, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function nextId(items, spike) {
  let max = 0;
  for (const i of items) {
    const m = String(i.id || "").match(new RegExp(`^${spike}-(\\d+)$`));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${spike}-${String(max + 1).padStart(2, "0")}`;
}

function domainOf(u) {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function normUrl(u) {
  try {
    const x = new URL(u);
    x.hash = "";
    for (const k of [...x.searchParams.keys()]) if (k.startsWith("utm_")) x.searchParams.delete(k);
    return x.toString().replace(/\/$/, "");
  } catch { return String(u); }
}

function tierOf(u) {
  const d = domainOf(u);
  const t1 = ["create.roblox.com", "roblox.com", "dev.epicgames.com", "epicgames.com", "vrchat.com", "docs.unity3d.com", "unity.com", "unrealengine.com", "developer.mozilla.org"];
  const t2 = ["arxiv.org", "dl.acm.org", "ieee.org", "gdcvault.com", "gamedeveloper.com", "researchgate.net", "springer.com", "nature.com"];
  const t4 = ["xiaohongshu.com", "douyin.com", "bilibili.com", "weibo.com", "tieba.baidu.com", "reddit.com", "zhihu.com", "tiktok.com"];
  if (t1.some((x) => d === x || d.endsWith("." + x))) return "T1";
  if (t2.some((x) => d === x || d.endsWith("." + x))) return "T2";
  if (t4.some((x) => d === x || d.endsWith("." + x))) return "T4";
  return "T3";
}

function splitRow(line) {
  const s = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let cur = "";
  let esc = false;
  for (const ch of s) {
    if (esc) { cur += ch; esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === "|") { cells.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

function isPlaceholderRow({ conclusion, source, level, confidence }) {
  return !conclusion && !source && (String(level).includes("/") || String(confidence).includes("/"));
}

function clean(s) { return String(s || "").replace(/\s+/g, " ").trim(); }
function esc(s) { return String(s || "").replace(/\|/g, "\\|").replace(/\n/g, " "); }
function truncate(s, n) {
  const arr = [...String(s || "")];
  return arr.length > n ? arr.slice(0, n).join("") + "…" : arr.join("");
}
function unique(a) { return [...new Set(a)]; }
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => { data += c; });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}
function rel(p) {
  const r = path.relative(process.cwd(), p) || ".";
  return r.startsWith("..") ? p : r;
}

async function archiveRaw(world, spike, src, text) {
  const rawDir = path.join(world, "research", "raw");
  if (src && path.dirname(src) === rawDir) return;
  await mkdir(rawDir, { recursive: true });
  const files = await readdir(rawDir).catch(() => []);
  let max = 0;
  for (const f of files) {
    const m = f.match(new RegExp(`^${spike}-(\\d+)\\.json$`));
    if (m) max = Math.max(max, Number(m[1]));
  }
  const name = `${spike}-${String(max + 1).padStart(2, "0")}.json`;
  await writeFile(path.join(rawDir, name), text, "utf8");
}

async function exists(p) { try { await stat(p); return true; } catch { return false; } }
async function readJson(p, fallback) {
  try { return JSON.parse(await readFile(p, "utf8")); } catch { return fallback; }
}
