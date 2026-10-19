# dsh-client-ui-workspace-suite

Workspace suite for the DSH Web client: an explorer-style picker, a nested workspace tree, a per-workspace overview page, and a root-level conversation workspace menu.

把 DSH 客户端的「工作区」从一层平铺列表，升级成可浏览的目录树：选目录、看层级、看总览、开会话时选对工作区。

> Target host: `@deepseek-ai/dsh-desktop-runtime 0.2.1-rc.2` · renderer-only bundle (no host tools, no network requests)

## Modules

Four independently switchable modules, enabled by default. Each can be turned off in **Plugins → Configure** to return to the shipped behaviour.

| Pain point | What the plugin does | Switch |
|---|---|---|
| The directory picker is a native dialog: no hierarchy, no folder creation | Explorer-style picker: browse level by level, create a folder inline, type a path, then choose which workspace to enter | `modulePicker` |
| The workspace list is flat, so monorepo sub-projects blur together | Nested workspace tree: folder hierarchy, collapse all, inline session creation, cascade delete | `moduleTree` |
| No way to see what a workspace contains or how many tokens it has spent | Workspace overview: subtree token totals with per-model detail, fully expanded session tree, turn jumps, dependencies card, README | `moduleOverview` |
| The conversation workspace menu lists every `src` / `lib` sub-folder | Root-level only; when the chosen item has registered sub-workspaces, ask which one to start in | `moduleHeroMenu` |

### 1. Explorer-style picker

- Both entry points (`Add workspace` in the hero, `＋ Add` in the sidebar) open it.
- Tree: click a row to expand or collapse; double-click or click the checkbox to pick; picking a folder expands it automatically.
- **Inline folder creation**: hover the `＋` at the end of a row, type a name, press `Enter` (or click elsewhere). Empty names are refused; duplicates are reported inline.
- **Path input**: paste an absolute path and press `Enter`; the ancestor chain is expanded only down to that level and focused.
- **Nestable selection**: a new pick must be comparable with the current selection (ancestor, descendant or sibling). Siblings pull in their common parent but never the whole drive root.
- After confirming, choose which workspace to enter; the root is selected by default and `Skip` only registers the selection.

### 2. Nested workspace tree

- Workspaces nest by their nearest registered ancestor directory; the order inside a level is folder icon → parent workspace → parent sessions → sub-workspaces.
- Pin / unpin reorders a session to the top of its workspace with a 180ms FLIP animation that respects `prefers-reduced-motion`.
- The collapse button next to the search field folds every sub-workspace; the state persists.
- Rows are `role=treeitem` with `aria-expanded`, so the tree is keyboard navigable.
- Deleting a workspace cascades from the deepest level until the subtree is clean, and reports what refuses to go.
- Ungrouped sessions form their own section at the end of the list: a hairline divider plus a small section header, not a fake workspace row.

### 3. Workspace overview

Entry: workspace row → **More** → **Workspace overview**.

- Header: folder icon, name, absolute path, and the token total of the workspace **and all its sub-workspaces** (hover for the per-model split).
- Fully expanded session tree; token numbers appear here only.
- Dependencies card (optional): one directory listing plus fixed probes for `package.json`, `tsconfig.json`, `Dockerfile` and `.nvmrc`. It never recurses and never reads lockfiles.
- Recent turns per session, linked back into the session.
- Root `README.md` rendered by the plugin's own lightweight Markdown renderer (no HTML injection; `javascript:` links are not clickable).

### 4. Conversation workspace menu

- Lists root-level workspaces only.
- Choosing an item that has registered sub-workspaces asks which one to start the session in.
- `Add workspace` is pinned to the top and opens the explorer-style picker.

## Settings

| Group | Keys |
|---|---|
| Modules | `modulePicker`, `moduleTree`, `moduleOverview`, `moduleHeroMenu` |
| Picker | `pickerDepth` (levels expanded on open, 0 = current level only) |
| Workspace list | `treeMaxHeightPct`, `treeScroll`, `collapseAllByDefault`, `includeArchived`, `includeSubagent` |
| Overview | `showTokens`, `showTurns`, `showEnv`, `readme`, `readmeMaxHeightPct` (15–90) |
| Appearance | `scrollbarWidth` (4–20px, default 8px) for this plugin's own scroll areas |

The scrollbar width chain is `--suite-scrollbar-width` → the global `--dsh-scrollbar-width` → 8px, so it follows `dsh-client-ui-thick-scrollbar` when that plugin is installed.

## Boundaries

### What it takes over

