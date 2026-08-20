import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
  fetchDocumentByTitle,
  fetchDocumentsByTitles,
  formatTime,
  isSupabaseConfigured,
  saveDocument,
  savePhoto,
  uploadPhoto,
} from '../lib/wikiApi'
import { appendImage, cloneBodies, normalizeSection, pruneBodies, sectionHasContent } from '../lib/bodyBlocks'
import { collectLinkTitles, parseWikiText } from '../lib/wikiLinks'
import SectionEditor from './SectionEditor'

const SECTIONS = [
  { id: 's1', num: 1, title: '개요' },
  { id: 's2', num: 2, title: '상세' },
  { id: 's3', num: 3, title: '논란 및 사건사고' },
  { id: 's4', num: 4, title: '여담' },
]

function WikiText({ text, ids, loaded, onOpenLink }) {
  const parts = useMemo(() => parseWikiText(text), [text])
  if (!text) return null
  return (
    <div className="wiki-text">
      {parts.map((part, index) => {
        if (part.type !== 'link') return <span key={index}>{part.value}</span>
        const docId = ids[part.title]
        const missing = loaded && !docId
        return (
          <Link
            key={index}
            to={docId ? `/w/${docId}` : `/new?title=${encodeURIComponent(part.title)}`}
            className={`wiki-link${missing ? ' wiki-link-missing' : ''}`}
            title={missing ? `'${part.title}' 문서 만들기` : part.title}
            onClick={(event) => onOpenLink(event, part.title, docId)}
          >
            {part.label}
          </Link>
        )
      })}
    </div>
  )
}

