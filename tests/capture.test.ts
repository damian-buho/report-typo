// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { CONTEXT_CHARS, isEditable, isTrigger, toDraft } from '../src/capture.js'

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
})
