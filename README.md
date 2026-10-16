# dsh-client-ui-workspace-suite

DSH 官方客户端（Electron 桌面版）的工作区套件插件：把「工作区」这一层从线性列表升级为可折叠的目录树，并补齐资源管理器式选择弹窗与工作区总览页。

- 一个组合包，两个（共三个）可独立开关的功能模块，默认全开；
- 中英双语，颜色只走 `--dsw-alias-*` 主题 token，浅色/深色两套预设外观自动适配；
- 全部前端组件在客户端进程内以 React 组件渲染（不用 iframe），风格与原生工作区列表对齐；
- **永不拖垮应用**：整个浏览器半区（factory 求值 + `apply`）都包在守卫里，任何异常都只写入渲染进程 `console.error`（桌面会把它抄进 `%APPDATA%\@deepseek-ai\dsh-desktop\logs\crash-*-web-boot.log`）并返回一个**惰性入口**，因此 `web boot: N entry did not activate` 这类整体启动失败不会由本插件触发；单条座位注册被拒绝也只损失那一条。

## 功能

### 模块一：资源管理器式工作区选择弹窗

- 接管两个「目录选择洞」（`conversation.hero.workspace.directoryFlow` 与 `sidebar.workspaces.directoryFlow`，priority `-1` 覆盖出厂弹窗）：
  **新对话的「添加工作区」**与**侧边栏列表的「添加工作区」**都走本弹窗，替代系统资源管理器窗口。
- 左侧文件树：单击展开/收起，**双击或复选框**勾选当前文件夹，选中行以浅蓝底（`--dsw-alias-bg-document-selection`）高亮；鼠标悬浮行是主题业务蓝底 + 反白文字。
- **勾选约束（保持可嵌套）**：新的勾选必须与现有选择**可比**（祖先或后代），否则弹「不在同一目录树中」，确认即**清空之前的选择**再选它；勾选一个更深的子级会自动补勾它到最近已勾祖先之间的中间层；勾选某个已选项的**兄弟文件夹**时强制勾上它们的共同父节点（用已测的 `parentPathsOf` 推导祖先链）。
- 取消勾选一个父节点会**连带取消其全部已选子节点**（同一击完成，不再弹"保留/移除"确认框）。
- 顶部只显示一行路径：**已选结构的根节点**（最浅的那个已勾选目录；例如勾了 `plugins`、`dsh-host-mobile-gateway`、`deploy` 就只显示 `F:\DSH-Official\plugins`），未勾选任何目录时显示当前浏览层级；超长省略，**悬浮显示完整路径**。旁边是「输入路径…」入口。
- **输入路径真的生效**：点「输入路径…」时输入框**默认全选**当前显示的路径（直接输入/粘贴即整体替换）；回车后先校验该目录能否读取（读不到就在弹窗内报错），能读到就**把祖先链逐层展开**（最浅层先开）并**只展开输入路径的最后一级**（显示它自己的子级，**不再往下展开**），然后**把键盘焦点移到那一行**（滚动到可见，行未渲染则重试）。
- **悬停新建子文件夹**：指针落在某一行时行尾出现「＋」，点击后该行下方**就地出现命名输入框**（工具栏同款输入样式）：回车创建、Esc 取消；**同级重名会在行内提示改名**（后端拒绝也走同一提示），创建成功后父级列表强制重载、新文件夹**自动展开并勾选**，焦点落到它上面。
- **勾选一个文件夹会自动展开它**，方便继续往下选。
- **默认不预勾选**：两个「添加工作区」入口（新对话 / 侧边栏）空白开始；只有工作区行「更多 → 工作区选择」会传入 `initialPaths`，按当前已注册工作区自动对齐并逐级展开。
- **提交后的「进入哪个工作区」**：只在**添加流程**（`mode='add'`）出现——列出**刚刚确认的**工作区结构、**完全展开**、**单选**，**默认选中该结构的根节点**；每行只显示**文件夹名 + 缩进层级**（不显示面包屑，按需求）。整行 tooltip 给完整绝对路径。「进入」在该工作区**新建会话**并关闭弹窗，「跳过」直接关闭（工作区已经注册好了）。
  **修正（重要）**：这个窗口此前**看不到**——洞主人 `WorkspacePickFlow` 的 `onPicked` 会**立即采用并进入会话**、同时关掉洞，把我的弹窗一起卸载了。现在添加流程**由弹窗自己创建全部已确认路径**，不再走 `onPicked`（仅在无法直接创建时回退到它），所以窗口真的会出现、由你决定进哪个。
