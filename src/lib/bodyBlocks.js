const SECTION_IDS = ['s1', 's2', 's3', 's4']

export function normalizeSection(raw) {
  if (Array.isArray(raw)) {
    const blocks = []
    for (const item of raw) {
      if (item == null) continue
      if (typeof item === 'string') {
        blocks.push({ type: 'text', value: item })
        continue
      }
      if (item.type === 'image') {
        const url = item.url || item.photoUrl || ''
        if (!url) continue
        blocks.push({
          type: 'image',
          id: item.id || '',
          url,
          path: item.path || item.photoPath || '',
        })
        continue
      }
      blocks.push({ type: 'text', value: String(item.value ?? item.text ?? '') })
    }
    return blocks
  }
  if (typeof raw === 'string') {
    return raw ? [{ type: 'text', value: raw }] : []
  }
  return []
}

export function normalizeBodies(bodies) {
  const out = {}
  for (const id of SECTION_IDS) {
    out[id] = normalizeSection(bodies?.[id] ?? '')
  }
  return out
}

export function cloneBodies(bodies) {
  const src = normalizeBodies(bodies)
  const out = {}
  for (const id of SECTION_IDS) {
    out[id] = src[id].map((block) => ({ ...block }))
  }
  return out
}

export function pruneBlocks(blocks) {
  return normalizeSection(blocks).filter((block) => {
    if (block.type === 'image') return Boolean(block.url)
    return (block.value || '').length > 0
  })
}

export function pruneBodies(bodies) {
  const out = {}
  for (const id of SECTION_IDS) {
    out[id] = pruneBlocks(bodies?.[id])
  }
  return out
}

export function sectionHasContent(blocks) {
  return pruneBlocks(blocks).some((block) =>
    block.type === 'image' ? Boolean(block.url) : Boolean((block.value || '').trim()),
  )
}

export function flattenItems(blocks) {
  const items = []
  ;(blocks || []).forEach((block, blockIndex) => {
    if (block.type === 'image') {
      items.push({
        kind: 'image',
        blockIndex,
        id: block.id,
        url: block.url,
        path: block.path,
      })
      return
    }
    const lines = String(block.value ?? '').split('\n')
    lines.forEach((text, lineIndex) => {
      items.push({
        kind: 'line',
        blockIndex,
        lineIndex,
        text,
        lineCount: lines.length,
      })
    })
  })
  return items
}

function itemsToBlocks(items) {
  const blocks = []
  for (const item of items) {
    if (item.kind === 'image') {
      blocks.push({
        type: 'image',
        id: item.id || '',
        url: item.url,
        path: item.path || '',
      })
      continue
    }
    if (blocks.length && blocks[blocks.length - 1].type === 'text') {
      blocks[blocks.length - 1] = {
        type: 'text',
        value: `${blocks[blocks.length - 1].value}\n${item.text}`,
      }
    } else {
      blocks.push({ type: 'text', value: item.text })
    }
  }
  return blocks
}

export function moveImageToSlot(blocks, imageBlockIndex, slot) {
  const items = flattenItems(blocks)
  const imageItemIndex = items.findIndex(
    (item) => item.kind === 'image' && item.blockIndex === imageBlockIndex,
  )
  if (imageItemIndex < 0) return blocks
  const image = items[imageItemIndex]
  const rest = items.filter((_, index) => index !== imageItemIndex)
  let insertAt = slot
  if (slot > imageItemIndex) insertAt -= 1
  insertAt = Math.max(0, Math.min(rest.length, insertAt))
  rest.splice(insertAt, 0, image)
  return itemsToBlocks(rest)
}

export function appendImage(blocks, image) {
  return [
    ...normalizeSection(blocks),
    {
      type: 'image',
      id: image.id || crypto.randomUUID(),
      url: image.url,
      path: image.path || '',
    },
  ]
}

export function removeImage(blocks, imageBlockIndex) {
  return normalizeSection(blocks).filter((_, index) => index !== imageBlockIndex)
}

export function updateTextBlock(blocks, blockIndex, value) {
  return normalizeSection(blocks).map((block, index) =>
    index === blockIndex && block.type === 'text' ? { type: 'text', value } : block,
  )
}
