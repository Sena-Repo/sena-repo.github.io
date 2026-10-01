# Steam 补丁注入

Steam 补丁功能用于为本机已安装的 Steam 正版 Galgame 匹配并注入汉化、音声、剧情或额外内容补丁。服务端维护补丁索引，客户端扫描本机 Steam 库并执行下载解压。

## 使用流程

1. 在服务端补丁目录放置 `.zip`、`.rar`、`.7z`、`.tar`、`.gz`、`.xz` 等压缩包。
2. 打开客户端 Steam 补丁页，切到「补丁配置」Tab（切到「补丁注入」Tab 时会自动刷新匹配）。
3. 点击「扫描补丁」，先选择扫描模式：**合并刷新**（保留规则/名称/锁定，补新删失）、**仅清空元数据**（保留规则与锁定，重新解析 AppID/名称/标签/类型）、**清空重扫**（完全按磁盘重建）；扫描过程会显示进度。
4. 服务端尝试从文件名、父目录名或 Steam Store 搜索识别 AppID，并解析到基础游戏。
5. 如有必要，手动编辑 AppID、补丁类型、`patch_dir` 或 `target_dir`。
6. 切到「补丁注入」Tab，扫描本机 Steam `steamapps`。
7. 客户端按 AppID 匹配补丁，点击「注入」下载并解压到游戏目录。

## 搜索与编辑

- 两个 Tab 顶部都有搜索框：注入页按游戏 / 补丁过滤，配置页按补丁 / AppID 过滤
- 配置列表每行可以展开查看详情；编辑弹窗分「元数据 / 配置」两段，可以分别保存，并提供「打开目标文件夹」
- 注入页「规则待配置」的条目可以点「跳转配置」直达对应配置行
- 注入时如果压缩包需要解压密码，会提示输入密码重试（也可以在下载管理器中重试）

## 补丁目录与索引

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

如果游戏库和补丁库都来自 OpenList，仍建议将 `SENA_PATCH_DIR` 指向持久化目录，例如 `/data/steam_patch`，用于保存补丁压缩包。

补丁索引与类型关键词位于数据目录的 `steam_patch_index/`，只要 `/data` 持久化即可保留：

```text
steam_patch/                      ← 补丁压缩包目录
├── 游戏1_Steam_Chinese_Patch.7z
└── 游戏2_Steam_Voice_Patch.rar

data/steam_patch_index/           ← 索引目录，位于数据目录内
├── patches.json                  ← 自动生成，记录所有补丁与匹配规则
└── patch_type_keywords.json      ← 补丁类型识别关键词配置
```

## 下载与注入

补丁下载与游戏下载共用同一条管线：客户端先通过 `POST /api/steam/patches/{key}/link` 取一次带时效的签名直链，优先交给内置 aria2 多连接下载，失败再回退分片/流式；网盘来源的补丁会按来源类型使用浏览器 UA 和分片降级重试。链接过期时客户端会自动换取新链接继续下载。

## AppID 识别

优先级从高到低：

1. 文件名中的纯数字，例如 `123456.zip`。
2. 父目录名中的纯数字，例如 `123456/patch.zip`。
3. 从文件名提取游戏名，调用 Steam Store 搜索，并把结果解析到基础游戏。
4. 仍失败则 `app_id: null`，需要在客户端手动填写。

## 重新刮削与名称来源

- 编辑补丁时的「重新刮削」**只解析并填充**弹窗里的 AppID / 游戏名，点「保存元数据」后才写入；不保存直接关闭不会改动补丁。「批量刮削 ID」是执行动作，会直接写入。
- NextMoe 模式下可以选补丁名称来源（客户端「刮削设置 → NextMoe」）：默认直接用 NextMoe 名称；开启「补丁名称用 Steam 名称」后，先解析出 AppID，再取 Steam 商店名称，取不到时回退 NextMoe。该开关同时作用于自动扫描、重新刮削和修改 AppID 后的名称刷新。

## 补丁类型

| 类型 | 默认关键词 |
|------|-----------|
| `translation` | `_Steam_Chinese_Patch` |
| `voice` | `_Steam_Voice_Patch` |
| `story` | `_Steam_Story_Patch` |
| `extra` | `_Steam_Extra_Patch` |
| `misc` | 无关键词匹配时 |

关键词文件位于数据目录的 `steam_patch_index/patch_type_keywords.json`，可在客户端 Steam 补丁页的「关键词匹配」中编辑，也可以直接改这个文件。文件名（统一转小写）包含任一关键词即归为该类型，按类型顺序取第一个命中的；`misc` 不参与匹配。文件只在不存在时写入默认值，之后以文件内容为准，升级服务端不会覆盖你改过的词。

## `patch_dir` / `target_dir`

| 字段 | 作用 |
|------|------|
| `patch_dir` | 解压后从临时目录中的哪个子目录取文件；为空时会尝试自动选择单顶层目录 |
| `target_dir` | 将补丁文件复制到 Steam 游戏目录下的哪个子路径；为空表示游戏根目录 |

示例：压缩包内结构为 `汉化v2/data/patch.xp3`，配置 `patch_dir="汉化v2"`、`target_dir=""`，最终会把 `data/patch.xp3` 合并到游戏根目录。

## 元数据锁定

服务端 Tab 里每行右侧可以锁定元数据：锁定后，自动扫描与「重新刮削 AppID」都不会改动该补丁的 AppID、游戏名、标签、类型与注入规则；文件大小、来源路径这类文件事实仍会随扫描更新。再点一次即可解锁。

## 备份与恢复

补丁匹配规则与类型关键词会随服务端备份一起导出：

```bash
senacli backup --scope patch
senacli restore sena-backup-20260915-153000.zip
```

旧的仅补丁规则 JSON 备份仍可恢复。完整说明见 [服务端 CLI](/server/cli) 与 [备份与恢复](/server/backup)。
