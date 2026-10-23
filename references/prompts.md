# 公开版 Prompt：地图 / 模型 / Lua / Agent

> **适用：外部创作者、公开分享、比赛提交。**
> 只用官方文档（vcreate.douyin.com）与公开 API。
>
> Prompt 不是许愿，是**带输入、约束、产出、验收的施工单**。
> 所有 API 必须来自官方文档；不确定就写「查文档确认」，**不要编接口**。

模板：`templates/asset-prompt.md`（地图/模型）、`templates/lua-prompt.md`、`templates/agent-prompt.md`。

---

## 0. 什么时候用

- S5 把任务拆到 ≤0.5 天之后，为每条任务写 Prompt。
- 用户直接说「帮我写一个模型 / Lua / Agent Prompt」。
- 不要在类型、循环、预算还没定时用 Prompt 掩盖没想清楚。

四种 Prompt：

| 类型 | 用在 | 产出 | 验收 |
|-|-|-|-|
| 地图 Prompt | AI 地形/场景 | 可直接粘贴的提示词 | 预览图先过，再 3D |
| 模型 Prompt | 道具/建筑/宠物/机关 | 可直接粘贴的提示词 | 面数/尺寸/材质/挂点 |
| Lua Prompt | 交互/同步/存档/UI | Lua 文件 + 挂载说明 | 双端一致、重进保留 |
| Agent Prompt | 玩法/关卡/系统 | 任务单或代码草稿 | 能按步骤跑通 |

---

## 1. 五段式

任何 Prompt 都按这五段写，缺一段就容易返工：

1. **目标**：一句话，玩家做什么、得到什么。
2. **输入**：参考图、尺寸、坐标、现有资产、挂载对象。
3. **约束**：平台预算、API 边界、同步模式、审核红线。
4. **产出格式**：提示词 / Lua 文件 / 任务步骤 / 目录。
5. **验收**：跑什么、看什么、失败怎么回退。

---

## 2. 地图 Prompt

官方给的三要素：**地形类型 + 环境风格 + 具体细节**。再加布局和负向。

```
地形类型：<岛屿/山脉/平原/峡谷/城市街区>
环境风格：<热带/极寒/荒漠/森林/赛博/古风>
具体细节：<河流/山高/植被密度/地标/建筑>
布局：<出生点/3 个玩法点/观景台/边界>
尺度：<几分钟走完/多少米>
负向：<不要密集建筑/不要写实城市/不要过多光源>
```

示例：

```
一座被珊瑚礁环绕的热带火山岛。中央是休眠火山，四周白沙滩和椰林，
一条小河从山脚流入海。出生点在沙滩，沿路 3 个记忆点，山顶一个观景台。
15 分钟能走完。不要密集建筑、不要写实城市、不要超过 8 个动态光源。
```

规则：

- **先出预览图，确认布局再生成 3D**；全流程 15–30 分钟。
- 单张地图低矮植被最多 16 种，别在提示词里许愿一片森林。
- 预览阶段重来最便宜；3D 阶段重来烧星光。

验收：

- [ ] 预览图能看懂出生点、主路径、3 个玩法点
- [ ] 没有明显断崖/水域穿模
- [ ] 资源检查通过，光源在预算内

---

## 3. 模型 Prompt

适用于编辑器内模型生成 / 混元 3D / 其它文生 3D。不同工具字段不同，按工具调整。

```
主体：<一句话说清是什么>
风格：<低多边形/卡通/写实/手绘/赛博>
结构：<一体铸造 / 模块组装；哪些部件要动>
材质/贴图：<不透明/单张 1024/少材质/无透明>
面数：<团队预算，如 3k–8k 面>
尺寸：<高/宽/长；pivot 在脚底或中心>
用途：<可拾取/可坐/可展示/可挂点>
负向：<高面数/透明/复杂 shader/写实毛发/第三方 IP>
```

示例（雾岛精灵）：

```
一只圆润的雾岛精灵，像猫和萤火虫的结合。低多边形、柔和渐变、手绘感。
一体铸造，静态挂件，不需要骨骼。不透明材质，单张 1024 贴图。
团队预算 3k–8k 面，0.6 米高，pivot 在脚底，正面朝 +Z。
用于图鉴展示和拾取，需要头顶挂点。
不要写实毛发、不要透明翅膀、不要复杂 shader、不要第三方 IP。
```

