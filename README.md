# 造个好世界（Good World）

> 一个面向 AI 世界创作的世界设计 Skill：把一句模糊的想法，通过对话、外部调研、类型选择、六层画布、红队评审、施工与试玩，变成可玩、可传播、可复访的世界方案。

这是一个**公开版**技能包，只包含公开文档与公开 API 相关的内容，可直接用于 OpenCode、Claude Code、Codex 等支持 Agent Skills 的宿主。

---

## 它解决什么问题

很多人做世界是「先写设定、先堆美术」，最后发现：

- 不知道谁会来
- 进来 3 分钟没事干
- 玩完没有可分享的东西
- 下周没人回来

这个 Skill 用一条固定 Loop 逼你把这些问题答完：

```
盘问 → 调研 → 类型 → 概念 → 六层画布 → 红队 → 施工 → 试玩 → 打包
```

核心产物：

- `00-brief.md`：原话、人群、约束、冷启动
- `01-research.md`：证据表、同类拆解
- `02-candidates.md`：3 个候选 + 选择理由
- `03-canvas.md`：六层画布 + 3 分钟逐拍脚本
- `04-review.md`：18 分红队 + 平台一票否决
- `05-build-plan.md`：范围阶梯 + 施工任务 + 编辑器操作
- `06-playtest.md`：真玩家观察 + 迭代日志
- `07-pitch.md`：90 秒汇报 + 邀请语 + 首周运营

---

## 安装

### npx skills（推荐）

```bash
# 1. 先看仓库里有哪些 skill
npx skills add LynnGuo666/good-world --list

# 2. 安装到当前项目（自动检测 agent）
npx skills add LynnGuo666/good-world

# 3. 非交互安装到 OpenCode
npx skills add LynnGuo666/good-world -a opencode -y

# 4. 全局安装
npx skills add LynnGuo666/good-world -g
```

安装后可用 `npx skills list` 查看；更新用 `npx skills update good-world`。

> `npx skills` 会把 skill 复制/链接到 agent 目录，例如 `.agents/skills/good-world`。
> 文件包含 `SKILL.md`、`references/`、`templates/`、`scripts/`。

### OpenCode 手动安装

全局安装：

```bash
git clone https://github.com/LynnGuo666/good-world.git \
  ~/.config/opencode/skills/good-world
```

项目内安装：

```bash
git clone https://github.com/LynnGuo666/good-world.git \
  .opencode/skills/good-world
```

安装后可用 `/good-world` 触发，或直接说「用 good-world 帮我把这个想法做成世界」。

### Claude Code / Codex / 其他 Agent Skills 宿主

放到对应目录即可：

| 宿主 | 目录 |
|-|-|
| OpenCode | `~/.config/opencode/skills/good-world/` 或 `.opencode/skills/good-world/` |
| Claude Code | `~/.claude/skills/good-world/` 或 `.claude/skills/good-world/` |
| Agent Skills 兼容 | `~/.agents/skills/good-world/` 或 `.agents/skills/good-world/` |

如果宿主不自动发现 Skill，把 `SKILL.md` 作为系统提示/规则加载，并按需读 `references/`。

---

## 快速开始

```bash
# 1. 建一个世界目录
node scripts/new-world.mjs "雾岛精灵图鉴"

# 2. 生成调研计划
node scripts/research-run.mjs plan --world "worlds/雾岛精灵图鉴"

# 3. 检查产物完整度
node scripts/check-world.mjs "worlds/雾岛精灵图鉴"
```

然后从 `00-brief.md` 开始，一次只推进一个阶段。

---

## 目录

```
good-world/
├── SKILL.md                  # 入口：Loop、门禁、规则、Prompt 指引
├── references/
│   ├── interview.md          # 对话盘问
│   ├── research.md           # 调研协议 + 防编造
│   ├── genres.md             # 3 轴 × 26 类世界
│   ├── cases.md              # 8 传播引擎 + 19 案例卡
│   ├── canvas.md             # 六层画布 + 3 分钟脚本
│   ├── review.md             # 红队 / 18 分 / 一票否决
│   ├── build.md              # 施工三层：编辑器 / SDK / 平台
│   ├── editor-guide.md       # 编辑器手动操作指南
│   ├── platform.md           # 平台事实卡与硬预算
│   ├── distribution.md       # 公开冷启动：Feed / 封面 / 标签
│   ├── prompts.md            # 地图 / 模型 / Lua / Agent Prompt
│   ├── examples.md           # 4 个跨类型示例
│   ├── workshop.md           # 90 分钟工作坊手册
│   └── loop.md               # 状态机 / 子代理 / 恢复
├── templates/                # 10 个产物骨架
└── scripts/
    ├── new-world.mjs         # 建世界目录
    ├── research-run.mjs      # 调研计划 / 归一化 / 校验
    └── check-world.mjs       # 结构 / 门禁 / 容量检查
```

---

## 适合谁

- 想做一个 UGC 世界/地图，但不知道从哪开始
- 已经有想法，但「好看不好玩」、没人复访
- 参加 Game Jam / 造世界比赛，需要画布、90 秒汇报、施工计划
- 想用 AI 生成地图/模型，但不想做出一堆无法验收的资产
- 需要给团队/社群讲清楚「这个世界为什么成立」

---

## 这个版本包含什么

- 6 阶段 Loop + 10 个门禁
- 26 类世界类型 + 8 个传播引擎 + 19 张案例卡
- 6 层画布、3 分钟逐拍脚本、18 分红队
- 平台硬预算：容量、资源、性能、审核、发布
- 公开冷启动：Feed 视频卡、封面、标题、标签、分享
- 地图 / 模型 / Lua / Agent Prompt 模板
- 编辑器手动操作指南：新建、地图、模型、组件、Lua、UI、预览、发布
- 3 个零依赖 Node 脚本

---

## 依赖

- Node.js 22+
- 无 npm 依赖
- 引用官方文档 URL；使用时可联网打开

---

## 说明

- 这是非官方社区项目，与抖音/字节跳动无隶属关系。
- 「造世界」「抖音」「合养精灵」等名称与文档归其权利人所有。
- 官方文档与平台规则会更新，发布前请以最新官方文档为准。
- 本仓库只包含公开文档与公开 API 相关内容；不包含账号、密钥或非公开工具。

---

## License

MIT
