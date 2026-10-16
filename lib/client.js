/**
 * dsh-client-ui-workspace-suite — generated browser bundle. DO NOT EDIT.
 *
 * Assembled from src/*.js by tools/build.mjs; edit a source part and re-run
 * `node tools/build.mjs`.
 */
/**
 * dsh-client-ui-workspace-suite — browser half (plain JavaScript, no build step,
 * assembled from src/*.js by tools/build.mjs).
 *
 * Registrations
 *   1. conversation.hero.workspace.directoryFlow  (single, priority -1)
 *      sidebar.workspaces.directoryFlow            (single, priority -1)
 *      an explorer-style folder picker (tree with checkboxes, bottom preview
 *      strip, double-click rename) replacing the shipped OS/browse picker.
 *   2. sidebar.workspaces (single, priority -100)
 *      replaces the shipped workspace browser with a nested workspace tree
 *      plus a collapse-all control. Shadowing the shipped entry does NOT
 *      declare its children: the child-hole declaration is exclusive and
 *      re-declaring it throws, so this entry renders its own row menus.
 *   3. sidebar.panellist + main keyed 'workspace-suite.overview'
 *      a per-workspace overview page: token totals, the fully expanded tree,
 *      turn jump links and the root README. (The per-day chart was removed at
 *      the user's request.)
 *   4. plugins.bundle.config (keyed by the package name)
 *      the settings card in the Plugins panel, where each module is switched
 *      and the shared options are edited.
 *
 * Baseline externals only: react, @deepseek-ai/dsh-client-store,
 * @deepseek-ai/dsh-client-ui-primitives. No other package is imported; every
 * other capability is read from the cordis client context or from slot props.
 */
