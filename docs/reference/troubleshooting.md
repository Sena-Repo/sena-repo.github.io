# 疑难排查

## 服务端

### Docker 容器启动后立即退出

查看容器日志：

```bash
docker ps -a
docker logs sena-repo --tail 50
```

常见原因包括配置字段错误、数据库损坏、端口被占用或挂载目录不可读写。

### 游戏扫描不到文件

依次检查：

1. 根目录是否配置正确。
2. 扫描设置中的目录结构 / 游戏目录深度是否与实际目录匹配。
3. 文件是否为支持的格式：`.zip`、`.rar`、`.7z`、`.tar`、`.gz`、`.xz` 或 `.apk`。
4. 文件名中的平台标记是否正确，例如 `[PC]`、`[KRKR]`、`[Ty]`、`[ONS]`、`直装_`。
5. Docker 容器内用户是否有权限读取 `/games`。

可以先查看服务端状态：

```bash
docker exec -it sena-repo senacli status --roots
```

### Steam 补丁扫描返回 0

默认补丁目录是 `/steam_patch`：

```bash
docker exec sena-repo ls -la /steam_patch/
```

如果使用其他路径，需要设置 `SENA_PATCH_DIR`。同时检查：

- 容器内路径是否真的挂载成功。
- 文件扩展名是否为小写或受支持格式。
- OpenList 补丁源是否选择了正确的分析模式。
- `patches.json` 是否位于持久化目录。

### 补丁扫描提示 401 / 403

`/api/steam/scan-patches` 需要管理员权限：

- `401`：登录 token 无效或已过期，重新登录客户端。
- `403`：当前用户不是管理员，切换管理员账号。

### 自动扫描不生效

1. 确认当前用户是管理员。
2. 检查客户端扫描设置是否已保存。
3. 查看 `/data/scan_settings.json`：

   ```bash
   docker exec sena-repo cat /data/scan_settings.json
   ```

4. 自动扫描按配置间隔执行，刚修改设置后等待一个完整周期。

### OpenList 游戏扫描不到

检查：

1. OpenList 地址带有 `http://` 或 `https://`，例如 `http://192.168.1.100:5244`。
2. OpenList 地址同时能被 Sena 服务端和客户端访问。
3. OpenList 路径指向游戏库根目录。
4. 目录结构和扫描深度设置匹配。
5. OpenList 用户对目标目录有读取权限。

如果服务端日志出现 `Request URL is missing an 'http://' or 'https://' protocol`，编辑 OpenList 服务器并重新保存一次地址。

### Hikarinagi 刮削失败

在客户端「刮削设置」中确认：

- Client ID 正确。
- Client Secret 正确。
- Scope 默认使用 `catalog:full`，并与开发者后台授权范围一致。
- 服务端可以访问 `id.hikarinagi.org` 和 `www.hikarinagi.org`。
- 如果网络需要代理，检查 `SENA_PROXY` 或客户端代理设置。

管理员可以在设置页点击 Hikarinagi 连接测试。常见结果：

- `401` / `403`：凭据或 Scope 不正确。
- 超时：检查网络或代理。
- 连接失败：检查 DNS、防火墙和服务端时间。

### 加密凭据无法读取

OpenList 密码等持久化凭据使用 Fernet 加密。跨容器或迁移数据目录时，必须保留原来的加密密钥：

```bash
echo "$SENA_ENCRYPTION_KEY"
```

如果使用数据目录中的自动生成密钥，也必须一起迁移。更换密钥后旧凭据无法解密，需要在客户端重新填写。

### SQLite database is locked

SQLite 只支持单写者。避免同时执行清库、扫描、批量刮削和大量编辑。若任务已经卡住，先查看：

```bash
docker exec -it sena-repo senacli status
docker logs sena-repo --tail 100
```

### Docker 镜像拉取失败

正式版：

```bash
docker pull 404gcross/sena-repo:latest
```

测试版：

```bash
docker pull 404gcross/sena-repo:pre-release
```

GHCR 备用地址：

```bash
docker pull ghcr.io/404-gcross/sena-repo:latest
```

如果出现 `404`，检查镜像 tag 是否存在，以及当前网络是否能访问对应仓库。

### 裸机安装或更新失败

查看服务状态：

```bash
systemctl status sena-repo
journalctl -u sena-repo -n 100 --no-pager
```

安装脚本需要 Python 3.10 或更高版本、虚拟环境能力和 7z / 7zz / 7za。可以显式指定 Python：

```bash
sudo SENA_PYTHON_BIN=/usr/bin/python3.11 bash install.sh
```

更新裸机服务使用：

```bash
sudo bash /opt/sena-repo/install.sh --update
```

