# 快速开始

Sena Repo 的使用路径是：服务端负责部署和文件来源，客户端负责初始化、扫描设置、刮削设置和日常使用。本页按最短路径走一遍。

## 1. 确认文件来源

Sena Repo 支持两类游戏库来源：

| 来源 | 适合情况 | 服务端需要 |
|------|----------|------------|
| 本地目录挂载 | NAS、硬盘、宿主机目录已经能挂到容器或裸机服务端 | 将游戏库映射到 `/games`，补丁库映射到 `/steam_patch` |
| OpenList | 游戏和补丁已经在 OpenList 管理的目录里 | 服务端只需持久化 `/data`，目录在客户端扫描设置里添加 |

默认推荐目录结构：

```text
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

如果资源不是三级结构，可在客户端「扫描设置」里调整目录结构 / 游戏目录深度。平台标记支持 `[PC]`、`[KRKR]`、`[KR]`、`[Ty]`、`[Ar]`、`[ONS]`、`直装_`，`.apk` 会自动归类为 Android 直装。

## 2. 部署服务端

### DockerHub 镜像（推荐）

```bash
docker pull 404gcross/sena-repo:latest

docker run -d \
  --name sena-repo \
  -p 11451:11451 \
  -v /path/to/games:/games \
  -v /path/to/data:/data \
  -v /path/to/steam_patches:/steam_patch \
  --restart unless-stopped \
  404gcross/sena-repo:latest
```

预发布版本镜像为 `404gcross/sena-repo:pre-release`（发布 beta / rc 时更新），开发版为 `404gcross/sena-repo:dev`；GHCR 备用地址和完整参数见 [服务端部署](/server/)。

如果游戏和 Steam 补丁都在 OpenList，可只持久化数据目录：

```bash
docker run -d \
  --name sena-repo \
  -p 11451:11451 \
  -v /path/to/data:/data \
  -e SENA_PATCH_DIR=/data/steam_patch \
  --restart unless-stopped \
  404gcross/sena-repo:latest
```

### 裸机一键安装

适合没有 Docker 的 Linux 设备，例如部分 NAS、盒子或 Armbian 设备。

```bash
curl -fsSL https://raw.githubusercontent.com/404-GCross/Sena-Repo/main/server/install.sh | sudo bash
```

裸机安装跟随 `main`（最新提交）；需要固定版本时用 `SENA_REPO_REF` 指定分支或 tag（更多说明见 [服务端部署](/server/)）。

国内网络访问 GitHub 受限时，给 GitHub 地址前加上 `https://gh-proxy.com/`，并让脚本内部拉源码也走镜像（更多命令见 [服务端部署](/server/)）：

```bash
curl -fsSL https://gh-proxy.com/https://raw.githubusercontent.com/404-GCross/Sena-Repo/main/server/install.sh \
  | sudo SENA_REPO_URL=https://gh-proxy.com/https://github.com/404-GCross/Sena-Repo.git bash
```

安装完成后会注册 `senacli`：

```bash
senacli status --roots
senacli scan --scrape missing
senacli useradd
```

## 3. 安装客户端

前往 [GitHub Releases](https://github.com/404-GCross/Sena-Repo/releases) 下载：

- Windows：安装版 `.exe` 或便携版 `.zip`
- Android：`.apk`
- Linux：`.AppImage`

Android 首次下载和解压前需要授予「所有文件访问」权限。Windows / Linux 会显示 Steam 集成和 Steam 补丁相关能力。

## 4. 完成客户端初始化

首次启动客户端后：

1. 同意免责声明。
2. 配置本机下载目录、Steam `steamapps` 目录和 Steam 用户 ID。
3. 添加服务器配置，填写地址、端口、协议、用户名和密码。
4. 如果服务端尚未初始化，会进入初始化向导：新建服务端时创建管理员；已有 `senacli backup` 导出的备份时可以选择「导入备份」直接恢复。
5. 添加游戏库目录和 Steam 补丁目录，可选择本地路径或 OpenList 文件源。
6. 配置批量刮削的字段来源、刮削源顺序和凭据。

初始化完成后，服务端会触发首次扫描和刮削；之后可在客户端「设置」中继续调整目录、自动扫描、批量刮削、下载并发和限速。

## 下一步

- 完整部署参数见 [服务端部署](/server/)。
- 客户端页面说明见 [客户端使用](/client/)。
- OpenList 接入见 [OpenList 文件源](/client/#openlist-文件源)。
- 管理器协议推送见 [推送到管理器](/features/manager-push)。
