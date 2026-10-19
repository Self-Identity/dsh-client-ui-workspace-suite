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
// The markdown renderer (25-markdown.js) shares this closure and only needs `E`, so it
// is evaluated with the same stub and its parsers become testable too.
const markdownSource = readFileSync(join(root, 'src', '25-markdown.js'), 'utf8')

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
  'selectionStep', 'isBoundaryPath', 'isSiblingPath', 'parentPathOf', 'scrollbarWidthOf', 'mergeSettings',
  'comparePathNatural', 'subtreeOfPath', 'markdownBlocks', 'markdownInline', 'isSafeHref', 'iconColorOf',
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
  // The bundle's element helper lives outside 20-util.js; the markdown renderer needs
  // it, so the harness supplies a shape-preserving stub.
  'const E = (type, props, ...children) => ({ type, props, children });',
].join('\n')

const exported = vm.runInNewContext(
  preamble + '\n' + source + '\n' + markdownSource + '\n;({' + names.join(', ') + '})',
  { console: { warn: () => {} }, setTimeout, clearTimeout, Number, Object, Array, String, Date, JSON, Math, Promise, Error, Map, Set, AbortController },
  { filename: 'src/20-util.js + src/25-markdown.js' },
)

for (const name of names) {
  if (exported[name] === undefined) problems.push('helper not exported: ' + name)
}

const {
  normalizePath, isAncestorPath, baseName, workspaceTitle, buildWorkspaceTree, parentPathsOf,
  collectSubtree, ancestorsOf, chainForPath, formatTokens, sumBuckets, dayKey, relativeTime,
  errorMessage, timestamp, usageViewOf, boundCall, USAGE_KEY,
  directoryNames, packageSummary, enginesSummary, ENV_PROBE_FILES,
  selectionStep, isBoundaryPath, isSiblingPath, parentPathOf, scrollbarWidthOf, mergeSettings,
  comparePathNatural, subtreeOfPath, markdownBlocks, markdownInline, isSafeHref, iconColorOf,
} = exported

/* ---------------------------- icon colour input --------------------------- */

// The value lands in a CSS custom property, so anything but plain hex must be dropped
// (an arbitrary string there could smuggle extra declarations into the page).
check('icon colour: empty means theme', iconColorOf({ folderIconColor: '' }), '')
check('icon colour: missing means theme', iconColorOf({}), '')
check('icon colour: six-digit hex', iconColorOf({ folderIconColor: '#4D6BFE' }), '#4d6bfe')
check('icon colour: three-digit hex', iconColorOf({ folderIconColor: '#abc' }), '#abc')
check('icon colour: eight-digit hex', iconColorOf({ folderIconColor: '#11223344' }), '#11223344')
check('icon colour: trims whitespace', iconColorOf({ folderIconColor: '  #fff  ' }), '#fff')
check('icon colour: rejects a bare name', iconColorOf({ folderIconColor: 'red' }), '')
check('icon colour: rejects a css injection', iconColorOf({ folderIconColor: '#000;background:url(x)' }), '')
check('icon colour: rejects a var()', iconColorOf({ folderIconColor: 'var(--x)' }), '')
check('icon colour: rejects a non-string', iconColorOf({ folderIconColor: 12 }), '')

/* --------------------------- markdown renderer ---------------------------- */

// The README card used to print the raw file because the host renderer is absent
// from this client build; these parsers are what replaced it.
const mdKinds = (text) => markdownBlocks(text).map((block) => block.kind).join(',')
check('markdown: heading then list', mdKinds('# Title\n\n- a\n- b'), 'heading,list')
check('markdown: list item count', markdownBlocks('- a\n- b\n- c')[0].items.length, 3)
check('markdown: ordered list', markdownBlocks('1. a\n2. b')[0].ordered, true)
check('markdown: fenced code keeps its body',
  markdownBlocks('```js\nconst a = 1\n```')[0].text, 'const a = 1')
check('markdown: fenced code language', markdownBlocks('```js\nx\n```')[0].lang, 'js')
check('markdown: table head/rows',
  (() => {
    const table = markdownBlocks('| a | b |\n| --- | --- |\n| 1 | 2 |')[0]
    return table.kind + ':' + table.head.length + ':' + table.rows.length
  })(), 'table:2:1')
check('markdown: quote', mdKinds('> quoted'), 'quote')
check('markdown: rule', mdKinds('---'), 'rule')
check('markdown: paragraph groups lines', markdownBlocks('one\ntwo')[0].text, 'one\ntwo')
check('markdown: unsafe href rejected', isSafeHref('javascript:alert(1)'), false)
check('markdown: https href allowed', isSafeHref('https://example.com/x'), true)
check('markdown: inline keeps plain text around elements',
  markdownInline('a **b** c').filter((part) => typeof part === 'string').join('|'), 'a | c')
check('markdown: inline code becomes an element',
  markdownInline('`x`').length, 1)

/* --------------------- hero chooser: natural path order -------------------- */

// The subtree chooser used the host snapshot's order, which listed the children
// reversed (root - 4 - 3 - 2 - 1). Sorting by path makes it read root - 1 - 2 - 3.
const subtreeFixture = [
  { workspaceId: 'r4', path: 'C:/w/4' },
  { workspaceId: 'r2', path: 'C:/w/2' },
  { workspaceId: 'root', path: 'C:/w' },
  { workspaceId: 'r10', path: 'C:/w/10' },
  { workspaceId: 'r1', path: 'C:/w/1' },
  { workspaceId: 'other', path: 'C:/x/9' },
]
check('subtrees: root first, children naturally ordered',
  subtreeOfPath(subtreeFixture, subtreeFixture[2]).map((item) => item.workspaceId).join(','),
  'root,r1,r2,r4,r10')
