import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatTime, isSupabaseConfigured, listRecentDocuments } from '../lib/wikiApi'

export default function RecentPage() {
  const [docs, setDocs] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = '최근 변경 - OnionWiki'
    let cancelled = false
    async function load() {
      if (!isSupabaseConfigured) {
        setError('Supabase 설정이 없습니다.')
        return
      }
      try {
        const rows = await listRecentDocuments()
        if (!cancelled) setDocs(rows)
      } catch (err) {
        if (!cancelled) setError(err.message || '목록을 불러오지 못했습니다.')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <article className="wiki-article">
      <h1>최근 변경</h1>
      <p className="modified">제목이 있는 문서를 최신 수정 순으로 보여 줍니다.</p>
      {error && <p className="wiki-error">{error}</p>}
      {!error && docs.length === 0 && <p>아직 저장된 문서가 없습니다. 새 문서를 만들어 보세요.</p>}
      <ul className="doc-list">
        {docs.map((doc) => (
          <li key={doc.id}>
            <Link to={`/w/${doc.id}`}>{doc.title}</Link>
            <time>{formatTime(doc.updated_at)}</time>
          </li>
        ))}
      </ul>
    </article>
  )
}