| Kind | Target | Note |
|---|---|---|
| Slot (shadow) | `sidebar.workspaces` (priority `-100`) | Replaces the whole workspace list |
| Slot (shadow) | `conversation.hero.workspace` (priority `-1`) | Replaces the conversation workspace menu |
| Slot (placeholder) | `sidebar.workspaces.directoryFlow`, `conversation.hero.workspace.directoryFlow` | The two add-workspace dialog seats |
| Composition row | `directory-picker` disabled; inserts the browse backend, its UI and this package | See below |

### Global side effect: the native directory dialog disappears

The directory-picker service is mutually exclusive: the `native` backend offers the system dialog but cannot list directories, while the `browse` backend lists directories but has no dialog. To build the in-app explorer, this bundle pins the service to `browse`. Therefore, while the bundle is enabled, no part of the application opens the system directory dialog. Switching off the picker module does **not** restore it — the browse backend is still composed. Disable (or uninstall) the whole bundle and restart to get the system dialog back.

### What it does not do

- It does not modify session content, model behaviour or any network request.
- It does not write files, except creating a sub-folder when you explicitly press `＋`.
- It does not read the contents of your project files: the overview reads only `README.md`, and the dependencies card reads only the four files above. Directory listings carry names, not file contents.
- It does not move sessions between workspaces: a session belongs to the `cwd` it was created with, and the host exposes no API to reassign it.

### Known limitations

1. **Host contracts**: slot ids, primitive names, composition row ids and service methods come from the client implementation. A client upgrade may change them.
2. **Conflicts**: several shadow registrations on the same slot compete by priority (`-100` / `-1` here). Only one wins.
3. **Preferences are browser-local**: `dsh-workspace-suite.settings.v1` and the boot record `dsh-workspace-suite.boot` live in `localStorage`; changing machines or clearing storage resets them.
4. **Not affiliated with DeepSeek**: this is a community plugin, not an official package.

## Install

1. Client sidebar → **Plugins** → **Add plugin**.
2. Choose this package: the local source directory, or the npm package name once published.
3. **Install** → **Enable now**; restart the client if it says the change takes effect on the next start.
4. The card must read **Enabled / Mounted**. The workspace list then switches to the tree view.

Enabling the bundle disables the shipped `directory-picker` row (see Boundaries); disabling the bundle restores the native dialog.

## Compatibility

Verified against `@deepseek-ai/dsh-desktop-runtime 0.2.1-rc.2`:

| Contract | Status |
|---|---|
| Platform seeds `react`, `@deepseek-ai/dsh-client-store`, `@deepseek-ai/dsh-client-ui-primitives` | Present |
| Slots `sidebar.workspaces`, `sidebar.workspaces.directoryFlow`, `conversation.hero.workspace`, `conversation.hero.workspace.directoryFlow` | Present |
| Composition row `directory-picker` (`@deepseek-ai/dsh-host-directory-picker-auto`) | Present; can be disabled and replaced by the browse backend |
| `workspace-files` row (`remote.workspaceFiles`) | Present; used by the README card and dependencies card |
| Primitives `Menu` / `MenuItemButton` / `Modal` / `HoverCard` / `MarkdownText` / `Tooltip` and the icons | Present; missing primitives fall back to built-in renderers |
| Services `slots` / `locale` / `sessions` / `workspaces` / `uiWorkspace` / `layout` / `remote` | Present; every call goes through a tolerant wrapper |

After a client upgrade, rebuild and run the test suite before assuming a contract is still valid.

## Troubleshooting

The browser half writes its boot progress into `localStorage` under `dsh-workspace-suite.boot` (ASCII JSON, last three failures kept).

| Record | Meaning |
|---|---|
| `apply-ok` / `registered` | Host row applied, registrations complete |
| `services-at-apply` | A service was not ready at apply time; it self-heals on first use |
| `overview-failed` | The overview page failed to render; the page shows a failure card |
| `factory-failed` / `entry-inert` | The browser half failed to load; the plugin degrades to a no-op |

Common causes: the client was not restarted; the package is missing from `dsh.profile.bundles`; another plugin shadows the same slot; the client upgrade moved a path.

## Development

```powershell
node tools/build.mjs          # assemble lib/client.js from src/*.js
node --check lib/client.js
npm test                      # manifest / styles / host / util / i18n / smoke
node tools/release.mjs --check
```

`src/` is assembled in file-name order (`00-` → `90-`); every file except `10-i18n.js` must stay pure ASCII (the build enforces it). The browser half must not import any `@deepseek-ai/*` package: capabilities arrive through `ctx` and the seat props, and only platform module seeds are resolved.

## Uninstall

1. Plugins → this bundle → **Disable** (or uninstall) → restart. Disabling the bundle also withdraws the composition patch, so the native directory dialog returns.
2. Optionally clear `dsh-workspace-suite.settings.v1` and `dsh-workspace-suite.boot` from `localStorage`.

## License

MIT. Not affiliated with DeepSeek.
