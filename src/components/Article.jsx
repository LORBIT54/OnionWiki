import { useEffect, useRef, useState } from 'react'
import {
  StarIcon,
  PencilIcon,
  ChatIcon,
  HistoryIcon,
  MoreIcon,
  ChevronIcon,
} from './icons'
import {
  EMPTY_DOC,
  fetchDocument,
  isSupabaseConfigured,
  saveDocument,
  savePhoto,
  uploadPhoto,
} from '../lib/wikiApi'

const SECTIONS = [
  { id: 's1', num: 1, title: '개요' },
  { id: 's2', num: 2, title: '상세' },
  { id: 's3', num: 3, title: '논란 및 사건사고' },
  { id: 's4', num: 4, title: '여담' },
]

function formatTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function WikiBody({ text }) {
  if (!text?.trim()) return <div className="section-body" />
  return <div className="section-body wiki-text">{text}</div>
}

function EditActions({ onDone, saving }) {
  return (
    <div className="edit-actions">
      <button type="button" className="done-btn" onClick={onDone} disabled={saving}>
        {saving ? '저장 중...' : '완료'}
      </button>
    </div>
  )
}

export default function Article() {
  const fileRef = useRef(null)
  const [tocOpen, setTocOpen] = useState(true)
  const [doc, setDoc] = useState(EMPTY_DOC)
  const [modified, setModified] = useState('-')
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(EMPTY_DOC)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!isSupabaseConfigured) {
        setError('Supabase 설정이 없습니다. .env.local에 URL과 anon 키를 넣어 주세요.')
        return
      }
      try {
        const { doc: next, updatedAt } = await fetchDocument()
        if (cancelled) return
        setDoc(next)
        setModified(formatTime(updatedAt))
        document.title = next.title ? `${next.title} - OnionWiki` : 'OnionWiki'
      } catch (err) {
        if (!cancelled) setError(err.message || '문서를 불러오지 못했습니다.')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  function startSectionEdit(id) {
    setDraft({
      ...doc,
      bodies: { ...doc.bodies },
      infobox: { ...doc.infobox },
    })
    setEditing(id)
    setError('')
  }

  function startFullEdit() {
    setDraft({
      ...doc,
      bodies: { ...doc.bodies },
      infobox: { ...doc.infobox },
    })
    setEditing('all')
    setError('')
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const next = {
        ...draft,
        photoUrl: doc.photoUrl,
        photoPath: doc.photoPath,
      }
      const updatedAt = await saveDocument(next)
      setDoc(next)
      setModified(formatTime(updatedAt))
      document.title = next.title ? `${next.title} - OnionWiki` : 'OnionWiki'
      setEditing(null)
    } catch (err) {
      setError(err.message || '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function onPhotoSelected(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const photo = await uploadPhoto(file, doc.photoPath)
      const updatedAt = await savePhoto(photo.photoUrl, photo.photoPath)
      setDoc((prev) => ({ ...prev, ...photo }))
      setDraft((prev) => ({ ...prev, ...photo }))
      setModified(formatTime(updatedAt))
    } catch (err) {
      setError(err.message || '사진 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const fullEdit = editing === 'all'
  const photoUrl = doc.photoUrl

  return (
    <article className="wiki-article">
      {error && <p className="wiki-error">{error}</p>}

      <header className="article-head">
        <div className="title-wrap">
          {fullEdit ? (
            <input
              className="title-input"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="제목"
              aria-label="제목"
            />
          ) : (
            <h1>{doc.title || '\u00a0'}</h1>
          )}
          <p className="modified">최근 수정 시각: {modified}</p>
        </div>
        <div className="article-tools">
          <button type="button" className="tool-btn" tabIndex={-1}>
            <StarIcon />
            0
          </button>
          <button
            type="button"
            className={`tool-btn${fullEdit ? ' tool-btn-active' : ''}`}
            onClick={startFullEdit}
          >
            <PencilIcon />
            편집
          </button>
          <button type="button" className="tool-btn" tabIndex={-1}>
            <ChatIcon />
            토론
          </button>
          <button type="button" className="tool-btn" tabIndex={-1}>
            <HistoryIcon />
            역사
          </button>
          <button type="button" className="tool-btn more-btn" aria-label="더 보기" tabIndex={-1}>
            <MoreIcon />
          </button>
        </div>
      </header>

      <aside className="infobox person-infobox">
        <table>
          <tbody>
            <tr>
              <td colSpan={2} className="infobox-photo">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={onPhotoSelected}
                />
                <button
                  type="button"
                  className="photo-box"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  aria-label={photoUrl ? '사진 변경' : '사진 추가'}
                >
                  {photoUrl ? (
                    <img src={photoUrl} alt="프로필 사진" />
                  ) : (
                    <span className="photo-placeholder-text">{uploading ? '올리는 중...' : '사진'}</span>
                  )}
                  <span className="photo-overlay">{uploading ? '올리는 중...' : photoUrl ? '사진 변경' : '사진 추가'}</span>
                </button>
              </td>
            </tr>
            {[
              ['이름', 'name'],
              ['나이', 'age'],
              ['종족', 'race'],
              ['직군', 'job'],
              ['웹사이트', 'website'],
            ].map(([label, key]) => (
              <tr key={key}>
                <th>{label}</th>
                <td>
                  {fullEdit ? (
                    <input
                      className="cell-input"
                      value={draft.infobox[key]}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          infobox: { ...draft.infobox, [key]: e.target.value },
                        })
                      }
                    />
                  ) : key === 'website' && doc.infobox.website ? (
                    <a href={doc.infobox.website} target="_blank" rel="noreferrer">
                      {doc.infobox.website}
                    </a>
                  ) : (
                    doc.infobox[key] || '\u00a0'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </aside>

      <nav className="toc" id="toc">
        <button type="button" className="toc-toggle" onClick={() => setTocOpen((v) => !v)}>
          목차
          <ChevronIcon />
        </button>
        {tocOpen && (
          <ol>
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>
                  {section.num}. {section.title}
                </a>
              </li>
            ))}
          </ol>
        )}
      </nav>

      {SECTIONS.map((section) => {
        const isSectionEdit = editing === section.id
        const showEditor = fullEdit || isSectionEdit
        return (
          <section key={section.id}>
            <h2 id={section.id} className="wiki-h2">
              <span>
                <a href={`#${section.id}`} className="heading-num">
                  {section.num}.
                </a>{' '}
                {section.title}
              </span>
              {!fullEdit && (
                <button type="button" className="edit-section" onClick={() => startSectionEdit(section.id)}>
                  [편집]
                </button>
              )}
            </h2>
            {showEditor ? (
              <>
                <textarea
                  className="section-editor"
                  value={draft.bodies[section.id]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      bodies: { ...draft.bodies, [section.id]: e.target.value },
                    })
                  }
                  placeholder={`${section.title} 내용을 입력하세요`}
                  rows={fullEdit ? 8 : 10}
                />
                {isSectionEdit && <EditActions onDone={save} saving={saving} />}
              </>
            ) : (
              <WikiBody text={doc.bodies[section.id]} />
            )}
          </section>
        )
      })}

      {fullEdit && <EditActions onDone={save} saving={saving} />}

      <section className="license-box">
        <p>
          이 저작물은 <a href="https://creativecommons.org/licenses/by-nc-sa/2.0/kr/">CC BY-NC-SA 2.0 KR</a>에 따라
          이용할 수 있습니다. (단, 라이선스가 명시된 일부 문서 및 삽화 제외) 기여하신 문서의 저작권은 각 기여자에게
          있으며, 각 기여자는 기여하신 부분의 저작권을 갖습니다.
        </p>
        <p>
          OnionWiki는 백과사전이 아니며 검증되지 않았거나, 편향적이거나, 잘못된 서술이 있을 수 있습니다. OnionWiki는
          위키위키입니다. 여러분이 직접 문서를 고칠 수 있으며, 다른 사용자의 의견을 원할 경우 토론 기능을 이용할 수
          있습니다.
        </p>
      </section>
    </article>
  )
}
