# Steam 补丁注入

Steam 补丁功能用于为本机已安装的 Steam 正版 Galgame 匹配并注入汉化、音声、剧情或额外内容补丁。服务端维护补丁索引，客户端扫描本机 Steam 库并执行下载解压。

## 使用流程

1. 在服务端补丁目录放置 `.zip`、`.rar`、`.7z`、`.tar`、`.gz`、`.xz` 等压缩包。
2. 打开客户端 Steam 补丁页，切到「服务端」Tab。
3. 点击「扫描补丁」，服务端递归扫描补丁目录并生成 `patches.json`。
4. 服务端尝试从文件名、父目录名或 Steam Store 搜索识别 AppID。
5. 如有必要，手动编辑 AppID、补丁类型、`patch_dir` 或 `target_dir`。
6. 切到「客户端」Tab，扫描本机 Steam `steamapps`。
7. 客户端按 AppID 匹配补丁，点击「注入」下载并解压到游戏目录。

## 补丁目录

默认容器内补丁目录为 `/steam_patch`：

```bash
docker run -d \
  --name sena-repo \
  -p 11451:11451 \
  -v /path/to/data:/data \
  -v /path/to/steam_patches:/steam_patch \
  --restart unless-stopped \
  404gcross/sena-repo:latest
```

如果游戏库和补丁库都来自 OpenList，仍建议将 `SENA_PATCH_DIR` 指向持久化目录，例如 `/data/steam_patch`，用于保存 `patches.json` 和类型关键词配置。

```text
steam_patch/
├── patches.json
├── patch_type_keywords.json
├── 游戏1_Steam_Chinese_Patch.7z
└── 游戏2_Steam_Voice_Patch.rar
```

## AppID 识别

优先级从高到低：

1. 文件名中的纯数字，例如 `123456.zip`。
2. 父目录名中的纯数字，例如 `123456/patch.zip`。
3. 从文件名提取游戏名，调用 Steam Store 搜索。
4. 仍失败则 `app_id: null`，需要在客户端手动填写。

## 补丁类型

| 类型 | 默认关键词 |
|------|-----------|
| `translation` | `_Steam_Chinese_Patch` |
| `voice` | `_Steam_Voice_Patch` |
| `story` | `_Steam_Story_Patch` |
| `extra` | `_Steam_Extra_Patch` |
| `misc` | 无关键词匹配时 |

关键词可在客户端 Steam 补丁页编辑，也可备份和恢复。

## `patch_dir` / `target_dir`

| 字段 | 作用 |
|------|------|
| `patch_dir` | 解压后从临时目录中的哪个子目录取文件；为空时会尝试自动选择单顶层目录 |
| `target_dir` | 将补丁文件复制到 Steam 游戏目录下的哪个子路径；为空表示游戏根目录 |

示例：压缩包内结构为 `汉化v2/data/patch.xp3`，配置 `patch_dir="汉化v2"`、`target_dir=""`，最终会把 `data/patch.xp3` 合并到游戏根目录。

## CLI 维护

服务端 `senacli` 可备份或恢复 Steam 补丁匹配规则：

```bash
senacli backup
senacli restore sena-steam-patch-rules-20260909-153000.json
```

恢复前会先保存当前索引备份。完整 CLI 说明见 [服务端 CLI](/server/cli)。
