// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

import type { Draft } from './types.js'

/** Characters of context kept on each side of the selection. */
export const CONTEXT_CHARS = 64

const EDITABLE = 'input,textarea,select,[contenteditable]:not([contenteditable="false"])'
const BLOCK =
  'p,li,dd,dt,td,th,blockquote,pre,figcaption,h1,h2,h3,h4,h5,h6,article,section,main,body'

/** Reports whether a key event is Ctrl+Enter, or Cmd+Enter on macOS. */
export function isTrigger(event: Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'key'>): boolean {
  return (event.ctrlKey || event.metaKey) && event.key === 'Enter'
}

/** Reports whether the event target is a field the reader is typing in. */
export function isEditable(target: EventTarget | null): boolean {
  const element = target as Partial<Element> | null
  return Boolean(element?.closest?.(EDITABLE))
}

/** Bytes report-relay keeps of one free-text field. */
export const MAX_TEXT_BYTES = 1024

/** Cuts text to a UTF-8 byte budget on a code point boundary. */
export function clipBytes(text: string, max = MAX_TEXT_BYTES): string {
  const encoder = new TextEncoder()
  let clipped = text
  while (encoder.encode(clipped).length > max) clipped = [...clipped].slice(0, -1).join('')
  return clipped
}

const squash = (text: string): string => text.replaceAll(/\s+/g, ' ')

/** Builds a draft from the text before, inside and after a selection, cut to whole words. */
export function toDraft(before: string, selected: string, after: string, max: number): Draft {
  const prefix = squash(before)
  const suffix = squash(after)
  const head = prefix.slice(-CONTEXT_CHARS)
  const tail = suffix.slice(0, CONTEXT_CHARS)
  return {
    selection: squash(selected).trim().slice(0, max),
    prefix: (prefix.length > CONTEXT_CHARS ? head.replace(/^\S*\s/, '') : head).trimStart(),
    suffix: (suffix.length > CONTEXT_CHARS ? tail.replace(/\s\S*$/, '') : tail).trimEnd()
  }
}

/** Collects the rendered text nodes of a subtree, skipping non-rendered and hidden ones. */
function renderedTextNodes(scope: Node): Text[] {
  const nodes: Text[] = []
  const walker = document.createTreeWalker(scope, 5, {
    acceptNode(node) {
      if (node.nodeType === 3) return 1
      const element = node as Element
      return '|SCRIPT|STYLE|TEMPLATE|NOSCRIPT|'.includes('|' + element.tagName + '|') ||
        element.hasAttribute('hidden') ||
        element.getAttribute('aria-hidden') === 'true'
        ? 2
        : 3
    }
  })
  for (let node = walker.firstChild(); node; node = walker.nextNode()) {
    if (node.nodeType === 3) nodes.push(node as Text)
  }
  return nodes
}

/** Reads the current selection and its surrounding text from the page. */
export function capture(selection: Selection | null, max: number): Draft | undefined {
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)
  const common = range.commonAncestorContainer
  const scope =
    (common instanceof Element ? common : common.parentElement)?.closest(BLOCK) ?? document.body

  if (typeof range.comparePoint !== 'function') {
    const before = document.createRange()
    before.selectNodeContents(scope)
    before.setEnd(range.startContainer, range.startOffset)
    const after = document.createRange()
    after.selectNodeContents(scope)
    after.setStart(range.endContainer, range.endOffset)
    const draft = toDraft(before.toString(), range.toString(), after.toString(), max)
    return draft.selection ? draft : undefined
  }

  const nodes = renderedTextNodes(scope)

  let beforeText = ''
  for (const node of nodes) {
    if (node === range.startContainer) {
      beforeText += node.data.slice(0, range.startOffset)
      break
    }
    if (range.comparePoint(node, node.data.length) < 0) beforeText += node.data
    else break
  }

  let selectedText = ''
  for (const node of nodes) {
    if (range.comparePoint(node, node.data.length) < 0) continue
    if (range.comparePoint(node, 0) > 0) break
    let from = 0
    let to = node.data.length
    if (node === range.startContainer) from = range.startOffset
    if (node === range.endContainer) to = range.endOffset
    if (to > from) selectedText += node.data.slice(from, to)
  }
  if (!selectedText) selectedText = range.toString()

  let afterText = ''
  let hasStarted = false
  for (const node of nodes) {
    if (hasStarted) {
      afterText += node.data
    } else if (node === range.endContainer) {
      afterText += node.data.slice(range.endOffset)
      hasStarted = true
    } else if (range.comparePoint(node, 0) > 0) {
      afterText += node.data
      hasStarted = true
    }
  }

  const draft = toDraft(beforeText, selectedText, afterText, max)
  return draft.selection ? draft : undefined
}