- **两个入口行为一致**：侧边栏列表上方的「＋添加」与会话窗口的添加流程同为 `mode='add'`（空白开始 + 结束时的进入窗口）；只有工作区行「更多 → 工作区选择」是 `mode='select'`（按现状预勾选、提交后直接关闭）。内联弹窗实例只有一个，所以"本次是添加还是选择"随打开动作传入。
- **会话窗口的工作区菜单（改装路线，影子接管 `conversation.hero.workspace`，priority `-1`）**：出厂菜单列出**每一个**工作区并只显示标题，`src`/`lib` 这类子工作区单独出现时无法辨认。本插件接管后：**只列根级工作区**（没有已注册祖先者）；选中一个**含已注册子工作区**的项 → 弹出该子树的结构选择（完全展开、单选、**默认选中该项**）→ 进入所选；选中无子级者 → 直接进入（出厂行为）。
  **「添加工作区」放在列表最上方并做强调样式**（accent 底色 + 主题蓝文字 + 图标，`.dws-heroAdd`）。它的显示**不依赖 `renderSlot`**：影子注册不声明子洞时宿主可能根本不传这个 prop（入口曾因此**整条消失**）。渲染流程优先走**已声明的子洞**，拿不到时**直接渲染本插件的选择弹窗**——选择器服务的 face 随该注册一起注入，所以那条路一定可用。**影子注册不得重新声明被影子条目的子洞**，因此本注册不声明任何 children；菜单定位用 `anchor: null` + `getAnchorRect`（出厂 `WorkspacePickFlow` 同款，否则 portal 列表落到窗口左上角）；原语缺失时退化为纯标签菜单，不会让菜单崩掉。
