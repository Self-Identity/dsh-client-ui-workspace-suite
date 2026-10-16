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
