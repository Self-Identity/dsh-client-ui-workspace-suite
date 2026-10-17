    /* =============================== settings ============================== */

    /** Default values for every setting; the settings card edits exactly these. */
    const DEFAULT_SETTINGS = {
      modulePicker: true,
      moduleTree: true,
      moduleOverview: true,
      // The conversation window's workspace menu (root-level list + subtree chooser).
      moduleHeroMenu: true,
      // 100 = the list fills the space down to the account row (shipped behavior);
      // lower values cap how far it grows before it scrolls inside itself.
      treeMaxHeightPct: 100,
      treeScroll: true,
      // The list is a tree: rows start collapsed and the open-folder icon appears
      // only after a row is expanded. Turning this off expands everything on entry.
      collapseAllByDefault: true,
      pickerDepth: 1,
      // Token figures belong to the overview page; the list stays native-quiet.
      showTokens: true,
      showTurns: true,
      includeArchived: true,
      includeSubagent: true,
      readme: true,
      showEnv: true,
      // Width of this plugin's own scrollbars, in px. The CSS chain falls back to
      // the global `--dsh-scrollbar-width` (scrollbar-tuner plugin) and then to 8px.
      scrollbarWidth: 8,
      readmeMaxHeightPct: 45,
    }

    const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS)

    /**
     * Browser-local settings store. localStorage is the always-available
     * authority; a host `configForms` scope, when the profile serves one, is
     * mirrored on read and written through on every change so the values also
     * survive outside this browser.
     */
    const settingsStore = storeKit.createSnapshotStore(
      { ...DEFAULT_SETTINGS },
      { persist: { name: 'dsh-workspace-suite.settings.v1' } },
    )

    let settingsScope = null

    /** Snapshot of the current settings, always a stable reference per revision. */
    const settingsSnapshot = () => settingsStore.getSnapshot()

    /** One settings hook for the whole object; slices are derived with useMemo. */
    const useSettings = () => React.useSyncExternalStore(settingsStore.subscribe, settingsSnapshot)

    /** Apply a plain patch, dropping unknown keys and unchanged values. */
    function applySettings(patch) {
      if (patch === null || typeof patch !== 'object') return
      const next = {}
      let changed = false
      for (const key of SETTINGS_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(patch, key)) continue
        const value = patch[key]
        if (value === undefined || value === settingsStore.getSnapshot()[key]) continue
        next[key] = value
        changed = true
      }
      if (changed) settingsStore.update((draft) => Object.assign(draft, next))
    }

    /** Read the host scope's value bag out of whichever snapshot shape it uses. */
    function scopeValueOf(snapshot) {
      if (snapshot === null || typeof snapshot !== 'object') return null
      if (snapshot.status !== undefined) {
        return snapshot.status === 'ready' && snapshot.value !== null && typeof snapshot.value === 'object'
          ? snapshot.value
          : null
      }
      return snapshot
    }

    /** Bind the profile's config scope; hydration merges only known keys. */
    function attachSettingsScope(scope) {
      if (scope === null || scope === undefined) return
      settingsScope = scope
      try {
        applySettings(scopeValueOf(scope.getSnapshot()))
      } catch (error) {
        warn('settings hydration failed', error)
      }
      if (typeof scope.subscribe === 'function') {
        try {
          scope.subscribe(() => {
            try {
              applySettings(scopeValueOf(scope.getSnapshot()))
            } catch (error) {
              warn('settings refresh failed', error)
            }
          })
        } catch (error) {
          warn('settings subscription failed', error)
        }
      }
    }

    /** Write one setting locally and, when bound, to the profile config. */
    function writeSetting(key, value) {
      settingsStore.update((draft) => {
        draft[key] = value
      })
      const scope = settingsScope
      if (scope === null || typeof scope.set !== 'function') return
      try {
        Promise.resolve(scope.set(key, value)).catch((error) => warn('config write failed: ' + key, error))
      } catch (error) {
        warn('config write threw: ' + key, error)
      }
    }

    /** Restore every default, locally and in the bound scope. */
    function resetSettings() {
      for (const key of SETTINGS_KEYS) writeSetting(key, DEFAULT_SETTINGS[key])
    }
