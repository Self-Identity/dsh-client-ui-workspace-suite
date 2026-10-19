#!/usr/bin/env node
/**
 * Release helper for a DSH plugin package.
 *
 *   node tools/release.mjs --check
 *       Validate the fields the client and the plugin market require, and that the
 *       committed build output is up to date with `src/`.
 *
 *   node tools/release.mjs --index --repo <git-url> [--npm] [--write <file>]
 *       Print (and with --write, merge into) the market-index entry for this package:
 *       format 1, git source pinned to the current commit, plus an npm version entry
 *       when --npm is passed.
 *
 * Options: --commit <sha> --timestamp <unix-seconds> --version <semver>
 * The script exits 1 with an [ERROR] line when a check fails, 0 with [OK] otherwise.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const problems = []
const notes = []
const fail = (message) => problems.push(message)
const ok = (message) => notes.push(message)

const argv = process.argv.slice(2)
const hasFlag = (name) => argv.includes(name)
function argOf(name, fallback) {
  const index = argv.indexOf(name)
  return index !== -1 && argv[index + 1] !== undefined ? argv[index + 1] : fallback
}

const manifestPath = join(root, 'package.json')
if (!existsSync(manifestPath)) {
  console.log('[ERROR] package.json is missing')
  process.exit(1)
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

const NPM_NAME = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/
const COMMIT = /^[0-9a-f]{40}$/

/* ------------------------------- checks ---------------------------------- */

if (typeof manifest.name !== 'string' || !NPM_NAME.test(manifest.name)) {
  fail('package name is not a valid npm name: ' + String(manifest.name))
}
if (typeof manifest.version !== 'string' || !SEMVER.test(manifest.version)) {
  fail('version is not an exact SemVer: ' + String(manifest.version))
}
if (manifest.private === true) {
  fail('"private": true blocks an npm publish and market installs; set it to false')
}
const enginesDsh = manifest.engines === undefined ? undefined : manifest.engines.dsh
if (typeof enginesDsh !== 'string' || enginesDsh.trim() === '') {
  fail('engines.dsh is required so the client can refuse an incompatible host; e.g. ">=0.2.1-rc.2 <0.3.0"')
}
if (manifest.dsh === undefined || manifest.dsh.bundle === undefined
  || typeof manifest.dsh.bundle.patch !== 'string') {
  fail('dsh.bundle.patch is required')
} else if (!existsSync(join(root, manifest.dsh.bundle.patch))) {
  fail('dsh.bundle.patch points at a missing file: ' + manifest.dsh.bundle.patch)
}
if (manifest.dsh !== undefined && manifest.dsh.client !== undefined
  && manifest.dsh.client.platform === undefined) {
  fail('dsh.client.platform is missing (expected "web")')
}

for (const entry of ['lib/index.js', 'lib/client.js']) {
  if (!existsSync(join(root, entry))) fail('missing build output: ' + entry)
}
if (!existsSync(join(root, 'README.md'))) fail('README.md is missing')
if (!existsSync(join(root, 'LICENSE'))) fail('LICENSE is missing')
if (!Array.isArray(manifest.files) || !manifest.files.includes('lib')) {
  fail('"files" must include lib/ so the published package carries the built bundle')
}
const iconPath = typeof manifest.icon === 'string' ? join(root, manifest.icon) : undefined
if (iconPath !== undefined) {
  if (!existsSync(iconPath)) fail('icon points at a missing file: ' + manifest.icon)
  else {
    // A data: icon is capped at 32 KiB decoded, and base64 inflates by 4/3.
    const bytes = statSync(iconPath).size
    if (bytes > 24 * 1024) fail('icon is ' + String(bytes) + ' bytes; keep it under 24 KiB (32 KiB after base64)')
  }
}

