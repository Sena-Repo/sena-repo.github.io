import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import DownloadPage from './components/DownloadPage.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('DownloadPage', DownloadPage)
  }
} satisfies Theme
