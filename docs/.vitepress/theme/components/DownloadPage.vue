<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

const REPO = '404-GCross/Sena-Repo'
const API = `https://api.github.com/repos/${REPO}/releases?per_page=30`
const RELEASES_URL = `https://github.com/${REPO}/releases`
const CACHE_KEY = 'sena-download-releases'
const CACHE_TTL = 10 * 60 * 1000
const MIRROR_KEY = 'sena-download-mirror'

const accelerators = [
  { value: '', label: '直连' },
  { value: 'https://gh-proxy.com/', label: 'gh-proxy.com' },
  { value: 'https://ghfast.top/', label: 'ghfast.top' },
  { value: 'https://v6.gh-proxy.org/', label: 'v6.gh-proxy.org' },
  { value: 'https://hk.gh-proxy.org/', label: 'hk.gh-proxy.org' },
  { value: 'https://cdn.gh-proxy.org/', label: 'cdn.gh-proxy.org' },
  { value: 'https://edgeone.gh-proxy.org/', label: 'edgeone.gh-proxy.org' }
]

type Channel = 'stable' | 'beta' | 'dev'

interface RawAsset {
  name: string
  browser_download_url: string
  size: number
}

interface RawRelease {
  tag_name: string
  name: string | null
  html_url: string
  published_at: string
  prerelease: boolean
  draft: boolean
  assets: RawAsset[]
}

interface Release {
  tag: string
  name: string
  url: string
  publishedAt: string
  assets: RawAsset[]
}

interface Row {
  platform: string
  os: string
  file: string
  note: string
  url: string
  size: string
  order: number
}

const channelConfig: Record<Channel, { label: string; desc: string; dockerTag: string }> = {
  stable: {
    label: '正式版',
    desc: '稳定发布，适合日常使用。',
    dockerTag: 'latest'
  },
  beta: {
    label: '测试版',
    desc: '候选发布，包含尚在验证中的改动，可能不够稳定。',
    dockerTag: 'pre-release'
  },
  dev: {
    label: '开发版',
    desc: '开发分支滚动构建，包含最新改动，不保证稳定。',
    dockerTag: 'dev'
  }
}

const stable = ref<Release | null>(null)
const beta = ref<Release | null>(null)
const dev = ref<Release | null>(null)
const channel = ref<Channel>('stable')
const osFilter = ref('all')
const loading = ref(true)
const error = ref('')
const accelerator = ref('')

function proxied(url: string): string {
  return accelerator.value ? `${accelerator.value}${url}` : url
}

watch(accelerator, (value) => {
  try {
    if (value) localStorage.setItem(MIRROR_KEY, value)
    else localStorage.removeItem(MIRROR_KEY)
  } catch {
    /* ignore */
  }
})

function channelOf(r: RawRelease): Channel | null {
  if (r.draft) return null
  if (!r.prerelease) return 'stable'
  if (r.tag_name === 'dev-release') return 'dev'
  if (/^v/.test(r.tag_name)) return 'beta'
  return null
}

function toRelease(r: RawRelease): Release {
  return {
    tag: r.tag_name,
    name: r.name || r.tag_name,
    url: r.html_url,
    publishedAt: r.published_at,
    assets: r.assets || []
  }
}

