/**
 * dsh-client-ui-workspace-suite — host half.
 *
 * Responsibilities that only the host process can serve:
 *
 *  1. A `sessionProjections` unit that folds each session's durable log into a
 *     workspace-suite usage ledger: cumulative buckets, per-model buckets,
 *     per-day buckets and a compact per-turn list. The browser half reads it
 *     as `sessions.byId[id].projectionValues.workspaceSuiteUsage`, so no
 *     plugin-defined Remote namespace (impossible for a third-party bundle,
 *     the application selects Remote capabilities at build time) is needed.
 *
 * Deliberately zero `@deepseek-ai/*` imports: this profile's
 * `node_modules/@deepseek-ai` is an older checkout, so a bare import could
 * resolve a second runtime generation. Everything comes through `ctx`, and the
 * two schema slots are satisfied with the minimal `{ parse }` face the
 * registry actually uses (`dsh-session-projection/lib/index.js` calls only
 * `stateSchema.parse` and `wire.viewSchema.parse`).
 */

/** Cordis plugin name; kept equal to the loader row id. */
export const name = 'workspace-suite'

/** The projection key the browser half reads. */
const KEY = 'workspaceSuiteUsage'

/** Bumped whenever the state fields or the fold semantics change. */
const STATE_VERSION = 2

/** The four durable usage buckets, named exactly like the shipped `tokenUsage`. */
const BUCKET_KEYS = ['uncachedInputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens']

/** The registry only ever calls `.parse`; a schema library would be a second runtime copy. */
const passthroughSchema = {
  parse(value) {
    return value
  },
}

/** A fresh all-zero bucket. */
function zeroBuckets() {
  return { uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }
}

/** Provider usage shape -> our bucket shape. */
function bucketsOf(usage) {
  return {
    uncachedInputTokens: count(usage.inputTokens),
    outputTokens: count(usage.outputTokens),
    cacheReadTokens: count(usage.cacheReadTokens),
    cacheWriteTokens: count(usage.cacheWriteTokens),
  }
}

/** Non-negative safe integer or 0. */
function count(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0
}

/** Whether provider usage carries the two required counters. */
function usageIsUsable(usage) {
  return usage !== null && typeof usage === 'object'
    && Number.isSafeInteger(usage.inputTokens) && usage.inputTokens >= 0
    && Number.isSafeInteger(usage.outputTokens) && usage.outputTokens >= 0
}

/** `a - b + c`, bucket-wise. */
function replaceBuckets(totals, previous, next) {
  const out = {}
  for (const key of BUCKET_KEYS) {
    out[key] = (totals[key] || 0) - (previous ? previous[key] || 0 : 0) + (next[key] || 0)
  }
  return out
}

/** Merge one bucket into a map entry, returning a new map only when it moves. */
function addToMap(map, key, delta) {
  const current = map[key] || zeroBuckets()
  const next = replaceBuckets(current, null, delta)
  if (BUCKET_KEYS.every((bucket) => current[bucket] === next[bucket])) return map
  return { ...map, [key]: next }
}

/** Subtract one bucket from a map entry (used when a sample is replaced). */
function subtractFromMap(map, key, delta) {
  if (map[key] === undefined) return map
  const negated = {}
  for (const bucket of BUCKET_KEYS) negated[bucket] = -delta[bucket]
  return addToMap(map, key, negated)
}

/** Merge one bucket into `days[day][model]`, the per-day per-model split. */
function addToDayMap(days, day, model, delta) {
  const forDay = days[day] || {}
  const nextForDay = addToMap(forDay, model, delta)
  if (nextForDay === forDay) return days
  return { ...days, [day]: nextForDay }
}

/** Subtract one bucket from `days[day][model]`. */
function subtractFromDayMap(days, day, model, delta) {
  if (days[day] === undefined) return days
  const negated = {}
  for (const bucket of BUCKET_KEYS) negated[bucket] = -delta[bucket]
  return addToDayMap(days, day, model, negated)
}

/** The newest `usage` chunk of an assistant stream, if the event carries one. */
function streamUsage(stream) {
  if (!Array.isArray(stream)) return undefined
  for (let index = stream.length - 1; index >= 0; index -= 1) {
    const chunk = stream[index]
    if (chunk !== null && typeof chunk === 'object' && chunk.usage !== undefined) return chunk.usage
  }
  return undefined
}

/** The provider usage one assistant settlement reports for its attempt. */
function usageOf(event) {
  const data = event.data
  if (data === null || typeof data !== 'object') return undefined
  if (event.type === 'assistant/message') {
    if (data.usage !== undefined) return data.usage
    return streamUsage(data.stream)
  }
  if (event.type === 'assistant/attempt') return streamUsage(data.stream)
  return undefined
}

/**
 * The route a request ran under, read defensively from either event shape.
 *
 * Returns `null` — never `undefined` — because every value this unit hands to
 * the client must be lossless JSON: an `undefined` property survives in memory
 * but disappears through JSON, and the gateway's forwarded-event check rejects
 * such a value outright (observed as `forwarded host event
 * "api-session/added" argument 0 is not lossless JSON data`, which fails every
 * new session while the poisoned value stays in the session's projection bag).
 */
function routeFromHeader(event) {
  const header = event.data === undefined ? undefined : event.data.header
  if (header === null || typeof header !== 'object') return null
  const config = header.config
  const provider = firstString(config && config.provider, header.provider, config && config.providerId)
  const model = firstString(config && config.model, header.model, config && config.modelId)
  if (provider === undefined || model === undefined) return null
  return { provider, model }
}

