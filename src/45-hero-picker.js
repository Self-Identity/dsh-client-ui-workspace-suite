    /* ===================== conversation workspace picker ==================== */

    /**
     * The conversation window's workspace menu: this plugin's occupant of the single
     * `conversation.hero.workspace` slot, shadowing the shipped picker.
     *
     * Why shadow it: the shipped menu lists **every** workspace with its bare title
     * (`label: workspaceDisplayTitle(workspace.title, ...)`), and it builds those rows
     * inline — there is no label slot to hook. A child named `src` or `lib` is
     * unreadable on its own, so this version lists **root-level workspaces only**:
     *
     *  - picking a workspace that has registered descendants opens the subtree
     *    chooser (fully expanded, single select, defaulting to that workspace) so the
     *    user decides which one the conversation starts in;
     *  - picking a leaf enters it directly, the shipped behaviour.
     *
     * "Add workspace" keeps working through the declared child hole
     * (`conversation.hero.workspace.directoryFlow`), which this registration must NOT
     * re-declare: a shadowing entry may not redeclare the shadowed entry's children.
     */
    function HeroWorkspacePicker(props) {
      const {
        open, t, useWorkspaces, selectedId, onPick, onClose, renderSlot,
        listDirectory, createDirectory, createWorkspace, renameWorkspace,
        readWorkspaceItems, startSession,
      } = props
      const snapshot = useWorkspaces === undefined ? null : useWorkspaces((state) => (state === null || state === undefined ? null : state))
      const items = snapshot === null || !Array.isArray(snapshot.items) ? [] : snapshot.items
        .filter((item) => item !== null && typeof item === 'object' && typeof item.path === 'string')
      const [flowOpen, setFlowOpen] = React.useState(false)
      const [flowError, setFlowError] = React.useState(null)
      const [chooser, setChooser] = React.useState(null)
      const [choice, setChoice] = React.useState(null)
      const [chosenItem, setChosenItem] = React.useState(null)

      const isRoot = (item) => !items.some((other) => other !== item && isAncestorPath(other.path, item.path))
      const roots = items.filter(isRoot)
      const subtreeOf = (item) => [item].concat(items.filter((other) => other !== item && isAncestorPath(item.path, other.path)))
      const depthIn = (subtree, item) => subtree.filter((other) => other !== item && isAncestorPath(other.path, item.path)).length
      const labelOf = (item) => workspaceTitle(item, t('browser.folder'))
      // The add entry is offered whenever this plugin holds the picker's own services;
      // it must NOT depend on `renderSlot`, which a shadowing registration that
      // declares no children may not receive (that is why the entry disappeared).
      const flowAvailable = typeof createWorkspace === 'function'
      const canRenderHole = typeof renderSlot === 'function'

      // With nothing registered yet, the only useful entry is "add workspace":
      // open the flow straight away instead of showing a one-row menu.
      React.useEffect(() => {
        if (open === true && flowAvailable && roots.length === 0) setFlowOpen(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [open, flowAvailable, roots.length])

      const beginChooser = (item) => {
        const subtree = subtreeOf(item)
        setChosenItem(item)
        setChooser(subtree)
        setChoice(item.workspaceId)
      }

      const handleSelect = (id) => {
        if (id === 'add-workspace') {
          setFlowOpen(true)
          return
        }
        const item = items.find((entry) => entry.workspaceId === id)
        if (item === undefined) return
        if (subtreeOf(item).length > 1) {
          // More than one workspace below it: ask which one to start in.
          beginChooser(item)
          return
        }
        onPick(id)
      }

      // The workspace rows are `MenuItemButton` children (icons + shortcuts); a build
      // without that primitive falls back to plain `items` labels instead of crashing.
      const defs = roots.map((item) => ({ id: item.workspaceId, label: labelOf(item) }))
      const rows = !hasPrimitive('MenuItemButton') ? undefined : defs.map((def) => E(ui.MenuItemButton, {
        key: 'hero:' + def.id,
        icon: icon('IconFolderCloseRegular', 16),
        disabled: flowOpen,
        onSelect: () => handleSelect(def.id),
      }, def.label))
      // The add entry sits **first** and is styled as an accent row, so it reads as
      // the primary action of the menu rather than one more workspace.
      const addRow = !flowAvailable ? null : E('button', {
        key: 'hero:add',
        type: 'button',
        role: 'menuitem',
        className: 'dws-heroAdd',
        disabled: flowOpen,
        onClick: () => handleSelect('add-workspace'),
      }, [
        icon('IconProjectAddOutlineRegular', 16),
        E('span', { key: 'label', className: 'dws-heroAddLabel' }, t('browser.add')),
      ])
      const menuChildren = addRow === null
        ? rows
        : E(React.Fragment, null, addRow, rows === undefined ? null : rows)

      const flowOwner = {
        open: flowOpen,
        busy: false,
        // The picker registers what it was asked to; entering is its own chooser's
        // job, so this side only closes the flow.
        onPicked: () => setFlowOpen(false),
        onCancel: () => setFlowOpen(false),
        onError: (message) => {
          setFlowOpen(false)
          setFlowError(message)
        },
      }

      const chooserRows = chooser === null ? [] : chooser.map((item) => {
        const chosen = choice === item.workspaceId
        return E('div', {
          key: 'hero-choose:' + item.workspaceId,
          className: 'dws-pickerRow' + (chosen ? ' dws-pickerRow--selected' : ''),
          style: { '--suite-indent': String(depthIn(chooser, item) * 14) + 'px' },
          role: 'radio',
          'aria-checked': chosen ? 'true' : 'false',
          tabIndex: 0,
          title: item.path,
          onClick: () => setChoice(item.workspaceId),
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              setChoice(item.workspaceId)
            }
          },
        }, [
          E('span', { key: 'icon', className: 'dws-folderIcon' }, icon('IconFolderOpenRegular', 16)),
          E('span', { key: 'name', className: 'dws-pickerName' }, labelOf(item)),
        ])
      })

      return E(React.Fragment, null,
        // Positioned from the anchor element's rect: portal mode leaves the list
        // unpinned (top-left corner) without it.
        hasPrimitive('Menu') ? E(ui.Menu, {
          open: open === true && !flowOpen && chooser === null && (defs.length > 0 || flowAvailable),
          anchor: null,
          items: rows === undefined ? defs : [],
          selectedId,
          onSelect: handleSelect,
          onClose,
          side: 'bottom',
          portal: true,
          getAnchorRect: () => {
            const node = props.anchorRef === undefined || props.anchorRef === null ? null : props.anchorRef.current
            return node === null || node === undefined || typeof node.getBoundingClientRect !== 'function'
              ? null
              : node.getBoundingClientRect()
          },
        }, menuChildren) : null,
        // Prefer the declared child hole (that is the sanctioned path); fall back to
        // rendering the picker directly, because a shadowing registration may not be
        // handed `renderSlot` at all.
        canRenderHole
          ? renderSlot('conversation.hero.workspace.directoryFlow', flowOwner)
          : (flowOpen ? E(DirectoryExplorer, Object.assign({ key: 'hero-direct', open: true, t }, flowOwner, {
            mode: 'add',
            listDirectory,
            createDirectory,
            createWorkspace,
            renameWorkspace,
            readWorkspaceItems,
            startSession,
            onPicked: () => setFlowOpen(false),
            onCancel: () => setFlowOpen(false),
            onError: (message) => {
              setFlowOpen(false)
              setFlowError(message)
            },
          })) : null),
        chooser === null ? null : E(SuiteModal, {
          key: 'hero-chooser',
          open: true,
          onClose: () => setChooser(null),
          title: t('picker.entry.title'),
          closeLabel: t('common.close'),
          footer: E(React.Fragment, null, [
            E(SuiteButton, { key: 'cancel', variant: 'outline', onClick: () => setChooser(null) }, t('common.cancel')),
            E(SuiteButton, {
              key: 'enter',
              variant: 'primary',
              disabled: choice === null,
              onClick: () => {
                const picked = choice
                setChooser(null)
                if (picked !== null) onPick(picked)
              },
            }, t('picker.entry.enter')),
          ]),
        }, [
          E('div', { key: 'note', className: 'dws-muted', style: { marginBottom: '6px' } }, t('picker.subtree.body',
            { name: chosenItem === null ? '' : labelOf(chosenItem) })),
          E('div', { key: 'list', className: 'dws-pickerTree', style: { maxHeight: 'min(40vh,360px)' } }, chooserRows),
        ]),
        flowError === null ? null : E(SuiteModal, {
          key: 'hero-error',
          open: true,
          onClose: () => setFlowError(null),
          title: t('browser.add'),
          closeLabel: t('common.close'),
          footer: E(SuiteButton, { variant: 'primary', onClick: () => setFlowError(null) }, t('common.close')),
        }, E('div', { style: { fontSize: '13px', lineHeight: '20px' } }, String(flowError))))
    }
