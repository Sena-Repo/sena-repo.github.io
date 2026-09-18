# Sena Repo 技术文档

## 架构概览

```text
客户端（Flutter）                         服务端（FastAPI）
────────────────────                      ───────────────────
Windows / Android / Linux                 Docker / 裸机安装脚本
  ├─ Provider 状态管理                       ├─ API Router
  ├─ Service 业务层                           ├─ Scanner / Importer
  ├─ Screen 页面层                            ├─ Scraper Orchestrator
  ├─ aria2 + 7zip-zstd 下载解压               ├─ FileSource Adapter
  └─ HTTP/HTTPS ──────────────────────────►  └─ SQLite + /data 文件数据
```

客户端通过 HTTP/HTTPS 连接服务端。服务端默认端口为 `11451`，浏览器 CORS 默认关闭，需要通过 `SENA_ALLOWED_ORIGINS` 显式配置。

## 技术栈

### 服务端

| 组件 | 技术 | 说明 |
|------|------|------|
| Web 框架 | FastAPI + Uvicorn | 异步 Python API |
| ORM | SQLAlchemy 2.0 async | 异步数据库访问 |
| 数据库 | SQLite + aiosqlite | 默认保存在 `/data/sena_repo.db` |
| 密码 | bcrypt | 兼容旧 SHA-256 哈希 |
| 会话 | `user_sessions` + token hash | Token 明文只返回给客户端，服务端存 SHA256 |
| HTTP 客户端 | httpx | 刮削、OpenList、外部资源下载 |
| 文件源 | Local / OpenList Adapter | 统一扫描本地目录与 OpenList |
| 容器 | Docker python:3.11-slim | 内置 `senacli` 与 7z 依赖 |

### 客户端

| 组件 | 技术 | 说明 |
|------|------|------|
| 框架 | Flutter 3.29 | Windows / Android / Linux |
| 状态管理 | Provider | 游戏库、设置、主题 |
| 网络 | package:http | API 请求和 Dart 下载回退 |
| 下载 | 内置 aria2 | 优先分片下载，失败时降并发或回退 |
| 解压 | 7zip-zstd | Windows / Linux / Android 内置二进制 |
| 存储 | shared_preferences + flutter_secure_storage | 本地设置与 token |
| 桌面 | window_manager + tray_manager | 单实例、窗口、托盘 |
| 权限 | permission_handler | Android 所有文件访问权限 |

## 服务端 API

```text
/api/auth/*         登录、注册、用户管理、通知、头像上传
/api/games/*        游戏 CRUD、搜索、版本移动
/api/tags/*         标签 CRUD
/api/roots/*        游戏库根目录管理、扫描触发
/api/file-sources/* OpenList 服务器管理
/api/download/*     签名下载链接、本地文件流、OpenList 跳转、管理器安装链接
/api/files/*        封面、背景、头像静态文件服务
/api/scrape/*       刮削搜索、应用结果、批量任务
/api/settings/*     扫描设置、刮削配置、加密状态、回收站
/api/setup/*        首次初始化向导
/api/steam/*        Steam 补丁根目录、索引、匹配、下载
/api/health         健康检查
```

除登录、注册、初始化和健康检查外，API 需要 Bearer Token。Token 按 `SENA_TOKEN_EXPIRE_DAYS` 设置过期时间，服务端只存 token hash，并在接近半程时刷新会话过期时间。

## 数据模型

```text
User ──► UserSession
  │         ├─ token_hash
  │         ├─ expires_at / revoked_at
  │         └─ device_name / last_seen_at
  ├─ role: owner / admin / user
  ├─ status: active / pending / rejected
  └─ avatar_path

Game ──► GameVersion
  │         ├─ platform / filename / file_path
  │         ├─ source_type / source_id / source_path
  │         ├─ extract_password
  │         └─ checksum_algo / checksum
  ├─ Company
  ├─ GameTag ──► Tag
  ├─ RootDirectory
  ├─ cover_path / bg_path / is_nsfw
  └─ vndb_id / steam_id / bangumi_id / hikarinagi_id

FileSource
  ├─ type: local / openlist
  ├─ base_url
  ├─ username
  └─ encrypted password

SteamPatchRoot
  ├─ source_type / source_id / source_name
  ├─ path
  └─ analysis_mode: auto / manual
```

## 扫描与导入

`services/scanner.py` 支持按游戏目录深度扫描：

| 深度 | 结构 | 示例 |
|------|------|------|
| `0` | 扁平 | `root/archive.zip` |
| `1` | 仅游戏 | `root/game/archive.zip` |
| `2` | 会社 / 游戏 | `root/company/game/archive.zip` |
| `3+` | 更深层级 | `root/.../company/game/archive.zip` |

扫描流程：

