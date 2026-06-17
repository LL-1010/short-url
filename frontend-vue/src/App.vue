<template>
  <div class="container">
    <h1>🔗 短链接生成器</h1>

    <!-- ========== 单链接模式 ========== -->
    <div class="section">
      <h2>📝 单链接生成</h2>
      <div class="input-group">
        <input
          type="text"
          v-model="longUrl"
          placeholder="请输入长网址，例如：https://www.baidu.com"
          class="url-input"
        />
        <button @click="generateShortUrl" :disabled="isLoading" class="generate-btn">
          {{ isLoading ? '生成中...' : '生成短链接' }}
        </button>
      </div>
      <div v-if="shortUrl" class="result-group">
        <p class="result-label">生成的短链接：</p>
        <div class="result-box">
          <code class="short-url">{{ shortUrl }}</code>
          <button @click="copyToClipboard" class="copy-btn">复制</button>
        </div>
      </div>
    </div>

    <!-- ========== 批量生成模式（多线程） ========== -->
    <div class="section">
      <h2>⚡ 批量生成（多线程加速）</h2>
      <div class="batch-input-group">
        <textarea
          v-model="batchUrls"
          placeholder="每行输入一个网址，例如：&#10;https://www.baidu.com&#10;https://www.google.com&#10;https://www.github.com"
          class="batch-textarea"
          rows="5"
        ></textarea>
        <div class="batch-actions">
          <button @click="batchShorten" :disabled="isBatchLoading" class="batch-btn">
            {{ isBatchLoading ? `批量生成中... (${batchResults.length}/${totalUrls})` : '批量生成（多线程）' }}
          </button>
          <button @click="clearBatch" class="clear-btn">清空</button>
        </div>
      </div>

      <!-- 批量结果展示 -->
      <div v-if="batchResults.length > 0" class="batch-results">
        <div class="batch-summary">
          ✅ 成功: {{ successCount }} &nbsp;|&nbsp; ❌ 失败: {{ failedCount }}
        </div>
        <div v-for="(result, index) in batchResults" :key="index" class="result-item">
          <div class="result-long">{{ truncateUrl(result.long_url, 60) }}</div>
          <div class="result-short" :class="{ 'result-error': result.status === 'failed' }">
            <span v-if="result.status === 'created'">✨ {{ result.short_url }}</span>
            <span v-else-if="result.status === 'exists'">📌 {{ result.short_url }}（已存在）</span>
            <span v-else>❌ 失败: {{ result.error }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 提示信息 -->
    <div v-if="errorMsg" class="error-msg">❌ {{ errorMsg }}</div>
    <div v-if="successMsg" class="success-msg">✅ {{ successMsg }}</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'

// 单链接相关
const longUrl = ref('')
const shortUrl = ref('')
const isLoading = ref(false)

// 批量相关
const batchUrls = ref('')
const isBatchLoading = ref(false)
const batchResults = ref([])

const errorMsg = ref('')
const successMsg = ref('')

// 计算属性
const totalUrls = computed(() => {
  return batchUrls.value.split('\n').filter(u => u.trim() && (u.trim().startsWith('http://') || u.trim().startsWith('https://'))).length
})

const successCount = computed(() => {
  return batchResults.value.filter(r => r.status !== 'failed').length
})

const failedCount = computed(() => {
  return batchResults.value.filter(r => r.status === 'failed').length
})

const API_BASE_URL = 'http://localhost:8000'

// 单链接生成
async function generateShortUrl() {
  errorMsg.value = ''
  successMsg.value = ''

  if (!longUrl.value.trim()) {
    errorMsg.value = '请输入网址'
    return
  }

  isLoading.value = true

  try {
    const response = await axios.post(`${API_BASE_URL}/shorten`, null, {
      params: { long_url: longUrl.value }
    })
    shortUrl.value = response.data.short_url
    successMsg.value = '生成成功！'
  } catch (error) {
    errorMsg.value = error.response?.data?.detail || '请求失败'
  } finally {
    isLoading.value = false
  }
}

// 批量生成（多线程）
async function batchShorten() {
  errorMsg.value = ''
  successMsg.value = ''
  batchResults.value = []

  const urls = batchUrls.value
    .split('\n')
    .map(u => u.trim())
    .filter(u => u && (u.startsWith('http://') || u.startsWith('https://')))

  if (urls.length === 0) {
    errorMsg.value = '请输入至少一个有效网址'
    return
  }

  if (urls.length > 50) {
    errorMsg.value = '一次最多处理50个网址'
    return
  }

  isBatchLoading.value = true

  try {
    const response = await axios.post(`${API_BASE_URL}/batch_shorten`, {
      urls: urls
    })
    batchResults.value = response.data.results
    successMsg.value = `批量生成完成！成功 ${response.data.success} 个，失败 ${response.data.failed} 个`
  } catch (error) {
    errorMsg.value = error.response?.data?.detail || '批量请求失败'
  } finally {
    isBatchLoading.value = false
  }
}

function clearBatch() {
  batchUrls.value = ''
  batchResults.value = []
}

function truncateUrl(url, maxLen) {
  if (url.length <= maxLen) return url
  return url.substring(0, maxLen) + '...'
}

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(shortUrl.value)
    successMsg.value = '已复制到剪贴板！'
    setTimeout(() => {
      successMsg.value = ''
    }, 2000)
  } catch (err) {
    errorMsg.value = '复制失败'
  }
}
</script>

