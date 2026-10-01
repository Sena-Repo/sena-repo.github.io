# 备份与恢复

Sena Repo 的服务端数据可以通过 `senacli` 导出和恢复，用于换机、重装或迁移。

## 导出与恢复（senacli）

`senacli backup` / `senacli restore` 用于在换机、重装前导出服务端数据。默认导出成单个 zip：

```
sena-backup-<时间戳>.zip
├── backup.json          # 结构化数据
└── media/
    ├── covers/          # 封面
    ├── backgrounds/     # 横版背景
    └── avatars/         # 用户头像
```

`backup.json` 包含五块：

| 区块 | 内容 |
|------|------|
| `steam_patch` | 补丁匹配规则（AppID、游戏名、标签、类型、`patch_dir`、`target_dir`、清单确认状态）、补丁类型关键词与补丁库目录（含来源类型/来源名/分析模式） |
| `library` | 目录库（含来源类型/来源名/OpenList 子路径）、**文件源**（OpenList 地址、账号、密码、启用状态）、会社、游戏（含封面/背景路径、NSFW、VNDB/Steam/Bangumi/Hikarinagi/NextMoe ID、简介等）、版本（含平台、解压密码、校验值）、标签与关联、忽略列表 |
| `accounts` | 用户（用户名、角色、状态、密码哈希与 salt、头像路径，以及 鲲Galgame 绑定字段与是否设置过本地密码） |
| `settings` | 扫描设置（自动扫描、间隔、目录结构）与刮削设置（启用的源、NextMoe 模式、各站 token / NextMoe API Key、代理） |
| `media` | zip 里包含的图片文件名清单 |

不含游戏文件本体和用户登录态（`user_sessions`）；安装路径、端口、`/etc/sena-repo/sena-repo.env` 里的机器配置也不会跟着走，换机后需要重新设置。

备份文件里有密码哈希、解压密码、OpenList 密码与各站 token（导出时解密、导入时按目标机器的密钥重新加密），**请当作敏感文件保管**。

恢复时的几点行为：

- 文件源按**名字**匹配：目标服务器已有同名源就复用（合并模式保留本机配置，清空重建模式按备份覆盖），缺失的会自动创建，所以目录库能被正确接回
- 刮削/扫描设置写入后会提示重启服务端生效
- 旧版本的备份（缺少 `settings` / 文件源 / 绑定字段）依然可以导入，且不会清空目标机器已有的绑定或配置

```bash
# 备份到数据目录下的 backups/sena-backup/
senacli backup

# 换目录，或指定文件名
senacli backup /path/to/backup-dir
senacli backup -o /path/to/backup.zip

# 只要 JSON，不带图片和头像
senacli backup --json-only

# 只备份一部分（all 默认：游戏库 + 补丁）
senacli backup --scope library     # 仅游戏库、文件源、设置与账号
senacli backup --scope patch       # 仅补丁匹配规则与类型关键词

# 恢复（会依次询问恢复范围、已存在条目怎么处理、同名图片怎么处理）
senacli restore sena-backup-20260915-153000.zip

# 全部按默认值（全部恢复 / 合并更新 / 跳过同名图片），脚本化用
senacli restore sena-backup-20260915-153000.zip -y
```

恢复时的三个选择：

1. **恢复范围**：全部 / 仅补丁规则 / 仅游戏库与账号（备份里两块都有时才问）
2. **已存在的条目**：合并更新（按路径匹配，保留现有）或清空重建（先删除现有游戏库、账号与忽略列表）
3. **同名图片**：跳过已有文件或全部覆盖

恢复前会打印备份内容概览，并先把现有的 `patches.json`、`patch_type_keywords.json` 备份到 `backups/sena-backup/`。游戏、版本、标签按路径或名称匹配（目录库按 `path`、游戏按 `folder_path`、版本按 `file_path`、标签按 `name`），id 会重新分配；OpenList 目录库按**文件源名称**重新绑定，找不到同名源时跳过该目录库及其游戏并提示。

旧的 `steam_patch_rules` 备份（`.json`，只有补丁规则和关键词）仍然可以恢复。

## 从备份重建服务端

新装一台服务端后，有两种方式导入备份：

1. **客户端向导**：连接到未初始化的服务端时，向导第一页选「导入备份」，直接上传 zip。服务端只在还没有服主时接受这种导入（`POST /api/setup/import`），导入完成后用备份里的账号登录。
2. **senacli**：把 zip 放到服务端（或挂载目录）后执行 `senacli restore <zip>`，先 `senacli restore <zip> -y` 也可以用默认选项一把过。这条路同样适用于已完成初始化的服务端。

上传的 zip 会保留在 `<data>/backups/` 下，名字形如 `uploaded-<时间戳>-<随机>.zip`。

已初始化的服务端还可以在客户端「设置 → 服务端 → 备份与恢复」里导出、下载和恢复备份，走的是同一套逻辑（`/api/backup/*`，仅管理员）：导出会在 `<data>/backups/sena-backup/` 生成 zip 并列在页面里，导入时可直接选恢复范围、合并或清空重建、同名图片跳过或覆盖。
