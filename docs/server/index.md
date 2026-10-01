# Sena Repo 服务端部署说明书

> [!CAUTION]
>
> Sena Repo 由 AI 辅助开发，安全性未经过专业审计。**强烈建议仅在 VPN 或家庭内网环境中使用，不建议直接暴露到公网。**

## 目录

- [部署前准备](#部署前准备)
- [服务端部署](#服务端部署)
- [备份与恢复](/server/backup)
- [配置参考](#配置参考)
- [文件源接入](/server/sources)
- [Steam 补丁](#steam-补丁)
- [附录](#附录)

---

## 部署前准备

### 目录结构

Sena Repo 按固定层级扫描游戏文件，部署前请先整理好文件：

```
游戏目录/
  ├── 会社A/
  │   ├── 游戏1/
  │   │   ├── [PC]游戏1.rar
  │   │   └── [KRKR]游戏1_v2.zip
  │   └── 游戏2/
  │       └── [Ty]游戏2.7z
  └── 会社B/
      └── 游戏3/
          └── 直装_游戏3.apk
```

| 层级 | 内容 |
|------|------|
| 第一级 | 会社文件夹（文件夹名即会社名） |
| 第二级 | 游戏文件夹（文件夹名即游戏名） |
| 第三级 | 压缩包（`.rar` `.zip` `.7z` `.tar` `.gz` `.xz` `.apk`） |

- 平台标记：`[PC]` `[KRKR]` `[Ty]` `[ONS]` `直装_`，无标记默认 PC
- 压缩包直接放在会社目录下也可以，自动视为独立游戏

> 文件不按规则整理则扫不出来。也可以在设置中调整目录结构为"仅游戏"或"扁平"模式。

如果游戏库和 Steam 补丁库都使用 OpenList 作为文件来源，服务端本地无需挂载实际的 `/games` 和补丁文件目录。补丁索引与关键词配置都写在数据目录下的 `steam_patch_index/`，只要 `/data` 是持久化挂载即可。

### 压缩包内目录要求

扫描只看压缩包的文件名和它所在的位置，不检查压缩包内部结构；但**解压整理**和**补丁注入**会受内部结构影响，建议按下面的约定打包：

**游戏压缩包**

- 没有强制要求：压缩包里是单一顶层目录，或直接在根目录放散文件，都能正常处理
- 客户端解压后会统一整理成以「版本目录名」命名的文件夹：单顶层目录会被重命名，散文件会被包进这个文件夹
- 推荐**只套一层目录**（例如 `游戏名/…`），避免多套 `游戏名/版本/…` 之类的层级——多出来的层级会原样保留在解压结果里
- 压缩包内应直接是游戏本体文件，不要在里面再放安装说明、重复的压缩包等无关内容

**Steam 补丁压缩包**

- 常见做法是只套一层顶层目录（例如 `汉化v2/…`）；服务端分析压缩包时会提示把这个目录作为补丁源目录 `patch_dir`
- 直接在压缩包根目录放文件也可以，此时 `patch_dir` 留空
- 存在多个顶层目录时，需要在客户端补丁配置里手动指定 `patch_dir`，告诉服务端从哪个子目录取文件

### Steam 补丁目录结构

```
steam_patch/                      ← 补丁压缩包目录（本地类型的补丁库）
├── 游戏1_Steam_Chinese_Patch.7z
└── 游戏2_Steam_Voice_Patch.rar

data/steam_patch_index/           ← 索引目录，位于数据目录内
├── patches.json                  ← 自动生成，记录所有补丁与匹配规则
└── patch_type_keywords.json      ← 补丁类型识别关键词配置
```

---

## 服务端部署

### 方式一：Docker 拉取（推荐）

Release 发布时镜像自动推送到 DockerHub 和 GHCR，同时支持 amd64 和 arm64。

```bash
# DockerHub（推荐）
docker pull 404gcross/sena-repo:latest

# GHCR（备用）
docker pull ghcr.io/404-gcross/sena-repo:latest

# Beta 测试版（发布 beta / rc 时更新）
docker pull 404gcross/sena-repo:beta

# Dev 开发版
docker pull 404gcross/sena-repo:dev
```

**基础启动：**

```bash
docker run -d \
  --name sena-repo \
  -p 11451:11451 \
  -v /path/to/games:/games \
  -v /path/to/data:/data \
  -v /path/to/steam_patches:/steam_patch \
  --restart unless-stopped \
  404gcross/sena-repo:latest
```

**纯 OpenList 启动（游戏文件全在 OpenList 上）：**

```bash
docker run -d \
  --name sena-repo \
  -p 11451:11451 \
  -v /path/to/data:/data \
  -e SENA_PATCH_DIR=/data/steam_patch \
  --restart unless-stopped \
  404gcross/sena-repo:latest
```

**完整启动（含刮削 API Key 与代理）：**

```bash
docker run -d \
  --name sena-repo \
  -p 11451:11451 \
  -v /path/to/games:/games \
  -v /path/to/data:/data \
  -v /path/to/steam_patches:/steam_patch \
  -e SENA_BANGUMI_TOKEN="your_token" \
  -e SENA_VNDB_TOKEN="your_token" \
  -e SENA_PROXY="http://127.0.0.1:7890" \
  --restart unless-stopped \
  404gcross/sena-repo:latest
```

**Docker Compose：**

```yaml
services:
  sena-repo:
    image: 404gcross/sena-repo:latest
    container_name: sena-repo
    ports:
      - "11451:11451"
    volumes:
      - /path/to/games:/games
      - /path/to/data:/data
      - /path/to/steam_patches:/steam_patch
    environment:
      - SENA_BANGUMI_TOKEN=your_token      # 可选
      - SENA_VNDB_TOKEN=your_token         # 可选
      - SENA_PROXY=http://127.0.0.1:7890   # 可选，刮削代理
    restart: unless-stopped
```

**纯 OpenList Docker Compose：**

```yaml
services:
  sena-repo:
    image: 404gcross/sena-repo:latest
    container_name: sena-repo
    ports:
      - "11451:11451"
    volumes:
      - /path/to/data:/data
    environment:
      - SENA_PATCH_DIR=/data/steam_patch
    restart: unless-stopped
```

Docker 镜像内置 `senacli`，可以直接在容器里执行本地维护命令：

```bash
docker exec -it sena-repo senacli status
docker exec -it sena-repo senacli scan --scrape missing
docker exec -it sena-repo senacli useradd
```

Docker 部署的升级和卸载仍应在宿主机通过重新拉取镜像、停止旧容器、重建容器完成；容器内的 `senacli update` / `senacli uninstall` 只会给出操作提示，不会尝试修改宿主机。

### 方式二：Tarball 加载

从 [Releases](https://github.com/404-GCross/Sena-Repo/releases) 下载对应架构的 `Sena-Repo_Server_*.tar.gz`：

| 架构 | 文件名 |
|------|--------|
| x86_64 / amd64 | `Sena-Repo_Server_amd64_v*.tar.gz` |
| ARM64 | `Sena-Repo_Server_arm64_v*.tar.gz` |

```bash
docker load < Sena-Repo_Server_amd64_v0.1.0.tar.gz
docker run -d \
  --name sena-repo \
  -p 11451:11451 \
  -v /path/to/games:/games \
  -v /path/to/data:/data \
  -v /path/to/steam_patches:/steam_patch \
  sena-repo:latest
```

### 方式三：安装脚本直接部署

> 适合没有 Docker 的设备，例如部分 arm32 NAS、盒子或 Armbian 设备。amd64 / arm64 仍建议优先使用 Docker。

一键安装（交互式会让你选版本通道）：

```bash
# 直连
curl -fsSL https://raw.githubusercontent.com/404-GCross/Sena-Repo/main/server/install.sh | sudo bash

# 国内镜像（只在脚本地址前加前缀；源码拉取会自动跟随，直连失败时也会自动回退到镜像）
curl -fsSL https://gh-proxy.com/https://raw.githubusercontent.com/404-GCross/Sena-Repo/main/server/install.sh | sudo bash
```

安装和更新时都会让你选择（直接回车保持当前通道）：

- **稳定版**：最新正式版 tag
- **测试版**：最新预发布（beta / rc）tag
- **开发版**：`main` 分支，滚动最新

非交互环境用 `--channel` 指定，例如 `... | sudo bash -s -- --channel beta`；固定某个版本用 `--ref`（如 `--ref v0.2.0`）。选择结果会记入 `/opt/sena-repo/.version`，之后 `--update` / `senacli update` 继续沿用；直接回车不做选择，保持当前通道。

安装结束时会检测 firewalld / ufw：如果端口未放行会询问是否放行（非交互时打印手动命令）。

如果需要指定端口、数据目录或 Python 路径，可以把环境变量放到 `sudo` 后面：

```bash
curl -fsSL https://raw.githubusercontent.com/404-GCross/Sena-Repo/main/server/install.sh | sudo SENA_PORT=11451 SENA_DATA_PATH=/var/lib/sena-repo bash
```

如果希望先查看脚本内容再执行：

```bash
curl -fsSLO https://raw.githubusercontent.com/404-GCross/Sena-Repo/main/server/install.sh
sudo bash install.sh
```

也可以手动 clone 稳定版源码后运行本地脚本：

```bash
git clone https://github.com/404-GCross/Sena-Repo.git
cd Sena-Repo/server
sudo bash install.sh
```

国内网络同样给地址加 `https://gh-proxy.com/` 前缀即可，例如 `git clone https://gh-proxy.com/https://github.com/404-GCross/Sena-Repo.git`；先下载脚本再执行、以及带环境变量的命令也同理。

如需固定某个分支或 tag 的源码，把上面命令的 `-b` 与 `SENA_REPO_REF` 换成对应 ref 即可（例如滚动开发标签 `dev-release`，或正式版发布后的 `v0.2.0`）。

脚本当前支持带 `systemd` 的常见 Linux 发行版，会自动识别 `apt-get`、`dnf`、`yum`、`zypper` 或 `pacman` 安装 Python 编译依赖、创建 venv、写入 systemd 服务并启动服务。已覆盖 Debian / Ubuntu / Armbian、Fedora / RHEL / Rocky / AlmaLinux / openEuler、openSUSE、Arch / Manjaro 等发行版。

如果发行版不在上述包管理器范围内，脚本不会立即退出；只要系统已经手动准备好依赖，仍会继续尝试创建 venv 和安装服务。

如果系统默认 `python3` 低于 3.10，可以通过环境变量指定 Python：

```bash
sudo SENA_PYTHON_BIN=/usr/bin/python3.11 bash install.sh
```

Steam 补丁压缩包探测需要 `7z` / `7zz` / `7za`。RPM 系发行版如果没有直接安装到 7z，通常需要先启用 EPEL 或手动安装 `7zip` / `p7zip`。

如果服务端已经安装，再次直接运行安装脚本时会先检查远程提交版本与本地组件：源码已是最新且组件齐全时才会跳过；检测到新提交、或发现组件缺失（例如 `senacli`、venv、systemd 单元）时会重新安装并重启服务。需要强制更新可使用 `--update`，只检查而不更新可使用 `--check`。

安装完成后会注册本地维护命令 `senacli`，常用命令如下：

```bash
senacli status --roots
senacli scan
senacli scan --scrape missing
senacli clear
senacli backup
senacli backup /path/to/backup-dir
senacli backup -o /path/to/backup.zip
senacli backup --json-only
senacli restore sena-backup-20260915-153000.zip
senacli update
senacli update --channel beta
senacli update --channel release
senacli uninstall
```

用户管理命令：

```bash
senacli users
senacli useradd
senacli username
senacli passwd
senacli useradmin
senacli userdel
```

`useradd` 在数据库没有任何用户时会创建首个服主；已有用户后默认创建普通用户，加 `--admin` 可创建管理员。`username`、`passwd`、`useradmin` 会让目标用户现有登录态失效，用户需要重新登录。`clear` 只清空游戏、版本和游戏标签关联，目录配置、用户、OpenList 与刮削配置会保留，然后重新扫描。

### 连不上怎么排查

按顺序检查（把 `<服务器IP>` 换成实际地址）。

**1. 服务在跑吗**

```bash
senacli status        # 确认 Service active、Bind 是 0.0.0.0:<端口>
```

**2. 本机连通性**

```bash
curl -fsS http://127.0.0.1:11451/api/health    # 期望 {"status":"ok","version":"..."}
ss -tlnp | grep 11451                          # 期望 0.0.0.0:11451 LISTEN
```

**3. 从客户端所在设备测**

```bash
curl -v http://<服务器IP>:11451/api/health
nc -vz <服务器IP> 11451
```

**4. 本机能通、外面不通 → 基本都是防火墙**

```bash
# firewalld（Fedora / RHEL / openEuler）
sudo firewall-cmd --permanent --add-port=11451/tcp && sudo firewall-cmd --reload
# ufw（Ubuntu / Debian）
sudo ufw allow 11451/tcp
```

云主机还要在服务商控制台的安全组放行对应端口；局域网内注意路由器的 AP 隔离或 VLAN 隔离。

**5. 客户端设置**

地址要带 scheme，例如 `http://<服务器IP>:11451`（只有走 HTTPS 反代时才勾选 HTTPS）；新服务器第一次连接会提示「服务器需要初始化」，跟着向导创建服主账号即可。


### 备份与恢复

备份、恢复与从备份重建的完整说明见 [备份与恢复](/server/backup)。

### 默认路径与维护

默认路径：

| 路径 | 说明 |
|------|------|
| `/opt/sena-repo/server` | 服务端程序 |
| `/opt/sena-repo/venv` | Python 虚拟环境 |
| `/etc/sena-repo/sena-repo.env` | 服务端环境变量 |
| `/var/lib/sena-repo` | 数据库、封面、配置数据 |
| `/srv/sena-repo/games` | 本地游戏库目录 |
| `/srv/sena-repo/steam_patch` | Steam 补丁目录 |

更新：

```bash
sudo bash /opt/sena-repo/install.sh --update
```

更新会从配置的远程仓库和分支拉取最新服务端代码，不使用当前目录中的旧代码；数据库、游戏目录、补丁目录和环境配置会保留。

只检查是否有更新、不执行安装：

```bash
sudo bash /opt/sena-repo/install.sh --check
```

安装脚本会记录上次使用的仓库地址和分支；未显式设置 `SENA_REPO_URL` / `SENA_REPO_REF` 时，后续检查会继续使用该记录。

卸载程序文件：

```bash
sudo bash /opt/sena-repo/uninstall.sh
```

默认卸载会保留 `/var/lib/sena-repo` 和 `/etc/sena-repo/sena-repo.env`，避免误删数据库和配置。需要连数据库与配置一起清除时：

```bash
sudo bash /opt/sena-repo/uninstall.sh --purge-data
```

也可以明确保留数据：

```bash
sudo bash /opt/sena-repo/uninstall.sh --keep-data
```

不带选项且在交互终端执行时，脚本会询问是否删除；如果程序目录已经被删除但数据库或配置仍在，也会先询问。非交互执行默认保留数据，并提示使用 `--purge-data`。

---

## 配置参考

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SENA_GAMES_PATH` | 游戏文件目录 | `/games` |
| `SENA_DATA_PATH` | 数据目录（数据库、封面等） | `/data` |
| `SENA_PATCH_DIR` | Steam 补丁目录 | `/steam_patch` |
| `SENA_HOST` | 监听地址 | `0.0.0.0` |
| `SENA_PORT` | 监听端口 | `11451` |
| `SENA_PROXY` | 刮削代理（http/socks5） | 空 |
| `SENA_BANGUMI_TOKEN` | Bangumi API Token | 空 |
| `SENA_VNDB_TOKEN` | VNDB API Token | 空 |
| `SENA_NEXTMOE_API_KEY` | NextMoe 应用密钥（`nmk_live_…`），OAuth 未绑定时作为后备 | 空 |
| `SENA_OAUTH_ENABLED` | 是否开启 NextMoe OAuth 免密登录 | `true` |
| `SENA_OAUTH_CLIENT_ID` | 覆盖默认的官方 OAuth 客户端 ID | 官方内置 |
| `SENA_OAUTH_ISSUER` | OAuth 服务地址 | `https://account.nextmoe.com/api/v1` |
| `SENA_OAUTH_SCOPES` | OAuth scope | `openid profile catalog:read` |

### config.yaml（可选）

`/data/config.yaml` 可覆盖部分配置（环境变量优先级更高）：

```yaml
server:
  host: 0.0.0.0
  port: 11451

games_path: /games
data_path: /data
patch_dir: /steam_patch
steam_dir: ""
proxy: ""

scrapers:
  bangumi_token: ""
  vndb_token: ""
  hikarinagi_client_id: ""
  hikarinagi_client_secret: ""
  nextmoe_api_key: ""

oauth:
  enabled: true
  issuer: "https://account.nextmoe.com/api/v1"
  client_id: ""
  scopes: "openid profile catalog:read"
```

### 数据目录结构

```
/data/
├── sena_repo.db          ← SQLite 数据库
├── covers/               ← 游戏封面图
├── backgrounds/          ← 游戏背景图
├── avatars/              ← 用户头像
├── scan_settings.json    ← 扫描配置持久化
└── scraper_config.json   ← 刮削配置持久化
```

### 刮削源

| 刮削源 | 认证要求 | 说明 |
|--------|---------|------|
| VNDB | 可选 Token | 含游戏时长数据 |
| Bangumi | 可选 Token | 中文元数据丰富 |
| Steam | 免认证 | 封面、背景、简介 |
| Hikarinagi | Client ID / Secret | 中文 Galgame 资料站 |
| NextMoe | OAuth 绑定或应用密钥 | 聚合六源；独立模式，开启后禁用其他刮削源；含游戏时长（仅详情） |

> NextMoe 是独立的刮削模式：在客户端「扫描设置 → 刮削源」中开启 NextMoe 后，其余刮削源会自动关闭并禁用，单条目和批量刮削都只走 NextMoe。关闭 NextMoe 后其余刮削源恢复可选。
>
> 认证优先走 OAuth：用户在客户端用鲲Galgame账号登录或在「我的 → 个人信息」绑定后，单条目刮削使用该账号自己的授权。也可以继续使用 `SENA_NEXTMOE_API_KEY`（在 https://developer.nextmoe.dev 控制台创建应用并勾选 `catalog:read`，免费额度为每分钟 60 次、每天 50000 次）作为后备。OAuth 默认启用官方客户端 ID，可用 `SENA_OAUTH_CLIENT_ID` 覆盖。

> 游戏时长来自 NextMoe 详情接口的 `playtimes` 块（多上游并列，服务端优先取 `nextmoe` 聚合行、否则取票数最多的行）。由于列表接口不返回该字段，只有单条目刮削（详情）会写入平均时长，批量刮削不会写入，也不额外请求详情。

> 别名自动填充：VNDB（`aliases`）、Bangumi（infobox「别名」）、Hikarinagi（`aliases`）和 NextMoe（`titles` 中 `title_kind=alias`，不收缩写，机器翻译保留但排最后）会在刮削时提取别名，去重后以「、」拼接写入游戏别名（最多 5 条、200 字符）。「补全缺失」只填空，「覆盖」会替换已有别名；Steam 无别名数据。

---


## OpenList 文件源

OpenList 的添加方式与下载链路见 [文件源接入](/server/sources)。

---

## Steam 补丁

### 工作原理

```
补丁文件（.7z/.rar/.zip 等）
    │
扫描 → patches.json（记录 AppID、文件路径、类型等）
    │
客户端扫描本地 steamapps → 匹配 AppID → 下载注入
```

### AppID 识别规则（优先级从高到低）

1. 文件名中的纯数字（`123456.zip` → 123456）
2. 父目录名中的纯数字（`123456/patch.zip` → 123456）
3. 从文件名提取游戏名 → Steam Store API 搜索
4. 都失败则 `app_id: null`，可手动在客户端填写

### 补丁类型识别关键词

| 类型 | 默认关键词 |
|------|-----------|
| `translation`（汉化） | `_Steam_Chinese_Patch` |
| `voice`（音声） | `_Steam_Voice_Patch` |
| `story`（剧情） | `_Steam_Story_Patch` |
| `extra`（额外） | `_Steam_Extra_Patch` |
| `misc`（其他） | 无关键词匹配时 |

关键词文件位于数据目录的 `steam_patch_index/patch_type_keywords.json`，可在客户端 Steam 补丁页的「关键词匹配」里编辑，也可以直接改这个文件。文件名（统一转小写）包含任一关键词即归为该类型，按类型顺序取第一个命中的；`misc` 不参与匹配。

这份文件只在不存在时才会写入上面的默认值，之后以文件内容为准——也就是说修改过关键词后，升级服务端不会覆盖你改过的词。它会被 `senacli backup` 一起导出，`senacli restore` 默认一起恢复（加 `--skip-keywords` 可保留服务器上的现有词表）。

### patches.json 字段说明

| 字段 | 说明 |
|------|------|
| `app_id` | Steam AppID |
| `file` | 压缩包相对补丁目录的路径 |
| `patch_dir` | 解压后取哪个子目录的内容（空=自动选） |
| `target_dir` | 复制到游戏目录的哪个子路径（空=根目录） |
| `label` | 界面显示名称 |
| `type` | 补丁类型 |
| `game_name` | Steam 游戏中文名 |

---

## 附录

### 支持的压缩格式

`.zip` `.rar` `.7z` `.tar` `.gz` `.xz` `.apk`

### 平台标识

| 标识 | 平台 |
|------|------|
| `[PC]` | Windows PC |
| `[KRKR]` | Kirikiri |
| `[Ty]` | Tyranor |
| `[ONS]` | ONScripter |
| `直装_` / `.apk` | Android 直装 |

### 默认端口

`11451` — 服务端 HTTP API

### 相关文档

- [客户端使用说明书](/client/)
- [文件源接入](/server/sources)
- [备份与恢复](/server/backup)
- [服务端 CLI](/server/cli)
- [技术文档](/reference/technical)
