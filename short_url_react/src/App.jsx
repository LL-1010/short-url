import { useState } from 'react'
import axios from 'axios'

function App() {
  const [longUrl, setLongUrl] = useState('')
  const [shortUrl, setShortUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [batchUrls, setBatchUrls] = useState('')
  const [batchResults, setBatchResults] = useState([])
  const [isBatchLoading, setIsBatchLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const API_BASE_URL = 'http://localhost:8000'

  const generateShortUrl = async () => {
    setErrorMsg('')
    setSuccessMsg('')
    setShortUrl('')

    if (!longUrl.trim()) {
      setErrorMsg('请输入网址')
      return
    }

    setIsLoading(true)

    try {
      const response = await axios.post(`${API_BASE_URL}/shorten`, null, {
        params: { long_url: longUrl }
      })
      setShortUrl(response.data.short_url)
      setSuccessMsg('生成成功！')
    } catch (error) {
      setErrorMsg(error.response?.data?.detail || '请求失败')
    } finally {
      setIsLoading(false)
    }
  }

  const batchShorten = async () => {
    setErrorMsg('')
    setSuccessMsg('')
    setBatchResults([])

    const urls = batchUrls
      .split('\n')
      .map(u => u.trim())
      .filter(u => u && (u.startsWith('http://') || u.startsWith('https://')))

    if (urls.length === 0) {
      setErrorMsg('请输入至少一个有效网址')
      return
    }

    setIsBatchLoading(true)

    try {
      const response = await axios.post(`${API_BASE_URL}/batch_shorten`, {
        urls: urls
      })
      setBatchResults(response.data.results)
      setSuccessMsg(`批量生成完成！成功 ${response.data.success} 个，失败 ${response.data.failed} 个`)
    } catch (error) {
      setErrorMsg(error.response?.data?.detail || '批量请求失败')
    } finally {
      setIsBatchLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl)
      setSuccessMsg('已复制到剪贴板！')
      setTimeout(() => setSuccessMsg(''), 2000)
    } catch (err) {
      setErrorMsg('复制失败')
    }
  }

  const clearBatch = () => {
    setBatchUrls('')
    setBatchResults([])
  }

  return (
    <div style={{ maxWidth: '900px', margin: '30px auto', padding: '30px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '20px' }}>
      <h1 style={{ textAlign: 'center', color: 'white', marginBottom: '30px' }}>🔗 短链接生成器</h1>

      <div style={{ background: 'white', borderRadius: '15px', padding: '20px', marginBottom: '25px' }}>
        <h2 style={{ marginTop: 0, marginBottom: '15px' }}>📝 单链接生成</h2>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={longUrl}
            onChange={(e) => setLongUrl(e.target.value)}
            placeholder="请输入长网址，例如：https://www.baidu.com"
            style={{ flex: 1, padding: '12px 15px', fontSize: '16px', border: '1px solid #ddd', borderRadius: '8px' }}
          />
          <button
            onClick={generateShortUrl}
            disabled={isLoading}
            style={{ padding: '12px 25px', fontSize: '16px', fontWeight: 'bold', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            {isLoading ? '生成中...' : '生成短链接'}
          </button>
        </div>

        {shortUrl && (
          <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '15px', marginTop: '15px' }}>
            <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>生成的短链接：</p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <code style={{ flex: 1, background: 'white', padding: '10px', borderRadius: '6px', wordBreak: 'break-all', color: '#42b983' }}>{shortUrl}</code>
              <button onClick={copyToClipboard} style={{ padding: '8px 20px', background: '#42b983', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>复制</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ background: 'white', borderRadius: '15px', padding: '20px', marginBottom: '25px' }}>
        <h2 style={{ marginTop: 0, marginBottom: '15px' }}>⚡ 批量生成（多线程加速）</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <textarea
            value={batchUrls}
            onChange={(e) => setBatchUrls(e.target.value)}
            placeholder="每行输入一个网址，例如：&#10;https://www.baidu.com&#10;https://www.google.com"
            rows="5"
            style={{ width: '100%', padding: '12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '8px', fontFamily: 'monospace' }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={batchShorten}
              disabled={isBatchLoading}
              style={{ padding: '12px 25px', fontSize: '16px', fontWeight: 'bold', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              {isBatchLoading ? `批量生成中... (${batchResults.length})` : '批量生成（多线程）'}
            </button>
            <button onClick={clearBatch} style={{ padding: '12px 25px', fontSize: '16px', fontWeight: 'bold', background: '#999', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>清空</button>
          </div>
        </div>

        {batchResults.length > 0 && (
          <div style={{ marginTop: '20px', maxHeight: '300px', overflowY: 'auto', borderTop: '1px solid #eee', paddingTop: '15px' }}>
            <div style={{ padding: '10px', background: '#e8f5e9', borderRadius: '8px', marginBottom: '15px', fontWeight: 'bold', color: '#2e7d32' }}>
              ✅ 成功: {batchResults.filter(r => r.status !== 'failed').length} &nbsp;|&nbsp; ❌ 失败: {batchResults.filter(r => r.status === 'failed').length}
            </div>
            {batchResults.map((result, index) => (
              <div key={index} style={{ padding: '10px', borderBottom: '1px solid #eee', fontSize: '13px' }}>
                <div style={{ color: '#666', marginBottom: '5px', wordBreak: 'break-all' }}>{result.long_url}</div>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', color: result.status === 'failed' ? '#c62828' : '#42b983' }}>
                  {result.status === 'failed' ? `❌ 失败: ${result.error}` : `🔗 ${result.short_url} (${result.status === 'exists' ? '已存在' : '新生成'})`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {errorMsg && <div style={{ background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '8px', marginTop: '15px', textAlign: 'center' }}>❌ {errorMsg}</div>}
      {successMsg && <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '12px', borderRadius: '8px', marginTop: '15px', textAlign: 'center' }}>✅ {successMsg}</div>}
    </div>
  )
}

export default App