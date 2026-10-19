    /* ================================ styles =============================== */

    /**
     * One stylesheet for every surface. Only theme tokens carry colour, so both
     * shipped appearances (light/dark) follow automatically; sizes are
     * percentages or token radii, never viewport-relative widths, so no
     * container can overflow the shell.
     */
    const STYLES = [
      /* ---- shared ---- */
      '.dws-root{box-sizing:border-box;display:flex;flex-direction:column;flex:1 1 auto;min-height:0;min-width:0;',
      'padding-right:var(--dsh-session-list-edge-inset,0px);overflow:hidden}',
      '.dws-root--rail{padding-right:0}',
      '.dws-iconButton{flex:none;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;',
      'padding:0;border:none;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);',
      'cursor:pointer;white-space:nowrap}',
      '.dws-iconButton:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-iconButton[aria-pressed="true"]{color:var(--dsw-alias-label-primary)}',
      '.dws-iconButton:disabled{opacity:.5;cursor:default}',
      '.dws-iconButton:focus-visible,.dws-button:focus-visible,.dws-textButton:focus-visible,',
      '.dws-rowButton:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));',
      'outline-offset:-2px}',
      '.dws-button{flex:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:72px;height:32px;',
      'padding:0 14px;border-radius:var(--dsw-radius-md);border:.5px solid var(--dsw-alias-border-l3);',
      'background:var(--dsw-alias-button-elevated-fill);color:var(--dsw-alias-label-primary);font-size:14px;line-height:20px;',
      'white-space:nowrap;cursor:pointer}',
      '.dws-button:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-button--primary{border-color:transparent;background:var(--dsw-alias-button-primary-fill);',
      'color:var(--dsw-alias-label-primary-inverted)}',
      '.dws-button--primary:hover{background:var(--dsw-alias-button-primary-hover)}',
      '.dws-button:disabled{opacity:.5;cursor:default}',
      '.dws-textButton{border:none;background:transparent;color:var(--dsw-alias-state-business-primary);cursor:pointer;',
      'padding:0;font-size:13px;line-height:20px;white-space:nowrap}',
      '.dws-scroll{flex:1 1 auto;min-height:0;min-width:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain}',
      '.dws-listWrap{position:relative;display:flex;flex-direction:column;flex:1 1 auto;min-height:0;min-width:0}',
      // Width chain for this plugin's own scrollbars: `--suite-scrollbar-width` (this
      // plugin's setting) then `--dsh-scrollbar-width` (the global scrollbar-tuner
      // plugin / theme) then an 8px fallback. Reusing the tuner's variable keeps a
      // global setting and this plugin's own setting in step.
      '.dws-scroll::-webkit-scrollbar{width:var(--suite-scrollbar-width,var(--dsh-scrollbar-width,8px))}',
      '.dws-scroll::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);border-radius:3px}',
      '.dws-muted{color:var(--dsw-alias-label-tertiary)}',
      '.dws-secondary{color:var(--dsw-alias-label-secondary)}',
      '.dws-ellipsis{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dws-warn{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px;overflow-wrap:anywhere}',
      '.dws-empty{padding:18px 12px;text-align:center;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}',
      '.dws-badge{flex:none;display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:9px;',
      'background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px;',
      'white-space:nowrap;font-variant-numeric:tabular-nums}',
      '.dws-original{color:var(--dsw-alias-label-tertiary);opacity:.65;font-size:12px;line-height:18px;overflow-wrap:anywhere}',

      /* ---- sidebar workspace browser ---- */
      '.dws-header{flex:none;display:flex;align-items:center;gap:4px;height:36px;padding-left:4px;min-width:0;',
      'color:var(--dsw-alias-label-tertiary)}',
      '.dws-header--rail{flex-direction:column;height:auto;align-items:center;gap:2px;padding:4px 0;',
      'max-width:100%;overflow:hidden}',
      '.dws-headerLabel{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;line-height:20px}',
      '.dws-searchBox{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:6px;height:28px;margin:0 4px;',
      'padding:0 8px;border-radius:var(--dsw-radius-md);background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-searchInput{flex:1 1 auto;min-width:0;border:none;background:transparent;outline:none;',
      'color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}',
      '.dws-searchInput::placeholder{color:var(--dsw-alias-label-tertiary)}',
      '.dws-searchResults{display:flex;flex-direction:column;gap:2px}',
      '.dws-searchRow{box-sizing:border-box;display:flex;flex-direction:column;gap:2px;width:100%;min-width:0;min-height:48px;',
      'padding:4px 8px;border:none;border-radius:var(--dsw-radius-lg);background:transparent;color:var(--dsw-alias-label-primary);',
      'text-align:left;cursor:pointer}',
      '.dws-searchRow:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-searchHead{display:flex;align-items:center;gap:6px;min-width:0}',
      '.dws-searchMeta{display:flex;align-items:center;gap:6px;min-width:0;padding-left:20px;font-size:12px;line-height:17px;',
      'color:var(--dsw-alias-label-secondary)}',
      '.dws-snippet{min-width:0;flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dws-treeBody{display:flex;flex-direction:column;gap:0;min-height:0}',
      '.dws-groupSection{display:flex;flex-direction:column;min-width:0}',
      '.dws-wsRow{box-sizing:border-box;display:flex;align-items:center;gap:6px;height:34px;min-width:0;padding:0 8px;',
      'padding-inline-start:calc(8px + var(--suite-indent,0px));border-radius:var(--dsw-radius-md);cursor:pointer;',
      'color:var(--dsw-alias-label-primary);user-select:none}',
      '.dws-wsRow:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-wsRow:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}',
      '.dws-wsRow--current{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-wsRow--drop{box-shadow:inset 0 -2px 0 var(--dsw-alias-state-business-primary)}',
      // The trailing "ungrouped" bucket is its own section: a hairline divider plus a
      // small caption (with a count), never a workspace-shaped row - the theme uses
      // blue for selection, so a coloured divider would read as a state, not a boundary.
      '.dws-sectionDivider{margin:8px 8px 2px;border-top:.5px solid var(--dsw-alias-border-l3)}',
      '.dws-sectionTitle{display:flex;align-items:center;gap:6px;height:26px;min-width:0;padding:0 8px;',
      'color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;font-weight:510;user-select:none;',
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dws-sectionCount{flex:none;padding:0 6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);',
      'color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px;font-variant-numeric:tabular-nums}',
      '.dws-sessionRow{box-sizing:border-box;display:flex;align-items:center;gap:0;height:32px;min-width:0;padding:0 8px;',
      'padding-inline-start:calc(8px + var(--suite-indent,0px));border-radius:var(--dsw-radius-md);cursor:pointer;',
      'color:var(--dsw-alias-label-primary);user-select:none}',
      '.dws-sessionRow:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-sessionRow--selected{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-sessionRow--archived{color:var(--dsw-alias-label-tertiary)}',
      '.dws-moreRow{display:flex;align-items:center;height:26px;min-width:0;',
      'padding-inline-start:calc(8px + var(--suite-indent,0px))}',
      '.dws-moreRow .dws-textButton{font-size:12px;line-height:18px}',
      '.dws-chev{flex:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:20px;',
      'padding:0;border:none;border-radius:var(--dsw-radius-sm);background:transparent;cursor:pointer;',
      'color:var(--dsw-alias-label-tertiary);transition:transform .15s ease}',
      '.dws-chev:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-chev:disabled{cursor:default;background:transparent}',
      '.dws-chev:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}',
      '.dws-chev--open{transform:rotate(90deg)}',
      '.dws-chev--empty{visibility:hidden}',
      // The folder icon colour follows the shipped rule (tertiary grey) but stays overridable:
      // `--suite-workspace-icon-color` comes from this plugin's own setting, and
      // `--dsh-workspace-icon-color` is a documented hook for theme / recolour plugins that
      // cannot target this plugin's own class names.
      '.dws-folderIcon{flex:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:20px;',
      'color:var(--suite-workspace-icon-color,var(--dsh-workspace-icon-color,var(--dsw-alias-label-tertiary)))}',
      // Expanded folders take the theme's business blue, exactly like the shipped
      // row's active folder; a collapsed folder keeps the resting colour.
      '.dws-folderIcon--active{color:var(--dsw-alias-state-business-primary)}',
      '.dws-slot{flex:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:20px;',
      'color:var(--dsw-alias-label-tertiary)}',
      '.dws-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;',
      'line-height:20px}',
      '.dws-title--workspace{font-weight:510}',
      // A deliberate small gap between a workspace's remark name and its grey original
      // name, and between a session's leading icon and its title (the shipped session
      // row insets the title the same way).
      '.dws-title--workspace{gap:6px}',
      '.dws-wsRow .dws-original{margin-inline-start:6px}',
      '.dws-sessionRow .dws-title{margin:0 6px 0 4px}',
      // The chart frame (y-axis ticks, plot, day axis) went with the chart itself.
      // Turn rows: the session row shape one level deeper, without a token figure.
      '.dws-turnRow{box-sizing:border-box;display:flex;align-items:center;gap:6px;height:26px;min-width:0;padding:0 8px;',
      'padding-inline-start:calc(8px + var(--suite-indent,0px));border-radius:var(--dsw-radius-sm);cursor:pointer;',
      'color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}',
      '.dws-turnRow:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-turnIndex{flex:none;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}',
      '.dws-turnTitle{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      // Hover marquee masks, copied from the shipped rows: the title clips its own
      // text, crawls left while hovered and publishes data-scrolled / data-clipped
      // so the text fades on whichever side still has content hidden.
      '.dws-title[data-scrolled]{mask-image:linear-gradient(90deg,#0000,#000 12px)}',
      '.dws-title[data-clipped]{mask-image:linear-gradient(270deg,#0000,#000 12px)}',
      '.dws-title[data-scrolled][data-clipped]{mask-image:linear-gradient(90deg,#0000,#000 12px calc(100% - 12px),#0000)}',
      // While the title crawls, drop the ellipsis: it is painted at the clip edge and
      // would replace the characters being scrolled into view. The right-hand fade
      // mask takes over that job instead.
      '.dws-title[data-scrolled]{text-overflow:clip}',
      // A remark + original name pair sits in inner spans that ellipsize on their own,
      // which hides the overflow the crawl is supposed to reveal: while the row is
      // hovered they keep their natural width instead.
      '.dws-wsRow:hover .dws-title .dws-ellipsis,.dws-wsRow:hover .dws-title .dws-original{flex:0 0 auto;overflow:visible;text-overflow:clip}',
      '.dws-time{flex:none;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:17px;padding-left:6px}',
      // The shipped rows swap the trailing time for the action buttons on hover, so
      // at rest nothing reserves that trailing width.
      '.dws-rowActions{flex:none;display:none;align-items:center;gap:2px}',
      '.dws-wsRow:hover .dws-rowActions,.dws-sessionRow:hover .dws-rowActions,',
      '.dws-rowActions:focus-within{display:inline-flex}',
      '.dws-wsRow:hover .dws-time,.dws-sessionRow:hover .dws-time{display:none}',
      // Bottom fade of the tree area, matching the shipped session list.
      '.dws-fade{position:absolute;left:0;right:var(--dsh-session-list-edge-inset,0px);bottom:0;height:24px;',
      'pointer-events:none;background:linear-gradient(to bottom,transparent,var(--dsw-specific-sidebar-fill))}',
      '.dws-hoverCard{box-sizing:border-box;max-width:320px;display:flex;flex-direction:column;gap:2px;padding:8px 10px;',
      // The shipped hover card paints its own dark surface in BOTH appearances, so
      // its text palette is fixed: white title, light-grey body, grey meta. Theme
      // label tokens would go dark-on-dark in the light appearance.
      'color:#cfd3d6;font-size:12px;line-height:17px}',
      '.dws-hoverCard .dws-muted,.dws-hoverCard .dws-secondary,.dws-hoverCard .dws-modelName{color:#adb2b8}',
      '.dws-hoverCard .dws-modelValue{color:#cfd3d6}',
      '.dws-hoverCard strong{font-size:14px;font-weight:510;line-height:20px;color:#fff}',
      '.dws-hoverLine{overflow-wrap:anywhere}',
      // Rename field, styled like the shipped rename dialog's input.
      '.dws-renameInput{box-sizing:border-box;width:100%;border:.5px solid var(--dsw-alias-border-l4);',
      'border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-button-elevated-fill);min-width:0;color:inherit;',
      'outline:none;padding:0 2px;font-size:14px;line-height:20px}',
      '.dws-renameError{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px;overflow-wrap:anywhere}',
      '.dws-menuFallback{position:fixed;z-index:60;min-width:180px;max-width:min(320px,90%);padding:4px;',
      'border-radius:var(--dsw-radius-lg);border:.5px solid var(--dsw-alias-border-l3);',
      'background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-bg-overlay));box-shadow:0 8px 24px var(--dsw-alias-bg-mask-1)}',
      '.dws-menuItem{display:flex;align-items:center;gap:8px;width:100%;min-width:0;height:30px;padding:0 8px;border:none;',
      'border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-primary);font-size:13px;',
      'white-space:nowrap;cursor:pointer}',
      '.dws-menuItem:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-menuItem:disabled{opacity:.5;cursor:default}',
      '.dws-inlineEdit{display:flex;align-items:center;gap:6px;min-width:0;flex:1 1 auto}',
      '.dws-input{box-sizing:border-box;flex:1 1 auto;min-width:0;height:26px;padding:0 8px;font-size:13px;',
      'border-radius:var(--dsw-radius-sm);border:.5px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-layer-1);',
      'color:var(--dsw-alias-label-primary);outline:none}',
      '.dws-input:focus-visible{border-color:var(--dsw-alias-state-business-primary)}',
      '.dws-colorInput{flex:none;width:36px;height:24px;padding:0;border:.5px solid var(--dsw-alias-border-l3);',
      'border-radius:var(--dsw-radius-sm);background:transparent;cursor:pointer}',
      // Switch replicating the shipped control's geometry and tokens (the shell's own
      // `_switch_` rule): 36x20 with a 2px inset, a border-l3 track when off (the old
      // hover-bg track read as plain white on the card), brand-primary when on, and a
      // 16px thumb that switches to `switch-thumb` while off.
      '.dws-switch{box-sizing:border-box;position:relative;flex:0 0 auto;width:36px;height:20px;padding:2px;',
      'border:0;border-radius:999px;background:var(--dsw-alias-border-l3);cursor:pointer}',
      '.dws-switch:disabled{cursor:default;opacity:.5}',
      '.dws-switch:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));',
      'outline-offset:2px}',
      '.dws-switch[aria-checked="true"]{background:var(--dsw-alias-brand-primary)}',
      '.dws-switch::after{content:"";display:block;width:16px;height:16px;border-radius:50%;',
      'background:var(--dsw-alias-label-primary-foreground);transition:transform .12s ease}',
      '.dws-switch[aria-checked="false"]::after{background:var(--dsw-alias-switch-thumb)}',
      '.dws-switch[aria-checked="true"]::after{transform:translateX(16px)}',
      '.dws-check{flex:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;padding:0;',
      'border-radius:4px;border:1px solid var(--dsw-alias-border-l4);background:transparent;cursor:pointer;',
      'color:var(--dsw-alias-label-primary-inverted)}',
      '.dws-check[aria-checked="true"]{border-color:transparent;background:var(--dsw-alias-state-business-primary)}',
      '.dws-check--mixed{border-color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-state-business-primary)}',

      /* ---- picker dialog ---- */
      '.dws-dialog.dws-dialog{width:min(760px,100%);height:min(560px,100dvh - 32px);gap:0;padding:0}',
      '.dws-dialogHeader{flex:none;display:flex;flex-direction:column;gap:8px;padding:16px 14px 8px 24px;',
      'border-bottom:.5px solid var(--dsw-alias-border-l3)}',
      '.dws-dialogTitle{margin:0;font-size:16px;font-weight:510;line-height:24px;color:var(--dsw-alias-label-primary)}',
      '.dws-crumbs{display:flex;align-items:center;gap:4px;min-width:0;overflow-x:auto;font-size:13px;line-height:20px}',
      '.dws-crumb{border:none;background:transparent;padding:0;color:var(--dsw-alias-label-tertiary);cursor:pointer;',
      'max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}',
      '.dws-crumb:hover{color:var(--dsw-alias-label-primary)}',
      // The conversation menu's "add workspace" row: first in the list, accent text and
      // weight so it reads as the primary action. The two backgrounds are deliberately
      // the other way round: the resting state is the neutral tint and hovering is what
      // lights the accent up.
      '.dws-heroAdd{box-sizing:border-box;flex:none;display:flex;align-items:center;gap:8px;width:100%;margin:0 0 6px;padding:8px 10px;',
      'border:none;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-interactive-bg-hover);',
      'color:var(--dsw-alias-state-business-primary);font-size:13px;line-height:20px;font-weight:510;white-space:nowrap;',
      'cursor:pointer;text-align:start}',
      '.dws-heroAdd:hover{background:var(--dsw-alias-interactive-bg-hover-accent)}',
      '.dws-heroAdd:disabled{opacity:.5;cursor:default}',
      '.dws-heroAddLabel{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}',
      '.dws-dialogBody{flex:1 1 auto;min-height:0;min-width:0;display:flex;flex-direction:column}',
      // Passed as the host Modal's `contentClassName`: making this column a bounded
      // flex box is what keeps the footer reachable and lets the tree scroll, since
      // the host's own `body` element in between cannot be styled directly.
      '.dws-pickerContent{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;overflow:hidden}',
      // Breathing room under the dialog buttons: without it they sit flush against
      // the bottom edge of the frame.
      '.dws-pickerFooter{padding-bottom:10px}',
      '.dws-dialogToolbar{flex:none;display:flex;align-items:center;gap:8px;padding:2px 14px 6px 24px;min-width:0}',
      // The single root-path line that replaced the crumb trail.
      '.dws-pickerPath{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
      'color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}',
      '.dws-pickerTree{flex:1 1 auto;min-height:0;max-height:min(46vh,420px);overflow-y:auto;overflow-x:hidden;',
      'padding:0 10px 8px 18px}',
      '.dws-pickerTree::-webkit-scrollbar{width:var(--suite-scrollbar-width,var(--dsh-scrollbar-width,8px))}',
      '.dws-pickerTree::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);border-radius:3px}',
      '.dws-pickerTree::-webkit-scrollbar-track{background:transparent}',
      // The overview page's scroll areas follow the same width chain.
      '.dws-pageBody::-webkit-scrollbar,.dws-readme::-webkit-scrollbar,.dws-modalBody::-webkit-scrollbar{',
      'width:var(--suite-scrollbar-width,var(--dsh-scrollbar-width,8px))}',
      '.dws-pageBody::-webkit-scrollbar-thumb,.dws-readme::-webkit-scrollbar-thumb,',
      '.dws-modalBody::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);border-radius:3px}',
      '.dws-pickerRow{box-sizing:border-box;display:flex;align-items:center;gap:6px;min-height:28px;padding:2px 8px;',
      'padding-inline-start:calc(8px + var(--suite-indent,0px));border-radius:var(--dsw-radius-sm);cursor:pointer;',
      'color:var(--dsw-alias-label-primary)}',
      // Hover is the theme's business blue with inverse text (a solid, deep
      // highlight); selection stays the pale document-selection blue.
      '.dws-pickerRow:hover{background:var(--dsw-alias-state-business-primary);color:#fff}',
      '.dws-pickerRow--selected{background:var(--dsw-alias-bg-document-selection)}',
      '.dws-pickerRow--selected:hover{background:var(--dsw-alias-state-business-primary);color:#fff}',
      '.dws-pickerName{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;',
      'line-height:20px}',
      // The row's "new subfolder" control: hidden until the row is hovered, and it
      // inherits the row's colour so it stays legible on the blue hover background.
      '.dws-addButton{flex:none;display:none;align-items:center;justify-content:center;width:22px;height:22px;padding:0;',
      'border:none;border-radius:var(--dsw-radius-sm);background:transparent;color:inherit;cursor:pointer}',
      '.dws-pickerRow:hover .dws-addButton,.dws-addButton:focus-visible{display:inline-flex}',
      '.dws-addButton:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      // The inline naming row under the parent it will create into.
      '.dws-pickerRow--editor{gap:6px;background:var(--dsw-alias-interactive-bg-hover)}',
      '.dws-dialogFooter{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 24px;',
      'border-top:.5px solid var(--dsw-alias-border-l3)}',
      '.dws-footerNote{min-width:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;',
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',

      /* ---- overview page ---- */
      // `flex:1 1 auto` together with `height:100%`: the slot wrapper may be a flex
      // column with an auto basis (where `height:100%` resolves to auto) or a plain
      // block with a definite height (where flex does nothing). Without the flex half
      // the page grew past the pane, the pane scrolled, and the visible scrollbar was
      // the host's instead of this page's - i.e. a different width from the list's.
      // `overflow:hidden` then keeps the pane from scrolling at all, so the scrollbar
      // the user sees is always this page's own (same `--suite-scrollbar-width`).
      '.dws-page{box-sizing:border-box;flex:1 1 auto;height:100%;min-height:0;min-width:0;',
      'display:flex;flex-direction:column;overflow:hidden;color:var(--dsw-alias-label-primary)}',
      '.dws-pageHeader{flex:none;display:flex;align-items:flex-start;gap:12px;padding:28px clamp(24px,4vw,48px) 12px;min-width:0}',
      // On macOS the frame mounts the leading seat over every main panel, so the
      // heading pads below it exactly like the shipped entry pages do.
      'html[data-platform="darwin"] .dws-pageHeader{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}',
      '.dws-pageHeading{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}',
      '.dws-pageTitleRow{display:flex;align-items:center;gap:8px;min-width:0}',
      '.dws-pageTitle{margin:0;font-size:18px;font-weight:510;line-height:26px;overflow-wrap:anywhere}',
      '.dws-pagePath{font-size:12px;line-height:18px;overflow-wrap:anywhere}',
      '.dws-pageBody{flex:1 1 auto;min-height:0;min-width:0;overflow-y:auto;display:block;overscroll-behavior:contain}',
      '.dws-pageInner{box-sizing:border-box;width:100%;max-width:960px;margin:0 auto;',
      'padding:0 clamp(24px,4vw,48px) 48px;display:flex;flex-direction:column;gap:18px;min-width:0}',
      '.dws-card{box-sizing:border-box;display:flex;flex-direction:column;gap:10px;padding:14px 16px;min-width:0;',
      'border-radius:var(--dsw-radius-lg);border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}',
      '.dws-cardHead{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0;flex-wrap:wrap}',
      '.dws-cardTitle{margin:0;font-size:14px;font-weight:510;line-height:20px}',
      '.dws-statRow{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;min-width:0}',
      '.dws-statValue{font-size:16px;line-height:24px;font-weight:510;font-variant-numeric:tabular-nums}',
      '.dws-statLabel{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}',
      // Name/value chips used by the dependencies card: they wrap instead of
      // overflowing, and each chip ellipsizes rather than pushing the row wider.
      '.dws-chipRow{display:flex;flex-wrap:wrap;gap:6px;min-width:0;flex:1 1 auto;justify-content:flex-end}',
      '.dws-chip{box-sizing:border-box;flex:none;max-width:100%;display:inline-flex;align-items:center;gap:4px;',
      'padding:2px 8px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-interactive-bg-hover);',
      'color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;white-space:nowrap;overflow:hidden;',
      'text-overflow:ellipsis}',
      '.dws-chip--on{color:var(--dsw-alias-state-business-primary)}',
      '.dws-chip--off{opacity:.55}',
      // Turn rows keep a right-edge fade; the bar-chart rules above this point are gone.
      // A turn title that overflows fades out at its right edge instead of ending
      // on a hard cut.
      '.dws-turnTitle{-webkit-mask-image:linear-gradient(270deg,#0000,#000 12px);',
      'mask-image:linear-gradient(270deg,#0000,#000 12px);text-overflow:clip}',
      '.dws-modelList{display:flex;flex-direction:column;gap:4px;min-width:0}',
      '.dws-modelRow{display:flex;align-items:center;gap:8px;min-width:0;font-size:12px;line-height:18px}',
      '.dws-modelName{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dws-modelValue{flex:none;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
      '.dws-ovGroup{display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.dws-ovSessions{display:flex;flex-direction:column;gap:1px;min-width:0}',
      '.dws-ovTurns{display:flex;align-items:center;gap:4px;flex-wrap:wrap;min-width:0}',
      '.dws-turnLink{flex:none;border:none;background:transparent;padding:0 2px;color:var(--dsw-alias-label-tertiary);',
      'font-size:11px;line-height:16px;cursor:pointer;white-space:nowrap;font-variant-numeric:tabular-nums}',
      '.dws-turnLink:hover{color:var(--dsw-alias-state-business-primary);text-decoration:underline}',
      '.dws-readme{box-sizing:border-box;min-width:0;overflow-y:auto;overflow-wrap:anywhere;font-size:13px;line-height:20px}',
      // ---- rendered README (the plugin's own markdown renderer) ----
      // GitHub-ish rhythm with theme tokens: headings above their text, code in a
      // layer-2 box, tables with hairline borders, links in the business colour.
      '.dws-md{display:block;min-width:0;padding-bottom:14px}',
      '.dws-md>:first-child{margin-top:0}',
      '.dws-md>:last-child{margin-bottom:0}',
      '.dws-mdPara{margin:0 0 10px;white-space:pre-wrap}',
      '.dws-mdHeading{margin:18px 0 8px;font-weight:600;line-height:1.35;overflow-wrap:anywhere}',
      '.dws-md h1{font-size:20px;padding-bottom:6px;border-bottom:.5px solid var(--dsw-alias-border-l3)}',
      '.dws-md h2{font-size:17px;padding-bottom:4px;border-bottom:.5px solid var(--dsw-alias-border-l3)}',
      '.dws-md h3{font-size:15px}',
      '.dws-md h4,.dws-md h5,.dws-md h6{font-size:13px}',
      '.dws-mdList{margin:0 0 10px;padding-inline-start:22px}',
      '.dws-mdList li{margin:2px 0;overflow-wrap:anywhere}',
      '.dws-md code{font-family:var(--dsh-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:12px;',
      'background:var(--dsw-alias-bg-layer-2);border-radius:4px;padding:1px 5px;overflow-wrap:anywhere}',
      '.dws-mdCode{box-sizing:border-box;margin:0 0 12px;padding:10px 12px;border-radius:6px;overflow:auto;',
      'background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l3)}',
      '.dws-mdCode code{display:block;padding:0;background:none;font-size:12px;line-height:18px;white-space:pre}',
      '.dws-mdQuote{margin:0 0 12px;padding:2px 12px;border-inline-start:3px solid var(--dsw-alias-border-l3);',
      'color:var(--dsw-alias-label-secondary)}',
      '.dws-mdRule{border:0;border-top:.5px solid var(--dsw-alias-border-l3);margin:16px 0}',
      '.dws-mdTable{box-sizing:border-box;display:block;max-width:100%;overflow-x:auto;border-collapse:collapse;',
      'margin:0 0 12px;font-size:12.5px}',
      '.dws-mdTable th,.dws-mdTable td{border:.5px solid var(--dsw-alias-border-l3);padding:5px 10px;',
      'text-align:start;vertical-align:top;white-space:nowrap}',
      '.dws-mdTable th{background:var(--dsw-alias-bg-layer-2);font-weight:600}',
      '.dws-md a{color:var(--dsw-alias-state-business-primary);text-decoration:none}',
      '.dws-md a:hover{text-decoration:underline}',
      '.dws-md strong{font-weight:600}',
      '.dws-md del{opacity:.65}',
      '.dws-readme--empty{color:var(--dsw-alias-label-tertiary)}',
      '.dws-settings{display:flex;flex-direction:column;gap:16px;min-width:0;padding:4px 0 16px}',
      '.dws-settingsGroup{display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.dws-settingsGroupTitle{margin:0 0 6px;font-size:13px;font-weight:510;line-height:20px;color:var(--dsw-alias-label-secondary)}',
      '.dws-settingRow{display:flex;align-items:center;gap:12px;min-width:0;padding:8px 0;border-bottom:.5px solid var(--dsw-alias-border-l1)}',
      '.dws-settingRow:last-child{border-bottom:none}',
      '.dws-settingText{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}',
      '.dws-settingLabel{font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary)}',
      '.dws-settingHint{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}',
      '.dws-settingControl{flex:none;display:flex;align-items:center;gap:6px;white-space:nowrap}',

      /* ---- own modal (fallback when the primitives Modal is unavailable) ---- */
      '.dws-mask{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:16px;',
      'background:var(--dsw-alias-bg-mask-1)}',
      '.dws-modal{box-sizing:border-box;max-width:100%;max-height:100%;display:flex;flex-direction:column;min-width:0;',
      'border-radius:var(--dsw-radius-lg);border:.5px solid var(--dsw-alias-border-l3);',
      'background:var(--dsw-alias-bg-overlay);box-shadow:0 16px 48px var(--dsw-alias-bg-mask-3)}',
      '.dws-modalHead{flex:none;display:flex;align-items:center;gap:12px;padding:14px 18px 8px;min-width:0}',
      '.dws-modalTitle{margin:0;flex:1 1 auto;min-width:0;font-size:15px;font-weight:510;line-height:22px;overflow-wrap:anywhere}',
      '.dws-modalBody{flex:1 1 auto;min-height:0;min-width:0;display:flex;flex-direction:column;padding:0 18px 12px;overflow-y:auto}',
      '.dws-modalFoot{flex:none;display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:10px 18px 14px}',
    ].join('')

    /** Idempotent stylesheet install; returns the disposer. */
    const installStyles = () => insertStyle(STYLE_ID, STYLES)