function formatSize(bytes: number): string {
  if (!bytes) return ''
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

interface AssetMeta {
  platform: string
  os: string
  note: string
  order: number
}

function classify(name: string): AssetMeta | null {
  if (/^Sena-Repo_Windows_.+_amd64_Setup\.exe$/.test(name)) {
    return { platform: 'Windows', os: 'windows', note: '安装版，推荐使用。', order: 1 }
  }
  if (/^Sena-Repo_Windows_.+_amd64\.zip$/.test(name)) {
    return { platform: 'Windows', os: 'windows', note: '便携版，解压后直接运行。', order: 2 }
  }
  if (/^Sena-Repo_Android_.+_universal\.apk$/.test(name)) {
    return { platform: 'Android', os: 'android', note: '通用安装包，首次使用需授予「所有文件访问」权限。', order: 3 }
  }
  if (/^Sena-Repo_Linux_.+_amd64\.AppImage$/.test(name)) {
    return { platform: 'Linux', os: 'linux', note: '桌面 / 掌机通用，赋予可执行权限后运行。', order: 4 }
  }
  if (/^Sena-Repo_Linux_.+_amd64\.deb$/.test(name)) {
    return { platform: 'Linux', os: 'linux', note: 'Debian / Ubuntu 等发行版。', order: 5 }
  }
  if (/^Sena-Repo_Linux_.+_amd64\.rpm$/.test(name)) {
    return { platform: 'Linux', os: 'linux', note: 'Fedora / RHEL 等发行版。', order: 6 }
  }
  if (/^Sena-Repo_Linux_.+_amd64\.tar\.gz$/.test(name)) {
    return { platform: 'Linux', os: 'linux', note: '免安装压缩包。', order: 7 }
  }
  if (/^Sena-Repo_Server_amd64_.+\.tar\.gz$/.test(name)) {
    return { platform: '服务端镜像', os: 'server', note: 'amd64 架构，使用 docker load 导入。', order: 8 }
  }
  if (/^Sena-Repo_Server_arm64_.+\.tar\.gz$/.test(name)) {
    return { platform: '服务端镜像', os: 'server', note: 'arm64 架构，使用 docker load 导入。', order: 9 }
  }
  return null
}

const currentRelease = computed<Release | null>(() => {
  if (channel.value === 'stable') return stable.value
  if (channel.value === 'beta') return beta.value
  return dev.value
})

const rows = computed<Row[]>(() => {
  const release = currentRelease.value
  if (!release) return []
  const list: Row[] = []
  for (const asset of release.assets) {
    const meta = classify(asset.name)
    if (!meta) continue
    if (osFilter.value !== 'all' && osFilter.value !== meta.os) continue
    list.push({
      platform: meta.platform,
      os: meta.os,
      file: asset.name,
      note: meta.note,
      url: asset.browser_download_url,
      size: formatSize(asset.size),
      order: meta.order
    })
  }
  return list.sort((a, b) => a.order - b.order)
})

const osFilters = [
  { value: 'all', label: '全部' },
  { value: 'windows', label: 'Windows' },
  { value: 'android', label: 'Android' },
  { value: 'linux', label: 'Linux' },
  { value: 'server', label: '服务端' }
]

const dockerTag = computed(() => channelConfig[channel.value].dockerTag)

const dockerPull = computed(() => `docker pull 404gcross/sena-repo:${dockerTag.value}`)

const dockerRun = computed(
  () =>
    `docker run -d \\\n` +
    `  --name sena-repo \\\n` +
    `  -p 11451:11451 \\\n` +
    `  -v /path/to/games:/games \\\n` +
    `  -v /path/to/data:/data \\\n` +
    `  -v /path/to/steam_patches:/steam_patch \\\n` +
    `  --restart unless-stopped \\\n` +
    `  404gcross/sena-repo:${dockerTag.value}`
)

const INSTALL_SCRIPT_URL =
  'https://raw.githubusercontent.com/404-GCross/Sena-Repo/main/server/install.sh'

const installCommand = computed(() => {
  const channelFlag = channel.value === 'stable' ? 'stable' : channel.value === 'beta' ? 'beta' : 'dev'
  return `curl -fsSL ${proxied(INSTALL_SCRIPT_URL)} | sudo bash -s -- --channel ${channelFlag}`
})

const copied = ref('')

function setChannel(c: string) {
  channel.value = c as Channel
}

const serverImageName = computed(() => {
  const release = currentRelease.value
  const asset = release?.assets.find((a) => /^Sena-Repo_Server_amd64_.+\.tar\.gz$/.test(a.name))
  return asset?.name || `Sena-Repo_Server_amd64_${release?.tag || 'vX.Y.Z'}.tar.gz`
})

async function copy(text: string, key: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = key
    setTimeout(() => {
      if (copied.value === key) copied.value = ''
    }, 1500)
  } catch {
    copied.value = ''
  }
}

function applyReleases(list: RawRelease[]) {
  stable.value = null
  beta.value = null
  dev.value = null
  for (const r of list) {
    const c = channelOf(r)
    if (c === 'stable' && !stable.value) stable.value = toRelease(r)
    if (c === 'beta' && !beta.value) beta.value = toRelease(r)
    if (c === 'dev' && !dev.value) dev.value = toRelease(r)
  }
  if (!stable.value && beta.value) channel.value = 'beta'
  if (!stable.value && !beta.value && dev.value) channel.value = 'dev'
}

function loadCache(): RawRelease[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.data)) return null
    if (Date.now() - parsed.ts > CACHE_TTL) return null
    return parsed.data
  } catch {
    return null
  }
}

function saveCache(data: RawRelease[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }))
  } catch {
    /* ignore */
  }
}