Docker 部署不要在容器内执行更新，应在宿主机重新拉取镜像并重建容器。

## 客户端

### 连接超时或无法连接服务器

1. 服务端是否正在运行。
2. 客户端设备是否能访问服务端 IP 和 `11451` 端口。
3. 防火墙是否放行端口。
4. 客户端中的 HTTP / HTTPS 协议是否正确。
5. 反向代理是否正确转发 `/api` 路由。

服务端健康检查：

```bash
curl http://服务器地址:11451/api/health
```

### 连接失败：`RangeError(end)`

通常表示客户端和服务端 API 版本不兼容。更新服务端到与客户端对应的版本，并重新启动容器。

### 下载报 401

保存的登录 token 已过期或服务端已经重置会话。回到服务器选择界面，重新登录对应服务器配置。

### OpenList 下载卡在连接中

客户端日志会记录完整跳转链：

```text
download request[0]: Sena /api/download/...
download redirect[0]: Sena -> OpenList /d/...
download request[1]: OpenList /d/...
download redirect[1]: OpenList -> 网盘/CDN
download final[2]: HTTP 200/206 ...
download first chunk: ...
```

判断方法：

- 停在 `request[0]`：客户端到 Sena 不通。
- 停在 `request[1]`：客户端访问不了 OpenList；OpenList 地址必须对客户端可达。
- 停在后续请求：网盘 / CDN 不通或被限制。
- 有 `final` 但没有 `first chunk`：上游返回响应头后没有及时发送数据。

客户端日志页支持搜索、复制和导出日志，日志通常保留最近 7 天。

### aria2 下载失败

客户端会在 aria2 失败后尝试降低分片数，仍失败时回退到 Dart HTTP 下载。查看日志中的：

- `aria2 target resolved`
- `aria2 download started`
- `aria2 download retrying with lower split`
- `aria2 download failed`

如果 CDN 不支持多连接，通常降低分片或使用回退下载即可。OpenList 任务回退前会清理不完整的 aria2 临时文件。

### OpenList 下载比网页慢

1. 检查下载限速是否为 `0`。
2. 确认客户端设备到 CDN 的网络与浏览器测试设备一致。
3. 检查磁盘写入速度，尤其是 SD 卡、移动硬盘和 Android 共享存储。
4. 对照日志确认是否已经出现 `download first chunk`。

### Windows 解压报 `Cannot open the file as archive`

下载临时文件可能不完整或损坏。先删除当前任务并重新下载；也可以用内置 `7z.exe` 测试压缩包。

如果内置解压组件损坏，删除应用支持目录中的 `7z.exe` 和 `7z.dll`，重新启动客户端让它重新提取。

### 下载解压后目录不正确

客户端会处理压缩包只有一个顶层目录且目录名与游戏名不一致的情况。如果压缩包包含多个顶层目录，无法安全自动合并，需要手动整理压缩包结构。

### 推送到 LunaBox / ReinaManager 失败

检查：

- 目标管理器已经安装并注册 `lunabox://` 或 `reinamanager://` 协议。
- 当前客户端运行在 Windows、Linux 或 macOS 桌面环境。
- 压缩包格式受目标管理器支持。
- 版本没有设置解压密码；带密码版本暂时只能使用 Sena Repo 内置下载。
- 文件大小和版本信息有效。

服务端会拒绝带解压密码或不支持格式的管理器安装链接。

### Android 权限弹窗无法跳转

通过 `permission_handler` 跳转系统设置。如果跳转失败，手动在系统设置中搜索「所有文件访问」并为 Sena Repo 开启权限。

### Linux AppImage 启动报错

Debian / Ubuntu 常见依赖：

```bash
sudo apt-get install -y \
  libfuse2 libgtk-3-0 libayatana-appindicator3-1 \
  libegl1 libegl-mesa0 libgl1 libopengl0 \
  fonts-noto-cjk fonts-wqy-microhei
```

Fedora 常见依赖：

```bash
sudo dnf install -y fuse-libs gtk3 mesa-libEGL mesa-libGL
```

### Linux 触摸屏无响应

从终端启动 AppImage：

```bash
./Sena-Repo_Linux_v*.AppImage 2>&1 | tee sena-touch.log
```

重点查看：

```text
Sena Linux input backend preference: wayland,x11
Sena Linux GTK display: wayland-0
Sena Linux touch event: begin ...
```

有 `Sena Linux touch event` 表示 GTK 已收到触摸；完全没有日志时，检查是否从终端启动，以及 Gamescope / 游戏模式是否吞掉了 stderr。

## 相关文档

- [服务端部署](/server/)
- [服务端 CLI](/server/cli)
- [客户端使用](/client/)
- [下载与解压](/features/downloads)
- [OpenList 文件源](/features/openlist)
