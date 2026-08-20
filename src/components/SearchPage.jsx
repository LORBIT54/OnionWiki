import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatTime, isSupabaseConfigured, searchDocuments } from '../lib/wikiApi'

export default function SearchPage() {
  const [params] = useSearchParams()
  const query = params.get('q') || ''
  const [docs, setDocs] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = `검색: ${query} - OnionWiki`
    let cancelled = false
    async function load() {
      if (!query.trim()) {
        setDocs([])
        return
      }
      if (!isSupabaseConfigured) {
        setError('Supabase 설정이 없습니다.')
        return
      }
      try {
        const rows = await searchDocuments(query)
        if (!cancelled) {
          setDocs(rows)
          setError('')
        }
      } catch (err) {
        if (!cancelled) setError(err.message || '검색에 실패했습니다.')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [query])

  return (
    <article className="wiki-article">
      <h1>검색 결과</h1>
      <p className="modified">
        &quot;{query}&quot; 제목 검색{docs.length ? ` · ${docs.length}건` : ''}
      </p>
      {error && <p className="wiki-error">{error}</p>}
      {!error && query && docs.length === 0 && <p>일치하는 문서가 없습니다.</p>}
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
