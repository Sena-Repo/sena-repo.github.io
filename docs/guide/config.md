# 配置说明

本页用于记录 Sena-Repo 的配置项。

## 环境变量

如果项目使用 `.env` 文件，可以按下面的格式说明：

| 变量名 | 说明 | 默认值 |
| --- | --- | --- |
| `EXAMPLE_NAME` | 示例配置项 | `default` |

## 配置文件

如果项目使用独立配置文件，可以说明文件位置和字段含义：

```text
config/
  app.config.example
```

## GitHub Pages 部署路径

当前文档站点的 VitePress `base` 会在 GitHub Actions 中自动根据仓库名推断。

如果部署路径不符合预期，可以在 GitHub Actions 中设置：

```yaml
env:
  VITEPRESS_BASE: /Sena-Repo/
```

常见情况：

| 部署地址 | `VITEPRESS_BASE` |
| --- | --- |
| `https://404-GCross.github.io/` | `/` |
| `https://404-GCross.github.io/Sena-Repo/` | `/Sena-Repo/` |
| `https://404-GCross.github.io/senarepo.github.io/` | `/senarepo.github.io/` |
