#!/usr/bin/env node
/**
 * Unit test for the pure helpers in `src/20-util.js`.
 *
 * The browser bundle keeps them in a closure, so the source part is evaluated
 * in a VM with a tiny React stub and the helpers are read back out. The tree
 * derivation ("nearest registered ancestor directory") and the usage-view
 * fallback are the two places where a subtle mistake would look like a UI bug.
 *
 * Usage: node tools/test-util.mjs
 */

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(join(root, 'src', '20-util.js'), 'utf8')

const problems = []
const check = (label, actual, expected) => {
  const left = JSON.stringify(actual)
  const right = JSON.stringify(expected)
  if (left !== right) problems.push(label + ': expected ' + right + ', got ' + left)
}

const names = [
  'normalizePath', 'foldPath', 'isAncestorPath', 'baseName', 'workspaceTitle', 'parentPathsOf',
  'buildWorkspaceTree', 'collectSubtree', 'ancestorsOf', 'chainForPath', 'formatTokens',
  'sumBuckets', 'dayKey', 'relativeTime', 'errorMessage', 'timestamp',
  'usageViewOf', 'boundCall', 'USAGE_KEY',
  'directoryNames', 'packageSummary', 'enginesSummary', 'ENV_PROBE_FILES',
]

const preamble = [
  'const PKG = "test-pkg";',
  'const NS = "test-ns";',
  'const STYLE_ID = "test-style";',
  'class StubComponent {}',
  'const React = {',
  '  Component: StubComponent,',
  '  createElement: () => ({}),',
  '  useCallback: (fn) => fn,',
  '  useRef: (value) => ({ current: value }),',
  '  useSyncExternalStore: () => undefined,',
  '};',
  'const document = undefined;',
].join('\n')

const exported = vm.runInNewContext(
  preamble + '\n' + source + '\n;({' + names.join(', ') + '})',
  { console: { warn: () => {} }, setTimeout, clearTimeout, Number, Object, Array, String, Date, JSON, Math, Promise, Error, Map, Set, AbortController },
  { filename: 'src/20-util.js' },
)

for (const name of names) {
  if (exported[name] === undefined) problems.push('helper not exported: ' + name)
}

const {
  normalizePath, isAncestorPath, baseName, workspaceTitle, buildWorkspaceTree, parentPathsOf,
  collectSubtree, ancestorsOf, chainForPath, formatTokens, sumBuckets, dayKey, relativeTime,
  errorMessage, timestamp, usageViewOf, boundCall, USAGE_KEY,
  directoryNames, packageSummary, enginesSummary, ENV_PROBE_FILES,
} = exported

/* --------------------------- dependencies card ---------------------------- */

// The browse backend's listing carries child directories only, so the card's
// directory row must read names out of that shape however the host spells it.
check('directoryNames objects', directoryNames({ entries: [{ name: 'src' }, { path: 'C:/p/dist', name: '' }] }).join('|'),
  'src|dist')
check('directoryNames array form', directoryNames([{ name: 'a' }, { name: 'b' }]).join('|'), 'a|b')
check('directoryNames junk', directoryNames(null).length, 0)
check('probe list', ENV_PROBE_FILES.join('|'), 'package.json|tsconfig.json|Dockerfile|.nvmrc')
{
  const summary = packageSummary(JSON.stringify({
    name: 'demo', version: '1.2.3', private: true, type: 'module',
    packageManager: 'pnpm@9.0.0', engines: { node: '>=18' },
    scripts: { build: 'x', test: 'y' }, dependencies: { a: '1' }, devDependencies: { b: '1', c: '1' },
  }))
  check('packageSummary name', summary.name + '@' + summary.version, 'demo@1.2.3')
  check('packageSummary counts', [summary.scripts, summary.dependencies, summary.devDependencies].join('/'), '2/1/2')
  check('packageSummary manager', summary.packageManager, 'pnpm@9.0.0')
  check('packageSummary engines', enginesSummary(summary.engines), 'node >=18')
  check('packageSummary type', summary.moduleType, 'module')
}
check('packageSummary empty text', packageSummary(''), null)
check('packageSummary malformed', packageSummary('{oops').parseError, true)
check('packageSummary array json', packageSummary('[1,2]').parseError, true)
check('enginesSummary empty', enginesSummary(undefined), '')

