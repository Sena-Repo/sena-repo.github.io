# 推送到管理器

Sena Repo 可以把某个游戏版本生成协议安装链接，并推送给外部管理器继续下载、校验、解压或入库。目前支持 LunaBox 和 ReinaManager。

## 支持目标

| 管理器 | 协议 | 说明 |
|--------|------|------|
| LunaBox | `lunabox://install` | 传递下载链接、文件名、大小、压缩格式、标题和元数据来源 |
| ReinaManager | `reinamanager://install` | 传递下载链接、文件名、大小、压缩格式、标题和 BGM / VNDB / Steam / Hikarinagi ID |

客户端会在游戏详情页选择版本后发起推送。目标管理器需要已经安装并注册对应协议。

## 工作流程

```text
客户端选择游戏版本
  → 请求 Sena 生成 manager-install-link
  → Sena 生成短期签名下载 URL
  → 拼接 lunabox://install 或 reinamanager://install
  → 客户端打开协议链接
  → 目标管理器继续处理下载和入库
```

OpenList 来源的版本仍然走 Sena 的签名下载链接，由 Sena 在下载时继续生成 OpenList 跳转。

## 限制

- 目标管理器暂不支持带解压密码的压缩包，Sena 会拒绝生成链接。
- 文件大小必须有效，否则无法生成安装链接。
- 仅支持目标管理器声明可处理的压缩格式。
- 下载链接是短期签名 URL，请在生成后尽快由目标管理器接管。

## 校验

服务端会尽量为管理器安装链接附带 SHA256：

- OpenList 元数据中已有 SHA256 时直接复用。
- 本地文件或已缓存校验值可用于生成 checksum。
- 没有可用校验值时仍可生成链接，但目标管理器无法做完整哈希校验。

如需稳定跨实例生成链接，请在服务端保持 `SENA_MANAGER_SIGNING_KEY` 稳定。
