# 元数据刮削

Sena Repo 支持为游戏补充封面、背景、简介、会社、开发商、发售日、标签、别名、游玩时长和外部资料 ID。刮削由服务端统一处理，客户端负责选择来源、展示候选结果和逐字段对比。

## 支持来源

| 来源 | 认证 | 说明 |
|------|------|------|
| VNDB | 可选 Token | 含平均游玩时长数据 |
| Bangumi | 可选 Token | 中文元数据丰富 |
| Steam | 免认证 | 封面、背景、简介 |
| Hikarinagi | Client ID / Secret | 中文 Galgame 资料站 |
| NextMoe | 应用密钥 | 聚合六源；独立模式，开启后禁用其他刮削源；含游戏时长（仅单条目详情） |

NextMoe 是独立的刮削模式：在客户端「扫描设置 → 刮削源」中开启后，其余刮削源会自动关闭并禁用，单条目和批量刮削都只走 NextMoe。密钥在 https://developer.nextmoe.dev 控制台自助创建应用并勾选 `catalog:read`，免费额度为每分钟 60 次、每天 50000 次；关闭 NextMoe 后其余刮削源恢复可选。

游戏时长来自 NextMoe 详情接口的 `playtimes` 块（多上游并列，优先取 `nextmoe` 聚合行）。由于列表接口不返回该字段，只有单条目刮削（详情）会写入平均时长，批量刮削不会写入，也不会额外请求详情。

## 凭据配置

| 配置项 | 说明 |
|--------|------|
| `SENA_BANGUMI_TOKEN` | Bangumi API Token |
| `SENA_VNDB_TOKEN` | VNDB API Token，可选 |
| `SENA_HIKARINAGI_CLIENT_ID` / `SENA_HIKARINAGI_CLIENT_SECRET` | Hikarinagi 开发者凭据（`config.yaml` 中为 `scrapers.hikarinagi_*`） |
| `SENA_NEXTMOE_API_KEY` | NextMoe 应用密钥（`nmk_live_…`） |
| `SENA_PROXY` | 刮削代理，支持 HTTP / SOCKS5 等 httpx 可用代理格式 |

服务端可以通过环境变量或 `/data/config.yaml` 配置这些项；客户端「刮削设置（管理员）」可以保存 Bangumi / VNDB Token、配置代理，并设置批量自动刮削的字段来源规则（封面用哪个源、简介用哪个源等）。

## 别名自动填充

VNDB（`aliases`）、Bangumi（infobox「别名」）、Hikarinagi（`aliases`）和 NextMoe（`title_kind=alias`）会在刮削时提取别名，去重后以「、」拼接写入游戏别名（最多 5 条、200 字符）。「补全缺失」只填空，「覆盖」会替换已有别名；Steam 无别名数据。

## 单游戏刮削

在游戏详情页进入编辑界面后，可以：

1. 选择刮削源。
2. 输入关键词搜索，或使用已保存的外部资料 ID 精确匹配。
3. 查看候选结果，展开后逐字段对比当前值与新值。
4. 勾选要覆盖的字段；封面和背景可以从候选图中挑选（先选封面，再选背景）。
5. 应用结果并保存游戏，图片由服务端下载并写入数据目录。

## 批量刮削

批量刮削适合首次导入大量游戏后补齐元数据。可选模式包括：

| 模式 | 用途 |
|------|------|
| `missing` | 只填补缺失字段 |
| `overwrite` | 允许覆盖已有字段 |
| `metadata` | 主要处理文本元数据 |
| `images` | 主要补充封面和背景 |

字段来源规则在客户端「刮削设置」中配置；也可以通过客户端设置页或 `senacli scan --scrape missing` 触发扫描后的批量刮削。

## 建议

- 首次扫描后先确认游戏名、会社名和版本平台是否识别正确。
- 手工修过的条目优先使用单游戏逐字段对比，避免被批量覆盖。
- 需要平均游玩时长时使用 NextMoe 单条目刮削（详情），批量刮削不会写入。
