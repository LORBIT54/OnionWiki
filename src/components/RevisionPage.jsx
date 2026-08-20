import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Article from './Article'
import { fetchRevision } from '../lib/wikiApi'

export default function RevisionPage() {
  const { id, revId } = useParams()
  const [snapshot, setSnapshot] = useState(null)
  const [savedAt, setSavedAt] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const row = await fetchRevision(revId)
        if (cancelled) return
        if (!row || row.doc.id !== id) {
          setError('기록을 찾을 수 없습니다.')
          return
        }
        setSnapshot(row.doc)
        setSavedAt(row.createdAt)
      } catch (err) {
        if (!cancelled) setError(err.message || '기록을 불러오지 못했습니다.')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, revId])

  if (error) {
    return (
      <article className="wiki-article">
        <p className="wiki-error">{error}</p>
      </article>
    )
  }

  if (!snapshot) {
    return (
      <article className="wiki-article">
        <p>불러오는 중...</p>
      </article>
    )
  }

  return <Article key={revId} docId={id} readOnly snapshot={snapshot} savedAt={savedAt} />
}