- **分隔符约定**：所有规范化路径**一律用 `/`**（`foldPath`/`normalizePath` 的统一形式，跨平台）；仅在需要"可直接粘贴进资源管理器"的绝对路径时才用 host 原样写法（Windows 为 `\`），本插件把它放在 tooltip 与路径行里。
- **聚焦修复**：输入路径回车后会把键盘焦点移到叶节点行。此前失效是因为我用**精确属性选择器**找行，而行上的 `data-path` 是宿主原样写法（分隔符/大小写可能不同）→ 匹配不到、静默失败；现在改为**折叠路径逐一比较**，并放宽重试到 24×150ms。
- **弹窗底部留白**：`.dws-pickerFooter{padding-bottom:10px}`，按钮不再贴着下沿。
- **系统资源管理器入口：暂时移除**（按需求）。取用它的 plumbing 仍在（`services.pickDirectory` → `uiWorkspace.pickDirectory()`，以及弹窗侧的 `pick` prop），需要恢复时把工具栏里那个按钮加回来即可。原因记录在此：`browse` 后端（本插件为应用内列目录所钉）没有 `pick`，`native` 有 `pick` 但没有列目录，二者在同一个 `ctx.directoryPicker` 服务位上互斥。
- **弹窗内容区可滚动**：通过原生 `Modal` 的 `contentClassName` 把内容列约束成受控 flex 列，目录树内部滚动、底部按钮始终可见（原生 Modal 的 `dialog > content > body` 中间层不是插件能直接控制的）。
- **没有底部结果预览**（原横向树状预览与"双击改备注"已移除）：备注名只在**侧边栏工作区行双击**与**工作区总览**里修改。
- **取消勾选不会删除工作区**：弹窗只负责"创建缺失的 + 写备注"，删除始终在工作区行的「更多」菜单里；弹窗底部有明确提示，避免把勾选框误当成删除控件。

### 模块二：多级工作区树与折叠

- 接管 `sidebar.workspaces`（priority `-100`，低于出厂占用者与任何 `-1` 占用者，因此可与其它同类插件共存而本插件优先）。
- 嵌套规则：工作区挂到「**最近已注册祖先目录**」下（最长严格前缀），层内顺序为
  `文件夹 icon · 父工作区 → 父工作区会话 → 子工作区`，每层缩进 12px。
- 行内显示：文件夹 icon、名称（自定义名后跟半透明灰原名）、Token 徽标（投影可用时）、相对时间、悬停操作（置顶/归档）与「更多」菜单。
  **工作区「更多」**：在此新建会话 / 工作区选择… / 工作区总览 / 重命名工作区 / 删除工作区。
  **会话「更多」**：重命名 / 分叉 / 置顶 / 归档（或恢复）。
- 搜索框旁的**折叠按钮**（纯图标）：一键收纳/展开所有子工作区，状态持久化（`localStorage`）。
- 侧边栏**折叠成 56px 轨道**时头部改为纵向图标列（横排 4 个按钮会横向溢出），搜索按钮会先把侧边栏展开再聚焦搜索框（用 owner 传入的 `expandSidebar`），与原生轨道行为一致。
- **键盘可达**：工作区行是 `role=treeitem` + `aria-expanded`，点击行本身展开/收起（见下），弹窗树行的展开箭头是真正可聚焦的 `<button>`（带 `aria-label`/`aria-expanded` 与 `:focus-visible` 焦点环）。
- **风格对齐原生列表**：行高/圆角/悬停底色/字重都沿用出厂工作区行；**列表里不显示 Token 数值**（Token 只出现在总览页）。
- **展开文件夹 icon 只在展开后出现**：默认折叠，未展开时是闭合文件夹 icon，点击行展开后才变成打开的文件夹 icon；行上不再有常驻的三角箭头（行本身即展开控件，`aria-expanded` 同步）。
- 交互约定：**单击行 = 展开/收起**；**双击行 = 打开该工作区**（启动/复用其会话）；**双击名称 = 重命名**；行内悬停按钮与「更多」菜单点击不会触发展开。
- 树最大高度（默认 60vh）内滚动，可在设置中调整或关闭该限高。
- 头部还有**归档会话**三态过滤（隐藏 / 显示 / 仅归档），与原生的 `archivedFilter` 等价。
- 会话列表沿用出厂语义：置顶优先、按最近更新排序、隐藏空白会话与子代理会话。
- **按原生的折叠节流**：每个工作区默认只展开「置顶 / 运行中 / 当前会话」+ 最新 5 个空闲会话，`显示更多 (剩余数)` 每次再放 5 个，全部展开后出现 `收起`（每个工作区的展开量按浏览器持久化）。这样工作区多、会话多时列表仍然收敛。

### 模块三：工作区总览页

总览页**从这里进入**：工作区行 →「更多」→「工作区总览」（不再单独注册 `sidebar.panellist` 侧栏图标；总览是工作区列表的目的地，不是并排的第二个地方）。版式与官方入口页一致：根容器 `height:100%`、标题区 `padding-top:28px`（macOS 再补 `--dsh-frame-top-clearance`）、滚动交给内层 `.dws-pageBody`、内容列 `max-width:960px` 居中。按上下顺序：

1. 根工作区：文件夹 icon + 名称（含备注名/原名规范）+ 实际路径 + 该工作区**及其全部子工作区**的 Token 总量（悬浮显示按模型拆分）；
2. **依赖与环境卡**（可关闭）：**只读顶层、固定少量调用**。注意一个硬约束——本插件钉住的 `browse` 目录后端，其 `list` **只返回子目录**（非目录被过滤），所以"文件是否存在"只能靠**定点读取**判断：列一次顶层目录拿到子目录（按 `.git`/`.github`/`node_modules`/`src`/`dist`… 优先级排序展示），再逐个探测 `package.json`、`tsconfig.json`、`Dockerfile`、`.nvmrc`（读不到即视为不存在）。`package.json` 解析出包名@版本、`packageManager`、scripts/依赖/开发依赖数量、`engines`、`type`；不递归、不读大文件（锁文件不读），因此秒开。非法 JSON 显示"解析失败"而不是抛错；
3. 该根工作区**完整展开**的树（含全部后代），**复用工作区列表的同一套行**（`dws-wsRow` / `dws-sessionRow`、同样的文件夹 icon、缩进与悬停样式），因此这里就是列表那套 Hierarchy 视图的“全展开版”；每个工作区后显示**自身会话**合计 Token，每个会话后显示该会话合计 Token，悬浮显示模型明细（Token 数字只在这里出现）；
4. 每个会话后的**对话轮次**小字链接（最多列最近 24 轮），点击打开该会话并滚动定位到该轮；
5. 页面底部渲染该根工作区的 `README.md`（GitHub 风格，走原生 Markdown 渲染器）。

> 原「Token 消耗趋势条形图」及其容器、7/30 天切换、`usageRange` 设置项与 `.dws-chart*` 样式**已按需求移除**；Token 仍以总量 + 按模型悬浮卡 + 每行徽标的形式展示。
>
> **跳转失败的根因（已定位并修复）**：真实报错是 **React #300「Rendered fewer hooks than expected」**。原因是我把**内部持有 hook 的组件 `RowMenu` 当普通函数调用**（`RowMenu({...})` 而不是 `E(RowMenu, {...})`），它的 8 个 hook 就被算进**总览页自己的 hook 列表**——于是「会话行数 / 根工作区数」一变，hook 数量随之变化，React 直接抛错并被边界接住。这解释了为什么**只有跳转到数据量不同的工作区**才失败。修复：所有 hook 组件一律用 `E(...)` 渲染。
>
> 并加了**永久防护**：`test-manifest.mjs` 会**自动扫描** `35-widgets.js` 中"函数体内出现 `React.use` 且名字不以 `use` 开头"的组件（当前 5 个），再断言**任何源码都没有把它们当函数调用**（反向注入一处违规会立刻失败，已验证）。
>
> 另加的加固：`QuietBoundary` 支持 `resetKey`——总览的边界以**目标序列号**为键，键变化即清除失败状态；内层页也用该序列号作 `key`（跳转即重挂载，前一个工作区的状态不残留）；失败提示里**直接显示异常消息**；树卡与依赖卡各自再包一层边界，单个卡片失败不再带走整页。（此前的"粘住"缺陷是：一次瞬时失败会让之后每一次跳转都停在失败提示上。）

双击任意工作区/会话名称即可改名（**双击会话对象除名称外的任何位置**会直接跳转到该会话）；每行后同样带「更多（打开 / 重命名 / 分叉 / 置顶 / 归档恢复）、新建会话」等原生化小功能。

### 设置

插件管理页 → 本插件卡片 → 配置区。设置卡同时注册在两个座位：`plugins.bundle.config`（按包名，显示在**组合包页面**）与 `plugins.row.config`（按 `<包名>#workspace-suite`，给该行一个原生 **Configure** 入口）——任一座位在某个构建里缺失时，另一个仍能打开表单。

