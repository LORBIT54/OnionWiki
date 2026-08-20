import { LogoMark, ClockIcon, ChatIcon, GearIcon, ShuffleIcon, SearchIcon, UserIcon } from './icons'

export default function Header() {
  return (
    <header className="wiki-header">
      <div className="wiki-header-inner">
        <a className="logo" href="/" onClick={(e) => e.preventDefault()}>
          <LogoMark />
          <span className="logo-text">
            Onion<span>Wiki</span>
          </span>
        </a>

        <nav className="header-nav">
          <a href="#recent">
            <ClockIcon />
            최근 변경
          </a>
          <a href="#discuss">
            <ChatIcon />
            최근 토론
          </a>
          <a href="#special">
            <GearIcon />
            특수 기능
            <span className="caret">▾</span>
          </a>
        </nav>

        <div className="header-right">
          <button type="button" className="icon-btn" title="아무 문서로 이동" aria-label="아무 문서로 이동">
            <ShuffleIcon />
          </button>
          <form className="search-form" onSubmit={(e) => e.preventDefault()}>
            <SearchIcon />
            <input type="search" placeholder="여기에서 검색" aria-label="검색" />
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