规则：

- **先判断要不要动**：会动选模块组装（约 10 分钟），不动选一体铸造（约 3 分钟）。
- 面数是团队预算，不是官方单个模型上限；总量 130 万面 / 1300 Mesh。
- 贴图单张 ≤1024；优先不透明、少材质、少 shader。
- 生成后仍走 GLB/资源检查，AI 不绕过预算。

验收：

- [ ] 面数/顶点在预算内
- [ ] 材质数、贴图尺寸合格
- [ ] 尺寸和 pivot 正确
- [ ] 需要动的部件是独立模块
- [ ] 没有透明/复杂 shader 导致的掉帧

---

## 4. Lua Prompt

### 4.1 五段式（Lua 版）

```
目标：<玩家做什么，状态怎么变>
挂载：<哪个 GameObject / Prefab / 网络对象>
事件：<OnNetSpawned / OnPickUp / OnInteract / OnPlayerJoined...>
状态：<varSync 字段、类型、初值>
主权：<谁写、什么时候 RequestOwnership、切后台怎么办>
UI：<反馈/面板/显示隐藏>
存储：<DataStore 名称/scope/key/上限>
失败：<存储失败/断线/重复触发/无主权>
验收：<双端一致/重进保留/不重复发奖>
禁止：<自定义 C# / Instantiate / 客户端算付费 / 编 API>
```

### 4.2 API 白名单（写进 Prompt，防止模型瞎编）

| 能力 | 用这些 | 注意 |
|-|-|-|
| 脚本容器 | `Douyin Script` 组件 | Lua 5.3；不能新增自定义 C# |
| 生命周期 | `OnNetSpawned` / `OnNetDestroy` / `OnPlayerJoined` / `OnPlayerLeft` / `OnActorSpawned` | `OnNetSpawned` 后再读同步变量 |
| 交互 | `OnInteract` / `OnPickUp` / `OnDrop` / `OnSeatEntered` / `OnSeatExited` | 需挂对应组件 |
| 主权 | `HasOwnership()` / `RequestOwnership()` / `GetOwner()` / `SetOwner()` | 只有主权方能写 varSync |
| 同步变量 | `---@varSync name:type` + `---@end`；`GetValue()` / `SetValue()`；`OnValueChange` | 不支持结构体；List/Dictionary 要按文档 |
| 网络对象 | `DouyinObjectService.NetSpawn` / `NetDestroy` | 只有主权方能销毁；不要用 Instantiate/Destroy |
| 存储 | `DATASTORE(function() ... end)`；`DouyinDataService.GetDataStore(name, scope)`；`GetData` / `SetData` / `IncrementData` | 用户 ID 放 **scope**，不要放 key；单库 1000 键 |
| UI | `DouyinUIService.SetUIVisible(bool)` / `SetNativeUIVisible(bool)` | 全屏面板可隐藏官方 UI，关闭后恢复 |
| DS 通信 | `DouyinRemoteEvent` / `DouyinRemoteFunction` | 只用于 DS 模式 |
| 网络状态 | `DouyinNetService.isNetworkSettled` | 网络没同步完不要做判定 |

### 4.3 硬规则

- 动态生成/销毁网络对象用 `NetSpawn` / `NetDestroy`，不要用 Unity 的 `Instantiate` / `Destroy`。
- 改同步变量前先 `HasOwnership()`；主权会因切后台/断线/退房转移。
- 同步变量在 `OnNetSpawned` 之后才有有效值；`OnValueChange` 也在 `OnNetSpawned` 里注册。
- 核心状态（分数/血量/道具）优先 varSync；RPC 不保证送达。
- 有付费/排名奖励 → DS；客户端不算账。
- DataStore 必须包在 `DATASTORE(function() ... end)` 里；用户 ID 用 `playerOpenID` / `petOpenID` 作为 **scope**。
- 单世界 100MB、单 DataStore 1000 键、900 次/分钟；批量写入要合并。

### 4.4 Lua Prompt 示例

