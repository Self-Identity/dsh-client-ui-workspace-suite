    /* =============================== widgets =============================== */

    /** Whether an optional primitive is present in this client build. */
    const hasPrimitive = (name) => ui !== null && typeof ui === 'object' && typeof ui[name] === 'function'

    /** Render a host icon when it exists; missing icons degrade to nothing. */
    function icon(name, size, className) {
      const Component = ui === null || typeof ui !== 'object' ? undefined : ui[name]
      if (typeof Component !== 'function') return null
      return E(Component, className === undefined ? { size: size || 16 } : { size: size || 16, className })
    }

    /** Sidebar/row icon button with a host tooltip when the tooltip exists. */
    function IconButton({ label, onClick, disabled, pressed, shortcutKeys, iconName, size, children }) {
      const button = E('button', {
        type: 'button',
        className: 'dws-iconButton',
        'aria-label': label,
        ...(pressed === undefined ? {} : { 'aria-pressed': pressed ? 'true' : 'false' }),
        ...(shortcutKeys === undefined ? {} : { 'aria-keyshortcuts': shortcutKeys }),
        disabled: disabled === true,
        onClick: (event) => {
          event.preventDefault()
          event.stopPropagation()
          if (disabled !== true) onClick(event)
        },
      }, children !== undefined ? children : icon(iconName || 'IconEllipsisOutlineRegular', size || 16))
      if (!hasPrimitive('Tooltip')) return button
      return E(ui.Tooltip, {
        label,
        ...(shortcutKeys === undefined ? {} : { shortcutKeys }),
      }, button)
    }

    /** Hand-rolled button: the tokens are the only shared styling dependency. */
    function SuiteButton({ children, onClick, disabled, variant, className }) {
      const classes = 'dws-button' + (variant === 'primary' ? ' dws-button--primary' : '')
        + (className === undefined ? '' : ' ' + className)
      return E('button', {
        type: 'button',
        className: classes,
        disabled: disabled === true,
        onClick: (event) => {
          event.preventDefault()
          if (disabled !== true) onClick(event)
        },
      }, children)
    }

    /** Text button used for inline actions. */
    function TextButton({ children, onClick, disabled }) {
      return E('button', {
        type: 'button',
        className: 'dws-textButton',
        disabled: disabled === true,
        onClick: (event) => {
          event.preventDefault()
          if (disabled !== true) onClick(event)
        },
      }, children)
    }

    /** Tri-state checkbox (checked / mixed / empty) with a checkbox role. */
    function SuiteCheck({ checked, mixed, onToggle, label }) {
      return E('button', {
        type: 'button',
        role: 'checkbox',
        'aria-checked': mixed === true ? 'mixed' : checked === true ? 'true' : 'false',
        'aria-label': label,
        className: 'dws-check' + (mixed === true ? ' dws-check--mixed' : ''),
        onClick: (event) => {
          event.preventDefault()
          event.stopPropagation()
          onToggle()
        },
      }, checked === true || mixed === true ? icon('IconCheckOutlineRegular', 12) : null)
    }

    /** Settings switch following the host's `role="switch"` pattern. */
    function SuiteSwitch({ checked, onChange, label }) {
      return E('button', {
        type: 'button',
        role: 'switch',
        'aria-checked': checked === true ? 'true' : 'false',
        'aria-label': label,
        className: 'dws-switch',
        onClick: (event) => {
          event.preventDefault()
          onChange(checked !== true)
        },
      })
    }

    /**
     * A colour input for one optional setting. An empty value means "use the theme":
     * the swatch then shows a neutral grey and a reset link appears while a colour is set.
     */
    function SuiteColor({ value, onChange, label, resetLabel }) {
      const swatch = typeof value === 'string' && value !== '' ? value : '#8a8a8a'
      return E('span', { className: 'dws-settingControl' }, [
        E('input', {
          key: 'input',
          type: 'color',
          className: 'dws-colorInput',
          'aria-label': label,
          value: swatch,
          onChange: (event) => {
            const next = event.target.value
            if (typeof next === 'string' && next !== '') onChange(next)
          },
        }),
        typeof value === 'string' && value !== '' ? E('button', {
          key: 'reset',
          type: 'button',
          className: 'dws-textButton',
          onClick: () => onChange(''),
        }, resetLabel) : null,
      ])
    }

    /** A number input keeping a percentage setting inside a sane range. */
    function SuiteNumber({ value, min, max, step, onChange, label, suffix }) {
      return E('span', { className: 'dws-settingControl' },
        E('input', {
          type: 'number',
          className: 'dws-input',
          style: { width: '72px', flex: 'none' },
          'aria-label': label,
          value: String(value),
          min: String(min),
          max: String(max),
          step: String(step || 1),
          onChange: (event) => {
            const next = Number(event.target.value)
            if (!Number.isFinite(next)) return
            onChange(Math.min(max, Math.max(min, Math.round(next))))
          },
        }),
        E('span', { className: 'dws-muted' }, suffix || ''),
      )
    }

    /** A single-choice segmented row built from buttons (no primitive needed). */
    function SuiteChoice({ value, options, onChange, label }) {
      return E('span', { className: 'dws-settingControl', role: 'group', 'aria-label': label },
        options.map((option) => E('button', {
          key: option.value,
          type: 'button',
          className: 'dws-button' + (option.value === value ? ' dws-button--primary' : ''),
          style: { minWidth: '0', padding: '0 10px', height: '28px' },
          onClick: (event) => {
            event.preventDefault()
            onChange(option.value)
          },
        }, option.label)))
    }

    /** Host hover card when available; the anchor alone otherwise. */
    function SuiteHover({ anchor, content, disabled, immediate }) {
      if (!hasPrimitive('HoverCard')) return anchor
      return E(ui.HoverCard, {
        anchor,
        content,
        // `immediate` callers (badges and other pointed-at marks) open at once; text
        // rows keep the shipped dwell so a pointer crossing a list does not flash cards.
        openDelayMs: immediate === true ? 0 : 500,
        disabled: disabled === true,
      })
    }

    /**
     * Hover reveal for a clipped title, copied from the shipped rows: the title
     * clips its own text, crawls left at a constant speed while hovered, stops when
     * the far edge is in view and rests there, and returns to the start in one step
     * on leave. Text overflowing by at most {@link MIN_TITLE_REVEAL_PX} stays put,
     * because a few pixels of movement reads as jitter rather than a reveal. The
     * `data-scrolled` / `data-clipped` hooks drive the two-sided fade mask in CSS.
     */
    const MIN_TITLE_REVEAL_PX = 8
    const TITLE_MARQUEE_PX_PER_MS = 0.03

    function placeTitle(title, left, range) {
      if (typeof title.scrollTo === 'function') title.scrollTo({ left, behavior: 'instant' })
      else title.scrollLeft = left
      if (left > 0) title.dataset.scrolled = ''
      else delete title.dataset.scrolled
      if (left < range) title.dataset.clipped = ''
      else delete title.dataset.clipped
    }

    function restTitle(title) {
      if (typeof title.scrollTo === 'function') title.scrollTo({ left: 0, behavior: 'instant' })
      else title.scrollLeft = 0
      delete title.dataset.scrolled
      delete title.dataset.clipped
    }

    function useTitleMarquee(title) {
      const frame = React.useRef(0)
      React.useEffect(() => () => {
        if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame.current)
      }, [])
      return React.useMemo(() => ({
        enter: () => {
          const element = title.current
          if (element === null || element === undefined) return
          const range = element.scrollWidth - element.clientWidth
          if (!(range > MIN_TITLE_REVEAL_PX)) return
          let reduced = false
          try {
            reduced = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
              && window.matchMedia('(prefers-reduced-motion: reduce)').matches
          } catch {
            reduced = false
          }
          if (reduced || typeof requestAnimationFrame !== 'function') {
            placeTitle(element, range, range)
            return
          }
          if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame.current)
          let previous
          let position = 0
          const step = (now) => {
            position += previous === undefined ? 0 : (now - previous) * TITLE_MARQUEE_PX_PER_MS
            previous = now
            placeTitle(element, Math.min(position, range), range)
            if (position < range) frame.current = requestAnimationFrame(step)
          }
          frame.current = requestAnimationFrame(step)
        },
        leave: () => {
          if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame.current)
          const element = title.current
          if (element === null || element === undefined) return
          restTitle(element)
        },
      }), [title])
    }

    /**
     * A title cell that crawls its clipped content on hover. One component per row,
     * because the marquee is a hook and rows are rendered in a loop.
     */
    function MarqueeTitle({ className, title, children, onDoubleClick, style, role, ariaLabel }) {
      const ref = React.useRef(null)
      const marquee = useTitleMarquee(ref)
      return E('span', {
        ref,
        className,
        title,
        style,
        role,
        // Marks the name cell: the row's click detector uses it to tell "second
        // click on the name" (rename) from "second click elsewhere" (open).
        'data-row-name': 'true',
        'aria-label': ariaLabel,
        onDoubleClick,
        onPointerEnter: marquee.enter,
        onPointerLeave: marquee.leave,
      }, children)
    }

    /** Host modal when available, otherwise a token-styled overlay. The large
     * `dws-dialog` frame is opt-in: a caller that just needs a compact native
     * dialog (rename, confirm) passes no className and gets the host sizing.
     */
    function SuiteModal({ open, onClose, title, footer, className, contentClassName, children, closeLabel }) {
      if (open !== true) return null
      if (hasPrimitive('Modal')) {
        return E(ui.Modal, {
          open: true,
          onClose,
          closeLabel,
          title,
          footer,
          ...(className === undefined || className === '' ? {} : { className }),
          // The host wraps `children` in its own body element, so styling the content
          // wrapper is the only way to let that column size and scroll correctly.
          ...(contentClassName === undefined || contentClassName === '' ? {} : { contentClassName }),
        }, children)
      }
      return E(FallbackModal, { onClose, title, footer, className, closeLabel }, children)
    }

    /** Minimal modal: overlay, Escape, initial focus, click-outside dismissal. */
    function FallbackModal({ onClose, title, footer, className, children, closeLabel }) {
      const panelRef = React.useRef(null)
      React.useEffect(() => {
        const onKeyDown = (event) => {
          if (event.key === 'Escape') {
            event.stopPropagation()
            onClose()
          }
        }
        document.addEventListener('keydown', onKeyDown)
        const panel = panelRef.current
        if (panel !== null) {
          const focusable = panel.querySelector('button, input, [tabindex]:not([tabindex="-1"])')
          if (focusable !== null) focusable.focus()
        }
        return () => document.removeEventListener('keydown', onKeyDown)
      }, [onClose])
      return E('div', {
        className: 'dws-mask',
        onMouseDown: (event) => {
          if (event.target === event.currentTarget) onClose()
        },
      }, E('div', {
        ref: panelRef,
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': title,
        className: 'dws-modal ' + (className || ''),
      }, [
        E('div', { key: 'head', className: 'dws-modalHead' }, [
          E('h2', { key: 'title', className: 'dws-modalTitle' }, title),
          hasPrimitive('IconCloseOutlineRegular')
            ? IconButton({ key: 'close', label: closeLabel || 'Close', onClick: onClose, iconName: 'IconCloseOutlineRegular' })
            : null,
        ]),
        E('div', { key: 'body', className: 'dws-modalBody' }, children),
        footer === undefined ? null : E('div', { key: 'foot', className: 'dws-modalFoot' }, footer),
      ]))
    }

    /**
     * A row "..." menu.
     *
     * The host `Menu` renders its `anchor` prop as a React element inside its own
     * children (`children: [anchor, portal ? list : list]`), and supports only
     * `bottom`/`top` for `side` — passing a DOM node there, or an unknown side,
     * throws inside the tree and would blank the whole list. This builds the
     * trigger as an element, keeps the host menu behind a boundary that falls
     * back to the plugin's own list, and never renders the trigger twice.
     */
    function RowMenu({ label, items, onSelect, footer, side, disabled, iconName, menuLabel, triggerLabel, triggerIcon }) {
      const [open, setOpen] = React.useState(false)
      const [rect, setRect] = React.useState(null)
      const [hostMenuFailed, setHostMenuFailed] = React.useState(false)
      const triggerRef = React.useRef(null)
      // The portaled host list is positioned from this rect. It is captured from the
      // click itself rather than read off a ref: the host may re-clone the anchor
      // element, which replaces any ref this plugin attached, and without a rect the
      // list opens unpositioned in the window's top-left corner.
      const anchorRectRef = React.useRef(null)
      const onClick = React.useCallback((event) => {
        event.preventDefault()
        event.stopPropagation()
        const node = event.currentTarget
        if (node !== null && node !== undefined && typeof node.getBoundingClientRect === 'function') {
          const measured = node.getBoundingClientRect()
          anchorRectRef.current = measured
          setRect(measured)
        }
        setOpen((value) => !value)
      }, [])
      const getAnchorRect = React.useCallback(() => anchorRectRef.current, [])
      // The trigger element is memoized: handing the host menu a brand-new element
      // on every render makes it re-anchor and re-run its focus handoff mid-click,
      // which is what swallowed the first selection.
      const triggerIconName = triggerIcon === undefined ? 'IconFlatListOutlineRegular' : triggerIcon
      const blocked = disabled === true || items.length === 0
      const trigger = React.useMemo(() => (triggerLabel === undefined
        ? E('button', {
          ref: triggerRef,
          type: 'button',
          className: 'dws-iconButton',
          'aria-label': label,
          'aria-haspopup': 'menu',
          'aria-expanded': open ? 'true' : 'false',
          disabled: blocked,
          onClick,
        }, icon(iconName || 'IconEllipsisOutlineRegular', 16))
        : E('button', {
          ref: triggerRef,
          type: 'button',
          className: 'dws-button',
          style: { minWidth: '0', height: '28px', padding: '0 10px' },
          'aria-label': label,
          'aria-haspopup': 'menu',
          'aria-expanded': open ? 'true' : 'false',
          disabled: blocked,
          onClick,
        }, [
          icon(triggerIconName, 14),
          E('span', { key: 'label', className: 'dws-ellipsis', style: { maxWidth: '180px' } }, triggerLabel),
          icon('IconChevronDownOutlineRegular', 12),
        ])), [blocked, iconName, label, onClick, open, triggerIconName, triggerLabel])
      const close = React.useCallback(() => setOpen(false), [])
      const choose = (id) => {
        close()
        onSelect(id)
      }
      const own = () => E(React.Fragment, null, trigger,
        open === true
          ? E(FallbackMenu, { rect, items, label: menuLabel || label, onSelect: choose, onClose: close })
          : null)
      if (!hasPrimitive('Menu') || hostMenuFailed) return own()
      // Rows are `MenuItemButton` children, the shape the shipped menus use: that
      // is what carries each row's icon and its localized shortcut hint. Passing
      // bare `items` renders labels only, which is why the icons went missing.
      const rows = hasPrimitive('MenuItemButton')
        ? items.map((item) => E(ui.MenuItemButton, {
          key: item.id,
          ...(item.icon === undefined ? {} : { icon: item.icon }),
          ...(item.shortcut === undefined || item.shortcut === null ? {} : { shortcut: item.shortcut }),
          disabled: item.disabled === true,
          danger: item.danger === true,
          onSelect: () => choose(item.id),
        }, item.label))
        : undefined
      return E(QuietBoundary, {
        // A host menu that cannot render must cost the host look, never the list.
        fallback: own,
        onError: () => setHostMenuFailed(true),
      }, E(ui.Menu, {
        open,
        onClose: close,
        portal: true,
        side: side === 'top' ? 'top' : 'bottom',
        align: 'start',
        anchor: trigger,
        // Portal mode places the list from the anchor rect the owner supplies; with
        // no rect the host list renders unpinned at the window's origin.
        getAnchorRect,
        items: rows === undefined ? items : [],
        onSelect: choose,
        ...(footer === undefined ? {} : { footer }),
        // Children must be positional: React turns the argument into props.children,
        // while the prop form is silently overridden by the renderer's own children.
      }, rows === undefined ? undefined : rows))
    }

    /** Positioned fallback menu for builds without the host Menu primitive. */
    function FallbackMenu({ rect, items, label, onSelect, onClose }) {
      const panelRef = React.useRef(null)
      React.useEffect(() => {
        const onPointerDown = (event) => {
          if (panelRef.current !== null && panelRef.current.contains(event.target)) return
          onClose()
        }
        const onKeyDown = (event) => {
          if (event.key === 'Escape') onClose()
        }
        document.addEventListener('mousedown', onPointerDown, true)
        document.addEventListener('keydown', onKeyDown)
        return () => {
          document.removeEventListener('mousedown', onPointerDown, true)
          document.removeEventListener('keydown', onKeyDown)
        }
      }, [onClose])
      const style = rect === null
        ? { top: '50%', left: '50%' }
        : {
          top: Math.min(rect.bottom + 4, Math.max(8, (globalThis.innerHeight || 800) - 8 - items.length * 32)),
          left: Math.max(8, Math.min(rect.right - 200, (globalThis.innerWidth || 1200) - 208)),
        }
      return E('div', {
        ref: panelRef,
        className: 'dws-menuFallback',
        role: 'menu',
        'aria-label': label,
        style,
      }, items.map((item) => E('button', {
        key: item.id,
        type: 'button',
        role: 'menuitem',
        className: 'dws-menuItem',
        disabled: item.disabled === true,
        onClick: (event) => {
          event.preventDefault()
          event.stopPropagation()
          onClose()
          onSelect(item.id)
        },
      }, [item.icon === undefined ? null : item.icon, E('span', { key: 'label', className: 'dws-ellipsis' }, item.label)])))
    }

    /** The host markdown renderer's required label bundle. */
    function markdownLabels(t) {
      return {
        code: {
          copyLabel: t('md.copy'),
          copiedLabel: t('md.copied'),
          toolbarLabels: {
            codeLabel: t('md.code'),
            wrapLabel: t('md.wrap'),
            unwrapLabel: t('md.unwrap'),
          },
        },
        footnotes: t('md.footnotes'),
      }
    }

    /**
     * Markdown body: the host renderer when this client build ships one, otherwise the
     * plugin's own renderer (see `markdownNodes`). The previous fallback was a `<pre>`
     * of the raw file, which is why a README looked like plain text.
     */
    function SuiteMarkdown({ text, t }) {
      const labels = React.useMemo(() => markdownLabels(t), [t])
      if (hasPrimitive('MarkdownText')) return E(ui.MarkdownText, { text, labels })
      return E('div', { className: 'dws-readme dws-md' }, markdownNodes(text))
    }

    /** A token-styled badge. */
    function Badge({ children, title }) {
      return E('span', { className: 'dws-badge', title }, children)
    }

    /**
     * Shared rename/delete dialog host used by the workspace browser and the
     * overview page: `openDialog({kind, id, draft, name})` plus the element to
     * render. The kinds are `rename-session`, `rename-workspace` and
     * `delete-workspace`, mirroring the shipped row actions' copy.
     */
    function useSuiteDialog(options) {
      const { t, items, onRenameWorkspace, onRenameSession, onDeleteWorkspace, onNotice } = options
      const [dialog, setDialog] = React.useState(null)
      const close = React.useCallback(() => setDialog(null), [])
      let element = null
      if (dialog !== null && (dialog.kind === 'rename-workspace' || dialog.kind === 'rename-session')) {
        const isWorkspace = dialog.kind === 'rename-workspace'
        const commit = () => {
          const value = String(dialog.draft === undefined ? '' : dialog.draft).trim()
          if (value.length === 0) {
            onNotice(t('browser.empty.name'))
            return
          }
          if (isWorkspace && Array.isArray(items)
            && items.some((item) => item.workspaceId !== dialog.id && String(item.title || '') === value)) {
            onNotice(t('browser.duplicate'))
            return
          }
          close()
          const work = isWorkspace ? onRenameWorkspace(dialog.id, value) : onRenameSession(dialog.id, value)
          Promise.resolve(work).catch((reason) => onNotice(errorMessage(reason)))
        }
        element = E(SuiteModal, {
          open: true,
          onClose: close,
          closeLabel: t('common.close'),
          title: isWorkspace ? t('browser.renameWorkspaceTitle') : t('browser.renameTitle'),
          footer: E('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } }, [
            E(SuiteButton, { key: 'cancel', onClick: close }, t('common.cancel')),
            E(SuiteButton, { key: 'ok', variant: 'primary', onClick: commit }, t('common.confirm')),
          ]),
        }, E('input', {
          className: 'dws-input',
          style: { width: '100%' },
          autoFocus: true,
          'aria-label': t('browser.renameTitle'),
          placeholder: t('browser.namePlaceholder'),
          value: dialog.draft === undefined ? '' : dialog.draft,
          onChange: (event) => setDialog((current) => ({ ...current, draft: event.target.value })),
          onKeyDown: (event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            }
          },
        }))
      }
      if (dialog !== null && dialog.kind === 'delete-workspace') {
        element = E(SuiteModal, {
          open: true,
          onClose: close,
          closeLabel: t('common.close'),
          title: t('browser.deleteTitle'),
          footer: E('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } }, [
            E(SuiteButton, { key: 'cancel', onClick: close }, t('common.cancel')),
            E(SuiteButton, {
              key: 'ok',
              variant: 'primary',
              onClick: () => {
                close()
                Promise.resolve(onDeleteWorkspace(dialog.id)).catch((reason) => onNotice(errorMessage(reason)))
              },
            }, t('common.confirm')),
          ]),
        }, E('div', { style: { fontSize: '13px', lineHeight: '20px' } },
          t('browser.deleteBody', { name: dialog.name })))
      }
      return { openDialog: setDialog, element }
    }
