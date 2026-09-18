# 元数据刮削

Sena Repo 支持为游戏补充封面、背景、简介、会社、开发商、发售日、标签、游玩时长和外部资料 ID。当前刮削由服务端统一处理，客户端负责展示搜索结果和字段对比。

## 支持来源

| 来源 | 状态 | 说明 |
|------|------|------|
| Hikarinagi | 已支持 | 中文 Galgame 资料源，可配置 Client ID、Client Secret 和 Scope |
| VNDB Kana v2 | 已支持 | 可选 Token，平均游玩时长目前优先从 VNDB 获取 |
| Bangumi | 已支持 | 可选 Token，适合补充中文条目、封面和简介 |
| Steam | 已支持 | 免认证，适合补充 AppID、商店封面和背景 |
| NextMoe | 开发中 | 保留为后续资料源，当前文档中不按已可用功能描述 |

默认刮削顺序为 `hikarinagi`、`vndb_kana`、`bangumi`、`steam`，可在设置中调整启用状态和排序。

## 凭据配置

| 配置项 | 说明 |
|--------|------|
| `SENA_BANGUMI_TOKEN` | Bangumi API Token，可在服务端环境变量或客户端刮削设置中配置 |
| `SENA_VNDB_TOKEN` | VNDB Token，可选 |
| `SENA_HIKARINAGI_CLIENT_ID` | Hikarinagi 开发者 Client ID |
| `SENA_HIKARINAGI_CLIENT_SECRET` | Hikarinagi 开发者 Client Secret |
| `SENA_HIKARINAGI_SCOPE` | Hikarinagi Scope，默认 `catalog:full` |
| `SENA_PROXY` | 刮削代理，支持 HTTP / SOCKS5 等 httpx 可用代理格式 |

客户端「刮削设置」里可以保存这些配置，并提供 Hikarinagi 连接测试。

## 单游戏刮削

在游戏详情页进入编辑页面后，可以：

1. 选择刮削源。
2. 输入关键词搜索，或使用已保存的 VNDB / Bangumi / Steam / Hikarinagi ID 精确匹配。
3. 查看候选结果。
4. 展开结果并逐字段对比当前值与新值。
5. 勾选要覆盖的字段。
6. 应用结果并保存游戏。

封面和背景会由服务端下载并写入数据目录。

## 批量刮削

批量刮削适合首次导入大量游戏后补齐元数据。可选模式包括：

| 模式 | 用途 |
|------|------|
| `missing` | 只填补缺失字段 |
| `overwrite` | 允许覆盖已有字段 |
| `metadata` | 主要处理文本元数据 |
| `images` | 主要补充封面和背景 |

通过客户端设置页或 `senacli scan --scrape missing` 可以触发扫描后的批量刮削。

## 建议

- 首次扫描后先确认游戏名、会社名和版本平台是否识别正确。
- 手工修过的条目优先使用单游戏逐字段对比，避免被批量覆盖。
- NextMoe 相关文档先保留为开发中状态，待服务端刮削器和设置项落地后再补齐用法。
