import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  LogoMark,
  ClockIcon,
  ChatIcon,
  GearIcon,
  PlusIcon,
  ShuffleIcon,
  SearchIcon,
  UserIcon,
} from './icons'
import { fetchDocumentByTitle, listRecentDocuments, searchDocuments } from '../lib/wikiApi'

export default function Header() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  async function onSearch(event) {
    event.preventDefault()
    const q = query.trim()
    if (!q) return
    try {
      const exact = await fetchDocumentByTitle(q)
      if (exact) {
        navigate(`/w/${exact.id}`)
        return
      }
      const results = await searchDocuments(q)
      if (results.length === 1) {
        navigate(`/w/${results[0].id}`)
        return
      }
      navigate(`/search?q=${encodeURIComponent(q)}`)
    } catch {
      navigate(`/search?q=${encodeURIComponent(q)}`)
    }
  }

  async function goRandom() {
    try {
      const docs = await listRecentDocuments()
      if (!docs.length) {
        navigate('/recent')
        return
      }
      const pick = docs[Math.floor(Math.random() * docs.length)]
      navigate(`/w/${pick.id}`)
    } catch {
      navigate('/recent')
    }
  }

  return (
    <header className="wiki-header">
      <div className="wiki-header-inner">
        <Link className="logo" to="/">
          <LogoMark />
          <span className="logo-text">
            Onion<span>Wiki</span>
          </span>
        </Link>

        <nav className="header-nav">
          <NavLink to="/recent" className={({ isActive }) => (isActive ? 'is-active' : '')}>
            <ClockIcon />
            최근 변경
          </NavLink>
          <NavLink to="/new" className={({ isActive }) => (isActive ? 'is-active' : '')}>
            <PlusIcon />
            새 문서
          </NavLink>
          <span className="nav-optional">
            <a href="#discuss">
              <ChatIcon />
              최근 토론
            </a>
            <a href="#special">
              <GearIcon />
              특수 기능
              <span className="caret">▾</span>
            </a>
          </span>
        </nav>

        <div className="header-right">
          <button type="button" className="icon-btn" title="아무 문서로 이동" aria-label="아무 문서로 이동" onClick={goRandom}>
            <ShuffleIcon />
          </button>
          <form className="search-form" onSubmit={onSearch}>
            <SearchIcon />
            <input
              type="search"
              placeholder="여기에서 검색"
              aria-label="검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="go-btn" aria-label="검색">
              →
            </button>
          </form>
          <button type="button" className="icon-btn user-btn" title="사용자" aria-label="사용자">
            <UserIcon />
          </button>
        </div>
      </div>
    </header>
  )
}
