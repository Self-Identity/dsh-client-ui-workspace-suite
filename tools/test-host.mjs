#!/usr/bin/env node
/**
 * Unit test for the host half's `sessionProjections` unit.
 *
 * Loads `lib/index.js`, captures the registered definition through a fake
 * registry, then drives it with synthetic durable events and asserts the folded
 * ledger: replacement discipline, per-model buckets, per-day per-model buckets
 * and the compact per-turn list.
 *
 * Usage: node tools/test-host.mjs
 */

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const problems = []
const check = (label, actual, expected) => {
  const left = JSON.stringify(actual)
  const right = JSON.stringify(expected)
  if (left !== right) problems.push(label + ': expected ' + right + ', got ' + left)
}

const plugin = await import(new URL('../lib/index.js', import.meta.url).href)

/**
 * Deep lossless-JSON check: the gateway refuses to forward a host event whose
 * payload is not lossless JSON, and this unit's view is that payload for a
 * session row. `undefined` is the silent killer — `JSON.stringify` drops it, so
 * a round-trip comparison alone cannot see it, which is exactly how a
 * `route: undefined` field shipped once and broke session creation.
 */
function losslessProblems(value, path, seen) {
  const out = []
  const visited = seen === undefined ? new Set() : seen
  if (value === null) return out
  const type = typeof value
  if (type === 'string' || type === 'boolean') return out
  if (type === 'number') {
    if (!Number.isFinite(value)) out.push(path + ' is a non-finite number')
    return out
  }
  if (type === 'undefined') {
    out.push(path + ' is undefined')
    return out
  }
  if (type === 'function' || type === 'symbol' || type === 'bigint') {
    out.push(path + ' is a ' + type)
    return out
  }
  if (visited.has(value)) {
    out.push(path + ' is circular')
    return out
  }
  visited.add(value)
  if (Array.isArray(value)) {
    value.forEach((item, index) => out.push(...losslessProblems(item, path + '[' + String(index) + ']', visited)))
    return out
  }
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) {
    out.push(path + ' is not a plain object (Map/Set/Date/class instance)')
    return out
  }
  for (const [key, item] of Object.entries(value)) out.push(...losslessProblems(item, path + '.' + key, visited))
  return out
}

const checkLossless = (label, value) => {
  const found = losslessProblems(value, label)
  if (found.length > 0) problems.push(label + ' is not lossless JSON: ' + found.join('; '))
}

let definition = null
const ctx = {
  inject(deps, callback) {
    if (!deps.includes('sessionProjections')) throw new Error('unexpected inject deps: ' + String(deps))
    callback({ sessionProjections: { register: (def) => {
      definition = def
      return () => {}
    } } })
  },
}

if (typeof plugin.apply !== 'function') problems.push('host half exports no apply function')
else plugin.apply(ctx)

