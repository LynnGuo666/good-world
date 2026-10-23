# Lua Prompt：{{FEATURE}}

> 版本：公开版（只用官方文档与公开 API）


> 挂载对象：{{TARGET}}　网络对象：是 / 否
> 模式：Shared Mod / DS　目标容量：{{CAPACITY}}

## 目标

{{ONE_SENTENCE}}

## 事件与时序

- 初始化：`OnNetSpawned`
- 交互：
- 玩家进出：
- 主权转移：
- 断线重连：
- 销毁：

## 状态

| 字段 | 类型 | 初值 | 谁写 | 同步方式 |
|-|-|-|-|-|
|  |  |  |  | varSync / DataStore |

## 主权

- 谁持有：
- 什么时候 `RequestOwnership()`：
- 切后台/断线怎么办：
- 非主权方做什么：

## UI

- 反馈：
- 面板显示/隐藏：`DouyinUIService.SetUIVisible`
- 移动端安全区：

## 存储

- DataStore 名称：
- scope（playerOpenID / petOpenID）：
- key：
- 上限检查（1000 键 / 100MB / 900 次/分钟）：
- 失败处理：

## 验收

- [ ] 两个客户端状态一致
- [ ] 重进后进度保留
- [ ] 断线重连不重复发奖
- [ ] 无主权时不写值
- [ ] 无自定义 C#、无 Instantiate/Destroy
- [ ] 有日志和失败回退

## 禁止

- 编造 API（只写 `references/prompts.md` 白名单里的）
- 客户端计算付费/排名奖励
- 用 RPC 代替核心同步变量
- 把用户 ID 放 DataStore key（应放 scope）
