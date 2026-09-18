import { defineConfig } from 'vitepress'

const base = process.env.VITEPRESS_BASE ?? '/'
const siteUrl = process.env.VITEPRESS_SITE_URL ?? 'https://sena-repo.github.io/'

const withBase = (path: string) => `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`

export default defineConfig({
  lang: 'zh-CN',
  title: 'Sena Repo',
  description: '面向多平台的视觉小说私有库管理器',
  base,
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', href: withBase('/icon/appicon.png') }],
    ['meta', { property: 'og:title', content: 'Sena Repo 文档站' }],
    ['meta', { property: 'og:description', content: 'Sena Repo 的部署、客户端使用、专题说明与排障文档。' }],
    ['meta', { property: 'og:type', content: 'website' }]
  ],

  sitemap: {
    hostname: siteUrl
  },

  themeConfig: {
    logo: '/icon/appicon.png',
    siteTitle: 'Sena Repo',
    outline: {
      level: [2, 3],
      label: '本页目录'
    },
    lastUpdated: {
      text: '最后更新',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    },
    search: {
      provider: 'local'
    },
    nav: [
      { text: '首页', link: '/' },
      { text: '快速开始', link: '/guide/quick-start' },
      { text: '服务端', link: '/server/' },
      { text: '客户端', link: '/client/' },
      { text: '项目仓库', link: 'https://github.com/404-GCross/Sena-Repo' }
    ],
    sidebar: [
      {
        text: '快速开始',
        items: [
          { text: '项目简介', link: '/guide/introduction' },
          { text: '快速开始', link: '/guide/quick-start' }
        ]
      },
      {
        text: '部署与使用',
        items: [
          { text: '服务端部署', link: '/server/' },
          { text: '客户端使用', link: '/client/' }
        ]
      },
      {
        text: '功能专题',
        items: [
          { text: 'OpenList 文件源', link: '/features/openlist' },
          { text: 'Steam 补丁注入', link: '/features/steam-patch' },
          { text: '元数据刮削', link: '/features/metadata-scraping' },
          { text: '下载与解压', link: '/features/downloads' },
          { text: '推送到管理器', link: '/features/manager-push' }
        ]
      },
      {
        text: '参考与维护',
        items: [
          { text: '服务端 CLI', link: '/server/cli' },
          { text: '技术架构', link: '/reference/technical' },
          { text: '疑难杂症', link: '/reference/troubleshooting' },
          { text: '功能测试表', link: '/reference/test-checklist' },
          { text: '贡献指南', link: '/contribution/' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/404-GCross/Sena-Repo' }
    ],
    footer: {
      message: 'Released under the AGPL v3 License.',
      copyright: 'Copyright © 2026 Sena Repo'
    }
  }
})
