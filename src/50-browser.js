    /* ===================== sidebar workspace browser ======================= */

    /** Persisted view state: which workspaces are expanded and the archive filter. */
    const viewStore = storeKit.createSnapshotStore(
      { expanded: {}, archivedMode: 'hide' },
      { persist: { name: 'dsh-workspace-suite.view.v1' } },
    )

    /** Session status of one session, accepting a Map or a plain object. */
    function statusOf(statuses, sessionId) {
      if (statuses === undefined || statuses === null) return undefined
      if (typeof statuses.get === 'function') return statuses.get(sessionId)
      return statuses[sessionId]
    }

    /** The status label a session row shows when it is not idle. */
    function runningLabel(status) {
      if (status === undefined || status === null) return undefined
      if (status.pendingInteraction !== undefined && status.pendingInteraction !== null) return 'pending'
      return status.running === true ? 'running' : undefined
    }

    /**
     * The sidebar workspace browser this bundle registers instead of the
     * shipped one. It owns every row menu itself: a shadowing registration may
     * not re-declare the shipped entry's child holes, so the shipped session
     * menu entries cannot be rendered here.
     */
    function SuiteWorkspaceBrowser(props) {
      const { wide, t } = props
      const services = props.services === undefined || props.services === null ? {} : props.services
      const settings = useSettings()
      const { sessions, workspaces } = services
      const useWorkspaces = hookFrom(props, 'useWorkspaces', workspaces === undefined ? undefined : workspaces.list)
      const useSessions = hookFrom(props, 'useSessions', sessions === undefined ? undefined : sessions.list)
      // The host's shortcut rows, so menu entries can carry the same hints the
      // shipped menus show. A build without the hook simply shows no hints.
      const shortcutPairs = (() => {
        try {
          const read = props.useShortcuts
          if (typeof read !== 'function') return []
          const rows = read((list) => (Array.isArray(list) ? list : []))
          return Array.isArray(rows) ? rows : []
        } catch {
          return []
        }
      })()
      const shortcutOf = (id) => shortcutPairs.find((row) => row !== null && typeof row === 'object' && row.id === id)
      // Fast rename detection, shared with the picker: a second click on a row's NAME
      // inside RENAME_DOUBLE_CLICK_MS opens rename, while a second click anywhere else
      // runs the row's other double-click action. The single click keeps its current
      // meaning, so nothing feels delayed.
      const fastClickRef = React.useRef({ key: null, at: 0 })
      const rowClick = (key, onSingle, onName, onBody) => (event) => {
        const now = Date.now()
        const previous = fastClickRef.current
        const target = event.target
        const onNameCell = target !== null && target !== undefined && typeof target.closest === 'function'
          && target.closest('[data-row-name]') !== null
        if (previous.key === key && now - previous.at <= RENAME_DOUBLE_CLICK_MS) {
          fastClickRef.current = { key: null, at: 0 }
          event.preventDefault()
          if (onNameCell && onName !== undefined) onName()
          else if (onBody !== undefined) onBody()
          return
        }
        fastClickRef.current = { key, at: now }
        onSingle()
      }
      const view = React.useSyncExternalStore(viewStore.subscribe, viewStore.getSnapshot)
      const [query, setQuery] = React.useState('')
      const [searchOpen, setSearchOpen] = React.useState(false)
      const [contentResults, setContentResults] = React.useState(null)
      const [contentSearching, setContentSearching] = React.useState(false)
      const [dialog, setDialog] = React.useState(null)
      const [notice, setNotice] = React.useState(null)
      const [pickerOpen, setPickerOpen] = React.useState(false)
      // The inline picker only ever serves the "add workspace" flow now: the row
      // menu's old "workspace selection" entry is gone (it is not possible to move
      // existing sessions between workspaces — a session's workspace comes from its
      // cwd, which no client API can change), so there is no second intent to pass.
      const openPicker = () => setPickerOpen(true)
      const noticeTimer = React.useRef(null)

      const workspaceState = useWorkspaces === null ? null : useWorkspaces((state) => state)
      const sessionList = useSessions === null ? null : useSessions((state) => state)
      const items = workspaceState === null || workspaceState.items === undefined ? [] : workspaceState.items
      const archived = new Set(workspaceState === null || workspaceState.archivedSessionIds === undefined ? [] : workspaceState.archivedSessionIds)
      const pinned = new Set(workspaceState === null || workspaceState.pinnedSessionIds === undefined ? [] : workspaceState.pinnedSessionIds)
      const byId = sessionList === null || sessionList.byId === undefined ? {} : sessionList.byId
      const statuses = typeof props.useSessionStatus === 'function' ? props.useSessionStatus((state) => state) : undefined
      const panelActive = typeof props.usePanelInfo === 'function' ? props.usePanelInfo((info) => info.activePanelId !== null) : false
      const tree = React.useMemo(() => buildWorkspaceTree(items), [items])
      const currentSessionId = panelActive
        ? undefined
        : Object.keys(byId).find((id) => ((byId[id].retainedBy || {}).mainView || 0) > 0)

      const showNotice = React.useCallback((message) => {
        setNotice(message)
        if (noticeTimer.current !== null) clearTimeout(noticeTimer.current)
        noticeTimer.current = setTimeout(() => {
          noticeTimer.current = null
          setNotice(null)
        }, 4000)
      }, [])

      React.useEffect(() => () => {
        if (noticeTimer.current !== null) clearTimeout(noticeTimer.current)
      }, [])

      /** Open one workspace (its blank session or reuse) and select it. */
      const openWorkspace = (workspaceId) => {
        runAction(() => boundCall(services, 'openWorkspace', workspaceId))
      }

      const openSession = (sessionId) => {
        try {
          services.openSession(sessionId)
        } catch (reason) {
          showNotice(t('browser.failed', { message: errorMessage(reason) }))
        }
      }

      const runAction = (work) => {
        Promise.resolve().then(work).catch((reason) => showNotice(t('browser.failed', { message: errorMessage(reason) })))
      }

      /** True when the host refused an archive because the session still has work running. */
      const isActiveRefusal = (reason) => {
        if (reason === null || reason === undefined) return false
        const rpcError = reason.rpcError
        const code = rpcError === null || rpcError === undefined ? '' : String(rpcError.code || '')
        const message = String(reason.message === undefined ? reason : reason.message)
        return code === 'workspace/session-active' || message.indexOf('session-active') !== -1
      }

      /**
       * Archive or restore one session.
       *
       * The service face exposes `archive` / `unarchive`; the previous call sites used
       * the service's own `archiveSession` method name, which does not exist on that
       * face, so every click was rejected before it ever reached the host.
       *
       * A session whose turn/subagent/job is still running is refused with
       * `workspace/session-active`. The shipped UI confirms that case and retries with
       * `{ stopActivity: true }`; this dialog asks the same question instead of failing
       * silently.
       */
      const toggleArchive = (row, force) => {
        const stop = force === true
        const work = row.archived
          ? boundCall(services, 'unarchive', row.id)
          : boundCall(services, 'archive', row.id, stop ? { stopActivity: true } : undefined)
        Promise.resolve().then(work).catch((reason) => {
          if (row.archived !== true && stop !== true && isActiveRefusal(reason)) {
            const label = row.summary === undefined
              ? String(row.id)
              : toStringOr(row.summary.displayTitle, toStringOr(row.summary.title, row.id))
            setDialog({ kind: 'archive-active', id: row.id, name: label })
            return
          }
          showNotice(t('browser.failed', { message: errorMessage(reason) }))
        })
      }

      /** Sessions shown under one workspace, honouring the archive filter. */
      const sessionsOf = (workspace) => {
        const ids = Array.isArray(workspace.sessionIds) ? workspace.sessionIds : []
        const mode = view.archivedMode === undefined ? 'hide' : view.archivedMode
        const rows = []
        for (const id of ids) {
          const summary = byId[id]
          if (summary === undefined) continue
          if (summary.blank === true && id !== currentSessionId) continue
          if (summary.origin === 'subagent') continue
          const isArchived = archived.has(id)
          if (mode === 'hide' && isArchived) continue
          if (mode === 'only' && !isArchived) continue
          rows.push({ id, summary, archived: isArchived, pinned: pinned.has(id) })
        }
        rows.sort((left, right) => {
          if (left.pinned !== right.pinned) return left.pinned ? -1 : 1
          return timestamp(right.summary.updatedAt) - timestamp(left.summary.updatedAt)
        })
        return rows
      }

      const ungrouped = React.useMemo(() => {
        const accounted = new Set()
        for (const workspace of items) for (const id of workspace.sessionIds || []) accounted.add(id)
        const mode = view.archivedMode === undefined ? 'hide' : view.archivedMode
        const rows = []
        for (const id of Object.keys(byId)) {
          if (accounted.has(id)) continue
          const summary = byId[id]
          if (summary.blank === true && id !== currentSessionId) continue
          if (summary.origin === 'subagent') continue
          const isArchived = archived.has(id)
          if (mode === 'hide' && isArchived) continue
          if (mode === 'only' && !isArchived) continue
          rows.push({ id, summary, archived: isArchived, pinned: pinned.has(id) })
        }
        rows.sort((left, right) => {
          if (left.pinned !== right.pinned) return left.pinned ? -1 : 1
          return timestamp(right.summary.updatedAt) - timestamp(left.summary.updatedAt)
        })
        return rows
      }, [items, byId, archived, pinned, currentSessionId, view.archivedMode])

      const isExpanded = (workspaceId) => {
        const stored = view.expanded === undefined ? undefined : view.expanded[workspaceId]
        if (typeof stored === 'boolean') return stored
        // Tree semantics by default: rows start collapsed, so the closed-folder
        // icon shows until the user expands the row.
        return settings.collapseAllByDefault === false
      }

      const setExpanded = (workspaceId, value) => {
        viewStore.update((draft) => {
          draft.expanded = { ...(draft.expanded || {}), [workspaceId]: value }
        })
      }

      const setAllExpanded = (value) => {
        const next = {}
        for (const workspace of items) next[workspace.workspaceId] = value
        viewStore.update((draft) => {
          draft.expanded = next
        })
      }

      const anyCollapsed = items.some((workspace) => !isExpanded(workspace.workspaceId))
      const archivedMode = view.archivedMode === undefined ? 'hide' : view.archivedMode

      /**
       * Native folding: a workspace shows its pinned, running and current
       * sessions plus the newest five idle ones; "Show more" adds five at a time
       * and "Show less" returns to the first batch.
       */
      const REVEAL_STEP = 5
      const revealOf = (workspaceId) => {
        const stored = view.reveal === undefined ? undefined : view.reveal[workspaceId]
        return typeof stored === 'number' && stored >= REVEAL_STEP ? stored : REVEAL_STEP
      }
      const setReveal = (workspaceId, value) => {
        viewStore.update((draft) => {
          draft.reveal = { ...(draft.reveal || {}), [workspaceId]: value }
        })
      }

      /** The three-way archive visibility control the shipped browser offers. */
      const archiveMenu = (size) => E(RowMenu, {
        key: 'archived',
        label: t('browser.showArchived.label'),
        menuLabel: t('browser.showArchived.label'),
        iconName: 'IconArchiveOutlineRegular',
        size,
        items: [
          {
            id: 'hide',
            label: (archivedMode === 'hide' ? '\u2713 ' : '') + t('browser.showArchived.hide'),
            icon: icon('IconArchiveOffOutlineRegular', 16),
          },
          {
            id: 'all',
            label: (archivedMode === 'all' ? '\u2713 ' : '') + t('browser.showArchived'),
            icon: icon('IconArchiveOutlineRegular', 16),
          },
          {
            id: 'only',
            label: (archivedMode === 'only' ? '\u2713 ' : '') + t('browser.showArchived.only'),
            icon: icon('IconArchiveCheckOutlineRegular', 16),
          },
        ],
        onSelect: (value) => {
          viewStore.update((draft) => {
            draft.archivedMode = value
          })
        },
      })

      /** Token total carried by one session's projection value, when present. */
      const tokensOf = (sessionId) => {
        if (settings.showTokens !== true) return undefined
        const summary = byId[sessionId]
        const view = usageViewOf(summary)
        if (view === undefined) return undefined
        return sumBuckets(view.totals)
      }

      /**
       * The native `sidebar.session.row.leading` ledger entries (the active
       * schedule mark). A shadowing registration may not re-declare the shipped
       * entry's child holes, so the entries are read off the ledger and rendered
       * directly, each with its own locale namespace bound and behind a boundary.
       */
      const leadingEntries = React.useMemo(() => {
        try {
          const registry = services.slots
          if (registry === undefined || registry === null || typeof registry.entries !== 'function') return []
          const entries = registry.entries('sidebar.session.row.leading')
          return Array.isArray(entries) ? entries : []
        } catch {
          return []
        }
      }, [services])

      const leadingSeat = (sessionId) => {
        if (leadingEntries.length === 0) return null
        return leadingEntries.map((entry) => {
          if (entry === null || typeof entry !== 'object' || typeof entry.component !== 'function') return null
          const id = entry.options === undefined ? 'seat' : String(entry.options.id === undefined ? 'seat' : entry.options.id)
          let seatT
          try {
            seatT = typeof services.bindLocale === 'function'
              ? services.bindLocale(entry.options === undefined ? undefined : entry.options.locale)
              : undefined
          } catch {
            seatT = undefined
          }
          return E(QuietBoundary, { key: id },
            E(entry.component, seatT === undefined ? { sessionId } : { sessionId, t: seatT }))
        })
      }

      const renderSessionRow = (row, depth) => {
        const summary = row.summary
        const title = toStringOr(summary.displayTitle, toStringOr(summary.title, row.id))
        const status = statusOf(statuses, row.id)
        const tokens = tokensOf(row.id)
        const idle = status === undefined || status === null
          || (status.running !== true
            && (status.pendingInteraction === undefined || status.pendingInteraction === null))
        const leading = idle
          ? E('span', { key: 'dot', className: 'dws-slot' }, leadingSeat(row.id))
          : E('span', { key: 'dot', className: 'dws-slot' }, E('span', {
            style: {
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--dsw-alias-state-business-primary)',
              display: 'inline-block',
            },
          }))
        const rowNode = E('div', {
          key: 'session:' + row.id,
          className: 'dws-sessionRow' + (row.id === currentSessionId ? ' dws-sessionRow--selected' : '')
            + (row.archived ? ' dws-sessionRow--archived' : ''),
          style: { '--suite-indent': String(sessionIndentOf(depth)) + 'px' },
          role: 'treeitem',
          'aria-selected': row.id === currentSessionId ? 'true' : 'false',
          onClick: rowClick(
            'session:' + row.id,
            () => {
              if (row.archived) {
                showNotice(t('browser.archived'))
                return
              }
              openSession(row.id)
            },
            () => setDialog({ kind: 'rename-session', id: row.id, draft: title }),
            () => openSession(row.id),
          ),
        }, [
          leading,
          E(MarqueeTitle, { key: 'title', className: 'dws-title', title }, title),
          E('span', { key: 'time', className: 'dws-time' }, relativeTime(summary.updatedAt, t)),
          E('span', { key: 'actions', className: 'dws-rowActions', onClick: (event) => event.stopPropagation() }, [
            E(IconButton, {
              key: 'pin',
              label: row.pinned ? t('browser.unpin') : t('browser.pin'),
              iconName: row.pinned ? 'IconPinFillRegular' : 'IconPinOutlineRegular',
              size: 14,
              onClick: () => runAction(row.pinned
                ? boundCall(services, 'unpinSession', row.id)
                : boundCall(services, 'pinSession', row.id)),
            }),
            E(IconButton, {
              key: 'archive',
              label: row.archived ? t('browser.unarchive') : t('browser.archive'),
              iconName: row.archived ? 'IconUnarchiveOutlineRegular' : 'IconArchiveOutlineRegular',
              size: 14,
              onClick: () => toggleArchive(row),
            }),
            E(RowMenu, {
              key: 'menu',
              label: t('browser.more'),
              menuLabel: title,
              items: [
                {
                  id: 'rename',
                  label: t('browser.rename'),
                  icon: icon('IconEditOutlineRegular', 16),
                  shortcut: shortcutOf('session.rename'),
                },
                { id: 'fork', label: t('browser.fork'), icon: icon('IconBranchOutlineRegular', 16), shortcut: shortcutOf('session.fork') },
                {
                  id: 'pin',
                  label: row.pinned ? t('browser.unpin') : t('browser.pin'),
                  icon: icon(row.pinned ? 'IconPinFillRegular' : 'IconPinOutlineRegular', 16),
                },
                {
                  id: row.archived ? 'unarchive' : 'archive',
                  label: row.archived ? t('browser.unarchive') : t('browser.archive'),
                  icon: icon(row.archived ? 'IconUnarchiveOutlineRegular' : 'IconArchiveOutlineRegular', 16),
                  shortcut: shortcutOf('session.archive'),
                },
              ],
              onSelect: (id) => {
                if (id === 'rename') setDialog({ kind: 'rename-session', id: row.id, draft: title })
                else if (id === 'fork') runAction(boundCall(services, 'forkSession', row.id))
                else if (id === 'pin') runAction(row.pinned ? boundCall(services, 'unpinSession', row.id) : boundCall(services, 'pinSession', row.id))
                else if (id === 'unarchive' || id === 'archive') toggleArchive(row)
              },
            }),
          ]),
        ])
        return E(SuiteHover, {
          anchor: rowNode,
          disabled: false,
          content: E('div', { className: 'dws-hoverCard' }, [
            E('strong', { key: 'title' }, title),
            E('div', { key: 'id', className: 'dws-hoverLine dws-muted' }, row.id),
            E('div', { key: 'time', className: 'dws-hoverLine dws-secondary' },
              relativeTime(summary.updatedAt, t) + (row.archived ? ' \u00B7 ' + t('browser.archived') : '')),
          ]),
        })
      }

      /**
       * Leading indent of a **workspace** row.
       *
       * Every nested level adds exactly one row "lead unit": the folder icon's width
       * (16px) plus the row gap (6px) = 22px. That makes the child's folder icon start
       * precisely where its parent's title text starts (8px row padding + 16 + 6 = 30px
       * from the row's left edge), which is the alignment the user asked for — instead
       * of the previous flat ladder that only nudged the child a few pixels right.
       */
      const WORKSPACE_LEVEL_STEP = 22
      const workspaceIndentOf = (depth) => (depth <= 0 ? 0 : depth * WORKSPACE_LEVEL_STEP)

      /**
       * Leading indent of a **session** row: its own workspace's indent plus a small
       * step, so a session always sits just right of the workspace row it belongs to.
       *
       * A shared ladder only worked for the first level: from the second level on a
       * child workspace moved to 30/52/74px while its sessions stayed at 3/9/21px, so
       * the sessions rendered to the *left* of their own workspace. `sessionDepth` is
       * the workspace depth + 1 (the caller's convention); SESSION_INDENT_STEP keeps
       * the root-level sessions exactly where they were (8 + 3 = 11px).
       */
      const SESSION_INDENT_STEP = 3
      const TURN_INDENT_STEP = 6
      const sessionIndentOf = (sessionDepth) => workspaceIndentOf(sessionDepth <= 0 ? 0 : sessionDepth - 1) + SESSION_INDENT_STEP
      const turnIndentOf = (sessionDepth) => sessionIndentOf(sessionDepth) + TURN_INDENT_STEP

      const renderWorkspace = (workspace, depth) => {
        const children = tree.childrenOf.get(workspace.workspaceId) || []
        const expanded = isExpanded(workspace.workspaceId)
        const sessions = expanded ? sessionsOf(workspace) : []
        // Fold idle rows the way the shipped browser does: pinned, running and
        // the current session always show; the rest arrive five at a time.
        const limit = revealOf(workspace.workspaceId)
        let idleSeen = 0
        const visibleSessions = sessions.filter((row) => {
          const status = statusOf(statuses, row.id)
          if (row.pinned || row.id === currentSessionId || (status !== undefined && status !== null && status.running === true)) return true
          idleSeen += 1
          return idleSeen <= limit
        })
        const hiddenSessions = sessions.length - visibleSessions.length
        const selfTokens = (() => {
          if (settings.showTokens !== true) return undefined
          let sum = 0
          let found = false
          for (const id of workspace.sessionIds || []) {
            const tokens = tokensOf(id)
            if (tokens === undefined) continue
            sum += tokens
            found = true
          }
          return found ? sum : undefined
        })()
        const customTitle = typeof workspace.title === 'string' ? workspace.title.trim() : ''
        const hasRemark = customTitle.length > 0 && customTitle !== baseName(workspace.path)
        const rowNode = E('div', {
          key: 'ws:' + workspace.workspaceId,
          className: 'dws-wsRow' + (currentSessionId !== undefined && (workspace.sessionIds || []).includes(currentSessionId) ? ' dws-wsRow--current' : ''),
          style: { '--suite-indent': String(workspaceIndentOf(depth)) + 'px' },
          role: 'treeitem',
          'aria-expanded': expanded ? 'true' : 'false',
          // No always-on chevron, so the row itself carries the keyboard
          // affordance: Enter/Space toggle, arrows expand and collapse.
          tabIndex: 0,
          title: workspace.path,
          // Tree semantics: the row itself expands and collapses; a second click on
          // the name renames and one elsewhere opens the workspace.
          onClick: rowClick(
            'ws:' + workspace.workspaceId,
            () => setExpanded(workspace.workspaceId, !expanded),
            () => setDialog({
              kind: 'rename-workspace',
              id: workspace.workspaceId,
              draft: customTitle.length > 0 ? customTitle : baseName(workspace.path),
            }),
            () => openWorkspace(workspace.workspaceId),
          ),
          onKeyDown: (event) => {
            const key = event.key
            if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
              event.preventDefault()
              setExpanded(workspace.workspaceId, !expanded)
            } else if (key === 'ArrowRight' && !expanded) {
              event.preventDefault()
              setExpanded(workspace.workspaceId, true)
            } else if (key === 'ArrowLeft' && expanded) {
              event.preventDefault()
              setExpanded(workspace.workspaceId, false)
            }
          },
          onDoubleClick: (event) => {
            event.preventDefault()
            openWorkspace(workspace.workspaceId)
          },
        }, [
          E('span', { key: 'folder', className: 'dws-folderIcon' + (expanded ? ' dws-folderIcon--active' : '') },
            icon(expanded ? 'IconFolderOpenRegular' : 'IconFolderCloseRegular', 16)),
          E(MarqueeTitle, {
            key: 'text',
            className: 'dws-title dws-title--workspace',
            style: { display: 'flex', alignItems: 'baseline', gap: '2px', minWidth: 0 },
          }, [
            E('span', {
              key: 'name',
              className: 'dws-ellipsis',
              // The native convention: double-clicking a title opens rename.
              onDoubleClick: (event) => {
                event.preventDefault()
                event.stopPropagation()
                setDialog({
                  kind: 'rename-workspace',
                  id: workspace.workspaceId,
                  draft: customTitle.length > 0 ? customTitle : baseName(workspace.path),
                })
              },
            }, workspaceTitle(workspace, t('browser.folder'))),
            hasRemark
              ? E('span', { key: 'original', className: 'dws-original dws-ellipsis' }, baseName(workspace.path))
              : null,
          ]),
          E('span', { key: 'actions', className: 'dws-rowActions', onClick: (event) => event.stopPropagation() }, [
            E(IconButton, {
              key: 'new',
              label: t('browser.newSessionIn'),
              iconName: 'IconNewChatOutlineRegular',
              size: 14,
              onClick: () => runAction(boundCall(services, 'startSession', workspace.workspaceId)),
            }),
            E(RowMenu, {
              key: 'menu',
              label: t('browser.more'),
              menuLabel: workspaceTitle(workspace, t('browser.folder')),
              items: [
                { id: 'new', label: t('browser.newSessionIn'), icon: icon('IconNewChatOutlineRegular', 16), shortcut: shortcutOf('session.new') },
                { id: 'overview', label: t('browser.overview'), icon: icon('IconDataOutlineRegular', 16) },
                { id: 'rename', label: t('browser.renameWorkspace'), icon: icon('IconEditOutlineRegular', 16) },
                { id: 'delete', label: t('browser.deleteWorkspace'), icon: icon('IconTrashOutlineRegular', 16), danger: true },
              ],
              onSelect: (id) => {
                if (id === 'new') runAction(boundCall(services, 'startSession', workspace.workspaceId))
                else if (id === 'overview') services.openOverview(workspace.workspaceId)
                else if (id === 'rename') setDialog({ kind: 'rename-workspace', id: workspace.workspaceId, draft: customTitle.length > 0 ? customTitle : baseName(workspace.path) })
                else if (id === 'delete') setDialog({ kind: 'delete-workspace', id: workspace.workspaceId, name: workspaceTitle(workspace, t('browser.folder')) })
              },
            }),
          ]),
        ])
        const rows = [E(SuiteHover, {
          anchor: rowNode,
          content: E('div', { className: 'dws-hoverCard' }, [
            E('strong', { key: 'title' }, workspaceTitle(workspace, t('browser.folder'))),
            E('div', { key: 'path', className: 'dws-hoverLine dws-muted' }, workspace.path),
            E('div', { key: 'count', className: 'dws-hoverLine dws-secondary' },
              t('browser.turns', { n: (workspace.sessionIds || []).length })),
          ]),
        })]
        if (expanded) {
          for (const row of visibleSessions) rows.push(renderSessionRow(row, depth + 1))
          if (hiddenSessions > 0) {
            rows.push(E('div', {
              key: 'more:' + workspace.workspaceId,
              className: 'dws-moreRow',
              style: { '--suite-indent': String(turnIndentOf(depth)) + 'px' },
            }, E(TextButton, {
              onClick: () => setReveal(workspace.workspaceId, limit + REVEAL_STEP),
            }, t('browser.showMore') + ' (' + String(hiddenSessions) + ')')))
          } else if (limit > REVEAL_STEP) {
            rows.push(E('div', {
              key: 'less:' + workspace.workspaceId,
              className: 'dws-moreRow',
              style: { '--suite-indent': String(turnIndentOf(depth)) + 'px' },
            }, E(TextButton, {
              onClick: () => setReveal(workspace.workspaceId, REVEAL_STEP),
            }, t('browser.showLess'))))
          }
          for (const child of children) rows.push(renderWorkspace(child, depth + 1))
        }
        return rows
      }

      // Metadata search plus the host's content search, replacing the tree view.
      const needle = query.trim().toLowerCase()
      const metadataResults = React.useMemo(() => {
        if (needle.length === 0) return []
        const out = []
        for (const workspace of items) {
          if (workspace.path.toLowerCase().includes(needle) || String(workspace.title || '').toLowerCase().includes(needle)) {
            out.push({ kind: 'workspace', id: workspace.workspaceId, title: workspaceTitle(workspace, t('browser.folder')), meta: workspace.path })
          }
        }
        for (const id of Object.keys(byId)) {
          const summary = byId[id]
          if (summary.origin === 'subagent') continue
          const title = toStringOr(summary.displayTitle, toStringOr(summary.title, id))
          if (title.toLowerCase().includes(needle)) {
            out.push({ kind: 'session', id, title, meta: toStringOr(summary.cwd, '') })
          }
        }
        return out.slice(0, 20)
      }, [needle, items, byId, t])

      React.useEffect(() => {
        if (needle.length === 0) {
          setContentResults(null)
          setContentSearching(false)
          return undefined
        }
        if (typeof services.searchSessions !== 'function') return undefined
        const controller = typeof AbortController === 'function' ? new AbortController() : null
        setContentSearching(true)
        const timer = setTimeout(() => {
          Promise.resolve(services.searchSessions(query.trim(), controller === null ? undefined : controller.signal))
            .then((result) => {
              setContentSearching(false)
              setContentResults(Array.isArray(result) ? result : [])
            })
            .catch(() => {
              setContentSearching(false)
              setContentResults(null)
            })
        }, 250)
        return () => {
          clearTimeout(timer)
          if (controller !== null) controller.abort()
        }
      }, [needle, query, services])

      // A 56px rail cannot hold a horizontal icon row, so the same controls
      // stack into a column there and the search affordance expands the sidebar
      // first (the owner hands us `expandSidebar` for exactly that).
      const header = E('div', { className: 'dws-header' + (wide ? '' : ' dws-header--rail') }, wide
        ? [
          E('span', { key: 'label', className: 'dws-headerLabel' }, searchOpen ? '' : t('browser.title')),
          searchOpen
            ? E('div', { key: 'search', className: 'dws-searchBox' }, [
              E('input', {
                key: 'input',
                className: 'dws-searchInput',
                autoFocus: true,
                placeholder: t('browser.search.placeholder'),
                'aria-label': t('browser.search'),
                value: query,
                onChange: (event) => setQuery(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Escape') {
                    setQuery('')
                    setSearchOpen(false)
                  }
                },
              }),
              E(IconButton, {
                key: 'close',
                label: t('common.close'),
                iconName: 'IconCloseOutlineRegular',
                size: 14,
                onClick: () => {
                  setQuery('')
                  setSearchOpen(false)
                },
              }),
            ])
            : null,
          searchOpen ? null : E(IconButton, {
            key: 'searchButton',
            label: t('browser.search'),
            iconName: 'IconSearchOutlineRegular',
            size: 16,
            onClick: () => setSearchOpen(true),
          }),
          archiveMenu(16),
          E(IconButton, {
            key: 'collapse',
            label: anyCollapsed ? t('browser.expandAll') : t('browser.collapseAll'),
            iconName: 'IconWorkspaceTreeOutlineRegular',
            size: 16,
            pressed: anyCollapsed,
            onClick: () => setAllExpanded(anyCollapsed),
          }),
          E(IconButton, {
            key: 'add',
            label: t('browser.add'),
            iconName: 'IconProjectAddOutlineRegular',
            size: 16,
            onClick: () => openPicker(),
          }),
        ]
        : [
          E(IconButton, {
            key: 'search',
            label: t('browser.search'),
            iconName: 'IconSearchOutlineRegular',
            size: 18,
            onClick: () => {
              if (typeof props.expandSidebar === 'function') props.expandSidebar()
              setSearchOpen(true)
            },
          }),
          archiveMenu(18),
          E(IconButton, {
            key: 'collapse',
            label: anyCollapsed ? t('browser.expandAll') : t('browser.collapseAll'),
            iconName: 'IconWorkspaceTreeOutlineRegular',
            size: 18,
            pressed: anyCollapsed,
            onClick: () => setAllExpanded(anyCollapsed),
          }),
          E(IconButton, { key: 'add', label: t('browser.add'), iconName: 'IconProjectAddOutlineRegular', size: 18, onClick: () => openPicker() }),
        ])

      const body = (() => {
        if (searchOpen && needle.length > 0) {
          const rows = []
          for (const result of metadataResults) {
            rows.push(E('button', {
              key: 'meta:' + result.kind + ':' + result.id,
              type: 'button',
              className: 'dws-searchRow',
              onClick: () => {
                setQuery('')
                setSearchOpen(false)
                if (result.kind === 'session') openSession(result.id)
                else openWorkspace(result.id)
              },
            }, [
              E('span', { key: 'head', className: 'dws-searchHead' }, [
                E('span', { key: 'icon', className: 'dws-folderIcon' },
                  icon(result.kind === 'workspace' ? 'IconFolderCloseRegular' : 'IconNewChatOutlineRegular', 16)),
                E('span', { key: 'title', className: 'dws-title' }, result.title),
              ]),
              E('span', { key: 'meta', className: 'dws-searchMeta' }, [
                E('span', { key: 'path', className: 'dws-snippet' }, result.meta),
              ]),
            ]))
          }
          for (const result of contentResults === null ? [] : contentResults) {
            if (result === null || typeof result !== 'object') continue
            const id = result.sessionId === undefined ? result.id : result.sessionId
            if (typeof id !== 'string') continue
            const summary = byId[id]
            const title = summary === undefined ? id : toStringOr(summary.displayTitle, toStringOr(summary.title, id))
            rows.push(E('button', {
              key: 'content:' + id,
              type: 'button',
              className: 'dws-searchRow',
              onClick: () => {
                setQuery('')
                setSearchOpen(false)
                openSession(id)
              },
            }, [
              E('span', { key: 'head', className: 'dws-searchHead' }, [
                E('span', { key: 'icon', className: 'dws-folderIcon' }, icon('IconNewChatOutlineRegular', 16)),
                E('span', { key: 'title', className: 'dws-title' }, title),
              ]),
              E('span', { key: 'meta', className: 'dws-searchMeta' }, [
                E('span', { key: 'snippet', className: 'dws-snippet' }, toStringOr(result.snippet, '')),
              ]),
            ]))
          }
          if (rows.length === 0) {
            rows.push(E('div', { key: 'empty', className: 'dws-empty' },
              contentSearching ? t('browser.search.searching') : t('browser.search.empty')))
          }
          return E('div', { key: 'results', className: 'dws-searchResults' }, rows)
        }
        if (items.length === 0 && ungrouped.length === 0) {
          return E('div', { key: 'empty', className: 'dws-empty' }, [
            E('div', { key: 'title' }, t('browser.empty')),
            E('div', { key: 'hint', style: { marginTop: '4px' } }, t('browser.empty.hint')),
          ])
        }
        const rows = []
        for (const root of tree.roots) rows.push(...renderWorkspace(root, 0))
        if (ungrouped.length > 0) {
          // A separate section, not a fake workspace row: a hairline divider plus a small
          // caption reads as "the rest of the list", while a folder row would look
          // clickable (it never was) and a coloured line would clash with the theme's
          // blue-means-selected language.
          rows.push(E('div', { key: 'ungroupedDivider', className: 'dws-sectionDivider', role: 'separator' }))
          rows.push(E('div', { key: 'ungrouped', className: 'dws-sectionTitle' }, [
            E('span', { key: 'title' }, t('browser.ungrouped')),
            E('span', { key: 'count', className: 'dws-sectionCount' }, String(ungrouped.length)),
          ]))
          for (const row of ungrouped) rows.push(renderSessionRow(row, 1))
        }
        return E('div', { key: 'tree', className: 'dws-treeBody' }, rows)
      })()

      // The list fills the space down to the account row and scrolls inside it,
      // exactly like the shipped session list; `treeMaxHeightPct` only caps how far
      // it may grow (100 = no cap). Shrinking the area instead would leave the blank
      // band above the account row that this used to show.
      const maxHeight = settings.treeScroll === true
        ? { maxHeight: String(Math.min(100, Math.max(20, Number(settings.treeMaxHeightPct) || 100))) + 'vh' }
        : {}

      const listArea = E('div', {
        className: 'dws-scroll',
        style: { flex: '1 1 auto', minHeight: 0, ...maxHeight },
      }, body)

      /**
       * Delete one workspace together with everything under it. The removal runs in
       * passes, deepest first, re-reading the live list each pass: the earlier
       * single-chain version left the next level behind, so the parent had to be
       * deleted again and again. Whatever refuses to go is reported.
       */
      const deleteSubtree = async (rootId, rootPath) => {
        const deleteOne = (id) => Promise.resolve(services.deleteWorkspace(id))
        const descendants = () => services.readWorkspaceItems()
          .filter((item) => item !== null && typeof item === 'object'
            && item.workspaceId !== rootId && typeof item.path === 'string' && isAncestorPath(rootPath, item.path))
          .sort((left, right) => foldPath(right.path).length - foldPath(left.path).length)
        for (let pass = 0; pass < 8; pass += 1) {
          const doomed = descendants()
          if (doomed.length === 0) break
          for (const item of doomed) {
            try {
              await deleteOne(item.workspaceId)
            } catch (reason) {
              warn('cascade delete failed', reason)
            }
          }
        }
        try {
          await deleteOne(rootId)
        } catch (reason) {
          warn('workspace delete failed', reason)
        }
        const left = descendants().length
        if (left > 0) showNotice(t('browser.deleteResidue', { n: left }))
      }

      const dialogs = []
      if (dialog !== null && (dialog.kind === 'rename-workspace' || dialog.kind === 'rename-session')) {
        const isWorkspace = dialog.kind === 'rename-workspace'
        const title = isWorkspace ? t('browser.renameWorkspaceTitle') : t('browser.renameTitle')
        // Shipped-dialog rules: a blank or unchanged name cannot be confirmed, and
        // a duplicate workspace name is reported inside the dialog instead of in a
        // toast, which is what the native rename window does.
        const draft = String(dialog.draft || '').trim()
        const current = (() => {
          if (isWorkspace) {
            const item = items.find((entry) => entry.workspaceId === dialog.id)
            return item === undefined ? '' : String(item.title || '').trim()
          }
          const summary = byId[dialog.id]
          return summary === undefined ? '' : toStringOr(summary.displayTitle, toStringOr(summary.title, '')).trim()
        })()
        const duplicate = isWorkspace && draft.length > 0 && draft !== current
          && items.some((item) => item.workspaceId !== dialog.id && String(item.title || '').trim() === draft)
        const renameProblem = draft.length === 0
          ? t('browser.empty.name')
          : duplicate ? t('browser.duplicate') : null
        const renameBlocked = draft.length === 0 || renameProblem !== null || draft === current
        const confirmRename = () => {
          if (renameBlocked) return
          setDialog(null)
          if (isWorkspace) runAction(services.renameWorkspace(dialog.id, draft))
          else runAction(services.renameSession(dialog.id, draft))
        }
        dialogs.push(E(SuiteModal, {
          key: 'rename',
          open: true,
          onClose: () => setDialog(null),
          title,
          closeLabel: t('common.close'),
          footer: E(React.Fragment, null, [
            E(SuiteButton, { key: 'cancel', variant: 'outline', onClick: () => setDialog(null) }, t('common.cancel')),
            E(SuiteButton, {
              key: 'ok',
              variant: 'primary',
              disabled: renameBlocked,
              onClick: confirmRename,
            }, t('common.confirm')),
          ]),
        }, [
          E('input', {
            key: 'input',
            className: 'dws-renameInput',
            'data-modal-autofocus': true,
            'aria-label': title,
            placeholder: t('browser.namePlaceholder'),
            value: dialog.draft || '',
            onChange: (event) => setDialog({ ...dialog, draft: event.target.value }),
            onFocus: (event) => event.target.select(),
            onKeyDown: (event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                confirmRename()
              }
            },
          }),
          renameProblem === null
            ? null
            : E('div', { key: 'error', className: 'dws-renameError' }, renameProblem),
        ]))
      }
      if (dialog !== null && dialog.kind === 'delete-workspace') {
        // Deleting a workspace takes its whole subtree with it: a child whose parent
        // is gone would otherwise linger as an orphan. The dialog lists what goes, so
        // the count is never a surprise, and the deepest entries are removed first.
        const target = items.find((item) => item.workspaceId === dialog.id)
        const doomed = target === undefined ? [] : items
          .filter((item) => item.workspaceId !== dialog.id && isAncestorPath(target.path, item.path))
          .sort((left, right) => foldPath(right.path).length - foldPath(left.path).length)
        const names = doomed.map((item) => workspaceTitle(item, t('browser.folder')))
        const preview = names.slice(0, 6).join('\u3001')
        dialogs.push(E(SuiteModal, {
          key: 'delete',
          open: true,
          onClose: () => setDialog(null),
          title: t('browser.deleteTitle'),
          closeLabel: t('common.close'),
          footer: E('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } }, [
            E(SuiteButton, { key: 'cancel', onClick: () => setDialog(null) }, t('common.cancel')),
            E(SuiteButton, {
              key: 'ok',
              variant: 'primary',
              onClick: () => {
                setDialog(null)
                // Children first (by passes), then the target itself.
                if (target === undefined) runAction(services.deleteWorkspace(dialog.id))
                else void deleteSubtree(dialog.id, target.path)
              },
            }, t('common.confirm')),
          ]),
        }, E('div', { style: { fontSize: '13px', lineHeight: '20px' } }, [
          E('div', { key: 'body' }, t('browser.deleteBody', { name: dialog.name })),
          doomed.length === 0 ? null : E('div', { key: 'cascade', className: 'dws-warn', style: { marginTop: '8px' } },
            t('browser.deleteCascade', { n: doomed.length, names: preview + (names.length > 6 ? '\u2026' : '') })),
        ])))
      }
      if (dialog !== null && dialog.kind === 'archive-active') {
        // The host refused the archive because this session still has work running.
        // Confirm once, then archive with `stopActivity: true` (shipped behaviour).
        dialogs.push(E(SuiteModal, {
          key: 'archiveActive',
          open: true,
          onClose: () => setDialog(null),
          title: t('browser.archiveActiveTitle'),
          closeLabel: t('common.close'),
          footer: E(React.Fragment, null, [
            E(SuiteButton, { key: 'cancel', variant: 'outline', onClick: () => setDialog(null) }, t('common.cancel')),
            E(SuiteButton, {
              key: 'ok',
              variant: 'primary',
              onClick: () => {
                const id = dialog.id
                setDialog(null)
                toggleArchive({ id, archived: false }, true)
              },
            }, t('browser.archiveActiveConfirm')),
          ]),
        }, E('div', { style: { fontSize: '13px', lineHeight: '20px' } },
          t('browser.archiveActiveBody', { name: dialog.name }))))
      }

      return E('div', {
        className: 'dws-root' + (wide ? '' : ' dws-root--rail'),
        // Scopes this plugin's scrollbar width to its own scroll areas.
        style: { '--suite-scrollbar-width': scrollbarWidthOf(settings) },
      }, [
        header,
        // The tree area carries the shipped bottom fade: the last rows dissolve into
        // the sidebar fill instead of ending on a hard edge above the account row.
        E('div', { key: 'list', className: 'dws-listWrap' }, [
          listArea,
          E('div', { key: 'fade', className: 'dws-fade', 'aria-hidden': 'true' }),
        ]),
        notice === null ? null : E('div', { key: 'notice', className: 'dws-empty', style: { padding: '8px' } }, notice),
        ...dialogs,
        E(DirectoryExplorer, {
          key: 'picker',
          open: pickerOpen,
          t,
          settings,
          listDirectory: services.listDirectory,
          createDirectory: services.createDirectory,
          createWorkspace: services.createWorkspace,
          renameWorkspace: services.renameWorkspace,
          readWorkspaceItems: services.readWorkspaceItems,
          startSession: services.startSession,
          workspacesHook: useWorkspaces,
          ...(typeof services.pickDirectory === 'function' ? { pick: services.pickDirectory } : {}),
          ownCreate: (path) => services.createWorkspace({ path }),
          onPicked: () => {},
          onCancel: () => setPickerOpen(false),
          onError: (message) => showNotice(t('browser.failed', { message })),
        }),
      ])
    }
