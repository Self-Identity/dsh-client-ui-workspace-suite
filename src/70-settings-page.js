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
      const modules = [
        { key: 'modulePicker', label: t('settings.module.picker'), hint: t('settings.module.picker.hint') },
        { key: 'moduleTree', label: t('settings.module.tree'), hint: t('settings.module.tree.hint') },
        { key: 'moduleOverview', label: t('settings.module.overview'), hint: t('settings.module.overview.hint') },
      ]
      return E('div', { className: 'dws-settings' }, [
        E('div', { key: 'description', className: 'dws-settingHint' }, t('settings.description')),
        E('div', { key: 'modules', className: 'dws-settingsGroup' }, [
          E('h4', { key: 'title', className: 'dws-settingsGroupTitle' }, t('settings.modules')),
          ...modules.map((entry) => E(SettingRow, {
            key: entry.key,
            label: entry.label,
            hint: entry.hint,
          }, E(SuiteSwitch, {
            checked: settings[entry.key] === true,
            label: entry.label,
            onChange: (value) => writeSetting(entry.key, value),
          }))),
        ]),
        E('div', { key: 'options', className: 'dws-settingsGroup' }, [
          E('h4', { key: 'title', className: 'dws-settingsGroupTitle' }, t('settings.options')),
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
          E(SettingRow, {
            key: 'treeScroll',
            label: t('settings.treeScroll'),
          }, E(SuiteSwitch, {
            checked: settings.treeScroll === true,
            label: t('settings.treeScroll'),
            onChange: (value) => writeSetting('treeScroll', value),
          })),
          E(SettingRow, {
            key: 'collapseAllByDefault',
            label: t('settings.collapseAllByDefault'),
          }, E(SuiteSwitch, {
            checked: settings.collapseAllByDefault === true,
            label: t('settings.collapseAllByDefault'),
            onChange: (value) => writeSetting('collapseAllByDefault', value),
          })),
          E(SettingRow, {
            key: 'pickerDepth',
            label: t('settings.pickerDepth'),
          }, E(SuiteNumber, {
            value: settings.pickerDepth,
            min: 0,
            max: 4,
            step: 1,
            label: t('settings.pickerDepth'),
            suffix: '',
            onChange: (value) => writeSetting('pickerDepth', value),
          })),
          E(SettingRow, {
            key: 'showTokens',
            label: t('settings.showTokens'),
            hint: t('settings.showTokens.hint'),
          }, E(SuiteSwitch, {
            checked: settings.showTokens === true,
            label: t('settings.showTokens'),
            onChange: (value) => writeSetting('showTokens', value),
          })),
          E(SettingRow, {
            key: 'showTurns',
            label: t('settings.showTurns'),
            hint: t('settings.turns.hint'),
          }, E(SuiteSwitch, {
            checked: settings.showTurns === true,
            label: t('settings.showTurns'),
            onChange: (value) => writeSetting('showTurns', value),
          })),
          E(SettingRow, {
            key: 'includeArchived',
            label: t('settings.includeArchived'),
          }, E(SuiteSwitch, {
            checked: settings.includeArchived === true,
            label: t('settings.includeArchived'),
            onChange: (value) => writeSetting('includeArchived', value),
          })),
          E(SettingRow, {
            key: 'includeSubagent',
            label: t('settings.includeSubagent'),
          }, E(SuiteSwitch, {
            checked: settings.includeSubagent === true,
            label: t('settings.includeSubagent'),
            onChange: (value) => writeSetting('includeSubagent', value),
          })),
          E(SettingRow, {
            key: 'readme',
            label: t('settings.readme'),
          }, E(SuiteSwitch, {
            checked: settings.readme === true,
            label: t('settings.readme'),
            onChange: (value) => writeSetting('readme', value),
          })),
          E(SettingRow, {
            key: 'showEnv',
            label: t('settings.showEnv'),
          }, E(SuiteSwitch, {
            checked: settings.showEnv === true,
            label: t('settings.showEnv'),
            onChange: (value) => writeSetting('showEnv', value),
          })),
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
