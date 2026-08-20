const LINK_RE = /\[\[([^\[\]|\n]+)(?:\|([^\[\]\n]+))?\]\]|\[([^\[\]\n]+)\]/g

export function parseWikiText(text) {
  if (!text) return []
  const parts = []
  let last = 0
  let match
  while ((match = LINK_RE.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: 'text', value: text.slice(last, match.index) })
    }
    if (match[1] != null) {
      const title = match[1].trim()
      const label = (match[2] ?? title).trim() || title
      if (title) parts.push({ type: 'link', title, label })
      else parts.push({ type: 'text', value: match[0] })
    } else {
      const title = (match[3] || '').trim()
      if (title) parts.push({ type: 'link', title, label: title })
      else parts.push({ type: 'text', value: match[0] })
    }
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) })
  LINK_RE.lastIndex = 0
  return parts
}

export function collectLinkTitles(parts) {
  return [...new Set(parts.filter((part) => part.type === 'link').map((part) => part.title))]
}
