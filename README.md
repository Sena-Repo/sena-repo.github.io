# Sena Repo 文档站

这是 [Sena-Repo](https://github.com/404-GCross/Sena-Repo) 的 VitePress 文档站仓库。

## 本地开发

```bash
npm install
npm run docs:dev
```

## 构建

```bash
npm run docs:build
npm run docs:preview
```

## GitHub Pages

推送到 `main` 分支后，`.github/workflows/deploy.yml` 会构建 `docs/.vitepress/dist` 并部署到 GitHub Pages。

当前站点部署在 `https://sena-repo.github.io/`（组织页，`base` 为 `/`）。如需迁移到自定义域名，调整 workflow 中的 `VITEPRESS_BASE` 与 `VITEPRESS_SITE_URL` 即可。
