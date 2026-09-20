---
layout: home

hero:
  name: Sena Repo
  text: 视觉小说私有库管理器
  tagline: 将NAS 或 OpenList 上的游戏收藏整理成可浏览、可搜索、可下载的私有库。
  image:
    src: /icon/appicon.png
    alt: Sena Repo
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/quick-start
    - theme: alt
      text: 下载客户端
      link: https://github.com/404-GCross/Sena-Repo/releases
    - theme: alt
      text: 部署服务端
      link: /server/

features:
  - title: 私有游戏库
    details: 按会社、游戏和版本文件组织资源，自动扫描并生成可筛选的视觉小说库。
  - title: 跨平台客户端
    details: Windows、Android 与 Linux 客户端连接同一服务端，覆盖浏览、下载、解压与本地配置。
  - title: 多源元数据
    details: 支持 VNDB、Bangumi、Steam、Hikarinagi 与 NextMoe 聚合刮削，自动填充别名与游玩时长。
  - title: OpenList 接入
    details: 可将 OpenList 作为游戏库或 Steam 补丁库来源，下载流量直连文件源。
  - title: Steam 补丁注入
    details: 扫描补丁包并按 AppID 匹配本地 Steam 游戏，自动下载解压到目标目录，支持元数据锁定。
  - title: 自托管部署
    details: 服务端提供 Docker、Docker Compose、Tarball 和一键安装脚本，附带 senacli 维护命令，支持备份导出与导入恢复。
---

<script setup>
import { withBase } from 'vitepress'
</script>

<section class="home-gallery">
  <h2>界面预览</h2>
  <p>第一版文档站已接入项目截图，后续可以继续按页面补充操作图。</p>
  <div class="home-gallery-grid">
    <figure class="home-shot">
      <img :src="withBase('/gallery/library.png')" alt="游戏库界面" />
      <figcaption>游戏库：网格 / 列表视图、搜索、排序与筛选。</figcaption>
    </figure>
    <figure class="home-shot">
      <img :src="withBase('/gallery/steam-patch.png')" alt="Steam 补丁界面" />
      <figcaption>Steam 补丁：客户端匹配与服务端补丁索引管理。</figcaption>
    </figure>
    <figure class="home-shot">
      <img :src="withBase('/gallery/detail-1.png')" alt="游戏详情页" />
      <figcaption>详情页：封面、简介、标签、版本列表与下载入口。</figcaption>
    </figure>
    <figure class="home-shot">
      <img :src="withBase('/gallery/edit.png')" alt="元数据编辑界面" />
      <figcaption>元数据编辑：多源刮削结果对比与字段覆盖。</figcaption>
    </figure>
  </div>
</section>
