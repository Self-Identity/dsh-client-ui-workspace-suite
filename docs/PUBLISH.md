# 发布指南（DSH 插件）

客户端内置插件市场（`@deepseek-ai/dsh-plugin-market`）：它从**你配置的索引 URL** 读取「插件市场索引 format 1」的 JSON，按索引里每个版本的来源安装（npm 或 git 精确 commit）。

## 一、换个新 GitHub 账号发布：迁移步骤

1. **新账号**建一个仓库，推荐 **单仓多包**：`dsh-plugins/` 下每个插件一个子目录（`dsh-client-ui-workspace-suite/`、`dsh-client-ui-thick-scrollbar/` ……）。
2. 把本地 `F:\plugins-for-dsh\<插件>` 逐个推上去（保留各自 `.git` 历史就用 `git remote set-url` 改远端再 `push`；或重建仓库后 `git push --all`）。
3. 每个插件在 `package.json` 里补上 `repository` / `homepage`（指向新账号地址），并把 `private` 设为 `false`。
4. 打 tag：`git tag v1.2.0 && git push --tags`。

> 单仓多包时，索引里的 git 来源要带 `path`（见下文 `--path`），安装规格是
> `git+<repo>.git#<commit>&path:/<子目录>`，所以子目录里必须有完整的 `package.json` 与 `lib/`。

## 二、每次发版前：本地校验

```powershell
cd F:\plugins-for-dsh\dsh-client-ui-workspace-suite
node tools\build.mjs                      # 重建 lib/client.js（必须提交）
npm test                                  # 九项校验
node tools\release.mjs --check            # 发布字段 + 构建产物是否过期
```

`--check` 会校验：包名合法、版本号是精确 SemVer、`private` 不为 true、**`engines.dsh` 存在**、
`dsh.bundle.patch` 指向真实文件、`lib/index.js` 与 `lib/client.js` 存在、`files` 含 `lib`、
README/LICENSE 存在、图标 ≤24 KiB（base64 后 ≤32 KiB）、构建产物不比 `src/` 旧。

## 三、生成市场索引条目

```powershell
# 只用 git 来源（不需要 npm 账号）
node tools\release.mjs --index --repo https://github.com/<新账号>/dsh-plugins

# git + npm 两个来源都写（推荐：先 git 保底，npm 供版本号安装）
node tools\release.mjs --index --repo https://github.com/<新账号>/dsh-plugins --npm `
  --write market\plugin-market.json
```

其它参数：`--commit <40 位 SHA>`（默认取当前 HEAD）、`--timestamp <Unix 秒>`、`--version <版本>`。
输出就是可直接粘贴进索引的 JSON，`--write` 会**合并**进索引文件并保留旧版本条目。

单仓多包时，手工在生成结果里补 `"path": "dsh-client-ui-workspace-suite"`：

```json
"source": { "type": "git", "url": "https://github.com/<账号>/dsh-plugins", "commit": "<40 hex>", "path": "dsh-client-ui-workspace-suite" }
```

## 四、托管索引

- 位置随意，只要是 **http/https 直链、不发生重定向**（客户端 `redirect: "error"`）；
- GitHub Pages（`https://<账号>.github.io/dsh-plugins/plugin-market.json`）或
  `raw.githubusercontent.com` 直链都可用；
- 索引里 `title` 必填；`plugins[].versions` 非空；`version` 用精确 SemVer，
  `publishTimestamp` 是 Unix **秒**。

## 五、在客户端添加索引

- 插件页的「市场 / Discover」标签里添加索引 URL；或
- profile 的 `plugin-market` 行配置：`config.indexes: ["https://…/plugin-market.json"]`。

添加后市场会拉取索引并按需安装；安装 git 来源时会检出**精确 commit**，因此发版后不要再改写该 commit。

## 六、npm（可选）

```powershell
npm login
npm publish --access public
```

- 包名要在 npm 上未被占用（`dsh-client-ui-workspace-suite` 这类前缀不保证唯一，先 `npm view <name>` 确认）；
- 发布后索引里对应的 `source` 用 `{ "type": "npm" }`（`--npm` 已经写好这一条）；
- 私有 registry 时在索引里加 `"registry": "https://…"`。

## 七、发版检查清单

- [ ] `npm test` 全绿
- [ ] `node tools/build.mjs` 后提交了 `lib/`
- [ ] `node tools/release.mjs --check` 通过
- [ ] 版本号已递增（SemVer）并写进 CHANGELOG
- [ ] `git tag v<版本>` 并推送
- [ ] 索引条目用**新 commit** 更新后推送索引
- [ ] 客户端里删掉旧版本重装一次，确认可以安装并可运行
