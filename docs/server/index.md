# Sena Repo 服务端部署说明书

## 目录

- [部署前准备](#部署前准备)
- [服务端部署](#服务端部署)
- [配置参考](#配置参考)
- [导入及清洗逻辑](#导入及清洗逻辑)
- [OpenList 文件源](#openlist-文件源)
- [Steam 补丁](#steam-补丁)
- [附录](#附录)

---

> [!CAUTION]
>
> Sena Repo 由 AI 辅助开发，安全性未经过专业审计。**强烈建议仅在 VPN 或家庭内网环境中使用，不建议直接暴露到公网。**

---




## 部署前准备

Sena Repo 按固定层级扫描游戏文件，部署前请先确认文件来源和目录结构。

### 目录结构

```
游戏目录/
  ├── 会社A/
  │   ├── 游戏1/
  │   │   ├── [PC]游戏1.rar       ← 带平台标记的压缩包
  │   │   └── [KRKR]游戏1_v2.zip
  │   └── 游戏2/
  │       └── [Ty]游戏2.7z
  └── 会社B/
      └── 游戏3/
          └── 直装_游戏3.apk
```

- **第一级** → 会社（文件夹名即会社名）
- **第二级** → 游戏（文件夹名即游戏名）
- **第三级** → 压缩包（`.rar` `.zip` `.7z` `.tar` `.gz` `.xz` `.apk`）
- 平台标记：`[PC]` `[KRKR]` `[KR]` `[Ty]` `[Ar]` `[ONS]` `直装_`，无标记默认 PC
- 压缩包直接放在会社目录下也可以（自动视为独立游戏）

> 文件不按规则整理则扫不出来。也可以在客户端「扫描设置」中调整目录结构为「仅游戏」「扁平」或自定义游戏目录深度。

如果游戏库和 Steam 补丁库都使用 OpenList 作为文件来源，服务端本地无需挂载实际的 `/games` 和补丁文件目录；但 Steam 补丁索引仍会生成 `patches.json`，需要将 `SENA_PATCH_DIR` 指向持久化目录（例如 `/data/steam_patch`），或单独挂载 `/steam_patch`。

## 服务端部署

### 方式一：Docker 拉取（推荐）

Release 发布时镜像会推送到 DockerHub 和 GHCR，同时支持 amd64 和 arm64。

```bash
# DockerHub（推荐）
docker pull 404gcross/sena-repo:latest

# GHCR（备用）
docker pull ghcr.io/404-gcross/sena-repo:latest

# Pre-release 测试版
docker pull 404gcross/sena-repo:pre-release
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

**完整启动（含刮削凭据与代理）：**

```bash
docker run -d \
  --name sena-repo \
  -p 11451:11451 \
  -v /path/to/games:/games \
  -v /path/to/data:/data \
  -v /path/to/steam_patches:/steam_patch \
  -e SENA_BANGUMI_TOKEN="your_token" \
  -e SENA_VNDB_TOKEN="your_token" \
  -e SENA_HIKARINAGI_CLIENT_ID="your_client_id" \
  -e SENA_HIKARINAGI_CLIENT_SECRET="your_client_secret" \
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
      - SENA_BANGUMI_TOKEN=your_token
      - SENA_VNDB_TOKEN=your_token
      - SENA_HIKARINAGI_CLIENT_ID=your_client_id
      - SENA_HIKARINAGI_CLIENT_SECRET=your_client_secret
      - SENA_PROXY=http://127.0.0.1:7890
    restart: unless-stopped
```

Docker 镜像内置 `senacli`：

```bash
docker exec -it sena-repo senacli status --roots
docker exec -it sena-repo senacli scan --scrape missing
docker exec -it sena-repo senacli useradd
```

Docker 部署的升级和卸载仍应在宿主机通过重新拉取镜像、停止旧容器、重建容器完成；容器内的 `senacli update` / `senacli uninstall` 只会给出操作提示。

### 方式二：Tarball 加载

从 [Releases](https://github.com/404-GCross/Sena-Repo/releases) 下载 `Sena-Repo_Server_v*.tar.gz` 后手动加载。

```bash
docker load < Sena-Repo_Server_v0.1.0.tar.gz  # 改成对应版本号

docker run -d \
  --name sena-repo \
  -p 11451:11451 \
  -v /path/to/games:/games \
  -v /path/to/data:/data \
  -v /path/to/steam_patches:/steam_patch \
  sena-repo:latest
```

从 [Releases](https://github.com/404-GCross/Sena-Repo/releases) 下载时注意选择对应架构的包：

| 架构 | 文件名 |
|------|--------|
| x86_64 / amd64 | `Sena-Repo_Server_amd64_v*.tar.gz` |
| ARM64（树莓派 / NAS） | `Sena-Repo_Server_arm64_v*.tar.gz` |


### 方式三：安装脚本直接部署

> [!TIP]
>
> 适合没有 Docker 的 Linux 设备，例如部分 arm32 NAS、盒子或 Armbian 设备。amd64 / arm64 仍建议优先使用 Docker。

稳定版：

```bash
curl -fsSL https://raw.githubusercontent.com/404-GCross/Sena-Repo/main/server/install.sh | sudo bash
```

开发版：

```bash
curl -fsSL https://raw.githubusercontent.com/404-GCross/Sena-Repo/dev/server/install.sh | sudo SENA_REPO_REF=dev bash
```

已 `git clone` 的源码安装：

```bash
git clone https://github.com/404-GCross/Sena-Repo.git
cd Sena-Repo/server
sudo bash install.sh
```

脚本会自动安装依赖、创建 venv、写入 systemd 服务并启动服务。安装完成后会注册本地维护命令：

```bash
senacli status --roots
senacli scan
senacli scan --scrape missing
senacli clear
senacli backup
senacli restore sena-steam-patch-rules-20260909-153000.json
senacli update --channel dev
senacli update --channel release
senacli uninstall
```

## 服务端更新

```bash
# ── Docker ──
docker pull 404gcross/sena-repo:latest
docker stop sena-repo && docker rm sena-repo
# 执行完以上命令后，重新执行服务端部署（挂载目录不变，数据不丢失）

# ── docker-compose ──
docker pull 404gcross/sena-repo:latest
docker-compose down && docker-compose up -d

# ── Tarball ──
docker load < Sena-Repo_Server_v新版本.tar.gz
docker stop sena-repo && docker rm sena-repo
# 执行完以上命令后，重新执行服务端部署（挂载目录不变，数据不丢失）

# ── 裸机安装脚本 ──
sudo bash /opt/sena-repo/install.sh --update
```

---

## 配置参考

### 挂载 / 环境变量

| 目录 / 变量 | 作用 | 默认值 |
|-------------|------|--------|
| `/games` / `SENA_GAMES_PATH` | 游戏文件目录 | `/games` |
| `/data` / `SENA_DATA_PATH` | 数据库、封面、背景、配置数据 | `/data` |
| `/steam_patch` / `SENA_PATCH_DIR` | Steam 补丁目录与补丁索引目录 | `/steam_patch` |
| `SENA_HOST` | 监听地址 | `0.0.0.0` |
| `SENA_PORT` | 监听端口 | `11451` |
| `SENA_ALLOWED_ORIGINS` | 浏览器 CORS 来源，原生客户端通常不需要 | 空 |
| `SENA_TOKEN_EXPIRE_DAYS` | 登录 token 有效天数 | `30` |
| `SENA_PROXY` | 刮削 HTTP / SOCKS5 代理 | 空 |
| `SENA_BANGUMI_TOKEN` | Bangumi API Token | 空 |
| `SENA_VNDB_TOKEN` | VNDB Token | 空 |
| `SENA_HIKARINAGI_CLIENT_ID` | Hikarinagi Client ID | 空 |
| `SENA_HIKARINAGI_CLIENT_SECRET` | Hikarinagi Client Secret | 空 |
| `SENA_HIKARINAGI_SCOPE` | Hikarinagi Scope | `catalog:full` |
| `SENA_ENCRYPTION_KEY` | 加密 OpenList 密码等敏感配置的共享密钥 | 自动生成 / 环境优先 |
| `SENA_MANAGER_SIGNING_KEY` | 管理器安装链接签名密钥 | 自动生成 / 环境优先 |
| `SENA_ALLOW_OPENLIST_PROXY` | 兼容性排查用 OpenList 代理开关 | `false` |

### 刮削 API Key 获取地址

| 刮削源 | 获取地址 |
|--------|---------|
| Bangumi | [bgm.tv/dev/app](https://bgm.tv/dev/app) |
| VNDB | [vndb.org/u/tokens](https://vndb.org/u/tokens) |
| Hikarinagi | [hikarinagi.org/developers](https://www.hikarinagi.org/developers) |
| NextMoe | 支持开发中，暂不需要配置 |

---

## 导入及清洗逻辑

### 文件结构

> [!IMPORTANT]
> 
> - 默认推荐会社/游戏结构。
> - 如果现有资源目录不同，可在客户端扫描设置中调整目录结构或游戏目录深度。

会社/游戏模式里，服务端按三级目录扫描，每一级都有特定含义：

```
根目录/                         ← --games-path
  ├── 会社A/                    ← 第一级：会社
  │   ├── 游戏1/                ← 第二级：游戏
  │   │   ├── [PC]游戏1.rar     ← 第三级：版本文件
  │   │   └── [Ty]游戏1.zip
  │   └── 游戏2/
  │       ├── [PC]游戏2.zip
  │       └── [KRKR]游戏2.zip
  └── 会社B/
      └── 游戏3/
          └── 直装_游戏3.apk
```

**第一级 · 会社** — 文件夹名自动填入游戏的**开发商**字段（不覆盖手动修改的值），同时作为标签附加。

**第二级 · 游戏** — 每个子文件夹视为一个独立游戏项目，文件夹名即为游戏名。

**第三级 · 版本文件** — 同一游戏下的每个压缩包各生成一个可下载版本，非压缩包文件自动过滤。文件名按规则解析：

| 格式 | 示例 | 解析结果 |
|------|------|---------|
| `[平台]游戏名.rar` | `[PC]游戏1.rar` | 平台=PC，游戏名=游戏1 |
| `[平台]游戏名.zip` | `[KRKR]游戏2.zip` | 平台=KRKR，游戏名=游戏2 |
| `直装_游戏名.apk` | `直装_游戏5.apk` | 平台=安卓直装，游戏名=游戏5 |

支持的平台标识：`PC`、`KRKR`、`KR`、`Ty`、`Ar`、`ONS`、`直装`，`.apk` 后缀或含"安卓""直装"字样自动归类为安卓直装。

### 刮削源

| 刮削源 | 说明 |
|--------|------|
| Hikarinagi | 需要开发者凭据，中文 Galgame 资料源 |
| VNDB Kana v2 | 可选 Token，含游戏时长数据 |
| Bangumi | 可选 Token |
| Steam | 免认证 |
| NextMoe | 支持开发中 |

---

## OpenList 文件源

Sena-Repo 可以把 OpenList 作为游戏库或 Steam 补丁库的文件来源。添加时分两步：

1. 在「扫描设置」中添加 OpenList 服务器，填写客户端也能访问的 OpenList 地址、用户名和密码
2. 添加游戏库目录或 Steam 补丁库目录时选择该 OpenList 服务器，并填写 OpenList 内部路径，例如 `/115/Games/GalGame/Library`

OpenList 下载链路：

```text
客户端请求 Sena /api/download/{game}/{version}
  → Sena 返回 302 到 OpenList /d/文件路径?sign=...
  → OpenList 返回 302 到网盘/CDN直链
  → 客户端直接从网盘/CDN下载
```

注意事项：

- OpenList 地址必须从客户端设备可访问；只从 Sena 服务端可访问是不够的
- Sena 服务端默认只负责生成跳转，不代理大文件下载流量
- OpenList 登录支持 `/api/auth/login/hash`，失败时回退 `/api/auth/login`
- 如果 OpenList 服务器地址未写协议，Sena 会自动补 `http://`
- 扫描时仍按所选目录结构解析，例如会社/游戏/版本文件

---

## Steam 补丁

### 工作原理

```
补丁目录（.zip/.rar/.7z 等）
    │
scan_patches.py ──→ patches.json
    │                   ↓             客户端: 扫 steamapps → 匹配 → 注入
    │              ┌─ 服务端Tab: 查看/编辑/扫描索引
    └─ Steam API ─┘  (根据文件名搜索 AppID)
```

补丁文件放在服务端，客户端扫描本地 Steam 库后自动匹配并注入。

### 补丁目录结构

```
steam_patches/
├── patches.json               ← 自动生成
├── patch_type_keywords.json   ← 类型识别关键词
├── 游戏1_Steam_extra_Patch.7z
└── 游戏2_Steam_Chinese_Patch.rar
```

直接把补丁压缩包放在补丁目录下即可，`scan_patches.py` 会递归扫描所有子目录。

### AppID 自动识别

1. 文件名中的纯数字（如 `123456.zip` → 123456）
2. 父目录名中的纯数字（如 `123456/v2.zip` → 123456）
3. 从文件名提取游戏名 → 调 Steam Store API 搜索 → 获取 AppID
4. 都失败则 `app_id: null`，可手动填写

> 游戏名提取规则：去掉文件扩展名 → 去掉类型关键词后缀 → 下划线替换空格。

### 补丁类型自动分类

根据文件名中的关键词（大小写不敏感）：

| 类型 | 默认关键词 |
|------|-----------|
| `translation`（汉化） | `_Steam_Chinese_Patch` |
| `voice`（音声） | `_Steam_Voice_Patch` |
| `story`（剧情） | `_Steam_Story_Patch` |
| `extra`（额外） | `_Steam_Extra_Patch` |
| `misc`（其他） | 默认（无关键词匹配时） |

关键词可通过客户端 Steam 补丁页右上角 🔍 编辑，或直接修改 `patch_type_keywords.json`。

### patches.json 格式

```json
{
  "patches": [
    {
      "app_id": 123456,
      "file": "想要传达给你的爱恋_Steam_extra_Patch.7z",
      "patch_dir": "",
      "target_dir": "",
      "label": "",
      "type": "extra",
      "game_name": "游戏中文名"
    }
  ]
}
```

| 字段 | 说明 |
|------|------|
| `app_id` | Steam AppID，可自动识别或手动填写 |
| `file` | 压缩包相对补丁目录的路径 |
| `patch_dir` | 解压后取哪个子目录的内容（空=自动选） |
| `target_dir` | 复制到游戏目录的哪个子路径（空=根目录） |
| `label` | 界面显示名称 |
| `type` | 补丁类型：`translation` / `voice` / `story` / `extra` / `misc` |
| `game_name` | Steam 游戏中文名，扫描时自动获取 |

### patch_dir / target_dir 规则

**简单路径**（两者都为空）：压缩包直接解压到游戏根目录。适用于压缩包内部已按游戏目录结构组织的场景。

**复杂路径**（任一非空）：
1. 解压到临时目录
2. 定位源目录（`patch_dir`）：从 `临时目录/patch_dir/` 取文件；若为空且临时目录只有一个文件夹则自动选择
3. 合并到目标目录（`target_dir`）：文件复制到 `游戏目录/target_dir/`

举例：压缩包内结构为 `汉化v2/data/patch.xp3`，配置 `patch_dir="汉化v2"` `target_dir=""` → 文件提取到游戏根目录。

---

## 附录

### 支持的压缩格式

`.zip` `.rar` `.7z` `.tar` `.gz` `.xz` `.apk`

### 支持的平台标识

| 标识 | 平台 |
|------|------|
| `[PC]` | Windows |
| `[KRKR]` | Kirikiri |
| `[KR]` | Kirikiri |
| `[Ty]` | Tyranor |
| `[Ar]` | Tyranor |
| `[ONS]` | ONScripter |
| `直装_` / `.apk` | 安卓直装 |

### 默认端口

| 端口 | 用途 |
|------|------|
| 11451 | 服务端 HTTP/HTTPS API |

### 相关文档

- [客户端使用说明书](/client/)
- [技术文档](/reference/technical)
- [疑难杂症](/reference/troubleshooting)