| 分组 | 项 | 默认 |
|---|---|---|
| 模块 | 资源管理器式选择弹窗 / 多级工作区树与折叠 / 工作区总览页 | 全开 |
| 通用 | 工作区树最大高度（视口百分比，100 = 填满） | 100 |
| 通用 | 树超出高度时内部滚动 | 开 |
| 通用 | 进入时折叠所有子工作区 | 开（列表即树：默认闭合，点击展开后显示打开的文件夹 icon；关掉即进入时全展开） |
| 通用 | 选择弹窗默认展开层级（0–4） | 1 |
| 通用 | 显示 Token 数值（总览页；列表恒不显示） | 开 |
| 通用 | 显示对话轮次 | 开 |
| 通用 | 统计包含已归档会话 | 开 |
| 通用 | 统计包含子代理会话 | 开 |
| 通用 | 趋势图默认时间范围 | 近 7 天 |
| 通用 | 渲染根工作区 README.md | 开 |
| 通用 | README 最大高度（视口百分比） | 45 |

模块开关**即时生效**（内部会重建注册）；设置值同时写入当前浏览器的 `localStorage`，并在 profile 提供 `configForms` 作用域时镜像到该 profile 的配置。

## 与原生列表的外观/交互对齐（照抄出厂实现）

| 项目 | 做法（与出厂 `client-ui-workspace` 一致） |
|---|---|
| 列表底部渐隐 | `position:absolute;bottom:0;height:24px;pointer-events:none` + `linear-gradient(to bottom, transparent, var(--dsw-specific-sidebar-fill))`，左 0 / 右 `--dsh-session-list-edge-inset` |
| 行尾不再有空白 | 行内小功能由 `display:none` 改为悬停/`menuOpen`/`:focus-within` 时 `display:inline-flex`，**静止时不占位**；悬停时"上次修改时间"让位给按钮 |
| 名称两侧虚化 | 标题滚动位置发布 `data-scrolled` / `data-clipped`，CSS 三套 `mask-image` 渐变：左侧虚化 / 右侧虚化 / 两侧同时虚化（12px 渐隐带） |
| 悬停跑马灯 | 溢出 > 8px 才滚动，速度 0.03px/ms，**到头即停**并停在末端；离开一步回到起点（不做回程动画）；`prefers-reduced-motion` 直接跳到末端 |
| 悬停提示 | 原生 `HoverCard`，停留 500ms 后弹出；卡片文字显式取 `label-primary`/`label-secondary`，修掉与背景同色的重叠 |
| 重命名窗口 | 原生 `Modal` 的**紧凑尺寸**（大尺寸框架只留给选择弹窗），输入框沿用原生 `renameInput` 样式（`.5px` 边框 + `button-elevated-fill`）；空白名或未改动时确认禁用，重名在窗口内提示而非弹 Toast |
| 菜单项 | 行改成原生 `MenuItemButton`（**图标 + 快捷键提示 + `danger` 危险色**）；快捷键按 id 从 `useShortcuts` 取（`session.rename` / `session.fork` / `session.archive` / `session.new` / `workspace.add`），取不到就只显示图标 |
| 选择弹窗滚动条 | 树区 `overflow:auto` 并补 5px 可见滚动条（thumb 用 `--dsw-alias-scrollbar-bg-l2`） |
| 列表高度 | 列表**填满**到最下方账号行并在内部滚动（原生行为）；设置项「工作区树最大高度」默认改为 **100**，调低才会限高 |
| 选择弹窗滚动条 | 树区 `overflow-y:auto` 并补 5px 可见滚动条；**关键**：原生 `Modal` 的 DOM 是 `dialog > content > body(children)`，中间那层不是本插件能控的 flex 容器，所以树区改用视口相对限高 `max-height:min(46vh,420px)`，保证一定出现内部滚动（只写 `flex:1;min-height:0` 会完全不滚动） |
| 删除工作区 | **级联删除整棵子树**：删除前在确认框里列出将一并删除的子工作区数量与名称（最多列 6 个），确认后**由深到浅**依次删除，避免留孤儿；文案见 `browser.deleteCascade` |
| 弹窗选中/悬浮配色 | 悬浮 = 主题业务蓝（`--dsw-alias-state-business-primary`）+ 反白文字；选中 = 淡蓝（`--dsw-alias-bg-document-selection`） |
| 取消父节点选中 | **连带取消其全部已选子节点**（同一击完成，用已测试的 `isAncestorPath` 过滤），不再弹"保留/移除"确认框；该确认框已成死代码，已连同未使用的 `selectedDescendants` 一并删除 |
| 双击判定区间 | 不再依赖平台默认（Windows ~500ms）：自绘判定窗口 **300ms**；第一击仍执行单击动作，窗口内的第二击才触发双击动作（弹窗树行的"展开/勾选"；总览页行与侧边栏行按落点区分：落在名称上=重命名，落在别处=打开），顺带修掉原来"双击 = 展开+收起+勾选"三连动作的问题 |
| 工作区悬浮提示配色 | 照抄出厂：卡片是**两个外观下都固定的深色面**，文字用固定浅色 `#fff` / `#cfd3d6` / `#adb2b8`（用主题 label token 会在浅色外观下变成黑字压黑底，即"名称与背景重叠"）；`test-styles` 的颜色字面量禁令为这两处（悬停卡 + 弹窗悬浮行）开了**具名例外** |
| 展开文件夹图标 | 展开时加 `dws-folderIcon--active`（`--dsw-alias-state-business-primary`，DSH 主题蓝），未展开保持原灰 |
| 「更多」首次点击失效 | 触发器元素与点击回调改为 `useMemo`/`useCallback` **稳定化**：宿主菜单若每次渲染都收到新元素，会重新锚定并重跑焦点交接，从而吃掉第一次选择 |
| 悬停爬动只显示一半 | 爬动中该标题改用 `text-overflow:clip`（省略号是画在裁剪边上的，会把爬进来的字换成"…"），右侧改由渐隐遮罩收边；工作区行的内层「备注名 + 原名」在悬停时改为 `flex:0 0 auto; overflow:visible`，否则内层自己先把溢出藏起来，父级根本没有可爬动的溢出量 |
| 删除只删掉最深层 | 原来的"一条 Promise 链"每次只推进一环，表现为**每点一次只掉一级**。现在改为**多轮循环**：每轮重新读实时列表、按路径取后代、由深到浅逐个删，最多 8 轮，最后删目标本身；仍有残留就弹提示（`browser.deleteResidue`） |