/* --------------------------------- paths ---------------------------------- */

// Ancestor chains drive the picker's nestability rules: fill the gap to the nearest
// selected ancestor, and force a sibling's parent.
check('parentPathsOf deep', parentPathsOf('C:\\a\\b\\c').join('|'), 'C:/a/b|C:/a|C:')
check('parentPathsOf drive root', parentPathsOf('C:\\').join('|'), '')
check('parentPathsOf bare drive', parentPathsOf('C:').join('|'), '')
check('parentPathsOf posix', parentPathsOf('/home/user/x').join('|'), '/home/user|/home')
check('parentPathsOf normalizes', parentPathsOf('F:\\DSH-Official\\plugins').join('|'), 'F:/DSH-Official|F:')

check('normalizePath windows separators', normalizePath('C:\\Users\\yan\\proj\\'), 'C:/Users/yan/proj')
// A bare drive keeps the form the trail trim leaves; comparisons add the
// separator back, which the two ancestor checks below pin down.
check('normalizePath bare drive', normalizePath('C:'), 'C:')
check('normalizePath drive root', normalizePath('C:/'), 'C:')
check('drive root is an ancestor of its children', isAncestorPath('C:', 'C:/Users'), true)
check('a single-letter folder is not a drive', isAncestorPath('C:', 'C:x/y'), false)
check('normalizePath keeps posix root', normalizePath('/'), '/')
check('normalizePath empty', normalizePath(''), '')

check('ancestor direct child', isAncestorPath('C:/a', 'C:/a/b'), true)
check('ancestor is not a string prefix', isAncestorPath('C:/a', 'C:/ab'), false)
check('ancestor self is not ancestor', isAncestorPath('C:/a', 'C:/a'), false)
check('ancestor depth 2', isAncestorPath('C:/a', 'C:/a/b/c'), true)
check('ancestor case-insensitive', isAncestorPath('c:/A', 'C:/a/B'), true)

check('baseName trailing segment', baseName('C:/a/b'), 'b')
check('baseName drive root', baseName('C:/'), 'C:')

check('workspaceTitle empty falls back to folder name', workspaceTitle({ path: 'C:/a/b', title: '' }, 'WorkSpace'), 'b')
check('workspaceTitle keeps a custom name', workspaceTitle({ path: 'C:/a/b', title: '备注' }, 'WorkSpace'), '备注')
check('workspaceTitle maps the host default to the localized label', workspaceTitle({ path: 'C:/a/b', title: 'Workspace' }, '工作区'), '工作区')

/* ------------------------------ tree derivation --------------------------- */

const items = [
  { workspaceId: 'root', path: 'C:/projects', sessionIds: ['s1'] },
  { workspaceId: 'mid', path: 'C:/projects/alpha', sessionIds: ['s2'] },
  { workspaceId: 'deep', path: 'C:/projects/alpha/sub', sessionIds: ['s3'] },
  { workspaceId: 'sibling', path: 'C:/projects/beta', sessionIds: [] },
  { workspaceId: 'other', path: 'D:/other', sessionIds: [] },
  { workspaceId: 'lookalike', path: 'C:/projects-alpha', sessionIds: [] },
]
const tree = buildWorkspaceTree(items)
const parentOf = (id) => tree.parentOf.get(id)
check('roots are the unrelated and the top-level paths', tree.roots.map((w) => w.workspaceId), ['root', 'other', 'lookalike'])
check('deepest ancestor wins', parentOf('deep'), 'mid')
check('mid nests under root', parentOf('mid'), 'root')
check('a lookalike prefix is not a parent', parentOf('lookalike'), null)
check('children order follows the controller order', (tree.childrenOf.get('root') || []).map((w) => w.workspaceId), ['mid', 'sibling'])
check('collectSubtree walks depth first', collectSubtree(tree.parentOf, tree.childrenOf, 'root'), ['root', 'mid', 'deep', 'sibling'])
check('ancestorsOf is outermost first', ancestorsOf(tree.parentOf, 'deep'), ['root', 'mid'])
check('empty input', buildWorkspaceTree(undefined).roots, [])

/* --------------------------- reveal chains -------------------------------- */

