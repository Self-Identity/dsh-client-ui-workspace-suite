#!/usr/bin/env node
/**
 * Install-contract check.
 *
 * `check-bundle.mjs` (from the authoring skill) covers the generic bundle
 * shape. This script covers the contracts specific to a bundle that ships a
 * browser half, i.e. the ones that decide whether the client actually loads it:
 * the module-loader id must equal the package name, the client export must
 * exist and be a loader script, the patch row must name the package, the host
 * half must import nothing from `@deepseek-ai/*`, and the picker needs the
 * browse backend composed or it has no directory enumeration at all.
 *
 * Usage: node tools/test-manifest.mjs
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const problems = []
const fail = (message) => problems.push(message)
const read = (relative) => readFileSync(join(root, relative), 'utf8')
const exists = (relative) => existsSync(join(root, relative))

const manifest = JSON.parse(read('package.json'))
const pkg = manifest.name

/* ------------------------------- identity -------------------------------- */

if (basename(root) !== pkg) fail('directory name does not equal the package name: ' + basename(root) + ' vs ' + pkg)
if (pkg.startsWith('@')) fail('a locally authored plugin must not use a scope')
if (!/^dsh-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pkg)) fail('package name is not dsh-<category>-<topic> kebab-case: ' + pkg)
if (manifest.private !== true) fail('package.json should stay private')
if (manifest.type !== 'module') fail('package.json should be an ESM module')
if (manifest.engines === undefined || typeof manifest.engines.node !== 'string') fail('engines.node is not declared')

/* -------------------------------- exports -------------------------------- */

const clientExport = manifest.exports === undefined ? undefined : manifest.exports['./client']
if (typeof clientExport !== 'string') fail('exports["./client"] is missing; the browser half would never load')
else if (!exists(clientExport)) fail('exports["./client"] points at a missing file: ' + clientExport)

const hostExport = manifest.exports === undefined ? undefined : manifest.exports['.']
if (typeof hostExport !== 'string') fail('exports["."] is missing')
else if (!exists(hostExport)) fail('exports["."] points at a missing file: ' + hostExport)

if (manifest.exports !== undefined && manifest.exports['./package.json'] === undefined) {
  fail('exports["./package.json"] is required for the plugin inventory to read display metadata')
}

/* ---------------------------- module loader ------------------------------ */

