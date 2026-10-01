# 文件源接入

Sena Repo 的游戏库和 Steam 补丁库支持两种来源：服务端本地目录，或 OpenList 文件源。

## 本地目录

资源已经在 NAS 或宿主机上时，直接把目录挂载给服务端即可，目录结构要求见 [部署前准备](/server/#部署前准备)。

## OpenList 文件源

Sena Repo 支持将 OpenList 作为游戏库或 Steam 补丁库的文件来源，添加分两步：

**第一步：添加 OpenList 服务器**

在「扫描设置」→「OpenList 服务器」中添加，填写：
- OpenList 地址（客户端和服务端都能访问的地址，如 `http://192.168.1.100:5244`）
- 用户名和密码（留空则使用 OpenList 访客模式）

**第二步：添加目录**

在「游戏库目录」或「Steam 补丁目录」中选择该 OpenList 服务器，填写 OpenList 内部路径，例如 `/115/Games/GalGame/Library`。目录内仍需遵守 Sena Repo 的目录结构规则。

**下载链路：**

```
客户端 → Sena /api/download/{id}
  → 302 → OpenList /d/文件路径?sign=...
  → 302 → 网盘/CDN 直链
  → 客户端直接从网盘/CDN 下载
```

Sena 服务端只生成跳转，不代理大文件流量。OpenList 地址必须从客户端设备可访问。
