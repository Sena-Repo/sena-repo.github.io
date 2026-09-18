import { defineConfig } from 'vitepress'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const ownerName = process.env.GITHUB_REPOSITORY_OWNER
const isUserPageRepo =
  !!repoName &&
  !!ownerName &&
  repoName.toLowerCase() === `${ownerName.toLowerCase()}.github.io`
const defaultBase =
  process.env.GITHUB_ACTIONS && repoName && !isUserPageRepo
    ? `/${repoName}/`
    : '/'

export default defineConfig({
  title: 'Sena Repo',
  description: 'Sena-Repo 使用文档',
  base: process.env.VITEPRESS_BASE ?? defaultBase,
  lang: 'zh-CN',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['meta', { name: 'theme-color', content: '#2563eb' }]
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Sena Repo',

    nav: [
      { text: '指南', link: '/guide/getting-started' },
      { text: '配置', link: '/guide/config' },
      { text: 'FAQ', link: '/guide/faq' },
      { text: 'GitHub', link: 'https://github.com/404-GCross/Sena-Repo' }
    ],

    sidebar: [
      {
        text: '开始使用',
        items: [
          { text: '项目介绍', link: '/' },
          { text: '快速开始', link: '/guide/getting-started' },
          { text: '安装', link: '/guide/install' },
          { text: '基本使用', link: '/guide/usage' },
          { text: '配置说明', link: '/guide/config' },
          { text: '常见问题', link: '/guide/faq' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/404-GCross/Sena-Repo' }
    ],

    search: {
      provider: 'local'
    },

    footer: {
      message: 'Released under the GPL-3.0 license.',
      copyright: 'Copyright © 2026 404-GCross'
    },

    editLink: {
      pattern: 'https://github.com/404-GCross/Sena-Repo/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页'
    },

    lastUpdated: {
      text: '最后更新',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    }
  }
})