if (definition === null) {
  problems.push('no projection was registered')
} else {
  check('projection key', definition.key, 'workspaceSuiteUsage')
  if (typeof definition.stateVersion !== 'number') problems.push('stateVersion is not a number')
  if (definition.wire === undefined || typeof definition.wire.view !== 'function') problems.push('wire.view missing')
  if (typeof definition.stateSchema?.parse !== 'function') problems.push('stateSchema.parse missing')
  if (typeof definition.wire?.viewSchema?.parse !== 'function') problems.push('wire.viewSchema.parse missing')

  const day1 = Date.parse('2026-10-01T10:00:00Z')
  const day2 = Date.parse('2026-10-02T10:00:00Z')
  const event = (type, data, time) => ({ type, data, time, seq: 0 })

  let state = definition.init({}, 0)
  checkLossless('init state', state)
  const drive = (events) => {
    for (const item of events) state = definition.apply(state, item)
  }

  // Turn 1, step 1: one attempt sampled twice (streaming then final), then a retry.
  drive([
    event('request/header', { header: { config: { provider: 'deepseek-official', model: 'deepseek-flash' } } }, day1),
    event('step/start', { turn: 1, step: 1 }, day1),
    event('assistant/attempt', { turn: 1, step: 1, stream: [{ usage: { inputTokens: 100, outputTokens: 20, cacheReadTokens: 5, cacheWriteTokens: 0 } }] }, day1),
    event('assistant/message', {
      turn: 1,
      step: 1,
      usage: { inputTokens: 100, outputTokens: 50, cacheReadTokens: 5, cacheWriteTokens: 0 },
      message: { source: { provider: 'deepseek-official', model: 'deepseek-flash' } },
    }, day1),
  ])
  check('totals after replacement', state.totals, {
    uncachedInputTokens: 100, outputTokens: 50, cacheReadTokens: 5, cacheWriteTokens: 0,
  })
  checkLossless('state after the first attempt', state)

  // A retry in the same slot is billed again.
  drive([
    event('llm/retry-started', { turn: 1, step: 1 }, day1),
    event('assistant/message', {
      turn: 1,
      step: 1,
      usage: { inputTokens: 80, outputTokens: 40, cacheReadTokens: 0, cacheWriteTokens: 0 },
      message: { source: { provider: 'deepseek-official', model: 'deepseek-flash' } },
    }, day1),
  ])
  check('totals after retry', state.totals, {
    uncachedInputTokens: 180, outputTokens: 90, cacheReadTokens: 5, cacheWriteTokens: 0,
  })
  check('model buckets', state.models['deepseek-official/deepseek-flash'], state.totals)
  check('day buckets carry the model split', state.days['2026-10-01'], {
    'deepseek-official/deepseek-flash': state.totals,
  })

  // Turn 2 on another model, another day.
  drive([
    event('request/header', { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-pro' } } }, day2),
    event('step/start', { turn: 2, step: 1 }, day2),
    event('assistant/message', {
      turn: 2,
      step: 1,
      usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 1, cacheWriteTokens: 2 },
      message: { source: { provider: 'deepseek-official', model: 'deepseek-v4-pro' } },
    }, day2),
  ])
  check('totals across models', state.totals, {
    uncachedInputTokens: 190, outputTokens: 95, cacheReadTokens: 6, cacheWriteTokens: 2,
  })
  check('two models', Object.keys(state.models).length, 2)
  check('two days', Object.keys(state.days).length, 2)
  check('turn list', state.turns, [[1, 275], [2, 18]])
  checkLossless('state after two turns', state)
  checkLossless('wire view', definition.wire.view(state))

  // Unrelated events must return the same reference (the registry's change gate).
  const before = state
  state = definition.apply(state, event('tool/result', {}, day2))
  if (state !== before) problems.push('an unrelated event produced a new state reference')
  check('wire.view is identity', definition.wire.view(before) === before, true)

  // Checkpoint round-trip: the cache persists the state as JSON and the registry
  // re-parses it through `stateSchema` before folding the remaining tail, so a
  // JSON round-trip must be lossless for the fold's purposes.
  const checkpoint = JSON.parse(JSON.stringify(before))
  check('checkpoint survives JSON', checkpoint.totals, before.totals)
  check('checkpoint keeps the model split', checkpoint.models, before.models)
  check('checkpoint keeps the day split', checkpoint.days, before.days)
  check('checkpoint keeps the turn list', checkpoint.turns, before.turns)

  const tail = [
    event('step/start', { turn: 3, step: 1 }, day2),
    event('assistant/message', {
      turn: 3,
      step: 1,
      usage: { inputTokens: 7, outputTokens: 3, cacheReadTokens: 0, cacheWriteTokens: 0 },
      message: { source: { provider: 'deepseek-official', model: 'deepseek-v4-pro' } },
    }, day2),
  ]
  let restoredState = definition.stateSchema.parse(checkpoint)
  let directState = before
  for (const item of tail) {
    restoredState = definition.apply(restoredState, item)
    directState = definition.apply(directState, item)
  }
  check('restored fold matches the direct fold (totals)', restoredState.totals, directState.totals)
  check('restored fold matches the direct fold (models)', restoredState.models, directState.models)
  check('restored fold matches the direct fold (days)', restoredState.days, directState.days)
  check('restored fold matches the direct fold (turns)', restoredState.turns, directState.turns)
  check('the route survives the round-trip', restoredState.route, before.route)
  checkLossless('restored state', restoredState)
  // The one field that starts unresolved: it must be `null`, never `undefined`,
  // because `undefined` disappears through JSON and is rejected downstream.
  const fresh = definition.stateSchema.parse(JSON.parse(JSON.stringify(definition.init({}, 0))))
  check('an unresolved route is null, not undefined', fresh.route, null)
  checkLossless('fresh restored state', fresh)
  const afterFresh = definition.apply(fresh, event('step/start', { turn: 1, step: 1 }, day1))
  check('folding after a restore keeps the unresolved route null', afterFresh.route, null)
  // A checkpoint written by the buggy build carries `route: undefined`; the fold
  // must heal it instead of serving a poison value forever.
  const poisoned = { ...definition.init({}, 0) }
  poisoned.route = undefined
  const healed = definition.apply(poisoned, event('step/start', { turn: 1, step: 1 }, day1))
  check('a poisoned checkpoint is healed', healed.route, null)
  checkLossless('healed state', healed)
}

console.log('host projection unit: ' + String(problems.length === 0 ? 'ok' : 'failed'))
for (const problem of problems) console.log('  FAIL  ' + problem)
process.exit(problems.length === 0 ? 0 : 1)