> 两个由测试桩抓到的真实缺陷（真机同样会出问题）：把 `children` 当 **props 字段**传给宿主组件会被渲染器自身的 children 覆盖（必须用位置参数）；`Menu` 的 `anchor` 必须是**元素**而不是 DOM 节点。

## 安装

1. 客户端侧边栏 → **插件** → **添加插件**；
2. 填本目录绝对路径：`F:\DSH-Official\plugins\dsh-client-ui-workspace-suite`；
3. **安装** → **立即启用**；
4. 若卡片提示「改动在下次启动生效」，重启客户端。

profile 由客户端自己写入，请勿手工改 `profiles\desktop\package.json` / `cordis.patch.yml`。

## 排查"启用了但界面没变化"

浏览器半区会把启动进度写进 `localStorage` 的 **`dsh-workspace-suite.boot`**（ASCII JSON），因为渲染进程的 `console.error` 只有在 boot 审计失败时才会被抄进 crash 日志，而"应用能启动、但插件没生效"这种情况不会留下任何落盘痕迹。Electron 的 localStorage 以 LevelDB 存于 `%APPDATA%\@deepseek-ai\dsh-desktop\Local Storage\leveldb\*.log`，可直接在磁盘上检索这个键：

| 记录内容 | 含义 |
|---|---|
| 记录**完全不存在** | 客户端半区从未被求值：`dsh.client` 行没被组装，或 `/plugins` bundle 没被加载 → 问题在补丁层/组合层 |
| `stage: factory-failed` | 工厂求值抛错（`failures[0].detail` 是原始错误） |
| `stage: apply-failed` | `apply` 抛错 |
| `stage: apply-ok` 且 `detail.rejected > 0` | 座位注册被拒（`failures[]` 里每个 key 的具体错误）→ 插槽/注册契约问题 |
| `stage: apply-ok` 且 `registered: 7`、`rejected: 0` | 注册全部成功 → 问题在渲染/优先级/可见性，而非激活 |

