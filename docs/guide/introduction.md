# 项目简介

Sena Repo 是一款面向多平台的视觉小说私有库管理器，适合把 NAS、服务器或 OpenList 上的游戏收藏整理成由自己掌控的私有库。它的重点不是替代本地游戏管理器，而是让远程资源可浏览、可搜索、可下载，并能在客户端完成解压、入库和 Steam 补丁注入。

## 核心思路

```text
游戏目录 / OpenList
      ↓
Sena Repo 服务端（扫描、索引、用户、刮削、补丁规则）
      ↓
Sena Repo 客户端（浏览、搜索、下载、解压、Steam 集成）
```

服务端只需要部署、挂载数据目录，并配置本地目录或 OpenList 文件源；之后的目录管理、刮削规则、用户审批、下载设置和 Steam 补丁操作，都可以在客户端里完成。

## 适合场景

- 你已经把视觉小说资源集中放在 NAS、服务器、本地挂载盘或 OpenList 目录中。
- 你希望多设备访问同一套游戏库，并按平台选择 PC、KRKR、Tyranor、ONS 或 Android 直装版本。
- 你想给游戏补充封面、背景、简介、标签、会社、发售日和外部资料 ID。
- 你需要集中维护 Steam 补丁包，并让客户端按本机 Steam `steamapps` 自动匹配。
- 你想把 Sena Repo 里的下载版本推送到 LunaBox 或 ReinaManager 继续下载、入库。

## 当前能力

| 能力 | 状态 |
|------|------|
| 游戏库扫描 | 支持本地目录与 OpenList 文件源，目录深度可在扫描设置中调整 |
| 元数据刮削 | 支持 VNDB、Bangumi、Steam、Hikarinagi，以及 NextMoe 聚合模式；自动填充别名与游玩时长 |
| 下载与解压 | 内置 aria2 下载优先，失败时回退 Dart 下载；解压使用 7zip-zstd |
| OpenList 下载 | Sena 生成短期下载链接和 302 跳转，客户端直连 OpenList / 网盘 CDN |
| Steam 补丁 | 服务端维护补丁索引并支持元数据锁定，客户端扫描本机 Steam 库并执行注入 |
| 备份与恢复 | `senacli backup` / `restore` 导出、导入游戏库、账号、补丁规则与图片，新服务端可在初始化向导中导入 |
| 管理器推送 | 支持生成 `lunabox://install` 与 `reinamanager://install` 协议链接 |
| 服务端维护 | Docker 镜像内置 `senacli`；裸机安装脚本会注册本地维护命令 |

## 推荐阅读

1. [快速开始](/guide/quick-start)
2. [服务端部署](/server/)
3. [客户端使用](/client/)
4. [OpenList 文件源](/client/#openlist-文件源)
