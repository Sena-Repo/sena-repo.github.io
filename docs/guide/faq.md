# 常见问题

## 这个文档站点如何本地预览？

在文档仓库中执行：

```sh
npm install
npm run docs:dev
```

然后访问终端输出的本地地址。

## 如何构建静态文件？

```sh
npm run docs:build
```

构建结果位于：

```text
docs/.vitepress/dist
```

## GitHub Pages 没有更新怎么办？

可以依次检查：

- GitHub 仓库的 Pages Source 是否选择了 GitHub Actions。
- Actions 页面中部署任务是否成功。
- `docs/.vitepress/config.mjs` 中的 `base` 是否与访问路径一致。
- 浏览器是否缓存了旧页面。

## 如何新增页面？

在 `docs/guide/` 下新建 Markdown 文件，例如：

```text
docs/guide/examples.md
```

然后在 `docs/.vitepress/config.mjs` 的 `sidebar` 中加入链接。
