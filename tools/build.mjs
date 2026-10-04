#!/usr/bin/env node
/**
 * Assemble `lib/client.js` from the ordered `src/*.js` parts.
 *
 * The browser half of a bundle is one file fetched by the client module table,
 * so the sources are concatenated in filename order (`00-` … `90-`). A UTF-8
 * BOM is stripped from every part: a byte-order mark in the middle of the
 * concatenated bundle is not a valid script character.
 *
 * Usage: node tools/build.mjs [--check]
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'src')
const outFile = join(root, 'lib', 'client.js')

if (!existsSync(srcDir)) {
  console.error('build: missing src directory: ' + srcDir)
  process.exit(1)
}

const parts = readdirSync(srcDir)
  .filter((name) => name.endsWith('.js'))
  .sort()

if (parts.length === 0) {
  console.error('build: no source parts in ' + srcDir)
  process.exit(1)
}

const chunks = []

/**
 * Source parts other than the dictionary must stay pure ASCII: a UTF-8 file
 * round-tripped through a GBK code page turns `│`, `├` or `·` into valid CJK
 * look-alikes with no U+FFFD to detect, which is how a mojibake separator
 * reaches a release. Em/en dashes are tolerated because they only appear in
 * comments.
 */
const NON_ASCII_OK = new Set([0x2014, 0x2013])

for (const name of parts) {
  let text = readFileSync(join(srcDir, name), 'utf8')
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  if (text.includes('\uFFFD')) {
    console.error('build: ' + name + ' contains U+FFFD; the file was decoded with the wrong encoding')
    process.exit(1)
  }
  if (name !== '10-i18n.js') {
    const offenders = []
    for (const character of text) {
      const code = character.codePointAt(0)
      if (code > 127 && !NON_ASCII_OK.has(code)) offenders.push('U+' + code.toString(16).toUpperCase() + ' ' + JSON.stringify(character))
    }
    if (offenders.length > 0) {
      console.error('build: ' + name + ' contains ' + String(offenders.length) + ' non-ASCII character(s) outside the dictionary:')
      for (const offender of [...new Set(offenders)].slice(0, 12)) console.error('         ' + offender)
      console.error('         Use a \\uXXXX escape so an encoding round-trip cannot corrupt it.')
      process.exit(1)
    }
  }
  chunks.push(text.replace(/\s+$/, ''))
  console.log('build: + ' + name + ' (' + String(Buffer.byteLength(text, 'utf8')) + ' bytes)')
}

const banner = '/**\n'
  + ' * dsh-client-ui-workspace-suite — generated browser bundle. DO NOT EDIT.\n'
  + ' *\n'
  + ' * Assembled from src/*.js by tools/build.mjs; edit a source part and re-run\n'
  + ' * `node tools/build.mjs`.\n'
  + ' */\n'

const output = banner + chunks.join('\n\n') + '\n'
writeFileSync(outFile, output, 'utf8')
console.log('build: wrote ' + outFile + ' (' + String(Buffer.byteLength(output, 'utf8')) + ' bytes)')
