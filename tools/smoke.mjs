#!/usr/bin/env node
/**
 * Offline smoke test for the browser bundle.
 *
 * The client half cannot be executed here (it needs the Electron renderer), so
 * this harness stubs the three baseline externals plus the cordis client
 * context, loads `lib/client.js`, runs `apply`, and then *renders* every
 * component the plugin registered with a recursive fake `createElement`.
 * Reference errors, bad hook usage and shape mistakes surface as thrown errors
 * instead of a blank slot entry.
 *
 * Usage: node tools/smoke.mjs
 */

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const bundle = readFileSync(join(root, 'lib', 'client.js'), 'utf8')

const problems = []
const fail = (message) => problems.push(message)
/** Renderer console errors; the desktop copies these into its crash log. */
const consoleErrors = []
/** The plugin's own boot record, written through the localStorage stub below. */
const bootRecords = new Map()
const storageStub = (records) => ({
  getItem: (key) => (records.has(key) ? records.get(key) : null),
  setItem: (key, value) => records.set(key, String(value)),
  removeItem: (key) => records.delete(key),
})
const bootRecord = (records) => {
  const raw = (records === undefined ? bootRecords : records).get('dsh-workspace-suite.boot')
  if (typeof raw !== 'string') return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/* ------------------------------- fake React ------------------------------- */

const HOOK_GUARD = { depth: 0, allowEffects: false, calls: 0 }

function fakeReact() {
  const React = {
    Fragment: Symbol('Fragment'),
    Component: class Component {
      constructor(props) {
        this.props = props || {}
        this.state = this.state || {}
      }

      setState() {}
    },
    createElement(type, props, ...children) {
      return { $$element: true, type, props: props || {}, children: children.flat(Infinity) }
    },
    useState(init) {
      HOOK_GUARD.calls += 1
      return [typeof init === 'function' ? init() : init, () => {}]
    },
    useRef(value) {
      HOOK_GUARD.calls += 1
      return { current: value }
    },
    useMemo(factory) {
      HOOK_GUARD.calls += 1
      return factory()
    },
    useCallback(fn) {
      HOOK_GUARD.calls += 1
      return fn
    },
    useEffect(fn) {
      HOOK_GUARD.calls += 1
      if (HOOK_GUARD.allowEffects) {
        try {
          fn()
        } catch (error) {
          fail('useEffect threw: ' + String(error && error.stack ? error.stack.split('\n')[0] : error))
        }
      }
      return undefined
    },
    useLayoutEffect() {},
    useSyncExternalStore(_subscribe, getSnapshot) {
      HOOK_GUARD.calls += 1
      // React compares snapshots by identity: a getSnapshot that builds a new object
      // on every read makes it believe the store changed on every render, and the
      // component that reads it stops rendering (this is how the sidebar list once
      // blanked after the settings snapshot started being merged on read).
      const first = getSnapshot()
      const second = getSnapshot()
      if (first !== second) {
        fail('useSyncExternalStore returned a new snapshot for the same revision; '
          + 'React would loop and the reading component would vanish')
      }
      return first
    },
    useContext() {
      return {}
    },
    forwardRef(fn) {
      return fn
    },
  }
  return React
}

/* ---------------------------- fake store/primitives ----------------------- */

function createSource(initial) {
  let state = initial
  const listeners = new Set()
  return {
    getSnapshot: () => state,
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    update(mutator) {
      const draft = JSON.parse(JSON.stringify(state))
      mutator(draft)
      state = draft
      for (const listener of [...listeners]) listener()
    },
    set(next) {
      state = next
      for (const listener of [...listeners]) listener()
    },
  }
}

const storeKit = {
  createSnapshotStore: (init) => createSource(init),
  defineStore: () => ({ create: () => createSource({}) }),
  shallowEqual: (a, b) => a === b,
  notifySubscribers: () => {},
}

/** Props the host Menu received, for the placement assertions. */
const menuProps = []

const primitivesProxy = new Proxy({}, {
  get(_target, name) {
    if (typeof name !== 'string') return undefined
    if (name === 'MarkdownText') return (props) => ({ $$element: true, type: 'pre', props: {}, children: [String(props.text || '')] })
    // The host primitives wrap a child element: Model/Menu/Tooltip return their
    // children, HoverCard returns its anchor (it has no children prop).
    if (name === 'HoverCard') return (props) => (props && props.anchor !== undefined ? props.anchor : null)
    if (name === 'Tooltip') return (props) => (props && props.children !== undefined ? props.children : null)
    // Rendered whether or not the menu is open, so the row chrome inside it is
    // covered by the assertions without simulating a click on every trigger.
    if (name === 'Menu') return (props) => {
      menuProps.push(props)
      return props && props.children !== undefined ? props.children : null
    }
    if (name === 'Modal') return (props) => (props && props.open === false ? null : (props && props.children) || null)
    // Menu rows carry their icon and their localized shortcut hint, so surface both
    // as data attributes for the assertions instead of rendering them.
    if (name === 'MenuItemButton') {
      return (props) => ({
        $$element: true,
        type: 'div',
        props: {
          'data-menu-item': String(props.children === undefined ? '' : props.children),
          'data-icon': props.icon === undefined || props.icon === null ? 'none' : 'yes',
          'data-shortcut': props.shortcut === undefined || props.shortcut === null ? 'none' : 'yes',
        },
        children: [],
      })
    }
    return () => null
  },
})

/* -------------------------------- fake domain ----------------------------- */

const usage = {
  totals: { uncachedInputTokens: 1000, outputTokens: 500, cacheReadTokens: 200, cacheWriteTokens: 0 },
  models: { 'deepseek-official/deepseek-flash': { uncachedInputTokens: 1000, outputTokens: 500, cacheReadTokens: 200, cacheWriteTokens: 0 } },
  days: { '2026-10-03': { 'deepseek-official/deepseek-flash': { uncachedInputTokens: 400, outputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0 } }, '2026-10-04': { 'deepseek-official/deepseek-flash': { uncachedInputTokens: 600, outputTokens: 400, cacheReadTokens: 200, cacheWriteTokens: 0 } } },
  turns: [[1, 800], [2, 400], [3, 500]],
  last: null,
  route: undefined,
}

const workspacesSource = createSource({
  phase: 'ready',
  state: 'ready',
  items: [
    { workspaceId: 'w1', path: 'C:/projects/alpha', title: '', sessionIds: ['s1', 's2', 's5', 's6', 's7', 's8', 's9', 's10'], createdAt: 1, updatedAt: '2026-10-04T01:00:00Z' },
    { workspaceId: 'w2', path: 'C:/projects/alpha/sub', title: '子项目备注', sessionIds: ['s3'], createdAt: 2, updatedAt: '2026-10-04T02:00:00Z' },
    { workspaceId: 'w3', path: 'D:/other', title: '', sessionIds: [], createdAt: 3, updatedAt: '2026-10-04T03:00:00Z' },
  ],
  archivedSessionIds: ['s2'],
  pinnedSessionIds: ['s3'],
})

const sessionsSource = createSource({
  phase: 'ready',
  ids: ['s1', 's2', 's3', 's4'],
  byId: {
    s1: { id: 's1', displayTitle: '主会话', title: '主会话', cwd: 'C:/projects/alpha', running: false, retainedBy: { mainView: 1 }, blank: false, updatedAt: '2026-10-04T01:00:00Z', projectionValues: { workspaceSuiteUsage: usage } },
    s2: { id: 's2', displayTitle: '已归档会话', cwd: 'C:/projects/alpha', running: false, retainedBy: {}, blank: false, updatedAt: '2026-10-03T01:00:00Z' },
    s3: { id: 's3', displayTitle: '子会话', cwd: 'C:/projects/alpha/sub', running: true, retainedBy: {}, blank: false, updatedAt: '2026-10-04T02:00:00Z', projectionValues: { workspaceSuiteUsage: usage } },
    s4: { id: 's4', displayTitle: '未分组会话', cwd: 'D:/other', running: false, retainedBy: {}, blank: false, updatedAt: '2026-10-04T00:30:00Z' },
    s5: { id: 's5', displayTitle: '折叠会话 5', cwd: 'C:/projects/alpha', running: false, retainedBy: {}, blank: false, updatedAt: '2026-10-03T20:00:00Z' },
    s6: { id: 's6', displayTitle: '折叠会话 6', cwd: 'C:/projects/alpha', running: false, retainedBy: {}, blank: false, updatedAt: '2026-10-03T19:00:00Z' },
    s7: { id: 's7', displayTitle: '折叠会话 7', cwd: 'C:/projects/alpha', running: false, retainedBy: {}, blank: false, updatedAt: '2026-10-03T18:00:00Z' },
    s8: { id: 's8', displayTitle: '折叠会话 8', cwd: 'C:/projects/alpha', running: false, retainedBy: {}, blank: false, updatedAt: '2026-10-03T17:00:00Z' },
    s9: { id: 's9', displayTitle: '折叠会话 9', cwd: 'C:/projects/alpha', running: false, retainedBy: {}, blank: false, updatedAt: '2026-10-03T16:00:00Z' },
    s10: { id: 's10', displayTitle: '折叠会话 10', cwd: 'C:/projects/alpha', running: false, retainedBy: {}, blank: false, updatedAt: '2026-10-03T15:00:00Z' },
  },
})

const directoryListing = {
  home: 'C:/Users/yan',
  crumbs: [{ name: 'C:', path: 'C:/' }, { name: 'projects', path: 'C:/projects' }, { name: 'alpha', path: 'C:/projects/alpha' }],
  truncated: false,
  entries: [
    { name: 'alpha', path: 'C:/projects/alpha', hidden: false },
    { name: 'sub', path: 'C:/projects/alpha/sub', hidden: false },
    { name: '.hidden', path: 'C:/projects/alpha/.hidden', hidden: true },
  ],
}

const directoryReads = []

/**
 * The cordis context proxy only hands out properties that were declared in the
 * plugin's `inject`; reading anything else throws
 * `cannot get property "remote.<name>" without inject`. That rule once shipped a
 * broken activation (the plugin read `remote.workspaceFiles` undeclared), so the
 * harness reproduces it instead of handing out a plain object.
 */
let declaredInject = []
const declaredRemoteNamespaces = () => declaredInject.filter((entry) => entry.startsWith('remote.'))
const remoteNamespaceProxy = () => new Proxy({}, {
  get(_target, property) {
    if (typeof property !== 'string' || property === 'then') return undefined
    if (!declaredInject.includes('remote.' + property)) {
      throw new Error('cannot get property "remote.' + property + '" without inject')
    }
    if (property === 'workspaceFiles') {
      return { read: async () => ({ ok: true, value: { text: '# README\n\n- one\n- two' } }) }
    }
    return undefined
  },
})

const services = {
  slots: {
    registered: [],
    inject(_key, callback) {
      callback()
      return () => {}
    },
    register(options, component) {
      services.slots.registered.push({ options, component })
      return () => {}
    },
    entries(key) {
      // One native-style row-leading occupant, as `ui-schedule` contributes it.
      if (key !== 'sidebar.session.row.leading') return []
      return [{
        options: { id: 'schedule-mark', locale: 'schedule' },
        component: (props) => ({ $$element: true, type: 'span', props: {}, children: ['mark:' + String(props.sessionId)] }),
      }]
    },
  },
  locale: {
    register: () => () => {},
    bind: () => (key, params) => (params === undefined ? key : key + ':' + JSON.stringify(params)),
  },
  sessions: {
    list: sessionsSource,
    using: async () => ({ ok: true, value: undefined }),
    search: async () => ({ ok: true, value: [] }),
    refreshProjections: async () => {},
    create: async () => ({ ok: true, value: { sessionId: 's9' } }),
    fork: async () => ({ ok: true, value: {} }),
  },
  workspaces: {
    list: workspacesSource,
    create: async () => ({ workspaceId: 'w9' }),
    rename: async () => {},
    delete: async () => {},
    pinSession: async () => {},
    unpinSession: async () => {},
    archiveSession: async () => {},
    unarchiveSession: async () => {},
  },
  uiWorkspace: {
    openSession: () => {},
    openWorkspace: async () => {},
    startSession: () => {},
    forkSession: async () => {},
    pinSession: async () => {},
    unpinSession: async () => {},
    archiveSession: async () => {},
    unarchiveSession: async () => {},
    listDirectory: async (path) => {
      directoryReads.push(path)
      return directoryListing
    },
    createDirectory: async () => ({}),
  },
  layout: { selectPanel: () => {}, beginNavigation: () => new AbortController().signal },
  remote: remoteNamespaceProxy(),
  configForms: {
    // The profile config scope hydrates the settings store: this is the path a
    // user's own saved config takes, and it is how the main pass asks for the
    // expanded tree (the collapsed default has its own pass).
    get: () => ({
      getSnapshot: () => ({ status: 'ready', value: { collapseAllByDefault: false } }),
      subscribe: () => () => {},
      set: async () => {},
    }),
  },
}

const fakeCtx = {
  get: (name) => services[name],
  effect: (fn) => {
    const dispose = fn()
    return typeof dispose === 'function' ? dispose : () => {}
  },
  inject: (deps, callback) => {
    const scope = {}
    for (const dep of deps) scope[dep] = services[dep]
    callback(scope)
  },
  on: () => {},
}

/* --------------------------------- loading -------------------------------- */

const sandbox = {
  console: {
    log: () => {},
    warn: () => {},
    error: (...args) => {
      consoleErrors.push(args.map(String).join(' '))
    },
  },
  setTimeout,
  clearTimeout,
  AbortController,
  Date,
  JSON,
  Math,
  Object,
  Array,
  Promise,
  Number,
  String,
  Map,
  Set,
  Error,
  document: undefined,
  localStorage: storageStub(bootRecords),
}

// The list starts collapsed by design (the open-folder icon appears only after the
// user expands a row). The main pass wants the expanded tree, so it hydrates the
// profile config scope with the default switched off — the same path a user's
// profile config takes. The collapsed default has its own pass further down.
bootRecords.set('dsh-workspace-suite.settings.v1', JSON.stringify({ collapseAllByDefault: false }))

sandbox.window = {
  __ModuleLoader__: {
    load({ id, factory }) {
      sandbox.__plugin = factory(fakeRequire)
      sandbox.__pluginId = id
    },
  },
}

function fakeRequire(specifier) {
  if (specifier === 'react') return fakeReact()
  if (specifier === '@deepseek-ai/dsh-client-store') return storeKit
  if (specifier === '@deepseek-ai/dsh-client-ui-primitives') return primitivesProxy
  throw new Error('unexpected require: ' + specifier)
}

vm.createContext(sandbox)
try {
  vm.runInContext(bundle, sandbox, { filename: 'lib/client.js' })
} catch (error) {
  fail('bundle evaluation threw: ' + String(error && error.stack ? error.stack : error))
}

const plugin = sandbox.__plugin
if (plugin === undefined) {
  fail('bundle did not register a plugin through window.__ModuleLoader__.load')
} else {
  if (typeof plugin.apply !== 'function') fail('plugin has no apply function')
  if (typeof plugin.name !== 'string' || plugin.name.length === 0) fail('plugin has no name')
  if (!Array.isArray(plugin.inject)) fail('plugin has no inject array')
  // Everything the plugin reads off the context proxy must be declared first.
  declaredInject = Array.isArray(plugin.inject) ? plugin.inject : []
  for (const required of ['slots', 'locale', 'remote.workspaceFiles']) {
    if (!declaredInject.includes(required)) {
      fail('the plugin reads ' + required + ' but does not declare it in inject; the context proxy would throw')
    }
  }
  try {
    plugin.apply(fakeCtx)
  } catch (error) {
    fail('apply threw: ' + String(error && error.stack ? error.stack : error))
  }
  // The boot record is the channel a maintainer reads from disk when a plugin
  // goes inert while the app still boots; it must reach the success stage and
  // carry the registration outcome.
  const record = bootRecord()
  if (record === null) fail('the plugin wrote no boot record')
  else if (record.stage !== 'apply-ok') fail('the boot record stopped at stage ' + String(record.stage))
  else {
    if (record.detail === null || record.detail.registered !== 7) {
      fail('the boot record reports ' + JSON.stringify(record.detail) + ' instead of 7 accepted seats')
    }
    if (record.detail.rejected !== 0) fail('the boot record reports rejected seats: ' + String(record.detail.rejected))
    if (!Array.isArray(record.detail.keys) || !record.detail.keys.includes('sidebar.workspaces')) {
      fail('the boot record does not list the registered keys')
    }
    console.log('boot record: ' + String(record.stage) + ' ' + JSON.stringify(record.detail))
  }
}

/* -------------------------------- rendering ------------------------------- */

/** Render one element tree with a depth and node budget. */
function render(node, budget) {
  if (node === null || node === undefined || typeof node === 'boolean') return
  if (typeof node === 'string' || typeof node === 'number') {
    budget.strings.push(String(node))
    return
  }
  if (budget.nodes > 40000) return
  if (Array.isArray(node)) {
    for (const child of node) render(child, budget)
    return
  }
  if (typeof node !== 'object' || node.$$element !== true) return
  budget.nodes += 1
  const { type, props, children } = node
  if (props !== null && typeof props === 'object') budget.elements.push(node)
  if (typeof type === 'function') {
    if (budget.depth > 14) return
    budget.depth += 1
    const isClass = type.prototype !== undefined && typeof type.prototype.render === 'function'
    const isBoundary = type.name === 'QuietBoundary'
    try {
      if (isClass) {
        const instance = new type({ ...props, children: children.length === 1 ? children[0] : children })
        instance.props = { ...props, children: children.length === 1 ? children[0] : children }
        instance.state = typeof instance.state === 'undefined' ? {} : instance.state
        render(instance.render(), budget)
      } else {
        const produced = type({ ...props, children: children.length === 1 ? children[0] : children })
        render(produced, budget)
      }
    } catch (error) {
      // A real renderer's error boundary catches its children; emulate that for
      // the plugin's own QuietBoundary and let every other error surface.
      if (isBoundary) return
      const message = error === null || error === undefined ? 'unknown' : (error.message === undefined ? String(error) : error.message)
      const wrapped = new Error('component ' + (type.name || 'anonymous') + ' threw: ' + message)
      wrapped.cause = error
      throw wrapped
    } finally {
      budget.depth -= 1
    }
    return
  }
  for (const child of children) render(child, budget)
}

const registrations = services.slots.registered
if (registrations.length === 0) fail('apply registered nothing')
// The module-switch section below registers more seats on purpose; both render
// passes stay on the set `apply` produced.
const originalRegistrations = registrations.slice()

// Record which ledger keys the rendered entries consult.
const ledgerQueries = []
const originalEntries = services.slots.entries
services.slots.entries = (key) => {
  ledgerQueries.push(key)
  return originalEntries(key)
}

/** The registration's `inject` face, exactly as the renderer merges it in. */
function injectedFor(options) {
  if (options === null || typeof options !== 'object' || typeof options.inject !== 'function') return {}
  try {
    const face = options.inject()
    return face !== null && typeof face === 'object' ? face : {}
  } catch (error) {
    fail('the inject face of ' + String(options.name) + ' threw: ' + String(error && error.message ? error.message : error))
    return {}
  }
}

/** The props the renderer hands a seat: inject face plus the standard hooks. */
function seatProps(options) {
  return {
    ...injectedFor(options),
    t: (key, params) => (params === undefined ? key : key + ':' + JSON.stringify(params)),
    services,
    wide: true,
    expandSidebar: () => {},
    useWorkspaces: (selector) => selector(workspacesSource.getSnapshot()),
    useSessions: (selector) => selector(sessionsSource.getSnapshot()),
    useSessionStatus: (selector) => selector(new Map([['s3', { running: true }]])),
    usePanelInfo: (selector) => selector({ activePanelId: null }),
    useShortcuts: (selector) => selector([
      { id: 'session.rename' },
      { id: 'session.fork' },
      { id: 'session.archive' },
      { id: 'session.new' },
      { id: 'workspace.add' },
    ]),
    view: 'page',
    open: true,
    busy: false,
    onPicked: () => {},
    onCancel: () => {},
    onError: () => {},
  }
}

const renderedElements = []
for (const { options, component } of registrations) {
  const budget = { depth: 0, nodes: 0, strings: [], elements: [] }
  // Run mount effects for this pass so the picker's open flow (drive probes and
  // the alignment seeds) actually executes.
  HOOK_GUARD.allowEffects = true
  const baseProps = seatProps(options)
  try {
    const element = component(baseProps)
    render(element, budget)
  } catch (error) {
    fail('registration ' + String(options.name) + '/' + String(options.key || options.id || '') + ' threw: ' + String(error && error.message ? error.message : error))
  }
  console.log('rendered ' + String(options.name) + (options.key === undefined ? '' : '#' + String(options.key)) + ' (' + String(budget.nodes) + ' nodes)')
  renderedElements.push(...budget.elements)
  if (String(options.name).endsWith('.directoryFlow')) {
    // The picker tree must expose a focusable expand/collapse control per row,
    // otherwise the explorer is mouse-only inside a keyboard-trapping modal.
    // Rows arrive asynchronously, so this checks whatever rendered.
    const chevrons = budget.elements.filter((entry) => typeof entry.props === 'object' && entry.props !== null
      && typeof entry.props.className === 'string' && entry.props.className.includes('dws-chev'))
    const focusable = chevrons.filter((entry) => entry.type === 'button' && typeof entry.props['aria-label'] === 'string')
    if (chevrons.length > 0 && focusable.length !== chevrons.length) {
      fail('the picker row chevrons are not all focusable buttons')
    }
    const tree = budget.elements.find((entry) => typeof entry.props === 'object' && entry.props !== null
      && entry.props.role === 'tree')
    if (tree === undefined) fail('the picker rendered no tree container')
    else if (typeof tree.props.onKeyDown !== 'function') {
      fail('the picker tree has no keyboard handler; arrow keys would not navigate it')
    } else {
      console.log('  picker tree: focusable treeitem rows with a keyboard handler')
    }
    // Hooks must run unconditionally: the closed render and the open render have to
    // call the same number of hooks, or React tears the pane down with "rendered
    // more hooks than during the previous render" — the whole list then goes blank.
    const hookCalls = (props) => {
      const start = HOOK_GUARD.calls
      const probe = { depth: 0, nodes: 0, strings: [], elements: [] }
      try {
        render(component(props), probe)
      } catch (error) {
        fail('the picker threw with open=' + String(props.open) + ': '
          + String(error && error.message ? error.message : error))
      }
      return HOOK_GUARD.calls - start
    }
    const closedCalls = hookCalls({ ...baseProps, open: false })
    const openCalls = hookCalls({ ...baseProps, open: true })
    if (openCalls === 0) fail('the picker hook probe measured no hooks at all')
    else if (closedCalls !== openCalls) {
      fail('the picker calls ' + String(openCalls) + ' hooks when open but ' + String(closedCalls)
        + ' when closed; a conditional hook blanks the whole pane')
    } else {
      console.log('  picker hooks: ' + String(openCalls) + ' in both the closed and the open render')
    }
  }
  if (options.name === 'main') {
    // The overview must carry the same fully expanded hierarchy as the list —
    // that view belongs here — and this is where token figures stay.
    const countOf = (token) => budget.elements.filter((entry) => typeof entry.props.className === 'string'
      && entry.props.className.includes(token)).length
    const wsRows = countOf('dws-wsRow')
    const sessionRows = countOf('dws-sessionRow')
    const badges = countOf('dws-badge')
    if (wsRows === 0 || sessionRows === 0) {
      fail('the overview does not render the hierarchy rows (workspaces=' + String(wsRows)
        + ', sessions=' + String(sessionRows) + ')')
    } else if (badges === 0) {
      fail('the overview renders no token figures')
    } else {
      console.log('  overview hierarchy: ' + String(wsRows) + ' workspace row(s), '
        + String(sessionRows) + ' session row(s), ' + String(badges) + ' token badge(s)')
    }
  }
  if (options.name === 'sidebar.panellist') {
    fail('the overview registered a standalone panel-list entry; it belongs in the workspace "More" menu')
  }
  if (options.name === 'conversation.hero.workspace') {
    // The shadowed hero menu lists root-level workspaces only: a child whose name
    // only makes sense next to its parent must not appear on its own.
    const heroRows = budget.elements.filter((entry) => entry.props !== null && typeof entry.props === 'object'
      && typeof entry.props['data-menu-item'] === 'string')
    const labels = heroRows.map((entry) => entry.props['data-menu-item'])
    if (!labels.includes('alpha') || !labels.includes('other')) {
      fail('the hero workspace menu did not list the root workspaces: ' + JSON.stringify(labels))
    } else if (labels.includes('子项目备注')) {
      fail('the hero workspace menu listed a child workspace as a root: ' + JSON.stringify(labels))
    } else {
      // The add entry must exist and come first: it is the menu's primary action.
      const addRow = budget.elements.find((entry) => entry.props !== null && typeof entry.props === 'object'
        && typeof entry.props.className === 'string' && entry.props.className.includes('dws-heroAdd'))
      if (addRow === undefined) fail('the hero workspace menu has no add-workspace entry')
      else if (heroRows.length > 0 && budget.elements.indexOf(addRow) > budget.elements.indexOf(heroRows[0])) {
        fail('the add-workspace entry is not first in the hero workspace menu')
      } else {
        console.log('  hero menu: add entry first, ' + String(labels.length) + ' root item(s), no child entries')
      }
    }
  }
  if (options.name === 'sidebar.workspaces') {
    // The inline picker is the "add workspace" dialog only: it has no mode, no seed,
    // and it must carry the startSession face so its post-submit entry chooser works.
    const inlinePicker = budget.elements.find((entry) => entry.props !== null && typeof entry.props === 'object'
      && typeof entry.props.ownCreate === 'function')
    if (inlinePicker === undefined) fail('the workspace browser never rendered its picker dialog')
    else if (inlinePicker.props.mode !== undefined) {
      fail('the inline picker still receives a mode; the selection-only mode is gone')
    } else if (inlinePicker.props.initialPaths !== undefined) {
      fail('the inline picker seeded the current workspaces in add mode')
    } else if (typeof services.startSession === 'function' && typeof inlinePicker.props.startSession !== 'function') {
      fail('the inline picker has no startSession face, so its entry chooser could never run')
    } else {
      console.log('  inline picker: add-only, no seed, entry chooser wired')
    }
    // The old "workspace selection" menu row must be gone: moving sessions between
    // workspaces is not something a client API can do.
    if (budget.strings.includes('browser.pickWorkspace')) {
      fail('the workspace row menu still lists the removed "workspace selection" entry')
    }
    // This plugin's scrollbars follow its own width setting (8px by default).
    const scrollbarVars = budget.elements
      .filter((entry) => entry.props !== null && typeof entry.props === 'object'
        && entry.props.style !== null && typeof entry.props.style === 'object'
        && typeof entry.props.style['--suite-scrollbar-width'] === 'string')
      .map((entry) => entry.props.style['--suite-scrollbar-width'])
    if (scrollbarVars.length === 0) fail('the browser root does not scope --suite-scrollbar-width')
    else if (scrollbarVars.some((value) => value !== '8px')) {
      fail('the default scrollbar width is not 8px: ' + JSON.stringify(scrollbarVars))
    } else {
      console.log('  scrollbar width: 8px default on the plugin root')
    }
    // The indent ladder: nested rows sit 15px further left than the plain 12px
    // ladder (with a 3px floor), so the old first-level values must be gone.
    const indents = budget.elements
      .filter((entry) => entry.props !== null && typeof entry.props === 'object'
        && entry.props.style !== null && typeof entry.props.style === 'object'
        && typeof entry.props.style['--suite-indent'] === 'string')
      .map((entry) => entry.props.style['--suite-indent'])
    const px = indents.map((value) => parseFloat(value))
    if (px.length === 0) fail('no rendered row carried an indent, so the ladder cannot be checked')
    else if (!px.includes(0)) fail('no top-level row rendered without an indent: ' + JSON.stringify(indents))
    else if (px.includes(12)) fail('a nested row still uses the old 12px first-level indent: ' + JSON.stringify(indents))
    else if (px.some((value) => Number.isFinite(value) && value > 0 && value < 3)) {
      fail('a nested row is indented below the 3px floor: ' + JSON.stringify(indents))
    } else {
      const nested = [...new Set(px.filter((value) => value > 0))].sort((left, right) => left - right)
      console.log('  indent ladder: level 0 = 0px, nested = ' + nested.join('/') + 'px')
    }
    const marks = budget.strings.filter((text) => text.startsWith('mark:'))
    if (marks.length === 0) fail('the row-leading ledger seat (schedule mark) was not rendered; ledger queries: ' + JSON.stringify(ledgerQueries))
    else console.log('  row-leading seats rendered: ' + marks.join(', '))
    for (const expected of ['alpha', '主会话', '子项目备注', 'browser.ungrouped']) {
      if (!budget.strings.includes(expected)) fail('expected row text was not rendered: ' + expected)
    }
    if (budget.strings.includes('已归档会话')) fail('an archived session rendered while the default filter hides archives')
    // Native folding: s1 is the current session (always shown), s5..s10 are the
    // idle rows, s3 is running and s4 is ungrouped. Five idle rows show first and
    // the sixth waits behind the control.
    if (!budget.strings.includes('browser.showMore (1)')) {
      fail('the idle-session folding control is missing (expected browser.showMore (1)); strings: '
        + JSON.stringify(budget.strings.slice(0, 30)))
    }
    if (budget.strings.includes('折叠会话 10')) fail('a folded idle session rendered anyway')
    const sessionRows = budget.elements.filter((entry) => typeof entry.props.className === 'string'
      && entry.props.className.includes('dws-sessionRow')).length
    if (sessionRows !== 8) fail('expected 8 rendered session rows (s1 current + 5 idle + s3 running + s4 ungrouped), got ' + String(sessionRows))
    // The list must stay native-quiet: token figures belong to the overview.
    const listBadges = budget.elements.filter((entry) => typeof entry.props.className === 'string'
      && entry.props.className.includes('dws-badge')).length
    if (listBadges !== 0) fail('the workspace list rendered ' + String(listBadges) + ' token badge(s)')
    // Menu rows must carry the shipped chrome: an icon each, and the host's
    // shortcut hint wherever the action has one (`session.rename` does).
    const menuRows = budget.elements.filter((entry) => entry.props !== null && typeof entry.props === 'object'
      && entry.props['data-menu-item'] !== undefined)
    if (menuRows.length === 0) {
      fail('no menu rows were rendered through the host MenuItemButton path')
    } else {
      const iconless = menuRows.filter((entry) => entry.props['data-icon'] !== 'yes')
      if (iconless.length > 0) {
        fail(iconless.length + ' menu row(s) lost their icon: '
          + JSON.stringify(iconless.map((entry) => entry.props['data-menu-item'])))
      }
      const hintCount = menuRows.filter((entry) => entry.props['data-shortcut'] === 'yes').length
      if (hintCount === 0) {
        fail('no menu row carried a shortcut hint even though the host reports shortcut rows')
      }
      console.log('  menu rows: ' + String(menuRows.length) + ' with icons, '
        + String(hintCount) + ' with shortcut hints')
    }
    // Tree affordance: the row itself is the expand control, so there is no
    // separate chevron on a row (the inline picker keeps its own ones).
    const labeledChevrons = budget.elements.filter((entry) => typeof entry.props.className === 'string'
      && entry.props.className.includes('dws-chev') && entry.props['aria-label'] !== undefined)
    if (labeledChevrons.length !== 0) {
      fail('a workspace row still renders a chevron control: ' + JSON.stringify(String(labeledChevrons[0].type)))
    }
    const expandable = budget.elements.filter((entry) => typeof entry.props.role === 'string' && entry.props.role === 'treeitem'
      && typeof entry.props['aria-expanded'] === 'string'
      && typeof entry.props.onClick === 'function')
    if (expandable.length === 0) fail('no workspace row both toggles and reports aria-expanded')
    else {
      // With the chevron gone the row must stay keyboard-operable.
      const keyboard = expandable.filter((entry) => entry.props.tabIndex === 0 && typeof entry.props.onKeyDown === 'function')
      if (keyboard.length !== expandable.length) {
        fail('only ' + String(keyboard.length) + ' of ' + String(expandable.length)
          + ' tree rows are focusable with a keyboard handler')
      } else {
        console.log('  tree rows: ' + String(expandable.length)
          + ' toggle on click and on key, aria-expanded, no chevron, no token badges')
      }
    }
  }
}

/* ------------------------------ rail mode --------------------------------- */

// The collapsed sidebar is 56px wide. Render the takeover with `wide: false` and
// check its header switched to the stacking variant instead of a horizontal row.
const railRegistration = originalRegistrations.find((entry) => entry.options.name === 'sidebar.workspaces')
if (railRegistration === undefined) {
  fail('the workspace list registration is missing')
} else {
  const budget = { depth: 0, nodes: 0, strings: [], elements: [] }
  HOOK_GUARD.allowEffects = true
  try {
    const element = railRegistration.component({
      ...injectedFor(railRegistration.options),
      t: (key, params) => (params === undefined ? key : key + ':' + JSON.stringify(params)),
      services,
      wide: false,
      expandSidebar: () => {},
      useWorkspaces: (selector) => selector(workspacesSource.getSnapshot()),
      useSessions: (selector) => selector(sessionsSource.getSnapshot()),
      useSessionStatus: (selector) => selector(new Map()),
      usePanelInfo: (selector) => selector({ activePanelId: null }),
    })
    render(element, budget)
  } catch (error) {
    fail('rail-mode render threw: ' + String(error && error.message ? error.message : error))
  }
  const header = budget.elements.find((entry) => typeof entry.props.className === 'string'
    && entry.props.className.includes('dws-header'))
  if (header === undefined) fail('the rail render produced no header')
  else if (!String(header.props.className).includes('dws-header--rail')) {
    fail('the rail header did not switch to the stacking variant: ' + String(header.props.className))
  } else {
    console.log('rail mode: header uses ' + String(header.props.className))
  }
}

/* --------------------------- picker open flow ----------------------------- */

// The dialog always probes the system root and opens blank: there is no seeded
// "workspace selection" mode left (the row menu entry that used it was removed,
// because moving existing sessions between workspaces is not possible through a
// client API). Handing the seat an `initialPaths` prop must therefore be ignored.
await new Promise((resolve) => setTimeout(resolve, 60))
const requested = new Set(directoryReads)
if (directoryReads.length === 0) {
  fail('the picker never read a directory; its open flow did not run')
} else {
  const probed = directoryReads.some((path) => typeof path === 'string' && /^[A-Z]:\/$/.test(path))
  if (!probed) fail('the picker never probed a drive root')
  console.log('directory reads: ' + String(directoryReads.length) + ' (drives probed: ' + String(probed) + ')')
}

// A leftover `initialPaths` prop must not seed anything any more.
{
  const seat = originalRegistrations.find((entry) => entry.options.name === 'sidebar.workspaces.directoryFlow')
  if (seat === undefined) fail('the sidebar directory-flow seat is missing')
  else {
    const before = directoryReads.length
    const budget = { depth: 0, nodes: 0, strings: [], elements: [] }
    HOOK_GUARD.allowEffects = true
    try {
      render(seat.component({
        ...seatProps(seat.options),
        initialPaths: ['C:/projects/alpha', 'D:/other'],
      }), budget)
    } catch (error) {
      fail('the picker threw when handed a leftover initialPaths prop: '
        + String(error && error.message ? error.message : error))
    }
    await new Promise((resolve) => setTimeout(resolve, 80))
    const extra = new Set(directoryReads.slice(before))
    if (extra.has('D:/other')) fail('the picker still reads an initialPaths seed it should ignore')
    const selectedRows = budget.elements.filter((entry) => typeof entry.props.className === 'string'
      && entry.props.className.includes('dws-pickerRow--selected')).length
    if (selectedRows !== 0) fail('the picker rendered ' + String(selectedRows) + ' selected row(s) from a leftover initialPaths prop')
    console.log('picker seeding: ignored a leftover initialPaths prop (0 selected rows)')
  }
}

/* ----------------------------- module switches ---------------------------- */

// Flip the first module switch (the picker) exactly as the settings card does
// and check the registration set the plugin rebuilt: the headline requirement
// is that each module takes effect from the Plugins panel.
const switches = renderedElements.filter((element) => element.props !== null && typeof element.props === 'object'
  && element.props.role === 'switch' && typeof element.props.onClick === 'function')
if (switches.length === 0) {
  fail('no settings switch rendered; the module switches would be unreachable')
} else {
  const before = services.slots.registered.length
  const event = { preventDefault() {}, stopPropagation() {} }
  try {
    switches[0].props.onClick(event)
  } catch (error) {
    fail('flipping a module switch threw: ' + String(error && error.message ? error.message : error))
  }
  const added = services.slots.registered.slice(before)
  if (added.length === 0) fail('flipping a module switch changed no registration')
  if (added.some((entry) => String(entry.options.name).includes('directoryFlow'))) {
    fail('turning the picker module off still registered its directory-flow seats')
  }
  if (!added.some((entry) => entry.options.name === 'sidebar.workspaces')) {
    fail('turning the picker module off also dropped the workspace list')
  }
  if (!added.some((entry) => entry.options.name === 'plugins.bundle.config')) {
    fail('turning a module off dropped the settings card')
  }
  console.log('module switches: ' + String(switches.length) + ' rendered; disabling the picker rebuilt '
    + String(added.length) + ' registrations')
}

/* --------------------------- degraded environment ------------------------- */

// The same registrations are rendered again with no services, no hooks and no
// owner props: a plugin that throws there would blank a slot for a user whose
// composition lacks the optional pieces. Only the plugin's own error boundary
// may absorb a failure; anything that escapes it is a defect.
for (const { options, component } of originalRegistrations) {
  const budget = { depth: 0, nodes: 0, strings: [], elements: [] }
  const degradedT = (key) => key
  try {
    const element = component({ t: degradedT, services: {}, view: 'page', open: true, wide: true })
    render(element, budget)
  } catch (error) {
    fail('degraded render of ' + String(options.name) + ' escaped the boundary: '
      + String(error && error.message ? error.message : error))
  }
}
console.log('degraded pass: ' + String(originalRegistrations.length) + ' registrations rendered without services')

/* ------------------------- injected service surface ----------------------- */
const browserRegistration = registrations.find((entry) => entry.options.name === 'sidebar.workspaces')
const face = browserRegistration === undefined || typeof browserRegistration.options.inject !== 'function'
  ? undefined
  : browserRegistration.options.inject()
if (face === undefined) {
  fail('the sidebar registration exposes no inject face')
} else {
  const surface = face.services
  const expected = [
    'openSession', 'openWorkspace', 'startSession', 'forkSession', 'pin', 'unpin', 'archive', 'unarchive',
    'renameWorkspace', 'deleteWorkspace', 'createWorkspace', 'renameSession', 'searchSessions',
    'listDirectory', 'createDirectory', 'readWorkspaceItems', 'refreshProjections', 'readFile',
    'openOverview', 'bindLocale',
  ]
  for (const name of expected) {
    if (surface === undefined || typeof surface[name] !== 'function') fail('service face is missing: ' + name)
  }
  try {
    const items = surface.readWorkspaceItems()
    if (!Array.isArray(items) || items.length !== 3) fail('readWorkspaceItems returned ' + JSON.stringify(items))
    await surface.renameSession('s1', 'renamed')
    const found = await surface.searchSessions('query')
    if (!Array.isArray(found)) fail('searchSessions did not unwrap the result envelope: ' + JSON.stringify(found))
    const text = await surface.readFile('s1', 'C:/projects/alpha/README.md')
    if (typeof text !== 'string' || text.length === 0) fail('readFile did not unwrap the page envelope')
    await surface.refreshProjections(['s1', 's2', 's3', 's4', 's5', 's6', 's7'])
    await surface.renameWorkspace('w1', 'renamed workspace')
    await surface.openWorkspace('w1')
    if (typeof surface.bindLocale('workspace') !== 'function') fail('bindLocale did not return a translate function')
  } catch (error) {
    fail('service face call threw: ' + String(error && error.message ? error.message : error))
  }
  console.log('service face: ' + String(expected.length) + ' methods exercised')
}

/* --------------------------- cold-boot services ---------------------------- */

// A cold boot can run apply before the workspace/layout services exist. The face
// must heal itself on first use: a face that captured `undefined` once used to make
// the picker open with "directory listing unavailable" until the plugin was reloaded.
{
  const lateBag = Object.assign({}, services)
  let workspaceReady = false
  lateBag.uiWorkspace = undefined
  const lateCtx = {
    get: (name) => {
      if (name === 'uiWorkspace') return workspaceReady ? services.uiWorkspace : undefined
      if (name === 'layout') return workspaceReady ? services.layout : undefined
      return lateBag[name]
    },
    effect: (fn) => {
      const dispose = fn()
      return typeof dispose === 'function' ? dispose : () => {}
    },
    inject: (deps, callback) => {
      const scope = {}
      for (const dep of deps) scope[dep] = lateBag[dep]
      callback(scope)
    },
    on: () => {},
  }
  try {
    plugin.apply(lateCtx)
  } catch (error) {
    fail('apply threw with late services: ' + String(error && error.message ? error.message : error))
  }
  // Grab the face from the sidebar registration this apply produced, then let the
  // service appear and call a method that needs it.
  const lateRegistration = [...registrations].reverse()
    .find((entry) => entry.options.name === 'sidebar.workspaces')
  const lateServices = lateRegistration !== undefined && typeof lateRegistration.options.inject === 'function'
    ? lateRegistration.options.inject().services
    : undefined
  if (lateServices === undefined) fail('the late-services apply registered nothing to test')
  else {
    workspaceReady = true
    try {
      const listing = await lateServices.listDirectory('C:/projects/alpha')
      if (listing === undefined || listing === null) fail('listDirectory resolved with nothing after the service appeared')
      else console.log('cold boot: the face healed itself (' + 'listDirectory resolved)')
    } catch (error) {
      fail('the face did not heal after the service appeared: '
        + String(error && error.message ? error.message : error))
    }
  }
}

const pickerRegistration = registrations.find((entry) => entry.options.name === 'sidebar.workspaces.directoryFlow')
const pickerFace = pickerRegistration === undefined || typeof pickerRegistration.options.inject !== 'function'
  ? undefined
  : pickerRegistration.options.inject()
if (pickerFace === undefined) {
  fail('the picker registration exposes no inject face')
} else {
  for (const name of ['t', 'listDirectory', 'createWorkspace', 'renameWorkspace', 'readWorkspaceItems']) {
    if (typeof pickerFace[name] !== 'function') fail('picker inject face is missing: ' + name)
  }
}

/* --------------------------- fail-soft guarantees ------------------------- */

// A plugin must never be the reason the shell fails to boot: the web boot audit
// counts an entry that throws, and that aborts the whole application.

// 1. A slot registry that rejects every call must not throw out of `apply`.
if (problems.length === 0) {
  const hostileSlots = {
    inject() { throw new Error('hostile inject') },
    register() { throw new Error('hostile register') },
    entries() { return [] },
  }
  const before = consoleErrors.length
  try {
    plugin.apply({
      get: (name) => (name === 'slots' ? hostileSlots : name === 'locale' ? services.locale : undefined),
      effect: (fn) => { fn(); return () => {} },
      inject: () => {},
    })
  } catch (error) {
    fail('apply threw when the slot registry rejected every call: ' + String(error && error.message ? error.message : error))
  }
  if (consoleErrors.length === before) fail('a hostile slot registry produced no diagnostic console error')
  else console.log('fail-soft: apply survived a hostile slot registry (' + String(consoleErrors.length - before) + ' diagnostic line(s))')
  // The same failure must be visible through the on-disk channel.
  const hostileRecord = bootRecord()
  const rejected = hostileRecord === null || hostileRecord.detail === null ? null : hostileRecord.detail.rejected
  if (rejected === null || rejected === 0) {
    fail('the boot record did not report the rejected seats: ' + JSON.stringify(hostileRecord))
  } else if (rejected !== hostileRecord.detail.keys.length) {
    fail('the boot record counted ' + String(rejected) + ' rejections for '
      + String(hostileRecord.detail.keys.length) + ' attempted seats')
  } else if (!Array.isArray(hostileRecord.failures) || hostileRecord.failures.length === 0) {
    fail('the boot record kept no failure history for the rejected seats')
  } else {
    console.log('boot record after a hostile registry: rejected=' + String(rejected)
      + ', failures=' + String(hostileRecord.failures.length))
  }
}

// 2. A factory that cannot even require its baseline must still register an
//    inert entry, so the boot audit keeps the application alive.
{
  const hostileErrors = []
  const hostileRecords = new Map()
  const hostileSandbox = {
    console: { log: () => {}, warn: () => {}, error: (...args) => hostileErrors.push(args.map(String).join(' ')) },
    setTimeout,
    clearTimeout,
    AbortController,
    Date,
    JSON,
    Math,
    Object,
    Array,
    Promise,
    Number,
    String,
    Map,
    Set,
    Error,
    Symbol,
    document: undefined,
    localStorage: storageStub(hostileRecords),
  }
  hostileSandbox.window = {
    __ModuleLoader__: {
      load({ factory }) {
        hostileSandbox.__entry = factory(() => {
          throw new Error('hostile require')
        })
      },
    },
  }
  vm.createContext(hostileSandbox)
  try {
    vm.runInContext(bundle, hostileSandbox, { filename: 'lib/client.js' })
  } catch (error) {
    fail('the bundle threw while evaluating with a hostile require: ' + String(error && error.message ? error.message : error))
  }
  const entry = hostileSandbox.__entry
  if (entry === null || typeof entry !== 'object') {
    fail('a hostile require produced no entry at all; the boot audit would count it as failed')
  } else {
    if (entry.name !== 'dsh-client-ui-workspace-suite') fail('the inert entry carries the wrong name: ' + String(entry.name))
    if (typeof entry.apply !== 'function') fail('the inert entry has no apply')
    else {
      try {
        entry.apply({ get: () => undefined, effect: () => () => {}, inject: () => {} })
      } catch (error) {
        fail('the inert entry threw on apply: ' + String(error && error.message ? error.message : error))
      }
    }
    if (!hostileErrors.some((text) => text.includes('workspace-suite'))) {
      fail('the module guard logged nothing for a hostile require')
    } else {
      console.log('fail-soft: a hostile require yields an inert entry and a logged reason')
    }
  }
  // The on-disk channel must retain the failing stage even though the inert
  // apply that follows overwrites the newest stage.
  const hostileRecord = bootRecord(hostileRecords)
  if (hostileRecord === null) fail('a hostile require wrote no boot record')
  else if (!Array.isArray(hostileRecord.failures)
    || !hostileRecord.failures.some((entry) => String(entry.stage).includes('factory-failed'))) {
    fail('the boot record does not retain the factory failure: ' + JSON.stringify(hostileRecord))
  } else {
    console.log('boot record after a hostile require: failures='
      + JSON.stringify(hostileRecord.failures.map((entry) => entry.stage)))
  }
}

/* ------------------------- collapsed-default pass ------------------------- */

// The tree starts collapsed: a fresh client with default settings must render the
// root workspaces with closed folders and no session rows at all. Expanding is
// what reveals children, and the open-folder icon appears only then.
{
  const collapsedRecords = new Map()
  const collapsedSandbox = Object.assign({}, sandbox, { localStorage: storageStub(collapsedRecords) })
  delete collapsedSandbox.__plugin
  delete collapsedSandbox.__pluginId
  collapsedSandbox.window = {
    __ModuleLoader__: {
      load({ factory }) {
        collapsedSandbox.__plugin = factory(fakeRequire)
      },
    },
  }
  vm.createContext(collapsedSandbox)
  try {
    vm.runInContext(bundle, collapsedSandbox, { filename: 'lib/client.js' })
  } catch (error) {
    fail('the collapsed-default sandbox threw: ' + String(error && error.message ? error.message : error))
  }
  const collapsedPlugin = collapsedSandbox.__plugin
  if (collapsedPlugin === undefined || typeof collapsedPlugin.apply !== 'function') {
    fail('the collapsed-default sandbox registered no plugin')
  } else {
    const bag = Object.assign({}, services, {
      configForms: {
        get: () => ({
          getSnapshot: () => ({ status: 'ready', value: {} }),
          subscribe: () => () => {},
          set: async () => {},
        }),
      },
    })
    const before = registrations.length
    try {
      collapsedPlugin.apply({
        get: (name) => bag[name],
        effect: (fn) => {
          const dispose = fn()
          return typeof dispose === 'function' ? dispose : () => {}
        },
        inject: (deps, callback) => {
          const scope = {}
          for (const dep of deps) scope[dep] = bag[dep]
          callback(scope)
        },
        on: () => {},
      })
    } catch (error) {
      fail('apply threw with default settings: ' + String(error && error.message ? error.message : error))
    }
    const seat = registrations.slice(before).find((entry) => entry.options.name === 'sidebar.workspaces')
    if (seat === undefined) fail('default settings produced no workspace-list registration')
    else {
      const budget = { depth: 0, nodes: 0, strings: [], elements: [] }
      try {
        render(seat.component(seatProps(seat.options)), budget)
      } catch (error) {
        fail('the collapsed list threw: ' + String(error && error.message ? error.message : error))
      }
      const sessionRows = budget.elements.filter((entry) => typeof entry.props.className === 'string'
        && entry.props.className.includes('dws-sessionRow')).length
      // The only rows that may show are the ungrouped ones, which belong to no
      // workspace and therefore cannot be hidden by collapsing one.
      if (sessionRows !== 1) {
        fail('default settings rendered ' + String(sessionRows)
          + ' session row(s) before any expansion; only the one ungrouped row may show')
      }
      if (budget.strings.includes('主会话')) fail('default settings rendered a nested session title before any expansion')
      if (!budget.strings.includes('alpha')) fail('default settings hid the root workspaces themselves')
      const folders = budget.elements.filter((entry) => typeof entry.props.className === 'string'
        && entry.props.className.includes('dws-folderIcon')).length
      if (folders === 0) fail('the collapsed list rendered no folder icon')
      const collapsedRows = budget.elements.filter((entry) => entry.props !== null
        && typeof entry.props === 'object' && entry.props['aria-expanded'] === 'false').length
      if (collapsedRows === 0) fail('no row reported aria-expanded="false" while collapsed')
      else {
        console.log('collapsed default: ' + String(collapsedRows) + ' closed row(s), '
          + String(folders) + ' folder icon(s), 0 session rows')
      }
    }
  }
}

/* --------------------------- menu placement ------------------------------- */

// A portaled host list is placed from the anchor rect its owner supplies. Without
// one the list renders unpinned at the window's origin (reported in the client as
// "the menu flew to the top-left corner").
{
  const placements = menuProps.filter((props) => props !== null && typeof props === 'object')
  if (placements.length === 0) fail('no host Menu received props at all')
  else {
    const missing = placements.filter((props) => typeof props.getAnchorRect !== 'function')
    if (missing.length > 0) {
      fail(missing.length + ' of ' + placements.length + ' host menus got no getAnchorRect')
    } else {
      console.log('menu placement: ' + String(placements.length) + ' host menu(s) supply an anchor rect')
    }
    const badSide = placements.filter((props) => props.side !== 'bottom' && props.side !== 'top')
    if (badSide.length > 0) fail('a host menu received an unsupported side: ' + JSON.stringify(badSide[0].side))
    // `anchor: null` is legitimate when a rect is supplied (the shipped hero picker
    // positions that way); anything else non-element is not.
    const domAnchor = placements.filter((props) => props.anchor !== null
      && (typeof props.anchor !== 'object' || props.anchor.$$element !== true))
    if (domAnchor.length > 0) fail('a host menu received something other than a React element or null as its anchor')
  }
}

/* --------------------------------- summary -------------------------------- */
console.log('')
console.log('registrations: ' + String(originalRegistrations.length) + ' from apply, '
  + String(registrations.length) + ' after the module toggle')
console.log('problems: ' + String(problems.length))
for (const problem of problems) console.log('  FAIL  ' + problem)
process.exit(problems.length === 0 ? 0 : 1)
