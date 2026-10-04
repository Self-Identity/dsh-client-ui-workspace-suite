    /* ============================ registration ============================= */

    const PANEL_ID = 'workspace-suite.overview'

    /** Services the client half requires; `slots` and `locale` are mandatory. */
    /**
     * Required client services. A remote namespace must be named entry by entry:
     * reading `remote.<namespace>` on the context proxy throws
     * `cannot get property "remote.<name>" without inject`, which is exactly how
     * an activation once failed here (`ui-workspace` declares
     * `remote.directoryPicker` for the same reason).
     */
    const inject = ['slots', 'locale', 'remote.workspaceFiles']

    /** Wrap one registrable in the quiet boundary so a crash stays local. */
    const seat = (Component) => bounded(Component)

    /** Read a numeric setting with a floor and a ceiling. */
    const settingNumber = (settings, key, min, max, fallback) => {
      const value = Number(settings[key])
      if (!Number.isFinite(value)) return fallback
      return Math.min(max, Math.max(min, Math.round(value)))
    }

    /**
     * Split the session-controller result envelope into a value or a rejection.
     * `sessions.*` answers `{ ok, value }` / `{ ok, error }` on this build.
     */
    function unwrap(result, label) {
      if (result !== null && typeof result === 'object' && typeof result.ok === 'boolean') {
        if (result.ok === false) {
          const message = result.error === undefined || result.error === null ? label : result.error.message
          throw new Error(message === undefined ? label : message)
        }
        return result.value
      }
      return result
    }

    /**
     * Client plugin body: dictionaries, styles, the picker occupants, the
     * sidebar takeover, the overview panel and the settings card. Registrations
     * are rebuilt whenever a module switch changes, so the settings card takes
     * effect without a reload.
     *
     * @param ctx - client root context.
     */
    function apply(ctx) {
      try {
      const slots = serviceOf(ctx, 'slots')
      const locale = serviceOf(ctx, 'locale')
      if (slots === undefined || locale === undefined) {
        warn('slots/locale service missing; plugin idle')
        return
      }
      const sessions = serviceOf(ctx, 'sessions')
      const workspaces = serviceOf(ctx, 'workspaces')
      const uiWorkspace = serviceOf(ctx, 'uiWorkspace')
      const layout = serviceOf(ctx, 'layout')
      const remote = serviceOf(ctx, 'remote')
      reportBoot('apply-enter', {
        slots: slots !== undefined,
        locale: locale !== undefined,
        sessions: sessions !== undefined,
        workspaces: workspaces !== undefined,
        uiWorkspace: uiWorkspace !== undefined,
        layout: layout !== undefined,
        remote: remote !== undefined,
      })
      ctx.effect(() => installStyles(), 'workspace-suite: styles')
      ctx.effect(() => {
        const dispose = locale.register(NS, { zh, en })
        return typeof dispose === 'function' ? dispose : () => {}
      }, 'workspace-suite: dictionaries')

      // `bind` must follow the dictionary registration, and a namespace a host
      // build refuses to bind yet must degrade to a retrying lookup instead of
      // freezing raw keys into every label.
      let t
      try {
        t = locale.bind(NS)
      } catch (error) {
        warn('locale binding deferred', error)
        let cached = null
        t = (key, params) => {
          if (cached === null) {
            try {
              cached = locale.bind(NS)
            } catch {
              cached = (onlyKey) => onlyKey
            }
          }
          return cached(key, params)
        }
      }

      // The profile's config scope keeps the same values outside this browser.
      ctx.inject(['configForms'], (scope) => {
        try {
          if (scope.configForms !== undefined && typeof scope.configForms.get === 'function') {
            const form = scope.configForms.get(PKG)
            if (form !== undefined && form !== null) attachSettingsScope(form)
          }
        } catch (error) {
          warn('configForms binding failed', error)
        }
      })

      // Defense in depth: the namespace is declared above, but a composition
      // without it must degrade the README pane, never take the activation down.
      let workspaceFiles
      try {
        workspaceFiles = remote === undefined || remote === null ? undefined : remote.workspaceFiles
      } catch (error) {
        reportBoot('remote-namespace-unavailable', String(error && error.message ? error.message : error))
        workspaceFiles = undefined
      }

      const services = {
        sessions,
        workspaces,
        slots,
        bindLocale: (namespace) => (namespace === undefined || namespace === null ? t : locale.bind(namespace)),
        openSession: (sessionId) => {
          if (uiWorkspace !== undefined && typeof uiWorkspace.openSession === 'function') uiWorkspace.openSession(sessionId)
        },
        openWorkspace: (workspaceId) => boundCall(uiWorkspace, 'openWorkspace', workspaceId),
        startSession: (workspaceId) => boundCall(uiWorkspace, 'startSession', workspaceId),
        forkSession: (sessionId) => boundCall(uiWorkspace, 'forkSession', sessionId),
        pin: (sessionId) => boundCall(uiWorkspace, 'pinSession', sessionId),
        unpin: (sessionId) => boundCall(uiWorkspace, 'unpinSession', sessionId),
        archive: (sessionId) => boundCall(uiWorkspace, 'archiveSession', sessionId),
        unarchive: (sessionId) => boundCall(uiWorkspace, 'unarchiveSession', sessionId),
        renameWorkspace: (workspaceId, title) => boundCall(workspaces, 'rename', workspaceId, title),
        deleteWorkspace: (workspaceId) => boundCall(workspaces, 'delete', workspaceId),
        createWorkspace: (input) => boundCall(workspaces, 'create', input),
        renameSession: (sessionId, title) => boundCall(sessions, 'using', sessionId, { source: 'workspaceOperation' },
          (reference) => reference.binding.session.rename(title)).then((result) => unwrap(result, 'rename failed')),
        searchSessions: (query, signal) => boundCall(sessions, 'search', query, signal)
          .then((result) => unwrap(result, 'search failed')),
        listDirectory: (path, signal) => {
          if (uiWorkspace === undefined || typeof uiWorkspace.listDirectory !== 'function') {
            return Promise.reject(new Error('directory listing unavailable (compose a directory-picker browse backend)'))
          }
          return Promise.resolve(uiWorkspace.listDirectory(path, signal))
        },
        createDirectory: (path, name) => boundCall(uiWorkspace, 'createDirectory', path, name),
        readWorkspaceItems: () => (workspaces !== undefined && workspaces.list !== undefined
          && typeof workspaces.list.getSnapshot === 'function'
          ? (workspaces.list.getSnapshot().items || [])
          : []),
        refreshProjections: sessions !== undefined && typeof sessions.refreshProjections === 'function'
          ? (ids) => {
            // The controller refreshes one session per call; walk the list with
            // four concurrent lanes so a wide subtree stays bounded.
            const queue = Array.isArray(ids) ? ids.slice(0, 200) : [ids]
            const lane = (offset) => {
              const walk = (index) => {
                if (index >= queue.length) return Promise.resolve(undefined)
                return Promise.resolve(sessions.refreshProjections(queue[index]))
                  .catch(() => undefined)
                  .then(() => walk(index + 4))
              }
              return walk(offset)
            }
            return Promise.all([0, 1, 2, 3].map(lane)).then(() => undefined)
          }
          : undefined,
        readFile: (sessionId, path) => {
          if (workspaceFiles === undefined || typeof workspaceFiles.read !== 'function') {
            return Promise.reject(new Error('workspaceFiles remote unavailable'))
          }
          return Promise.resolve(workspaceFiles.read(sessionId, path, { offset: 1, limit: 5000 }))
            .then((page) => {
              const value = unwrap(page, 'read failed')
              return value !== null && typeof value === 'object' && typeof value.text === 'string' ? value.text : ''
            })
        },
        openOverview: (workspaceId) => {
          requestOverview(workspaceId)
          if (layout !== undefined && typeof layout.selectPanel === 'function') layout.selectPanel(PANEL_ID)
        },
      }

      /**
       * Capture one registration's own disposer. `slots.register` is the only
       * value whose disposal semantics this plugin owns: the value an
       * `slots.inject` call returns is left to the fiber, so it is never called
       * here (an unexpected non-disposer there would re-register, not unregister).
       */
      let canRebuild = true
      const capture = (value) => {
        if (typeof value === 'function') return value
        if (value !== null && typeof value === 'object' && typeof value.dispose === 'function') return () => value.dispose()
        return null
      }

      let activeDisposers = []
      let rejectedCount = 0
      const attemptedKeys = []
      const registerIn = (key, options, Component) => {
        attemptedKeys.push(key)
        try {
          slots.inject(key, () => {
            try {
              const registration = slots.register(options, seat(Component))
              const dispose = capture(registration)
              if (dispose === null) canRebuild = false
              else activeDisposers.push(dispose)
              return registration
            } catch (error) {
              // A rejected seat must cost that one seat, never the activation.
              canRebuild = false
              rejectedCount += 1
              reportBoot('register-rejected', { key, error: String(error && error.message ? error.message : error) })
              try {
                console.error('[workspace-suite] registration rejected for ' + String(key), error)
              } catch {
                /* console may be unavailable */
              }
              return undefined
            }
          })
        } catch (error) {
          canRebuild = false
          rejectedCount += 1
          reportBoot('inject-rejected', { key, error: String(error && error.message ? error.message : error) })
          try {
            console.error('[workspace-suite] inject rejected for ' + String(key), error)
          } catch {
            /* console may be unavailable */
          }
        }
      }

      /** Register the picker into both directory-flow holes, shadowing the shipped dialog. */
      const registerPicker = () => {
        registerIn('conversation.hero.workspace.directoryFlow', {
          name: 'conversation.hero.workspace.directoryFlow',
          priority: -1,
          locale: NS,
          inject: () => ({
            t,
            listDirectory: services.listDirectory,
            createWorkspace: services.createWorkspace,
            renameWorkspace: services.renameWorkspace,
            readWorkspaceItems: services.readWorkspaceItems,
          }),
        }, DirectoryExplorer)
        registerIn('sidebar.workspaces.directoryFlow', {
          name: 'sidebar.workspaces.directoryFlow',
          priority: -1,
          locale: NS,
          inject: () => ({
            t,
            listDirectory: services.listDirectory,
            createWorkspace: services.createWorkspace,
            renameWorkspace: services.renameWorkspace,
            readWorkspaceItems: services.readWorkspaceItems,
          }),
        }, DirectoryExplorer)
      }

      /** Take over the sidebar workspace list below every shipped entry's priority. */
      const registerBrowser = () => {
        registerIn('sidebar.workspaces', {
          name: 'sidebar.workspaces',
          priority: -100,
          locale: NS,
          inject: () => ({ services }),
        }, SuiteWorkspaceBrowser)
      }

      /**
       * The overview panel. Reached from a workspace row's "More" menu, so it
       * registers no `sidebar.panellist` entry: the panel is a destination of the
       * workspace list, not a second standalone place beside it.
       */
      const registerOverview = () => {
        registerIn('main', {
          name: 'main',
          key: PANEL_ID,
          locale: NS,
          inject: () => ({ services, panelKey: PANEL_ID }),
        }, SuiteOverview)
      }

      /**
       * The settings card. The bundle page seat is the primary one; the row seat
       * is registered too so the row also carries a native **Configure** control
       * (a build that declares only one of the two keyed slots still shows the
       * form, and the reader never has to guess where it lives).
       */
      const registerSettings = () => {
        registerIn('plugins.bundle.config', {
          name: 'plugins.bundle.config',
          key: PKG,
          locale: NS,
        }, WorkspaceSuiteSettings)
        registerIn('plugins.row.config', {
          name: 'plugins.row.config',
          key: PKG + '#workspace-suite',
          locale: NS,
        }, WorkspaceSuiteSettings)
      }

      let lastSignature = null
      const rebuild = () => {
        const settings = settingsSnapshot()
        const signature = [
          settings.modulePicker === true,
          settings.moduleTree === true,
          settings.moduleOverview === true,
        ].join(',')
        // Only a module switch changes the registration set; option edits must
        // not remount the sidebar. Without a disposer for every registration a
        // second pass would collide on a `single` slot, so the toggle then waits
        // for the next page load instead.
        if (signature === lastSignature) return
        if (lastSignature !== null && !canRebuild) return
        for (const dispose of activeDisposers) {
          try {
            dispose()
          } catch (error) {
            warn('registration teardown failed', error)
          }
        }
        activeDisposers = []
        if (settings.modulePicker === true) registerPicker()
        if (settings.moduleTree === true) registerBrowser()
        if (settings.moduleOverview === true) registerOverview()
        registerSettings()
        lastSignature = signature
      }

      ctx.effect(() => {
        rebuild()
        const stop = settingsStore.subscribe(() => rebuild())
        return () => {
          stop()
          for (const dispose of activeDisposers) {
            try {
              dispose()
            } catch (error) {
              warn('registration teardown failed', error)
            }
          }
          activeDisposers = []
        }
      }, 'workspace-suite: registrations')

      // Referenced so the numeric helper and the unused injected face stay part
      // of the module surface without adding another entry point.
      void settingNumber
      reportBoot('apply-ok', {
        registered: activeDisposers.length,
        rejected: rejectedCount,
        keys: attemptedKeys,
      })
      } catch (error) {
        // Same rule as the module guard: report and stay inert rather than let a
        // failing activation take the whole web boot audit down with it.
        reportBoot('apply-failed', String(error && error.stack ? error.stack : error).slice(0, 600))
        try {
          console.error('[workspace-suite] client apply failed; the plugin stays inert', error)
        } catch {
          /* console may be unavailable in an exotic carrier */
        }
      }
    }

    return {
      name: PKG,
      inject,
      apply,
    }
    } catch (error) {
      reportBoot('factory-failed', String(error && error.stack ? error.stack : error).slice(0, 600))
      try {
        console.error('[workspace-suite] module evaluation failed; the plugin stays inert', error)
      } catch {
        /* console may be unavailable in an exotic carrier */
      }
      // Only function-scope-safe bindings may be referenced here: `PKG` and the
      // other consts live inside the try above and would be uninitialized.
      return {
        name: 'dsh-client-ui-workspace-suite',
        inject: [],
        apply() {
          // Inert: the entry activates so the boot audit stays green, and the
          // console error above is the diagnostic the desktop crash log carries.
          reportBoot('inert-apply')
        },
      }
    }
  },
})
