#!/usr/bin/env node
/**
 * Localization self-check: the zh and en dictionaries must carry the same key
 * set, and every key used through `t('…')` in any source part must exist in
 * both. A missing key would render a raw identifier in the UI.
 *
 * Usage: node tools/test-i18n.mjs
 */

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'src')
const problems = []

const dictionary = readFileSync(join(srcDir, '10-i18n.js'), 'utf8')
const englishAt = dictionary.indexOf('const en = {')
if (englishAt < 0) {
  console.error('test-i18n: cannot locate the english dictionary')
  process.exit(2)
}
const zhText = dictionary.slice(0, englishAt)
const enText = dictionary.slice(englishAt)

const keysOf = (text) => {
  const found = new Set()
  for (const match of text.matchAll(/^\s*'([a-zA-Z0-9._]+)':/gm)) found.add(match[1])
  return found
}

const zhKeys = keysOf(zhText)
const enKeys = keysOf(enText)

for (const key of zhKeys) if (!enKeys.has(key)) problems.push('en dictionary is missing key: ' + key)
for (const key of enKeys) if (!zhKeys.has(key)) problems.push('zh dictionary is missing key: ' + key)

const used = new Set()
for (const name of readdirSync(srcDir)) {
  if (!name.endsWith('.js')) continue
  const text = readFileSync(join(srcDir, name), 'utf8')
  for (const match of text.matchAll(/\bt\(\s*'([a-zA-Z0-9._]+)'/g)) used.add(match[1])

  // Encoding guard. Only the dictionary may carry non-ASCII text: a UTF-8 part
  // round-tripped through a GBK code page turns `│`, `├` or `·` into valid CJK
  // look-alikes that no U+FFFD check can see (this shipped once as `鈹溾攢 `).
  if (name !== '10-i18n.js') {
    for (const character of text) {
      const code = character.codePointAt(0)
      if (code > 127 && code !== 0x2014 && code !== 0x2013) {
        problems.push(name + ' carries non-ASCII ' + JSON.stringify(character) + ' (U+' + code.toString(16).toUpperCase()
          + '); use a \\uXXXX escape so an encoding round-trip cannot corrupt it')
      }
    }
  }
}

// Mojibake markers: characters that a mis-decoded UTF-8 sequence produces and
// that no user-facing Chinese string in this plugin legitimately needs.
const MOJIBAKE = ['鈹', '溾', '攢', '鈥', '锛', '銆', '鎼', '钀', '鏄', '鐨', '鐜']
for (const name of readdirSync(srcDir)) {
  if (!name.endsWith('.js')) continue
  const text = readFileSync(join(srcDir, name), 'utf8')
  for (const marker of MOJIBAKE) {
    if (text.includes(marker)) problems.push(name + ' contains the mojibake marker ' + JSON.stringify(marker))
  }
}

for (const key of used) {
  if (!zhKeys.has(key)) problems.push('used key absent from both dictionaries: ' + key)
}

const unused = [...zhKeys].filter((key) => !used.has(key))

console.log('dictionary keys: ' + String(zhKeys.size) + ' (zh) / ' + String(enKeys.size) + ' (en)')
console.log('keys used in src: ' + String(used.size))
if (unused.length > 0) console.log('unused keys (informational): ' + unused.join(', '))
for (const problem of problems) console.log('  FAIL  ' + problem)
console.log('i18n: ' + String(problems.length === 0 ? 'ok' : 'failed'))
process.exit(problems.length === 0 ? 0 : 1)