<style scoped>
.container {
  max-width: 900px;
  margin: 30px auto;
  padding: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

h1 {
  text-align: center;
  color: white;
  margin-bottom: 30px;
}

.section {
  background: white;
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 25px;
}

.section h2 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
  font-size: 18px;
}

.input-group {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.url-input, .batch-textarea {
  width: 100%;
  padding: 12px 15px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  outline: none;
  box-sizing: border-box;
}

.url-input:focus, .batch-textarea:focus {
  border-color: #667eea;
}

.batch-textarea {
  font-family: monospace;
  resize: vertical;
}

.generate-btn, .batch-btn, .clear-btn {
  padding: 12px 25px;
  font-size: 16px;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.generate-btn, .batch-btn {
  background: #ff6b6b;
  color: white;
}

.generate-btn:hover:not(:disabled),
.batch-btn:hover:not(:disabled) {
  background: #ff5252;
  transform: translateY(-2px);
}

.generate-btn:disabled,
.batch-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.clear-btn {
  background: #999;
  color: white;
}

.clear-btn:hover {
  background: #777;
}

.batch-input-group {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.batch-actions {
  display: flex;
  gap: 10px;
}

.batch-results {
  margin-top: 20px;
  max-height: 300px;
  overflow-y: auto;
  border-top: 1px solid #eee;
  padding-top: 15px;
}

.batch-summary {
  padding: 10px;
  background: #e8f5e9;
  border-radius: 8px;
  margin-bottom: 15px;
  font-weight: bold;
  color: #2e7d32;
}

.result-item {
  padding: 10px;
  border-bottom: 1px solid #eee;
  font-size: 13px;
}

.result-long {
  color: #666;
  margin-bottom: 5px;
  word-break: break-all;
}

.result-short {
  font-family: monospace;
  font-size: 12px;
  color: #42b983;
}

.result-error {
  color: #c62828;
}

.result-group {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 15px;
  margin-top: 15px;
}

.result-label {
  margin-bottom: 10px;
  font-weight: bold;
  color: #333;
}

.result-box {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.short-url {
  flex: 1;
  background: white;
  padding: 10px;
  border-radius: 6px;
  font-family: monospace;
  word-break: break-all;
  color: #42b983;
  border: 1px solid #ddd;
}

.copy-btn {
  padding: 8px 20px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.copy-btn:hover {
  background: #359268;
}

.error-msg {
  background: #ffebee;
  color: #c62828;
  padding: 12px;
  border-radius: 8px;
  margin-top: 15px;
  text-align: center;
}

.success-msg {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 12px;
  border-radius: 8px;
  margin-top: 15px;
  text-align: center;
}
</style>