/** The route an assistant settlement ran under; `null` when it names none. */
function routeFromMessage(event) {
  const message = event.data === undefined ? undefined : event.data.message
  const source = message === null || typeof message !== 'object' ? undefined : message.source
  if (source === null || typeof source !== 'object') return null
  if (typeof source.provider !== 'string' || typeof source.model !== 'string') return null
  if (source.provider.length === 0 || source.model.length === 0) return null
  return { provider: source.provider, model: source.model }
}

/** First defined non-empty string of the candidates. */
function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) return value
  }
  return undefined
}

/** Stable display key of a route; an unresolved route reads as `unknown`. */
function routeKey(route) {
  return route === undefined || route === null ? 'unknown' : route.provider + '/' + route.model
}

/** Local calendar day of an event, as `YYYY-MM-DD`. */
function dayOf(event) {
  const time = typeof event.time === 'number' ? event.time : Date.now()
  const date = new Date(time)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return date.getFullYear() + '-' + month + '-' + day
}

/** Add a turn delta to the compact `[[turn, tokens]]` list, newest turn last. */
function addToTurns(turns, turn, delta) {
  const index = turns.findIndex((entry) => entry[0] === turn)
  if (index < 0) {
    const next = turns.slice()
    next.push([turn, delta])
    next.sort((left, right) => left[0] - right[0])
    return next
  }
  const tokens = Math.max(0, turns[index][1] + delta)
  if (tokens === turns[index][1]) return turns
  const next = turns.slice()
  next[index] = [turn, tokens]
  return next
}

/** Total tokens of one bucket set. */
function totalOf(buckets) {
  let sum = 0
  for (const key of BUCKET_KEYS) sum += buckets[key] || 0
  return sum
}

/**
 * The workspace-suite usage unit.
 *
 * Replacement discipline mirrors the shipped `tokenUsage` unit: one sample per
 * (turn, step) slot, `llm/retry-started` reopens the slot so a retried attempt
 * is billed again. Every sample also lands in the route bucket and in the local
 * day bucket, so model and per-day series need no second pass over the log.
 *
 * The whole state is handed to the client as this unit's view, so it must stay
 * lossless JSON at every point: no `undefined` field, no function, no Map/Set,
 * no `NaN`. A single `undefined` here propagates into the session row the Host
 * forwards, and the gateway then refuses the event (`argument 0 is not lossless
 * JSON data`), which fails session creation outright.
 */
const usageProjection = {
  key: KEY,
  stateSchema: passthroughSchema,
  stateVersion: STATE_VERSION,
  init: () => ({
    totals: zeroBuckets(),
    models: {},
    days: {},
    turns: [],
    last: null,
    route: null,
  }),
  apply: (state, event) => {
    // Heal a state restored from a checkpoint written before `route` was
    // null-initialised: an `undefined` field there would be rejected downstream.
    if (state !== null && typeof state === 'object' && state.route === undefined) {
      state = { ...state, route: null }
    }
    if (event === null || typeof event !== 'object') return state

    if (event.type === 'request/header') {
      const route = routeFromHeader(event)
      if (route === null) return state
      const current = state.route
      if (current !== null && current !== undefined && current.provider === route.provider && current.model === route.model) return state
      return { ...state, route }
    }

    if (event.type === 'llm/retry-started') {
      if (state.last === null) return state
      const data = event.data || {}
      return state.last.turn === data.turn && state.last.step === data.step ? { ...state, last: null } : state
    }

    if (event.type !== 'assistant/message' && event.type !== 'assistant/attempt') return state

    const sample = usageOf(event)
    if (!usageIsUsable(sample)) return state

    const data = event.data || {}
    const turn = Number.isSafeInteger(data.turn) && data.turn >= 0 ? data.turn : 0
    const step = Number.isSafeInteger(data.step) && data.step >= 0 ? data.step : 0
    const route = routeFromMessage(event) || state.route
    const model = routeKey(route)
    const buckets = bucketsOf(sample)
    const day = dayOf(event)
    const tokens = totalOf(buckets)

    const previous = state.last !== null && state.last.turn === turn && state.last.step === step ? state.last : null
    if (previous !== null && BUCKET_KEYS.every((key) => previous.buckets[key] === buckets[key]) && previous.model === model && previous.day === day) {
      return state
    }

    let totals = replaceBuckets(state.totals, previous === null ? null : previous.buckets, buckets)
    let models = state.models
    let days = state.days
    let turns = state.turns

    if (previous !== null) {
      models = subtractFromMap(models, previous.model, previous.buckets)
      days = subtractFromDayMap(days, previous.day, previous.model, previous.buckets)
      turns = addToTurns(turns, previous.turn, -totalOf(previous.buckets))
    }
    models = addToMap(models, model, buckets)
    days = addToDayMap(days, day, model, buckets)
    turns = addToTurns(turns, turn, tokens)

    return { ...state, totals, models, days, turns, last: { turn, step, buckets, model, day } }
  },
  // Returning the state itself keeps the registry's `Object.is` change gate
  // exact: an unchanged fold returns the same reference, so nothing publishes.
  wire: { viewSchema: passthroughSchema, view: (state) => state },
}

/**
 * Register the unit when the profile composes the projection registry. The
 * registry owns the registration as an effect of the calling fiber, so no
 * separate disposer is kept here.
 *
 * @param ctx - host root context.
 */
export function apply(ctx) {
  ctx.inject(['sessionProjections'], (scope) => {
    scope.sessionProjections.register(usageProjection)
  })
}
