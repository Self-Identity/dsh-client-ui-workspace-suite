# dsh-client-ui-workspace-suite

[中文](README.md) | [English](README.en.md)

[![npm](https://img.shields.io/npm/v/dsh-client-ui-workspace-suite.svg)](https://www.npmjs.com/package/dsh-client-ui-workspace-suite)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

把 DSH 客户端的「工作区」从一层平铺列表，升级成可浏览的目录树：选目录、看层级、看总览、开会话时选对工作区。

> 目标宿主：`@deepseek-ai/dsh-desktop-runtime 0.2.1-rc.2` · 纯渲染层组合包（无 Host 工具、无网络请求）

## 模块

四个可独立开关的模块，默认全开。任意一个都可以在 **插件 → 配置** 里关闭，回到出厂行为。

| 痛点 | 本插件的答案 | 开关 |
|---|---|---|
| 目录选择器是系统对话框：看不到层级，不能新建文件夹 | 资源管理器式选择弹窗：逐级浏览、行内新建文件夹、输入路径，提交后选择进入哪个工作区 | `modulePicker` |
| 工作区列表是平铺的，monorepo 的子项目混在一起 | 多级工作区树：目录层级、一键折叠、行内新建会话、级联删除 | `moduleTree` |
| 看不到一个工作区里有什么、花了多少 Token | 工作区总览：子树 Token 总量与按模型明细、完全展开的会话树、轮次跳转、依赖卡、README | `moduleOverview` |
| 会话窗口的工作区菜单列出每个 `src` / `lib` 子目录 | 只列根级；选中项有已注册子工作区时，先问用哪一个开始会话 | `moduleHeroMenu` |

### 1. 资源管理器式选择弹窗

- 两个入口都会打开它：新对话页的「添加工作区」、侧边栏的「＋添加」。
- 树：单击行展开/收起；双击或点复选框勾选；勾选目录会自动展开。
- **行内新建文件夹**：悬停行尾的 `＋`，输入名称，按 `Enter`（或点击别处）。空名不创建；同级重名会行内提示。
- **路径输入**：粘贴绝对路径后按 `Enter`，祖先链只展开到该级并聚焦。
- **可嵌套选择**：新勾选必须与现有选择可比（祖先、后代或兄弟）。勾兄弟会补上共同父节点，但不会拉入整个盘符根。
- 确认后选择进入哪个工作区；默认选中根节点，点「跳过」则只注册不进入。

### 2. 多级工作区树

- 工作区按最近的已注册祖先目录嵌套；层内顺序是：文件夹图标 → 父工作区 → 父工作区会话 → 子工作区。
- 置顶 / 取消置顶会把会话排到所属工作区最上方，带 180ms FLIP 动画，并尊重 `prefers-reduced-motion`。
- 搜索框旁的折叠按钮会收起全部子工作区，状态持久化。
- 行是 `role=treeitem` 且带 `aria-expanded`，可键盘导航。
- 删除工作区会从最深一层开始级联删除，直到子树干净；删不掉的会提示。
- 未分组会话在列表末尾单独成节：一条细分割线加小标题，而不是伪装成工作区行。

### 3. 工作区总览

入口：工作区行 → **更多** → **工作区总览**。

- 头部：文件夹图标、名称、绝对路径，以及该工作区**及其全部子工作区**的 Token 总量（悬停看按模型拆分）。
- 完全展开的会话树；Token 数字只在这里出现。
- 依赖卡（可关）：一次目录列举，加上对 `package.json`、`tsconfig.json`、`Dockerfile`、`.nvmrc` 的定点探测。不递归，也不读锁文件。
- 每个会话最近若干轮，可跳回会话。
- 根 `README.md` 由插件自带的轻量 Markdown 渲染器渲染（不注入 HTML，`javascript:` 链接不可点）。

### 4. 会话窗口的工作区菜单

- 只列根级工作区。
- 选中项有已注册子工作区时，先问用哪一个开始会话。
- 「添加工作区」置顶，并打开资源管理器式选择弹窗。

## 设置

| 分组 | 键 |
|---|---|
| 模块 | `modulePicker`、`moduleTree`、`moduleOverview`、`moduleHeroMenu` |
| 选择弹窗 | `pickerDepth`（打开时预展开层数，0 = 只展开当前层） |
| 工作区列表 | `treeMaxHeightPct`、`treeScroll`、`collapseAllByDefault`、`includeArchived`、`includeSubagent` |
| 总览 | `showTokens`、`showTurns`、`showEnv`、`readme`、`readmeMaxHeightPct`（15–90） |
| 外观 | `scrollbarWidth`（4–20px，默认 8px），只作用于本插件自己的滚动区 |

滚动条宽度取值链：`--suite-scrollbar-width` → 全局 `--dsh-scrollbar-width` → 8px。因此装了 `dsh-client-ui-thick-scrollbar` 时会跟随它的全局宽度。

## 边界

### 接管了什么

| 类型 | 对象 | 说明 |
|---|---|---|
| 插槽（影子） | `sidebar.workspaces`（priority `-100`） | 替换整个工作区列表 |
| 插槽（影子） | `conversation.hero.workspace`（priority `-1`） | 替换会话窗口的工作区菜单 |
| 插槽（占位） | `sidebar.workspaces.directoryFlow`、`conversation.hero.workspace.directoryFlow` | 两个添加工作区弹窗位 |
| 组合行 | 禁用 `directory-picker`，插入 browse 后端、它的 UI 与本包 | 见下 |

### 全局副作用：系统目录对话框消失

目录选择服务是互斥的：`native` 后端有系统对话框但不能列目录，`browse` 后端能列目录但没有对话框。为了做应用内浏览器，本组合包把服务钉在 `browse` 上。因此，只要组合包启用，应用里任何地方都不会再打开系统目录对话框。关闭选择弹窗模块**不会**恢复它——browse 后端仍在组合里。要恢复系统对话框，必须禁用（或卸载）整个组合包并重启。

### 它不做什么

- 不修改会话内容、模型行为或任何网络请求。
- 不写文件，除非你明确点 `＋` 新建子文件夹。
- 不读项目文件内容：总览只读 `README.md`，依赖卡只读上面四个文件。目录列表只带名称，不带文件内容。
- 不在工作区之间移动会话：会话属于创建时的 `cwd`，宿主没有重新分配它的 API。

### 已知限制

1. **宿主契约**：插槽 id、原语名、组合行 id、服务方法都来自客户端实现，升级可能改动。
2. **冲突**：同一插槽的多个影子注册按 priority 竞争（这里是 `-100` / `-1`），只有一个生效。
3. **偏好存在浏览器**：`dsh-workspace-suite.settings.v1` 与启动记录 `dsh-workspace-suite.boot` 存在 `localStorage`；换机器或清缓存会重置。
4. **与 DeepSeek 无隶属关系**：这是社区插件，不是官方包。

## 安装

1. 客户端侧边栏 → **插件** → **添加插件**。
2. 填 `dsh-client-ui-workspace-suite@1.2.0`（或选择本地源码目录）。
3. **安装** → **立即启用**；若提示「改动在下次启动生效」，重启客户端。
4. 卡片显示 **已启用 / 已挂载**，工作区列表切换为树状视图。

启用组合包会禁用出厂的 `directory-picker` 行（见「边界」）；禁用组合包会恢复系统对话框。

## 兼容性

已针对 `@deepseek-ai/dsh-desktop-runtime 0.2.1-rc.2` 验证：

| 契约 | 状态 |
|---|---|
| 平台种子 `react`、`@deepseek-ai/dsh-client-store`、`@deepseek-ai/dsh-client-ui-primitives` | 存在 |
| 插槽 `sidebar.workspaces`、`sidebar.workspaces.directoryFlow`、`conversation.hero.workspace`、`conversation.hero.workspace.directoryFlow` | 存在 |
| 组合行 `directory-picker`（`@deepseek-ai/dsh-host-directory-picker-auto`） | 存在；可禁用并由 browse 后端替换 |
| `workspace-files` 行（`remote.workspaceFiles`） | 存在；README 卡与依赖卡使用 |
| 原语 `Menu` / `MenuItemButton` / `Modal` / `HoverCard` / `MarkdownText` / `Tooltip` 及图标 | 存在；缺失时回退到内置渲染 |
| 服务 `slots` / `locale` / `sessions` / `workspaces` / `uiWorkspace` / `layout` / `remote` | 存在；每次调用都经过容错包装 |

客户端升级后，先重新构建并跑测试，再判断契约是否仍然有效。

## 排查

浏览器半区把启动进度写进 `localStorage` 的 `dsh-workspace-suite.boot`（ASCII JSON，保留最近三条失败）。

| 记录 | 含义 |
|---|---|
| `apply-ok` / `registered` | Host 行已装配，注册完成 |
| `services-at-apply` | apply 时有服务未就绪；首次使用时会自愈 |
| `overview-failed` | 总览页渲染失败；页面显示失败卡 |
| `factory-failed` / `entry-inert` | 浏览器半区加载失败；插件退化为空操作 |

常见原因：客户端没重启；`dsh.profile.bundles` 里没有本包；其他插件影子注册了同一插槽；客户端升级移动了路径。

## 开发

```powershell
node tools/build.mjs          # 由 src/*.js 拼装 lib/client.js
node --check lib/client.js
npm test                      # manifest / styles / host / util / i18n / smoke
node tools/release.mjs --check
```

`src/` 按文件名顺序拼装（`00-` → `90-`）；除 `10-i18n.js` 外每个文件都必须是纯 ASCII（构建会强制）。浏览器半区不得 import 任何 `@deepseek-ai/*` 包：能力经 `ctx` 与座位 props 获取，只解析平台模块种子。

## 卸载

1. 插件 → 本组合包 → **禁用**（或卸载）→ 重启。禁用会一并撤销组合补丁，系统目录对话框随之恢复。
2. 可选：清掉 `localStorage` 里的 `dsh-workspace-suite.settings.v1` 与 `dsh-workspace-suite.boot`。

## 许可

MIT。与 DeepSeek 官方无隶属关系。
