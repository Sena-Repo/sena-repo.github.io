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

`backup` / `restore` 用于导出和恢复服务端数据：游戏库、账号、补丁规则与类型关键词，可选是否包含封面/背景/头像。`--scope` 支持 `all`（默认）、`library`（仅游戏库与账号）、`patch`（仅补丁规则）。恢复时会依次询问恢复范围、已存在条目如何处理、同名图片如何处理，`-y` 表示全部使用默认值；恢复前会先把现有补丁索引备份到 `backups/sena-backup/`。旧的仅补丁规则 JSON 备份仍可恢复。完整说明见 [备份与恢复](/server/#备份与恢复)。

## 裸机更新与卸载

```bash
senacli update --channel dev
senacli update --channel release
senacli update --ref main
senacli uninstall --keep-data
senacli uninstall --purge-data
```

安装脚本会记录上次使用的仓库地址和分支。更新时会从对应远程仓库拉取最新服务端代码，并保留数据库、游戏目录、补丁目录和环境配置。