记录保留最近 3 条失败阶段：后续良性阶段不会把失败覆盖掉。

## 本插件对组合层的改动（重要）

`cordis.patch.yml` 除了插入本插件自身的行，还做了一处**出厂行覆盖**：

```yaml
- id: directory-picker
  disabled: true
```

原因：出厂的 `directory-picker` 行是 `@deepseek-ai/dsh-host-directory-picker-auto`，在本机（Windows + loopback）会解析为 **native** 后端，而 native 只实现系统选择框 `pick()`，**不实现目录枚举 `list()`**——资源管理器式弹窗因此拿不到任何目录层级。本插件把该 seam 固定到 browse 后端：

- 关闭 `-auto` 行（必须关闭而不是并存：两个后端注册同一个 `ctx.directoryPicker` 服务，会重复注册报错）；
- 插入 `@deepseek-ai/dsh-host-directory-picker-browse`（提供 `list`/`createDirectory`）；
- 同时插入 `@deepseek-ai/dsh-client-ui-directory-picker-browse` 作为兜底：当本插件的「选择弹窗」模块被关掉时，出厂的**内置浏览弹窗**仍会填充目录洞，"添加工作区"依旧可用。

如需回到系统资源管理器选择框，删除 `cordis.patch.yml` 中 `- id: directory-picker` + `disabled: true` 两行并重启即可（此时本插件的选择弹窗会因缺少枚举能力而只能按报错提示降级）。