async function fetchReleases(force = false) {
  loading.value = true
  error.value = ''
  if (!force) {
    const cached = loadCache()
    if (cached) {
      applyReleases(cached)
      loading.value = false
      return
    }
  }
  try {
    const res = await fetch(API, {
      headers: { Accept: 'application/vnd.github+json' }
    })
    if (!res.ok) throw new Error(`GitHub API ${res.status}`)
    const data = (await res.json()) as RawRelease[]
    if (!Array.isArray(data)) throw new Error('unexpected response')
    saveCache(data)
    applyReleases(data)
  } catch (e) {
    error.value = '加载版本信息失败，可能是网络或 GitHub API 限流。'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  try {
    const saved = localStorage.getItem(MIRROR_KEY)
    if (saved && accelerators.some((a) => a.value === saved)) accelerator.value = saved
  } catch {
    /* ignore */
  }
  fetchReleases()
})
</script>

<template>
  <div class="sena-dl">
    <div v-if="loading" class="sena-dl-status">正在加载版本信息…</div>

    <div v-else-if="error" class="sena-dl-status sena-dl-error">
      <p>{{ error }}</p>
      <p>
        可以直接前往
        <a :href="RELEASES_URL" target="_blank" rel="noreferrer">GitHub Releases</a>
        下载。
      </p>
      <button class="sena-dl-btn" @click="fetchReleases(true)">重试</button>
    </div>

    <template v-else>
      <div class="sena-dl-channels">
        <button
          v-for="(cfg, key) in channelConfig"
          :key="key"
          class="sena-dl-channel"
          :class="{ active: channel === key }"
          @click="setChannel(key)"
        >
          <span class="sena-dl-channel-label">{{ cfg.label }}</span>
          <span class="sena-dl-channel-version">
            {{ (key === 'stable' ? stable : key === 'beta' ? beta : dev)?.tag || '暂无' }}
          </span>
        </button>
      </div>

      <div v-if="currentRelease" class="sena-dl-meta">
        <span>{{ channelConfig[channel].desc }}</span>
        <span>
          发布于 {{ formatDate(currentRelease.publishedAt) }} ·
          <a :href="currentRelease.url" target="_blank" rel="noreferrer">GitHub 发布页</a>
        </span>
      </div>
      <div v-else class="sena-dl-meta">
        <span>{{ channelConfig[channel].desc }} 当前没有该通道的发布，可在 <a :href="RELEASES_URL" target="_blank" rel="noreferrer">GitHub Releases</a> 查看全部版本。</span>
      </div>

      <div v-if="currentRelease" class="sena-dl-filters">
        <button
          v-for="f in osFilters"
          :key="f.value"
          class="sena-dl-chip"
          :class="{ active: osFilter === f.value }"
          @click="osFilter = f.value"
        >
          {{ f.label }}
        </button>
        <label class="sena-dl-mirror">
          <span class="sena-dl-mirror-label">GitHub 加速</span>
          <select
            v-model="accelerator"
            class="sena-dl-select"
            title="镜像为第三方服务，异常时请切回直连"
          >
            <option v-for="a in accelerators" :key="a.label" :value="a.value">
              {{ a.label }}
            </option>
          </select>
        </label>
      </div>
      <p v-if="currentRelease" class="sena-dl-mirror-note">
        镜像为第三方服务，异常时请切回直连；加速同时作用于下载直链与一键安装脚本。
      </p>

      <div v-if="currentRelease && rows.length" class="sena-dl-table-wrap">
        <table class="sena-dl-table">
          <thead>
            <tr>
              <th>平台</th>
              <th>文件</th>
              <th>说明</th>
              <th>下载</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.file">
              <td>{{ row.platform }}</td>
              <td class="sena-dl-file">{{ row.file }}</td>
              <td>{{ row.note }}</td>
              <td class="sena-dl-action">
                <a :href="proxied(row.url)">
                  {{ row.size ? `下载 (${row.size})` : '下载' }}
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else-if="currentRelease" class="sena-dl-status">
        当前通道在该平台下没有可下载的文件。
      </div>

      <h2 class="sena-dl-heading">服务端部署</h2>

      <h3>Docker 镜像</h3>
      <p>正式版使用 <code>latest</code>，测试版使用 <code>pre-release</code>，开发版使用 <code>dev</code>。</p>
      <div class="sena-dl-code">
        <button class="sena-dl-copy" @click="copy(dockerPull, 'pull')">
          {{ copied === 'pull' ? '已复制' : '复制' }}
        </button>
        <pre><code>{{ dockerPull }}</code></pre>
      </div>
      <div class="sena-dl-code">
        <button class="sena-dl-copy" @click="copy(dockerRun, 'run')">
          {{ copied === 'run' ? '已复制' : '复制' }}
        </button>
        <pre><code>{{ dockerRun }}</code></pre>
      </div>
      <p class="sena-dl-note">
        GHCR 备用地址：<code>ghcr.io/404-gcross/sena-repo:{{ dockerTag }}</code>；
        完整参数（环境变量、OpenList、刮削凭据等）见
        <a href="/server/">服务端部署</a>。
      </p>

      <h3>一键安装脚本</h3>
      <p>
        适合没有 Docker 的 Linux 设备，安装后会注册 <code>senacli</code> 维护命令；脚本会自动按当前通道选择源码
        ref（开发版 <code>main</code>、测试版最新 beta/rc tag、正式版最新稳定 tag），源码拉取失败时也会自动回退到镜像。
      </p>
      <div class="sena-dl-code">
        <button class="sena-dl-copy" @click="copy(installCommand, 'install')">
          {{ copied === 'install' ? '已复制' : '复制' }}
        </button>
        <pre><code>{{ installCommand }}</code></pre>
      </div>

      <h3>镜像归档</h3>
      <p>
        服务端镜像也提供 <code>tar.gz</code> 归档（见上方表格的「服务端」筛选），下载后导入：
      </p>
      <div class="sena-dl-code">
        <pre><code>docker load &lt; {{ serverImageName }}</code></pre>
      </div>
    </template>
  </div>
