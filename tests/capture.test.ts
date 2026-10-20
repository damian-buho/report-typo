// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  capture,
  clipBytes,
  CONTEXT_CHARS,
  isEditable,
  isTrigger,
  MAX_TEXT_BYTES,
  toDraft
} from '../src/capture.js'
import { mountDom, select } from './dom.js'

describe('isTrigger', () => {
  it('fires on Ctrl+Enter and Cmd+Enter only', () => {
    assert.equal(isTrigger({ ctrlKey: true, metaKey: false, key: 'Enter' }), true)
    assert.equal(isTrigger({ ctrlKey: false, metaKey: true, key: 'Enter' }), true)
    assert.equal(isTrigger({ ctrlKey: false, metaKey: false, key: 'Enter' }), false)
    assert.equal(isTrigger({ ctrlKey: true, metaKey: false, key: 'e' }), false)
  })
})

describe('isEditable', () => {
  it('matches a target inside a field and ignores plain text', () => {
    const field = {
      closest: (selector: string) => (selector.includes('textarea') ? {} : undefined)
    }
    assert.equal(isEditable(field as unknown as EventTarget), true)
    assert.equal(isEditable({ closest: () => {} } as unknown as EventTarget), false)
    assert.equal(isEditable({} as EventTarget), false)
    assert.equal(isEditable(null), false)
  })
})

describe('toDraft', () => {
  it('keeps short context whole and squashes whitespace', () => {
    assert.deepEqual(toDraft('one\n  two ', 'tpyo', ', three', 256), {
      selection: 'tpyo',
      prefix: 'one two ',
      suffix: ', three'
    })
  })

  it('cuts long context to whole words within the limit', () => {
    const words = Array.from({ length: 40 }, (_, index) => `word${index}`).join(' ')
    const draft = toDraft(`${words} `, 'tpyo', ` ${words}`, 256)
    assert.ok(draft.prefix.length <= CONTEXT_CHARS)
    assert.ok(draft.suffix.length <= CONTEXT_CHARS)
    assert.match(draft.prefix, /^word\d+ .* $/)
    assert.match(draft.suffix, /^ word0 .*word\d+$/)
  })

  it('caps the selection', () => {
    assert.equal(toDraft('', 'x'.repeat(300), '', 256).selection.length, 256)
  })

  it('trims the selection', () => {
    assert.equal(toDraft('', '  tpyo  ', '', 256).selection, 'tpyo')
  })

  it('drops the partial word at the edge of the context', () => {
    assert.equal(toDraft(`word ${'x'.repeat(70)} tail`, 'sel', '', 256).prefix, 'tail')
    assert.equal(toDraft('x'.repeat(80), 'sel', '', 256).prefix, 'x'.repeat(CONTEXT_CHARS))
    assert.equal(toDraft('', 'sel', 'y'.repeat(80), 256).suffix, 'y'.repeat(CONTEXT_CHARS))
  })

  it('keeps the context of exactly one limit whole', () => {
    assert.equal(toDraft(`${'x'.repeat(63)} `, 'sel', '', 256).prefix, `${'x'.repeat(63)} `)
    assert.equal(toDraft('', 'sel', `word ${'y'.repeat(59)}`, 256).suffix, `word ${'y'.repeat(59)}`)
  })
})

describe('clipBytes', () => {
  it('keeps text within the budget whole', () => {
    assert.equal(clipBytes('tpyo', 8), 'tpyo')
  })

  it('cuts multi-byte text on a code point boundary', () => {
    const clipped = clipBytes('я'.repeat(600))
    assert.ok(new TextEncoder().encode(clipped).length <= MAX_TEXT_BYTES)
    assert.equal(clipped, 'я'.repeat(512))
    assert.equal(clipBytes('a😀', 3), 'a')
  })
})

describe('capture', () => {
  const page = '<h1>Title</h1><p>the quick brown fox jumps</p>'

  it('reads the selection and its context from the page', () => {
    const dom = mountDom()
    dom.document.body.innerHTML = page
    const draft = capture(select(dom, 'p', 10, 15), 256)
    assert.deepEqual(draft, { selection: 'brown', prefix: 'the quick ', suffix: ' fox jumps' })
    dom.restore()
  })

  it('returns nothing without a selection', () => {
    const dom = mountDom()
    dom.document.body.innerHTML = page
    assert.equal(capture(null, 256), undefined)
    assert.equal(capture(dom.window.getSelection() as unknown as Selection, 256), undefined)
    dom.restore()
  })

  it('returns nothing when the selection holds no range', () => {
    const dom = mountDom()
    const selection = {
      isCollapsed: false,
      rangeCount: 0,
      getRangeAt: () => {
        throw new Error('no range')
      }
    }
    assert.equal(capture(selection as unknown as Selection, 256), undefined)
    dom.restore()
  })

  it('falls back to the page when the selection hangs outside it', () => {
    const dom = mountDom()
    dom.document.body.innerHTML = page
    const detached = dom.document.createTextNode('brown')
    const range = {
      commonAncestorContainer: detached,
      startContainer: detached,
      startOffset: 0,
      endContainer: detached,
      endOffset: 5,
      toString: () => 'brown'
    }
    const selection = { isCollapsed: false, rangeCount: 1, getRangeAt: () => range }
    const draft = capture(selection as unknown as Selection, 256)
    assert.equal(draft?.selection, 'brown')
    dom.restore()
  })
})