window.__ModuleLoader__.load({
  id: 'dsh-client-ui-workspace-suite',
  factory: (require) => {
    /**
     * Boot diagnostics that survive a *successful* boot.
     *
     * The renderer console is only copied into the desktop crash log when the
     * boot audit fails, so a plugin that goes inert while the app boots leaves
     * no readable trace. This writes one always-overwritten ASCII record into
     * `localStorage` (Electron keeps it under
     * `%APPDATA%/<app>/Local Storage/leveldb`), a channel a maintainer can read
     * from disk: the stage says exactly how far the browser half got. Declared
     * before the guard so it is hoisted and callable from every catch below,
     * including one that fires before the requires ran.
     */
    function reportBoot(stage, detail) {
      try {
        if (typeof localStorage === 'undefined') return
        const key = 'dsh-workspace-suite.boot'
        let prior = null
        try {
          prior = JSON.parse(localStorage.getItem(key) || 'null')
        } catch {
          prior = null
        }
        // Later benign stages must not erase a failure: the record keeps the last
        // few failing stages alongside the newest stage reached.
        const failures = prior !== null && Array.isArray(prior.failures) ? prior.failures.slice(-3) : []
        if (/failed|rejected/.test(stage)) {
          failures.push({ stage, at: Date.now(), detail: detail === undefined ? null : detail })
        }
        localStorage.setItem(key, JSON.stringify({
          stage,
          at: Date.now(),
          detail: detail === undefined ? null : detail,
          failures,
        }))
      } catch {
        /* a diagnostics write must never become the failure it reports */
      }
    }

    // Everything below runs inside this one guard. A plugin must never be the
    // reason the shell fails to boot: the catch reports to the renderer console
    // (which the desktop copies into its crash log) and returns an inert entry.
    // The body is intentionally not re-indented, so every part stays diffable.
    try {
    reportBoot('factory-enter')
    const React = require('react')
    const storeKit = require('@deepseek-ai/dsh-client-store')
    const ui = require('@deepseek-ai/dsh-client-ui-primitives')
    reportBoot('requires-ok')

    const E = React.createElement
    const PKG = 'dsh-client-ui-workspace-suite'
    const NS = 'workspaceSuite'
    const STYLE_ID = 'dsh-workspace-suite/styles'

    /* ============================ dictionaries ============================ */

    /** Simplified Chinese dictionary; the key set is the source of truth. */
    const zh = {
      'suite.name': '工作区套件',
      'suite.description': '资源管理器式工作区选择弹窗、多级工作区树、工作区总览',

      'common.confirm': '确定',
      'common.cancel': '取消',
      'common.close': '关闭',
      'common.done': '完成',
      'common.retry': '重试',
      'common.loading': '加载中…',
      'common.none': '无',
      'common.all': '全部',

      'picker.title': '选择工作区文件夹',
      'picker.open': '打开',
      'picker.cancel': '取消',
      'picker.selected': '已选择 {n} 个文件夹',
      'picker.expand': '展开',
      'picker.collapse': '收起',
      'picker.loading': '正在读取…',
      'picker.empty': '此文件夹下没有子文件夹',
      'picker.error.list': '无法读取该文件夹：{message}',
      'picker.error.create': '创建工作区失败：{message}',
      'picker.remarkOnly': '备注留空时将使用文件夹原名。',
      'picker.alignedHint': '已按当前工作区状态勾选；取消勾选不会删除工作区（删除请用工作区行的“更多”菜单）。',
      'picker.filter': '筛选文件夹',
      'picker.hidden': '显示隐藏项',
      'picker.root': '根目录',
      'picker.pathEdit': '输入路径…',
      'picker.pathInvalid': '无法读取该路径：{message}',
      'picker.system': '系统选择框…',
      'picker.truncated': '条目过多，这里只显示了一部分',
      'picker.conflict.title': '不在同一目录树中',
      'picker.conflict.body': '“{name}”与已选文件夹没有父子关系，加入它会成为另一棵树。继续将清空之前的选择。',
      'picker.conflict.replace': '清空并选择它',
      'picker.conflict.cancel': '取消',
      'picker.newFolder': '在此新建子文件夹',
      'picker.newFolder.placeholder': '新文件夹名称',
      'picker.newFolder.duplicate': '同级已有同名文件夹，请改名',
      'picker.newFolder.unavailable': '当前后端不支持创建文件夹',
      'picker.entry.title': '进入哪个工作区？',
      'picker.entry.body': '以下是刚刚确认的工作区结构，选一个开始会话（也可以直接跳过）。',
      'picker.entry.enter': '进入',
      'picker.entry.skip': '跳过',
      'picker.subtree.body': '“{name}”下还有子工作区，请选择用哪一个开始本次会话。',

      'browser.title': '工作区',
      'browser.search': '搜索',
      'browser.search.placeholder': '搜索工作区或会话',
      'browser.search.empty': '没有匹配的结果',
      'browser.search.searching': '正在搜索…',
      'browser.add': '添加工作区',
      'browser.collapseAll': '折叠所有子工作区',
      'browser.expandAll': '展开所有工作区',
      'browser.folder': '工作区',
      'browser.empty': '暂无工作区',
      'browser.empty.hint': '点击上方 + 选择文件夹',
      'browser.newSession': '新会话',
      'browser.ungrouped': '未分组',
      'browser.more': '更多',
      'browser.showMore': '显示更多',
      'browser.showLess': '收起',
      'browser.expandRow': '展开',
      'browser.collapseRow': '收起子工作区',
      'browser.overview': '工作区总览',
      'browser.pickWorkspace': '工作区选择…',
      'browser.renameWorkspace': '重命名工作区',
      'browser.deleteWorkspace': '删除工作区',
      'browser.newSessionIn': '在此新建会话',
      'browser.rename': '重命名',
      'browser.fork': '分叉',
      'browser.archive': '归档会话',
      'browser.unarchive': '恢复会话',
      'browser.pin': '置顶会话',
      'browser.unpin': '取消置顶',
      'browser.renameTitle': '重命名会话',
      'browser.renameWorkspaceTitle': '重命名工作区',
      'browser.deleteTitle': '删除工作区',
      'browser.deleteBody': '将删除工作区“{name}”的注册。其会话会保留在“未分组”中，文件夹本身不会被删除。',
      'browser.deleteCascade': '它下面的 {n} 个子工作区会一并删除：{names}',
      'browser.deleteResidue': '有 {n} 个子工作区未能删除，请再试一次。',
      'browser.namePlaceholder': '名称',
      'browser.duplicate': '已有同名工作区',
      'browser.empty.name': '名称不能为空',
      'browser.showArchived': '显示已归档会话',
      'browser.showArchived.only': '仅显示已归档会话',
      'browser.showArchived.hide': '隐藏已归档会话',
      'browser.showArchived.label': '归档会话',
      'browser.tokens': '{n} tokens',
      'browser.turns': '{n} 轮',
      'browser.noTurns': '暂无轮次',
      'browser.archived': '已归档',
      'browser.pinned': '已置顶',
      'browser.running': '生成中',
      'browser.failed': '操作失败：{message}',
      'time.now': '刚刚',
      'time.minutes': '{n} 分钟前',
      'time.hours': '{n} 小时前',
      'time.days': '{n} 天前',
      'md.copy': '复制',
      'md.copied': '已复制',
      'md.code': '代码',
      'md.wrap': '自动换行',
      'md.unwrap': '取消换行',
      'md.footnotes': '脚注',

      'overview.title': '工作区总览',
      'overview.pick': '选择根工作区',
      'overview.totalTokens': '全部 Token 消耗（含子工作区）',
      'overview.selfTokens': '本工作区会话合计',
      'overview.sessionTokens': '本会话合计',
      'overview.models': '模型消耗明细',
      'overview.model.mine': '本工作区及子工作区',
      'overview.tree.title': '工作区与会话',
      'overview.tree.empty': '该工作区下还没有会话',
      'overview.empty': '该工作区还没有会话，暂无统计。可以先用它新建一个会话。',
      'overview.failed': '总览渲染失败，已降级为这条提示（其余功能不受影响）。',
      'overview.turns': '对话轮次',
      'overview.turn': '第 {n} 轮',
      'overview.readme': 'README.md',
      'overview.readme.missing': '该工作区目录下没有 README.md',
      'overview.readme.denied': '无法读取 README.md：{message}',
      'overview.env.title': '依赖与环境',
      'overview.env.dirs': '顶层子目录',
      'overview.env.pkgMissing': '顶层没有 package.json（可能不是 Node 项目）',
      'overview.env.parseError': 'package.json 不是合法 JSON，无法解析',
      'overview.env.unnamed': '未命名包',
      'overview.env.manager': '包管理器',
      'overview.env.managerNone': '未声明',
      'overview.env.scripts': '脚本',
      'overview.env.deps': '依赖 / 开发依赖',
      'overview.env.engines': '运行时要求',
      'overview.env.probes': '顶层文件探测（读不到即视为不存在）',
      'overview.env.loading': '正在读取顶层信息…',
      'overview.env.error': '读取失败：{message}',
      'overview.stats.loading': '正在统计 Token 消耗…',
      'overview.stats.error': '统计失败：{message}',
      'overview.stats.partial': '部分会话日志不可读，统计为下限',
      'overview.stats.fallback': '当前 Host 未提供模型/按天明细，已降级为会话总量',
      'overview.refresh': '刷新统计',
      'overview.open': '打开会话',
      'overview.archivedCount': '含 {n} 个已归档会话',
      'overview.subagentCount': '含 {n} 个子代理会话',

      'settings.title': '工作区套件设置',
      'settings.description': '按模块启用，并调整工作区树的显示方式。设置保存在当前浏览器，并在可用时同步到本项目 profile 配置。',
      'settings.modules': '功能模块',
      'settings.module.picker': '资源管理器式工作区选择弹窗',
      'settings.module.picker.hint': '替换“添加工作区”的系统目录选择窗口。',
      'settings.module.tree': '多级工作区树与折叠',
      'settings.module.tree.hint': '接管侧边栏工作区列表，按磁盘目录嵌套显示。',
      'settings.module.overview': '工作区总览页',
      'settings.module.overview.hint': '在侧边栏新增总览面板，展示 Token 统计与 README。',
      'settings.options': '通用选项',
      'settings.treeMaxHeight': '工作区树最大高度',
      'settings.treeMaxHeight.hint': '单位为视口高度的百分比；超出后树内部滚动。',
      'settings.treeScroll': '树超出高度时内部滚动',
      'settings.collapseAllByDefault': '进入时折叠所有子工作区',
      'settings.pickerDepth': '选择弹窗默认展开层级',
      'settings.showTokens': '显示 Token 数值',
      'settings.showTokens.hint': '在工作区树与总览页显示消耗量徽标。',
      'settings.showTurns': '显示对话轮次',
      'settings.turns.hint': '在总览页的每个会话后显示轮次并可跳转。',
      'settings.includeArchived': '统计包含已归档会话',
      'settings.includeSubagent': '统计包含子代理会话',
      'settings.readme': '渲染根工作区 README.md',
      'settings.showEnv': '显示「依赖与环境」卡',
      'settings.readmeMaxHeight': 'README 最大高度',
      'settings.readmeMaxHeight.hint': '单位为视口高度的百分比；超出后内部滚动。',
      'settings.reset': '恢复默认',
      'settings.saved': '已保存',
    }

    /** English dictionary, checked complete against the zh key set. */
    const en = {
      'suite.name': 'Workspace suite',
      'suite.description': 'Explorer-style workspace picker, nested workspace tree and a workspace overview page.',

      'common.confirm': 'Confirm',
      'common.cancel': 'Cancel',
      'common.close': 'Close',
      'common.done': 'Done',
      'common.retry': 'Retry',
      'common.loading': 'Loading…',
      'common.none': 'None',
      'common.all': 'All',

      'picker.title': 'Select workspace folders',
      'picker.open': 'Open',
      'picker.cancel': 'Cancel',
      'picker.selected': '{n} folder(s) selected',
      'picker.expand': 'Expand',
      'picker.collapse': 'Collapse',
      'picker.loading': 'Reading…',
      'picker.empty': 'No subfolder here',
      'picker.error.list': 'Cannot read this folder: {message}',
      'picker.error.create': 'Could not create the workspace: {message}',
      'picker.remarkOnly': 'An empty note keeps the folder name.',
      'picker.alignedHint': 'Checked to match the current workspaces; unchecking never deletes one (use the workspace row menu for that).',
      'picker.filter': 'Filter folders',
      'picker.hidden': 'Show hidden entries',
      'picker.root': 'Root',
      'picker.pathEdit': 'Enter a path…',
      'picker.pathInvalid': 'Cannot read that path: {message}',
      'picker.system': 'System dialog…',
      'picker.truncated': 'Too many entries: only part of them are listed',
      'picker.conflict.title': 'Not in the same tree',
      'picker.conflict.body': '"{name}" is neither a parent nor a child of the selected folders, so it would start another tree. Continuing clears the earlier picks.',
      'picker.conflict.replace': 'Clear and select it',
      'picker.conflict.cancel': 'Cancel',
      'picker.newFolder': 'New subfolder here',
      'picker.newFolder.placeholder': 'New folder name',
      'picker.newFolder.duplicate': 'A sibling folder already has that name',
      'picker.newFolder.unavailable': 'This backend cannot create folders',
      'picker.entry.title': 'Which workspace do you enter?',
      'picker.entry.body': 'These are the workspaces you just confirmed. Pick one to start a session, or skip.',
      'picker.entry.enter': 'Enter',
      'picker.entry.skip': 'Skip',
      'picker.subtree.body': '"{name}" has sub-workspaces below it; pick the one this conversation should start in.',

      'browser.title': 'Workspaces',
      'browser.search': 'Search',
      'browser.search.placeholder': 'Search workspaces or sessions',
      'browser.search.empty': 'No matching result',
      'browser.search.searching': 'Searching…',
      'browser.add': 'Add workspace',
      'browser.collapseAll': 'Collapse all sub-workspaces',
      'browser.expandAll': 'Expand all workspaces',
      'browser.folder': 'Workspace',
      'browser.empty': 'No workspace yet',
      'browser.empty.hint': 'Use the + button above to pick a folder',
      'browser.newSession': 'New session',
      'browser.ungrouped': 'Ungrouped',
      'browser.more': 'More',
      'browser.showMore': 'Show more',
      'browser.showLess': 'Show less',
      'browser.expandRow': 'Expand',
      'browser.collapseRow': 'Collapse sub-workspaces',
      'browser.overview': 'Workspace overview',
      'browser.pickWorkspace': 'Select workspace…',
      'browser.renameWorkspace': 'Rename workspace',
      'browser.deleteWorkspace': 'Delete workspace',
      'browser.newSessionIn': 'New session here',
      'browser.rename': 'Rename',
      'browser.fork': 'Fork',
      'browser.archive': 'Archive session',
      'browser.unarchive': 'Restore session',
      'browser.pin': 'Pin session',
      'browser.unpin': 'Unpin',
      'browser.renameTitle': 'Rename session',
      'browser.renameWorkspaceTitle': 'Rename workspace',
      'browser.deleteTitle': 'Delete workspace',
      'browser.deleteBody': 'Removes the registration of "{name}". Its sessions stay under Ungrouped; the folder itself is never deleted.',
      'browser.deleteCascade': 'Its {n} sub-workspace(s) are deleted too: {names}',
      'browser.deleteResidue': '{n} sub-workspace(s) could not be deleted; please try again.',
      'browser.namePlaceholder': 'Name',
      'browser.duplicate': 'A workspace already uses this name',
      'browser.empty.name': 'Name cannot be empty',
      'browser.showArchived': 'Show archived sessions',
      'browser.showArchived.only': 'Archived sessions only',
      'browser.showArchived.hide': 'Hide archived sessions',
      'browser.showArchived.label': 'Archived sessions',
      'browser.tokens': '{n} tokens',
      'browser.turns': '{n} turns',
      'browser.noTurns': 'No turns yet',
      'browser.archived': 'Archived',
      'browser.pinned': 'Pinned',
      'browser.running': 'Running',
      'browser.failed': 'Operation failed: {message}',
      'time.now': 'just now',
      'time.minutes': '{n} min ago',
      'time.hours': '{n} h ago',
      'time.days': '{n} d ago',
      'md.copy': 'Copy',
      'md.copied': 'Copied',
      'md.code': 'Code',
      'md.wrap': 'Wrap lines',
      'md.unwrap': 'Unwrap lines',
      'md.footnotes': 'Footnotes',

      'overview.title': 'Workspace overview',
      'overview.pick': 'Choose a root workspace',
      'overview.totalTokens': 'Total token usage (including sub-workspaces)',
      'overview.selfTokens': 'Sessions of this workspace',
      'overview.sessionTokens': 'This session',
      'overview.models': 'Usage by model',
      'overview.model.mine': 'This workspace and its descendants',
      'overview.tree.title': 'Workspaces and sessions',
      'overview.tree.empty': 'No session in this workspace yet',
      'overview.empty': 'This workspace has no session yet, so there is nothing to summarise.',
      'overview.failed': 'The overview failed to render; this notice replaces it.',
      'overview.turns': 'Turns',
      'overview.turn': 'Turn {n}',
      'overview.readme': 'README.md',
      'overview.readme.missing': 'This workspace has no README.md',
      'overview.readme.denied': 'Cannot read README.md: {message}',
      'overview.env.title': 'Dependencies and environment',
      'overview.env.dirs': 'Top-level subdirectories',
      'overview.env.pkgMissing': 'No package.json at the top level (probably not a Node project)',
      'overview.env.parseError': 'package.json is not valid JSON',
      'overview.env.unnamed': 'unnamed package',
      'overview.env.manager': 'Package manager',
      'overview.env.managerNone': 'not declared',
      'overview.env.scripts': 'Scripts',
      'overview.env.deps': 'Dependencies / dev',
      'overview.env.engines': 'Runtime requirements',
      'overview.env.probes': 'Top-level file probes (unreadable counts as absent)',
      'overview.env.loading': 'Reading the top level…',
      'overview.env.error': 'Could not read: {message}',
      'overview.stats.loading': 'Measuring token usage…',
      'overview.stats.error': 'Measurement failed: {message}',
      'overview.stats.partial': 'Some session logs were unreadable; totals are a lower bound',
      'overview.stats.fallback': 'This host serves no per-model or per-day detail; totals only',
      'overview.refresh': 'Refresh usage',
      'overview.open': 'Open session',
      'overview.archivedCount': 'Includes {n} archived session(s)',
      'overview.subagentCount': 'Includes {n} subagent session(s)',

      'settings.title': 'Workspace suite settings',
      'settings.description': 'Switch each module and adjust how the workspace tree is shown. Settings live in this browser and sync to the profile config when available.',
      'settings.modules': 'Modules',
      'settings.module.picker': 'Explorer-style workspace picker',
      'settings.module.picker.hint': 'Replaces the system folder chooser behind "Add workspace".',
      'settings.module.tree': 'Nested workspace tree with collapse',
      'settings.module.tree.hint': 'Takes over the sidebar workspace list and nests it by disk folder.',
      'settings.module.overview': 'Workspace overview page',
      'settings.module.overview.hint': 'Adds an overview panel with token usage and the README.',
      'settings.options': 'Options',
      'settings.treeMaxHeight': 'Maximum tree height',
      'settings.treeMaxHeight.hint': 'Percentage of the viewport height; the tree scrolls inside once exceeded.',
      'settings.treeScroll': 'Scroll inside when the tree is taller',
      'settings.collapseAllByDefault': 'Collapse all sub-workspaces on entry',
      'settings.pickerDepth': 'Picker default expansion depth',
      'settings.showTokens': 'Show token figures',
      'settings.showTokens.hint': 'Token badges in the workspace tree and the overview page.',
      'settings.showTurns': 'Show turn counts',
      'settings.turns.hint': 'Shows the turn count after each session on the overview page and makes it jumpable.',
      'settings.includeArchived': 'Count archived sessions',
      'settings.includeSubagent': 'Count subagent sessions',
      'settings.readme': 'Render the root README.md',
      'settings.showEnv': 'Show the dependencies and environment card',
      'settings.readmeMaxHeight': 'README maximum height',
      'settings.readmeMaxHeight.hint': 'Percentage of the viewport height; the README scrolls inside once exceeded.',
      'settings.reset': 'Restore defaults',
      'settings.saved': 'Saved',
    }

    /* ============================== utilities ============================== */

    /** Insert one <style> node per id, tagged the way shipped packages tag theirs. */
    function insertStyle(id, css) {
      if (typeof document === 'undefined') return () => {}
      const selector = 'style[data-plugin-css=' + JSON.stringify(id) + ']'
      if (document.querySelector(selector) !== null) return () => {}
      const node = document.createElement('style')
      node.dataset.plugin = PKG
      node.dataset.pluginCss = id
      node.textContent = css
      document.head.appendChild(node)
      return () => {
        if (node.parentNode !== null) node.parentNode.removeChild(node)
      }
    }

    /** Report a failure without letting it escape a slot boundary. */
    const warn = (message, error) => {
      try {
        console.warn('[workspace-suite] ' + message, error)
      } catch {}
    }

    /** Read a service off the client context without tripping the inject proxy. */
    function serviceOf(ctx, name) {
      try {
        return ctx && typeof ctx.get === 'function' ? ctx.get(name) : undefined
      } catch {
        return undefined
      }
    }

    /** Cache one selected slice per source so useSyncExternalStore never loops. */
    function makeSelectorHook(source) {
      if (source === undefined || source === null
        || typeof source.getSnapshot !== 'function' || typeof source.subscribe !== 'function') {
        return null
      }
      return function useSelected(selector) {
        const read = React.useCallback(() => {
          const snapshot = source.getSnapshot()
          return typeof selector === 'function' ? selector(snapshot) : snapshot
        }, [selector])
        return React.useSyncExternalStore(source.subscribe, read)
      }
    }

    /** The hook a slot prop supplies, or one bound to the raw observable. */
    function hookFrom(props, name, source) {
      const supplied = props === undefined || props === null ? undefined : props[name]
      if (typeof supplied === 'function') return supplied
      return makeSelectorHook(source)
    }

    /**
     * An error boundary that keeps one broken seat from blanking the shell. It
     * renders `fallback` when given, and reports through `onError` so the caller
     * can switch to a simpler implementation on its next render.
     */
    class QuietBoundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { failed: false, message: null }
      }

      static getDerivedStateFromError() {
        return { failed: true }
      }

      componentDidCatch(error) {
        warn('component crashed', error)
        this.setState({
          message: error === null || error === undefined
            ? 'unknown'
            : String(error.message === undefined ? error : error.message),
        })
        if (typeof this.props.onError === 'function') {
          try {
            this.props.onError(error)
          } catch (nested) {
            warn('boundary handler failed', nested)
          }
        }
      }

      componentDidUpdate(previous) {
        // A sticky failure is worse than the failure itself: without this, one bad
        // render (for example a projection that was not ready yet) kept the fallback
        // on screen for every later navigation. The caller passes a key that changes
        // whenever the content is supposed to be different.
        if (this.state.failed && previous.resetKey !== this.props.resetKey) {
          this.setState({ failed: false, message: null })
        }
      }

      render() {
        if (this.state.failed) {
          return typeof this.props.fallback === 'function' ? this.props.fallback(this.state.message) : null
        }
        return this.props.children
      }
    }

    /** Wrap a component in the quiet boundary (one factory per registration). */
    const bounded = (Component) => function Bounded(props) {
      return E(QuietBoundary, null, E(Component, props))
    }

    /* ---------------------------- path and tree ---------------------------- */

    /** Canonical comparison form of a path: forward slashes, no trailing slash. */
    function normalizePath(value) {
      if (typeof value !== 'string' || value.length === 0) return ''
      let out = value.replace(/[\\/]+/g, '/')
      if (/^[a-z]:$/i.test(out)) out += '/'
      while (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1)
      return out
    }

    /** Case-folded path used for identity comparisons. */
    const foldPath = (value) => normalizePath(value).toLowerCase()

    /** True when `ancestor` is a strict directory ancestor of `descendant`. */
    function isAncestorPath(ancestor, descendant) {
      const a = foldPath(ancestor)
      const b = foldPath(descendant)
      if (a === '' || b === '' || a === b) return false
      return b.startsWith(a.endsWith('/') ? a : a + '/')
    }

    /**
     * Directory ancestors of one path, nearest first, normalized like every other
     * path in this plugin: `C:\a\b` -> [`C:/a`, `C:`]. Used to keep a folder
     * selection nestable (fill the chain, force a sibling's parent).
     */
    function parentPathsOf(value) {
      const out = []
      let current = normalizePath(value)
      for (let guard = 0; guard < 64; guard += 1) {
        const cut = current.replace(/[^/]+$/, '')
        const parent = cut.replace(/\/+$/, '')
        if (parent === '' || parent === current) break
        out.push(parent)
        current = parent
      }
      return out
    }

    /** Trailing segment of a path, or the whole value when it has no separator. */
    function baseName(value) {
      const out = normalizePath(value)
      const index = out.lastIndexOf('/')
      if (index < 0) return out
      return out.slice(index + 1) || out
    }

    /** The stored title, or the localized default for an auto-named workspace. */
    function workspaceTitle(workspace, defaultLabel) {
      const title = workspace === undefined ? '' : workspace.title
      if (typeof title !== 'string' || title.trim() === '') return baseName(workspace.path)
      if (title === 'Workspace') return defaultLabel
      return title
    }

    /**
     * Nest every workspace under its nearest registered ancestor directory.
     * Sibling order follows the controller's own order; roots keep their order.
     */
    function buildWorkspaceTree(items) {
      const list = Array.isArray(items) ? items : []
      const order = new Map(list.map((workspace, index) => [workspace.workspaceId, index]))
      const depths = list.map((workspace) => foldPath(workspace.path).length)
      const parentOf = new Map()
      list.forEach((workspace, index) => {
        let owner = null
        let ownerDepth = -1
        list.forEach((candidate, candidateIndex) => {
          if (candidateIndex === index) return
          if (!isAncestorPath(candidate.path, workspace.path)) return
          if (depths[candidateIndex] > ownerDepth) {
            owner = candidate.workspaceId
            ownerDepth = depths[candidateIndex]
          }
        })
        parentOf.set(workspace.workspaceId, owner)
      })
      const childrenOf = new Map()
      const push = (owner, workspace) => {
        if (!childrenOf.has(owner)) childrenOf.set(owner, [])
        childrenOf.get(owner).push(workspace)
      }
      list.forEach((workspace) => push(parentOf.get(workspace.workspaceId), workspace))
      const byOrder = (a, b) => (order.get(a.workspaceId) ?? 0) - (order.get(b.workspaceId) ?? 0)
      for (const bucket of childrenOf.values()) bucket.sort(byOrder)
      const roots = childrenOf.get(null) || []
      return { parentOf, childrenOf, roots }
    }

    /** Every workspace id from `rootId` down (root included). */
    function collectSubtree(parentOf, childrenOf, rootId) {
      const out = []
      const walk = (workspaceId) => {
        out.push(workspaceId)
        for (const child of childrenOf.get(workspaceId) || []) walk(child.workspaceId)
      }
      walk(rootId)
      return out
    }

    /** Ancestor chain of one workspace, outermost first. */
    function ancestorsOf(parentOf, workspaceId) {
      const out = []
      let cursor = parentOf.get(workspaceId) ?? null
      let guard = 0
      while (cursor !== null && guard < 64) {
        out.unshift(cursor)
        cursor = parentOf.get(cursor) ?? null
        guard += 1
      }
      return out
    }

    /**
     * The levels that must be loaded and expanded to reveal one path, derived
     * from a host listing's `crumbs` (root-to-target, target inclusive) and
     * repaired when that chain does not end at the requested target.
     */
    function chainForPath(listing, path) {
      const target = normalizePath(path)
      const chain = []
      const seen = new Set()
      const crumbs = listing !== undefined && listing !== null && Array.isArray(listing.crumbs) ? listing.crumbs : []
      for (const crumb of crumbs) {
        const candidate = normalizePath(crumb === null || typeof crumb !== 'object' ? '' : crumb.path)
        if (candidate === '' || seen.has(foldPath(candidate))) continue
        seen.add(foldPath(candidate))
        chain.push(candidate)
      }
      if (target !== '' && foldPath(chain.length === 0 ? '' : chain[chain.length - 1]) !== foldPath(target)) {
        if (!seen.has(foldPath(target))) chain.push(target)
      }
      return chain
    }

    /* ------------------------------ formatting ----------------------------- */

    /**
     * Compact token figure for the row/total **badges**: 1500 -> 1.5K,
     * 15000000 -> 15M. Every other token figure on the overview — hover cards,
     * model rows and the totals line — uses {@link formatCount} and prints exact
     * digits with thousands separators.
     */
    function formatTokens(value) {
      const n = typeof value === 'number' && Number.isFinite(value) ? value : 0
      if (n < 1000) return String(n)
      if (n < 1000000) return (n / 1000).toFixed(n < 10000 ? 1 : 0) + 'K'
      return (n / 1000000).toFixed(n < 10000000 ? 1 : 0) + 'M'
    }

    /** Exact figure with thousands separators: 1234567 -> 1,234,567. */
    function formatCount(value) {
      const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 0
      const text = String(Math.abs(n))
      const grouped = text.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      return (n < 0 ? '-' : '') + grouped
    }

    /**
     * Double-click window for the rename/toggle gestures, in milliseconds.
     * Deliberately shorter than the platform default (~500ms on Windows) so a
     * rename reacts immediately; shared by the list, the picker and the overview.
     */
    const RENAME_DOUBLE_CLICK_MS = 300

    /** Day key (local) of a timestamp. */
    function dayKey(value) {
      const date = new Date(typeof value === 'number' ? value : Date.parse(String(value)))
      if (Number.isNaN(date.getTime())) return ''
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return date.getFullYear() + '-' + month + '-' + day
    }

    /** Short relative time for a session row, mirroring the host's compact copy. */
    function relativeTime(value, t, now) {
      const stamp = typeof value === 'number' ? value : Date.parse(String(value))
      if (!Number.isFinite(stamp)) return ''
      const delta = Math.max(0, (now ?? Date.now()) - stamp)
      const minute = 60000
      const hour = 60 * minute
      const day = 24 * hour
      if (delta < minute) return t('time.now')
      if (delta < hour) return t('time.minutes', { n: Math.round(delta / minute) })
      if (delta < day) return t('time.hours', { n: Math.round(delta / hour) })
      if (delta < 30 * day) return t('time.days', { n: Math.round(delta / day) })
      return new Date(stamp).toLocaleDateString()
    }

    /** Message text of an unknown rejection. */
    function errorMessage(reason) {
      if (reason instanceof Error) return reason.message
      if (typeof reason === 'string') return reason
      try {
        return JSON.stringify(reason)
      } catch {
        return String(reason)
      }
    }

    /** Numeric timestamp of a value that may be a number, an ISO string or absent. */
    function timestamp(value) {
      if (typeof value === 'number' && Number.isFinite(value)) return value
      const parsed = Date.parse(String(value))
      return Number.isFinite(parsed) ? parsed : 0
    }

    /** Call one service method, rejecting with a readable message when absent. */
    function boundCall(owner, name, ...args) {
      if (owner === undefined || owner === null || typeof owner[name] !== 'function') {
        return Promise.reject(new Error('service method unavailable: ' + name))
      }
      return Promise.resolve(owner[name](...args))
    }

    /** The projection key this bundle's host half registers. */
    const USAGE_KEY = 'workspaceSuiteUsage'

    /**
     * The top-level files the environment card probes by **reading** them. The
     * directory seam cannot help here: the browse backend's `list` filters every
     * non-directory out, so a file's existence can only be discovered by asking for
     * its content (an unreadable file is simply reported as absent).
     */
    const ENV_PROBE_FILES = ['package.json', 'tsconfig.json', 'Dockerfile', '.nvmrc']

    /** Child directory names from one listing, keeping the host's own spelling. */
    function directoryNames(listing) {
      const entries = listing === null || listing === undefined
        ? []
        : (Array.isArray(listing.entries) ? listing.entries : listing)
      const names = []
      for (const entry of Array.isArray(entries) ? entries : []) {
        if (entry === null || typeof entry !== 'object') continue
        const name = typeof entry.name === 'string' && entry.name.length > 0 ? entry.name : baseName(entry.path)
        if (typeof name === 'string' && name.length > 0) names.push(name)
      }
      return names
    }

    /**
     * The few facts the overview shows about one `package.json`. Pure, so a malformed
     * file reports `parseError` instead of throwing inside a render.
     */
    function packageSummary(text) {
      if (typeof text !== 'string' || text.trim().length === 0) return null
      let parsed = null
      try {
        parsed = JSON.parse(text)
      } catch {
        return { parseError: true }
      }
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return { parseError: true }
      const count = (value) => (value !== null && typeof value === 'object' ? Object.keys(value).length : 0)
      return {
        name: typeof parsed.name === 'string' ? parsed.name : '',
        version: typeof parsed.version === 'string' ? parsed.version : '',
        private: parsed.private === true,
        scripts: count(parsed.scripts),
        dependencies: count(parsed.dependencies),
        devDependencies: count(parsed.devDependencies),
        engines: parsed.engines !== null && typeof parsed.engines === 'object' ? parsed.engines : {},
        packageManager: typeof parsed.packageManager === 'string' ? parsed.packageManager : '',
        moduleType: typeof parsed.type === 'string' ? parsed.type : '',
      }
    }

    /** One `engines: node >=18` style figure, or an empty string when undeclared. */
    function enginesSummary(engines) {
      if (engines === null || engines === undefined || typeof engines !== 'object') return ''
      return Object.keys(engines)
        .sort()
        .map((key) => key + ' ' + String(engines[key]))
        .join(' \u00B7 ')
    }

    /** Sum of the four durable usage buckets. */
    function sumBuckets(buckets) {
      if (buckets === undefined || buckets === null) return 0
      return (buckets.uncachedInputTokens || 0) + (buckets.outputTokens || 0)
        + (buckets.cacheReadTokens || 0) + (buckets.cacheWriteTokens || 0)
    }

    /**
     * The usage view of one session row.
     *
     * Prefers this bundle's projection (totals + per-model + per-day + turns).
     * When a host does not deliver that key — an older build, or a client that
     * filters unknown projection keys — the shipped `tokenUsage` projection
     * still carries the four cumulative buckets, so the headline totals keep
     * working and only the model/day/turn detail degrades.
     */
    function usageViewOf(summary) {
      if (summary === undefined || summary === null || summary.projectionValues === undefined) return undefined
      const values = summary.projectionValues
      const mine = values[USAGE_KEY]
      if (mine !== undefined && mine !== null && mine.totals !== undefined) return mine
      const shipped = values.tokenUsage
      if (shipped === undefined || shipped === null) return undefined
      return {
        totals: {
          uncachedInputTokens: shipped.uncachedInputTokens || 0,
          outputTokens: shipped.outputTokens || 0,
          cacheReadTokens: shipped.cacheReadTokens || 0,
          cacheWriteTokens: shipped.cacheWriteTokens || 0,
        },
        models: {},
        days: {},
        turns: [],
        fallback: true,
      }
    }

    /* =============================== settings ============================== */

    /** Default values for every setting; the settings card edits exactly these. */
    const DEFAULT_SETTINGS = {
      modulePicker: true,
      moduleTree: true,
      moduleOverview: true,
      // 100 = the list fills the space down to the account row (shipped behavior);
      // lower values cap how far it grows before it scrolls inside itself.
      treeMaxHeightPct: 100,
      treeScroll: true,
      // The list is a tree: rows start collapsed and the open-folder icon appears
      // only after a row is expanded. Turning this off expands everything on entry.
      collapseAllByDefault: true,
      pickerDepth: 1,
      // Token figures belong to the overview page; the list stays native-quiet.
      showTokens: true,
      showTurns: true,
      includeArchived: true,
      includeSubagent: true,
      readme: true,
      showEnv: true,
      readmeMaxHeightPct: 45,
    }

    const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS)

    /**
     * Browser-local settings store. localStorage is the always-available
     * authority; a host `configForms` scope, when the profile serves one, is
     * mirrored on read and written through on every change so the values also
     * survive outside this browser.
     */
    const settingsStore = storeKit.createSnapshotStore(
      { ...DEFAULT_SETTINGS },
      { persist: { name: 'dsh-workspace-suite.settings.v1' } },
    )

    let settingsScope = null

    /** Snapshot of the current settings, always a stable reference per revision. */
    const settingsSnapshot = () => settingsStore.getSnapshot()

    /** One settings hook for the whole object; slices are derived with useMemo. */
    const useSettings = () => React.useSyncExternalStore(settingsStore.subscribe, settingsSnapshot)

    /** Apply a plain patch, dropping unknown keys and unchanged values. */
    function applySettings(patch) {
      if (patch === null || typeof patch !== 'object') return
      const next = {}
      let changed = false
      for (const key of SETTINGS_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(patch, key)) continue
        const value = patch[key]
        if (value === undefined || value === settingsStore.getSnapshot()[key]) continue
        next[key] = value
        changed = true
      }
      if (changed) settingsStore.update((draft) => Object.assign(draft, next))
    }

    /** Read the host scope's value bag out of whichever snapshot shape it uses. */
    function scopeValueOf(snapshot) {
      if (snapshot === null || typeof snapshot !== 'object') return null
      if (snapshot.status !== undefined) {
        return snapshot.status === 'ready' && snapshot.value !== null && typeof snapshot.value === 'object'
          ? snapshot.value
          : null
      }
      return snapshot
    }

    /** Bind the profile's config scope; hydration merges only known keys. */
    function attachSettingsScope(scope) {
      if (scope === null || scope === undefined) return
      settingsScope = scope
      try {
        applySettings(scopeValueOf(scope.getSnapshot()))
      } catch (error) {
        warn('settings hydration failed', error)
      }
      if (typeof scope.subscribe === 'function') {
        try {
          scope.subscribe(() => {
            try {
              applySettings(scopeValueOf(scope.getSnapshot()))
            } catch (error) {
              warn('settings refresh failed', error)
            }
          })
        } catch (error) {
          warn('settings subscription failed', error)
        }
      }
    }

    /** Write one setting locally and, when bound, to the profile config. */
    function writeSetting(key, value) {
      settingsStore.update((draft) => {
        draft[key] = value
      })
      const scope = settingsScope
      if (scope === null || typeof scope.set !== 'function') return
      try {
        Promise.resolve(scope.set(key, value)).catch((error) => warn('config write failed: ' + key, error))
      } catch (error) {
        warn('config write threw: ' + key, error)
      }
    }

    /** Restore every default, locally and in the bound scope. */
    function resetSettings() {
      for (const key of SETTINGS_KEYS) writeSetting(key, DEFAULT_SETTINGS[key])
    }

    /* ================================ styles =============================== */

    /**
     * One stylesheet for every surface. Only theme tokens carry colour, so both
     * shipped appearances (light/dark) follow automatically; sizes are
     * percentages or token radii, never viewport-relative widths, so no
     * container can overflow the shell.
     */
    const STYLES = [
      /* ---- shared ---- */
      '.dws-root{box-sizing:border-box;display:flex;flex-direction:column;flex:1 1 auto;min-height:0;min-width:0;',
      'padding-right:var(--dsh-session-list-edge-inset,0px);overflow:hidden}',
      '.dws-root--rail{padding-right:0}',
      '.dws-iconButton{flex:none;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;',
      'padding:0;border:none;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);',
      'cursor:pointer;white-space:nowrap}',
      '.dws-iconButton:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-iconButton[aria-pressed="true"]{color:var(--dsw-alias-label-primary)}',
      '.dws-iconButton:disabled{opacity:.5;cursor:default}',
      '.dws-iconButton:focus-visible,.dws-button:focus-visible,.dws-textButton:focus-visible,',
      '.dws-rowButton:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));',
      'outline-offset:-2px}',
      '.dws-button{flex:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:72px;height:32px;',
      'padding:0 14px;border-radius:var(--dsw-radius-md);border:.5px solid var(--dsw-alias-border-l3);',
      'background:var(--dsw-alias-button-elevated-fill);color:var(--dsw-alias-label-primary);font-size:14px;line-height:20px;',
      'white-space:nowrap;cursor:pointer}',
      '.dws-button:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-button--primary{border-color:transparent;background:var(--dsw-alias-button-primary-fill);',
      'color:var(--dsw-alias-label-primary-inverted)}',
      '.dws-button--primary:hover{background:var(--dsw-alias-button-primary-hover)}',
      '.dws-button:disabled{opacity:.5;cursor:default}',
      '.dws-textButton{border:none;background:transparent;color:var(--dsw-alias-state-business-primary);cursor:pointer;',
      'padding:0;font-size:13px;line-height:20px;white-space:nowrap}',
      '.dws-scroll{flex:1 1 auto;min-height:0;min-width:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain}',
      '.dws-listWrap{position:relative;display:flex;flex-direction:column;flex:1 1 auto;min-height:0;min-width:0}',
      '.dws-scroll::-webkit-scrollbar{width:5px}',
      '.dws-scroll::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);border-radius:3px}',
      '.dws-muted{color:var(--dsw-alias-label-tertiary)}',
      '.dws-secondary{color:var(--dsw-alias-label-secondary)}',
      '.dws-ellipsis{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dws-warn{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px;overflow-wrap:anywhere}',
      '.dws-empty{padding:18px 12px;text-align:center;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}',
      '.dws-badge{flex:none;display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:9px;',
      'background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px;',
      'white-space:nowrap;font-variant-numeric:tabular-nums}',
      '.dws-original{color:var(--dsw-alias-label-tertiary);opacity:.65;font-size:12px;line-height:18px;overflow-wrap:anywhere}',

      /* ---- sidebar workspace browser ---- */
      '.dws-header{flex:none;display:flex;align-items:center;gap:4px;height:36px;padding-left:4px;min-width:0;',
      'color:var(--dsw-alias-label-tertiary)}',
      '.dws-header--rail{flex-direction:column;height:auto;align-items:center;gap:2px;padding:4px 0;',
      'max-width:100%;overflow:hidden}',
      '.dws-headerLabel{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;line-height:20px}',
      '.dws-searchBox{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:6px;height:28px;margin:0 4px;',
      'padding:0 8px;border-radius:var(--dsw-radius-md);background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-searchInput{flex:1 1 auto;min-width:0;border:none;background:transparent;outline:none;',
      'color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}',
      '.dws-searchInput::placeholder{color:var(--dsw-alias-label-tertiary)}',
      '.dws-searchResults{display:flex;flex-direction:column;gap:2px}',
      '.dws-searchRow{box-sizing:border-box;display:flex;flex-direction:column;gap:2px;width:100%;min-width:0;min-height:48px;',
      'padding:4px 8px;border:none;border-radius:var(--dsw-radius-lg);background:transparent;color:var(--dsw-alias-label-primary);',
      'text-align:left;cursor:pointer}',
      '.dws-searchRow:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-searchHead{display:flex;align-items:center;gap:6px;min-width:0}',
      '.dws-searchMeta{display:flex;align-items:center;gap:6px;min-width:0;padding-left:20px;font-size:12px;line-height:17px;',
      'color:var(--dsw-alias-label-secondary)}',
      '.dws-snippet{min-width:0;flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dws-treeBody{display:flex;flex-direction:column;gap:0;min-height:0}',
      '.dws-groupSection{display:flex;flex-direction:column;min-width:0}',
      '.dws-wsRow{box-sizing:border-box;display:flex;align-items:center;gap:6px;height:34px;min-width:0;padding:0 8px;',
      'padding-inline-start:calc(8px + var(--suite-indent,0px));border-radius:var(--dsw-radius-md);cursor:pointer;',
      'color:var(--dsw-alias-label-primary);user-select:none}',
      '.dws-wsRow:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-wsRow:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}',
      '.dws-wsRow--current{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-wsRow--drop{box-shadow:inset 0 -2px 0 var(--dsw-alias-state-business-primary)}',
      '.dws-sessionRow{box-sizing:border-box;display:flex;align-items:center;gap:0;height:32px;min-width:0;padding:0 8px;',
      'padding-inline-start:calc(8px + var(--suite-indent,0px));border-radius:var(--dsw-radius-md);cursor:pointer;',
      'color:var(--dsw-alias-label-primary);user-select:none}',
      '.dws-sessionRow:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-sessionRow--selected{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-sessionRow--archived{color:var(--dsw-alias-label-tertiary)}',
      '.dws-moreRow{display:flex;align-items:center;height:26px;min-width:0;',
      'padding-inline-start:calc(8px + var(--suite-indent,0px))}',
      '.dws-moreRow .dws-textButton{font-size:12px;line-height:18px}',
      '.dws-chev{flex:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:20px;',
      'padding:0;border:none;border-radius:var(--dsw-radius-sm);background:transparent;cursor:pointer;',
      'color:var(--dsw-alias-label-tertiary);transition:transform .15s ease}',
      '.dws-chev:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-chev:disabled{cursor:default;background:transparent}',
      '.dws-chev:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}',
      '.dws-chev--open{transform:rotate(90deg)}',
      '.dws-chev--empty{visibility:hidden}',
      '.dws-folderIcon{flex:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:20px;',
      'color:var(--dsw-alias-label-tertiary)}',
      // Expanded folders take the theme's business blue, exactly like the shipped
      // row's active folder; a collapsed folder keeps the resting colour.
      '.dws-folderIcon--active{color:var(--dsw-alias-state-business-primary)}',
      '.dws-slot{flex:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:20px;',
      'color:var(--dsw-alias-label-tertiary)}',
      '.dws-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;',
      'line-height:20px}',
      '.dws-title--workspace{font-weight:510}',
      // A deliberate small gap between a workspace's remark name and its grey original
      // name, and between a session's leading icon and its title (the shipped session
      // row insets the title the same way).
      '.dws-title--workspace{gap:6px}',
      '.dws-wsRow .dws-original{margin-inline-start:6px}',
      '.dws-sessionRow .dws-title{margin:0 6px 0 4px}',
      // The chart frame (y-axis ticks, plot, day axis) went with the chart itself.
      // Turn rows: the session row shape one level deeper, without a token figure.
      '.dws-turnRow{box-sizing:border-box;display:flex;align-items:center;gap:6px;height:26px;min-width:0;padding:0 8px;',
      'padding-inline-start:calc(8px + var(--suite-indent,0px));border-radius:var(--dsw-radius-sm);cursor:pointer;',
      'color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}',
      '.dws-turnRow:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-turnIndex{flex:none;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}',
      '.dws-turnTitle{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      // Hover marquee masks, copied from the shipped rows: the title clips its own
      // text, crawls left while hovered and publishes data-scrolled / data-clipped
      // so the text fades on whichever side still has content hidden.
      '.dws-title[data-scrolled]{mask-image:linear-gradient(90deg,#0000,#000 12px)}',
      '.dws-title[data-clipped]{mask-image:linear-gradient(270deg,#0000,#000 12px)}',
      '.dws-title[data-scrolled][data-clipped]{mask-image:linear-gradient(90deg,#0000,#000 12px calc(100% - 12px),#0000)}',
      // While the title crawls, drop the ellipsis: it is painted at the clip edge and
      // would replace the characters being scrolled into view. The right-hand fade
      // mask takes over that job instead.
      '.dws-title[data-scrolled]{text-overflow:clip}',
      // A remark + original name pair sits in inner spans that ellipsize on their own,
      // which hides the overflow the crawl is supposed to reveal: while the row is
      // hovered they keep their natural width instead.
      '.dws-wsRow:hover .dws-title .dws-ellipsis,.dws-wsRow:hover .dws-title .dws-original{flex:0 0 auto;overflow:visible;text-overflow:clip}',
      '.dws-time{flex:none;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:17px;padding-left:6px}',
      // The shipped rows swap the trailing time for the action buttons on hover, so
      // at rest nothing reserves that trailing width.
      '.dws-rowActions{flex:none;display:none;align-items:center;gap:2px}',
      '.dws-wsRow:hover .dws-rowActions,.dws-sessionRow:hover .dws-rowActions,',
      '.dws-rowActions:focus-within{display:inline-flex}',
      '.dws-wsRow:hover .dws-time,.dws-sessionRow:hover .dws-time{display:none}',
      // Bottom fade of the tree area, matching the shipped session list.
      '.dws-fade{position:absolute;left:0;right:var(--dsh-session-list-edge-inset,0px);bottom:0;height:24px;',
      'pointer-events:none;background:linear-gradient(to bottom,transparent,var(--dsw-specific-sidebar-fill))}',
      '.dws-hoverCard{box-sizing:border-box;max-width:320px;display:flex;flex-direction:column;gap:2px;padding:8px 10px;',
      // The shipped hover card paints its own dark surface in BOTH appearances, so
      // its text palette is fixed: white title, light-grey body, grey meta. Theme
      // label tokens would go dark-on-dark in the light appearance.
      'color:#cfd3d6;font-size:12px;line-height:17px}',
      '.dws-hoverCard .dws-muted,.dws-hoverCard .dws-secondary,.dws-hoverCard .dws-modelName{color:#adb2b8}',
      '.dws-hoverCard .dws-modelValue{color:#cfd3d6}',
      '.dws-hoverCard strong{font-size:14px;font-weight:510;line-height:20px;color:#fff}',
      '.dws-hoverLine{overflow-wrap:anywhere}',
      // Rename field, styled like the shipped rename dialog's input.
      '.dws-renameInput{box-sizing:border-box;width:100%;border:.5px solid var(--dsw-alias-border-l4);',
      'border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-button-elevated-fill);min-width:0;color:inherit;',
      'outline:none;padding:0 2px;font-size:14px;line-height:20px}',
      '.dws-renameError{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px;overflow-wrap:anywhere}',
      '.dws-menuFallback{position:fixed;z-index:60;min-width:180px;max-width:min(320px,90%);padding:4px;',
      'border-radius:var(--dsw-radius-lg);border:.5px solid var(--dsw-alias-border-l3);',
      'background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-bg-overlay));box-shadow:0 8px 24px var(--dsw-alias-bg-mask-1)}',
      '.dws-menuItem{display:flex;align-items:center;gap:8px;width:100%;min-width:0;height:30px;padding:0 8px;border:none;',
      'border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-primary);font-size:13px;',
      'white-space:nowrap;cursor:pointer}',
      '.dws-menuItem:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-menuItem:disabled{opacity:.5;cursor:default}',
      '.dws-inlineEdit{display:flex;align-items:center;gap:6px;min-width:0;flex:1 1 auto}',
      '.dws-input{box-sizing:border-box;flex:1 1 auto;min-width:0;height:26px;padding:0 8px;font-size:13px;',
      'border-radius:var(--dsw-radius-sm);border:.5px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-layer-1);',
      'color:var(--dsw-alias-label-primary);outline:none}',
      '.dws-input:focus-visible{border-color:var(--dsw-alias-state-business-primary)}',
      '.dws-switch{flex:none;position:relative;width:34px;height:20px;border:none;border-radius:10px;padding:0;',
      'background:var(--dsw-alias-interactive-bg-hover);cursor:pointer;transition:background .15s ease}',
      '.dws-switch[aria-checked="true"]{background:var(--dsw-alias-state-business-primary)}',
      '.dws-switch::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;',
      'background:var(--dsw-alias-bg-layer-1);transition:transform .15s ease}',
      '.dws-switch[aria-checked="true"]::after{transform:translateX(14px)}',
      '.dws-check{flex:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;padding:0;',
      'border-radius:4px;border:1px solid var(--dsw-alias-border-l4);background:transparent;cursor:pointer;',
      'color:var(--dsw-alias-label-primary-inverted)}',
      '.dws-check[aria-checked="true"]{border-color:transparent;background:var(--dsw-alias-state-business-primary)}',
      '.dws-check--mixed{border-color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-state-business-primary)}',

      /* ---- picker dialog ---- */
      '.dws-dialog.dws-dialog{width:min(760px,100%);height:min(560px,100dvh - 32px);gap:0;padding:0}',
      '.dws-dialogHeader{flex:none;display:flex;flex-direction:column;gap:8px;padding:16px 14px 8px 24px;',
      'border-bottom:.5px solid var(--dsw-alias-border-l3)}',
      '.dws-dialogTitle{margin:0;font-size:16px;font-weight:510;line-height:24px;color:var(--dsw-alias-label-primary)}',
      '.dws-crumbs{display:flex;align-items:center;gap:4px;min-width:0;overflow-x:auto;font-size:13px;line-height:20px}',
      '.dws-crumb{border:none;background:transparent;padding:0;color:var(--dsw-alias-label-tertiary);cursor:pointer;',
      'max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}',
      '.dws-crumb:hover{color:var(--dsw-alias-label-primary)}',
      // The conversation menu's "add workspace" row: first in the list, accent text and
      // weight so it reads as the primary action. The two backgrounds are deliberately
      // the other way round: the resting state is the neutral tint and hovering is what
      // lights the accent up.
      '.dws-heroAdd{box-sizing:border-box;flex:none;display:flex;align-items:center;gap:8px;width:100%;margin:0 0 6px;padding:8px 10px;',
      'border:none;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-interactive-bg-hover);',
      'color:var(--dsw-alias-state-business-primary);font-size:13px;line-height:20px;font-weight:510;white-space:nowrap;',
      'cursor:pointer;text-align:start}',
      '.dws-heroAdd:hover{background:var(--dsw-alias-interactive-bg-hover-accent)}',
      '.dws-heroAdd:disabled{opacity:.5;cursor:default}',
      '.dws-heroAddLabel{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}',
      '.dws-dialogBody{flex:1 1 auto;min-height:0;min-width:0;display:flex;flex-direction:column}',
      // Passed as the host Modal's `contentClassName`: making this column a bounded
      // flex box is what keeps the footer reachable and lets the tree scroll, since
      // the host's own `body` element in between cannot be styled directly.
      '.dws-pickerContent{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;overflow:hidden}',
      // Breathing room under the dialog buttons: without it they sit flush against
      // the bottom edge of the frame.
      '.dws-pickerFooter{padding-bottom:10px}',
      '.dws-dialogToolbar{flex:none;display:flex;align-items:center;gap:8px;padding:2px 14px 6px 24px;min-width:0}',
      // The single root-path line that replaced the crumb trail.
      '.dws-pickerPath{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
      'color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}',
      '.dws-pickerTree{flex:1 1 auto;min-height:0;max-height:min(46vh,420px);overflow-y:auto;overflow-x:hidden;',
      'padding:0 10px 8px 18px}',
      '.dws-pickerTree::-webkit-scrollbar{width:5px}',
      '.dws-pickerTree::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);border-radius:3px}',
      '.dws-pickerTree::-webkit-scrollbar-track{background:transparent}',
      '.dws-pickerRow{box-sizing:border-box;display:flex;align-items:center;gap:6px;min-height:28px;padding:2px 8px;',
      'padding-inline-start:calc(8px + var(--suite-indent,0px));border-radius:var(--dsw-radius-sm);cursor:pointer;',
      'color:var(--dsw-alias-label-primary)}',
      // Hover is the theme's business blue with inverse text (a solid, deep
      // highlight); selection stays the pale document-selection blue.
      '.dws-pickerRow:hover{background:var(--dsw-alias-state-business-primary);color:#fff}',
      '.dws-pickerRow--selected{background:var(--dsw-alias-bg-document-selection)}',
      '.dws-pickerRow--selected:hover{background:var(--dsw-alias-state-business-primary);color:#fff}',
      '.dws-pickerName{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;',
      'line-height:20px}',
      // The row's "new subfolder" control: hidden until the row is hovered, and it
      // inherits the row's colour so it stays legible on the blue hover background.
      '.dws-addButton{flex:none;display:none;align-items:center;justify-content:center;width:22px;height:22px;padding:0;',
      'border:none;border-radius:var(--dsw-radius-sm);background:transparent;color:inherit;cursor:pointer}',
      '.dws-pickerRow:hover .dws-addButton,.dws-addButton:focus-visible{display:inline-flex}',
      '.dws-addButton:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      // The inline naming row under the parent it will create into.
      '.dws-pickerRow--editor{gap:6px;background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-dialogFooter{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 24px;',
      'border-top:.5px solid var(--dsw-alias-border-l3)}',
      '.dws-footerNote{min-width:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;',
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',

      /* ---- overview page ---- */
      '.dws-page{box-sizing:border-box;height:100%;min-height:0;min-width:0;display:flex;flex-direction:column;',
      'color:var(--dsw-alias-label-primary)}',
      '.dws-pageHeader{flex:none;display:flex;align-items:flex-start;gap:12px;padding:28px clamp(24px,4vw,48px) 12px;min-width:0}',
      // On macOS the frame mounts the leading seat over every main panel, so the
      // heading pads below it exactly like the shipped entry pages do.
      'html[data-platform="darwin"] .dws-pageHeader{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}',
      '.dws-pageHeading{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}',
      '.dws-pageTitleRow{display:flex;align-items:center;gap:8px;min-width:0}',
      '.dws-pageTitle{margin:0;font-size:18px;font-weight:510;line-height:26px;overflow-wrap:anywhere}',
      '.dws-pagePath{font-size:12px;line-height:18px;overflow-wrap:anywhere}',
      '.dws-pageBody{flex:1 1 auto;min-height:0;min-width:0;overflow-y:auto;display:block}',
      '.dws-pageInner{box-sizing:border-box;width:100%;max-width:960px;margin:0 auto;',
      'padding:0 clamp(24px,4vw,48px) 48px;display:flex;flex-direction:column;gap:18px;min-width:0}',
      '.dws-card{box-sizing:border-box;display:flex;flex-direction:column;gap:10px;padding:14px 16px;min-width:0;',
      'border-radius:var(--dsw-radius-lg);border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}',
      '.dws-cardHead{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0;flex-wrap:wrap}',
      '.dws-cardTitle{margin:0;font-size:14px;font-weight:510;line-height:20px}',
      '.dws-statRow{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;min-width:0}',
      '.dws-statValue{font-size:16px;line-height:24px;font-weight:510;font-variant-numeric:tabular-nums}',
      '.dws-statLabel{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}',
      // Name/value chips used by the dependencies card: they wrap instead of
      // overflowing, and each chip ellipsizes rather than pushing the row wider.
      '.dws-chipRow{display:flex;flex-wrap:wrap;gap:6px;min-width:0;flex:1 1 auto;justify-content:flex-end}',
      '.dws-chip{box-sizing:border-box;flex:none;max-width:100%;display:inline-flex;align-items:center;gap:4px;',
      'padding:2px 8px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-interactive-bg-hover);',
      'color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;white-space:nowrap;overflow:hidden;',
      'text-overflow:ellipsis}',
      '.dws-chip--on{color:var(--dsw-alias-state-business-primary)}',
      '.dws-chip--off{opacity:.55}',
      // Turn rows keep a right-edge fade; the bar-chart rules above this point are gone.
      // A turn title that overflows fades out at its right edge instead of ending
      // on a hard cut.
      '.dws-turnTitle{-webkit-mask-image:linear-gradient(270deg,#0000,#000 12px);',
      'mask-image:linear-gradient(270deg,#0000,#000 12px);text-overflow:clip}',
      '.dws-modelList{display:flex;flex-direction:column;gap:4px;min-width:0}',
      '.dws-modelRow{display:flex;align-items:center;gap:8px;min-width:0;font-size:12px;line-height:18px}',
      '.dws-modelName{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dws-modelValue{flex:none;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
      '.dws-ovGroup{display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.dws-ovSessions{display:flex;flex-direction:column;gap:1px;min-width:0}',
      '.dws-ovTurns{display:flex;align-items:center;gap:4px;flex-wrap:wrap;min-width:0}',
      '.dws-turnLink{flex:none;border:none;background:transparent;padding:0 2px;color:var(--dsw-alias-label-tertiary);',
      'font-size:11px;line-height:16px;cursor:pointer;white-space:nowrap;font-variant-numeric:tabular-nums}',
      '.dws-turnLink:hover{color:var(--dsw-alias-state-business-primary);text-decoration:underline}',
      '.dws-readme{box-sizing:border-box;min-width:0;overflow-y:auto;overflow-wrap:anywhere;font-size:13px;line-height:20px}',
      '.dws-readme--empty{color:var(--dsw-alias-label-tertiary)}',
      '.dws-settings{display:flex;flex-direction:column;gap:16px;min-width:0;padding:4px 0 16px}',
      '.dws-settingsGroup{display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.dws-settingsGroupTitle{margin:0 0 6px;font-size:13px;font-weight:510;line-height:20px;color:var(--dsw-alias-label-secondary)}',
      '.dws-settingRow{display:flex;align-items:center;gap:12px;min-width:0;padding:8px 0;border-bottom:.5px solid var(--dsw-alias-border-l1)}',
      '.dws-settingRow:last-child{border-bottom:none}',
      '.dws-settingText{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}',
      '.dws-settingLabel{font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary)}',
      '.dws-settingHint{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}',
      '.dws-settingControl{flex:none;display:flex;align-items:center;gap:6px;white-space:nowrap}',

      /* ---- own modal (fallback when the primitives Modal is unavailable) ---- */
      '.dws-mask{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:16px;',
      'background:var(--dsw-alias-bg-mask-1)}',
      '.dws-modal{box-sizing:border-box;max-width:100%;max-height:100%;display:flex;flex-direction:column;min-width:0;',
      'border-radius:var(--dsw-radius-lg);border:.5px solid var(--dsw-alias-border-l3);',
      'background:var(--dsw-alias-bg-overlay);box-shadow:0 16px 48px var(--dsw-alias-bg-mask-3)}',
      '.dws-modalHead{flex:none;display:flex;align-items:center;gap:12px;padding:14px 18px 8px;min-width:0}',
      '.dws-modalTitle{margin:0;flex:1 1 auto;min-width:0;font-size:15px;font-weight:510;line-height:22px;overflow-wrap:anywhere}',
      '.dws-modalBody{flex:1 1 auto;min-height:0;min-width:0;display:flex;flex-direction:column;padding:0 18px 12px;overflow-y:auto}',
      '.dws-modalFoot{flex:none;display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:10px 18px 14px}',
    ].join('')

    /** Idempotent stylesheet install; returns the disposer. */
    const installStyles = () => insertStyle(STYLE_ID, STYLES)

    /* =============================== widgets =============================== */

    /** Whether an optional primitive is present in this client build. */
    const hasPrimitive = (name) => ui !== null && typeof ui === 'object' && typeof ui[name] === 'function'

    /** Render a host icon when it exists; missing icons degrade to nothing. */
    function icon(name, size, className) {
      const Component = ui === null || typeof ui !== 'object' ? undefined : ui[name]
      if (typeof Component !== 'function') return null
      return E(Component, className === undefined ? { size: size || 16 } : { size: size || 16, className })
    }

    /** Sidebar/row icon button with a host tooltip when the tooltip exists. */
    function IconButton({ label, onClick, disabled, pressed, shortcutKeys, iconName, size, children }) {
      const button = E('button', {
        type: 'button',
        className: 'dws-iconButton',
        'aria-label': label,
        ...(pressed === undefined ? {} : { 'aria-pressed': pressed ? 'true' : 'false' }),
        ...(shortcutKeys === undefined ? {} : { 'aria-keyshortcuts': shortcutKeys }),
        disabled: disabled === true,
        onClick: (event) => {
          event.preventDefault()
          event.stopPropagation()
          if (disabled !== true) onClick(event)
        },
      }, children !== undefined ? children : icon(iconName || 'IconEllipsisOutlineRegular', size || 16))
      if (!hasPrimitive('Tooltip')) return button
      return E(ui.Tooltip, {
        label,
        ...(shortcutKeys === undefined ? {} : { shortcutKeys }),
      }, button)
    }

    /** Hand-rolled button: the tokens are the only shared styling dependency. */
    function SuiteButton({ children, onClick, disabled, variant, className }) {
      const classes = 'dws-button' + (variant === 'primary' ? ' dws-button--primary' : '')
        + (className === undefined ? '' : ' ' + className)
      return E('button', {
        type: 'button',
        className: classes,
        disabled: disabled === true,
        onClick: (event) => {
          event.preventDefault()
          if (disabled !== true) onClick(event)
        },
      }, children)
    }

    /** Text button used for inline actions. */
    function TextButton({ children, onClick, disabled }) {
      return E('button', {
        type: 'button',
        className: 'dws-textButton',
        disabled: disabled === true,
        onClick: (event) => {
          event.preventDefault()
          if (disabled !== true) onClick(event)
        },
      }, children)
    }

    /** Tri-state checkbox (checked / mixed / empty) with a checkbox role. */
    function SuiteCheck({ checked, mixed, onToggle, label }) {
      return E('button', {
        type: 'button',
        role: 'checkbox',
        'aria-checked': mixed === true ? 'mixed' : checked === true ? 'true' : 'false',
        'aria-label': label,
        className: 'dws-check' + (mixed === true ? ' dws-check--mixed' : ''),
        onClick: (event) => {
          event.preventDefault()
          event.stopPropagation()
          onToggle()
        },
      }, checked === true || mixed === true ? icon('IconCheckOutlineRegular', 12) : null)
    }

    /** Settings switch following the host's `role="switch"` pattern. */
    function SuiteSwitch({ checked, onChange, label }) {
      return E('button', {
        type: 'button',
        role: 'switch',
        'aria-checked': checked === true ? 'true' : 'false',
        'aria-label': label,
        className: 'dws-switch',
        onClick: (event) => {
          event.preventDefault()
          onChange(checked !== true)
        },
      })
    }

    /** A number input keeping a percentage setting inside a sane range. */
    function SuiteNumber({ value, min, max, step, onChange, label, suffix }) {
      return E('span', { className: 'dws-settingControl' },
        E('input', {
          type: 'number',
          className: 'dws-input',
          style: { width: '72px', flex: 'none' },
          'aria-label': label,
          value: String(value),
          min: String(min),
          max: String(max),
          step: String(step || 1),
          onChange: (event) => {
            const next = Number(event.target.value)
            if (!Number.isFinite(next)) return
            onChange(Math.min(max, Math.max(min, Math.round(next))))
          },
        }),
        E('span', { className: 'dws-muted' }, suffix || ''),
      )
    }

    /** A single-choice segmented row built from buttons (no primitive needed). */
    function SuiteChoice({ value, options, onChange, label }) {
      return E('span', { className: 'dws-settingControl', role: 'group', 'aria-label': label },
        options.map((option) => E('button', {
          key: option.value,
          type: 'button',
          className: 'dws-button' + (option.value === value ? ' dws-button--primary' : ''),
          style: { minWidth: '0', padding: '0 10px', height: '28px' },
          onClick: (event) => {
            event.preventDefault()
            onChange(option.value)
          },
        }, option.label)))
    }

    /** Host hover card when available; the anchor alone otherwise. */
    function SuiteHover({ anchor, content, disabled, immediate }) {
      if (!hasPrimitive('HoverCard')) return anchor
      return E(ui.HoverCard, {
        anchor,
        content,
        // `immediate` callers (badges and other pointed-at marks) open at once; text
        // rows keep the shipped dwell so a pointer crossing a list does not flash cards.
        openDelayMs: immediate === true ? 0 : 500,
        disabled: disabled === true,
      })
    }

    /**
     * Hover reveal for a clipped title, copied from the shipped rows: the title
     * clips its own text, crawls left at a constant speed while hovered, stops when
     * the far edge is in view and rests there, and returns to the start in one step
     * on leave. Text overflowing by at most {@link MIN_TITLE_REVEAL_PX} stays put,
     * because a few pixels of movement reads as jitter rather than a reveal. The
     * `data-scrolled` / `data-clipped` hooks drive the two-sided fade mask in CSS.
     */
    const MIN_TITLE_REVEAL_PX = 8
    const TITLE_MARQUEE_PX_PER_MS = 0.03

    function placeTitle(title, left, range) {
      if (typeof title.scrollTo === 'function') title.scrollTo({ left, behavior: 'instant' })
      else title.scrollLeft = left
      if (left > 0) title.dataset.scrolled = ''
      else delete title.dataset.scrolled
      if (left < range) title.dataset.clipped = ''
      else delete title.dataset.clipped
    }

    function restTitle(title) {
      if (typeof title.scrollTo === 'function') title.scrollTo({ left: 0, behavior: 'instant' })
      else title.scrollLeft = 0
      delete title.dataset.scrolled
      delete title.dataset.clipped
    }

    function useTitleMarquee(title) {
      const frame = React.useRef(0)
      React.useEffect(() => () => {
        if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame.current)
      }, [])
      return React.useMemo(() => ({
        enter: () => {
          const element = title.current
          if (element === null || element === undefined) return
          const range = element.scrollWidth - element.clientWidth
          if (!(range > MIN_TITLE_REVEAL_PX)) return
          let reduced = false
          try {
            reduced = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
              && window.matchMedia('(prefers-reduced-motion: reduce)').matches
          } catch {
            reduced = false
          }
          if (reduced || typeof requestAnimationFrame !== 'function') {
            placeTitle(element, range, range)
            return
          }
          if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame.current)
          let previous
          let position = 0
          const step = (now) => {
            position += previous === undefined ? 0 : (now - previous) * TITLE_MARQUEE_PX_PER_MS
            previous = now
            placeTitle(element, Math.min(position, range), range)
            if (position < range) frame.current = requestAnimationFrame(step)
          }
          frame.current = requestAnimationFrame(step)
        },
        leave: () => {
          if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame.current)
          const element = title.current
          if (element === null || element === undefined) return
          restTitle(element)
        },
      }), [title])
    }

    /**
     * A title cell that crawls its clipped content on hover. One component per row,
     * because the marquee is a hook and rows are rendered in a loop.
     */
    function MarqueeTitle({ className, title, children, onDoubleClick, style, role, ariaLabel }) {
      const ref = React.useRef(null)
      const marquee = useTitleMarquee(ref)
      return E('span', {
        ref,
        className,
        title,
        style,
        role,
        // Marks the name cell: the row's click detector uses it to tell "second
        // click on the name" (rename) from "second click elsewhere" (open).
        'data-row-name': 'true',
        'aria-label': ariaLabel,
        onDoubleClick,
        onPointerEnter: marquee.enter,
        onPointerLeave: marquee.leave,
      }, children)
    }

    /** Host modal when available, otherwise a token-styled overlay. The large
     * `dws-dialog` frame is opt-in: a caller that just needs a compact native
     * dialog (rename, confirm) passes no className and gets the host sizing.
     */
    function SuiteModal({ open, onClose, title, footer, className, contentClassName, children, closeLabel }) {
      if (open !== true) return null
      if (hasPrimitive('Modal')) {
        return E(ui.Modal, {
          open: true,
          onClose,
          closeLabel,
          title,
          footer,
          ...(className === undefined || className === '' ? {} : { className }),
          // The host wraps `children` in its own body element, so styling the content
          // wrapper is the only way to let that column size and scroll correctly.
          ...(contentClassName === undefined || contentClassName === '' ? {} : { contentClassName }),
        }, children)
      }
      return E(FallbackModal, { onClose, title, footer, className, closeLabel }, children)
    }

    /** Minimal modal: overlay, Escape, initial focus, click-outside dismissal. */
    function FallbackModal({ onClose, title, footer, className, children, closeLabel }) {
      const panelRef = React.useRef(null)
      React.useEffect(() => {
        const onKeyDown = (event) => {
          if (event.key === 'Escape') {
            event.stopPropagation()
            onClose()
          }
        }
        document.addEventListener('keydown', onKeyDown)
        const panel = panelRef.current
        if (panel !== null) {
          const focusable = panel.querySelector('button, input, [tabindex]:not([tabindex="-1"])')
          if (focusable !== null) focusable.focus()
        }
        return () => document.removeEventListener('keydown', onKeyDown)
      }, [onClose])
      return E('div', {
        className: 'dws-mask',
        onMouseDown: (event) => {
          if (event.target === event.currentTarget) onClose()
        },
      }, E('div', {
        ref: panelRef,
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': title,
        className: 'dws-modal ' + (className || ''),
      }, [
        E('div', { key: 'head', className: 'dws-modalHead' }, [
          E('h2', { key: 'title', className: 'dws-modalTitle' }, title),
          hasPrimitive('IconCloseOutlineRegular')
            ? IconButton({ key: 'close', label: closeLabel || 'Close', onClick: onClose, iconName: 'IconCloseOutlineRegular' })
            : null,
        ]),
        E('div', { key: 'body', className: 'dws-modalBody' }, children),
        footer === undefined ? null : E('div', { key: 'foot', className: 'dws-modalFoot' }, footer),
      ]))
    }

    /**
     * A row "..." menu.
     *
     * The host `Menu` renders its `anchor` prop as a React element inside its own
     * children (`children: [anchor, portal ? list : list]`), and supports only
     * `bottom`/`top` for `side` — passing a DOM node there, or an unknown side,
     * throws inside the tree and would blank the whole list. This builds the
     * trigger as an element, keeps the host menu behind a boundary that falls
     * back to the plugin's own list, and never renders the trigger twice.
     */
    function RowMenu({ label, items, onSelect, footer, side, disabled, iconName, menuLabel, triggerLabel, triggerIcon }) {
      const [open, setOpen] = React.useState(false)
      const [rect, setRect] = React.useState(null)
      const [hostMenuFailed, setHostMenuFailed] = React.useState(false)
      const triggerRef = React.useRef(null)
      // The portaled host list is positioned from this rect. It is captured from the
      // click itself rather than read off a ref: the host may re-clone the anchor
      // element, which replaces any ref this plugin attached, and without a rect the
      // list opens unpositioned in the window's top-left corner.
      const anchorRectRef = React.useRef(null)
      const onClick = React.useCallback((event) => {
        event.preventDefault()
        event.stopPropagation()
        const node = event.currentTarget
        if (node !== null && node !== undefined && typeof node.getBoundingClientRect === 'function') {
          const measured = node.getBoundingClientRect()
          anchorRectRef.current = measured
          setRect(measured)
        }
        setOpen((value) => !value)
      }, [])
      const getAnchorRect = React.useCallback(() => anchorRectRef.current, [])
      // The trigger element is memoized: handing the host menu a brand-new element
      // on every render makes it re-anchor and re-run its focus handoff mid-click,
      // which is what swallowed the first selection.
      const triggerIconName = triggerIcon === undefined ? 'IconFlatListOutlineRegular' : triggerIcon
      const blocked = disabled === true || items.length === 0
      const trigger = React.useMemo(() => (triggerLabel === undefined
        ? E('button', {
          ref: triggerRef,
          type: 'button',
          className: 'dws-iconButton',
          'aria-label': label,
          'aria-haspopup': 'menu',
          'aria-expanded': open ? 'true' : 'false',
          disabled: blocked,
          onClick,
        }, icon(iconName || 'IconEllipsisOutlineRegular', 16))
        : E('button', {
          ref: triggerRef,
          type: 'button',
          className: 'dws-button',
          style: { minWidth: '0', height: '28px', padding: '0 10px' },
          'aria-label': label,
          'aria-haspopup': 'menu',
          'aria-expanded': open ? 'true' : 'false',
          disabled: blocked,
          onClick,
        }, [
          icon(triggerIconName, 14),
          E('span', { key: 'label', className: 'dws-ellipsis', style: { maxWidth: '180px' } }, triggerLabel),
          icon('IconChevronDownOutlineRegular', 12),
        ])), [blocked, iconName, label, onClick, open, triggerIconName, triggerLabel])
      const close = React.useCallback(() => setOpen(false), [])
      const choose = (id) => {
        close()
        onSelect(id)
      }
      const own = () => E(React.Fragment, null, trigger,
        open === true
          ? E(FallbackMenu, { rect, items, label: menuLabel || label, onSelect: choose, onClose: close })
          : null)
      if (!hasPrimitive('Menu') || hostMenuFailed) return own()
      // Rows are `MenuItemButton` children, the shape the shipped menus use: that
      // is what carries each row's icon and its localized shortcut hint. Passing
      // bare `items` renders labels only, which is why the icons went missing.
      const rows = hasPrimitive('MenuItemButton')
        ? items.map((item) => E(ui.MenuItemButton, {
          key: item.id,
          ...(item.icon === undefined ? {} : { icon: item.icon }),
          ...(item.shortcut === undefined || item.shortcut === null ? {} : { shortcut: item.shortcut }),
          disabled: item.disabled === true,
          danger: item.danger === true,
          onSelect: () => choose(item.id),
        }, item.label))
        : undefined
      return E(QuietBoundary, {
        // A host menu that cannot render must cost the host look, never the list.
        fallback: own,
        onError: () => setHostMenuFailed(true),
      }, E(ui.Menu, {
        open,
        onClose: close,
        portal: true,
        side: side === 'top' ? 'top' : 'bottom',
        align: 'start',
        anchor: trigger,
        // Portal mode places the list from the anchor rect the owner supplies; with
        // no rect the host list renders unpinned at the window's origin.
        getAnchorRect,
        items: rows === undefined ? items : [],
        onSelect: choose,
        ...(footer === undefined ? {} : { footer }),
        // Children must be positional: React turns the argument into props.children,
        // while the prop form is silently overridden by the renderer's own children.
      }, rows === undefined ? undefined : rows))
    }

    /** Positioned fallback menu for builds without the host Menu primitive. */
    function FallbackMenu({ rect, items, label, onSelect, onClose }) {
      const panelRef = React.useRef(null)
      React.useEffect(() => {
        const onPointerDown = (event) => {
          if (panelRef.current !== null && panelRef.current.contains(event.target)) return
          onClose()
        }
        const onKeyDown = (event) => {
          if (event.key === 'Escape') onClose()
        }
        document.addEventListener('mousedown', onPointerDown, true)
        document.addEventListener('keydown', onKeyDown)
        return () => {
          document.removeEventListener('mousedown', onPointerDown, true)
          document.removeEventListener('keydown', onKeyDown)
        }
      }, [onClose])
      const style = rect === null
        ? { top: '50%', left: '50%' }
        : {
          top: Math.min(rect.bottom + 4, Math.max(8, (globalThis.innerHeight || 800) - 8 - items.length * 32)),
          left: Math.max(8, Math.min(rect.right - 200, (globalThis.innerWidth || 1200) - 208)),
        }
      return E('div', {
        ref: panelRef,
        className: 'dws-menuFallback',
        role: 'menu',
        'aria-label': label,
        style,
      }, items.map((item) => E('button', {
        key: item.id,
        type: 'button',
        role: 'menuitem',
        className: 'dws-menuItem',
        disabled: item.disabled === true,
        onClick: (event) => {
          event.preventDefault()
          event.stopPropagation()
          onClose()
          onSelect(item.id)
        },
      }, [item.icon === undefined ? null : item.icon, E('span', { key: 'label', className: 'dws-ellipsis' }, item.label)])))
    }

    /** The host markdown renderer's required label bundle. */
    function markdownLabels(t) {
      return {
        code: {
          copyLabel: t('md.copy'),
          copiedLabel: t('md.copied'),
          toolbarLabels: {
            codeLabel: t('md.code'),
            wrapLabel: t('md.wrap'),
            unwrapLabel: t('md.unwrap'),
          },
        },
        footnotes: t('md.footnotes'),
      }
    }

    /** Markdown body: the host renderer when present, preformatted text otherwise. */
    function SuiteMarkdown({ text, t }) {
      const labels = React.useMemo(() => markdownLabels(t), [t])
      if (hasPrimitive('MarkdownText')) return E(ui.MarkdownText, { text, labels })
      return E('div', { className: 'dws-readme' },
        E('pre', { style: { margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, text))
    }

    /** A token-styled badge. */
    function Badge({ children, title }) {
      return E('span', { className: 'dws-badge', title }, children)
    }

    /**
     * Shared rename/delete dialog host used by the workspace browser and the
     * overview page: `openDialog({kind, id, draft, name})` plus the element to
     * render. The kinds are `rename-session`, `rename-workspace` and
     * `delete-workspace`, mirroring the shipped row actions' copy.
     */
    function useSuiteDialog(options) {
      const { t, items, onRenameWorkspace, onRenameSession, onDeleteWorkspace, onNotice } = options
      const [dialog, setDialog] = React.useState(null)
      const close = React.useCallback(() => setDialog(null), [])
      let element = null
      if (dialog !== null && (dialog.kind === 'rename-workspace' || dialog.kind === 'rename-session')) {
        const isWorkspace = dialog.kind === 'rename-workspace'
        const commit = () => {
          const value = String(dialog.draft === undefined ? '' : dialog.draft).trim()
          if (value.length === 0) {
            onNotice(t('browser.empty.name'))
            return
          }
          if (isWorkspace && Array.isArray(items)
            && items.some((item) => item.workspaceId !== dialog.id && String(item.title || '') === value)) {
            onNotice(t('browser.duplicate'))
            return
          }
          close()
          const work = isWorkspace ? onRenameWorkspace(dialog.id, value) : onRenameSession(dialog.id, value)
          Promise.resolve(work).catch((reason) => onNotice(errorMessage(reason)))
        }
        element = E(SuiteModal, {
          open: true,
          onClose: close,
          closeLabel: t('common.close'),
          title: isWorkspace ? t('browser.renameWorkspaceTitle') : t('browser.renameTitle'),
          footer: E('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } }, [
            E(SuiteButton, { key: 'cancel', onClick: close }, t('common.cancel')),
            E(SuiteButton, { key: 'ok', variant: 'primary', onClick: commit }, t('common.confirm')),
          ]),
        }, E('input', {
          className: 'dws-input',
          style: { width: '100%' },
          autoFocus: true,
          'aria-label': t('browser.renameTitle'),
          placeholder: t('browser.namePlaceholder'),
          value: dialog.draft === undefined ? '' : dialog.draft,
          onChange: (event) => setDialog((current) => ({ ...current, draft: event.target.value })),
          onKeyDown: (event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            }
          },
        }))
      }
      if (dialog !== null && dialog.kind === 'delete-workspace') {
        element = E(SuiteModal, {
          open: true,
          onClose: close,
          closeLabel: t('common.close'),
          title: t('browser.deleteTitle'),
          footer: E('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } }, [
            E(SuiteButton, { key: 'cancel', onClick: close }, t('common.cancel')),
            E(SuiteButton, {
              key: 'ok',
              variant: 'primary',
              onClick: () => {
                close()
                Promise.resolve(onDeleteWorkspace(dialog.id)).catch((reason) => onNotice(errorMessage(reason)))
              },
            }, t('common.confirm')),
          ]),
        }, E('div', { style: { fontSize: '13px', lineHeight: '20px' } },
          t('browser.deleteBody', { name: dialog.name })))
      }
      return { openDialog: setDialog, element }
    }

    /* ======================= explorer directory picker ====================== */

    /** Depth-keyed cache of one directory level. */
    function createListingCache(listDirectory) {
      const levels = new Map()
      const load = (path, force) => {
        const key = foldPath(path)
        const cached = levels.get(key)
        if (cached !== undefined && cached.status === 'ready' && force !== true) return Promise.resolve(cached)
        const pending = cached !== undefined && cached.status === 'loading' ? cached.promise : null
        if (pending !== null) return pending
        const controller = typeof AbortController === 'function' ? new AbortController() : null
        const timer = controller === null ? null : setTimeout(() => controller.abort(), 20000)
        const record = { status: 'loading' }
        const promise = Promise.resolve()
          .then(() => listDirectory(path, controller === null ? undefined : controller.signal))
          .then((listing) => {
            if (timer !== null) clearTimeout(timer)
            const next = {
              status: 'ready',
              home: toStringOr(listing && listing.home, ''),
              crumbs: Array.isArray(listing && listing.crumbs) ? listing.crumbs : [],
              truncated: listing !== undefined && listing !== null && listing.truncated === true,
              entries: (Array.isArray(listing && listing.entries) ? listing.entries : [])
                .filter((entry) => entry !== null && typeof entry === 'object' && typeof entry.path === 'string')
                .map((entry) => ({
                  name: typeof entry.name === 'string' && entry.name.length > 0 ? entry.name : baseName(entry.path),
                  path: entry.path,
                  hidden: entry.hidden === true,
                })),
            }
            levels.set(key, next)
            return next
          })
          .catch((error) => {
            if (timer !== null) clearTimeout(timer)
            const failed = { status: 'error', message: errorMessage(error) }
            levels.set(key, failed)
            return failed
          })
        levels.set(key, { status: 'loading', promise })
        return promise
      }
      return { load, peek: (path) => levels.get(foldPath(path)) }
    }

    /** `value` when it is a non-empty string, otherwise the fallback. */
    function toStringOr(value, fallback) {
      return typeof value === 'string' && value.length > 0 ? value : fallback
    }

    /** Windows drive letters worth probing for a system-root view (A:/B: skipped). */
    const DRIVE_LETTERS = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

    /**
     * The explorer dialog.
     *
     * Rendered from two places: as the occupant of a `directoryFlow` single hole
     * (owner props `open`/`busy`/`onPicked`/`onCancel`/`onError`), and directly
     * by our own workspace browser, which passes `ownCreate`.
     */
    function DirectoryExplorer(props) {
      const {
        open, busy, t, onPicked, onCancel, onError, ownCreate,
        listDirectory, createWorkspace, renameWorkspace, createDirectory, startSession, mode,
      } = props
      // "add" flows (the two add-workspace holes) finish by asking which folder to
      // enter; the row menu's "workspace selection" entry is a structure edit and
      // just closes. `mode` is explicit; the inline picker also passes ownCreate.
      const isAddFlow = mode !== 'select' && ownCreate === undefined
      // The settings snapshot may be supplied by the caller (the workspace
      // browser already holds one); otherwise this dialog reads the store.
      const liveSettings = useSettings()
      const settings = props.settings === undefined ? liveSettings : props.settings
      const [nodes, setNodes] = React.useState(() => new Map())
      const [expanded, setExpanded] = React.useState(() => new Set())
      const [selected, setSelected] = React.useState(() => new Map())
      const [filter, setFilter] = React.useState('')
      const [showHidden, setShowHidden] = React.useState(false)
      const [pathDraft, setPathDraft] = React.useState(null)
      const [error, setError] = React.useState(null)
      const [creating, setCreating] = React.useState(false)
      // A pick that belongs to another tree than the current selection: held here
      // until the user replaces the selection or cancels (hook, so it stays above
      // the `open !== true` early return).
      const [conflict, setConflict] = React.useState(null)
      // Inline "create a child folder" editor: { parent, name, error } or null.
      const [newFolder, setNewFolder] = React.useState(null)
      // After an add-workspace submit, the "which folder do we enter?" chooser.
      const [entryOpen, setEntryOpen] = React.useState(false)
      const [entryChoice, setEntryChoice] = React.useState(null)
      const cache = React.useMemo(() => createListingCache(listDirectory), [listDirectory])
      const generation = React.useRef(0)
      const treeRef = React.useRef(null)
      // Mirrors the selection for callbacks that run outside the render they were
      // created in (a path accepted asynchronously must not toggle a stale map).
      const selectedRef = React.useRef(selected)
      selectedRef.current = selected
      // The inline naming editor commits on blur as well as on Enter, so its draft and
      // an in-flight flag must be readable from a handler outside this render.
      const newFolderRef = React.useRef(null)
      newFolderRef.current = newFolder
      const newFolderBusy = React.useRef(false)
      // Click bookkeeping for the shortened double-click window. This MUST be a hook
      // call in every render, so it lives here with the other hooks — placing it
      // after the `open !== true` early return made the hook count differ between
      // the closed and open renders, which crashed the sidebar into a blank pane.
      const ROW_DOUBLE_CLICK_MS = RENAME_DOUBLE_CLICK_MS
      const lastClickRef = React.useRef({ key: null, at: 0 })
      const clickHandler = (key, onSingle, onDouble) => (event) => {
        const now = Date.now()
        const previous = lastClickRef.current
        if (previous.key === key && now - previous.at <= ROW_DOUBLE_CLICK_MS) {
          lastClickRef.current = { key: null, at: 0 }
          if (onDouble !== undefined) {
            event.preventDefault()
            onDouble()
            return
          }
        }
        lastClickRef.current = { key, at: now }
        if (onSingle !== undefined) onSingle()
      }

      // Remarks of already-registered workspaces come from the root hook the
      // slot kit provides; the sidebar passes its own hook so the two agree.
      const workspacesHook = props.workspacesHook === undefined || props.workspacesHook === null
        ? (typeof props.useWorkspaces === 'function' ? props.useWorkspaces : null)
        : props.workspacesHook
      const workspaceItems = workspacesHook === null || workspacesHook === undefined
        ? []
        : workspacesHook((state) => state.items) || []
      // Registrations read live so a workspace created moments ago is visible;
      // the hook snapshot above only feeds the first render's remark preview.
      const readItems = typeof props.readWorkspaceItems === 'function'
        ? props.readWorkspaceItems
        : () => workspaceItems

      /** Fold one level into the node table. */
      const ingest = React.useCallback((path, listing) => {
        setNodes((previous) => {
          const next = new Map(previous)
          next.set(foldPath(path), { status: listing.status, message: listing.message, listing })
          return next
        })
      }, [])

      const ensure = React.useCallback((path, depth) => {
        const key = foldPath(path)
        if (nodes.has(key) && nodes.get(key).status === 'ready') return
        cache.load(path).then((listing) => ingest(path, listing))
      }, [cache, ingest, nodes])

      /** Load and expand the levels leading down to one path. */
      const revealPath = (path) => {
        cache.load(path).then((listing) => {
          if (listing.status !== 'ready') return
          ingest(path, listing)
          const chain = chainForPath(listing, path)
          setExpanded((previous) => {
            const next = new Set(previous)
            for (const level of chain) next.add(foldPath(level))
            return next
          })
          const walk = (index) => {
            if (index >= chain.length) return
            const level = chain[index]
            cache.load(level).then((loaded) => {
              if (loaded.status === 'ready') ingest(level, loaded)
              walk(index + 1)
            })
          }
          walk(0)
        })
      }

      /**
       * Pre-select the folders the dialog was opened with, so a dialog opened
       * from a workspace menu mirrors the current workspace state instead of
       * starting empty.
       */
      const seedSelection = () => {
        const seeds = typeof props.initialPaths === 'function'
          ? props.initialPaths()
          : Array.isArray(props.initialPaths)
            ? props.initialPaths
            // No explicit seed: start blank. "Add workspace" must not pre-check the
            // existing workspaces; only the row menu's "workspace selection" entry
            // passes `initialPaths` to mirror the current state.
            : []
        const paths = (Array.isArray(seeds) ? seeds : [])
          .filter((value) => typeof value === 'string' && value.length > 0)
          .slice(0, 40)
        if (paths.length === 0) return
        setSelected((previous) => {
          const next = new Map(previous)
          for (const value of paths) {
            const key = foldPath(value)
            if (next.has(key)) continue
            next.set(key, { path: value, remark: remarkFor(value) })
          }
          return next
        })
        for (const value of paths.slice(0, 12)) revealPath(value)
      }

      const toggle = React.useCallback((path) => {
        setExpanded((previous) => {
          const next = new Set(previous)
          const key = foldPath(path)
          if (next.has(key)) next.delete(key)
          else next.add(key)
          return next
        })
        ensure(path)
      }, [ensure])

      /** Open or close one level without flipping (arrow-key semantics). */
      const setOpen = React.useCallback((path, open) => {
        setExpanded((previous) => {
          const key = foldPath(path)
          if (open === previous.has(key)) return previous
          const next = new Set(previous)
          if (open) next.add(key)
          else next.delete(key)
          return next
        })
        if (open) ensure(path)
      }, [ensure])

      /**
       * Keyboard navigation over the tree: arrows move the roving focus and
       * expand/collapse, Enter and Space toggle the selection. Native Modal
       * already supplies the focus trap and Escape.
       */
      const onTreeKeyDown = (event) => {
        const container = treeRef.current
        if (container === null || event.altKey || event.ctrlKey || event.metaKey) return
        const rows = Array.from(container.querySelectorAll('[role="treeitem"]'))
        if (rows.length === 0) return
        const active = typeof document === 'undefined' ? null : document.activeElement
        const owner = active === null || typeof active.closest !== 'function' ? null : active.closest('[role="treeitem"]')
        const index = owner === null || owner === null ? -1 : rows.indexOf(owner)
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          const step = event.key === 'ArrowDown' ? 1 : -1
          const nextIndex = index < 0
            ? (step > 0 ? 0 : rows.length - 1)
            : Math.min(rows.length - 1, Math.max(0, index + step))
          const target = rows[nextIndex]
          if (target !== undefined && typeof target.focus === 'function') target.focus()
          return
        }
        const path = owner === null ? null : owner.getAttribute('data-path')
        if (path === null || path === undefined) return
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          setOpen(path, true)
          return
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          setOpen(path, false)
          return
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          toggleSelect(path)
        }
      }

      // First open: reset the dialog and list the system root plus the home level.
      React.useEffect(() => {
        if (open !== true) return undefined
        const run = generation.current + 1
        generation.current = run
        setNodes(new Map())
        setSelected(new Map())
        setFilter('')
        setPathDraft(null)
        setError(null)
        const rootKey = '::root::'
        setExpanded(new Set([rootKey]))
        /** Publish one synthetic root level (drive list, or the home fallback). */
        const publishRoot = (listing) => {
          setNodes((previous) => {
            const next = new Map(previous)
            next.set(rootKey, { status: listing.status, message: listing.message, listing })
            return next
          })
        }
        Promise.all(DRIVE_LETTERS.map((letter) => cache.load(letter + ':/')
          .then((listing) => (listing.status === 'ready' ? { path: letter + ':/', listing } : null))
          .catch(() => null)))
          .then((results) => {
            if (generation.current !== run) return undefined
            const drives = results.filter((item) => item !== null)
            if (drives.length > 0) {
              setNodes((previous) => {
                const next = new Map(previous)
                for (const drive of drives) next.set(foldPath(drive.path), { status: 'ready', listing: drive.listing })
                next.set(rootKey, {
                  status: 'ready',
                  listing: {
                    status: 'ready',
                    home: '',
                    crumbs: [],
                    truncated: false,
                    entries: drives.map((drive) => ({ name: drive.path, path: drive.path, hidden: false })),
                  },
                })
                return next
              })
              // Open the configured depth below the home directory.
              const homeListing = drives.map((drive) => drive.listing).find((listing) => toStringOr(listing.home, '') !== '')
              const home = homeListing === undefined ? '' : homeListing.home
              if (home !== '') preload(home, 0)
              seedSelection()
              return undefined
            }
            // No probeable drive (POSIX host, or every letter refused): fall back
            // to the host's home level so the dialog is never empty.
            return cache.load('').then((listing) => {
              if (generation.current !== run) return undefined
              if (listing.status !== 'ready') {
                publishRoot(listing)
                return undefined
              }
              publishRoot(listing)
              for (const entry of listing.entries.slice(0, 2)) preload(entry.path, 0)
              seedSelection()
              return undefined
            })
          })
          .catch((reason) => {
            if (generation.current === run) setError(errorMessage(reason))
          })
        return undefined
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [open])

      /** Open the configured number of levels below one path. */
      const preload = React.useCallback((path, depth) => {
        const depthLimit = Math.max(0, Math.min(4, Number(settings.pickerDepth) || 0))
        const walk = (current, level) => {
          if (level > depthLimit) return
          setExpanded((previous) => {
            const next = new Set(previous)
            next.add(foldPath(current))
            return next
          })
          cache.load(current).then((listing) => {
            if (listing.status !== 'ready') return
            ingest(current, listing)
            if (level === depthLimit) return
            for (const entry of listing.entries.slice(0, 8)) walk(entry.path, level + 1)
          })
        }
        walk(path, 0)
      }, [cache, ingest, settings.pickerDepth])

      if (open !== true) return null

      const rootKey = '::root::'
      const isSelected = (path) => selected.has(foldPath(path))

      /**
       * Add one folder plus whatever intermediate ancestors keep the set nestable:
       *  - the whole chain between the new folder and the nearest **already selected**
       *    ancestor, so a deep pick never lands as an orphan next to its own parent;
       *  - the common parent when the new folder is a **sibling** of an existing pick
       *    (the rule the user asked for), even when nothing above is selected yet.
       * A first pick with nothing around it adds only itself.
       */
      const addSelection = (path, remark) => {
        setSelected((previous) => {
          const next = new Map(previous)
          const parents = parentPathsOf(path)
          const parentKey = parents.length === 0 ? '' : foldPath(parents[0])
          const hasSibling = [...previous.values()].some((entry) => foldPath(entry.path) !== foldPath(path)
            && parentKey !== '' && parentPathsOf(entry.path).length > 0
            && foldPath(parentPathsOf(entry.path)[0]) === parentKey)
          const selectedAncestorIndex = parents.findIndex((parent) => next.has(foldPath(parent)))
          const stopIndex = selectedAncestorIndex === -1 ? -1 : selectedAncestorIndex - 1
          const fillTop = Math.max(stopIndex, hasSibling ? 0 : -1)
          for (let index = 0; index <= fillTop; index += 1) {
            const parent = parents[index]
            const parentPathKey = foldPath(parent)
            if (!next.has(parentPathKey)) next.set(parentPathKey, { path: parent, remark: remarkFor(parent) })
          }
          const key = foldPath(path)
          if (!next.has(key)) next.set(key, { path, remark: remark === undefined ? remarkFor(path) : remark })
          return next
        })
      }

      const toggleSelect = (path, remark) => {
        const key = foldPath(path)
        // Read the latest committed selection, not the map this render closed over:
        // the typed-path and system-dialog entries call this from a promise callback.
        const current = selectedRef.current
        if (current.has(key)) {
          // Unchecking a parent unchecks everything selected beneath it in the same
          // click, so a selection can never keep an orphaned child without its parent.
          setSelected((previous) => {
            const next = new Map()
            for (const [entryKey, value] of previous) {
              if (entryKey === key || isAncestorPath(path, value.path)) continue
              next.set(entryKey, value)
            }
            return next
          })
          return
        }
        // A pick that is neither an ancestor nor a descendant of *any* current pick
        // starts a different tree, so ask before replacing the existing selection.
        const related = [...current.values()].some((entry) => isAncestorPath(entry.path, path)
          || isAncestorPath(path, entry.path))
        if (current.size > 0 && !related) {
          setConflict({ path, remark })
          return
        }
        addSelection(path, remark)
        // Checking a folder opens it, so its children are immediately pickable.
        setOpen(path, true)
      }

      /** Remark already stored for a registered workspace with this path. */
      const remarkFor = (path) => {
        const found = registeredFor(path)
        if (found === undefined) return undefined
        const title = typeof found.title === 'string' ? found.title.trim() : ''
        return title.length === 0 || title === baseName(found.path) ? undefined : title
      }

      /** The registered workspace owning one path, if there is one. */
      const registeredFor = (path) => {
        const key = foldPath(path)
        return readItems().find((item) => item !== null && typeof item === 'object' && foldPath(item.path) === key)
      }

      const visibleEntries = (path) => {
        const record = nodes.get(foldPath(path))
        if (record === undefined || record.status !== 'ready') return []
        const all = Array.isArray(record.listing.entries) ? record.listing.entries : []
        const needle = filter.trim().toLowerCase()
        return all.filter((entry) => {
          if (entry.hidden && !showHidden) return false
          if (needle.length === 0) return true
          return entry.name.toLowerCase().includes(needle)
        })
      }

      const renderLevel = (path, depth, keyPrefix) => {
        const record = nodes.get(foldPath(path))
        const rows = []
        if (record !== undefined && record.status === 'error') {
          rows.push(E('div', { key: keyPrefix + ':error', className: 'dws-warn', style: { padding: '4px 8px' } },
            t('picker.error.list', { message: record.message })))
          return rows
        }
        if (record === undefined || record.status === 'loading') {
          rows.push(E('div', { key: keyPrefix + ':loading', className: 'dws-empty' }, t('picker.loading')))
          return rows
        }
        const entries = visibleEntries(path)
        if (entries.length === 0) {
          rows.push(E('div', { key: keyPrefix + ':empty', className: 'dws-empty', style: { padding: '6px 8px' } }, t('picker.empty')))
          return rows
        }
        for (const entry of entries) {
          const entryKey = foldPath(entry.path)
          const isOpen = expanded.has(entryKey)
          const childRecord = nodes.get(entryKey)
          const hasChildren = childRecord === undefined || childRecord.status !== 'ready'
            ? true
            : childRecord.listing.entries.length > 0
          rows.push(E('div', {
            key: keyPrefix + ':' + entryKey,
            className: 'dws-pickerRow' + (isSelected(entry.path) ? ' dws-pickerRow--selected' : ''),
            style: { '--suite-indent': String(depth * 14) + 'px' },
            role: 'treeitem',
            'aria-level': depth + 1,
            'aria-expanded': hasChildren ? (isOpen ? 'true' : 'false') : undefined,
            'aria-selected': isSelected(entry.path) ? 'true' : 'false',
            'data-path': entry.path,
            tabIndex: -1,
            title: entry.path,
            onClick: clickHandler(foldPath(entry.path), () => toggle(entry.path), () => toggleSelect(entry.path)),
          }, [
            E('button', {
              key: 'chev',
              type: 'button',
              className: 'dws-chev' + (isOpen ? ' dws-chev--open' : '') + (hasChildren ? '' : ' dws-chev--empty'),
              'aria-label': isOpen ? t('picker.collapse') : t('picker.expand'),
              'aria-expanded': hasChildren ? (isOpen ? 'true' : 'false') : undefined,
              tabIndex: hasChildren ? 0 : -1,
              disabled: !hasChildren,
              onClick: (event) => {
                event.preventDefault()
                event.stopPropagation()
                toggle(entry.path)
              },
            }, icon('IconTriangleRightFillRegular', 12)),
            E(SuiteCheck, {
              key: 'check',
              checked: isSelected(entry.path),
              label: entry.name,
              onToggle: () => toggleSelect(entry.path),
            }),
            E('span', { key: 'icon', className: 'dws-folderIcon' },
              icon(isOpen ? 'IconFolderOpenRegular' : 'IconFolderCloseRegular', 16)),
            E('span', { key: 'name', className: 'dws-pickerName' }, entry.name),
            E('button', {
              key: 'add',
              type: 'button',
              // Revealed on hover only: the row stays quiet until the pointer is on it.
              className: 'dws-addButton',
              'aria-label': t('picker.newFolder'),
              title: t('picker.newFolder'),
              tabIndex: -1,
              onClick: (event) => {
                event.preventDefault()
                event.stopPropagation()
                setOpen(entry.path, true)
                newFolderBusy.current = false
                setNewFolder({ parent: entry.path, name: '', error: null })
              },
            }, icon('IconProjectAddOutlineRegular', 14)),
          ]))
          if (newFolder !== null && foldPath(newFolder.parent) === entryKey) {
            rows.push(E('div', {
              key: keyPrefix + ':' + entryKey + ':new',
              className: 'dws-pickerRow dws-pickerRow--editor',
              style: { '--suite-indent': String((depth + 1) * 14) + 'px' },
            }, [
              E('span', { key: 'icon', className: 'dws-folderIcon' }, icon('IconFolderCloseRegular', 16)),
              E('input', {
                key: 'input',
                className: 'dws-input',
                style: { flex: '1 1 auto', minWidth: 0 },
                autoFocus: true,
                value: newFolder.name,
                placeholder: t('picker.newFolder.placeholder'),
                'aria-label': t('picker.newFolder'),
                onClick: (event) => event.stopPropagation(),
                // Clicking away from the editor creates the folder too — an empty
                // name simply closes it. Escape still cancels without creating.
                onBlur: () => {
                  const draft = newFolderRef.current
                  if (draft === null) return
                  if (String(draft.name === undefined ? '' : draft.name).trim().length === 0) setNewFolder(null)
                  else commitNewFolder()
                },
                onChange: (event) => setNewFolder({ ...newFolder, name: event.target.value, error: null }),
                onKeyDown: (event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    commitNewFolder()
                  } else if (event.key === 'Escape') {
                    event.preventDefault()
                    setNewFolder(null)
                  }
                },
              }),
              newFolder.error === null ? null : E('span', { key: 'error', className: 'dws-warn' }, newFolder.error),
            ]))
          }
          if (isOpen) rows.push(...renderLevel(entry.path, depth + 1, keyPrefix + ':' + entryKey))
        }
        if (record.listing.truncated) {
          rows.push(E('div', { key: keyPrefix + ':trunc', className: 'dws-warn', style: { padding: '4px 8px' } }, t('picker.truncated')))
        }
        return rows
      }

      /** Selected folders ordered parents-first: creation must follow this order. */
      const selectionOrder = () => {
        const list = [...selected.values()].slice().sort((left, right) => {
          const depth = foldPath(left.path).length - foldPath(right.path).length
          return depth !== 0 ? depth : left.path.localeCompare(right.path)
        })
        return list.map((entry) => {
          let depth = 0
          for (const other of list) {
            if (other !== entry && isAncestorPath(other.path, entry.path)) depth += 1
          }
          return { ...entry, depth }
        })
      }

      /**
       * The breadcrumb shown for one folder: the chain of confirmed ancestors from
       * the shallowest down to itself, joined with "/". A segment that is a
       * registered workspace uses its workspace name (so a remark shows), anything
       * else falls back to the folder name. This is what makes a child like "src"
       * readable on its own in the chooser list.
       */
      const breadcrumbOf = (path) => {
        const registered = readItems()
        const nameFor = (value) => {
          const item = registered.find((entry) => entry !== null && typeof entry === 'object'
            && foldPath(entry.path) === foldPath(value))
          return item === undefined ? baseName(value) : workspaceTitle(item, baseName(value))
        }
        const chain = selectionOrder()
          .filter((entry) => isAncestorPath(entry.path, path))
          .map((entry) => entry.path)
        return (chain.length > 0 ? chain.concat([path]) : [path]).map(nameFor).join('/')
      }

      const submit = () => {
        const list = selectionOrder()
        if (list.length === 0) return
        const primary = list[0]
        setCreating(true)
        setError(null)
        const finish = () => {
          setCreating(false)
          if (isAddFlow && typeof startSession === 'function') {
            // The add flow asks which of the confirmed folders to enter rather than
            // guessing on the user's behalf; the selection entry just closes.
            const confirmed = selectionOrder()
            setEntryChoice(confirmed.length > 0 ? confirmed[0].path : null)
            setEntryOpen(true)
            return
          }
          onCancel()
        }
        const fail = (reason) => {
          setCreating(false)
          const message = errorMessage(reason)
          setError(message)
          if (typeof onError === 'function') onError(message)
        }
        if (typeof ownCreate === 'function') {
          // This dialog owns creation: adopt every selected path (an already
          // registered path is only renamed) and write each remark.
          Promise.all(list.map((entry) => ensureWorkspace((path) => ownCreate(path), entry)))
            .then(finish)
            .catch(fail)
          return
        }
        // Hole mode. The flow owner's `onPicked` adopts one path **and enters it
        // immediately** (it also closes the flow), which used to swallow this dialog's
        // post-submit chooser. So the dialog creates every confirmed path itself and
        // leaves entering to the chooser; `onPicked` stays a fallback for builds that
        // cannot create workspaces directly.
        if (typeof createWorkspace !== 'function' && typeof onPicked === 'function') {
          Promise.resolve(onPicked(primary.path))
            .then(() => applyRemarkEventually(primary, 8))
            .then(finish)
            .catch(fail)
          return
        }
        Promise.all(list.map((entry) => ensureWorkspace((path) => createWorkspace({ path }), entry)
          .catch(() => undefined)))
          .then(finish)
          .catch(fail)
      }

      /**
       * Adopt one selected path: an already registered path is renamed only,
       * a new one is created and then renamed.
       */
      const ensureWorkspace = (creator, entry) => {
        const registered = registeredFor(entry.path)
        if (registered !== undefined) return applyRemarkToId(registered.workspaceId, entry)
        return Promise.resolve(creator(entry.path)).then((workspace) => {
          const id = workspace === undefined || workspace === null ? undefined : workspace.workspaceId
          if (id === undefined) return applyRemarkEventually(entry, 8)
          return applyRemarkToId(id, entry)
        })
      }

      /** Write one entry's remark onto a workspace id, skipping a no-op write. */
      const applyRemarkToId = (workspaceId, entry) => {
        const remark = typeof entry.remark === 'string' ? entry.remark.trim() : ''
        if (remark.length === 0 || typeof renameWorkspace !== 'function') return Promise.resolve(undefined)
        const existing = readItems().find((item) => item !== null && typeof item === 'object' && item.workspaceId === workspaceId)
        const current = existing === undefined || typeof existing.title !== 'string' ? '' : existing.title.trim()
        if (current === remark) return Promise.resolve(undefined)
        return Promise.resolve(renameWorkspace(workspaceId, remark)).catch((reason) => {
          warn('remark write failed', reason)
          return undefined
        })
      }

      /** Wait briefly for a newly adopted path to appear, then write its remark. */
      const applyRemarkEventually = (entry, attempts) => {
        const registered = registeredFor(entry.path)
        if (registered !== undefined) return applyRemarkToId(registered.workspaceId, entry)
        const remark = typeof entry.remark === 'string' ? entry.remark.trim() : ''
        if (remark.length === 0 || attempts <= 0) return Promise.resolve(undefined)
        return new Promise((resolve) => setTimeout(resolve, 250))
          .then(() => applyRemarkEventually(entry, attempts - 1))
      }

      /**
       * Accept an absolute path from the typed input or the system dialog: validate
       * it, open it, then select that folder through `toggleSelect` so every
       * selection constraint still applies. An unreadable path reports inline.
       */
      /**
       * A picked value may arrive as the path itself or as `{ path }`, depending on
       * the backend the seam is pinned to.
       */
      const pathOf = (value) => {
        if (typeof value === 'string') return value
        if (value !== null && typeof value === 'object' && typeof value.path === 'string') return value.path
        return ''
      }

      /**
       * Move the keyboard focus onto one rendered row and scroll it into view.
       *
       * The row only exists once its ancestors' listings have rendered, so this
       * retries; and it compares **folded** paths instead of using an exact attribute
       * selector, because the host listing may spell a path with different separators
       * or casing than the one the user typed (which made the focus silently miss).
       */
      const focusPath = (path, attempts) => {
        const remaining = attempts === undefined ? 24 : attempts
        const container = treeRef.current
        const wanted = foldPath(path)
        let row = null
        if (wanted.length > 0 && container !== null && typeof container.querySelectorAll === 'function') {
          for (const node of container.querySelectorAll('[data-path]')) {
            const candidate = node.getAttribute('data-path')
            if (typeof candidate === 'string' && candidate.length > 0 && foldPath(candidate) === wanted) {
              row = node
              break
            }
          }
        }
        if (row !== null) {
          if (typeof row.scrollIntoView === 'function') row.scrollIntoView({ block: 'nearest' })
          if (typeof row.focus === 'function') row.focus()
          return
        }
        if (remaining <= 0) return
        setTimeout(() => focusPath(path, remaining - 1), 150)
      }

      const acceptPath = (value) => {
        const target = normalizePath(pathOf(value).trim())
        if (target.length === 0) return
        setError(null)
        Promise.resolve(cache.load(target))
          .then((listing) => {
            if (listing.status !== 'ready') {
              setError(t('picker.pathInvalid', { message: toStringOr(listing.message, target) }))
              return
            }
            // Open every level on the way down (shallowest first) so the leaf is on
            // screen, then open the leaf itself — and stop there: typing a path must
            // not pull in the level below it.
            const chain = parentPathsOf(target)
            for (let index = chain.length - 1; index >= 0; index -= 1) setOpen(chain[index], true)
            ingest(target, listing)
            setOpen(target, true)
            if (!selectedRef.current.has(foldPath(target))) toggleSelect(target)
            focusPath(target)
          })
          .catch((reason) => setError(errorMessage(reason)))
      }

      /**
       * Create the child folder the inline editor is naming. A sibling with the same
       * name (per the loaded listing) is refused in place, and the backend's own
       * refusal surfaces the same way. A created folder is opened and adopted as a
       * selection, then focused.
       */
      const commitNewFolder = () => {
        const draft = newFolderRef.current
        if (draft === null || newFolderBusy.current === true) return
        const name = String(draft.name === undefined ? '' : draft.name).trim()
        // An empty name just abandons the editor: nothing is created.
        if (name.length === 0) {
          setNewFolder(null)
          return
        }
        const record = nodes.get(foldPath(draft.parent))
        const siblings = record === undefined || record.status !== 'ready' || !Array.isArray(record.listing.entries)
          ? []
          : record.listing.entries
        if (siblings.some((entry) => String(entry.name).toLowerCase() === name.toLowerCase())) {
          setNewFolder({ ...draft, error: t('picker.newFolder.duplicate') })
          return
        }
        if (typeof createDirectory !== 'function') {
          setNewFolder({ ...draft, error: t('picker.newFolder.unavailable') })
          return
        }
        // One create per editor: a blur that follows the Enter that started this call
        // must not create the folder twice.
        newFolderBusy.current = true
        Promise.resolve(createDirectory(draft.parent, name))
          .then(() => {
            const created = normalizePath(draft.parent + '/' + name)
            setNewFolder(null)
            // Forced reload: the cached level predates the new folder.
            Promise.resolve(cache.load(draft.parent, true))
              .then((listing) => {
                if (listing.status === 'ready') ingest(draft.parent, listing)
              })
              .catch(() => undefined)
            setOpen(created, true)
            if (!selectedRef.current.has(foldPath(created))) toggleSelect(created)
            focusPath(created)
          })
          .catch((reason) => {
            newFolderBusy.current = false
            setNewFolder({ ...draft, error: errorMessage(reason) })
          })
      }

      /** Enter the chooser's folder as a fresh session in its workspace. */
      const startEntry = () => {
        const chosen = entryChoice
        if (chosen === null || chosen === undefined) return
        const item = readItems().find((entry) => entry !== null && typeof entry === 'object'
          && foldPath(entry.path) === foldPath(chosen))
        setEntryOpen(false)
        if (item === undefined || typeof startSession !== 'function') {
          onCancel()
          return
        }
        Promise.resolve(startSession(item.workspaceId))
          .catch((reason) => {
            if (typeof onError === 'function') onError(errorMessage(reason))
          })
          .then(() => onCancel())
      }

      /**
       * The level the tree is currently rooted at: the deepest crumb the root level
       * reported, its home fallback, or the first entry's own directory when that
       * level is a bare drive list.
       */
      const rootPath = (() => {
        const rootRecord = nodes.get('::root::')
        if (rootRecord === undefined || rootRecord.status !== 'ready') return ''
        const listing = rootRecord.listing
        const crumbs = Array.isArray(listing.crumbs) ? listing.crumbs : []
        for (let index = crumbs.length - 1; index >= 0; index -= 1) {
          const candidate = crumbs[index]
          const path = candidate === null || typeof candidate !== 'object'
            ? ''
            : String(candidate.path === undefined ? '' : candidate.path)
          if (path.length > 0) return normalizePath(path)
        }
        if (typeof listing.home === 'string' && listing.home.length > 0) return normalizePath(listing.home)
        const first = Array.isArray(listing.entries) && listing.entries.length > 0 ? listing.entries[0] : undefined
        return first === undefined || typeof first.path !== 'string' ? '' : normalizePath(first.path)
      })()

      /**
       * The path the toolbar shows: the **root node of the current selection**
       * (the shallowest checked folder — picking plugins / dsh-host-mobile-gateway /
       * deploy shows `F:\DSH-Official\plugins`), falling back to the level being
       * browsed while nothing is checked. The full path rides in the tooltip.
       */
      const displayPath = (() => {
        const checked = [...selected.values()]
          .map((entry) => normalizePath(entry.path))
          .filter((path) => path.length > 0)
          .sort((left, right) => foldPath(left).length - foldPath(right).length)
        if (checked.length > 0) return checked[0]
        return rootPath
      })()

      const body = E('div', { className: 'dws-dialogBody' }, [
        E('div', { key: 'crumbs', className: 'dws-dialogToolbar' }, [
          pathDraft === null
            ? E('div', { key: 'trail', className: 'dws-crumbs', style: { flex: '1 1 auto' } }, [
              E('span', { key: 'path', className: 'dws-pickerPath', title: displayPath },
                displayPath.length === 0 ? t('picker.root') : displayPath),
              E(TextButton, { key: 'edit', onClick: () => setPathDraft(displayPath) }, t('picker.pathEdit')),
            ])
            : E('div', { key: 'draft', className: 'dws-inlineEdit' }, [
              E('input', {
                key: 'input',
                className: 'dws-input',
                value: pathDraft,
                'aria-label': t('picker.title'),
                autoFocus: true,
                // The field opens pre-filled with the shown path: select it all so a
                // paste or retype replaces it instead of appending.
                onFocus: (event) => {
                  if (typeof event.target.select === 'function') event.target.select()
                },
                onChange: (event) => setPathDraft(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    const target = pathDraft.trim()
                    setPathDraft(null)
                    if (target.length > 0) acceptPath(target)
                  } else if (event.key === 'Escape') {
                    setPathDraft(null)
                  }
                },
              }),
              E(SuiteButton, { key: 'go', variant: 'primary', onClick: () => {
                const target = pathDraft.trim()
                setPathDraft(null)
                if (target.length > 0) acceptPath(target)
              } }, t('picker.open')),
            ]),
          E('span', { key: 'filter', style: { flex: '0 1 180px', minWidth: '0', display: 'flex' } },
            E('input', {
              className: 'dws-input',
              style: { width: '100%' },
              placeholder: t('picker.filter'),
              'aria-label': t('picker.filter'),
              value: filter,
              onChange: (event) => setFilter(event.target.value),
            })),
          E('label', { key: 'hidden', className: 'dws-muted', style: { display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' } }, [
            E('input', {
              key: 'cb',
              type: 'checkbox',
              checked: showHidden,
              onChange: (event) => setShowHidden(event.target.checked),
            }),
            t('picker.hidden'),
          ]),
        ]),
        E('div', {
          key: 'tree',
          ref: treeRef,
          className: 'dws-pickerTree',
          role: 'tree',
          'aria-label': t('picker.title'),
          onKeyDown: onTreeKeyDown,
        }, [
          ...renderLevel(rootKey, 0, 'root'),
        ]),
      ])

      const footer = E('div', {
        className: 'dws-pickerFooter',
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%' },
      }, [
        E('span', { key: 'note', className: 'dws-footerNote' }, error === null
          ? (selectionOrder().some((entry) => registeredFor(entry.path) !== undefined)
            ? t('picker.alignedHint')
            : t('picker.remarkOnly'))
          : error),
        E('span', { key: 'actions', style: { display: 'flex', gap: '8px', flexShrink: 0 } }, [
          E(SuiteButton, { key: 'cancel', disabled: creating, onClick: onCancel }, t('picker.cancel')),
          E(SuiteButton, {
            key: 'open',
            variant: 'primary',
            disabled: creating || busy === true || selected.size === 0,
            onClick: submit,
          }, t('picker.open')),
        ]),
      ])

      /**
       * The post-submit chooser: only the structure the user just confirmed, fully
       * expanded, one folder selectable. Entering runs a fresh session inside that
       * workspace; skipping just closes (the workspaces are already registered).
       */
      const entryDialog = entryOpen !== true ? null : E(SuiteModal, {
        key: 'entry',
        open: true,
        onClose: () => onCancel(),
        title: t('picker.entry.title'),
        closeLabel: t('common.close'),
        footer: E(React.Fragment, null, [
          E(SuiteButton, { key: 'skip', variant: 'outline', onClick: () => onCancel() }, t('picker.entry.skip')),
          E(SuiteButton, {
            key: 'enter',
            variant: 'primary',
            disabled: entryChoice === null,
            onClick: startEntry,
          }, t('picker.entry.enter')),
        ]),
      }, [
        E('div', { key: 'note', className: 'dws-muted', style: { marginBottom: '6px' } }, t('picker.entry.body')),
        E('div', { key: 'list', className: 'dws-pickerTree', style: { maxHeight: 'min(40vh,360px)' } },
          selectionOrder().map((entry) => {
            const chosen = entryChoice !== null && foldPath(entryChoice) === foldPath(entry.path)
            return E('div', {
              key: 'entry:' + entry.path,
              className: 'dws-pickerRow' + (chosen ? ' dws-pickerRow--selected' : ''),
              style: { '--suite-indent': String(entry.depth * 14) + 'px' },
              role: 'radio',
              'aria-checked': chosen ? 'true' : 'false',
              tabIndex: 0,
              title: entry.path,
              onClick: () => setEntryChoice(entry.path),
              onKeyDown: (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setEntryChoice(entry.path)
                }
              },
            }, [
              E('span', { key: 'icon', className: 'dws-folderIcon' }, icon('IconFolderOpenRegular', 16)),
              E('span', { key: 'name', className: 'dws-pickerName' }, baseName(entry.path)),
            ])
          })),
      ])

      return E(React.Fragment, null,
        conflict === null ? null : E(SuiteModal, {
          key: 'conflict',
          open: true,
          onClose: () => setConflict(null),
          title: t('picker.conflict.title'),
          closeLabel: t('common.close'),
          footer: E(React.Fragment, null, [
            E(SuiteButton, { key: 'cancel', variant: 'outline', onClick: () => setConflict(null) },
              t('picker.conflict.cancel')),
            E(SuiteButton, {
              key: 'replace',
              variant: 'primary',
              onClick: () => {
                const pending = conflict
                setConflict(null)
                if (pending !== null) {
                  // Replace: drop everything, then add the new pick (with its chain).
                  setSelected(new Map())
                  addSelection(pending.path, pending.remark)
                }
              },
            }, t('picker.conflict.replace')),
          ]),
        }, E('div', { style: { fontSize: '13px', lineHeight: '20px' } },
          t('picker.conflict.body', { name: baseName(conflict.path) }))),
        entryDialog,
        E(SuiteModal, {
          open: true,
          onClose: creating ? () => {} : onCancel,
          title: t('picker.title'),
          closeLabel: t('common.close'),
          className: 'dws-dialog dws-picker',
          contentClassName: 'dws-pickerContent',
          footer,
        }, body))
    }

    /* ===================== conversation workspace picker ==================== */

    /**
     * The conversation window's workspace menu: this plugin's occupant of the single
     * `conversation.hero.workspace` slot, shadowing the shipped picker.
     *
     * Why shadow it: the shipped menu lists **every** workspace with its bare title
     * (`label: workspaceDisplayTitle(workspace.title, ...)`), and it builds those rows
     * inline — there is no label slot to hook. A child named `src` or `lib` is
     * unreadable on its own, so this version lists **root-level workspaces only**:
     *
     *  - picking a workspace that has registered descendants opens the subtree
     *    chooser (fully expanded, single select, defaulting to that workspace) so the
     *    user decides which one the conversation starts in;
     *  - picking a leaf enters it directly, the shipped behaviour.
     *
     * "Add workspace" keeps working through the declared child hole
     * (`conversation.hero.workspace.directoryFlow`), which this registration must NOT
     * re-declare: a shadowing entry may not redeclare the shadowed entry's children.
     */
    function HeroWorkspacePicker(props) {
      const {
        open, t, useWorkspaces, selectedId, onPick, onClose, renderSlot,
        listDirectory, createDirectory, createWorkspace, renameWorkspace,
        readWorkspaceItems, startSession,
      } = props
      const snapshot = useWorkspaces === undefined ? null : useWorkspaces((state) => (state === null || state === undefined ? null : state))
      const items = snapshot === null || !Array.isArray(snapshot.items) ? [] : snapshot.items
        .filter((item) => item !== null && typeof item === 'object' && typeof item.path === 'string')
      const [flowOpen, setFlowOpen] = React.useState(false)
      const [flowError, setFlowError] = React.useState(null)
      const [chooser, setChooser] = React.useState(null)
      const [choice, setChoice] = React.useState(null)
      const [chosenItem, setChosenItem] = React.useState(null)

      const isRoot = (item) => !items.some((other) => other !== item && isAncestorPath(other.path, item.path))
      const roots = items.filter(isRoot)
      const subtreeOf = (item) => [item].concat(items.filter((other) => other !== item && isAncestorPath(item.path, other.path)))
      const depthIn = (subtree, item) => subtree.filter((other) => other !== item && isAncestorPath(other.path, item.path)).length
      const labelOf = (item) => workspaceTitle(item, t('browser.folder'))
      // The add entry is offered whenever this plugin holds the picker's own services;
      // it must NOT depend on `renderSlot`, which a shadowing registration that
      // declares no children may not receive (that is why the entry disappeared).
      const flowAvailable = typeof createWorkspace === 'function'
      const canRenderHole = typeof renderSlot === 'function'

      // With nothing registered yet, the only useful entry is "add workspace":
      // open the flow straight away instead of showing a one-row menu.
      React.useEffect(() => {
        if (open === true && flowAvailable && roots.length === 0) setFlowOpen(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [open, flowAvailable, roots.length])

      const beginChooser = (item) => {
        const subtree = subtreeOf(item)
        setChosenItem(item)
        setChooser(subtree)
        setChoice(item.workspaceId)
      }

      const handleSelect = (id) => {
        if (id === 'add-workspace') {
          setFlowOpen(true)
          return
        }
        const item = items.find((entry) => entry.workspaceId === id)
        if (item === undefined) return
        if (subtreeOf(item).length > 1) {
          // More than one workspace below it: ask which one to start in.
          beginChooser(item)
          return
        }
        onPick(id)
      }

      // The workspace rows are `MenuItemButton` children (icons + shortcuts); a build
      // without that primitive falls back to plain `items` labels instead of crashing.
      const defs = roots.map((item) => ({ id: item.workspaceId, label: labelOf(item) }))
      const rows = !hasPrimitive('MenuItemButton') ? undefined : defs.map((def) => E(ui.MenuItemButton, {
        key: 'hero:' + def.id,
        icon: icon('IconFolderCloseRegular', 16),
        disabled: flowOpen,
        onSelect: () => handleSelect(def.id),
      }, def.label))
      // The add entry sits **first** and is styled as an accent row, so it reads as
      // the primary action of the menu rather than one more workspace.
      const addRow = !flowAvailable ? null : E('button', {
        key: 'hero:add',
        type: 'button',
        role: 'menuitem',
        className: 'dws-heroAdd',
        disabled: flowOpen,
        onClick: () => handleSelect('add-workspace'),
      }, [
        icon('IconProjectAddOutlineRegular', 16),
        E('span', { key: 'label', className: 'dws-heroAddLabel' }, t('browser.add')),
      ])
      const menuChildren = addRow === null
        ? rows
        : E(React.Fragment, null, addRow, rows === undefined ? null : rows)

      const flowOwner = {
        open: flowOpen,
        busy: false,
        // The picker registers what it was asked to; entering is its own chooser's
        // job, so this side only closes the flow.
        onPicked: () => setFlowOpen(false),
        onCancel: () => setFlowOpen(false),
        onError: (message) => {
          setFlowOpen(false)
          setFlowError(message)
        },
      }

      const chooserRows = chooser === null ? [] : chooser.map((item) => {
        const chosen = choice === item.workspaceId
        return E('div', {
          key: 'hero-choose:' + item.workspaceId,
          className: 'dws-pickerRow' + (chosen ? ' dws-pickerRow--selected' : ''),
          style: { '--suite-indent': String(depthIn(chooser, item) * 14) + 'px' },
          role: 'radio',
          'aria-checked': chosen ? 'true' : 'false',
          tabIndex: 0,
          title: item.path,
          onClick: () => setChoice(item.workspaceId),
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              setChoice(item.workspaceId)
            }
          },
        }, [
          E('span', { key: 'icon', className: 'dws-folderIcon' }, icon('IconFolderOpenRegular', 16)),
          E('span', { key: 'name', className: 'dws-pickerName' }, labelOf(item)),
        ])
      })

      return E(React.Fragment, null,
        // Positioned from the anchor element's rect: portal mode leaves the list
        // unpinned (top-left corner) without it.
        hasPrimitive('Menu') ? E(ui.Menu, {
          open: open === true && !flowOpen && chooser === null && (defs.length > 0 || flowAvailable),
          anchor: null,
          items: rows === undefined ? defs : [],
          selectedId,
          onSelect: handleSelect,
          onClose,
          side: 'bottom',
          portal: true,
          getAnchorRect: () => {
            const node = props.anchorRef === undefined || props.anchorRef === null ? null : props.anchorRef.current
            return node === null || node === undefined || typeof node.getBoundingClientRect !== 'function'
              ? null
              : node.getBoundingClientRect()
          },
        }, menuChildren) : null,
        // Prefer the declared child hole (that is the sanctioned path); fall back to
        // rendering the picker directly, because a shadowing registration may not be
        // handed `renderSlot` at all.
        canRenderHole
          ? renderSlot('conversation.hero.workspace.directoryFlow', flowOwner)
          : (flowOpen ? E(DirectoryExplorer, Object.assign({ key: 'hero-direct', open: true, t }, flowOwner, {
            mode: 'add',
            listDirectory,
            createDirectory,
            createWorkspace,
            renameWorkspace,
            readWorkspaceItems,
            startSession,
            onPicked: () => setFlowOpen(false),
            onCancel: () => setFlowOpen(false),
            onError: (message) => {
              setFlowOpen(false)
              setFlowError(message)
            },
          })) : null),
        chooser === null ? null : E(SuiteModal, {
          key: 'hero-chooser',
          open: true,
          onClose: () => setChooser(null),
          title: t('picker.entry.title'),
          closeLabel: t('common.close'),
          footer: E(React.Fragment, null, [
            E(SuiteButton, { key: 'cancel', variant: 'outline', onClick: () => setChooser(null) }, t('common.cancel')),
            E(SuiteButton, {
              key: 'enter',
              variant: 'primary',
              disabled: choice === null,
              onClick: () => {
                const picked = choice
                setChooser(null)
                if (picked !== null) onPick(picked)
              },
            }, t('picker.entry.enter')),
          ]),
        }, [
          E('div', { key: 'note', className: 'dws-muted', style: { marginBottom: '6px' } }, t('picker.subtree.body',
            { name: chosenItem === null ? '' : labelOf(chosenItem) })),
          E('div', { key: 'list', className: 'dws-pickerTree', style: { maxHeight: 'min(40vh,360px)' } }, chooserRows),
        ]),
        flowError === null ? null : E(SuiteModal, {
          key: 'hero-error',
          open: true,
          onClose: () => setFlowError(null),
          title: t('browser.add'),
          closeLabel: t('common.close'),
          footer: E(SuiteButton, { variant: 'primary', onClick: () => setFlowError(null) }, t('common.close')),
        }, E('div', { style: { fontSize: '13px', lineHeight: '20px' } }, String(flowError))))
    }

    /* ===================== sidebar workspace browser ======================= */

    /** Persisted view state: which workspaces are expanded and the archive filter. */
    const viewStore = storeKit.createSnapshotStore(
      { expanded: {}, archivedMode: 'hide' },
      { persist: { name: 'dsh-workspace-suite.view.v1' } },
    )

    /** Session status of one session, accepting a Map or a plain object. */
    function statusOf(statuses, sessionId) {
      if (statuses === undefined || statuses === null) return undefined
      if (typeof statuses.get === 'function') return statuses.get(sessionId)
      return statuses[sessionId]
    }

    /** The status label a session row shows when it is not idle. */
    function runningLabel(status) {
      if (status === undefined || status === null) return undefined
      if (status.pendingInteraction !== undefined && status.pendingInteraction !== null) return 'pending'
      return status.running === true ? 'running' : undefined
    }

    /**
     * The sidebar workspace browser this bundle registers instead of the
     * shipped one. It owns every row menu itself: a shadowing registration may
     * not re-declare the shipped entry's child holes, so the shipped session
     * menu entries cannot be rendered here.
     */
    function SuiteWorkspaceBrowser(props) {
      const { wide, t } = props
      const services = props.services === undefined || props.services === null ? {} : props.services
      const settings = useSettings()
      const { sessions, workspaces } = services
      const useWorkspaces = hookFrom(props, 'useWorkspaces', workspaces === undefined ? undefined : workspaces.list)
      const useSessions = hookFrom(props, 'useSessions', sessions === undefined ? undefined : sessions.list)
      // The host's shortcut rows, so menu entries can carry the same hints the
      // shipped menus show. A build without the hook simply shows no hints.
      const shortcutPairs = (() => {
        try {
          const read = props.useShortcuts
          if (typeof read !== 'function') return []
          const rows = read((list) => (Array.isArray(list) ? list : []))
          return Array.isArray(rows) ? rows : []
        } catch {
          return []
        }
      })()
      const shortcutOf = (id) => shortcutPairs.find((row) => row !== null && typeof row === 'object' && row.id === id)
      // Fast rename detection, shared with the picker: a second click on a row's NAME
      // inside RENAME_DOUBLE_CLICK_MS opens rename, while a second click anywhere else
      // runs the row's other double-click action. The single click keeps its current
      // meaning, so nothing feels delayed.
      const fastClickRef = React.useRef({ key: null, at: 0 })
      const rowClick = (key, onSingle, onName, onBody) => (event) => {
        const now = Date.now()
        const previous = fastClickRef.current
        const target = event.target
        const onNameCell = target !== null && target !== undefined && typeof target.closest === 'function'
          && target.closest('[data-row-name]') !== null
        if (previous.key === key && now - previous.at <= RENAME_DOUBLE_CLICK_MS) {
          fastClickRef.current = { key: null, at: 0 }
          event.preventDefault()
          if (onNameCell && onName !== undefined) onName()
          else if (onBody !== undefined) onBody()
          return
        }
        fastClickRef.current = { key, at: now }
        onSingle()
      }
      const view = React.useSyncExternalStore(viewStore.subscribe, viewStore.getSnapshot)
      const [query, setQuery] = React.useState('')
      const [searchOpen, setSearchOpen] = React.useState(false)
      const [contentResults, setContentResults] = React.useState(null)
      const [contentSearching, setContentSearching] = React.useState(false)
      const [dialog, setDialog] = React.useState(null)
      const [notice, setNotice] = React.useState(null)
      const [pickerOpen, setPickerOpen] = React.useState(false)
      // Which entry opened the inline picker: "add" starts blank and ends with the
      // "which workspace do you enter?" chooser, exactly like the conversation
      // window's add flow; "select" mirrors the current workspaces and just closes.
      // One dialog instance serves both, so the intent has to travel with the open.
      const [pickerMode, setPickerMode] = React.useState('add')
      const openPicker = (mode) => {
        setPickerMode(mode)
        setPickerOpen(true)
      }
      const noticeTimer = React.useRef(null)

      const workspaceState = useWorkspaces === null ? null : useWorkspaces((state) => state)
      const sessionList = useSessions === null ? null : useSessions((state) => state)
      const items = workspaceState === null || workspaceState.items === undefined ? [] : workspaceState.items
      const archived = new Set(workspaceState === null || workspaceState.archivedSessionIds === undefined ? [] : workspaceState.archivedSessionIds)
      const pinned = new Set(workspaceState === null || workspaceState.pinnedSessionIds === undefined ? [] : workspaceState.pinnedSessionIds)
      const byId = sessionList === null || sessionList.byId === undefined ? {} : sessionList.byId
      const statuses = typeof props.useSessionStatus === 'function' ? props.useSessionStatus((state) => state) : undefined
      const panelActive = typeof props.usePanelInfo === 'function' ? props.usePanelInfo((info) => info.activePanelId !== null) : false
      const tree = React.useMemo(() => buildWorkspaceTree(items), [items])
      const currentSessionId = panelActive
        ? undefined
        : Object.keys(byId).find((id) => ((byId[id].retainedBy || {}).mainView || 0) > 0)

      const showNotice = React.useCallback((message) => {
        setNotice(message)
        if (noticeTimer.current !== null) clearTimeout(noticeTimer.current)
        noticeTimer.current = setTimeout(() => {
          noticeTimer.current = null
          setNotice(null)
        }, 4000)
      }, [])

      React.useEffect(() => () => {
        if (noticeTimer.current !== null) clearTimeout(noticeTimer.current)
      }, [])

      /** Open one workspace (its blank session or reuse) and select it. */
      const openWorkspace = (workspaceId) => {
        runAction(() => boundCall(services, 'openWorkspace', workspaceId))
      }

      const openSession = (sessionId) => {
        try {
          services.openSession(sessionId)
        } catch (reason) {
          showNotice(t('browser.failed', { message: errorMessage(reason) }))
        }
      }

      const runAction = (work) => {
        Promise.resolve().then(work).catch((reason) => showNotice(t('browser.failed', { message: errorMessage(reason) })))
      }

      /** Sessions shown under one workspace, honouring the archive filter. */
      const sessionsOf = (workspace) => {
        const ids = Array.isArray(workspace.sessionIds) ? workspace.sessionIds : []
        const mode = view.archivedMode === undefined ? 'hide' : view.archivedMode
        const rows = []
        for (const id of ids) {
          const summary = byId[id]
          if (summary === undefined) continue
          if (summary.blank === true && id !== currentSessionId) continue
          if (summary.origin === 'subagent') continue
          const isArchived = archived.has(id)
          if (mode === 'hide' && isArchived) continue
          if (mode === 'only' && !isArchived) continue
          rows.push({ id, summary, archived: isArchived, pinned: pinned.has(id) })
        }
        rows.sort((left, right) => {
          if (left.pinned !== right.pinned) return left.pinned ? -1 : 1
          return timestamp(right.summary.updatedAt) - timestamp(left.summary.updatedAt)
        })
        return rows
      }

      const ungrouped = React.useMemo(() => {
        const accounted = new Set()
        for (const workspace of items) for (const id of workspace.sessionIds || []) accounted.add(id)
        const mode = view.archivedMode === undefined ? 'hide' : view.archivedMode
        const rows = []
        for (const id of Object.keys(byId)) {
          if (accounted.has(id)) continue
          const summary = byId[id]
          if (summary.blank === true && id !== currentSessionId) continue
          if (summary.origin === 'subagent') continue
          const isArchived = archived.has(id)
          if (mode === 'hide' && isArchived) continue
          if (mode === 'only' && !isArchived) continue
          rows.push({ id, summary, archived: isArchived, pinned: pinned.has(id) })
        }
        rows.sort((left, right) => {
          if (left.pinned !== right.pinned) return left.pinned ? -1 : 1
          return timestamp(right.summary.updatedAt) - timestamp(left.summary.updatedAt)
        })
        return rows
      }, [items, byId, archived, pinned, currentSessionId, view.archivedMode])

      const isExpanded = (workspaceId) => {
        const stored = view.expanded === undefined ? undefined : view.expanded[workspaceId]
        if (typeof stored === 'boolean') return stored
        // Tree semantics by default: rows start collapsed, so the closed-folder
        // icon shows until the user expands the row.
        return settings.collapseAllByDefault === false
      }

      const setExpanded = (workspaceId, value) => {
        viewStore.update((draft) => {
          draft.expanded = { ...(draft.expanded || {}), [workspaceId]: value }
        })
      }

      const setAllExpanded = (value) => {
        const next = {}
        for (const workspace of items) next[workspace.workspaceId] = value
        viewStore.update((draft) => {
          draft.expanded = next
        })
      }

      const anyCollapsed = items.some((workspace) => !isExpanded(workspace.workspaceId))
      const archivedMode = view.archivedMode === undefined ? 'hide' : view.archivedMode

      /**
       * Native folding: a workspace shows its pinned, running and current
       * sessions plus the newest five idle ones; "Show more" adds five at a time
       * and "Show less" returns to the first batch.
       */
      const REVEAL_STEP = 5
      const revealOf = (workspaceId) => {
        const stored = view.reveal === undefined ? undefined : view.reveal[workspaceId]
        return typeof stored === 'number' && stored >= REVEAL_STEP ? stored : REVEAL_STEP
      }
      const setReveal = (workspaceId, value) => {
        viewStore.update((draft) => {
          draft.reveal = { ...(draft.reveal || {}), [workspaceId]: value }
        })
      }

      /** The three-way archive visibility control the shipped browser offers. */
      const archiveMenu = (size) => E(RowMenu, {
        key: 'archived',
        label: t('browser.showArchived.label'),
        menuLabel: t('browser.showArchived.label'),
        iconName: 'IconArchiveOutlineRegular',
        size,
        items: [
          {
            id: 'hide',
            label: (archivedMode === 'hide' ? '\u2713 ' : '') + t('browser.showArchived.hide'),
            icon: icon('IconArchiveOffOutlineRegular', 16),
          },
          {
            id: 'all',
            label: (archivedMode === 'all' ? '\u2713 ' : '') + t('browser.showArchived'),
            icon: icon('IconArchiveOutlineRegular', 16),
          },
          {
            id: 'only',
            label: (archivedMode === 'only' ? '\u2713 ' : '') + t('browser.showArchived.only'),
            icon: icon('IconArchiveCheckOutlineRegular', 16),
          },
        ],
        onSelect: (value) => {
          viewStore.update((draft) => {
            draft.archivedMode = value
          })
        },
      })

      /** Token total carried by one session's projection value, when present. */
      const tokensOf = (sessionId) => {
        if (settings.showTokens !== true) return undefined
        const summary = byId[sessionId]
        const view = usageViewOf(summary)
        if (view === undefined) return undefined
        return sumBuckets(view.totals)
      }

      /**
       * The native `sidebar.session.row.leading` ledger entries (the active
       * schedule mark). A shadowing registration may not re-declare the shipped
       * entry's child holes, so the entries are read off the ledger and rendered
       * directly, each with its own locale namespace bound and behind a boundary.
       */
      const leadingEntries = React.useMemo(() => {
        try {
          const registry = services.slots
          if (registry === undefined || registry === null || typeof registry.entries !== 'function') return []
          const entries = registry.entries('sidebar.session.row.leading')
          return Array.isArray(entries) ? entries : []
        } catch {
          return []
        }
      }, [services])

      const leadingSeat = (sessionId) => {
        if (leadingEntries.length === 0) return null
        return leadingEntries.map((entry) => {
          if (entry === null || typeof entry !== 'object' || typeof entry.component !== 'function') return null
          const id = entry.options === undefined ? 'seat' : String(entry.options.id === undefined ? 'seat' : entry.options.id)
          let seatT
          try {
            seatT = typeof services.bindLocale === 'function'
              ? services.bindLocale(entry.options === undefined ? undefined : entry.options.locale)
              : undefined
          } catch {
            seatT = undefined
          }
          return E(QuietBoundary, { key: id },
            E(entry.component, seatT === undefined ? { sessionId } : { sessionId, t: seatT }))
        })
      }

      const renderSessionRow = (row, depth) => {
        const summary = row.summary
        const title = toStringOr(summary.displayTitle, toStringOr(summary.title, row.id))
        const status = statusOf(statuses, row.id)
        const tokens = tokensOf(row.id)
        const idle = status === undefined || status === null
          || (status.running !== true
            && (status.pendingInteraction === undefined || status.pendingInteraction === null))
        const leading = idle
          ? E('span', { key: 'dot', className: 'dws-slot' }, leadingSeat(row.id))
          : E('span', { key: 'dot', className: 'dws-slot' }, E('span', {
            style: {
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--dsw-alias-state-business-primary)',
              display: 'inline-block',
            },
          }))
        const rowNode = E('div', {
          key: 'session:' + row.id,
          className: 'dws-sessionRow' + (row.id === currentSessionId ? ' dws-sessionRow--selected' : '')
            + (row.archived ? ' dws-sessionRow--archived' : ''),
          style: { '--suite-indent': String(depth * 12) + 'px' },
          role: 'treeitem',
          'aria-selected': row.id === currentSessionId ? 'true' : 'false',
          onClick: rowClick(
            'session:' + row.id,
            () => {
              if (row.archived) {
                showNotice(t('browser.archived'))
                return
              }
              openSession(row.id)
            },
            () => setDialog({ kind: 'rename-session', id: row.id, draft: title }),
            () => openSession(row.id),
          ),
        }, [
          leading,
          E(MarqueeTitle, { key: 'title', className: 'dws-title', title }, title),
          E('span', { key: 'time', className: 'dws-time' }, relativeTime(summary.updatedAt, t)),
          E('span', { key: 'actions', className: 'dws-rowActions', onClick: (event) => event.stopPropagation() }, [
            E(IconButton, {
              key: 'pin',
              label: row.pinned ? t('browser.unpin') : t('browser.pin'),
              iconName: row.pinned ? 'IconPinFillRegular' : 'IconPinOutlineRegular',
              size: 14,
              onClick: () => runAction(row.pinned
                ? boundCall(services, 'unpinSession', row.id)
                : boundCall(services, 'pinSession', row.id)),
            }),
            E(IconButton, {
              key: 'archive',
              label: row.archived ? t('browser.unarchive') : t('browser.archive'),
              iconName: row.archived ? 'IconUnarchiveOutlineRegular' : 'IconArchiveOutlineRegular',
              size: 14,
              onClick: () => runAction(row.archived
                ? boundCall(services, 'unarchiveSession', row.id)
                : boundCall(services, 'archiveSession', row.id)),
            }),
            E(RowMenu, {
              key: 'menu',
              label: t('browser.more'),
              menuLabel: title,
              items: [
                {
                  id: 'rename',
                  label: t('browser.rename'),
                  icon: icon('IconEditOutlineRegular', 16),
                  shortcut: shortcutOf('session.rename'),
                },
                { id: 'fork', label: t('browser.fork'), icon: icon('IconBranchOutlineRegular', 16), shortcut: shortcutOf('session.fork') },
                {
                  id: 'pin',
                  label: row.pinned ? t('browser.unpin') : t('browser.pin'),
                  icon: icon(row.pinned ? 'IconPinFillRegular' : 'IconPinOutlineRegular', 16),
                },
                {
                  id: row.archived ? 'unarchive' : 'archive',
                  label: row.archived ? t('browser.unarchive') : t('browser.archive'),
                  icon: icon(row.archived ? 'IconUnarchiveOutlineRegular' : 'IconArchiveOutlineRegular', 16),
                  shortcut: shortcutOf('session.archive'),
                },
              ],
              onSelect: (id) => {
                if (id === 'rename') setDialog({ kind: 'rename-session', id: row.id, draft: title })
                else if (id === 'fork') runAction(boundCall(services, 'forkSession', row.id))
                else if (id === 'pin') runAction(row.pinned ? boundCall(services, 'unpinSession', row.id) : boundCall(services, 'pinSession', row.id))
                else if (id === 'unarchive') runAction(boundCall(services, 'unarchiveSession', row.id))
                else if (id === 'archive') runAction(boundCall(services, 'archiveSession', row.id))
              },
            }),
          ]),
        ])
        return E(SuiteHover, {
          anchor: rowNode,
          disabled: false,
          content: E('div', { className: 'dws-hoverCard' }, [
            E('strong', { key: 'title' }, title),
            E('div', { key: 'id', className: 'dws-hoverLine dws-muted' }, row.id),
            E('div', { key: 'time', className: 'dws-hoverLine dws-secondary' },
              relativeTime(summary.updatedAt, t) + (row.archived ? ' \u00B7 ' + t('browser.archived') : '')),
          ]),
        })
      }

      const renderWorkspace = (workspace, depth) => {
        const children = tree.childrenOf.get(workspace.workspaceId) || []
        const expanded = isExpanded(workspace.workspaceId)
        const sessions = expanded ? sessionsOf(workspace) : []
        // Fold idle rows the way the shipped browser does: pinned, running and
        // the current session always show; the rest arrive five at a time.
        const limit = revealOf(workspace.workspaceId)
        let idleSeen = 0
        const visibleSessions = sessions.filter((row) => {
          const status = statusOf(statuses, row.id)
          if (row.pinned || row.id === currentSessionId || (status !== undefined && status !== null && status.running === true)) return true
          idleSeen += 1
          return idleSeen <= limit
        })
        const hiddenSessions = sessions.length - visibleSessions.length
        const selfTokens = (() => {
          if (settings.showTokens !== true) return undefined
          let sum = 0
          let found = false
          for (const id of workspace.sessionIds || []) {
            const tokens = tokensOf(id)
            if (tokens === undefined) continue
            sum += tokens
            found = true
          }
          return found ? sum : undefined
        })()
        const customTitle = typeof workspace.title === 'string' ? workspace.title.trim() : ''
        const hasRemark = customTitle.length > 0 && customTitle !== baseName(workspace.path)
        const rowNode = E('div', {
          key: 'ws:' + workspace.workspaceId,
          className: 'dws-wsRow' + (currentSessionId !== undefined && (workspace.sessionIds || []).includes(currentSessionId) ? ' dws-wsRow--current' : ''),
          style: { '--suite-indent': String(depth * 12) + 'px' },
          role: 'treeitem',
          'aria-expanded': expanded ? 'true' : 'false',
          // No always-on chevron, so the row itself carries the keyboard
          // affordance: Enter/Space toggle, arrows expand and collapse.
          tabIndex: 0,
          title: workspace.path,
          // Tree semantics: the row itself expands and collapses; a second click on
          // the name renames and one elsewhere opens the workspace.
          onClick: rowClick(
            'ws:' + workspace.workspaceId,
            () => setExpanded(workspace.workspaceId, !expanded),
            () => setDialog({
              kind: 'rename-workspace',
              id: workspace.workspaceId,
              draft: customTitle.length > 0 ? customTitle : baseName(workspace.path),
            }),
            () => openWorkspace(workspace.workspaceId),
          ),
          onKeyDown: (event) => {
            const key = event.key
            if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
              event.preventDefault()
              setExpanded(workspace.workspaceId, !expanded)
            } else if (key === 'ArrowRight' && !expanded) {
              event.preventDefault()
              setExpanded(workspace.workspaceId, true)
            } else if (key === 'ArrowLeft' && expanded) {
              event.preventDefault()
              setExpanded(workspace.workspaceId, false)
            }
          },
          onDoubleClick: (event) => {
            event.preventDefault()
            openWorkspace(workspace.workspaceId)
          },
        }, [
          E('span', { key: 'folder', className: 'dws-folderIcon' + (expanded ? ' dws-folderIcon--active' : '') },
            icon(expanded ? 'IconFolderOpenRegular' : 'IconFolderCloseRegular', 16)),
          E(MarqueeTitle, {
            key: 'text',
            className: 'dws-title dws-title--workspace',
            style: { display: 'flex', alignItems: 'baseline', gap: '2px', minWidth: 0 },
          }, [
            E('span', {
              key: 'name',
              className: 'dws-ellipsis',
              // The native convention: double-clicking a title opens rename.
              onDoubleClick: (event) => {
                event.preventDefault()
                event.stopPropagation()
                setDialog({
                  kind: 'rename-workspace',
                  id: workspace.workspaceId,
                  draft: customTitle.length > 0 ? customTitle : baseName(workspace.path),
                })
              },
            }, workspaceTitle(workspace, t('browser.folder'))),
            hasRemark
              ? E('span', { key: 'original', className: 'dws-original dws-ellipsis' }, baseName(workspace.path))
              : null,
          ]),
          E('span', { key: 'actions', className: 'dws-rowActions', onClick: (event) => event.stopPropagation() }, [
            E(IconButton, {
              key: 'new',
              label: t('browser.newSessionIn'),
              iconName: 'IconNewChatOutlineRegular',
              size: 14,
              onClick: () => runAction(boundCall(services, 'startSession', workspace.workspaceId)),
            }),
            E(RowMenu, {
              key: 'menu',
              label: t('browser.more'),
              menuLabel: workspaceTitle(workspace, t('browser.folder')),
              items: [
                { id: 'new', label: t('browser.newSessionIn'), icon: icon('IconNewChatOutlineRegular', 16), shortcut: shortcutOf('session.new') },
                { id: 'pick', label: t('browser.pickWorkspace'), icon: icon('IconBrowseOutlineRegular', 16), shortcut: shortcutOf('workspace.add') },
                { id: 'overview', label: t('browser.overview'), icon: icon('IconDataOutlineRegular', 16) },
                { id: 'rename', label: t('browser.renameWorkspace'), icon: icon('IconEditOutlineRegular', 16) },
                { id: 'delete', label: t('browser.deleteWorkspace'), icon: icon('IconTrashOutlineRegular', 16), danger: true },
              ],
              onSelect: (id) => {
                if (id === 'new') runAction(boundCall(services, 'startSession', workspace.workspaceId))
                else if (id === 'pick') openPicker('select')
                else if (id === 'overview') services.openOverview(workspace.workspaceId)
                else if (id === 'rename') setDialog({ kind: 'rename-workspace', id: workspace.workspaceId, draft: customTitle.length > 0 ? customTitle : baseName(workspace.path) })
                else if (id === 'delete') setDialog({ kind: 'delete-workspace', id: workspace.workspaceId, name: workspaceTitle(workspace, t('browser.folder')) })
              },
            }),
          ]),
        ])
        const rows = [E(SuiteHover, {
          anchor: rowNode,
          content: E('div', { className: 'dws-hoverCard' }, [
            E('strong', { key: 'title' }, workspaceTitle(workspace, t('browser.folder'))),
            E('div', { key: 'path', className: 'dws-hoverLine dws-muted' }, workspace.path),
            E('div', { key: 'count', className: 'dws-hoverLine dws-secondary' },
              t('browser.turns', { n: (workspace.sessionIds || []).length })),
          ]),
        })]
        if (expanded) {
          for (const row of visibleSessions) rows.push(renderSessionRow(row, depth + 1))
          if (hiddenSessions > 0) {
            rows.push(E('div', {
              key: 'more:' + workspace.workspaceId,
              className: 'dws-moreRow',
              style: { '--suite-indent': String((depth + 1) * 12) + 'px' },
            }, E(TextButton, {
              onClick: () => setReveal(workspace.workspaceId, limit + REVEAL_STEP),
            }, t('browser.showMore') + ' (' + String(hiddenSessions) + ')')))
          } else if (limit > REVEAL_STEP) {
            rows.push(E('div', {
              key: 'less:' + workspace.workspaceId,
              className: 'dws-moreRow',
              style: { '--suite-indent': String((depth + 1) * 12) + 'px' },
            }, E(TextButton, {
              onClick: () => setReveal(workspace.workspaceId, REVEAL_STEP),
            }, t('browser.showLess'))))
          }
          for (const child of children) rows.push(renderWorkspace(child, depth + 1))
        }
        return rows
      }

      // Metadata search plus the host's content search, replacing the tree view.
      const needle = query.trim().toLowerCase()
      const metadataResults = React.useMemo(() => {
        if (needle.length === 0) return []
        const out = []
        for (const workspace of items) {
          if (workspace.path.toLowerCase().includes(needle) || String(workspace.title || '').toLowerCase().includes(needle)) {
            out.push({ kind: 'workspace', id: workspace.workspaceId, title: workspaceTitle(workspace, t('browser.folder')), meta: workspace.path })
          }
        }
        for (const id of Object.keys(byId)) {
          const summary = byId[id]
          if (summary.origin === 'subagent') continue
          const title = toStringOr(summary.displayTitle, toStringOr(summary.title, id))
          if (title.toLowerCase().includes(needle)) {
            out.push({ kind: 'session', id, title, meta: toStringOr(summary.cwd, '') })
          }
        }
        return out.slice(0, 20)
      }, [needle, items, byId, t])

      React.useEffect(() => {
        if (needle.length === 0) {
          setContentResults(null)
          setContentSearching(false)
          return undefined
        }
        if (typeof services.searchSessions !== 'function') return undefined
        const controller = typeof AbortController === 'function' ? new AbortController() : null
        setContentSearching(true)
        const timer = setTimeout(() => {
          Promise.resolve(services.searchSessions(query.trim(), controller === null ? undefined : controller.signal))
            .then((result) => {
              setContentSearching(false)
              setContentResults(Array.isArray(result) ? result : [])
            })
            .catch(() => {
              setContentSearching(false)
              setContentResults(null)
            })
        }, 250)
        return () => {
          clearTimeout(timer)
          if (controller !== null) controller.abort()
        }
      }, [needle, query, services])

      // A 56px rail cannot hold a horizontal icon row, so the same controls
      // stack into a column there and the search affordance expands the sidebar
      // first (the owner hands us `expandSidebar` for exactly that).
      const header = E('div', { className: 'dws-header' + (wide ? '' : ' dws-header--rail') }, wide
        ? [
          E('span', { key: 'label', className: 'dws-headerLabel' }, searchOpen ? '' : t('browser.title')),
          searchOpen
            ? E('div', { key: 'search', className: 'dws-searchBox' }, [
              E('input', {
                key: 'input',
                className: 'dws-searchInput',
                autoFocus: true,
                placeholder: t('browser.search.placeholder'),
                'aria-label': t('browser.search'),
                value: query,
                onChange: (event) => setQuery(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Escape') {
                    setQuery('')
                    setSearchOpen(false)
                  }
                },
              }),
              E(IconButton, {
                key: 'close',
                label: t('common.close'),
                iconName: 'IconCloseOutlineRegular',
                size: 14,
                onClick: () => {
                  setQuery('')
                  setSearchOpen(false)
                },
              }),
            ])
            : null,
          searchOpen ? null : E(IconButton, {
            key: 'searchButton',
            label: t('browser.search'),
            iconName: 'IconSearchOutlineRegular',
            size: 16,
            onClick: () => setSearchOpen(true),
          }),
          archiveMenu(16),
          E(IconButton, {
            key: 'collapse',
            label: anyCollapsed ? t('browser.collapseAll') : t('browser.expandAll'),
            iconName: 'IconWorkspaceTreeOutlineRegular',
            size: 16,
            pressed: anyCollapsed,
            onClick: () => setAllExpanded(anyCollapsed),
          }),
          E(IconButton, {
            key: 'add',
            label: t('browser.add'),
            iconName: 'IconProjectAddOutlineRegular',
            size: 16,
            onClick: () => openPicker('add'),
          }),
        ]
        : [
          E(IconButton, {
            key: 'search',
            label: t('browser.search'),
            iconName: 'IconSearchOutlineRegular',
            size: 18,
            onClick: () => {
              if (typeof props.expandSidebar === 'function') props.expandSidebar()
              setSearchOpen(true)
            },
          }),
          archiveMenu(18),
          E(IconButton, {
            key: 'collapse',
            label: anyCollapsed ? t('browser.collapseAll') : t('browser.expandAll'),
            iconName: 'IconWorkspaceTreeOutlineRegular',
            size: 18,
            pressed: anyCollapsed,
            onClick: () => setAllExpanded(anyCollapsed),
          }),
          E(IconButton, { key: 'add', label: t('browser.add'), iconName: 'IconProjectAddOutlineRegular', size: 18, onClick: () => openPicker('add') }),
        ])

      const body = (() => {
        if (searchOpen && needle.length > 0) {
          const rows = []
          for (const result of metadataResults) {
            rows.push(E('button', {
              key: 'meta:' + result.kind + ':' + result.id,
              type: 'button',
              className: 'dws-searchRow',
              onClick: () => {
                setQuery('')
                setSearchOpen(false)
                if (result.kind === 'session') openSession(result.id)
                else openWorkspace(result.id)
              },
            }, [
              E('span', { key: 'head', className: 'dws-searchHead' }, [
                E('span', { key: 'icon', className: 'dws-folderIcon' },
                  icon(result.kind === 'workspace' ? 'IconFolderCloseRegular' : 'IconNewChatOutlineRegular', 16)),
                E('span', { key: 'title', className: 'dws-title' }, result.title),
              ]),
              E('span', { key: 'meta', className: 'dws-searchMeta' }, [
                E('span', { key: 'path', className: 'dws-snippet' }, result.meta),
              ]),
            ]))
          }
          for (const result of contentResults === null ? [] : contentResults) {
            if (result === null || typeof result !== 'object') continue
            const id = result.sessionId === undefined ? result.id : result.sessionId
            if (typeof id !== 'string') continue
            const summary = byId[id]
            const title = summary === undefined ? id : toStringOr(summary.displayTitle, toStringOr(summary.title, id))
            rows.push(E('button', {
              key: 'content:' + id,
              type: 'button',
              className: 'dws-searchRow',
              onClick: () => {
                setQuery('')
                setSearchOpen(false)
                openSession(id)
              },
            }, [
              E('span', { key: 'head', className: 'dws-searchHead' }, [
                E('span', { key: 'icon', className: 'dws-folderIcon' }, icon('IconNewChatOutlineRegular', 16)),
                E('span', { key: 'title', className: 'dws-title' }, title),
              ]),
              E('span', { key: 'meta', className: 'dws-searchMeta' }, [
                E('span', { key: 'snippet', className: 'dws-snippet' }, toStringOr(result.snippet, '')),
              ]),
            ]))
          }
          if (rows.length === 0) {
            rows.push(E('div', { key: 'empty', className: 'dws-empty' },
              contentSearching ? t('browser.search.searching') : t('browser.search.empty')))
          }
          return E('div', { key: 'results', className: 'dws-searchResults' }, rows)
        }
        if (items.length === 0 && ungrouped.length === 0) {
          return E('div', { key: 'empty', className: 'dws-empty' }, [
            E('div', { key: 'title' }, t('browser.empty')),
            E('div', { key: 'hint', style: { marginTop: '4px' } }, t('browser.empty.hint')),
          ])
        }
        const rows = []
        for (const root of tree.roots) rows.push(...renderWorkspace(root, 0))
        if (ungrouped.length > 0) {
          rows.push(E('div', { key: 'ungrouped', className: 'dws-wsRow', role: 'treeitem' }, [
            E('span', { key: 'chev', className: 'dws-chev' }),
            E('span', { key: 'folder', className: 'dws-folderIcon' }, icon('IconFolderCloseRegular', 16)),
            E('span', { key: 'title', className: 'dws-title dws-title--workspace' }, t('browser.ungrouped')),
          ]))
          for (const row of ungrouped) rows.push(renderSessionRow(row, 1))
        }
        return E('div', { key: 'tree', className: 'dws-treeBody' }, rows)
      })()

      // The list fills the space down to the account row and scrolls inside it,
      // exactly like the shipped session list; `treeMaxHeightPct` only caps how far
      // it may grow (100 = no cap). Shrinking the area instead would leave the blank
      // band above the account row that this used to show.
      const maxHeight = settings.treeScroll === true
        ? { maxHeight: String(Math.min(100, Math.max(20, Number(settings.treeMaxHeightPct) || 100))) + 'vh' }
        : {}

      const listArea = E('div', {
        className: 'dws-scroll',
        style: { flex: '1 1 auto', minHeight: 0, ...maxHeight },
      }, body)

      /**
       * Delete one workspace together with everything under it. The removal runs in
       * passes, deepest first, re-reading the live list each pass: the earlier
       * single-chain version left the next level behind, so the parent had to be
       * deleted again and again. Whatever refuses to go is reported.
       */
      const deleteSubtree = async (rootId, rootPath) => {
        const deleteOne = (id) => Promise.resolve(services.deleteWorkspace(id))
        const descendants = () => services.readWorkspaceItems()
          .filter((item) => item !== null && typeof item === 'object'
            && item.workspaceId !== rootId && typeof item.path === 'string' && isAncestorPath(rootPath, item.path))
          .sort((left, right) => foldPath(right.path).length - foldPath(left.path).length)
        for (let pass = 0; pass < 8; pass += 1) {
          const doomed = descendants()
          if (doomed.length === 0) break
          for (const item of doomed) {
            try {
              await deleteOne(item.workspaceId)
            } catch (reason) {
              warn('cascade delete failed', reason)
            }
          }
        }
        try {
          await deleteOne(rootId)
        } catch (reason) {
          warn('workspace delete failed', reason)
        }
        const left = descendants().length
        if (left > 0) showNotice(t('browser.deleteResidue', { n: left }))
      }

      const dialogs = []
      if (dialog !== null && (dialog.kind === 'rename-workspace' || dialog.kind === 'rename-session')) {
        const isWorkspace = dialog.kind === 'rename-workspace'
        const title = isWorkspace ? t('browser.renameWorkspaceTitle') : t('browser.renameTitle')
        // Shipped-dialog rules: a blank or unchanged name cannot be confirmed, and
        // a duplicate workspace name is reported inside the dialog instead of in a
        // toast, which is what the native rename window does.
        const draft = String(dialog.draft || '').trim()
        const current = (() => {
          if (isWorkspace) {
            const item = items.find((entry) => entry.workspaceId === dialog.id)
            return item === undefined ? '' : String(item.title || '').trim()
          }
          const summary = byId[dialog.id]
          return summary === undefined ? '' : toStringOr(summary.displayTitle, toStringOr(summary.title, '')).trim()
        })()
        const duplicate = isWorkspace && draft.length > 0 && draft !== current
          && items.some((item) => item.workspaceId !== dialog.id && String(item.title || '').trim() === draft)
        const renameProblem = draft.length === 0
          ? t('browser.empty.name')
          : duplicate ? t('browser.duplicate') : null
        const renameBlocked = draft.length === 0 || renameProblem !== null || draft === current
        const confirmRename = () => {
          if (renameBlocked) return
          setDialog(null)
          if (isWorkspace) runAction(services.renameWorkspace(dialog.id, draft))
          else runAction(services.renameSession(dialog.id, draft))
        }
        dialogs.push(E(SuiteModal, {
          key: 'rename',
          open: true,
          onClose: () => setDialog(null),
          title,
          closeLabel: t('common.close'),
          footer: E(React.Fragment, null, [
            E(SuiteButton, { key: 'cancel', variant: 'outline', onClick: () => setDialog(null) }, t('common.cancel')),
            E(SuiteButton, {
              key: 'ok',
              variant: 'primary',
              disabled: renameBlocked,
              onClick: confirmRename,
            }, t('common.confirm')),
          ]),
        }, [
          E('input', {
            key: 'input',
            className: 'dws-renameInput',
            'data-modal-autofocus': true,
            'aria-label': title,
            placeholder: t('browser.namePlaceholder'),
            value: dialog.draft || '',
            onChange: (event) => setDialog({ ...dialog, draft: event.target.value }),
            onFocus: (event) => event.target.select(),
            onKeyDown: (event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                confirmRename()
              }
            },
          }),
          renameProblem === null
            ? null
            : E('div', { key: 'error', className: 'dws-renameError' }, renameProblem),
        ]))
      }
      if (dialog !== null && dialog.kind === 'delete-workspace') {
        // Deleting a workspace takes its whole subtree with it: a child whose parent
        // is gone would otherwise linger as an orphan. The dialog lists what goes, so
        // the count is never a surprise, and the deepest entries are removed first.
        const target = items.find((item) => item.workspaceId === dialog.id)
        const doomed = target === undefined ? [] : items
          .filter((item) => item.workspaceId !== dialog.id && isAncestorPath(target.path, item.path))
          .sort((left, right) => foldPath(right.path).length - foldPath(left.path).length)
        const names = doomed.map((item) => workspaceTitle(item, t('browser.folder')))
        const preview = names.slice(0, 6).join('\u3001')
        dialogs.push(E(SuiteModal, {
          key: 'delete',
          open: true,
          onClose: () => setDialog(null),
          title: t('browser.deleteTitle'),
          closeLabel: t('common.close'),
          footer: E('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } }, [
            E(SuiteButton, { key: 'cancel', onClick: () => setDialog(null) }, t('common.cancel')),
            E(SuiteButton, {
              key: 'ok',
              variant: 'primary',
              onClick: () => {
                setDialog(null)
                // Children first (by passes), then the target itself.
                if (target === undefined) runAction(services.deleteWorkspace(dialog.id))
                else void deleteSubtree(dialog.id, target.path)
              },
            }, t('common.confirm')),
          ]),
        }, E('div', { style: { fontSize: '13px', lineHeight: '20px' } }, [
          E('div', { key: 'body' }, t('browser.deleteBody', { name: dialog.name })),
          doomed.length === 0 ? null : E('div', { key: 'cascade', className: 'dws-warn', style: { marginTop: '8px' } },
            t('browser.deleteCascade', { n: doomed.length, names: preview + (names.length > 6 ? '\u2026' : '') })),
        ])))
      }

      return E('div', { className: 'dws-root' + (wide ? '' : ' dws-root--rail') }, [
        header,
        // The tree area carries the shipped bottom fade: the last rows dissolve into
        // the sidebar fill instead of ending on a hard edge above the account row.
        E('div', { key: 'list', className: 'dws-listWrap' }, [
          listArea,
          E('div', { key: 'fade', className: 'dws-fade', 'aria-hidden': 'true' }),
        ]),
        notice === null ? null : E('div', { key: 'notice', className: 'dws-empty', style: { padding: '8px' } }, notice),
        ...dialogs,
        E(DirectoryExplorer, {
          key: 'picker',
          open: pickerOpen,
          t,
          settings,
          mode: pickerMode,
          listDirectory: services.listDirectory,
          createDirectory: services.createDirectory,
          createWorkspace: services.createWorkspace,
          renameWorkspace: services.renameWorkspace,
          readWorkspaceItems: services.readWorkspaceItems,
          startSession: services.startSession,
          workspacesHook: useWorkspaces,
          // Only the "workspace selection" entry mirrors the workspaces that exist
          // right now; the add entries open blank and finish with the chooser, which
          // is what the conversation window's add flow does too.
          ...(pickerMode === 'select'
            ? {
              initialPaths: () => items
                .filter((item) => item !== null && typeof item === 'object' && typeof item.path === 'string')
                .map((item) => item.path),
            }
            : {}),
          ...(typeof services.pickDirectory === 'function' ? { pick: services.pickDirectory } : {}),
          ownCreate: (path) => services.createWorkspace({ path }),
          onPicked: () => {},
          onCancel: () => setPickerOpen(false),
          onError: (message) => showNotice(t('browser.failed', { message })),
        }),
      ])
    }

    /* ========================= overview panel page ========================= */

    /** Local day keys of the last N days, oldest first, ending today. */
    function recentDays(count) {
      const out = []
      const today = new Date()
      for (let index = count - 1; index >= 0; index -= 1) {
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - index)
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        out.push(date.getFullYear() + '-' + month + '-' + day)
      }
      return out
    }

    /** Sum two bucket sets. */
    function addBuckets(left, right) {
      const out = {}
      for (const key of ['uncachedInputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens']) {
        out[key] = (left === undefined ? 0 : left[key] || 0) + (right === undefined ? 0 : right[key] || 0)
      }
      return out
    }

    /** Merge one usage view into an accumulator. */
    function mergeUsage(accumulator, view, into) {
      if (view === undefined || view === null) return accumulator
      const next = accumulator
      next.totals = addBuckets(next.totals, view.totals)
      for (const [model, buckets] of Object.entries(view.models || {})) {
        next.models[model] = addBuckets(next.models[model], buckets)
      }
      for (const [day, modelMap] of Object.entries(view.days || {})) {
        const target = next.days[day] === undefined ? {} : next.days[day]
        for (const [model, buckets] of Object.entries(modelMap || {})) {
          target[model] = addBuckets(target[model], buckets)
        }
        next.days[day] = target
      }
      if (into !== undefined) into.push(view)
      return next
    }

    /** Total tokens of one per-day per-model map. */
    function sumDayModels(modelMap) {
      let sum = 0
      for (const buckets of Object.values(modelMap || {})) sum += sumBuckets(buckets)
      return sum
    }

    /** Plain-text model breakdown, used as a title when rich cards are too many. */
    function modelSummaryText(models, title) {
      const rows = Object.entries(models)
        .sort((left, right) => sumBuckets(right[1]) - sumBuckets(left[1]))
        .map(([model, buckets]) => model + ': ' + formatCount(sumBuckets(buckets)))
      return [title].concat(rows).join('\n')
    }

    /** Which root workspace the next overview opening should show. */
    const overviewTargetStore = storeKit.createSnapshotStore({ workspaceId: null, seq: 0 })

    /** Ask the overview panel to focus one workspace (used by row menus). */
    function requestOverview(workspaceId) {
      overviewTargetStore.update((draft) => {
        draft.workspaceId = workspaceId
        draft.seq = draft.seq + 1
      })
    }

    /**
     * The per-workspace overview page registered as a global `main` panel.
     *
     * Data comes entirely from the host projection unit this bundle registers:
     * `sessions.byId[id].projectionValues.workspaceSuiteUsage`. Cold sessions
     * are warmed through `sessions.refreshProjections` when the service offers
     * it; anything still missing is reported as a partial measurement.
     */
    function SuiteOverview(props) {
      const { t, panelKey } = props
      const services = props.services === undefined || props.services === null ? {} : props.services
      const settings = useSettings()
      const { sessions, workspaces } = services
      const useWorkspaces = hookFrom(props, 'useWorkspaces', workspaces === undefined ? undefined : workspaces.list)
      const useSessions = hookFrom(props, 'useSessions', sessions === undefined ? undefined : sessions.list)
      // Host shortcut rows, so this page's menus carry the same hints as the list's.
      const overviewShortcutRows = (() => {
        try {
          const read = props.useShortcuts
          if (typeof read !== 'function') return []
          const rows = read((list) => (Array.isArray(list) ? list : []))
          return Array.isArray(rows) ? rows : []
        } catch {
          return []
        }
      })()
      const overviewShortcutOf = (id) => overviewShortcutRows.find((row) => row !== null && typeof row === 'object' && row.id === id)
      const workspaceState = useWorkspaces === null ? null : useWorkspaces((state) => state)
      const sessionList = useSessions === null ? null : useSessions((state) => state)
      const items = workspaceState === null || workspaceState.items === undefined ? [] : workspaceState.items
      const byId = sessionList === null || sessionList.byId === undefined ? {} : sessionList.byId
      const tree = React.useMemo(() => buildWorkspaceTree(items), [items])
      const [rootId, setRootId] = React.useState(null)
      const [readme, setReadme] = React.useState(null)
      const [readmeError, setReadmeError] = React.useState(null)
      const [warmTicket, setWarmTicket] = React.useState(0)
      const [env, setEnv] = React.useState(null)
      const overviewTarget = React.useSyncExternalStore(overviewTargetStore.subscribe, overviewTargetStore.getSnapshot)
      React.useEffect(() => {
        if (overviewTarget.workspaceId !== null) setRootId(overviewTarget.workspaceId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [overviewTarget.seq])
      const dialogs = useSuiteDialog({
        t,
        items,
        onNotice: (message) => warn('overview dialog: ' + message),
        onRenameWorkspace: (id, value) => services.renameWorkspace(id, value),
        onRenameSession: (id, value) => services.renameSession(id, value),
        onDeleteWorkspace: (id) => services.deleteWorkspace(id),
      })

      const currentRoot = React.useMemo(() => {
        if (rootId !== null && items.some((item) => item.workspaceId === rootId)) return rootId
        const current = Object.keys(byId).find((id) => ((byId[id].retainedBy || {}).mainView || 0) > 0)
        if (current !== undefined) {
          const owner = items.find((item) => (item.sessionIds || []).includes(current))
          if (owner !== undefined) {
            const chain = ancestorsOf(tree.parentOf, owner.workspaceId)
            return chain.length > 0 ? chain[0] : owner.workspaceId
          }
        }
        return tree.roots.length > 0 ? tree.roots[0].workspaceId : null
      }, [rootId, items, byId, tree])

      const subtreeIds = currentRoot === null ? [] : collectSubtree(tree.parentOf, tree.childrenOf, currentRoot)
      const root = items.find((item) => item.workspaceId === currentRoot)

      /** Session ids of one workspace id list, honouring the inclusion settings. */
      const sessionIdsOf = React.useCallback((ids) => {
        const out = []
        for (const workspaceId of ids) {
          const workspace = items.find((item) => item.workspaceId === workspaceId)
          if (workspace === undefined) continue
          for (const id of workspace.sessionIds || []) {
            const summary = byId[id]
            if (summary === undefined) continue
            if (summary.blank === true) continue
            if (summary.origin === 'subagent' && settings.includeSubagent !== true) continue
            out.push(id)
          }
        }
        return out
      }, [items, byId, settings.includeSubagent])

      /** Every session id of the subtree, plus archived-only ones when included. */
      const subtreeSessionIds = React.useMemo(() => {
        const ids = sessionIdsOf(subtreeIds)
        if (settings.includeArchived === true) {
          for (const id of Object.keys(byId)) {
            const summary = byId[id]
            if (summary === undefined || summary.blank === true) continue
            if (summary.origin === 'subagent' && settings.includeSubagent !== true) continue
            if (ids.includes(id)) continue
            const owner = items.find((item) => (item.sessionIds || []).includes(id))
            if (owner !== undefined && subtreeIds.includes(owner.workspaceId)) ids.push(id)
          }
        }
        return ids
      }, [sessionIdsOf, subtreeIds, byId, items, settings.includeArchived, settings.includeSubagent])

      const usageOf = (sessionId) => usageViewOf(byId[sessionId])

      // Warm the cold sessions of this subtree once, then let the rows re-read.
      React.useEffect(() => {
        if (typeof services.refreshProjections !== 'function') return undefined
        const cold = subtreeSessionIds.filter((id) => usageOf(id) === undefined).slice(0, 80)
        if (cold.length === 0) return undefined
        let cancelled = false
        Promise.resolve(services.refreshProjections(cold)).then(() => {
          if (!cancelled) setWarmTicket((value) => value + 1)
        }).catch(() => {
          if (!cancelled) setWarmTicket((value) => value + 1)
        })
        return () => {
          cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [subtreeSessionIds.join(','), warmTicket])

      const subtreeUsage = React.useMemo(() => {
        const accumulator = { totals: addBuckets(undefined, undefined), models: {}, days: {}, views: {} }
        for (const id of subtreeSessionIds) {
          const view = usageOf(id)
          if (view === undefined) continue
          accumulator.views[id] = view
          mergeUsage(accumulator, view)
        }
        return accumulator
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [subtreeSessionIds.join(','), byId, warmTicket])

      const missing = subtreeSessionIds.filter((id) => usageOf(id) === undefined).length
      const degraded = subtreeSessionIds.some((id) => {
        const view = usageOf(id)
        return view !== undefined && view.fallback === true
      })

      // README of the root workspace, read through the workspace-files Remote.
      React.useEffect(() => {
        if (settings.readme !== true || root === undefined) {
          setReadme(null)
          setReadmeError(null)
          return undefined
        }
        if (typeof services.readFile !== 'function') {
          setReadme(null)
          setReadmeError(t('overview.readme.denied', { message: 'service unavailable' }))
          return undefined
        }
        let cancelled = false
        const authorization = subtreeSessionIds[0] === undefined ? Object.keys(byId)[0] : subtreeSessionIds[0]
        const target = normalizePath(root.path) + '/README.md'
        if (authorization === undefined) {
          setReadme(null)
          setReadmeError(t('overview.readme.denied', { message: 'no session' }))
          return undefined
        }
        setReadme(null)
        setReadmeError(null)
        services.readFile(authorization, target)
          .then((text) => {
            if (!cancelled) setReadme(typeof text === 'string' && text.length > 0 ? text : null)
          })
          .catch((reason) => {
            if (cancelled) return
            const message = errorMessage(reason)
            if (/not-found|ENOENT/i.test(message)) setReadmeError(t('overview.readme.missing'))
            else setReadmeError(t('overview.readme.denied', { message }))
          })
        return () => {
          cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [root === undefined ? '' : root.path, settings.readme, subtreeSessionIds.join(','), warmTicket])

      // Dependencies and environment: one directory listing (child directories only —
      // the browse backend never reports files) plus a handful of top-level file
      // probes read through the workspace-files Remote. Nothing recurses, so the card
      // costs a fixed, small number of calls.
      React.useEffect(() => {
        if (settings.showEnv !== true || root === undefined || typeof root.path !== 'string') {
          setEnv(null)
          return undefined
        }
        const authorization = subtreeSessionIds[0] === undefined ? Object.keys(byId)[0] : subtreeSessionIds[0]
        const base = normalizePath(root.path)
        let cancelled = false
        setEnv({ status: 'loading' })
        const readOne = (name) => (authorization === undefined || typeof services.readFile !== 'function'
          ? Promise.resolve(null)
          : Promise.resolve(services.readFile(authorization, base + '/' + name))
            .then((text) => (typeof text === 'string' && text.length > 0 ? text : null))
            .catch(() => null))
        const list = typeof services.listDirectory === 'function'
          ? Promise.resolve(services.listDirectory(root.path))
            .then((listing) => directoryNames(listing))
            .catch(() => [])
          : Promise.resolve([])
        Promise.all([list].concat(ENV_PROBE_FILES.map(readOne)))
          .then((results) => {
            if (cancelled) return
            const dirs = Array.isArray(results[0]) ? results[0] : []
            const probes = {}
            for (let index = 0; index < ENV_PROBE_FILES.length; index += 1) {
              probes[ENV_PROBE_FILES[index]] = results[index + 1] !== null && results[index + 1] !== undefined
            }
            setEnv({
              status: 'ready',
              dirs,
              probes,
              pkg: packageSummary(results[1]),
            })
          })
          .catch((reason) => {
            if (!cancelled) setEnv({ status: 'error', message: errorMessage(reason) })
          })
        return () => {
          cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [root === undefined ? '' : root.path, settings.showEnv, subtreeSessionIds.join(','), warmTicket])

      /** Hover content listing the per-model split of one bucket map. */
      const modelContent = (models, title) => E('div', { className: 'dws-hoverCard' }, [
        E('strong', { key: 'title' }, title),
        ...Object.entries(models)
          .sort((left, right) => sumBuckets(right[1]) - sumBuckets(left[1]))
          .map(([model, buckets], index) => E('div', { key: model + index, className: 'dws-modelRow' }, [
            E('span', { key: 'name', className: 'dws-modelName' }, model),
            E('span', { key: 'value', className: 'dws-modelValue' }, formatCount(sumBuckets(buckets))),
          ])),
      ])

      /**
       * A token badge. The requirement asks for the whole subtree expanded, so a
       * page can list thousands of rows: past a bound the per-row hover card
       * (one component each) degrades to a native title with the same numbers.
       */
      const RICH_HOVER_LIMIT = 250
      const richHover = subtreeSessionIds.length <= RICH_HOVER_LIMIT
      const tokenBadge = (key, total, models, label) => (richHover
        ? SuiteHover({ key, anchor: Badge({ children: formatTokens(total), title: label }), content: modelContent(models, label) })
        : Badge({ key, children: formatTokens(total), title: modelSummaryText(models, label) }))

      /** Scroll the conversation to one turn after opening its session. */
      const jumpToTurn = (sessionId, turn) => {
        try {
          services.openSession(sessionId)
        } catch (reason) {
          warn('turn jump failed', reason)
          return
        }
        if (typeof document === 'undefined') return
        let attempts = 0
        const seek = () => {
          attempts += 1
          const node = document.querySelector('[data-chat-turn="' + String(turn) + '"]')
          if (node !== null && typeof node.scrollIntoView === 'function') {
            node.scrollIntoView({ block: 'center', behavior: 'smooth' })
            return
          }
          if (attempts < 20) setTimeout(seek, 150)
        }
        setTimeout(seek, 150)
      }

      const renderSession = (sessionId, depth) => {
        const summary = byId[sessionId]
        if (summary === undefined) return null
        const title = toStringOr(summary.displayTitle, toStringOr(summary.title, sessionId))
        const view = usageOf(sessionId)
        const total = view === undefined ? undefined : sumBuckets(view.totals)
        const turns = view === undefined || !Array.isArray(view.turns) ? [] : view.turns
        // The shipped `turnOutline` projection is the whole-log turn list (turn
        // number, start seq, bounded prompt preview), so a turn row can name the
        // prompt that produced it rather than only its number. No outline (or an
        // older build) degrades to the number label.
        const outline = (() => {
          const values = summary.projectionValues
          const raw = values === undefined || values === null ? undefined : values.turnOutline
          return Array.isArray(raw) ? raw : []
        })()
        const promptOf = (number) => {
          const indexed = outline.find((item) => item !== null && typeof item === 'object'
            && Number(item.number) === Number(number))
          const entry = indexed === undefined ? outline[Number(number) - 1] : indexed
          const prompt = entry === undefined || entry === null || entry.prompt === undefined ? '' : String(entry.prompt)
          return prompt.replace(/\s+/g, ' ').trim()
        }
        const archived = (workspaceState === null ? [] : workspaceState.archivedSessionIds || []).includes(sessionId)
        const pinned = (workspaceState === null ? [] : workspaceState.pinnedSessionIds || []).includes(sessionId)
        const row = E('div', {
          key: 'ov-session:' + sessionId,
          // The same row as the workspace list, so the overview shows the same
          // hierarchy instead of a second, flatter rendering of it.
          className: 'dws-sessionRow',
          style: { '--suite-indent': String(depth * 12) + 'px' },
          role: 'treeitem',
          // Double-clicking the session object (anything but its name) jumps to
          // that session, the overview's counterpart of the sidebar row click.
          onDoubleClick: (event) => {
            event.preventDefault()
            services.openSession(sessionId)
          },
        }, [
          E('span', { key: 'icon', className: 'dws-slot' }, icon('IconNewChatOutlineRegular', 14)),
          E(MarqueeTitle, {
            key: 'name',
            className: 'dws-title',
            title,
            onDoubleClick: (event) => {
              event.preventDefault()
              event.stopPropagation()
              dialogs.openDialog({ kind: 'rename-session', id: sessionId, draft: title })
            },
          }, title),
          total === undefined ? null : tokenBadge('tokens', total, view.models || {}, t('overview.sessionTokens')),
          E('span', { key: 'actions', className: 'dws-rowActions', onClick: (event) => event.stopPropagation(), style: { opacity: 1 } }, [
            // Rendered as a component, never called as a function: `RowMenu` owns
            // hooks, and calling it inline would fold them into this page's hook list,
            // so the row count would change the hook count (React error #300).
            E(RowMenu, {
              key: 'menu',
              label: t('browser.more'),
              menuLabel: title,
              items: [
                { id: 'open', label: t('overview.open'), icon: icon('IconRightUpOutlineRegular', 16) },
                {
                  id: 'rename',
                  label: t('browser.rename'),
                  icon: icon('IconEditOutlineRegular', 16),
                  shortcut: overviewShortcutOf('session.rename'),
                },
                { id: 'fork', label: t('browser.fork'), icon: icon('IconBranchOutlineRegular', 16), shortcut: overviewShortcutOf('session.fork') },
                {
                  id: 'pin',
                  label: pinned ? t('browser.unpin') : t('browser.pin'),
                  icon: icon(pinned ? 'IconPinFillRegular' : 'IconPinOutlineRegular', 16),
                },
                {
                  id: archived ? 'unarchive' : 'archive',
                  label: archived ? t('browser.unarchive') : t('browser.archive'),
                  icon: icon(archived ? 'IconUnarchiveOutlineRegular' : 'IconArchiveOutlineRegular', 16),
                  shortcut: overviewShortcutOf('session.archive'),
                },
              ],
              onSelect: (id) => {
                let work
                if (id === 'open') work = services.openSession(sessionId)
                else if (id === 'rename') work = dialogs.openDialog({ kind: 'rename-session', id: sessionId, draft: title })
                else if (id === 'fork') work = services.forkSession(sessionId)
                else if (id === 'pin') work = pinned ? services.unpin(sessionId) : services.pin(sessionId)
                else if (id === 'unarchive') work = services.unarchive(sessionId)
                else if (id === 'archive') work = services.archive(sessionId)
                Promise.resolve(work).catch((reason) => warn('overview action failed', reason))
              },
            }),
          ]),
        ])
        // Turns hang under their session as their own indented rows (a hierarchy,
        // not a row of numbers) and carry no token figure: the token total belongs
        // to the session row, which is where the requirement pins it.
        const turnRows = settings.showTurns !== true || turns.length === 0
          ? []
          : turns.slice(-TURN_ROW_LIMIT).map((entry) => E('div', {
            key: 'ov-turn:' + sessionId + ':' + String(entry[0]),
            className: 'dws-turnRow',
            style: { '--suite-indent': String((depth + 1) * 12) + 'px' },
            role: 'treeitem',
            'aria-level': depth + 1,
            // The tooltip carries this turn's prompt in full, not just its number.
            title: promptOf(entry[0]).length === 0 ? t('overview.turn', { n: entry[0] }) : promptOf(entry[0]),
            onClick: (event) => {
              event.preventDefault()
              jumpToTurn(sessionId, entry[0])
            },
          }, [
            E('span', { key: 'index', className: 'dws-turnIndex' }, '#' + String(entry[0])),
            E('span', { key: 'label', className: 'dws-turnTitle' }, (() => {
              const prompt = promptOf(entry[0])
              return prompt.length === 0 ? t('overview.turn', { n: entry[0] }) : prompt
            })()),
          ]))
        return [row, ...turnRows]
      }

      /** How many turn rows one session may draw before the list stops growing. */
      const TURN_ROW_LIMIT = 60

      const renderWorkspace = (workspace, depth) => {
        const children = tree.childrenOf.get(workspace.workspaceId) || []
        const selfIds = sessionIdsOf([workspace.workspaceId])
        let selfTotal = 0
        let selfFound = false
        const selfModels = {}
        for (const id of selfIds) {
          const view = usageOf(id)
          if (view === undefined) continue
          selfFound = true
          selfTotal += sumBuckets(view.totals)
          for (const [model, buckets] of Object.entries(view.models || {})) selfModels[model] = addBuckets(selfModels[model], buckets)
        }
        const customTitle = typeof workspace.title === 'string' ? workspace.title.trim() : ''
        const hasRemark = customTitle.length > 0 && customTitle !== baseName(workspace.path)
        const head = E('div', {
          key: 'ov-ws:' + workspace.workspaceId,
          // Same row shape as the workspace list; the requirement asks the
          // overview for the fully expanded hierarchy, so the folder is open.
          className: 'dws-wsRow',
          style: { '--suite-indent': String(depth * 12) + 'px' },
          role: 'treeitem',
          'aria-expanded': 'true',
        }, [
          E('span', { key: 'folder', className: 'dws-folderIcon' }, icon('IconFolderOpenRegular', 16)),
          E(MarqueeTitle, {
            key: 'name',
            className: 'dws-title dws-title--workspace',
            title: workspace.path,
            onDoubleClick: (event) => {
              event.preventDefault()
              event.stopPropagation()
              dialogs.openDialog({
                kind: 'rename-workspace',
                id: workspace.workspaceId,
                draft: customTitle.length > 0 ? customTitle : baseName(workspace.path),
              })
            },
          }, workspaceTitle(workspace, t('browser.folder'))),
          hasRemark ? E('span', { key: 'original', className: 'dws-original' }, baseName(workspace.path)) : null,
          selfFound ? tokenBadge('tokens', selfTotal, selfModels, t('overview.selfTokens')) : null,
          E('span', { key: 'actions', className: 'dws-rowActions', style: { opacity: 1 }, onClick: (event) => event.stopPropagation() }, [
            IconButton({
              key: 'new',
              label: t('browser.newSessionIn'),
              iconName: 'IconNewChatOutlineRegular',
              size: 14,
              onClick: () => {
                Promise.resolve(services.startSession(workspace.workspaceId)).catch((reason) => warn('start session failed', reason))
              },
            }),
            E(RowMenu, {
              key: 'menu',
              label: t('browser.more'),
              menuLabel: workspaceTitle(workspace, t('browser.folder')),
              items: [
                { id: 'focus', label: t('overview.pick'), icon: icon('IconDataOutlineRegular', 16) },
                {
                  id: 'new',
                  label: t('browser.newSessionIn'),
                  icon: icon('IconNewChatOutlineRegular', 16),
                  shortcut: overviewShortcutOf('session.new'),
                },
                { id: 'rename', label: t('browser.renameWorkspace'), icon: icon('IconEditOutlineRegular', 16) },
                { id: 'delete', label: t('browser.deleteWorkspace'), icon: icon('IconTrashOutlineRegular', 16), danger: true },
              ],
              onSelect: (id) => {
                if (id === 'focus') setRootId(workspace.workspaceId)
                else if (id === 'new') Promise.resolve(services.startSession(workspace.workspaceId)).catch((reason) => warn('start session failed', reason))
                else if (id === 'rename') {
                  dialogs.openDialog({
                    kind: 'rename-workspace',
                    id: workspace.workspaceId,
                    draft: customTitle.length > 0 ? customTitle : baseName(workspace.path),
                  })
                } else if (id === 'delete') {
                  dialogs.openDialog({
                    kind: 'delete-workspace',
                    id: workspace.workspaceId,
                    name: workspaceTitle(workspace, t('browser.folder')),
                  })
                }
              },
            }),
          ]),
        ])
        const rows = [head]
        for (const id of selfIds) {
          // Each session contributes its own row plus one nested row per turn.
          const produced = renderSession(id, depth + 1)
          if (Array.isArray(produced)) rows.push(...produced.filter((entry) => entry !== null))
          else if (produced !== null) rows.push(produced)
        }
        for (const child of children) rows.push(...renderWorkspace(child, depth + 1))
        return rows
      }

      const header = E('div', { className: 'dws-pageHeader' }, [
        E('div', { key: 'heading', className: 'dws-pageHeading' }, [
          E('div', { key: 'titleRow', className: 'dws-pageTitleRow' }, [
            E('span', { key: 'icon', className: 'dws-folderIcon dws-folderIcon--active' }, icon('IconFolderOpenRegular', 20)),
            E('h2', { key: 'title', className: 'dws-pageTitle' },
              root === undefined ? t('overview.title') : workspaceTitle(root, t('browser.folder'))),
            root === undefined ? null : tokenBadge('total', sumBuckets(subtreeUsage.totals), subtreeUsage.models, t('overview.totalTokens')),
          ]),
          E('div', { key: 'path', className: 'dws-pagePath dws-muted' }, root === undefined ? '' : root.path),
          E('div', { key: 'note', className: 'dws-pagePath dws-muted' }, [
            t('overview.totalTokens') + ': ' + formatCount(sumBuckets(subtreeUsage.totals)),
            missing > 0 ? ' \u00B7 ' + t('overview.stats.partial') : '',
            degraded ? ' \u00B7 ' + t('overview.stats.fallback') : '',
          ].join('')),
        ]),
        E('div', { key: 'actions', style: { display: 'flex', gap: '8px', flexShrink: 0 } }, [
          tree.roots.length === 0 ? null : E(RowMenu, {
            key: 'root',
            label: t('overview.pick'),
            side: 'bottom',
            triggerIcon: 'IconWorkspaceTreeOutlineRegular',
            triggerLabel: root === undefined ? t('overview.pick') : workspaceTitle(root, t('browser.folder')),
            items: tree.roots.map((workspace) => ({
              id: workspace.workspaceId,
              label: workspaceTitle(workspace, t('browser.folder')),
            })),
            onSelect: (value) => setRootId(value),
          }),
          E(SuiteButton, {
            key: 'refresh',
            onClick: () => {
              setWarmTicket((value) => value + 1)
            },
          }, t('overview.refresh')),
        ]),
      ])

      /**
       * The dependencies/environment card. Every figure comes from the top level only:
       * the listed child directories plus the probed files.
       */
      const renderEnvCard = () => {
        if (settings.showEnv !== true || env === null) return null
        const head = (extra) => E('div', { key: 'head', className: 'dws-cardHead' }, [
          E('h3', { key: 'title', className: 'dws-cardTitle' }, t('overview.env.title')),
          extra === undefined ? null : extra,
        ])
        if (env.status === 'loading') {
          return E('div', { key: 'env', className: 'dws-card' }, [
            head(),
            E('div', { key: 'loading', className: 'dws-muted' }, t('overview.env.loading')),
          ])
        }
        if (env.status === 'error') {
          return E('div', { key: 'env', className: 'dws-card' }, [
            head(),
            E('div', { key: 'error', className: 'dws-muted' }, t('overview.env.error', { message: env.message })),
          ])
        }
        const dirs = Array.isArray(env.dirs) ? env.dirs.slice() : []
        const notable = ['.git', '.github', 'node_modules', 'src', 'test', 'tests', 'dist', 'build', 'docs', 'scripts', 'deploy', 'coverage']
        const shown = dirs.sort((left, right) => {
          const rank = (name) => {
            const index = notable.indexOf(name.toLowerCase())
            return index === -1 ? notable.length : index
          }
          const gap = rank(left) - rank(right)
          return gap !== 0 ? gap : left.localeCompare(right)
        }).slice(0, 12)
        const pkg = env.pkg
        const facts = []
        if (pkg === null) {
          facts.push(E('span', { key: 'pkgNone', className: 'dws-muted' }, t('overview.env.pkgMissing')))
        } else if (pkg.parseError === true) {
          facts.push(E('span', { key: 'pkgBad', className: 'dws-muted' }, t('overview.env.parseError')))
        } else {
          facts.push(E('span', { key: 'pkgName', className: 'dws-statValue' },
            (pkg.name.length > 0 ? pkg.name : t('overview.env.unnamed')) + (pkg.version.length > 0 ? '@' + pkg.version : '')))
          facts.push(E('span', { key: 'pkgManager', className: 'dws-chip' },
            t('overview.env.manager') + ': ' + (pkg.packageManager.length > 0 ? pkg.packageManager : t('overview.env.managerNone'))))
          facts.push(E('span', { key: 'pkgScripts', className: 'dws-chip' }, t('overview.env.scripts') + ': ' + String(pkg.scripts)))
          facts.push(E('span', { key: 'pkgDeps', className: 'dws-chip' },
            t('overview.env.deps') + ': ' + String(pkg.dependencies) + ' / ' + String(pkg.devDependencies)))
          if (pkg.moduleType.length > 0) {
            facts.push(E('span', { key: 'pkgType', className: 'dws-chip' }, 'type: ' + pkg.moduleType))
          }
          const engines = enginesSummary(pkg.engines)
          if (engines.length > 0) {
            facts.push(E('span', { key: 'pkgEngines', className: 'dws-chip' }, t('overview.env.engines') + ': ' + engines))
          }
        }
        const chips = (Object.keys(env.probes === undefined ? {} : env.probes)).map((name) => E('span', {
          key: 'probe:' + name,
          className: 'dws-chip ' + (env.probes[name] === true ? 'dws-chip--on' : 'dws-chip--off'),
        }, name))
        return E('div', { key: 'env', className: 'dws-card' }, [
          head(),
          E('div', { key: 'dirs', className: 'dws-cardHead' }, [
            E('span', { key: 'label', className: 'dws-statLabel' },
              t('overview.env.dirs') + ': ' + String(dirs.length)),
            E('div', { key: 'row', className: 'dws-chipRow' }, dirs.length === 0
              ? E('span', { className: 'dws-muted' }, '\u2014')
              : shown.map((name) => E('span', { key: 'dir:' + name, className: 'dws-chip', title: name }, name))),
          ]),
          E('div', { key: 'facts', className: 'dws-statRow' }, facts),
          E('div', { key: 'probes', className: 'dws-cardHead' }, [
            E('span', { key: 'label', className: 'dws-statLabel' }, t('overview.env.probes')),
            E('div', { key: 'row', className: 'dws-chipRow' }, chips),
          ]),
        ])
      }

      // Scroll on the body, centre the cards in a 960px column: the same shape
      // the shipped entry pages use, so the panel cannot rely on a parent height.
      const body = E('div', { className: 'dws-pageBody' }, [E('div', { key: 'inner', className: 'dws-pageInner' }, [
        // A workspace with no session still says so instead of rendering nothing.
        sessionIdsOf(subtreeIds).length === 0
          ? E('div', { key: 'empty', className: 'dws-card dws-empty' }, t('overview.empty'))
          : null,
        // Each card carries its own boundary: one section that cannot render must not
        // take the page (or the workspace switch that led here) down with it.
        E(QuietBoundary, {
          key: 'envBoundary',
          fallback: () => E('div', { className: 'dws-card dws-empty' }, t('overview.failed')),
        }, renderEnvCard()),
        E(QuietBoundary, { key: 'treeBoundary', fallback: () => E('div', { className: 'dws-card dws-empty' }, t('overview.failed')) },
          E('div', { key: 'tree', className: 'dws-card' }, [
            E('div', { key: 'head', className: 'dws-cardHead' }, [
              E('h3', { key: 'title', className: 'dws-cardTitle' }, t('overview.tree.title')),
            ]),
            ...(root === undefined ? [E('div', { key: 'empty', className: 'dws-empty' }, t('overview.tree.empty'))] : renderWorkspace(root, 0)),
          ])),
        // Only a README that actually read shows a card; otherwise the section is
        // absent rather than an empty frame.
        settings.readme === true && readme !== null ? E('div', { key: 'readme', className: 'dws-card' }, [
          E('div', { key: 'head', className: 'dws-cardHead' }, [
            E('h3', { key: 'title', className: 'dws-cardTitle' }, t('overview.readme')),
            root === undefined ? null : E('span', { key: 'path', className: 'dws-muted', style: { fontSize: '12px' } }, normalizePath(root.path) + '/README.md'),
          ]),
          readmeError !== null
            ? E('div', { key: 'error', className: 'dws-readme dws-readme--empty' }, readmeError)
            : readme === null
              ? E('div', { key: 'loading', className: 'dws-readme dws-readme--empty' }, t('common.loading'))
              : E('div', {
                key: 'body',
                style: settings.readmeMaxHeightPct === undefined
                  ? undefined
                  : { maxHeight: 'calc(' + String(Math.min(90, Math.max(15, Number(settings.readmeMaxHeightPct) || 45))) + ' * 1vh)' },
              }, E(SuiteMarkdown, { text: readme, t })),
        ]) : null,
      ])])

      // A failure anywhere in the page degrades to a notice instead of the blank
      // white pane that a swallowed throw used to leave behind (and which then
      // persisted after switching to another workspace).
      return E(QuietBoundary, {
        fallback: () => E('div', { className: 'dws-page', 'data-panel': panelKey }, [
          header,
          E('div', { className: 'dws-pageBody' }, E('div', { className: 'dws-pageInner' },
            E('div', { className: 'dws-card dws-empty' }, t('overview.failed')))),
        ]),
      }, E('div', { className: 'dws-page', 'data-panel': panelKey }, [
        header,
        body,
        dialogs.element,
      ]))
    }

    /** The sidebar panel-list icon for the overview page. */
    function OverviewPanelIcon(props) {
      const size = props !== undefined && typeof props.size === 'number' ? props.size : 16
      return icon('IconGaugeOutlineRegular', size) || E('span', { 'aria-hidden': true }, '\u25A6')
    }

    /* ========================== settings card ============================== */

    /** One settings row: label, hint and a control on the right. */
    function SettingRow({ label, hint, children }) {
      return E('div', { className: 'dws-settingRow' }, [
        E('div', { key: 'text', className: 'dws-settingText' }, [
          E('span', { key: 'label', className: 'dws-settingLabel' }, label),
          hint === undefined || hint === null ? null : E('span', { key: 'hint', className: 'dws-settingHint' }, hint),
        ]),
        E('div', { key: 'control', className: 'dws-settingControl' }, children),
      ])
    }

    /**
     * The Plugins-panel configuration card for this bundle
     * (`plugins.bundle.config`, keyed by the package name). Every control
     * writes straight into the settings store, so there is no staged draft.
     */
    function WorkspaceSuiteSettings({ t, view }) {
      const settings = useSettings()
      if (view === 'summary') {
        return E('div', { className: 'dws-settingHint' }, t('settings.description'))
      }
      const modules = [
        { key: 'modulePicker', label: t('settings.module.picker'), hint: t('settings.module.picker.hint') },
        { key: 'moduleTree', label: t('settings.module.tree'), hint: t('settings.module.tree.hint') },
        { key: 'moduleOverview', label: t('settings.module.overview'), hint: t('settings.module.overview.hint') },
      ]
      return E('div', { className: 'dws-settings' }, [
        E('div', { key: 'description', className: 'dws-settingHint' }, t('settings.description')),
        E('div', { key: 'modules', className: 'dws-settingsGroup' }, [
          E('h4', { key: 'title', className: 'dws-settingsGroupTitle' }, t('settings.modules')),
          ...modules.map((entry) => E(SettingRow, {
            key: entry.key,
            label: entry.label,
            hint: entry.hint,
          }, E(SuiteSwitch, {
            checked: settings[entry.key] === true,
            label: entry.label,
            onChange: (value) => writeSetting(entry.key, value),
          }))),
        ]),
        E('div', { key: 'options', className: 'dws-settingsGroup' }, [
          E('h4', { key: 'title', className: 'dws-settingsGroupTitle' }, t('settings.options')),
          E(SettingRow, {
            key: 'treeMaxHeightPct',
            label: t('settings.treeMaxHeight'),
            hint: t('settings.treeMaxHeight.hint'),
          }, E(SuiteNumber, {
            value: settings.treeMaxHeightPct,
            min: 20,
            max: 100,
            step: 5,
            label: t('settings.treeMaxHeight'),
            suffix: '%',
            onChange: (value) => writeSetting('treeMaxHeightPct', value),
          })),
          E(SettingRow, {
            key: 'treeScroll',
            label: t('settings.treeScroll'),
          }, E(SuiteSwitch, {
            checked: settings.treeScroll === true,
            label: t('settings.treeScroll'),
            onChange: (value) => writeSetting('treeScroll', value),
          })),
          E(SettingRow, {
            key: 'collapseAllByDefault',
            label: t('settings.collapseAllByDefault'),
          }, E(SuiteSwitch, {
            checked: settings.collapseAllByDefault === true,
            label: t('settings.collapseAllByDefault'),
            onChange: (value) => writeSetting('collapseAllByDefault', value),
          })),
          E(SettingRow, {
            key: 'pickerDepth',
            label: t('settings.pickerDepth'),
          }, E(SuiteNumber, {
            value: settings.pickerDepth,
            min: 0,
            max: 4,
            step: 1,
            label: t('settings.pickerDepth'),
            suffix: '',
            onChange: (value) => writeSetting('pickerDepth', value),
          })),
          E(SettingRow, {
            key: 'showTokens',
            label: t('settings.showTokens'),
            hint: t('settings.showTokens.hint'),
          }, E(SuiteSwitch, {
            checked: settings.showTokens === true,
            label: t('settings.showTokens'),
            onChange: (value) => writeSetting('showTokens', value),
          })),
          E(SettingRow, {
            key: 'showTurns',
            label: t('settings.showTurns'),
            hint: t('settings.turns.hint'),
          }, E(SuiteSwitch, {
            checked: settings.showTurns === true,
            label: t('settings.showTurns'),
            onChange: (value) => writeSetting('showTurns', value),
          })),
          E(SettingRow, {
            key: 'includeArchived',
            label: t('settings.includeArchived'),
          }, E(SuiteSwitch, {
            checked: settings.includeArchived === true,
            label: t('settings.includeArchived'),
            onChange: (value) => writeSetting('includeArchived', value),
          })),
          E(SettingRow, {
            key: 'includeSubagent',
            label: t('settings.includeSubagent'),
          }, E(SuiteSwitch, {
            checked: settings.includeSubagent === true,
            label: t('settings.includeSubagent'),
            onChange: (value) => writeSetting('includeSubagent', value),
          })),
          E(SettingRow, {
            key: 'readme',
            label: t('settings.readme'),
          }, E(SuiteSwitch, {
            checked: settings.readme === true,
            label: t('settings.readme'),
            onChange: (value) => writeSetting('readme', value),
          })),
          E(SettingRow, {
            key: 'showEnv',
            label: t('settings.showEnv'),
          }, E(SuiteSwitch, {
            checked: settings.showEnv === true,
            label: t('settings.showEnv'),
            onChange: (value) => writeSetting('showEnv', value),
          })),
          E(SettingRow, {
            key: 'readmeMaxHeightPct',
            label: t('settings.readmeMaxHeight'),
            hint: t('settings.readmeMaxHeight.hint'),
          }, E(SuiteNumber, {
            value: settings.readmeMaxHeightPct,
            min: 15,
            max: 90,
            step: 5,
            label: t('settings.readmeMaxHeight'),
            suffix: '%',
            onChange: (value) => writeSetting('readmeMaxHeightPct', value),
          })),
        ]),
        E('div', { key: 'actions', style: { display: 'flex', justifyContent: 'flex-end' } },
          E(SuiteButton, { onClick: resetSettings }, t('settings.reset'))),
      ])
    }

    /* ============================ registration ============================= */

    const PANEL_ID = 'workspace-suite.overview'

    /** Services the client half requires; `slots` and `locale` are mandatory. */
    /**
     * Required client services. A remote namespace must be named entry by entry:
     * reading `remote.<namespace>` on the context proxy throws
     * `cannot get property "remote.<name>" without inject`, which is exactly how
     * an activation once failed here (`ui-workspace` declares
     * `remote.directoryPicker` for the same reason).
     */
    const inject = ['slots', 'locale', 'remote.workspaceFiles']

    /** Wrap one registrable in the quiet boundary so a crash stays local. */
    const seat = (Component) => bounded(Component)

    /** Read a numeric setting with a floor and a ceiling. */
    const settingNumber = (settings, key, min, max, fallback) => {
      const value = Number(settings[key])
      if (!Number.isFinite(value)) return fallback
      return Math.min(max, Math.max(min, Math.round(value)))
    }

    /**
     * Split the session-controller result envelope into a value or a rejection.
     * `sessions.*` answers `{ ok, value }` / `{ ok, error }` on this build.
     */
    function unwrap(result, label) {
      if (result !== null && typeof result === 'object' && typeof result.ok === 'boolean') {
        if (result.ok === false) {
          const message = result.error === undefined || result.error === null ? label : result.error.message
          throw new Error(message === undefined ? label : message)
        }
        return result.value
      }
      return result
    }

    /**
     * Client plugin body: dictionaries, styles, the picker occupants, the
     * sidebar takeover, the overview panel and the settings card. Registrations
     * are rebuilt whenever a module switch changes, so the settings card takes
     * effect without a reload.
     *
     * @param ctx - client root context.
     */
    function apply(ctx) {
      try {
      const slots = serviceOf(ctx, 'slots')
      const locale = serviceOf(ctx, 'locale')
      if (slots === undefined || locale === undefined) {
        warn('slots/locale service missing; plugin idle')
        return
      }
      // `let`, not `const`: a cold boot can run this before the workspace/layout
      // services exist, and a reference captured once would then stay undefined for
      // the whole session — the list still rendered, but "open session" and "open
      // overview" silently did nothing until the plugin was reloaded by hand.
      let sessions = serviceOf(ctx, 'sessions')
      let workspaces = serviceOf(ctx, 'workspaces')
      let uiWorkspace = serviceOf(ctx, 'uiWorkspace')
      let layout = serviceOf(ctx, 'layout')
      let remote = serviceOf(ctx, 'remote')

      /**
       * Re-resolve anything that was still missing when apply ran. Every method in
       * the service face closes over these bindings, so one refresh heals all of
       * them, and the boot record keeps the evidence.
       */
      const refreshServices = () => {
        if (sessions === undefined) sessions = serviceOf(ctx, 'sessions')
        if (workspaces === undefined) workspaces = serviceOf(ctx, 'workspaces')
        if (uiWorkspace === undefined) uiWorkspace = serviceOf(ctx, 'uiWorkspace')
        if (layout === undefined) layout = serviceOf(ctx, 'layout')
        if (remote === undefined) remote = serviceOf(ctx, 'remote')
        if (workspaceFiles === undefined) {
          try {
            workspaceFiles = remote === undefined || remote === null ? undefined : remote.workspaceFiles
          } catch {
            workspaceFiles = undefined
          }
        }
        return { sessions, workspaces, uiWorkspace, layout, remote }
      }
      reportBoot('services-at-apply', {
        sessions: sessions !== undefined,
        workspaces: workspaces !== undefined,
        uiWorkspace: uiWorkspace !== undefined,
        layout: layout !== undefined,
        remote: remote !== undefined,
      })
      reportBoot('apply-enter', {
        slots: slots !== undefined,
        locale: locale !== undefined,
        sessions: sessions !== undefined,
        workspaces: workspaces !== undefined,
        uiWorkspace: uiWorkspace !== undefined,
        layout: layout !== undefined,
        remote: remote !== undefined,
      })
      ctx.effect(() => installStyles(), 'workspace-suite: styles')
      ctx.effect(() => {
        const dispose = locale.register(NS, { zh, en })
        return typeof dispose === 'function' ? dispose : () => {}
      }, 'workspace-suite: dictionaries')

      // `bind` must follow the dictionary registration, and a namespace a host
      // build refuses to bind yet must degrade to a retrying lookup instead of
      // freezing raw keys into every label.
      let t
      try {
        t = locale.bind(NS)
      } catch (error) {
        warn('locale binding deferred', error)
        let cached = null
        t = (key, params) => {
          if (cached === null) {
            try {
              cached = locale.bind(NS)
            } catch {
              cached = (onlyKey) => onlyKey
            }
          }
          return cached(key, params)
        }
      }

      // The profile's config scope keeps the same values outside this browser.
      ctx.inject(['configForms'], (scope) => {
        try {
          if (scope.configForms !== undefined && typeof scope.configForms.get === 'function') {
            const form = scope.configForms.get(PKG)
            if (form !== undefined && form !== null) attachSettingsScope(form)
          }
        } catch (error) {
          warn('configForms binding failed', error)
        }
      })

      // Defense in depth: the namespace is declared above, but a composition
      // without it must degrade the README pane, never take the activation down.
      let workspaceFiles
      try {
        workspaceFiles = remote === undefined || remote === null ? undefined : remote.workspaceFiles
      } catch (error) {
        reportBoot('remote-namespace-unavailable', String(error && error.message ? error.message : error))
        workspaceFiles = undefined
      }

      const services = {
        sessions,
        workspaces,
        slots,
        bindLocale: (namespace) => (namespace === undefined || namespace === null ? t : locale.bind(namespace)),
        openSession: (sessionId) => {
          refreshServices()
          if (uiWorkspace !== undefined && typeof uiWorkspace.openSession === 'function') uiWorkspace.openSession(sessionId)
          else reportBoot('openSession-unavailable', { sessionId })
        },
        openWorkspace: (workspaceId) => boundCall(uiWorkspace, 'openWorkspace', workspaceId),
        startSession: (workspaceId) => boundCall(uiWorkspace, 'startSession', workspaceId),
        forkSession: (sessionId) => boundCall(uiWorkspace, 'forkSession', sessionId),
        pin: (sessionId) => boundCall(uiWorkspace, 'pinSession', sessionId),
        unpin: (sessionId) => boundCall(uiWorkspace, 'unpinSession', sessionId),
        archive: (sessionId) => boundCall(uiWorkspace, 'archiveSession', sessionId),
        unarchive: (sessionId) => boundCall(uiWorkspace, 'unarchiveSession', sessionId),
        renameWorkspace: (workspaceId, title) => boundCall(workspaces, 'rename', workspaceId, title),
        deleteWorkspace: (workspaceId) => boundCall(workspaces, 'delete', workspaceId),
        createWorkspace: (input) => boundCall(workspaces, 'create', input),
        renameSession: (sessionId, title) => boundCall(sessions, 'using', sessionId, { source: 'workspaceOperation' },
          (reference) => reference.binding.session.rename(title)).then((result) => unwrap(result, 'rename failed')),
        searchSessions: (query, signal) => boundCall(sessions, 'search', query, signal)
          .then((result) => unwrap(result, 'search failed')),
        listDirectory: (path, signal) => {
          if (uiWorkspace === undefined || typeof uiWorkspace.listDirectory !== 'function') {
            return Promise.reject(new Error('directory listing unavailable (compose a directory-picker browse backend)'))
          }
          return Promise.resolve(uiWorkspace.listDirectory(path, signal))
        },
        createDirectory: (path, name) => boundCall(uiWorkspace, 'createDirectory', path, name),
        // The OS folder dialog, when the mounted picker backend offers one: the
        // browse backend (which this bundle pins for in-app listing) has listing but
        // no pick, so callers feature-detect and hide the entry when it rejects.
        pickDirectory: (uiWorkspace !== undefined && typeof uiWorkspace.pickDirectory === 'function'
          ? () => Promise.resolve(uiWorkspace.pickDirectory())
          : undefined),
        readWorkspaceItems: () => (workspaces !== undefined && workspaces.list !== undefined
          && typeof workspaces.list.getSnapshot === 'function'
          ? (workspaces.list.getSnapshot().items || [])
          : []),
        refreshProjections: sessions !== undefined && typeof sessions.refreshProjections === 'function'
          ? (ids) => {
            // The controller refreshes one session per call; walk the list with
            // four concurrent lanes so a wide subtree stays bounded.
            const queue = Array.isArray(ids) ? ids.slice(0, 200) : [ids]
            const lane = (offset) => {
              const walk = (index) => {
                if (index >= queue.length) return Promise.resolve(undefined)
                return Promise.resolve(sessions.refreshProjections(queue[index]))
                  .catch(() => undefined)
                  .then(() => walk(index + 4))
              }
              return walk(offset)
            }
            return Promise.all([0, 1, 2, 3].map(lane)).then(() => undefined)
          }
          : undefined,
        readFile: (sessionId, path) => {
          if (workspaceFiles === undefined || typeof workspaceFiles.read !== 'function') {
            return Promise.reject(new Error('workspaceFiles remote unavailable'))
          }
          return Promise.resolve(workspaceFiles.read(sessionId, path, { offset: 1, limit: 5000 }))
            .then((page) => {
              const value = unwrap(page, 'read failed')
              return value !== null && typeof value === 'object' && typeof value.text === 'string' ? value.text : ''
            })
        },
        openOverview: (workspaceId) => {
          requestOverview(workspaceId)
          refreshServices()
          if (layout !== undefined && typeof layout.selectPanel === 'function') layout.selectPanel(PANEL_ID)
          else reportBoot('openOverview-unavailable', { workspaceId })
        },
      }

      /**
       * A cold boot can run apply before the workspace/layout services exist, and the
       * face captured the missing ones as `undefined` forever — which is what made the
       * picker open with "directory listing unavailable" until the plugin was reloaded.
       * Expose the mutable entries as live getters and give every method a refresh
       * prologue, so the first call heals the whole face.
       */
      for (const name of ['sessions', 'workspaces']) {
        Object.defineProperty(services, name, {
          enumerable: true,
          configurable: true,
          get: () => refreshServices()[name],
        })
      }
      Object.defineProperty(services, 'slots', { enumerable: true, configurable: true, get: () => slots })
      for (const key of Object.keys(services)) {
        const original = services[key]
        if (typeof original !== 'function') continue
        services[key] = (...args) => {
          refreshServices()
          return original(...args)
        }
      }

      /**
       * Capture one registration's own disposer. `slots.register` is the only
       * value whose disposal semantics this plugin owns: the value an
       * `slots.inject` call returns is left to the fiber, so it is never called
       * here (an unexpected non-disposer there would re-register, not unregister).
       */
      let canRebuild = true
      const capture = (value) => {
        if (typeof value === 'function') return value
        if (value !== null && typeof value === 'object' && typeof value.dispose === 'function') return () => value.dispose()
        return null
      }

      let activeDisposers = []
      let rejectedCount = 0
      const attemptedKeys = []
      const registerIn = (key, options, Component) => {
        attemptedKeys.push(key)
        try {
          slots.inject(key, () => {
            try {
              const registration = slots.register(options, seat(Component))
              const dispose = capture(registration)
              if (dispose === null) canRebuild = false
              else activeDisposers.push(dispose)
              return registration
            } catch (error) {
              // A rejected seat must cost that one seat, never the activation.
              canRebuild = false
              rejectedCount += 1
              reportBoot('register-rejected', { key, error: String(error && error.message ? error.message : error) })
              try {
                console.error('[workspace-suite] registration rejected for ' + String(key), error)
              } catch {
                /* console may be unavailable */
              }
              return undefined
            }
          })
        } catch (error) {
          canRebuild = false
          rejectedCount += 1
          reportBoot('inject-rejected', { key, error: String(error && error.message ? error.message : error) })
          try {
            console.error('[workspace-suite] inject rejected for ' + String(key), error)
          } catch {
            /* console may be unavailable */
          }
        }
      }

      /** Register the picker into both directory-flow holes, shadowing the shipped dialog. */
      const registerPicker = () => {
        const face = () => ({
          t,
          mode: 'add',
          listDirectory: services.listDirectory,
          createDirectory: services.createDirectory,
          createWorkspace: services.createWorkspace,
          renameWorkspace: services.renameWorkspace,
          readWorkspaceItems: services.readWorkspaceItems,
          startSession: services.startSession,
        })
        registerIn('conversation.hero.workspace.directoryFlow', {
          name: 'conversation.hero.workspace.directoryFlow',
          priority: -1,
          locale: NS,
          inject: face,
        }, DirectoryExplorer)
        registerIn('sidebar.workspaces.directoryFlow', {
          name: 'sidebar.workspaces.directoryFlow',
          priority: -1,
          locale: NS,
          inject: face,
        }, DirectoryExplorer)
      }

      /**
       * The conversation window's workspace menu, shadowed so its history lists
       * root-level workspaces only and a workspace with children asks which one the
       * conversation starts in. It declares no children of its own: a shadowing entry
       * may not redeclare the shadowed entry's holes, and the shipped declaration of
       * `conversation.hero.workspace.directoryFlow` stays in force.
       */
      const registerHeroPicker = () => {
        registerIn('conversation.hero.workspace', {
          name: 'conversation.hero.workspace',
          priority: -1,
          locale: NS,
          // The menu's add entry must work even when a shadowing occupant is handed no
          // `renderSlot`, so the picker's own services travel with the registration.
          inject: () => ({
            t,
            mode: 'add',
            listDirectory: services.listDirectory,
            createDirectory: services.createDirectory,
            createWorkspace: services.createWorkspace,
            renameWorkspace: services.renameWorkspace,
            readWorkspaceItems: services.readWorkspaceItems,
            startSession: services.startSession,
          }),
        }, HeroWorkspacePicker)
      }

      /** Take over the sidebar workspace list below every shipped entry's priority. */
      const registerBrowser = () => {
        registerIn('sidebar.workspaces', {
          name: 'sidebar.workspaces',
          priority: -100,
          locale: NS,
          inject: () => ({ services }),
        }, SuiteWorkspaceBrowser)
      }

      /**
       * The overview panel. Reached from a workspace row's "More" menu, so it
       * registers no `sidebar.panellist` entry: the panel is a destination of the
       * workspace list, not a second standalone place beside it.
       */
      const registerOverview = () => {
        // Its own boundary: an error thrown while the page (or a child) renders must
        // show a notice, never the blank pane the registration-level boundary leaves.
        // The message also goes into the on-disk boot record, so a later failure can
        // be read back instead of guessed at.
        const guarded = (props) => {
          // The target's sequence number changes on every overview request: it is both
          // the reset key (so one failed render cannot stick) and the remount key (so
          // per-workspace state never leaks from the page that was open before).
          const target = overviewTargetStore.getSnapshot()
          const seq = target === null || target === undefined ? 0 : target.seq
          const translate = typeof props.t === 'function' ? props.t : (key) => key
          return E(QuietBoundary, {
            resetKey: seq,
            fallback: (message) => E('div', { className: 'dws-page', 'data-panel': PANEL_ID, 'data-overview-seq': String(seq) },
              E('div', { className: 'dws-pageBody' },
                E('div', { className: 'dws-pageInner' },
                  E('div', { className: 'dws-card dws-empty' }, [
                    E('div', { key: 'text' }, translate('overview.failed')),
                    // The message is shown, not only recorded: a failure the user can
                    // read is a failure we can act on.
                    E('div', {
                      key: 'detail',
                      className: 'dws-muted',
                      style: { marginTop: '6px', fontSize: '12px', overflowWrap: 'anywhere' },
                    }, String(message === null || message === undefined ? '' : message)),
                  ])))),
            onError: (error) => reportBoot('overview-failed', String(error === null || error === undefined
              ? 'unknown'
              : (error.message === undefined ? error : error.message))),
          }, E(SuiteOverview, Object.assign({ key: 'overview:' + String(seq) }, props)))
        }
        registerIn('main', {
          name: 'main',
          key: PANEL_ID,
          locale: NS,
          inject: () => ({ services, panelKey: PANEL_ID }),
        }, guarded)
      }

      /**
       * The settings card. The bundle page seat is the primary one; the row seat
       * is registered too so the row also carries a native **Configure** control
       * (a build that declares only one of the two keyed slots still shows the
       * form, and the reader never has to guess where it lives).
       */
      const registerSettings = () => {
        registerIn('plugins.bundle.config', {
          name: 'plugins.bundle.config',
          key: PKG,
          locale: NS,
        }, WorkspaceSuiteSettings)
        registerIn('plugins.row.config', {
          name: 'plugins.row.config',
          key: PKG + '#workspace-suite',
          locale: NS,
        }, WorkspaceSuiteSettings)
      }

      let lastSignature = null
      const rebuild = () => {
        const settings = settingsSnapshot()
        const signature = [
          settings.modulePicker === true,
          settings.moduleTree === true,
          settings.moduleOverview === true,
        ].join(',')
        // Only a module switch changes the registration set; option edits must
        // not remount the sidebar. Without a disposer for every registration a
        // second pass would collide on a `single` slot, so the toggle then waits
        // for the next page load instead.
        if (signature === lastSignature) return
        if (lastSignature !== null && !canRebuild) return
        for (const dispose of activeDisposers) {
          try {
            dispose()
          } catch (error) {
            warn('registration teardown failed', error)
          }
        }
        activeDisposers = []
        if (settings.modulePicker === true) registerPicker()
        if (settings.moduleTree === true) registerBrowser()
        if (settings.moduleOverview === true) registerOverview()
        // Tied to the picker module: the hero menu only makes sense together with the
        // add-workspace flow it opens.
        if (settings.modulePicker === true) registerHeroPicker()
        registerSettings()
        lastSignature = signature
      }

      ctx.effect(() => {
        rebuild()
        const stop = settingsStore.subscribe(() => rebuild())
        return () => {
          stop()
          for (const dispose of activeDisposers) {
            try {
              dispose()
            } catch (error) {
              warn('registration teardown failed', error)
            }
          }
          activeDisposers = []
        }
      }, 'workspace-suite: registrations')

      // Referenced so the numeric helper and the unused injected face stay part
      // of the module surface without adding another entry point.
      void settingNumber
      reportBoot('apply-ok', {
        registered: activeDisposers.length,
        rejected: rejectedCount,
        keys: attemptedKeys,
      })
      } catch (error) {
        // Same rule as the module guard: report and stay inert rather than let a
        // failing activation take the whole web boot audit down with it.
        reportBoot('apply-failed', String(error && error.stack ? error.stack : error).slice(0, 600))
        try {
          console.error('[workspace-suite] client apply failed; the plugin stays inert', error)
        } catch {
          /* console may be unavailable in an exotic carrier */
        }
      }
    }

    return {
      name: PKG,
      inject,
      apply,
    }
    } catch (error) {
      reportBoot('factory-failed', String(error && error.stack ? error.stack : error).slice(0, 600))
      try {
        console.error('[workspace-suite] module evaluation failed; the plugin stays inert', error)
      } catch {
        /* console may be unavailable in an exotic carrier */
      }
      // Only function-scope-safe bindings may be referenced here: `PKG` and the
      // other consts live inside the try above and would be uninitialized.
      return {
        name: 'dsh-client-ui-workspace-suite',
        inject: [],
        apply() {
          // Inert: the entry activates so the boot audit stays green, and the
          // console error above is the diagnostic the desktop crash log carries.
          reportBoot('inert-apply')
        },
      }
    }
  },
})
