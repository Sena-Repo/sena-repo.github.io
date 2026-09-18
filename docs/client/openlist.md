# OpenList 文件源

Sena Repo 可以把 OpenList 作为游戏库或 Steam 补丁库的文件来源，适合资源已经放在网盘、NAS 聚合目录或 OpenList 管理目录中的场景。OpenList 服务器、目录和扫描参数都在客户端「扫描设置」中维护。

## 添加文件源

1. 在客户端「扫描设置」中添加 OpenList 服务器。
2. 填写 OpenList 地址，例如 `http://192.168.1.100:5244`。如果遗漏协议，服务端会尝试补 `http://`。
3. 填写用户名和密码；留空时使用 OpenList 访客模式。
4. 添加游戏库目录或 Steam 补丁目录时选择该 OpenList 服务器。
5. 填写 OpenList 内部路径，例如 `/115/Games/GalGame/Library`。
6. 选择目录结构 / 游戏目录深度并触发扫描。

OpenList 地址必须同时能被 Sena 服务端和客户端设备访问；只在服务端可访问会导致扫描成功但客户端下载失败。

## 服务端准备

使用原生 OpenList 文件源时，服务端不需要挂载游戏目录，只持久化 `/data` 即可：

```bash
docker run -d \
  --name sena-repo \
  -p 11451:11451 \
  -v /path/to/data:/data \
  -e SENA_PATCH_DIR=/data/steam_patch \
  --restart unless-stopped \
  404gcross/sena-repo:latest
```

`SENA_PATCH_DIR` 用来保存 `patches.json` 和 `patch_type_keywords.json`。即使补丁压缩包来自 OpenList，这两个索引文件也需要在 Sena 数据侧持久化。

如果宿主机已经把 OpenList / 网盘目录挂载成本地路径，也可以按普通本地目录挂入容器：

```bash
docker run -d \
  --name sena-repo \
  -p 11451:11451 \
  -v /root/docker/Sena-Repo/data:/data \
  -v /mnt/openlist/115/Games/GalGame/Library:/games \
  -v /mnt/openlist/115/Games/GalGame/Steam_Patch:/steam_patch \
  --restart unless-stopped \
  404gcross/sena-repo:latest
```

## 下载链路

```text
客户端请求 Sena 签名下载链接
  → Sena 获取 OpenList 文件签名
  → Sena 返回 302 到 OpenList /d/文件路径?sign=...
  → OpenList 返回 302 到网盘 / CDN 直链
  → 客户端直接下载文件
```

Sena 服务端默认不代理 OpenList 大文件流量。兼容性排查时可通过 `SENA_ALLOW_OPENLIST_PROXY=true` 开启 OpenList 代理能力，但日常使用不推荐让服务端承担大文件带宽。

## 常见检查

| 问题 | 检查项 |
|------|--------|
| 扫描后游戏库为空 | OpenList 路径是否指向游戏库根目录，目录深度是否选对 |
| 请求 URL 报错 | OpenList 地址是否包含 `http://` 或 `https://` |
| 客户端无法下载 | 客户端是否能访问 OpenList 对外地址 |
| 下载卡在重定向后 | 查看客户端日志中的 `download redirect` / `aria2 target resolved` |
| 文件未识别 | 路径下是否有受支持压缩格式，平台标记是否能被识别 |

更多排障命令见 [疑难排查](/reference/troubleshooting#openlist-游戏扫描不到)。
