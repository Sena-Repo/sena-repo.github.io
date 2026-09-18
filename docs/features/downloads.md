# 下载与解压

客户端负责下载、断点续传、限速、解压、完成后操作和日志记录。服务端负责生成下载链接，并根据文件来源返回本地文件流或 OpenList 跳转。

## 下载链路

### 本地文件源

```text
客户端请求下载链接
  → Sena 返回短期签名下载 URL
  → 客户端下载 Sena 服务端文件流
  → 7zip-zstd 解压到本机下载目录
```

### OpenList 文件源

```text
客户端请求下载链接
  → Sena 获取 OpenList 签名并返回 302
  → OpenList 返回网盘 / CDN 直链
  → 客户端直接下载最终文件
```

OpenList 下载默认不占用 Sena 服务端大文件带宽。只有在兼容性排查时才建议考虑服务端代理模式。

## aria2 与回退

当前客户端优先使用内置 aria2 下载器：

- Windows：`assets/binaries/aria2/windows-x64/aria2c.exe`
- Linux：`assets/binaries/aria2/linux-x64/aria2c`
- Android arm64：`assets/binaries/aria2/android-aarch64/aria2c`

aria2 会尝试并发分片下载；遇到 OpenList/CDN 对多连接不友好的情况，会自动降低分片数。aria2 不可用或下载失败时，客户端会回退到 Dart HTTP 下载流程。

## 任务控制

| 操作 | 说明 |
|------|------|
| 暂停 | 停止当前网络请求，保留已下载部分 |
| 继续 | 使用 Range 或 aria2 控制文件继续下载 |
| 取消 | 停止任务并清理临时文件 |
| 限速 | 下载设置中以 KB/s 配置，`0` 表示不限速 |
| 并发 | 下载设置中配置最大同时下载数，超出任务排队等待 |

下载进度会节流刷新，避免频繁写入本地状态。Android 通知也会按固定间隔更新。

## 解压与完成操作

下载完成后客户端使用内置 7zip-zstd 解压。版本如果预设了解压密码，解压时会自动使用；解压失败时会提示用户。

桌面端完成后可执行：

- 打开目标文件夹
- Windows 创建快捷方式
- Windows / Linux 导入为 Steam 非 Steam 游戏
- 推送到 LunaBox 或 ReinaManager 下载入库

Android 端需要提前授予「所有文件访问」权限，否则无法稳定解压到共享存储。

## 排障提示

- OpenList 下载卡住时，查看日志中的 `download request` / `download redirect` / `aria2 download` 记录。
- 下载临时文件损坏时，先删除任务并重新下载。
- CDN 对多连接不友好时，客户端会降低 aria2 分片数并在必要时回退。
- 若下载报 401，通常是 token 过期或服务端重置，需要重新登录。
