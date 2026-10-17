    /* ========================= overview panel page ========================= */

    /** Local day keys of the last N days, oldest first, ending today. */
    function recentDays(count) {
      const out = []
      const today = new Date()
      for (let index = count - 1; index >= 0; index -= 1) {
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - index)
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        out.push(date.getFullYear() + '-' + month + '-' + day)
      }
      return out
    }

    /** Sum two bucket sets. */
    function addBuckets(left, right) {
      const out = {}
      for (const key of ['uncachedInputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens']) {
        out[key] = (left === undefined ? 0 : left[key] || 0) + (right === undefined ? 0 : right[key] || 0)
      }
      return out
    }

    /** Merge one usage view into an accumulator. */
    function mergeUsage(accumulator, view, into) {
      if (view === undefined || view === null) return accumulator
      const next = accumulator
      next.totals = addBuckets(next.totals, view.totals)
      for (const [model, buckets] of Object.entries(view.models || {})) {
        next.models[model] = addBuckets(next.models[model], buckets)
      }
      for (const [day, modelMap] of Object.entries(view.days || {})) {
        const target = next.days[day] === undefined ? {} : next.days[day]
        for (const [model, buckets] of Object.entries(modelMap || {})) {
          target[model] = addBuckets(target[model], buckets)
        }
        next.days[day] = target
      }
      if (into !== undefined) into.push(view)
      return next
    }

    /** Total tokens of one per-day per-model map. */
    function sumDayModels(modelMap) {
      let sum = 0
      for (const buckets of Object.values(modelMap || {})) sum += sumBuckets(buckets)
      return sum
    }

    /** Plain-text model breakdown, used as a title when rich cards are too many. */
    function modelSummaryText(models, title) {
      const rows = Object.entries(models)
        .sort((left, right) => sumBuckets(right[1]) - sumBuckets(left[1]))
        .map(([model, buckets]) => model + ': ' + formatCount(sumBuckets(buckets)))
      return [title].concat(rows).join('\n')
    }

    /** Which root workspace the next overview opening should show. */
    const overviewTargetStore = storeKit.createSnapshotStore({ workspaceId: null, seq: 0 })

    /** Ask the overview panel to focus one workspace (used by row menus). */
    function requestOverview(workspaceId) {
      overviewTargetStore.update((draft) => {
        draft.workspaceId = workspaceId
        draft.seq = draft.seq + 1
      })
    }

    /**
     * The per-workspace overview page registered as a global `main` panel.
     *
     * Data comes entirely from the host projection unit this bundle registers:
     * `sessions.byId[id].projectionValues.workspaceSuiteUsage`. Cold sessions
     * are warmed through `sessions.refreshProjections` when the service offers
     * it; anything still missing is reported as a partial measurement.
     */
    function SuiteOverview(props) {
      const { t, panelKey } = props
      const services = props.services === undefined || props.services === null ? {} : props.services
      const settings = useSettings()
      const { sessions, workspaces } = services
      const useWorkspaces = hookFrom(props, 'useWorkspaces', workspaces === undefined ? undefined : workspaces.list)
      const useSessions = hookFrom(props, 'useSessions', sessions === undefined ? undefined : sessions.list)
      // Host shortcut rows, so this page's menus carry the same hints as the list's.
      const overviewShortcutRows = (() => {
        try {
          const read = props.useShortcuts
          if (typeof read !== 'function') return []
          const rows = read((list) => (Array.isArray(list) ? list : []))
          return Array.isArray(rows) ? rows : []
        } catch {
          return []
        }
      })()
      const overviewShortcutOf = (id) => overviewShortcutRows.find((row) => row !== null && typeof row === 'object' && row.id === id)
      const workspaceState = useWorkspaces === null ? null : useWorkspaces((state) => state)
      const sessionList = useSessions === null ? null : useSessions((state) => state)
      const items = workspaceState === null || workspaceState.items === undefined ? [] : workspaceState.items
      const byId = sessionList === null || sessionList.byId === undefined ? {} : sessionList.byId
      const tree = React.useMemo(() => buildWorkspaceTree(items), [items])
      const [rootId, setRootId] = React.useState(null)
      const [readme, setReadme] = React.useState(null)
      const [readmeError, setReadmeError] = React.useState(null)
      const [warmTicket, setWarmTicket] = React.useState(0)
      const [env, setEnv] = React.useState(null)
      const overviewTarget = React.useSyncExternalStore(overviewTargetStore.subscribe, overviewTargetStore.getSnapshot)
      React.useEffect(() => {
        if (overviewTarget.workspaceId !== null) setRootId(overviewTarget.workspaceId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [overviewTarget.seq])
      const dialogs = useSuiteDialog({
        t,
        items,
        onNotice: (message) => warn('overview dialog: ' + message),
        onRenameWorkspace: (id, value) => services.renameWorkspace(id, value),
        onRenameSession: (id, value) => services.renameSession(id, value),
        onDeleteWorkspace: (id) => services.deleteWorkspace(id),
      })

      const currentRoot = React.useMemo(() => {
        if (rootId !== null && items.some((item) => item.workspaceId === rootId)) return rootId
        const current = Object.keys(byId).find((id) => ((byId[id].retainedBy || {}).mainView || 0) > 0)
        if (current !== undefined) {
          const owner = items.find((item) => (item.sessionIds || []).includes(current))
          if (owner !== undefined) {
            const chain = ancestorsOf(tree.parentOf, owner.workspaceId)
            return chain.length > 0 ? chain[0] : owner.workspaceId
          }
        }
        return tree.roots.length > 0 ? tree.roots[0].workspaceId : null
      }, [rootId, items, byId, tree])

      const subtreeIds = currentRoot === null ? [] : collectSubtree(tree.parentOf, tree.childrenOf, currentRoot)
      const root = items.find((item) => item.workspaceId === currentRoot)

      /** Session ids of one workspace id list, honouring the inclusion settings. */
      const sessionIdsOf = React.useCallback((ids) => {
        const out = []
        for (const workspaceId of ids) {
          const workspace = items.find((item) => item.workspaceId === workspaceId)
          if (workspace === undefined) continue
          for (const id of workspace.sessionIds || []) {
            const summary = byId[id]
            if (summary === undefined) continue
            if (summary.blank === true) continue
            if (summary.origin === 'subagent' && settings.includeSubagent !== true) continue
            out.push(id)
          }
        }
        return out
      }, [items, byId, settings.includeSubagent])

      /** Every session id of the subtree, plus archived-only ones when included. */
      const subtreeSessionIds = React.useMemo(() => {
        const ids = sessionIdsOf(subtreeIds)
        if (settings.includeArchived === true) {
          for (const id of Object.keys(byId)) {
            const summary = byId[id]
            if (summary === undefined || summary.blank === true) continue
            if (summary.origin === 'subagent' && settings.includeSubagent !== true) continue
            if (ids.includes(id)) continue
            const owner = items.find((item) => (item.sessionIds || []).includes(id))
            if (owner !== undefined && subtreeIds.includes(owner.workspaceId)) ids.push(id)
          }
        }
        return ids
      }, [sessionIdsOf, subtreeIds, byId, items, settings.includeArchived, settings.includeSubagent])

      const usageOf = (sessionId) => usageViewOf(byId[sessionId])

      // Warm the cold sessions of this subtree once, then let the rows re-read.
      React.useEffect(() => {
        if (typeof services.refreshProjections !== 'function') return undefined
        const cold = subtreeSessionIds.filter((id) => usageOf(id) === undefined).slice(0, 80)
        if (cold.length === 0) return undefined
        let cancelled = false
        Promise.resolve(services.refreshProjections(cold)).then(() => {
          if (!cancelled) setWarmTicket((value) => value + 1)
        }).catch(() => {
          if (!cancelled) setWarmTicket((value) => value + 1)
        })
        return () => {
          cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [subtreeSessionIds.join(','), warmTicket])

      const subtreeUsage = React.useMemo(() => {
        const accumulator = { totals: addBuckets(undefined, undefined), models: {}, days: {}, views: {} }
        for (const id of subtreeSessionIds) {
          const view = usageOf(id)
          if (view === undefined) continue
          accumulator.views[id] = view
          mergeUsage(accumulator, view)
        }
        return accumulator
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [subtreeSessionIds.join(','), byId, warmTicket])

      const missing = subtreeSessionIds.filter((id) => usageOf(id) === undefined).length
      const degraded = subtreeSessionIds.some((id) => {
        const view = usageOf(id)
        return view !== undefined && view.fallback === true
      })

      // README of the root workspace, read through the workspace-files Remote.
      React.useEffect(() => {
        if (settings.readme !== true || root === undefined) {
          setReadme(null)
          setReadmeError(null)
          return undefined
        }
        if (typeof services.readFile !== 'function') {
          setReadme(null)
          setReadmeError(t('overview.readme.denied', { message: 'service unavailable' }))
          return undefined
        }
        let cancelled = false
        const authorization = subtreeSessionIds[0] === undefined ? Object.keys(byId)[0] : subtreeSessionIds[0]
        const target = normalizePath(root.path) + '/README.md'
        if (authorization === undefined) {
          setReadme(null)
          setReadmeError(t('overview.readme.denied', { message: 'no session' }))
          return undefined
        }
        setReadme(null)
        setReadmeError(null)
        services.readFile(authorization, target)
          .then((text) => {
            if (!cancelled) setReadme(typeof text === 'string' && text.length > 0 ? text : null)
          })
          .catch((reason) => {
            if (cancelled) return
            const message = errorMessage(reason)
            if (/not-found|ENOENT/i.test(message)) setReadmeError(t('overview.readme.missing'))
            else setReadmeError(t('overview.readme.denied', { message }))
          })
        return () => {
          cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [root === undefined ? '' : root.path, settings.readme, subtreeSessionIds.join(','), warmTicket])

      // Dependencies and environment: one directory listing (child directories only —
      // the browse backend never reports files) plus a handful of top-level file
      // probes read through the workspace-files Remote. Nothing recurses, so the card
      // costs a fixed, small number of calls.
      React.useEffect(() => {
        if (settings.showEnv !== true || root === undefined || typeof root.path !== 'string') {
          setEnv(null)
          return undefined
        }
        const authorization = subtreeSessionIds[0] === undefined ? Object.keys(byId)[0] : subtreeSessionIds[0]
        const base = normalizePath(root.path)
        let cancelled = false
        setEnv({ status: 'loading' })
        const readOne = (name) => (authorization === undefined || typeof services.readFile !== 'function'
          ? Promise.resolve(null)
          : Promise.resolve(services.readFile(authorization, base + '/' + name))
            .then((text) => (typeof text === 'string' && text.length > 0 ? text : null))
            .catch(() => null))
        const list = typeof services.listDirectory === 'function'
          ? Promise.resolve(services.listDirectory(root.path))
            .then((listing) => directoryNames(listing))
            .catch(() => [])
          : Promise.resolve([])
        Promise.all([list].concat(ENV_PROBE_FILES.map(readOne)))
          .then((results) => {
            if (cancelled) return
            const dirs = Array.isArray(results[0]) ? results[0] : []
            const probes = {}
            for (let index = 0; index < ENV_PROBE_FILES.length; index += 1) {
              probes[ENV_PROBE_FILES[index]] = results[index + 1] !== null && results[index + 1] !== undefined
            }
            setEnv({
              status: 'ready',
              dirs,
              probes,
              pkg: packageSummary(results[1]),
            })
          })
          .catch((reason) => {
            if (!cancelled) setEnv({ status: 'error', message: errorMessage(reason) })
          })
        return () => {
          cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [root === undefined ? '' : root.path, settings.showEnv, subtreeSessionIds.join(','), warmTicket])

      /** Hover content listing the per-model split of one bucket map. */
      const modelContent = (models, title) => E('div', { className: 'dws-hoverCard' }, [
        E('strong', { key: 'title' }, title),
        ...Object.entries(models)
          .sort((left, right) => sumBuckets(right[1]) - sumBuckets(left[1]))
          .map(([model, buckets], index) => E('div', { key: model + index, className: 'dws-modelRow' }, [
            E('span', { key: 'name', className: 'dws-modelName' }, model),
            E('span', { key: 'value', className: 'dws-modelValue' }, formatCount(sumBuckets(buckets))),
          ])),
      ])

      /**
       * A token badge. The requirement asks for the whole subtree expanded, so a
       * page can list thousands of rows: past a bound the per-row hover card
       * (one component each) degrades to a native title with the same numbers.
       */
      const RICH_HOVER_LIMIT = 250
      const richHover = subtreeSessionIds.length <= RICH_HOVER_LIMIT
      const tokenBadge = (key, total, models, label) => (richHover
        ? SuiteHover({ key, anchor: Badge({ children: formatTokens(total), title: label }), content: modelContent(models, label) })
        : Badge({ key, children: formatTokens(total), title: modelSummaryText(models, label) }))

      /** Scroll the conversation to one turn after opening its session. */
      const jumpToTurn = (sessionId, turn) => {
        try {
          services.openSession(sessionId)
        } catch (reason) {
          warn('turn jump failed', reason)
          return
        }
        if (typeof document === 'undefined') return
        let attempts = 0
        const seek = () => {
          attempts += 1
          const node = document.querySelector('[data-chat-turn="' + String(turn) + '"]')
          if (node !== null && typeof node.scrollIntoView === 'function') {
            node.scrollIntoView({ block: 'center', behavior: 'smooth' })
            return
          }
          if (attempts < 20) setTimeout(seek, 150)
        }
        setTimeout(seek, 150)
      }

      const renderSession = (sessionId, depth) => {
        const summary = byId[sessionId]
        if (summary === undefined) return null
        const title = toStringOr(summary.displayTitle, toStringOr(summary.title, sessionId))
        const view = usageOf(sessionId)
        const total = view === undefined ? undefined : sumBuckets(view.totals)
        const turns = view === undefined || !Array.isArray(view.turns) ? [] : view.turns
        // The shipped `turnOutline` projection is the whole-log turn list (turn
        // number, start seq, bounded prompt preview), so a turn row can name the
        // prompt that produced it rather than only its number. No outline (or an
        // older build) degrades to the number label.
        const outline = (() => {
          const values = summary.projectionValues
          const raw = values === undefined || values === null ? undefined : values.turnOutline
          return Array.isArray(raw) ? raw : []
        })()
        const promptOf = (number) => {
          const indexed = outline.find((item) => item !== null && typeof item === 'object'
            && Number(item.number) === Number(number))
          const entry = indexed === undefined ? outline[Number(number) - 1] : indexed
          const prompt = entry === undefined || entry === null || entry.prompt === undefined ? '' : String(entry.prompt)
          return prompt.replace(/\s+/g, ' ').trim()
        }
        const archived = (workspaceState === null ? [] : workspaceState.archivedSessionIds || []).includes(sessionId)
        const pinned = (workspaceState === null ? [] : workspaceState.pinnedSessionIds || []).includes(sessionId)
        const row = E('div', {
          key: 'ov-session:' + sessionId,
          // The same row as the workspace list, so the overview shows the same
          // hierarchy instead of a second, flatter rendering of it.
          className: 'dws-sessionRow',
          style: { '--suite-indent': String(depth * 12) + 'px' },
          role: 'treeitem',
          // Double-clicking the session object (anything but its name) jumps to
          // that session, the overview's counterpart of the sidebar row click.
          onDoubleClick: (event) => {
            event.preventDefault()
            services.openSession(sessionId)
          },
        }, [
          E('span', { key: 'icon', className: 'dws-slot' }, icon('IconNewChatOutlineRegular', 14)),
          E(MarqueeTitle, {
            key: 'name',
            className: 'dws-title',
            title,
            onDoubleClick: (event) => {
              event.preventDefault()
              event.stopPropagation()
              dialogs.openDialog({ kind: 'rename-session', id: sessionId, draft: title })
            },
          }, title),
          total === undefined ? null : tokenBadge('tokens', total, view.models || {}, t('overview.sessionTokens')),
          E('span', { key: 'actions', className: 'dws-rowActions', onClick: (event) => event.stopPropagation(), style: { opacity: 1 } }, [
            // Rendered as a component, never called as a function: `RowMenu` owns
            // hooks, and calling it inline would fold them into this page's hook list,
            // so the row count would change the hook count (React error #300).
            E(RowMenu, {
              key: 'menu',
              label: t('browser.more'),
              menuLabel: title,
              items: [
                { id: 'open', label: t('overview.open'), icon: icon('IconRightUpOutlineRegular', 16) },
                {
                  id: 'rename',
                  label: t('browser.rename'),
                  icon: icon('IconEditOutlineRegular', 16),
                  shortcut: overviewShortcutOf('session.rename'),
                },
                { id: 'fork', label: t('browser.fork'), icon: icon('IconBranchOutlineRegular', 16), shortcut: overviewShortcutOf('session.fork') },
                {
                  id: 'pin',
                  label: pinned ? t('browser.unpin') : t('browser.pin'),
                  icon: icon(pinned ? 'IconPinFillRegular' : 'IconPinOutlineRegular', 16),
                },
                {
                  id: archived ? 'unarchive' : 'archive',
                  label: archived ? t('browser.unarchive') : t('browser.archive'),
                  icon: icon(archived ? 'IconUnarchiveOutlineRegular' : 'IconArchiveOutlineRegular', 16),
                  shortcut: overviewShortcutOf('session.archive'),
                },
              ],
              onSelect: (id) => {
                let work
                if (id === 'open') work = services.openSession(sessionId)
                else if (id === 'rename') work = dialogs.openDialog({ kind: 'rename-session', id: sessionId, draft: title })
                else if (id === 'fork') work = services.forkSession(sessionId)
                else if (id === 'pin') work = pinned ? services.unpin(sessionId) : services.pin(sessionId)
                else if (id === 'unarchive') work = services.unarchive(sessionId)
                else if (id === 'archive') work = services.archive(sessionId)
                Promise.resolve(work).catch((reason) => warn('overview action failed', reason))
              },
            }),
          ]),
        ])
        // Turns hang under their session as their own indented rows (a hierarchy,
        // not a row of numbers) and carry no token figure: the token total belongs
        // to the session row, which is where the requirement pins it.
        const turnRows = settings.showTurns !== true || turns.length === 0
          ? []
          : turns.slice(-TURN_ROW_LIMIT).map((entry) => E('div', {
            key: 'ov-turn:' + sessionId + ':' + String(entry[0]),
            className: 'dws-turnRow',
            style: { '--suite-indent': String((depth + 1) * 12) + 'px' },
            role: 'treeitem',
            'aria-level': depth + 1,
            // The tooltip carries this turn's prompt in full, not just its number.
            title: promptOf(entry[0]).length === 0 ? t('overview.turn', { n: entry[0] }) : promptOf(entry[0]),
            onClick: (event) => {
              event.preventDefault()
              jumpToTurn(sessionId, entry[0])
            },
          }, [
            E('span', { key: 'index', className: 'dws-turnIndex' }, '#' + String(entry[0])),
            E('span', { key: 'label', className: 'dws-turnTitle' }, (() => {
              const prompt = promptOf(entry[0])
              return prompt.length === 0 ? t('overview.turn', { n: entry[0] }) : prompt
            })()),
          ]))
        return [row, ...turnRows]
      }

      /** How many turn rows one session may draw before the list stops growing. */
      const TURN_ROW_LIMIT = 60

      const renderWorkspace = (workspace, depth) => {
        const children = tree.childrenOf.get(workspace.workspaceId) || []
        const selfIds = sessionIdsOf([workspace.workspaceId])
        let selfTotal = 0
        let selfFound = false
        const selfModels = {}
        for (const id of selfIds) {
          const view = usageOf(id)
          if (view === undefined) continue
          selfFound = true
          selfTotal += sumBuckets(view.totals)
          for (const [model, buckets] of Object.entries(view.models || {})) selfModels[model] = addBuckets(selfModels[model], buckets)
        }
        const customTitle = typeof workspace.title === 'string' ? workspace.title.trim() : ''
        const hasRemark = customTitle.length > 0 && customTitle !== baseName(workspace.path)
        const head = E('div', {
          key: 'ov-ws:' + workspace.workspaceId,
          // Same row shape as the workspace list; the requirement asks the
          // overview for the fully expanded hierarchy, so the folder is open.
          className: 'dws-wsRow',
          style: { '--suite-indent': String(depth * 12) + 'px' },
          role: 'treeitem',
          'aria-expanded': 'true',
        }, [
          E('span', { key: 'folder', className: 'dws-folderIcon' }, icon('IconFolderOpenRegular', 16)),
          E(MarqueeTitle, {
            key: 'name',
            className: 'dws-title dws-title--workspace',
            title: workspace.path,
            onDoubleClick: (event) => {
              event.preventDefault()
              event.stopPropagation()
              dialogs.openDialog({
                kind: 'rename-workspace',
                id: workspace.workspaceId,
                draft: customTitle.length > 0 ? customTitle : baseName(workspace.path),
              })
            },
          }, workspaceTitle(workspace, t('browser.folder'))),
          hasRemark ? E('span', { key: 'original', className: 'dws-original' }, baseName(workspace.path)) : null,
          selfFound ? tokenBadge('tokens', selfTotal, selfModels, t('overview.selfTokens')) : null,
          E('span', { key: 'actions', className: 'dws-rowActions', style: { opacity: 1 }, onClick: (event) => event.stopPropagation() }, [
            IconButton({
              key: 'new',
              label: t('browser.newSessionIn'),
              iconName: 'IconNewChatOutlineRegular',
              size: 14,
              onClick: () => {
                Promise.resolve(services.startSession(workspace.workspaceId)).catch((reason) => warn('start session failed', reason))
              },
            }),
            E(RowMenu, {
              key: 'menu',
              label: t('browser.more'),
              menuLabel: workspaceTitle(workspace, t('browser.folder')),
              items: [
                { id: 'focus', label: t('overview.pick'), icon: icon('IconDataOutlineRegular', 16) },
                {
                  id: 'new',
                  label: t('browser.newSessionIn'),
                  icon: icon('IconNewChatOutlineRegular', 16),
                  shortcut: overviewShortcutOf('session.new'),
                },
                { id: 'rename', label: t('browser.renameWorkspace'), icon: icon('IconEditOutlineRegular', 16) },
                { id: 'delete', label: t('browser.deleteWorkspace'), icon: icon('IconTrashOutlineRegular', 16), danger: true },
              ],
              onSelect: (id) => {
                if (id === 'focus') setRootId(workspace.workspaceId)
                else if (id === 'new') Promise.resolve(services.startSession(workspace.workspaceId)).catch((reason) => warn('start session failed', reason))
                else if (id === 'rename') {
                  dialogs.openDialog({
                    kind: 'rename-workspace',
                    id: workspace.workspaceId,
                    draft: customTitle.length > 0 ? customTitle : baseName(workspace.path),
                  })
                } else if (id === 'delete') {
                  dialogs.openDialog({
                    kind: 'delete-workspace',
                    id: workspace.workspaceId,
                    name: workspaceTitle(workspace, t('browser.folder')),
                  })
                }
              },
            }),
          ]),
        ])
        const rows = [head]
        for (const id of selfIds) {
          // Each session contributes its own row plus one nested row per turn.
          const produced = renderSession(id, depth + 1)
          if (Array.isArray(produced)) rows.push(...produced.filter((entry) => entry !== null))
          else if (produced !== null) rows.push(produced)
        }
        for (const child of children) rows.push(...renderWorkspace(child, depth + 1))
        return rows
      }

      const header = E('div', { className: 'dws-pageHeader' }, [
        E('div', { key: 'heading', className: 'dws-pageHeading' }, [
          E('div', { key: 'titleRow', className: 'dws-pageTitleRow' }, [
            E('span', { key: 'icon', className: 'dws-folderIcon dws-folderIcon--active' }, icon('IconFolderOpenRegular', 20)),
            E('h2', { key: 'title', className: 'dws-pageTitle' },
              root === undefined ? t('overview.title') : workspaceTitle(root, t('browser.folder'))),
            root === undefined ? null : tokenBadge('total', sumBuckets(subtreeUsage.totals), subtreeUsage.models, t('overview.totalTokens')),
          ]),
          E('div', { key: 'path', className: 'dws-pagePath dws-muted' }, root === undefined ? '' : root.path),
          E('div', { key: 'note', className: 'dws-pagePath dws-muted' }, [
            t('overview.totalTokens') + ': ' + formatCount(sumBuckets(subtreeUsage.totals)),
            missing > 0 ? ' \u00B7 ' + t('overview.stats.partial') : '',
            degraded ? ' \u00B7 ' + t('overview.stats.fallback') : '',
          ].join('')),
        ]),
        E('div', { key: 'actions', style: { display: 'flex', gap: '8px', flexShrink: 0 } }, [
          tree.roots.length === 0 ? null : E(RowMenu, {
            key: 'root',
            label: t('overview.pick'),
            side: 'bottom',
            triggerIcon: 'IconWorkspaceTreeOutlineRegular',
            triggerLabel: root === undefined ? t('overview.pick') : workspaceTitle(root, t('browser.folder')),
            items: tree.roots.map((workspace) => ({
              id: workspace.workspaceId,
              label: workspaceTitle(workspace, t('browser.folder')),
            })),
            onSelect: (value) => setRootId(value),
          }),
          E(SuiteButton, {
            key: 'refresh',
            onClick: () => {
              setWarmTicket((value) => value + 1)
            },
          }, t('overview.refresh')),
        ]),
      ])

      /**
       * The dependencies/environment card. Every figure comes from the top level only:
       * the listed child directories plus the probed files.
       */
      const renderEnvCard = () => {
        if (settings.showEnv !== true || env === null) return null
        const head = (extra) => E('div', { key: 'head', className: 'dws-cardHead' }, [
          E('h3', { key: 'title', className: 'dws-cardTitle' }, t('overview.env.title')),
          extra === undefined ? null : extra,
        ])
        if (env.status === 'loading') {
          return E('div', { key: 'env', className: 'dws-card' }, [
            head(),
            E('div', { key: 'loading', className: 'dws-muted' }, t('overview.env.loading')),
          ])
        }
        if (env.status === 'error') {
          return E('div', { key: 'env', className: 'dws-card' }, [
            head(),
            E('div', { key: 'error', className: 'dws-muted' }, t('overview.env.error', { message: env.message })),
          ])
        }
        const dirs = Array.isArray(env.dirs) ? env.dirs.slice() : []
        const notable = ['.git', '.github', 'node_modules', 'src', 'test', 'tests', 'dist', 'build', 'docs', 'scripts', 'deploy', 'coverage']
        const shown = dirs.sort((left, right) => {
          const rank = (name) => {
            const index = notable.indexOf(name.toLowerCase())
            return index === -1 ? notable.length : index
          }
          const gap = rank(left) - rank(right)
          return gap !== 0 ? gap : left.localeCompare(right)
        }).slice(0, 12)
        const pkg = env.pkg
        const facts = []
        if (pkg === null) {
          facts.push(E('span', { key: 'pkgNone', className: 'dws-muted' }, t('overview.env.pkgMissing')))
        } else if (pkg.parseError === true) {
          facts.push(E('span', { key: 'pkgBad', className: 'dws-muted' }, t('overview.env.parseError')))
        } else {
          facts.push(E('span', { key: 'pkgName', className: 'dws-statValue' },
            (pkg.name.length > 0 ? pkg.name : t('overview.env.unnamed')) + (pkg.version.length > 0 ? '@' + pkg.version : '')))
          facts.push(E('span', { key: 'pkgManager', className: 'dws-chip' },
            t('overview.env.manager') + ': ' + (pkg.packageManager.length > 0 ? pkg.packageManager : t('overview.env.managerNone'))))
          facts.push(E('span', { key: 'pkgScripts', className: 'dws-chip' }, t('overview.env.scripts') + ': ' + String(pkg.scripts)))
          facts.push(E('span', { key: 'pkgDeps', className: 'dws-chip' },
            t('overview.env.deps') + ': ' + String(pkg.dependencies) + ' / ' + String(pkg.devDependencies)))
          if (pkg.moduleType.length > 0) {
            facts.push(E('span', { key: 'pkgType', className: 'dws-chip' }, 'type: ' + pkg.moduleType))
          }
          const engines = enginesSummary(pkg.engines)
          if (engines.length > 0) {
            facts.push(E('span', { key: 'pkgEngines', className: 'dws-chip' }, t('overview.env.engines') + ': ' + engines))
          }
        }
        const chips = (Object.keys(env.probes === undefined ? {} : env.probes)).map((name) => E('span', {
          key: 'probe:' + name,
          className: 'dws-chip ' + (env.probes[name] === true ? 'dws-chip--on' : 'dws-chip--off'),
        }, name))
        return E('div', { key: 'env', className: 'dws-card' }, [
          head(),
          E('div', { key: 'dirs', className: 'dws-cardHead' }, [
            E('span', { key: 'label', className: 'dws-statLabel' },
              t('overview.env.dirs') + ': ' + String(dirs.length)),
            E('div', { key: 'row', className: 'dws-chipRow' }, dirs.length === 0
              ? E('span', { className: 'dws-muted' }, '\u2014')
              : shown.map((name) => E('span', { key: 'dir:' + name, className: 'dws-chip', title: name }, name))),
          ]),
          E('div', { key: 'facts', className: 'dws-statRow' }, facts),
          E('div', { key: 'probes', className: 'dws-cardHead' }, [
            E('span', { key: 'label', className: 'dws-statLabel' }, t('overview.env.probes')),
            E('div', { key: 'row', className: 'dws-chipRow' }, chips),
          ]),
        ])
      }

      // Scroll on the body, centre the cards in a 960px column: the same shape
      // the shipped entry pages use, so the panel cannot rely on a parent height.
      const body = E('div', { className: 'dws-pageBody' }, [E('div', { key: 'inner', className: 'dws-pageInner' }, [
        // A workspace with no session still says so instead of rendering nothing.
        sessionIdsOf(subtreeIds).length === 0
          ? E('div', { key: 'empty', className: 'dws-card dws-empty' }, t('overview.empty'))
          : null,
        // Each card carries its own boundary: one section that cannot render must not
        // take the page (or the workspace switch that led here) down with it.
        // Order: the workspace/session tree first (the page's subject), then the
        // dependencies/environment card, then the README.
        E(QuietBoundary, { key: 'treeBoundary', fallback: () => E('div', { className: 'dws-card dws-empty' }, t('overview.failed')) },
          E('div', { key: 'tree', className: 'dws-card' }, [
            E('div', { key: 'head', className: 'dws-cardHead' }, [
              E('h3', { key: 'title', className: 'dws-cardTitle' }, t('overview.tree.title')),
            ]),
            ...(root === undefined ? [E('div', { key: 'empty', className: 'dws-empty' }, t('overview.tree.empty'))] : renderWorkspace(root, 0)),
          ])),
        E(QuietBoundary, {
          key: 'envBoundary',
          fallback: () => E('div', { className: 'dws-card dws-empty' }, t('overview.failed')),
        }, renderEnvCard()),
        // Only a README that actually read shows a card; otherwise the section is
        // absent rather than an empty frame.
        settings.readme === true && readme !== null ? E('div', { key: 'readme', className: 'dws-card' }, [
          E('div', { key: 'head', className: 'dws-cardHead' }, [
            E('h3', { key: 'title', className: 'dws-cardTitle' }, t('overview.readme')),
            root === undefined ? null : E('span', { key: 'path', className: 'dws-muted', style: { fontSize: '12px' } }, normalizePath(root.path) + '/README.md'),
          ]),
          readmeError !== null
            ? E('div', { key: 'error', className: 'dws-readme dws-readme--empty' }, readmeError)
            : readme === null
              ? E('div', { key: 'loading', className: 'dws-readme dws-readme--empty' }, t('common.loading'))
              : E('div', {
                key: 'body',
                style: settings.readmeMaxHeightPct === undefined
                  ? undefined
                  : { maxHeight: 'calc(' + String(Math.min(90, Math.max(15, Number(settings.readmeMaxHeightPct) || 45))) + ' * 1vh)' },
              }, E(SuiteMarkdown, { text: readme, t })),
        ]) : null,
      ])])

      // A failure anywhere in the page degrades to a notice instead of the blank
      // white pane that a swallowed throw used to leave behind (and which then
      // persisted after switching to another workspace).
      const pageStyle = { '--suite-scrollbar-width': scrollbarWidthOf(settings) }
      return E(QuietBoundary, {
        fallback: () => E('div', { className: 'dws-page', 'data-panel': panelKey, style: pageStyle }, [
          header,
          E('div', { className: 'dws-pageBody' }, E('div', { className: 'dws-pageInner' },
            E('div', { className: 'dws-card dws-empty' }, t('overview.failed')))),
        ]),
      }, E('div', { className: 'dws-page', 'data-panel': panelKey, style: pageStyle }, [
        header,
        body,
        dialogs.element,
      ]))
    }

    /** The sidebar panel-list icon for the overview page. */
    function OverviewPanelIcon(props) {
      const size = props !== undefined && typeof props.size === 'number' ? props.size : 16
      return icon('IconGaugeOutlineRegular', size) || E('span', { 'aria-hidden': true }, '\u25A6')
    }
