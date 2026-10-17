    /* ========================== settings card ============================== */

    /** One settings row: label, hint and a control on the right. */
    function SettingRow({ label, hint, children }) {
      return E('div', { className: 'dws-settingRow' }, [
        E('div', { key: 'text', className: 'dws-settingText' }, [
          E('span', { key: 'label', className: 'dws-settingLabel' }, label),
          hint === undefined || hint === null ? null : E('span', { key: 'hint', className: 'dws-settingHint' }, hint),
        ]),
        E('div', { key: 'control', className: 'dws-settingControl' }, children),
      ])
    }

    /**
     * The Plugins-panel configuration card for this bundle
     * (`plugins.bundle.config`, keyed by the package name). Every control
     * writes straight into the settings store, so there is no staged draft.
     */
    function WorkspaceSuiteSettings({ t, view }) {
      const settings = useSettings()
      if (view === 'summary') {
        return E('div', { className: 'dws-settingHint' }, t('settings.description'))
      }
      /** One labelled switch row for a boolean setting. */
      const switchRow = (key, labelKey, hintKey) => E(SettingRow, {
        key,
        label: t(labelKey),
        hint: hintKey === undefined ? undefined : t(hintKey),
      }, E(SuiteSwitch, {
        checked: settings[key] === true,
        label: t(labelKey),
        onChange: (value) => writeSetting(key, value),
      }))
      /** One titled group of rows, so the card mirrors the three modules. */
      const settingGroup = (key, titleKey, rows) => E('div', { key, className: 'dws-settingsGroup' }, [
        E('h4', { key: 'title', className: 'dws-settingsGroupTitle' }, t(titleKey)),
        ...rows,
      ])
      const modules = [
        { key: 'modulePicker', labelKey: 'settings.module.picker', hintKey: 'settings.module.picker.hint' },
        { key: 'moduleTree', labelKey: 'settings.module.tree', hintKey: 'settings.module.tree.hint' },
        { key: 'moduleOverview', labelKey: 'settings.module.overview', hintKey: 'settings.module.overview.hint' },
        { key: 'moduleHeroMenu', labelKey: 'settings.module.hero', hintKey: 'settings.module.hero.hint' },
      ]
      return E('div', { className: 'dws-settings' }, [
        E('div', { key: 'description', className: 'dws-settingHint' }, t('settings.description')),
        settingGroup('modules', 'settings.modules',
          modules.map((entry) => switchRow(entry.key, entry.labelKey, entry.hintKey))),
        settingGroup('picker', 'settings.group.picker', [
          E(SettingRow, {
            key: 'pickerDepth',
            label: t('settings.pickerDepth'),
            hint: t('settings.pickerDepth.hint'),
          }, E(SuiteNumber, {
            value: settings.pickerDepth,
            min: 0,
            max: 4,
            step: 1,
            label: t('settings.pickerDepth'),
            suffix: '',
            onChange: (value) => writeSetting('pickerDepth', value),
          })),
        ]),
        settingGroup('list', 'settings.group.list', [
          E(SettingRow, {
            key: 'treeMaxHeightPct',
            label: t('settings.treeMaxHeight'),
            hint: t('settings.treeMaxHeight.hint'),
          }, E(SuiteNumber, {
            value: settings.treeMaxHeightPct,
            min: 20,
            max: 100,
            step: 5,
            label: t('settings.treeMaxHeight'),
            suffix: '%',
            onChange: (value) => writeSetting('treeMaxHeightPct', value),
          })),
          switchRow('treeScroll', 'settings.treeScroll', 'settings.treeScroll.hint'),
          switchRow('collapseAllByDefault', 'settings.collapseAllByDefault', 'settings.collapseAllByDefault.hint'),
          switchRow('includeArchived', 'settings.includeArchived', 'settings.includeArchived.hint'),
          switchRow('includeSubagent', 'settings.includeSubagent', 'settings.includeSubagent.hint'),
        ]),
        settingGroup('overview', 'settings.group.overview', [
          switchRow('showTokens', 'settings.showTokens', 'settings.showTokens.hint'),
          switchRow('showTurns', 'settings.showTurns', 'settings.showTurns.hint'),
          switchRow('showEnv', 'settings.showEnv', 'settings.showEnv.hint'),
          switchRow('readme', 'settings.readme', 'settings.readme.hint'),
          E(SettingRow, {
            key: 'readmeMaxHeightPct',
            label: t('settings.readmeMaxHeight'),
            hint: t('settings.readmeMaxHeight.hint'),
          }, E(SuiteNumber, {
            value: settings.readmeMaxHeightPct,
            min: 15,
            max: 90,
            step: 5,
            label: t('settings.readmeMaxHeight'),
            suffix: '%',
            onChange: (value) => writeSetting('readmeMaxHeightPct', value),
          })),
        ]),
        E('div', { key: 'actions', style: { display: 'flex', justifyContent: 'flex-end' } },
          E(SuiteButton, { onClick: resetSettings }, t('settings.reset'))),
      ])
    }
