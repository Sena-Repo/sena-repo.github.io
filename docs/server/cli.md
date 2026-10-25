# 服务端 CLI

`senacli` 是 Sena Repo 服务端的本地维护命令。Docker 镜像内置该命令；裸机安装脚本部署后会将其注册到系统路径。

## 使用方式

Docker 部署：

```bash
docker exec -it sena-repo senacli status --roots
docker exec -it sena-repo senacli scan --scrape missing
docker exec -it sena-repo senacli useradd
```

裸机部署：

```bash
senacli status --roots
senacli scan
senacli useradd --admin
```

Docker 容器内不能直接更新或卸载宿主机服务；`senacli update` / `senacli uninstall` 在容器内只会给出提示。

裸机部署下以普通用户运行 `senacli` 时，会自动通过 `sudo` 重新执行当前命令（密码提示走当前终端，是否免密取决于 sudoers）。非交互环境（管道、脚本、无终端）不会挂起等密码，而是提示改用 `sudo senacli <命令>`，退出码为 2。Docker 容器内一般以 root 运行，不涉及提权。

## 状态与扫描

| 命令 | 说明 |
|------|------|
| `senacli status` | 显示服务状态、数据路径、绑定端口、游戏/版本/标签/用户数量 |
| `senacli status --roots` | 额外显示根目录列表、文件源、路径和批量刮削开关 |
| `senacli scan` | 扫描所有目录 |
| `senacli scan --root-id 1` | 只扫描指定根目录，可重复传入 |
| `senacli scan --scrape missing` | 扫描后补齐缺失元数据 |
| `senacli scan --sources hikarinagi,vndb_kana` | 只使用指定刮削源 |

刮削模式包括 `none`、`missing`、`overwrite`、`metadata`、`images`。

## 清库重扫

```bash
senacli clear
senacli clear --scrape missing
```

`clear` 会删除游戏、版本和游戏标签关联，然后重新扫描。目录配置、用户、OpenList 服务器和刮削配置会保留。

## 用户管理

| 命令 | 说明 |
|------|------|
| `senacli users` | 列出用户 |
| `senacli useradd` | 创建用户；没有任何用户时会创建首个管理员 |
| `senacli useradd --admin` | 创建管理员 |
| `senacli username` | 修改用户名 |
| `senacli passwd` | 修改密码 |
| `senacli useradmin --admin` | 授予管理员 |
| `senacli useradmin --user` | 降为普通用户 |
| `senacli userdel` | 删除用户 |

修改用户名、密码或管理员权限会让目标用户现有登录态失效，需要重新登录。

## 备份与恢复

```bash
senacli backup
senacli backup /path/to/backup-dir
senacli backup -o /path/to/backup.zip
senacli backup --json-only
senacli backup --scope library
senacli backup --scope patch
senacli restore sena-backup-20260915-153000.zip
senacli restore sena-backup-20260915-153000.zip -y
```

`backup` / `restore` 用于导出和恢复服务端数据：游戏库与文件源（OpenList）、账号（含 NextMoe 绑定）、补丁规则/类型关键词/补丁库目录、平台分类、扫描与刮削设置（含 NextMoe 模式与 API Key）与自定义分类正则，可选是否包含封面/背景/头像。备份含明文凭据，请妥善保管；备份格式只接受当前版本，旧备份需用当前版本重新导出。`--scope` 支持 `all`（默认）、`library`（仅游戏库与账号）、`patch`（仅补丁规则）。恢复时会依次询问恢复范围、已存在条目如何处理、已有图片如何处理，`-y` 表示全部使用默认值；恢复前会为数据库、补丁索引与设置文件创建安全快照，失败时自动回滚。完整说明见 [备份与恢复](/server/backup)。

## 裸机更新与卸载

```bash
senacli update                      # 在当前通道内升级（沿安装记录的通道，默认开发版 main）
senacli update --check              # 只检查：0=已最新，1=有更新，2=检查失败
senacli update --channel beta       # 最新预发布 tag（beta / rc）
senacli update --channel release    # 最新正式版 tag（stable 为别名）
senacli update --ref main           # 直接指定分支或 tag（保持锁定）
senacli uninstall --keep-data
senacli uninstall --purge-data
```

安装脚本会把上次使用的仓库地址和分支记录到 `/opt/sena-repo/.version`；更新时会从对应远程仓库拉取最新服务端代码，并保留数据库、游戏目录、补丁目录和环境配置。如果安装时用了镜像源，后续更新会自动继续使用它。

不带 `--channel` 时按安装记录里的**通道**（`dev` / `beta` / `release`）重新解析最新目标，所以 `release` / `beta` 用户下次 `senacli update` 仍能拿到新 tag，不会停在安装时的旧版本；显式用 `--ref` 时则保持锁定在那个分支或 tag。`--channel beta` / `release` 分别取最新的预发布 / 正式版 tag（`stable` 是 `release` 的别名；还没有对应 tag 时会提示改用其他通道或 `--ref`）。检查更新时会自动重试，并在直连不可用时改用 `SENA_GH_MIRROR` 镜像（默认 `https://gh-proxy.com/`，置空可禁用）；用上镜像后会把该地址写回安装记录。仍然失败时，报错会列出尝试过的源，可以用 `--repo-url` 换镜像源、`--ref` 直接指定 ref。只有直接运行 `install.sh`（不带 `--channel` / `--ref`）时，交互式终端下才会询问版本通道，回车保持当前通道。

更新会先在服务端仍在运行时准备好新代码和独立的 Python 环境，然后停服、切换目录、启动并轮询 `/api/health`（最长 2 分钟）。健康检查通过才写入新版本号；失败会自动切回上一份代码、恢复环境文件并重启旧版本，旧代码保留在 `/opt/sena-repo/server.prev`。更新前如果检测到正在进行的恢复（`.restore.lock` 被占用）会直接中止，避免打断恢复。

`senacli update --check` 只做检查、不执行更新：退出码 `0` 表示已是最新、`1` 表示有更新、`2` 表示检查失败（网络或通道没有可用 tag），适合放进脚本。

如果安装不完整（例如 `/usr/local/bin/senacli`、`/opt/sena-repo/venv` 或 systemd 单元缺失），再次运行安装脚本会自动检测并修复；也可以显式强制完整安装：

```bash
curl -fsSL https://gh-proxy.com/https://raw.githubusercontent.com/404-GCross/Sena-Repo/main/server/install.sh \
  | sudo SENA_REPO_URL=https://gh-proxy.com/https://github.com/404-GCross/Sena-Repo.git bash -s -- --update
```