const crumbs = [
  { name: 'C:', path: 'C:\\' },
  { name: 'projects', path: 'C:/projects' },
  { name: 'alpha', path: 'C:/projects/alpha' },
]
check('chain follows the host crumbs', chainForPath({ crumbs }, 'C:/projects/alpha'), ['C:', 'C:/projects', 'C:/projects/alpha'])
check('chain dedupes a repeated crumb', chainForPath({ crumbs: [...crumbs, { name: 'alpha', path: 'C:/projects/ALPHA' }] }, 'C:/projects/alpha'),
  ['C:', 'C:/projects', 'C:/projects/alpha'])
check('chain appends a target the crumbs omit', chainForPath({ crumbs: [crumbs[0], crumbs[1]] }, 'C:/projects/alpha'),
  ['C:', 'C:/projects', 'C:/projects/alpha'])
check('chain of a listing without crumbs', chainForPath({ crumbs: [] }, 'D:/other'), ['D:/other'])
check('chain of a listing without a crumbs field', chainForPath(undefined, 'D:/other'), ['D:/other'])
check('chain of an empty path', chainForPath({ crumbs: [] }, ''), [])

/* -------------------------------- formatting ------------------------------ */

// Badges print the compact figure (1500 -> 1.5K, 15000000 -> 15M); every other
// token surface (hover cards, model rows, totals line, chart ticks) goes through
// formatCount and prints exact digits with thousands separators.
check('formatTokens small', formatTokens(999), '999')
check('formatTokens thousands', formatTokens(1500), '1.5K')
check('formatTokens ten-thousands', formatTokens(15400), '15K')
check('formatTokens millions', formatTokens(15000000), '15M')
check('sumBuckets', sumBuckets({ uncachedInputTokens: 1, outputTokens: 2, cacheReadTokens: 3, cacheWriteTokens: 4 }), 10)
check('sumBuckets of nothing', sumBuckets(undefined), 0)
check('dayKey of a timestamp', dayKey(Date.parse('2026-10-04T10:00:00')), '2026-10-04')

const t = (key, params) => (params === undefined ? key : key + ':' + JSON.stringify(params))
check('relativeTime now', relativeTime(Date.now(), t), 'time.now')
check('relativeTime minutes', relativeTime(Date.now() - 5 * 60000, t), 'time.minutes:{"n":5}')
check('relativeTime hours', relativeTime(Date.now() - 3 * 3600000, t), 'time.hours:{"n":3}')
check('relativeTime invalid', relativeTime('not a date', t), '')

check('errorMessage of an Error', errorMessage(new Error('boom')), 'boom')
check('errorMessage of a string', errorMessage('plain'), 'plain')
check('timestamp of an ISO string', timestamp('2026-10-04T00:00:00Z'), Date.parse('2026-10-04T00:00:00Z'))
check('timestamp of junk', timestamp('nope'), 0)

/* ------------------------------ usage fallback ---------------------------- */

const own = { totals: { uncachedInputTokens: 5, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 }, models: { m: 1 }, days: {}, turns: [] }
const shipped = { uncachedInputTokens: 10, outputTokens: 2, cacheReadTokens: 1, cacheWriteTokens: 3 }
check('prefers this bundle projection', usageViewOf({ projectionValues: { [USAGE_KEY]: own, tokenUsage: shipped } }).models, { m: 1 })
const degraded = usageViewOf({ projectionValues: { tokenUsage: shipped } })
check('degrades to the shipped tokenUsage buckets', degraded.totals, { uncachedInputTokens: 10, outputTokens: 2, cacheReadTokens: 1, cacheWriteTokens: 3 })
check('degraded view is flagged', degraded.fallback, true)
check('no projections at all', usageViewOf({}), undefined)
check('no summary', usageViewOf(undefined), undefined)

/* --------------------------------- services ------------------------------- */

await boundCall({ ping: async () => 'pong' }, 'ping').then((value) => check('boundCall resolves', value, 'pong'))
await boundCall({}, 'missing').then(
  () => problems.push('boundCall should reject for a missing method'),
  (error) => check('boundCall rejects with a readable message', /unavailable/.test(error.message), true),
)

console.log('pure helpers: ' + String(names.length) + ' exported')
console.log('util unit: ' + String(problems.length === 0 ? 'ok' : 'failed'))
for (const problem of problems) console.log('  FAIL  ' + problem)
process.exit(problems.length === 0 ? 0 : 1)