check('paths: numeric segments compare as numbers', comparePathNatural('C:/w/2', 'C:/w/10') < 1, true)
check('paths: a prefix sorts first', comparePathNatural('C:/w', 'C:/w/1') < 1, true)
check('paths: case-insensitive', comparePathNatural('C:/W/a', 'c:/w/b') < 1, true)
check('paths: equal prefix depth', comparePathNatural('C:/w/1', 'C:/w/1'), 0)

/* ------------------------- settings default merge -------------------------- */

// Settings persisted by an older build lack the keys added since; reading them
// as-is made `moduleHeroMenu === true` false and silently turned the takeover off.
check('settings merge: stored value wins', mergeSettings({ a: true, b: 2 }, { a: false }).a, false)
check('settings merge: missing key keeps the default', mergeSettings({ a: true, b: 2 }, { a: false }).b, 2)
check('settings merge: explicit undefined keeps the default', mergeSettings({ a: 1 }, { a: undefined }).a, 1)
check('settings merge: unknown keys dropped',
  Object.prototype.hasOwnProperty.call(mergeSettings({ a: 1 }, { a: 2, zz: 9 }), 'zz'), false)
check('settings merge: null snapshot', mergeSettings({ a: 1 }, null).a, 1)
check('settings merge: empty defaults', JSON.stringify(mergeSettings({}, { a: 1 })), '{}')

/* ---------------------------- scrollbar width ----------------------------- */

check('scrollbar: default is 8px', scrollbarWidthOf({}), '8px')
check('scrollbar: missing settings', scrollbarWidthOf(undefined), '8px')
check('scrollbar: honours the setting', scrollbarWidthOf({ scrollbarWidth: 12 }), '12px')
check('scrollbar: clamps low', scrollbarWidthOf({ scrollbarWidth: 1 }), '4px')
check('scrollbar: clamps high', scrollbarWidthOf({ scrollbarWidth: 99 }), '20px')
check('scrollbar: rounds fractions', scrollbarWidthOf({ scrollbarWidth: 9.6 }), '10px')
check('scrollbar: ignores junk', scrollbarWidthOf({ scrollbarWidth: 'wide' }), '8px')

/* ---------------------- picker selection constraints ---------------------- */

// The four rules the user asked for, as a pure state machine: an orphan next to
// its own parent, a silently replaced tree, or a drive root pulled in as a
// workspace all read to the user as "the selection constraints went chaotic".
const pick = (entries, path) => selectionStep(entries.map((value) => ({ path: value })), path)
const pathsOf = (step) => (step.paths === undefined ? step.action : step.paths.join('|'))

check('boundary: drive root', isBoundaryPath('C:\\'), true)
check('boundary: posix root', isBoundaryPath('/'), true)
check('boundary: ordinary folder', isBoundaryPath('C:/a'), false)
check('parentPathOf: drive child', parentPathOf('C:\\x'), 'c:')
check('parentPathOf: posix child', parentPathOf('/x'), '/')
check('parentPathOf: drive root', parentPathOf('C:\\'), '')
check('siblings: same drive', isSiblingPath('C:/x', 'C:/y'), true)
check('siblings: posix root children', isSiblingPath('/a', '/b'), true)
check('siblings: drive roots are not siblings', isSiblingPath('C:/', 'D:/'), false)
check('siblings: different trees', isSiblingPath('F:/p/one', 'F:/q/two'), false)

check('rule 1: a first pick adds only itself', pathsOf(pick([], 'C:/a/b')), 'C:/a/b')
check('rule 1: unchecking removes the subtree', JSON.stringify(pick(['C:/a', 'C:/a/b', 'C:/a/b/c'], 'C:/a/b')),
  JSON.stringify({ action: 'remove', keys: ['c:/a/b', 'c:/a/b/c'] }))
check('rule 1: unchecking leaves the rest alone',
  JSON.stringify(pick(['C:/a', 'C:/a/b', 'C:/d'], 'C:/a/b').keys), JSON.stringify(['c:/a/b']))
check('rule 2: an unrelated pick conflicts', pick(['C:/a'], 'D:/x').action, 'conflict')
check('rule 2: a descendant is not a conflict', pathsOf(pick(['C:/a'], 'C:/a/b')), 'C:/a/b')
check('rule 2: an ancestor is not a conflict', pathsOf(pick(['C:/a'], 'C:/')), 'C:/')
check('rule 3: fills the gap to the selected ancestor', pathsOf(pick(['C:/a'], 'C:/a/b/c')), 'C:/a/b|C:/a/b/c')
check('rule 3: adds nothing when the parent chain is solid', pathsOf(pick(['C:/a', 'C:/a/b'], 'C:/a/b/c')), 'C:/a/b/c')
check('rule 4: a sibling pulls in the common parent', pathsOf(pick(['C:/a/x'], 'C:/a/y')), 'C:/a|C:/a/y')
check('rule 4: posix siblings too', pathsOf(pick(['/home/u/a'], '/home/u/b')), '/home/u|/home/u/b')
check('rule 4: never pulls in a drive boundary', pathsOf(pick(['C:/x'], 'C:/y')), 'C:/y')
check('rule 4: never pulls in the posix root', pathsOf(pick(['/a'], '/b')), '/b')
check('rule 4: a different tree on the same drive still conflicts',
  pick(['F:/p/one'], 'F:/q/two').action, 'conflict')

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