## 已验证 / 未验证

**已在本机静态验证**（`tools/` 下三个脚本，均可复跑）：

| 命令 | 作用 | 结果 |
|---|---|---|
| `node tools/build.mjs` | 由 `src/*.js` 拼装 `lib/client.js`；逐片剥离 BOM、拒绝 U+FFFD，并**拒绝非词典分片里的任何非 ASCII 字符**（UTF-8 被 GBK 往返会把 `│`/`├`/`·` 变成合法但错误的 CJK 字，无 U+FFFD 可查——本插件确实中过一次，故改为构建期硬拦截，统一用 `\uXXXX` 转义） | 通过 |
| `node --check lib/client.js` / `lib/index.js` | 语法检查 | 通过 |
| `node tools/test-manifest.mjs` | **安装契约**：模块加载器 `id` 必须等于包名（否则浏览器半区根本不会挂载）、`exports["./client"]`/`["."]` 存在、客户端 bundle 只 require 三个 baseline external、Host 半区零 `@deepseek-ai/*` import、补丁行 `name` 等于包名且 `directory-picker` 已被固定到可枚举后端、图标/双语语言包齐备 | 通过 |
| `node tools/test-styles.mjs` | **主题与布局纪律**：全部规则限定在插件前缀下、30 个变量全是 host token 或自有 `--suite-*`、**零颜色字面量**（两套外观自动跟随）、无 `100vw`、按钮 `white-space:nowrap`、flex 子项 `min-*:0`、滚动容器与 `:focus-visible` 齐备 | 通过 |
| `node tools/test-host.mjs` | Host 投影折叠单元测试（替换语义、重试重计、按模型/按天/按轮次、不变引用门、**checkpoint JSON 往返回放**：往返后继续折叠与直接折叠结果逐字段一致，未设置的 route 不会被凭空造出） | 通过 |
| `node tools/test-util.mjs` | 纯函数单测：路径规范化、`isAncestorPath` 的"不是字符串前缀"边界（`C:/a` vs `C:/ab`）、最近祖先推导、子树/祖先链、揭示链 `chainForPath`、Token 展示、按天键、相对时间、`usageViewOf` 降级、`boundCall` | 通过（18 个导出，70+ 断言） |
| `node tools/test-i18n.mjs` | 中英词典键集一致、源码用到的键都存在、**编码守卫**（非词典分片不得有非 ASCII；全库不得含 GBK 往返产生的"合法却错误"的 CJK 标记字，按码位列举，例如 U+9239 / U+6EBE / U+6F22） | 通过（144/144，126 个在用键） |
| `node tools/smoke.mjs` | 桩化 React/服务与 `hover card`/`modal`/`menu` 原语，**按 `ui-renderer` 的顺序合并每个注册的 `inject` 面并执行挂载副作用**，真实渲染 `apply` 产生的 6 个注册：断言侧边栏出现 `alpha`／`主会话`／`备注名+灰原名`／未分组标题、`sidebar.session.row.leading` 座席被渲染、默认过滤下归档会话不出现、**行上无三角箭头且无 Token 徽标**、行自身 `role=treeitem` + `aria-expanded` + 可点击展开；断言总览页渲染**同一套** `dws-wsRow`/`dws-sessionRow` 层级行且保留 Token 数字；**模拟 cordis 的 inject 门禁**（读未声明的 `remote.<ns>` 直接抛错）并断言插件读到的命名空间都已声明；断言**默认折叠**（另起一个干净 sandbox：根行可见、无工作区内会话行、闭合文件夹 icon、`aria-expanded=false`）；断言弹窗打开流程**探测了盘符并读取了全部已注册工作区路径**（实测 60 次目录读取）；**再实际"点"一次模块开关**并检查重建后的注册集；**用「无服务/无 hook」的降级 props 重渲染一轮**；实测注入面 20 个服务方法；并用**敌意** slot 注册表与敌意 `require` 验证 fail-soft 兜底与 boot 记录（正常路径 `apply-ok 6/0`） | 通过（apply 6 注册 → 开关后 16，双轮 0 问题） |

