/**
 * dsh-client-ui-workspace-suite — browser half (plain JavaScript, no build step,
 * assembled from src/*.js by tools/build.mjs).
 *
 * Registrations
 *   1. conversation.hero.workspace.directoryFlow  (single, priority -1)
 *      sidebar.workspaces.directoryFlow            (single, priority -1)
 *      an explorer-style folder picker (tree with checkboxes, bottom preview
 *      strip, double-click rename) replacing the shipped OS/browse picker.
 *   2. sidebar.workspaces (single, priority -100)
 *      replaces the shipped workspace browser with a nested workspace tree
 *      plus a collapse-all control. Shadowing the shipped entry does NOT
 *      declare its children: the child-hole declaration is exclusive and
 *      re-declaring it throws, so this entry renders its own row menus.
 *   3. sidebar.panellist + main keyed 'workspace-suite.overview'
 *      a per-workspace overview page: token totals, per-day chart, the fully
 *      expanded tree, turn jump links and the root README.
 *   4. plugins.bundle.config (keyed by the package name)
 *      the settings card in the Plugins panel, where each module is switched
 *      and the shared options are edited.
 *
 * Baseline externals only: react, @deepseek-ai/dsh-client-store,
 * @deepseek-ai/dsh-client-ui-primitives. No other package is imported; every
 * other capability is read from the cordis client context or from slot props.
 */
window.__ModuleLoader__.load({
  id: 'dsh-client-ui-workspace-suite',
  factory: (require) => {
    /**
     * Boot diagnostics that survive a *successful* boot.
     *
     * The renderer console is only copied into the desktop crash log when the
     * boot audit fails, so a plugin that goes inert while the app boots leaves
     * no readable trace. This writes one always-overwritten ASCII record into
     * `localStorage` (Electron keeps it under
     * `%APPDATA%/<app>/Local Storage/leveldb`), a channel a maintainer can read
     * from disk: the stage says exactly how far the browser half got. Declared
     * before the guard so it is hoisted and callable from every catch below,
     * including one that fires before the requires ran.
     */
    function reportBoot(stage, detail) {
      try {
        if (typeof localStorage === 'undefined') return
        const key = 'dsh-workspace-suite.boot'
        let prior = null
        try {
          prior = JSON.parse(localStorage.getItem(key) || 'null')
        } catch {
          prior = null
        }
        // Later benign stages must not erase a failure: the record keeps the last
        // few failing stages alongside the newest stage reached.
        const failures = prior !== null && Array.isArray(prior.failures) ? prior.failures.slice(-3) : []
        if (/failed|rejected/.test(stage)) {
          failures.push({ stage, at: Date.now(), detail: detail === undefined ? null : detail })
        }
        localStorage.setItem(key, JSON.stringify({
          stage,
          at: Date.now(),
          detail: detail === undefined ? null : detail,
          failures,
        }))
      } catch {
        /* a diagnostics write must never become the failure it reports */
      }
    }

    // Everything below runs inside this one guard. A plugin must never be the
    // reason the shell fails to boot: the catch reports to the renderer console
    // (which the desktop copies into its crash log) and returns an inert entry.
    // The body is intentionally not re-indented, so every part stays diffable.
    try {
    reportBoot('factory-enter')
    const React = require('react')
    const storeKit = require('@deepseek-ai/dsh-client-store')
    const ui = require('@deepseek-ai/dsh-client-ui-primitives')
    reportBoot('requires-ok')

    const E = React.createElement
    const PKG = 'dsh-client-ui-workspace-suite'
    const NS = 'workspaceSuite'
    const STYLE_ID = 'dsh-workspace-suite/styles'