if (typeof clientExport === 'string' && exists(clientExport)) {
  const bundle = read(clientExport)
  const loader = bundle.match(/window\.__ModuleLoader__\.load\(\{\s*id:\s*'([^']+)'/)
  if (loader === null) {
    fail('the client bundle is not a window.__ModuleLoader__.load({ id, factory }) script')
  } else if (loader[1] !== pkg) {
    fail('the loader id must equal the package name so dsh-client-modules attaches it: ' + loader[1] + ' vs ' + pkg)
  }
  if (!/factory:\s*\(require\)\s*=>/.test(bundle)) fail('the client bundle has no factory(require)')
  if (bundle.includes('\uFEFF')) fail('the client bundle carries a byte-order mark')
  for (const specifier of bundle.matchAll(/require\(\s*'([^']+)'\s*\)/g)) {
    const name = specifier[1]
    if (name !== 'react'
      && name !== '@deepseek-ai/dsh-client-store'
      && name !== '@deepseek-ai/dsh-client-ui-primitives') {
      fail('the client bundle requires a module outside the baseline externals: ' + name)
    }
  }
}

/* ------------------------------- host half ------------------------------- */

if (typeof hostExport === 'string' && exists(hostExport)) {
  const host = read(hostExport)
  if (/from\s+'@deepseek-ai\//.test(host) || /require\(\s*'@deepseek-ai\//.test(host)) {
    fail('the host half imports @deepseek-ai/*; this profile resolves it to an older generation')
  }
  if (!/export\s+(async\s+)?function\s+apply/.test(host) && !/export\s+default\s+class/.test(host)) {
    fail('the host half exports neither apply(ctx, config) nor a default Service class')
  }
  if (!host.includes('sessionProjections')) fail('the host half no longer registers the usage projection')
}

/* --------------------------------- patch --------------------------------- */

const patchPath = manifest.dsh?.bundle?.patch
if (typeof patchPath !== 'string' || !exists(patchPath)) {
  fail('dsh.bundle.patch is missing or points at a missing file')
} else {
  const patch = read(patchPath)
  const row = new RegExp('-\\s+id:\\s+workspace-suite\\s*\\n\\s+name:\\s+\'' + pkg + '\'').test(patch)
    || new RegExp('id:\\s+workspace-suite[\\s\\S]{0,80}?name:\\s+\'?' + pkg + '\'?').test(patch)
  if (!row) fail('the patch does not insert a row whose name is this package: ' + pkg)
  if (!/id:\s*directory-picker[\s\S]{0,40}?disabled:\s*true/.test(patch)) {
    fail('the patch does not pin the directory picker to a backend that implements list(): the explorer would have no enumeration')
  }
  if (!patch.includes('dsh-host-directory-picker-browse')) {
    fail('the patch does not compose the browse directory-picker backend')
  }
  if (!patch.includes('dsh-client-ui-directory-picker-browse')) {
    fail('the patch does not compose the shipped browse surface as the fallback when the picker module is off')
  }
}

/* ------------------------------- metadata -------------------------------- */

if (typeof manifest.icon === 'string') {
  if (!exists(manifest.icon)) fail('icon points at a missing file: ' + manifest.icon)
  else if (statSync(join(root, manifest.icon)).size > 256 * 1024) fail('icon exceeds the 256 KiB limit')
} else {
  fail('no icon declared; the bundle card falls back to default artwork')
}

for (const locale of ['en', 'zh']) {
  const path = 'locale/' + locale + '.json'
  if (!exists(path)) {
    fail('missing display locale: ' + path)
    continue
  }
  let parsed
  try {
    parsed = JSON.parse(read(path))
  } catch (error) {
    fail(path + ' is not valid JSON: ' + String(error))
    continue
  }
  if (parsed.meta === undefined || typeof parsed.meta.title !== 'string' || parsed.meta.title.length === 0) {
    fail(path + ' has no meta.title')
  }
  if (typeof parsed.meta.description !== 'string' || parsed.meta.description.length === 0) {
    fail(path + ' has no meta.description')
  }
}

/* ------------------------- hooks stay inside components ------------------ */

/*
 * Calling a component that owns hooks as a plain function folds those hooks into
 * the *caller's* hook list, so a data-dependent call site (a per-row menu, say)
 * makes the hook count vary with the data. React then throws error #300/#310 and
 * the pane degrades to its boundary notice — exactly the "overview fails when
 * jumping to another workspace" bug this guard exists to prevent from returning.
 *
 * The hook-owning set is discovered, not hard-coded: any `function Name(` whose
 * body up to the next top-level function mentions `React.use`.
 */
{
  const partDir = join(root, 'src')
  const parts = readdirSync(partDir).filter((name) => name.endsWith('.js')).sort()
  const sources = parts.map((name) => ({ name, text: readFileSync(join(partDir, name), 'utf8') }))
  const widgets = sources.find((part) => part.name === '35-widgets.js')
  const hookOwning = new Set()
  if (widgets !== undefined) {
    const starts = []
    const pattern = /^\s{4}function\s+([A-Za-z_$][\w$]*)\s*\(/gm
    let match = pattern.exec(widgets.text)
    while (match !== null) {
      starts.push({ name: match[1], index: match.index })
      match = pattern.exec(widgets.text)
    }
    for (let index = 0; index < starts.length; index += 1) {
      const from = starts[index].index
      const to = index + 1 < starts.length ? starts[index + 1].index : widgets.text.length
      // `useXxx` names are hooks, not components: calling those directly is the point.
      if (!/^use[A-Z]/.test(starts[index].name) && /React\.use/.test(widgets.text.slice(from, to))) {
        hookOwning.add(starts[index].name)
      }
    }
  }
  if (hookOwning.size === 0) fail('the hook-owning scan found nothing; it stopped working')
  for (const part of sources) {
    const lines = part.text.split('\n')
    for (let number = 0; number < lines.length; number += 1) {
      const line = lines[number]
      for (const name of hookOwning) {
        let index = line.indexOf(name + '(')
        while (index !== -1) {
          const before = line.slice(0, index).trimEnd()
          const isDefinition = /\bfunction\s+$/.test(before) || before.endsWith('function')
          const isElement = before.endsWith('E(') || before.endsWith(',')
          if (!isDefinition && !isElement) {
            fail(part.name + ':' + String(number + 1) + ' calls the hook-owning component ' + name
              + ' as a function; render it with E(' + name + ', {...}) instead')
          }
          index = line.indexOf(name + '(', index + 1)
        }
      }
    }
  }
  console.log('hook placement: ' + String(hookOwning.size) + ' hook-owning component(s) checked')
}

/* --------------------- the add flow keeps its chooser -------------------- */

/*
 * The picker withholds the "which workspace do you enter" chooser from selection
 * mode only. Keying that decision off `ownCreate` instead of the explicit `mode`
 * silently removed the chooser for the sidebar's own add button, whose dialog
 * instance always passes ownCreate.
 */
{
  const pickerText = readFileSync(join(root, 'src', '40-picker.js'), 'utf8')
  const declared = /const isAddFlow = (.+)/.exec(pickerText)
  if (declared === null) fail('the picker no longer declares isAddFlow')
  else if (!/mode === 'add'/.test(declared[1])) {
    fail('isAddFlow must follow the explicit mode; keying it off ownCreate hides the entry chooser for the sidebar add button')
  }
}

/* --------------------------------- files --------------------------------- */

for (const relative of ['lib/index.js', 'lib/client.js', 'README.md', 'cordis.patch.yml']) {
  if (!exists(relative)) fail('a required deliverable is missing: ' + relative)
}
if (!exists('tools/build.mjs')) fail('the build script is missing; lib/client.js could not be regenerated')

console.log('manifest contract: ' + pkg)
console.log('install contract: ' + String(problems.length === 0 ? 'ok' : 'failed'))
for (const problem of problems) console.log('  FAIL  ' + problem)
process.exit(problems.length === 0 ? 0 : 1)