// The build output must not be older than the newest source file.
const newest = (dir, skip) => {
  let latest = 0
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name)
    if (skip.some((ignored) => full.includes(ignored))) continue
    const stamp = name.isDirectory() ? newest(full, skip) : statSync(full).mtimeMs
    if (stamp > latest) latest = stamp
  }
  return latest
}
const sourceDir = join(root, 'src')
if (existsSync(sourceDir) && existsSync(join(root, 'lib/client.js'))) {
  const sourceTime = newest(sourceDir, [])
  const bundleTime = statSync(join(root, 'lib/client.js')).mtimeMs
  if (sourceTime > bundleTime) {
    fail('lib/client.js is older than src/; run `node tools/build.mjs` and commit the result')
  }
}

/* --------------------------- index generation ---------------------------- */

function gitHead() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

function marketEntry() {
  const repo = argOf('--repo', '')
  const version = argOf('--version', manifest.version)
  const timestamp = argOf('--timestamp', String(Math.floor(Date.now() / 1000)))
  const commit = argOf('--commit', gitHead())
  if (repo === '') fail('--index needs --repo <git url> (e.g. https://github.com/<account>/<repo>)')
  if (!SEMVER.test(version)) fail('--version is not an exact SemVer: ' + version)
  if (!/^\d+$/.test(timestamp)) fail('--timestamp must be Unix seconds')
  const versions = []
  if (hasFlag('--npm')) {
    versions.push({ version, publishTimestamp: Number(timestamp), source: { type: 'npm' } })
  }
  if (commit !== '' && COMMIT.test(commit)) {
    versions.push({
      version,
      publishTimestamp: Number(timestamp),
      source: { type: 'git', url: repo, commit },
      ...(enginesDsh === undefined ? {} : { engines: { dsh: enginesDsh } }),
    })
  } else if (!hasFlag('--npm')) {
    fail('no usable commit for a git source (run inside the git checkout, or pass --commit)')
  } else {
    fail('--commit must be a lowercase 40-hex SHA when a git source is written')
  }
  if (versions.length === 0) fail('no version entry could be built')
  return {
    name: manifest.name,
    title: manifest.name,
    description: manifest.description,
    author: argOf('--author', undefined),
    homepage: repo === '' ? undefined : repo,
    repository: repo === '' ? undefined : { type: 'git', url: repo },
    metadata: { keywords: [] },
    versions,
  }
}

function writeIndex(entry) {
  const target = resolve(root, argOf('--write', 'market/plugin-market.json'))
  let index = { format: 1, title: 'DSH plugin market', metadata: { categories: {}, labels: {} }, plugins: [] }
  if (existsSync(target)) {
    try {
      index = JSON.parse(readFileSync(target, 'utf8'))
    } catch (error) {
      fail('existing index is not valid JSON: ' + String(error.message))
      return
    }
  }
  const plugins = Array.isArray(index.plugins) ? index.plugins.filter((item) => item.name !== entry.name) : []
  // Keep every previously published version, replacing only the same version number.
  const previous = Array.isArray(index.plugins)
    ? index.plugins.find((item) => item.name === entry.name)
    : undefined
  if (previous !== undefined && Array.isArray(previous.versions)) {
    for (const version of previous.versions) {
      if (entry.versions.every((next) => next.version !== version.version)) {
        entry.versions.push(version)
      }
    }
  }
  entry.versions.sort((left, right) => (left.version < right.version ? 1 : -1))
  plugins.push(entry)
  index.plugins = plugins
  if (index.format !== 1) fail('index format must stay 1')
  writeFileSync(target, JSON.stringify(index, null, 2) + '\n', 'utf8')
  ok('wrote ' + relative(root, target))
  return target
}

/* -------------------------------- report --------------------------------- */

if (hasFlag('--check') || hasFlag('--index') || argv.length === 0) {
  const entry = hasFlag('--index') ? marketEntry() : undefined
  console.log('plugin: ' + manifest.name + '@' + String(manifest.version))
  for (const note of notes) console.log('[OK] ' + note)
  if (problems.length === 0) {
    console.log('[OK] release metadata is consistent')
    if (entry !== undefined && hasFlag('--write')) writeIndex(entry)
    if (entry !== undefined) console.log(JSON.stringify(entry, null, 2))
  } else {
    for (const problem of problems) console.log('[ERROR] ' + problem)
  }
}

if (problems.length > 0) process.exit(1)
process.exit(0)