**行内「更多」菜单的契约（踩过的坑）**：原生 `Menu` 的 `anchor` 必须是**React 元素**（它把 anchor 放进自己的 children 渲染），且 `side` 只接受 `bottom`/`top`。曾误传 `triggerRef.current`（DOM 节点），React 渲染抛错后被错误边界吞掉，表现就是**点开「更多」整个工作区列表消失**。现在的做法：传元素、`side` 只用 `bottom`/`top`，并把宿主 `Menu` 放在一个**带 fallback 的边界**里——宿主菜单一旦出错就自动换成插件自带的定位菜单，只是少了原生外观，绝不会清空列表。

**未验证（需要在客户端里实际观察）**：
- **真实渲染器未参与验证**：冒烟测试用的是自制的 React 桩——本机没有任何可用 React（web 产物已把 React 打进 bundle，asar 与 profile 的 `node_modules` 里都没有 `react`/`react-dom` 源码包，`app.asar` 内也没有）。因此 **hooks 的真实语义、并发渲染行为、真实 DOM 属性过滤等，都还没有被真实 React 验证过**；这一条只能靠客户端安装后的实际表现确认。
- 视觉与交互细节（间距、浅蓝高亮观感、弹窗尺寸、悬停卡位置）只做了 token 级对齐，未经像素级比对；
- 与出厂工作区列表的行为差异：本插件的接管**不渲染**其它插件贡献的会话菜单项（`sidebar.workspaces.session.menu.item` / `session.row.action`）——影子注册不允许重新声明被影子条目的子洞，因此这些条目无法在此渲染；同时未复现原生拖拽排序、行进出动画与搜索结果深链接（`显示更多/收起` 折叠与 `sidebar.session.row.leading` 座席已复现）。
- Token 统计依赖 Host 投影：**冷会话首次读取**需要 `sessions.refreshProjections`（存在时）预热，缺失时会显示"部分会话日志不可读，统计为下限"。
- 模型归属是尽力而为：优先取 `assistant/message` 的 `message.source`，其次取最近一次 `request/header` 的 `config.provider/model`，两者都取不到时归入 `unknown`。
- 文本 Token 计数沿用「4 字符≈1 token」的近似口径（与原生 `dsh-token-meter` 一致），CJK 会被低估；只统计 provider 上报的 usage，不重算定价。
- 轮次跳转通过 `[data-chat-turn]` 定位（原生对话页确实渲染该属性），最多重试 20 次×150ms，失败则只打开会话。
- 页面长度：总览页被要求**完整展开**子树，因此不折叠列表；当该子树会话数超过 250 时，逐行的 Token 悬停卡自动降级为原生 `title`（内容仍是同样的按模型数值），避免上千个悬停卡组件成为性能悬崖。
- README 读取走 `remote.workspaceFiles.read`，需要一个可用会话作授权；工作区及其子工作区**没有任何会话**时无法读取，页面显示不可用提示。

## 卸载

客户端 → **插件** → 本插件卡片 → **卸载**（或先关闭）。卸载会一并撤销 `cordis.patch.yml` 的补丁层，`directory-picker` 行随之恢复出厂设置。

## 开发者说明

- `lib/client.js` 是**生成物**（由 `tools/build.mjs` 拼装 `src/*.js`）；改代码请改 `src/` 再跑构建。
- 浏览器半区只依赖三个 baseline external：`react`、`@deepseek-ai/dsh-client-store`、`@deepseek-ai/dsh-client-ui-primitives`；其余能力全部经 cordis 客户端上下文或插槽 props 获取，不 import 任何其它包（本机 profile 的 `@deepseek-ai` 是旧检出，裸导入会取到第二份运行时）。
- Host 半区零 import，通过 `ctx.sessionProjections.register()` 注册一个客户端可见投影单元（`workspaceSuiteUsage`），浏览器侧以 `sessions.byId[id].projectionValues.workspaceSuiteUsage` 读取。第三方 bundle 无法自定义 Typert Remote 命名空间（能力集在 `dsh-api-remotes` 构建期写死），因此投影是唯一可自扩展的 Host→浏览器通道。
- 样式以 `<style data-plugin="dsh-client-ui-workspace-suite" data-plugin-css="…">` 注入，随插件卸载移除。

## 许可

MIT
