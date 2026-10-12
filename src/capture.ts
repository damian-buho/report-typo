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

/** Reads the current selection and its surrounding text from the page. */
export function capture(selection: Selection | null, max: number): Draft | undefined {
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)
  const common = range.commonAncestorContainer
  const scope =
    (common instanceof Element ? common : common.parentElement)?.closest(BLOCK) ?? document.body
  const before = document.createRange()
  before.selectNodeContents(scope)
  before.setEnd(range.startContainer, range.startOffset)
  const after = document.createRange()
  after.selectNodeContents(scope)
  after.setStart(range.endContainer, range.endOffset)
  const draft = toDraft(before.toString(), range.toString(), after.toString(), max)
  return draft.selection ? draft : undefined
}
