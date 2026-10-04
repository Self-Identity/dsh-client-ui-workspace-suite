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
        .map(([model, buckets]) => model + ': ' + String(sumBuckets(buckets)))
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
      const [range, setRange] = React.useState(settings.usageRange === undefined ? 'd7' : settings.usageRange)
      const [readme, setReadme] = React.useState(null)
      const [readmeError, setReadmeError] = React.useState(null)
      const [warmTicket, setWarmTicket] = React.useState(0)
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

      const days = React.useMemo(() => {
        const keys = Object.keys(subtreeUsage.days).sort()
        if (range === 'all') return keys
        const wanted = recentDays(range === 'd30' ? 30 : 7)
        return wanted.filter((day) => keys.includes(day))
      }, [subtreeUsage, range])

      const dayMax = days.reduce((max, day) => Math.max(max, sumDayModels(subtreeUsage.days[day])), 0)

      /** Hover content listing the per-model split of one bucket map. */
      const modelContent = (models, title) => E('div', { className: 'dws-hoverCard' }, [
        E('strong', { key: 'title' }, title),
        ...Object.entries(models)
          .sort((left, right) => sumBuckets(right[1]) - sumBuckets(left[1]))
          .map(([model, buckets], index) => E('div', { key: model + index, className: 'dws-modelRow' }, [
            E('span', { key: 'name', className: 'dws-modelName' }, model),
            E('span', { key: 'value', className: 'dws-modelValue' }, String(sumBuckets(buckets))),
          ])),
        E('div', { key: 'hint', className: 'dws-hoverLine dws-muted' }, t('overview.chart.hint')),
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
          settings.showTurns === true ? E('span', { key: 'turns', className: 'dws-ovTurns' }, turns.length === 0
            ? [E('span', { key: 'none', className: 'dws-muted', style: { fontSize: '11px' } }, t('browser.noTurns'))]
            : [
              ...turns.slice(-24).map((entry) => E('button', {
                key: 'turn:' + entry[0],
                type: 'button',
                className: 'dws-turnLink',
                title: t('overview.turn', { n: entry[0] }),
                onClick: (event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  jumpToTurn(sessionId, entry[0])
                },
              }, String(entry[0]))),
              turns.length > 24 ? E('span', { key: 'more', className: 'dws-muted', style: { fontSize: '11px' } }, '+' + String(turns.length - 24)) : null,
            ]) : null,
          E('span', { key: 'actions', className: 'dws-rowActions', onClick: (event) => event.stopPropagation(), style: { opacity: 1 } }, [
            RowMenu({
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
        return row
      }

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
            RowMenu({
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
          const row = renderSession(id, depth + 1)
          if (row !== null) rows.push(row)
        }
        for (const child of children) rows.push(...renderWorkspace(child, depth + 1))
        return rows
      }

      const chart = E('div', { className: 'dws-card' }, [
        E('div', { key: 'head', className: 'dws-cardHead' }, [
          E('h3', { key: 'title', className: 'dws-cardTitle' }, t('overview.chart.title')),
          E(RowMenu, {
            key: 'range',
            label: t('overview.chart.title'),
            side: 'bottom',
            triggerIcon: 'IconGaugeOutlineRegular',
            triggerLabel: range === 'all' ? t('overview.chart.rangeAll') : range === 'd30' ? t('overview.chart.range30') : t('overview.chart.range7'),
            items: [
              { id: 'd7', label: t('overview.chart.range7') },
              { id: 'd30', label: t('overview.chart.range30') },
              { id: 'all', label: t('overview.chart.rangeAll') },
            ],
            onSelect: (value) => {
              setRange(value)
              writeSetting('usageRange', value)
            },
          }),
        ]),
        days.length === 0
          ? E('div', { key: 'empty', className: 'dws-empty' }, t('overview.chart.empty'))
          : E('div', { key: 'chart', className: 'dws-chart' }, [
            E('div', { key: 'bars', className: 'dws-chartBars' }, days.map((day) => {
              const models = subtreeUsage.days[day] || {}
              const value = sumDayModels(models)
              const height = dayMax <= 0 ? 0 : Math.max(2, Math.round((value / dayMax) * 140))
              return E(SuiteHover, {
                key: day,
                anchor: E('div', { className: 'dws-chartBarWrap', title: day + ' \u00B7 ' + String(value) }, [
                  E('div', { className: 'dws-chartFill', style: { height: String(height) + 'px' } }),
                ]),
                content: modelContent(models, t('overview.chart.day', { date: day }) + ' \u00B7 ' + String(value)),
              })
            })),
            E('div', { key: 'axis', className: 'dws-chartAxis' }, [
              E('span', { key: 'from' }, days[0]),
              E('span', { key: 'label' }, t('overview.chart.axis') + ' \u00B7 \u2264 ' + formatTokens(dayMax)),
              E('span', { key: 'to' }, days[days.length - 1]),
            ]),
          ]),
      ])

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
            t('overview.totalTokens') + ': ' + String(sumBuckets(subtreeUsage.totals)),
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

      // Scroll on the body, centre the cards in a 960px column: the same shape
      // the shipped entry pages use, so the panel cannot rely on a parent height.
      const body = E('div', { className: 'dws-pageBody' }, [E('div', { key: 'inner', className: 'dws-pageInner' }, [
        chart,
        E('div', { key: 'tree', className: 'dws-card' }, [
          E('div', { key: 'head', className: 'dws-cardHead' }, [
            E('h3', { key: 'title', className: 'dws-cardTitle' }, t('overview.tree.title')),
            E('span', { key: 'legend', className: 'dws-muted', style: { fontSize: '12px' } }, t('overview.turns')),
          ]),
          ...(root === undefined ? [E('div', { key: 'empty', className: 'dws-empty' }, t('overview.tree.empty'))] : renderWorkspace(root, 0)),
        ]),
        settings.readme === true ? E('div', { key: 'readme', className: 'dws-card' }, [
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

      return E('div', { className: 'dws-page', 'data-panel': panelKey }, [
        header,
        body,
        dialogs.element,
      ])
    }

    /** The sidebar panel-list icon for the overview page. */
    function OverviewPanelIcon(props) {
      const size = props !== undefined && typeof props.size === 'number' ? props.size : 16
      return icon('IconGaugeOutlineRegular', size) || E('span', { 'aria-hidden': true }, '\u25A6')
    }
