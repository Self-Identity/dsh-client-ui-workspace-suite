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

    /**
     * Natural, locale-independent directory-path comparison.
     *
     * Numeric segments compare as numbers, so `1, 2, 3, 10` keep their obvious order
     * instead of sorting lexicographically (`1, 10, 2, 3`); a shorter path sorts before
     * the longer path it prefixes, i.e. a parent before its children.
     */
    function comparePathNatural(left, right) {
      const a = foldPath(left).split('/')
      const b = foldPath(right).split('/')
      const length = Math.min(a.length, b.length)
      for (let index = 0; index < length; index += 1) {
        if (a[index] === b[index]) continue
        const leftNumber = Number(a[index])
        const rightNumber = Number(b[index])
        const leftIsNumber = a[index] !== '' && Number.isFinite(leftNumber)
        const rightIsNumber = b[index] !== '' && Number.isFinite(rightNumber)
        if (leftIsNumber && rightIsNumber) return leftNumber - rightNumber
        if (leftIsNumber !== rightIsNumber) return leftIsNumber ? -1 : 1
        return a[index] < b[index] ? -1 : 1
      }
      return a.length - b.length
    }

    /**
     * [root, ...descendants] in natural path order.
     *
     * The hero workspace menu used the host snapshot's own order for its subtree
     * chooser, which came out reversed (`root - 4 - 3 - 2 - 1`); sorting by path makes
     * the list read top-down like the directory tree itself.
     */
    function subtreeOfPath(items, rootItem) {
      const out = [rootItem]
      const rest = []
      for (const item of items) {
        if (item === rootItem) continue
        if (!isAncestorPath(rootItem.path, item.path)) continue
        rest.push(item)
      }
      rest.sort((left, right) => comparePathNatural(left.path, right.path))
      return out.concat(rest)
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
     * A stored workspace-icon colour, or `''` for "follow the theme".
     *
     * Only plain hex is accepted (`#rgb`, `#rrggbb`, `#rrggbbaa`): the value goes into a
     * CSS custom property, and anything else could smuggle arbitrary declarations in.
     */
    function iconColorOf(settings) {
      const raw = settings === undefined || settings === null ? undefined : settings.folderIconColor
      if (typeof raw !== 'string') return ''
      const value = raw.trim()
      return /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) ? value.toLowerCase() : ''
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
     * Merge a stored settings snapshot onto the defaults.
     *
     * A stored object written by an older build simply does not carry keys added
     * later (`moduleHeroMenu`, `showEnv`, `scrollbarWidth`, ...). Reading such a
     * snapshot as-is leaves those keys `undefined`, and every `=== true` gate then
     * silently turns the feature off — which is exactly how the conversation
     * workspace menu reverted to the shipped one after the key was introduced.
     * Only known keys are copied, and a stored `undefined` keeps the default.
     */
    function mergeSettings(defaults, snapshot) {
      const source = snapshot !== null && typeof snapshot === 'object' ? snapshot : {}
      const merged = {}
      const keys = defaults !== null && typeof defaults === 'object' ? Object.keys(defaults) : []
      for (const key of keys) {
        merged[key] = source[key] === undefined ? defaults[key] : source[key]
      }
      return merged
    }

    /**
     * Width of this plugin's own scrollbars as a CSS length, clamped to the setting's
     * 4–20px range with an 8px default. The stylesheet falls back to the global
     * `--dsh-scrollbar-width` (the scrollbar-tuner plugin / theme) when this is unset.
     */
    function scrollbarWidthOf(settings) {
      const raw = settings === undefined || settings === null ? undefined : Number(settings.scrollbarWidth)
      const value = Number.isFinite(raw) ? Math.round(raw) : 8
      return Math.min(20, Math.max(4, value)) + 'px'
    }

    /** A drive root (`C:/`) or the POSIX root: a boundary, never a fillable parent. */
    function isBoundaryPath(path) {
      const raw = typeof path === 'string' ? path.trim() : ''
      if (raw === '/' || raw === '\\') return true
      if (/^[a-z]:[\\/]*$/i.test(raw)) return true
      // `normalizePath('C:/')` gives the bare `C:` form, so test both spellings.
      const folded = normalizePath(raw)
      return folded === '/' || /^[a-z]:$/i.test(folded)
    }

    /**
     * The immediate parent directory of a path, folded, or '' when it has none.
     *
     * {@link parentPathsOf} drops the POSIX root from its chain, so `/a` would look
     * parentless even though `/` is its parent — and two folders under the root then
     * failed the sibling test and were rejected as "another tree".
     */
    function parentPathOf(path) {
      const list = parentPathsOf(path)
      if (list.length > 0) return foldPath(list[0])
      const normalized = normalizePath(typeof path === 'string' ? path : '')
      if (normalized.length > 1 && normalized.startsWith('/')) return '/'
      return ''
    }

    /**
     * Two paths directly under the same parent. This is the one relation besides
     * ancestor/descendant that stays nestable: pulling in the shared parent makes the
     * set a small tree instead of two unrelated roots.
     */
    function isSiblingPath(left, right) {
      if (foldPath(left) === foldPath(right)) return false
      const parent = parentPathOf(left)
      return parent !== '' && parent === parentPathOf(right)
    }

    /**
     * One selection step, as a **pure function** of the current selection.
     *
     * The component keeps its selection in a Map keyed by {@link foldPath}; this takes
     * and returns `{ path, remark }` entries so the four rules the user asked for can be
     * tested without a renderer:
     *
     *  1. picking an already selected folder removes it **together with everything
     *     under it** (a selection never keeps an orphaned child);
     *  2. picking a folder that is neither an ancestor, a descendant **nor a sibling**
     *     of any pick is a conflict (the dialog asks before replacing the tree);
     *  3. otherwise the pick is added and the chain up to the nearest already selected
     *     ancestor is filled in, so nothing lands as an orphan next to its own parent;
     *  4. a **sibling** pick pulls in their common parent — but never a drive/root
     *     boundary, which would silently select an entire disk just because two folders
     *     on it were chosen.
     *
     * Returns `{ action: 'remove', keys }`, `{ action: 'conflict' }` or
     * `{ action: 'add', paths }` (ancestors first, the pick last).
     */
    function selectionStep(entries, path) {
      const list = (Array.isArray(entries) ? entries : [])
        .filter((entry) => entry !== null && typeof entry === 'object' && typeof entry.path === 'string')
      const key = foldPath(path)
      if (list.some((entry) => foldPath(entry.path) === key)) {
        return {
          action: 'remove',
          keys: list
            .filter((entry) => foldPath(entry.path) === key || isAncestorPath(path, entry.path))
            .map((entry) => foldPath(entry.path)),
        }
      }
      // Siblings belong to the same tree: the common parent gets pulled in below, so
      // they must NOT be reported as "another tree" (that prompt cleared the earlier
      // picks, which is what made the constraints look chaotic).
      const related = list.some((entry) => isAncestorPath(entry.path, path)
        || isAncestorPath(path, entry.path)
        || isSiblingPath(entry.path, path))
      if (list.length > 0 && !related) return { action: 'conflict' }
      const parents = parentPathsOf(path)
      const hasSibling = list.some((entry) => isSiblingPath(entry.path, path))
      const selectedAncestorIndex = parents.findIndex((parent) => list.some((entry) => foldPath(entry.path) === foldPath(parent)))
      const stopIndex = selectedAncestorIndex === -1 ? -1 : selectedAncestorIndex - 1
      // Rule 4 must not reach a boundary: `C:/x` plus `C:/y` would otherwise pull the
      // whole `C:/` drive into the selection as a workspace.
      const siblingTop = hasSibling && parents.length > 0 && !isBoundaryPath(parents[0]) ? 0 : -1
      const fillTop = Math.max(stopIndex, siblingTop)
      const paths = []
      for (let index = 0; index <= fillTop; index += 1) paths.push(parents[index])
      paths.push(path)
      return { action: 'add', paths }
    }

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
