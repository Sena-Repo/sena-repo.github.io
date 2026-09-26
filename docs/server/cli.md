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
| `senacli useradd` | 创建用户；没有任何用户时会创建首个服主 |
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

`backup` / `restore` 用于导出和恢复服务端数据：游戏库与文件源（OpenList）、账号（含 鲲Galgame 绑定）、补丁规则/类型关键词/补丁库目录、扫描与刮削设置（含 NextMoe 模式与 API Key），可选是否包含封面/背景/头像。备份含明文凭据，请妥善保管；旧版本备份仍可导入且不会清空目标已有的绑定或配置。`--scope` 支持 `all`（默认）、`library`（仅游戏库与账号）、`patch`（仅补丁规则）。恢复时会依次询问恢复范围、已存在条目如何处理、同名图片如何处理，`-y` 表示全部使用默认值；恢复前会先把现有补丁索引备份到 `backups/sena-backup/`。旧的仅补丁规则 JSON 备份仍可恢复。完整说明见 [备份与恢复](/server/#备份与恢复)。

## 裸机更新与卸载

```bash
senacli update                      # 不带 --channel 时沿用安装时记录的通道（默认开发版 main）
senacli update --channel beta       # 最新预发布 tag（beta / rc）
senacli update --channel release    # 最新正式版 tag
senacli update --ref main           # 直接指定分支或 tag
senacli uninstall --keep-data
senacli uninstall --purge-data
```

安装脚本会把上次使用的仓库地址和分支记录到 `/opt/sena-repo/.version`；更新时会从对应远程仓库拉取最新服务端代码，并保留数据库、游戏目录、补丁目录和环境配置。如果安装时用了镜像源，后续更新会自动继续使用它。

不带 `--channel` 时沿用安装时记录的 ref；`--channel beta` / `release` 分别取最新的预发布 / 正式版 tag（还没有对应 tag 时会提示改用其他通道或 `--ref`）。检查更新时会自动重试，并在直连不可用时改用 `SENA_GH_MIRROR` 镜像（默认 `https://gh-proxy.com/`，置空可禁用）；用上镜像后会把该地址写回安装记录，后续更新继续使用。仍然失败时，报错会列出尝试过的源，可以用 `--repo-url` 换镜像源、`--ref` 直接指定 ref。直接运行 `install.sh`（不带 `--channel` / `--ref`）更新时，交互式终端下同样会询问版本通道，回车保持当前通道。

如果安装不完整（例如 `/usr/local/bin/senacli`、`/opt/sena-repo/venv` 或 systemd 单元缺失），再次运行安装脚本会自动检测并修复；也可以显式强制完整安装：

```bash
curl -fsSL https://gh-proxy.com/https://raw.githubusercontent.com/404-GCross/Sena-Repo/main/server/install.sh \
  | sudo SENA_REPO_URL=https://gh-proxy.com/https://github.com/404-GCross/Sena-Repo.git bash -s -- --update
```