</template>

<style scoped>
.sena-dl {
  margin-top: 24px;
}

.sena-dl-status {
  margin: 16px 0;
  padding: 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
}

.sena-dl-error p {
  margin: 0 0 8px;
}

.sena-dl-channels {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 20px 0 12px;
}

.sena-dl-channel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  cursor: pointer;
  text-align: left;
  min-width: 0;
  transition: border-color 0.2s, background-color 0.2s;
}

.sena-dl-channel:hover {
  border-color: var(--vp-c-brand-1);
}

.sena-dl-channel.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.sena-dl-channel-label {
  font-weight: 600;
  color: var(--vp-c-text-1);
  white-space: nowrap;
}

.sena-dl-channel-version {
  overflow: hidden;
  font-size: 13px;
  color: var(--vp-c-text-2);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sena-dl-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 16px;
  color: var(--vp-c-text-2);
  font-size: 14px;
}

.sena-dl-mirror {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.sena-dl-select {
  padding: 5px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 14px;
  cursor: pointer;
}

.sena-dl-select:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.sena-dl-mirror-note {
  margin: 0 0 14px;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.sena-dl-btn {
  padding: 6px 16px;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-brand-1);
  cursor: pointer;
}

.sena-dl-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.sena-dl-chip {
  padding: 5px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: var(--vp-c-bg-soft);
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
}

.sena-dl-chip:hover {
  border-color: var(--vp-c-brand-1);
}

.sena-dl-chip.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.sena-dl-table-wrap {
  overflow-x: auto;
  margin-bottom: 24px;
}

.sena-dl-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.sena-dl-table th,
.sena-dl-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--vp-c-divider);
  text-align: left;
  vertical-align: top;
}

.sena-dl-table th {
  color: var(--vp-c-text-2);
  font-weight: 600;
  white-space: nowrap;
}

.sena-dl-file {
  word-break: break-all;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
}

.sena-dl-action {
  white-space: nowrap;
}

.sena-dl-heading {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid var(--vp-c-divider);
}

.sena-dl-code {
  position: relative;
  margin: 12px 0;
}

.sena-dl-code pre {
  margin: 0;
  padding: 14px 16px;
  overflow-x: auto;
  border-radius: 8px;
  background: var(--vp-code-block-bg);
}

.sena-dl-code code {
  font-size: 13px;
}

.sena-dl-copy {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 12px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  opacity: 0.85;
}

.sena-dl-copy:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-3);
}

.sena-dl-note {
  color: var(--vp-c-text-2);
  font-size: 14px;
}

@media (max-width: 720px) {
  .sena-dl-meta {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .sena-dl-channel {
    padding: 8px 10px;
  }

  .sena-dl-channel-version {
    font-size: 11px;
  }
}
</style>
