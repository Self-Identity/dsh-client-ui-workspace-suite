#!/usr/bin/env node
/**
 * Style discipline check for `src/30-styles.js`.
 *
 * Two claims in the objective depend on this file and cannot be seen without
 * the GUI: "both shipped appearances follow automatically" (a literal colour
 * would pin one theme) and the workspace layout rules (no viewport overflow, no
 * button wrapping, real scroll containers). Every rule below is a static
 * property of the stylesheet.
 *
 * Usage: node tools/test-styles.mjs
 */

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = join(root, 'src', '30-styles.js')
const source = readFileSync(file, 'utf8')
const problems = []
const fail = (message) => problems.push(message)

// The CSS lives in one array of string literals; keep everything between the
// first quote and the array's join so JS punctuation cannot fake a selector.
const start = source.indexOf('const STYLES = [')
const end = source.indexOf("].join('')", start)
if (start < 0 || end < 0) {
  console.error('test-styles: cannot locate the STYLES array')
  process.exit(2)
}
const css = source.slice(start, end)

/* ------------------------------ colours ---------------------------------- */

const colourLiteral = /:\s*(#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|\b(?:white|black|red|blue|green|gray|grey|orange|yellow|purple|pink|brown)\b)/g
// Two surfaces are deliberately outside the theme: the shipped hover card paints
// its own dark background in both appearances (so its text is fixed white/grey),
// and the picker's hover row is the theme's business blue with inverse text.
const INVERSE_PALETTE = /dws-hoverCard|dws-pickerRow/
for (const chunk of css.split('}')) {
  if (INVERSE_PALETTE.test(chunk)) continue
  for (const match of chunk.matchAll(colourLiteral)) {
    fail('literal colour in the stylesheet (breaks one of the two appearances): ' + match[0].trim())
  }
}

const variables = new Set()
for (const match of css.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)) variables.add(match[1])
for (const name of variables) {
  // Host tokens keep both appearances in step; `--suite-*` is this plugin's own
  // inline indentation variable, deliberately named apart from `--dsw-`/`--dsh-`.
  const owned = name.startsWith('--suite-')
  const host = name.startsWith('--dsw-') || name.startsWith('--dsh-') || name.startsWith('--ds-')
  if (!owned && !host) fail('custom property is neither a host token nor a plugin-owned variable: ' + name)
}

/* ------------------------------ layout ----------------------------------- */

if (css.includes('100vw')) fail('100vw used; it includes the scrollbar and overflows the shell')
if (!/\.dws-scroll\{[^}]*overflow-y:auto/.test(css.replace(/\s+/g, ''))) {
  const padded = css.replace(/\s+/g, '')
  if (!padded.includes('.dws-scroll{') || !padded.includes('overflow-y:auto')) {
    fail('.dws-scroll is not a vertical scroll container')
  }
}
const nowrap = (css.match(/white-space:nowrap/g) || []).length
if (nowrap < 8) fail('expected white-space:nowrap on every button/label; found ' + String(nowrap))
if (!css.includes('flex-shrink:0') && !css.includes('flex:none')) fail('buttons/controls never declare a non-shrinking box')
const minZero = (css.match(/min-(?:width|height):0/g) || []).length
if (minZero < 20) fail('flex children lack min-width/min-height:0 (' + String(minZero) + ' occurrences)')

/* --------------------------- selector hygiene ---------------------------- */

const padded = css.replace(/\s+/g, '')
const rules = padded.split('}')
let checked = 0
for (const rule of rules) {
  const brace = rule.indexOf('{')
  if (brace < 0) continue
  const selector = rule.slice(0, brace)
  if (selector.length === 0) continue
  checked += 1
  const allowed = selector.startsWith('html[data-platform="darwin"]')
    || selector.includes('.dws-')
    || selector.startsWith('.dws-')
  if (!allowed) fail('a rule is not scoped under the plugin prefix: ' + selector)
  if (selector.includes('*') && !selector.includes('.dws-')) fail('a universal selector is unscoped: ' + selector)
}
if (checked < 60) fail('expected the stylesheet to define at least 60 rules; found ' + String(checked))

/* ----------------------------- focus + toast ----------------------------- */

if (!css.includes('focus-visible')) fail('no :focus-visible styling; keyboard focus would be invisible')
if (!css.includes('outline')) fail('no focus outline declared')

// The collapsed rail is 56px wide: its header must stack instead of rowing.
if (!/\.dws-header--rail\{[^}]*flex-direction:column/.test(padded)) {
  fail('the rail header does not stack into a column; four icons would overflow the 56px rail')
}

// The global panel must own its height and scroll on an inner body (the shipped
// entry pages do `height:100%` + `overflow:auto`); relying on a parent's flex
// height leaves the page content-sized.
if (!/\.dws-page\{[^}]*height:100%/.test(padded)) fail('.dws-page does not claim height:100%')
if (!/\.dws-page\{[^}]*display:flex/.test(padded)) fail('.dws-page is not a flex column')
if (!/\.dws-pageBody\{[^}]*overflow-y:auto/.test(padded)) fail('.dws-pageBody is not the scroll container')
if (!/\.dws-pageHeader\{[^}]*padding:28px/.test(padded)) fail('.dws-pageHeader does not pad 28px like the shipped pages')
if (!padded.includes('html[data-platform="darwin"].dws-pageHeader{padding-top:calc(28px+var(--dsh-frame-top-clearance,0px))')) {
  fail('the darwin heading padding override is missing')
}
if (!/\.dws-pageInner\{[^}]*max-width:960px/.test(padded)) fail('.dws-pageInner is not capped at the shipped 960px column')
if (!/\.dws-pageInner\{[^}]*margin:0auto/.test(padded)) fail('.dws-pageInner is not centred')

console.log('style rules: ' + String(checked) + ' scoped rules, ' + String(variables.size) + ' host tokens, ' + String(nowrap) + ' nowrap declarations')
console.log('style discipline: ' + String(problems.length === 0 ? 'ok' : 'failed'))
for (const problem of problems) console.log('  FAIL  ' + problem)
process.exit(problems.length === 0 ? 0 : 1)
