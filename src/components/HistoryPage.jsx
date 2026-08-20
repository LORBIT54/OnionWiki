import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchDocument, formatTime, isSupabaseConfigured, listRevisions } from '../lib/wikiApi'

export default function HistoryPage() {
  const { id } = useParams()
  const [title, setTitle] = useState('')
  const [revs, setRevs] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = '역사 - OnionWiki'
    let cancelled = false
    async function load() {
      if (!isSupabaseConfigured) {
        setError('Supabase 설정이 없습니다.')
        return
      }
      try {
        const [{ doc }, rows] = await Promise.all([fetchDocument(id), listRevisions(id)])
        if (cancelled) return
        setTitle(doc?.title || '문서')
        setRevs(rows)
        document.title = `${doc?.title || '문서'} (역사) - OnionWiki`
      } catch (err) {
        if (!cancelled) setError(err.message || '역사를 불러오지 못했습니다. supabase/history.sql을 실행해 주세요.')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <article className="wiki-article">
      <h1>{title}의 역사</h1>
      <p className="modified">
        수정이 완료될 때마다 버전이 쌓입니다.{' '}
        <Link to={`/w/${id}`}>현재 문서로</Link>
      </p>
      {error && <p className="wiki-error">{error}</p>}
      {!error && revs.length === 0 && <p>아직 저장된 기록이 없습니다. 문서를 수정한 뒤 완료를 누르면 여기에 남습니다.</p>}
      <ol className="history-list">
        {revs.map((rev, index) => (
          <li key={rev.id}>
            <Link to={`/w/${id}/r/${rev.id}`}>
              <span className="history-index">r{revs.length - index}</span>
              <span className="history-title">{rev.title || '(제목 없음)'}</span>
            </Link>
            <time>{formatTime(rev.created_at)}</time>
          </li>
        ))}
      </ol>
    </article>
  )
}
