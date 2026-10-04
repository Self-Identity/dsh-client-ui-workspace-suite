    /* ======================= explorer directory picker ====================== */

    /** Depth-keyed cache of one directory level. */
    function createListingCache(listDirectory) {
      const levels = new Map()
      const load = (path, force) => {
        const key = foldPath(path)
        const cached = levels.get(key)
        if (cached !== undefined && cached.status === 'ready' && force !== true) return Promise.resolve(cached)
        const pending = cached !== undefined && cached.status === 'loading' ? cached.promise : null
        if (pending !== null) return pending
        const controller = typeof AbortController === 'function' ? new AbortController() : null
        const timer = controller === null ? null : setTimeout(() => controller.abort(), 20000)
        const record = { status: 'loading' }
        const promise = Promise.resolve()
          .then(() => listDirectory(path, controller === null ? undefined : controller.signal))
          .then((listing) => {
            if (timer !== null) clearTimeout(timer)
            const next = {
              status: 'ready',
              home: toStringOr(listing && listing.home, ''),
              crumbs: Array.isArray(listing && listing.crumbs) ? listing.crumbs : [],
              truncated: listing !== undefined && listing !== null && listing.truncated === true,
              entries: (Array.isArray(listing && listing.entries) ? listing.entries : [])
                .filter((entry) => entry !== null && typeof entry === 'object' && typeof entry.path === 'string')
                .map((entry) => ({
                  name: typeof entry.name === 'string' && entry.name.length > 0 ? entry.name : baseName(entry.path),
                  path: entry.path,
                  hidden: entry.hidden === true,
                })),
            }
            levels.set(key, next)
            return next
          })
          .catch((error) => {
            if (timer !== null) clearTimeout(timer)
            const failed = { status: 'error', message: errorMessage(error) }
            levels.set(key, failed)
            return failed
          })
        levels.set(key, { status: 'loading', promise })
        return promise
      }
      return { load, peek: (path) => levels.get(foldPath(path)) }
    }

    /** `value` when it is a non-empty string, otherwise the fallback. */
    function toStringOr(value, fallback) {
      return typeof value === 'string' && value.length > 0 ? value : fallback
    }

    /** Windows drive letters worth probing for a system-root view (A:/B: skipped). */
    const DRIVE_LETTERS = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

    /**
     * The explorer dialog.
     *
     * Rendered from two places: as the occupant of a `directoryFlow` single hole
     * (owner props `open`/`busy`/`onPicked`/`onCancel`/`onError`), and directly
     * by our own workspace browser, which passes `ownCreate`.
     */
    function DirectoryExplorer(props) {
      const {
        open, busy, t, onPicked, onCancel, onError, ownCreate,
        listDirectory, createWorkspace, renameWorkspace,
      } = props
      // The settings snapshot may be supplied by the caller (the workspace
      // browser already holds one); otherwise this dialog reads the store.
      const liveSettings = useSettings()
      const settings = props.settings === undefined ? liveSettings : props.settings
      const [nodes, setNodes] = React.useState(() => new Map())
      const [expanded, setExpanded] = React.useState(() => new Set())
      const [selected, setSelected] = React.useState(() => new Map())
      const [filter, setFilter] = React.useState('')
      const [showHidden, setShowHidden] = React.useState(false)
      const [pathDraft, setPathDraft] = React.useState(null)
      const [error, setError] = React.useState(null)
      const [breakRequest, setBreakRequest] = React.useState(null)
      const [creating, setCreating] = React.useState(false)
      const cache = React.useMemo(() => createListingCache(listDirectory), [listDirectory])
      const generation = React.useRef(0)
      const treeRef = React.useRef(null)

      // Remarks of already-registered workspaces come from the root hook the
      // slot kit provides; the sidebar passes its own hook so the two agree.
      const workspacesHook = props.workspacesHook === undefined || props.workspacesHook === null
        ? (typeof props.useWorkspaces === 'function' ? props.useWorkspaces : null)
        : props.workspacesHook
      const workspaceItems = workspacesHook === null || workspacesHook === undefined
        ? []
        : workspacesHook((state) => state.items) || []
      // Registrations read live so a workspace created moments ago is visible;
      // the hook snapshot above only feeds the first render's remark preview.
      const readItems = typeof props.readWorkspaceItems === 'function'
        ? props.readWorkspaceItems
        : () => workspaceItems

      /** Fold one level into the node table. */
      const ingest = React.useCallback((path, listing) => {
        setNodes((previous) => {
          const next = new Map(previous)
          next.set(foldPath(path), { status: listing.status, message: listing.message, listing })
          return next
        })
      }, [])

      const ensure = React.useCallback((path, depth) => {
        const key = foldPath(path)
        if (nodes.has(key) && nodes.get(key).status === 'ready') return
        cache.load(path).then((listing) => ingest(path, listing))
      }, [cache, ingest, nodes])

      /** Load and expand the levels leading down to one path. */
      const revealPath = (path) => {
        cache.load(path).then((listing) => {
          if (listing.status !== 'ready') return
          ingest(path, listing)
          const chain = chainForPath(listing, path)
          setExpanded((previous) => {
            const next = new Set(previous)
            for (const level of chain) next.add(foldPath(level))
            return next
          })
          const walk = (index) => {
            if (index >= chain.length) return
            const level = chain[index]
            cache.load(level).then((loaded) => {
              if (loaded.status === 'ready') ingest(level, loaded)
              walk(index + 1)
            })
          }
          walk(0)
        })
      }

      /**
       * Pre-select the folders the dialog was opened with, so a dialog opened
       * from a workspace menu mirrors the current workspace state instead of
       * starting empty.
       */
      const seedSelection = () => {
        const seeds = typeof props.initialPaths === 'function'
          ? props.initialPaths()
          : Array.isArray(props.initialPaths)
            ? props.initialPaths
            : readItems().map((item) => (item === null || typeof item !== 'object' ? '' : item.path))
        const paths = (Array.isArray(seeds) ? seeds : [])
          .filter((value) => typeof value === 'string' && value.length > 0)
          .slice(0, 40)
        if (paths.length === 0) return
        setSelected((previous) => {
          const next = new Map(previous)
          for (const value of paths) {
            const key = foldPath(value)
            if (next.has(key)) continue
            next.set(key, { path: value, remark: remarkFor(value) })
          }
          return next
        })
        for (const value of paths.slice(0, 12)) revealPath(value)
      }

      const toggle = React.useCallback((path) => {
        setExpanded((previous) => {
          const next = new Set(previous)
          const key = foldPath(path)
          if (next.has(key)) next.delete(key)
          else next.add(key)
          return next
        })
        ensure(path)
      }, [ensure])

      /** Open or close one level without flipping (arrow-key semantics). */
      const setOpen = React.useCallback((path, open) => {
        setExpanded((previous) => {
          const key = foldPath(path)
          if (open === previous.has(key)) return previous
          const next = new Set(previous)
          if (open) next.add(key)
          else next.delete(key)
          return next
        })
        if (open) ensure(path)
      }, [ensure])

      /**
       * Keyboard navigation over the tree: arrows move the roving focus and
       * expand/collapse, Enter and Space toggle the selection. Native Modal
       * already supplies the focus trap and Escape.
       */
      const onTreeKeyDown = (event) => {
        const container = treeRef.current
        if (container === null || event.altKey || event.ctrlKey || event.metaKey) return
        const rows = Array.from(container.querySelectorAll('[role="treeitem"]'))
        if (rows.length === 0) return
        const active = typeof document === 'undefined' ? null : document.activeElement
        const owner = active === null || typeof active.closest !== 'function' ? null : active.closest('[role="treeitem"]')
        const index = owner === null || owner === null ? -1 : rows.indexOf(owner)
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          const step = event.key === 'ArrowDown' ? 1 : -1
          const nextIndex = index < 0
            ? (step > 0 ? 0 : rows.length - 1)
            : Math.min(rows.length - 1, Math.max(0, index + step))
          const target = rows[nextIndex]
          if (target !== undefined && typeof target.focus === 'function') target.focus()
          return
        }
        const path = owner === null ? null : owner.getAttribute('data-path')
        if (path === null || path === undefined) return
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          setOpen(path, true)
          return
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          setOpen(path, false)
          return
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          toggleSelect(path)
        }
      }

      // First open: reset the dialog and list the system root plus the home level.
      React.useEffect(() => {
        if (open !== true) return undefined
        const run = generation.current + 1
        generation.current = run
        setNodes(new Map())
        setSelected(new Map())
        setFilter('')
        setPathDraft(null)
        setError(null)
        setBreakRequest(null)
        const rootKey = '::root::'
        setExpanded(new Set([rootKey]))
        /** Publish one synthetic root level (drive list, or the home fallback). */
        const publishRoot = (listing) => {
          setNodes((previous) => {
            const next = new Map(previous)
            next.set(rootKey, { status: listing.status, message: listing.message, listing })
            return next
          })
        }
        Promise.all(DRIVE_LETTERS.map((letter) => cache.load(letter + ':/')
          .then((listing) => (listing.status === 'ready' ? { path: letter + ':/', listing } : null))
          .catch(() => null)))
          .then((results) => {
            if (generation.current !== run) return undefined
            const drives = results.filter((item) => item !== null)
            if (drives.length > 0) {
              setNodes((previous) => {
                const next = new Map(previous)
                for (const drive of drives) next.set(foldPath(drive.path), { status: 'ready', listing: drive.listing })
                next.set(rootKey, {
                  status: 'ready',
                  listing: {
                    status: 'ready',
                    home: '',
                    crumbs: [],
                    truncated: false,
                    entries: drives.map((drive) => ({ name: drive.path, path: drive.path, hidden: false })),
                  },
                })
                return next
              })
              // Open the configured depth below the home directory.
              const homeListing = drives.map((drive) => drive.listing).find((listing) => toStringOr(listing.home, '') !== '')
              const home = homeListing === undefined ? '' : homeListing.home
              if (home !== '') preload(home, 0)
              seedSelection()
              return undefined
            }
            // No probeable drive (POSIX host, or every letter refused): fall back
            // to the host's home level so the dialog is never empty.
            return cache.load('').then((listing) => {
              if (generation.current !== run) return undefined
              if (listing.status !== 'ready') {
                publishRoot(listing)
                return undefined
              }
              publishRoot(listing)
              for (const entry of listing.entries.slice(0, 2)) preload(entry.path, 0)
              seedSelection()
              return undefined
            })
          })
          .catch((reason) => {
            if (generation.current === run) setError(errorMessage(reason))
          })
        return undefined
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [open])

      /** Open the configured number of levels below one path. */
      const preload = React.useCallback((path, depth) => {
        const depthLimit = Math.max(0, Math.min(4, Number(settings.pickerDepth) || 0))
        const walk = (current, level) => {
          if (level > depthLimit) return
          setExpanded((previous) => {
            const next = new Set(previous)
            next.add(foldPath(current))
            return next
          })
          cache.load(current).then((listing) => {
            if (listing.status !== 'ready') return
            ingest(current, listing)
            if (level === depthLimit) return
            for (const entry of listing.entries.slice(0, 8)) walk(entry.path, level + 1)
          })
        }
        walk(path, 0)
      }, [cache, ingest, settings.pickerDepth])

      if (open !== true) return null

      const rootKey = '::root::'
      const isSelected = (path) => selected.has(foldPath(path))

      /** Selected direct or indirect descendants of one path. */
      const selectedDescendants = (path) => {
        const out = []
        for (const key of selected.keys()) {
          const entry = selected.get(key)
          if (isAncestorPath(path, entry.path)) out.push(key)
        }
        return out
      }

      const toggleSelect = (path, remark) => {
        const key = foldPath(path)
        if (selected.has(key)) {
          const descendants = selectedDescendants(path)
          if (descendants.length > 0) {
            setBreakRequest({ path, descendants })
            return
          }
          setSelected((previous) => {
            const next = new Map(previous)
            next.delete(key)
            return next
          })
          return
        }
        setSelected((previous) => {
          const next = new Map(previous)
          next.set(key, { path, remark: remark === undefined ? remarkFor(path) : remark })
          return next
        })
      }

      /** Remark already stored for a registered workspace with this path. */
      const remarkFor = (path) => {
        const found = registeredFor(path)
        if (found === undefined) return undefined
        const title = typeof found.title === 'string' ? found.title.trim() : ''
        return title.length === 0 || title === baseName(found.path) ? undefined : title
      }

      /** The registered workspace owning one path, if there is one. */
      const registeredFor = (path) => {
        const key = foldPath(path)
        return readItems().find((item) => item !== null && typeof item === 'object' && foldPath(item.path) === key)
      }

      const visibleEntries = (path) => {
        const record = nodes.get(foldPath(path))
        if (record === undefined || record.status !== 'ready') return []
        const all = Array.isArray(record.listing.entries) ? record.listing.entries : []
        const needle = filter.trim().toLowerCase()
        return all.filter((entry) => {
          if (entry.hidden && !showHidden) return false
          if (needle.length === 0) return true
          return entry.name.toLowerCase().includes(needle)
        })
      }

      const renderLevel = (path, depth, keyPrefix) => {
        const record = nodes.get(foldPath(path))
        const rows = []
        if (record !== undefined && record.status === 'error') {
          rows.push(E('div', { key: keyPrefix + ':error', className: 'dws-warn', style: { padding: '4px 8px' } },
            t('picker.error.list', { message: record.message })))
          return rows
        }
        if (record === undefined || record.status === 'loading') {
          rows.push(E('div', { key: keyPrefix + ':loading', className: 'dws-empty' }, t('picker.loading')))
          return rows
        }
        const entries = visibleEntries(path)
        if (entries.length === 0) {
          rows.push(E('div', { key: keyPrefix + ':empty', className: 'dws-empty', style: { padding: '6px 8px' } }, t('picker.empty')))
          return rows
        }
        for (const entry of entries) {
          const entryKey = foldPath(entry.path)
          const isOpen = expanded.has(entryKey)
          const childRecord = nodes.get(entryKey)
          const hasChildren = childRecord === undefined || childRecord.status !== 'ready'
            ? true
            : childRecord.listing.entries.length > 0
          rows.push(E('div', {
            key: keyPrefix + ':' + entryKey,
            className: 'dws-pickerRow' + (isSelected(entry.path) ? ' dws-pickerRow--selected' : ''),
            style: { '--suite-indent': String(depth * 14) + 'px' },
            role: 'treeitem',
            'aria-level': depth + 1,
            'aria-expanded': hasChildren ? (isOpen ? 'true' : 'false') : undefined,
            'aria-selected': isSelected(entry.path) ? 'true' : 'false',
            'data-path': entry.path,
            tabIndex: -1,
            title: entry.path,
            onClick: () => toggle(entry.path),
            onDoubleClick: (event) => {
              event.preventDefault()
              toggleSelect(entry.path)
            },
          }, [
            E('button', {
              key: 'chev',
              type: 'button',
              className: 'dws-chev' + (isOpen ? ' dws-chev--open' : '') + (hasChildren ? '' : ' dws-chev--empty'),
              'aria-label': isOpen ? t('picker.collapse') : t('picker.expand'),
              'aria-expanded': hasChildren ? (isOpen ? 'true' : 'false') : undefined,
              tabIndex: hasChildren ? 0 : -1,
              disabled: !hasChildren,
              onClick: (event) => {
                event.preventDefault()
                event.stopPropagation()
                toggle(entry.path)
              },
            }, icon('IconTriangleRightFillRegular', 12)),
            E(SuiteCheck, {
              key: 'check',
              checked: isSelected(entry.path),
              label: entry.name,
              onToggle: () => toggleSelect(entry.path),
            }),
            E('span', { key: 'icon', className: 'dws-folderIcon' },
              icon(isOpen ? 'IconFolderOpenRegular' : 'IconFolderCloseRegular', 16)),
            E('span', { key: 'name', className: 'dws-pickerName' }, entry.name),
          ]))
          if (isOpen) rows.push(...renderLevel(entry.path, depth + 1, keyPrefix + ':' + entryKey))
        }
        if (record.listing.truncated) {
          rows.push(E('div', { key: keyPrefix + ':trunc', className: 'dws-warn', style: { padding: '4px 8px' } }, t('picker.root')))
        }
        return rows
      }

      const previewNodes = () => {
        const list = [...selected.values()].slice().sort((left, right) => {
          const depth = foldPath(left.path).length - foldPath(right.path).length
          return depth !== 0 ? depth : left.path.localeCompare(right.path)
        })
        return list.map((entry) => {
          let depth = 0
          for (const other of list) {
            if (other !== entry && isAncestorPath(other.path, entry.path)) depth += 1
          }
          return { ...entry, depth }
        })
      }

      const submit = () => {
        const list = previewNodes()
        if (list.length === 0) return
        const primary = list[0]
        setCreating(true)
        setError(null)
        const finish = () => {
          setCreating(false)
          onCancel()
        }
        const fail = (reason) => {
          setCreating(false)
          const message = errorMessage(reason)
          setError(message)
          if (typeof onError === 'function') onError(message)
        }
        if (typeof ownCreate === 'function') {
          // This dialog owns creation: adopt every selected path (an already
          // registered path is only renamed) and write each remark.
          Promise.all(list.map((entry) => ensureWorkspace((path) => ownCreate(path), entry)))
            .then(finish)
            .catch(fail)
          return
        }
        // Hole mode: the flow owner adopts the primary path; the remaining
        // selections are created here. Remarks are applied to both.
        Promise.resolve(onPicked(primary.path))
          .then(() => Promise.all([
            applyRemarkEventually(primary, 8),
            ...list.slice(1).map((entry) => ensureWorkspace((path) => createWorkspace({ path }), entry).catch(() => undefined)),
          ]))
          .then(finish)
          .catch(fail)
      }

      /**
       * Adopt one selected path: an already registered path is renamed only,
       * a new one is created and then renamed.
       */
      const ensureWorkspace = (creator, entry) => {
        const registered = registeredFor(entry.path)
        if (registered !== undefined) return applyRemarkToId(registered.workspaceId, entry)
        return Promise.resolve(creator(entry.path)).then((workspace) => {
          const id = workspace === undefined || workspace === null ? undefined : workspace.workspaceId
          if (id === undefined) return applyRemarkEventually(entry, 8)
          return applyRemarkToId(id, entry)
        })
      }

      /** Write one entry's remark onto a workspace id, skipping a no-op write. */
      const applyRemarkToId = (workspaceId, entry) => {
        const remark = typeof entry.remark === 'string' ? entry.remark.trim() : ''
        if (remark.length === 0 || typeof renameWorkspace !== 'function') return Promise.resolve(undefined)
        const existing = readItems().find((item) => item !== null && typeof item === 'object' && item.workspaceId === workspaceId)
        const current = existing === undefined || typeof existing.title !== 'string' ? '' : existing.title.trim()
        if (current === remark) return Promise.resolve(undefined)
        return Promise.resolve(renameWorkspace(workspaceId, remark)).catch((reason) => {
          warn('remark write failed', reason)
          return undefined
        })
      }

      /** Wait briefly for a newly adopted path to appear, then write its remark. */
      const applyRemarkEventually = (entry, attempts) => {
        const registered = registeredFor(entry.path)
        if (registered !== undefined) return applyRemarkToId(registered.workspaceId, entry)
        const remark = typeof entry.remark === 'string' ? entry.remark.trim() : ''
        if (remark.length === 0 || attempts <= 0) return Promise.resolve(undefined)
        return new Promise((resolve) => setTimeout(resolve, 250))
          .then(() => applyRemarkEventually(entry, attempts - 1))
      }

      const crumbs = (() => {
        const rootRecord = nodes.get('::root::')
        const primary = previewNodes()[0]
        const record = primary === undefined ? undefined : nodes.get(foldPath(primary.path))
        if (record !== undefined && record.status === 'ready' && record.listing.crumbs.length > 0) {
          return record.listing.crumbs.slice(-4)
        }
        if (rootRecord !== undefined && rootRecord.status === 'ready' && rootRecord.listing.crumbs.length > 0) {
          return rootRecord.listing.crumbs.slice(-4)
        }
        if (rootRecord !== undefined && rootRecord.status === 'ready' && rootRecord.listing.home !== '') {
          return [{ name: rootRecord.listing.home, path: rootRecord.listing.home }]
        }
        return []
      })()

      const body = E('div', { className: 'dws-dialogBody' }, [
        E('div', { key: 'crumbs', className: 'dws-dialogToolbar' }, [
          pathDraft === null
            ? E('div', { key: 'trail', className: 'dws-crumbs', style: { flex: '1 1 auto' } }, [
              ...(crumbs.length === 0 ? [E('span', { key: 'none', className: 'dws-muted' }, t('picker.root'))] : []),
              ...crumbs.map((crumb, index) => E('span', { key: crumb.path, className: 'dws-crumbs' }, [
                index > 0 ? E('span', { key: 'sep', className: 'dws-muted' }, '/') : null,
                E('button', {
                  key: 'crumb',
                  type: 'button',
                  className: 'dws-crumb',
                  title: crumb.path,
                  onClick: (event) => {
                    event.preventDefault()
                    toggle(crumb.path)
                  },
                }, toStringOr(crumb.name, crumb.path)),
              ])),
              E(TextButton, { key: 'edit', onClick: () => setPathDraft(crumbs.length > 0 ? crumbs[crumbs.length - 1].path : '') },
                t('picker.root')),
            ])
            : E('div', { key: 'draft', className: 'dws-inlineEdit' }, [
              E('input', {
                key: 'input',
                className: 'dws-input',
                value: pathDraft,
                'aria-label': t('picker.title'),
                autoFocus: true,
                onChange: (event) => setPathDraft(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    const target = pathDraft.trim()
                    if (target.length > 0) preload(target, 0)
                    setPathDraft(null)
                  } else if (event.key === 'Escape') {
                    setPathDraft(null)
                  }
                },
              }),
              E(SuiteButton, { key: 'go', variant: 'primary', onClick: () => {
                const target = pathDraft.trim()
                if (target.length > 0) preload(target, 0)
                setPathDraft(null)
              } }, t('picker.open')),
            ]),
          E('span', { key: 'filter', style: { flex: '0 1 180px', minWidth: '0', display: 'flex' } },
            E('input', {
              className: 'dws-input',
              style: { width: '100%' },
              placeholder: t('picker.filter'),
              'aria-label': t('picker.filter'),
              value: filter,
              onChange: (event) => setFilter(event.target.value),
            })),
          E('label', { key: 'hidden', className: 'dws-muted', style: { display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' } }, [
            E('input', {
              key: 'cb',
              type: 'checkbox',
              checked: showHidden,
              onChange: (event) => setShowHidden(event.target.checked),
            }),
            t('picker.hidden'),
          ]),
        ]),
        E('div', {
          key: 'tree',
          ref: treeRef,
          className: 'dws-pickerTree',
          role: 'tree',
          'aria-label': t('picker.title'),
          onKeyDown: onTreeKeyDown,
        }, [
          ...renderLevel(rootKey, 0, 'root'),
        ]),
        E('div', { key: 'preview', className: 'dws-pickerScroll' }, [
          E('div', { key: 'head', className: 'dws-previewHead' }, [
            E('span', { key: 'title' }, t('picker.preview.title')),
            E('span', { key: 'count' }, t('picker.selected', { n: selected.size })),
          ]),
          E('div', { key: 'body', className: 'dws-previewBody' }, selected.size === 0
            ? [E('div', { key: 'empty', className: 'dws-muted' }, t('picker.preview.empty'))]
            : [
              E('div', { key: 'hint', className: 'dws-muted', style: { marginBottom: '2px' } }, t('picker.preview.rename')),
              E('div', { key: 'line', className: 'dws-previewLine' }, previewNodes().map((entry) => E('div', {
                key: foldPath(entry.path),
                className: 'dws-previewNode',
              }, [
                E('span', { key: 'conn', className: 'dws-previewConnector' },
                  '\u2502 '.repeat(Math.max(0, entry.depth - 1)) + (entry.depth > 0 ? '\u251C\u2500 ' : '')),
                E('span', { key: 'icon', className: 'dws-folderIcon' }, icon('IconFolderCloseRegular', 14)),
                E('span', {
                  key: 'name',
                  className: 'dws-previewName',
                  title: entry.path,
                  onDoubleClick: (event) => {
                    event.preventDefault()
                    setBreakRequest(null)
                    setSelected((previous) => {
                      const next = new Map(previous)
                      const key = foldPath(entry.path)
                      const current = next.get(key)
                      next.set(key, { ...current, editing: true })
                      return next
                    })
                  },
                }, entry.editing === true
                  ? [E('input', {
                    key: 'edit',
                    className: 'dws-input',
                    style: { width: '140px' },
                    autoFocus: true,
                    placeholder: t('picker.preview.remarkPlaceholder'),
                    defaultValue: entry.remark === undefined ? '' : entry.remark,
                    onClick: (inner) => inner.stopPropagation(),
                    onKeyDown: (inner) => {
                      if (inner.key === 'Enter') inner.currentTarget.blur()
                      if (inner.key === 'Escape') {
                        inner.currentTarget.value = entry.remark === undefined ? '' : entry.remark
                        inner.currentTarget.blur()
                      }
                    },
                    onBlur: (inner) => {
                      const value = inner.currentTarget.value.trim()
                      setSelected((previous) => {
                        const next = new Map(previous)
                        const key = foldPath(entry.path)
                        const current = next.get(key)
                        next.set(key, { ...current, remark: value.length === 0 ? undefined : value, editing: false })
                        return next
                      })
                    },
                  })]
                  : [
                    E('span', { key: 'label' }, toStringOr(entry.remark, baseName(entry.path))),
                    entry.remark === undefined
                      ? null
                      : E('span', { key: 'original', className: 'dws-original' }, baseName(entry.path)),
                  ]),
              ]))),
            ]),
        ]),
      ])

      const footer = E('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%' } }, [
        E('span', { key: 'note', className: 'dws-footerNote' }, error === null
          ? (previewNodes().some((entry) => registeredFor(entry.path) !== undefined)
            ? t('picker.alignedHint')
            : t('picker.remarkOnly'))
          : error),
        E('span', { key: 'actions', style: { display: 'flex', gap: '8px', flexShrink: 0 } }, [
          E(SuiteButton, { key: 'cancel', disabled: creating, onClick: onCancel }, t('picker.cancel')),
          E(SuiteButton, {
            key: 'open',
            variant: 'primary',
            disabled: creating || busy === true || selected.size === 0,
            onClick: submit,
          }, t('picker.open')),
        ]),
      ])

      return E(React.Fragment, null,
        E(SuiteModal, {
          open: true,
          onClose: creating ? () => {} : onCancel,
          title: t('picker.title'),
          closeLabel: t('common.close'),
          className: 'dws-dialog dws-picker',
          footer,
        }, body),
        breakRequest === null ? null : E(SuiteModal, {
          open: true,
          onClose: () => setBreakRequest(null),
          title: t('picker.confirm.break'),
          closeLabel: t('common.close'),
          footer: E('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } }, [
            E(SuiteButton, { key: 'keep', onClick: () => setBreakRequest(null) }, t('picker.confirm.keep')),
            E(SuiteButton, {
              key: 'remove',
              variant: 'primary',
              onClick: () => {
                const request = breakRequest
                setBreakRequest(null)
                setSelected((previous) => {
                  const next = new Map(previous)
                  next.delete(foldPath(request.path))
                  return next
                })
              },
            }, t('picker.confirm.remove')),
          ]),
        }, E('div', { style: { fontSize: '13px', lineHeight: '20px' } },
          t('picker.confirm.breakBody', { name: baseName(breakRequest.path) }))))
    }