```
目标：玩家拾取瓶子，UI +1；集满 3 个解锁 1 张随机贴纸；进度按账号保存。
挂载：瓶子 Prefab 的 Douyin Script；瓶子是网络对象。
事件：OnPickUp、OnNetSpawned、OnPlayerJoined。
状态：---@varSync bottleCount:int；---@varSync unlocked:bool。
主权：拾取后 RequestOwnership；只有主权方 SetValue。
UI：拾取时 +1 动效；图鉴面板用 DouyinUIService.SetUIVisible 控制。
存储：DATASTORE(function() ... end)；GetDataStore("world_bottle", "bag_" .. playerOpenID)。
失败：存储失败只提示，不回滚已拾取；断线重连不重复发奖。
验收：两个客户端看到同一计数；重进后进度保留；无主权时不写值。
禁止：自定义 C#、Instantiate/Destroy、客户端算付费、编造 API。
```

模型选择提示：如果模型不熟这套 API，先把「API 白名单 + 事件时序」贴给它，再让它写；不要只说「实现联机」。

---

## 5. Agent / VibeCoding Prompt

Agent 模式适合「描述玩法，让它生成资产/逻辑」，但必须给边界。

```
做一个 <一句话玩法>。
平台：抖音虚拟世界；容量 <5v5=10 / 派对=30>；<Shared Mod / DS>。
玩家流程：<3–5 步>。
必须用：<组件/API/资源>。
同步：<哪些状态用 varSync，哪些走 DS>。
验收：<双端一致/首轮 60 秒/重进保留>。
禁止：<自定义 C#/客户端算账/超出预算/第三方 IP>。
输出：<任务单/资产清单/Lua 文件>，不要直接堆代码。
```

示例：

```
做一个 60 秒的 5v5 天台枪战房间。
平台：抖音虚拟世界；本房容量设 10；先用 Shared Mod 做体验，排位/奖励再上 DS。
玩家流程：选边 → 出生 → 60 秒内抢占 3 个检查点 → 结算。
必须用：网络对象 + varSync 同步占点状态；命中判定用服务端/主权校验。
验收：两个客户端占点状态一致；60 秒能跑完一局；断线重连不重复结算。
禁止：自定义 C#、客户端算排名奖励、超过 700MB/130 万面、第三方 IP。
输出：任务单 + 需要新增的 Lua 文件清单，不要直接堆 500 行代码。
```

---

## 6. Prompt 验收清单

- [ ] 目标一句话，能验收
- [ ] 输入/参考/尺寸/挂载对象齐全
- [ ] 平台预算写清（容量/面数/贴图/光源）
- [ ] API 名称来自官方文档
- [ ] 同步/主权/断线处理写清
- [ ] 存储 scope/key/上限写清
- [ ] 有失败回退
- [ ] 有测试步骤
- [ ] 无第三方 IP/违规内容

---

## 7. 反模式

| 反模式 | 症状 | 处方 |
|-|-|-|
| 「做一个好玩的世界」 | 没有动词和验收 | 先写 3 分钟脚本 |
| 「实现联机」 | 没事件/主权/同步变量 | 按 4.2 白名单补齐 |
| 「高精度模型」 | 面数爆预算 | 先给面数/贴图预算 |
| 「随便发挥」 | Agent 产出不可验收 | 给流程/验收/禁止 |
| 编 API | 跑不起来 | 只写文档里有的 |
| Prompt 代替设计 | 用词华丽，玩法空 | 先过 G3/G4 再写 Prompt |

---

## 8. 引用

| 主题 | 原文 |
|-|-|
| Lua 基础 | https://vcreate.douyin.com/pet/wiki/s196aspp/9jjv9g0l |
| 脚本 API | https://vcreate.douyin.com/pet/wiki/4j78bceb/b3m0i3uq |
| 数据存储 | https://vcreate.douyin.com/pet/wiki/s196aspp/5olca5xj |
| DataStore API | https://vcreate.douyin.com/pet/wiki/4j78bceb/d0p8l756 |
| 网络对象 | https://vcreate.douyin.com/pet/wiki/s196aspp/5gzuf4g9 |
| NetSpawn | https://vcreate.douyin.com/pet/wiki/4j78bceb |
| UI | https://vcreate.douyin.com/pet/wiki/4j78bceb/l2luc82y |
| AI 建模 | https://vcreate.douyin.com/pet/wiki/s196aspp/p18jumog |
| 地图提示词 | https://vcreate.douyin.com/pet/wiki/a5tb1bje/00wq0ke2 |

> 官方文档更新后，以最新抓取为准；Prompt 里的 API 先查文档再写。