function WikiSection({ blocks }) {
  const navigate = useNavigate()
  const normalized = useMemo(() => normalizeSection(blocks), [blocks])
  const titles = useMemo(() => {
    const found = []
    for (const block of normalized) {
      if (block.type === 'text') found.push(...collectLinkTitles(parseWikiText(block.value)))
    }
    return [...new Set(found)]
  }, [normalized])
  const titleKey = titles.join('\0')
  const [ids, setIds] = useState({})
  const [loaded, setLoaded] = useState(!titles.length)

  useEffect(() => {
    const lookupTitles = titleKey ? titleKey.split('\0') : []
    let cancelled = false
    async function load() {
      if (!lookupTitles.length) {
        setIds({})
        setLoaded(true)
        return
      }
      setLoaded(false)
      if (!isSupabaseConfigured) {
        setIds({})
        setLoaded(true)
        return
      }
      try {
        const rows = await fetchDocumentsByTitles(lookupTitles)
        if (cancelled) return
        const next = {}
        for (const title of lookupTitles) next[title] = null
        for (const row of rows) {
          if (row?.title) next[row.title] = row.id
        }
        setIds(next)
      } catch {
        if (!cancelled) setIds({})
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [titleKey])

  async function openLink(event, title, docId) {
    if (docId) return
    if (loaded && title in ids) return
    event.preventDefault()
    try {
      const row = await fetchDocumentByTitle(title)
      navigate(row?.id ? `/w/${row.id}` : `/new?title=${encodeURIComponent(title)}`)
    } catch {
      navigate(`/new?title=${encodeURIComponent(title)}`)
    }
  }

  if (!sectionHasContent(normalized)) return <div className="section-body" />

  return (
    <div className="section-body">
      {normalized.map((block, index) =>
        block.type === 'image' ? (
          <figure key={block.id || `${block.url}-${index}`} className="body-photo">
            <img src={block.url} alt="" />
          </figure>
        ) : (
          <WikiText key={`text-${index}`} text={block.value} ids={ids} loaded={loaded} onOpenLink={openLink} />
        ),
      )}
    </div>
  )
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

export default function Article({ docId, isNew = false, readOnly = false, snapshot = null, savedAt = null }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const presetTitle = isNew ? (params.get('title') || '').trim() : ''
  const fileRef = useRef(null)
  const bodyFileRef = useRef(null)
  const bodySectionRef = useRef(null)
  const [tocOpen, setTocOpen] = useState(true)
  const [doc, setDoc] = useState(EMPTY_DOC)
  const [modified, setModified] = useState('-')
  const [editing, setEditing] = useState(isNew ? 'all' : null)
  const [draft, setDraft] = useState(EMPTY_DOC)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingSection, setUploadingSection] = useState('')
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (snapshot) {
        setDoc(snapshot)
        setDraft(snapshot)
        setEditing(null)
        setModified(formatTime(savedAt))
        setError('')
        setNotFound(false)
        document.title = `${snapshot.title || '기록'} - OnionWiki`
        return
      }
      if (isNew) {
        const start = {
          ...EMPTY_DOC,
          title: presetTitle,
          infobox: { ...EMPTY_DOC.infobox },
          bodies: cloneBodies(EMPTY_DOC.bodies),
        }
        setDoc(start)
        setDraft(start)
        setEditing('all')
        setModified('-')
        setError('')
        setNotFound(false)
        document.title = presetTitle ? `${presetTitle} - OnionWiki` : '새 문서 - OnionWiki'
        return
      }
      if (!isSupabaseConfigured) {
        setError('Supabase 설정이 없습니다. .env.local에 URL과 anon 키를 넣어 주세요.')
        return
      }
      try {
        const { doc: next, updatedAt } = await fetchDocument(docId)
        if (cancelled) return
        if (!next) {
          setNotFound(true)
          setError('문서를 찾을 수 없습니다.')
          return
        }
        setNotFound(false)
        setDoc(next)
        setDraft(next)
        setModified(formatTime(updatedAt))
        setEditing(null)
        setError('')
        document.title = next.title ? `${next.title} - OnionWiki` : 'OnionWiki'
      } catch (err) {
        if (!cancelled) setError(err.message || '문서를 불러오지 못했습니다.')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [docId, isNew, snapshot, savedAt, presetTitle])

  function startSectionEdit(id) {
    setDraft({
      ...doc,
      bodies: cloneBodies(doc.bodies),
      infobox: { ...doc.infobox },
    })
    setEditing(id)
    setError('')
  }

  function startFullEdit() {
    setDraft({
      ...doc,
      bodies: cloneBodies(doc.bodies),
      infobox: { ...doc.infobox },
    })
    setEditing('all')
    setError('')
  }

  function setSectionBlocks(sectionId, blocks) {
    setDraft((prev) => ({
      ...prev,
      bodies: { ...prev.bodies, [sectionId]: blocks },
    }))
  }

  function startBodyPhoto(sectionId) {
    if (readOnly) return
    if (editing !== 'all' && editing !== sectionId) return
    bodySectionRef.current = sectionId
    bodyFileRef.current?.click()
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const next = {
        ...draft,
        id: doc.id,
        photoUrl: doc.photoUrl,
        photoPath: doc.photoPath,
      }
      const result = await saveDocument(next)
      const saved = {
        ...next,
        id: result.id,
        title: next.title.trim(),
        bodies: pruneBodies(next.bodies),
      }
      setDoc(saved)
      setDraft(saved)
      setModified(formatTime(result.updatedAt))
      document.title = `${saved.title} - OnionWiki`
      setEditing(null)
      if (isNew || docId !== result.id) {
        navigate(`/w/${result.id}`, { replace: true })
      }
    } catch (err) {
      if (err.code === '23505' || /duplicate/i.test(err.message || '')) {
        setError('같은 제목의 문서가 이미 있습니다.')
      } else {
        setError(err.message || '저장에 실패했습니다.')
      }
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
      const photo = await uploadPhoto(file, doc.id, doc.photoPath)
      if (doc.id) {
        const updatedAt = await savePhoto(doc.id, photo.photoUrl, photo.photoPath)
        setModified(formatTime(updatedAt))
      }
      setDoc((prev) => ({ ...prev, ...photo }))
      setDraft((prev) => ({ ...prev, ...photo }))
    } catch (err) {
      setError(err.message || '사진 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  async function onBodyPhotoSelected(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    const sectionId = bodySectionRef.current
    if (!file || !sectionId) return
    setUploadingSection(sectionId)
    setError('')
    try {
      const photo = await uploadPhoto(file, doc.id || draft.id)
      const image = {
        id: crypto.randomUUID(),
        url: photo.photoUrl,
        path: photo.photoPath,
      }
      setDraft((prev) => ({
        ...prev,
        bodies: {
          ...prev.bodies,
          [sectionId]: appendImage(prev.bodies[sectionId], image),
        },
      }))
      if (editing !== 'all' && editing !== sectionId) {
        setEditing(sectionId)
      }
    } catch (err) {
      setError(err.message || '사진 업로드에 실패했습니다.')
    } finally {
      setUploadingSection('')
    }
  }

  const fullEdit = editing === 'all'
  const photoUrl = doc.photoUrl

  if (notFound) {
    return (
      <article className="wiki-article">
        <p className="wiki-error">문서를 찾을 수 없습니다.</p>
      </article>
    )
  }

  return (
    <article className="wiki-article">
      {error && <p className="wiki-error">{error}</p>}
      {readOnly && (
        <p className="wiki-hint">
          {formatTime(savedAt)}에 저장된 기록입니다.{' '}
          <button type="button" className="edit-section" onClick={() => navigate(`/w/${docId}`)}>
            현재 문서로
          </button>
        </p>
      )}
      {isNew && !doc.id && (
        <p className="wiki-hint">빈 템플릿입니다. 제목을 입력한 뒤 완료를 누르면 새 문서로 저장됩니다.</p>
      )}
      <input
        ref={bodyFileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onBodyPhotoSelected}
      />

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
            disabled={readOnly}
          >
            <PencilIcon />
            편집
          </button>
          <button type="button" className="tool-btn" tabIndex={-1}>
            <ChatIcon />
            토론
          </button>
          <button
            type="button"
            className="tool-btn"
            disabled={!doc.id}
            onClick={() => doc.id && navigate(`/w/${doc.id}/history`)}
          >
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
                  onClick={() => !readOnly && fileRef.current?.click()}
                  disabled={uploading || readOnly}
                  aria-label={photoUrl ? '사진 변경' : '사진 추가'}
                >
                  {photoUrl ? (
                    <img src={photoUrl} alt="프로필 사진" />
                  ) : (
                    <span className="photo-placeholder-text">{uploading ? '올리는 중...' : '사진'}</span>
                  )}
                  <span className="photo-overlay">
                    {readOnly ? '기록 사진' : uploading ? '올리는 중...' : photoUrl ? '사진 변경' : '사진 추가'}
                  </span>
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
              {!readOnly && (
                <span className="section-actions">
                  {!fullEdit && (
                    <button type="button" className="edit-section" onClick={() => startSectionEdit(section.id)}>
                      [편집]
                    </button>
                  )}
                  {showEditor && (
                    <button
                      type="button"
                      className="edit-section"
                      onClick={() => startBodyPhoto(section.id)}
                      disabled={uploadingSection === section.id}
                    >
                      {uploadingSection === section.id ? '[올리는 중...]' : '[사진]'}
                    </button>
                  )}
                </span>
              )}
            </h2>
            {showEditor && !readOnly ? (
              <>
                <SectionEditor
                  blocks={draft.bodies[section.id]}
                  onChange={(blocks) => setSectionBlocks(section.id, blocks)}
                  placeholder={`${section.title} 내용을 입력하세요. [문서제목]으로 다른 문서에 링크할 수 있습니다.`}
                  compact={fullEdit}
                />
                {isSectionEdit && <EditActions onDone={save} saving={saving} />}
              </>
            ) : (
              <WikiSection blocks={doc.bodies[section.id]} />
            )}
          </section>
        )
      })}

      {fullEdit && !readOnly && <EditActions onDone={save} saving={saving} />}

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
