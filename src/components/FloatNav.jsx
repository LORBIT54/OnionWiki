import { ListIcon, ArrowUpIcon, ArrowDownIcon } from './icons'

export default function FloatNav() {
  return (
    <div className="float-nav">
      <a href="#toc" title="목차" aria-label="목차">
        <ListIcon />
      </a>
      <button type="button" title="맨 위로" aria-label="맨 위로" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <ArrowUpIcon />
      </button>
      <button
        type="button"
        title="맨 아래로"
        aria-label="맨 아래로"
        onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
      >
        <ArrowDownIcon />
      </button>
    </div>
  )
}
