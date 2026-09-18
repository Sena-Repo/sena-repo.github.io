---
layout: home

hero:
  name: Sena Repo
  text: 使用文档
  tagline: 这里整理 Sena-Repo 的安装、配置、使用方式与常见问题。
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 查看 GitHub
      link: https://github.com/404-GCross/Sena-Repo

features:
  - title: 快速上手
    details: 从环境准备到首次运行，按步骤完成最小可用流程。
  - title: 配置清晰
    details: 将常用配置项、默认值和注意事项集中整理。
  - title: 便于维护
    details: 基于 VitePress 与 GitHub Pages，文档更新后可自动部署。
---

## 这是什么？

本网站是 [404-GCross/Sena-Repo](https://github.com/404-GCross/Sena-Repo) 的使用文档。

你可以从 [快速开始](/guide/getting-started) 进入，先跑通最短流程；之后再根据需要阅读安装、配置和 FAQ。

## 文档维护方式

本文档使用 VitePress 编写，主要内容位于 `docs/` 目录：

```text
docs/
  index.md
  guide/
    getting-started.md
    install.md
    usage.md
    config.md
    faq.md
  .vitepress/
    config.mjs
```

本地预览：

```sh
npm install
npm run docs:dev
```