1. `POST /api/roots/refresh-all` 或 `senacli scan` 触发扫描。
2. `RootDirectory.source_type` 决定使用本地目录或 OpenList Adapter。
3. Scanner 按深度收集游戏目录和压缩包。
4. 文件名规则提取平台标识和游戏名。
5. Importer 新增、更新或标记孤立游戏和版本。
6. 可选触发批量刮削。

支持压缩格式：`.zip`、`.rar`、`.7z`、`.tar`、`.gz`、`.xz`、`.apk`。平台标识包括 `[PC]`、`[KRKR]`、`[KR]`、`[Ty]`、`[Ar]`、`[ONS]`、`直装_`，`.apk` 会自动归类为 Android 直装。

## 文件源与下载

### 本地文件源

```text
客户端 POST /api/download/{gameId}/{versionId}/link
  → 服务端生成短期签名 URL
  → 客户端 GET /api/download/signed/{gameId}/{versionId}
  → 服务端 FileResponse 返回文件流
```

签名下载链接会根据文件大小设置 TTL：10GB 以下约 2 小时，10GB 以上约 4 小时，20GB 以上约 6 小时。

### OpenList 文件源

```text
客户端请求签名下载 URL
  → Sena 用 OpenList /api/fs/get 获取签名入口
  → Sena 返回 302 到 OpenList /d/...
  → OpenList 返回 302 到网盘 / CDN
  → 客户端直连最终地址下载
```

OpenList 下载默认不代理大文件流量。只有设置 `SENA_ALLOW_OPENLIST_PROXY=true` 时，服务端才允许兼容性排查用代理下载。

### 外部管理器

`POST /api/download/{gameId}/{versionId}/manager-install-link` 可生成：

- `lunabox://install?...`
- `reinamanager://install?...`

服务端会校验压缩格式、文件大小、解压密码限制，并尽量附带 SHA256 checksum。管理器链接使用 `SENA_MANAGER_SIGNING_KEY` 或数据目录内生成的密钥签名。

## 刮削架构

当前可用刮削器：

| Source | 文件 | 状态 |
|--------|------|------|
| `hikarinagi` | `services/scraper/hikarinagi.py` | 已支持，需要 Client ID / Secret |
| `vndb_kana` | `services/scraper/vndb_kana.py` | 已支持，可选 Token |
| `bangumi` | `services/scraper/bangumi.py` | 已支持，可选 Token |
| `steam` | `services/scraper/steam.py` | 已支持，免认证 |
| `nextmoe` | 待实现 | 支持开发中，文档保留入口 |

默认顺序为 `hikarinagi`、`vndb_kana`、`bangumi`、`steam`。`scraper_order` 和 `enabled_scrapers` 可通过环境变量、配置文件、初始化向导或设置页持久化配置。

批量刮削由 `services/scraper/orchestrator.py` 分发，支持 `none`、`missing`、`overwrite`、`metadata`、`images` 等模式。平均游玩时长目前优先来源于 VNDB。

## 客户端下载管线

```text
GameDetailScreen 选择版本
  → ApiClient 创建下载链接
  → DownloadService 创建任务
  → aria2 尝试下载
      ├─ 多分片下载
      ├─ 降低分片重试
      └─ 不适用时回退 Dart HTTP
  → 7zip-zstd 解压
  → 修正单顶层目录
  → 完成弹窗 / Steam 导入 / 管理器推送
```

下载进度 UI 节流刷新；任务状态定期持久化；Android 通知按固定间隔更新。OpenList 下载不会把 Sena Token 传给 OpenList 或 CDN。

## Steam 补丁

```text
SteamPatchRoot
  → 扫描本地目录或 OpenList 补丁目录
  → scan_patches.py 分析补丁文件
  → patches.json 保存 AppID、路径、类型、patch_dir、target_dir
  → 客户端扫描本机 steamapps
  → 服务端按 AppID 匹配
  → 客户端下载并解压注入
```

补丁类型关键词保存在 `patch_type_keywords.json`。规则可在客户端编辑，也可通过 `senacli backup` / `senacli restore` 备份和恢复。

## 部署与维护

- DockerHub / GHCR 镜像支持 amd64 和 arm64。
- Docker 镜像内置 `senacli`。
- 裸机安装脚本会安装依赖、创建 venv、注册 systemd 服务和 `senacli`。
- `senacli status` 可查看服务、数据库、目录、扫描和刮削状态。
- `senacli update` 仅用于裸机部署；Docker 部署应在宿主机重建容器。

## 安全要点

- 密码使用 bcrypt，新版会话 token 只存 SHA256 hash。
- OpenList 等持久化凭据会使用 Fernet 加密，建议跨实例部署时固定 `SENA_ENCRYPTION_KEY`。
- 管理器下载链接为短期签名 URL，建议固定 `SENA_MANAGER_SIGNING_KEY` 以便迁移。
- 外部图片 URL 下载会做协议与目标校验。
- 文件服务限制图片扩展名。
- 不建议直接暴露公网；优先放在 VPN、家庭内网或受控反代之后。
