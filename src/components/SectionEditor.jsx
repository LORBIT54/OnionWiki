import { useRef, useState } from 'react'
import {
  flattenItems,
  moveImageToSlot,
  normalizeSection,
  removeImage,
  updateTextBlock,
} from '../lib/bodyBlocks'

function slotFromPoint(element, clientY, itemIndex, kind) {
  const rect = element.getBoundingClientRect()
  if (kind === 'image') {
    return clientY > rect.top + rect.height / 2 ? itemIndex + 1 : itemIndex
  }
  const style = getComputedStyle(element)
  const lineHeight = parseFloat(style.lineHeight) || 27
  const paddingTop = parseFloat(style.paddingTop) || 0
  const y = clientY - rect.top + element.scrollTop - paddingTop
  const lineCount = Math.max(1, element.value.split('\n').length)
  const gap = Math.round(y / lineHeight)
  return itemIndex + Math.max(0, Math.min(lineCount, gap))
}

export default function SectionEditor({ blocks, onChange, placeholder, compact }) {
  const [dragging, setDragging] = useState(false)
  const [dropSlot, setDropSlot] = useState(null)
  const dragIndexRef = useRef(-1)
  const normalized = normalizeSection(blocks)
  const display =
    !normalized.length
      ? [{ type: 'text', value: '' }]
      : normalized[normalized.length - 1].type === 'image'
        ? [...normalized, { type: 'text', value: '' }]
        : normalized
  const items = flattenItems(display)

  function firstSlot(blockIndex) {
    const index = items.findIndex((item) => item.blockIndex === blockIndex)
    return index < 0 ? items.length : index
  }

  function finishDrag(slot) {
    const imageIndex = dragIndexRef.current
    dragIndexRef.current = -1
    setDragging(false)
    setDropSlot(null)
    if (imageIndex < 0 || slot == null) return
    onChange(moveImageToSlot(normalized, imageIndex, slot))
  }

  function onTextChange(blockIndex, value) {
    if (blockIndex >= normalized.length) {
      onChange([...normalized, { type: 'text', value }])
      return
    }
    if (!normalized.length) {
      onChange([{ type: 'text', value }])
      return
    }
    onChange(updateTextBlock(normalized, blockIndex, value))
  }

  return (
    <div
      className={`section-editor-blocks${compact ? ' is-compact' : ''}${dragging ? ' is-dragging' : ''}`}
      onDragOver={(event) => {
        if (dragIndexRef.current < 0) return
        event.preventDefault()
      }}
      onDrop={(event) => {
        event.preventDefault()
        finishDrag(dropSlot ?? items.length)
      }}
    >
      {display.map((block, blockIndex) => {
        if (block.type === 'image') {
          const itemIndex = items.findIndex((item) => item.kind === 'image' && item.blockIndex === blockIndex)
          const activeBefore = dragging && dropSlot === itemIndex
          const activeAfter = dragging && dropSlot === itemIndex + 1
          return (
            <div key={block.id || `img-${blockIndex}`} className="body-photo-edit">
              {dragging && <div className={`photo-drop-line${activeBefore ? ' is-active' : ''}`} />}
              <figure
                className={`body-photo is-edit${dragging && dragIndexRef.current === blockIndex ? ' is-held' : ''}`}
                draggable
                onDragStart={(event) => {
                  dragIndexRef.current = blockIndex
                  setDragging(true)
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', block.id || String(blockIndex))
                }}
                onDragEnd={() => {
                  dragIndexRef.current = -1
                  setDragging(false)
                  setDropSlot(null)
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setDropSlot(slotFromPoint(event.currentTarget, event.clientY, itemIndex, 'image'))
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  finishDrag(slotFromPoint(event.currentTarget, event.clientY, itemIndex, 'image'))
                }}
              >
                <img src={block.url} alt="" draggable={false} />
                <div className="body-photo-tools">
                  <span className="body-photo-hint">끌어 줄 사이에 놓기</span>
                  <button
                    type="button"
                    className="body-photo-remove"
                    onClick={() => onChange(removeImage(normalized, blockIndex))}
                  >
                    삭제
                  </button>
                </div>
              </figure>
              {dragging && <div className={`photo-drop-line${activeAfter ? ' is-active' : ''}`} />}
            </div>
          )
        }

        const itemIndex = firstSlot(blockIndex)
        const lineCount = String(block.value ?? '').split('\n').length
        const caretInBlock = dragging && dropSlot != null && dropSlot >= itemIndex && dropSlot <= itemIndex + lineCount
        const caretOffset = caretInBlock ? dropSlot - itemIndex : 0

        return (
          <div key={`text-${blockIndex}`} className="text-block-wrap">
            <textarea
              className="section-editor"
              value={block.value}
              onChange={(event) => onTextChange(blockIndex, event.target.value)}
              placeholder={blockIndex === 0 && !block.value ? placeholder : ''}
              rows={compact ? 6 : 8}
              onDragOver={(event) => {
                if (dragIndexRef.current < 0) return
                event.preventDefault()
                event.stopPropagation()
                setDropSlot(slotFromPoint(event.currentTarget, event.clientY, itemIndex, 'line'))
              }}
              onDrop={(event) => {
                if (dragIndexRef.current < 0) return
                event.preventDefault()
                event.stopPropagation()
                finishDrag(slotFromPoint(event.currentTarget, event.clientY, itemIndex, 'line'))
              }}
            />
            {caretInBlock && (
              <div
                className="line-drop-caret"
                style={{ top: `calc(10px + ${caretOffset} * 1.7em)` }}
              />
            )}
          </div>
        )
      })}
      {dragging && (
        <div
          className={`photo-drop-line end${dropSlot === items.length ? ' is-active' : ''}`}
          onDragOver={(event) => {
            event.preventDefault()
            setDropSlot(items.length)
          }}
        />
      )}
    </div>
  )
}
