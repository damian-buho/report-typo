// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { confirm } from '../src/dialog.js'
import en from '../locales/en.yaml'
import { created, mountDom } from './dom.js'
import { outcome } from './async.js'

const draft = { selection: 'brown', prefix: 'the quick ', suffix: ' fox jumps' }

describe('confirm', () => {
  it('shows the draft and resolves with the comment', async () => {
    const dom = mountDom()
    const result = confirm(draft, en, 'en', true)
    const dialog = created(dom, 'dialog') as HTMLDialogElement
    assert.ok(dialog)
    assert.equal(dialog.dir, en.dir)
    assert.equal(dialog.lang, 'en')
    assert.equal(dialog.textContent.includes('Stryker was here!'), false)
    const form = dialog.querySelector('form') as HTMLFormElement
    assert.ok(form)
    assert.equal(form.method, 'dialog')
    assert.equal(form.querySelector('h2')?.textContent, en.title)
    const context = form.querySelector('p') as HTMLParagraphElement
    assert.ok(context)
    assert.equal(context.textContent, `${draft.prefix}${draft.selection}${draft.suffix}`)
    assert.equal(context.querySelector('mark')?.textContent, draft.selection)
    const textarea = form.querySelector('textarea') as HTMLTextAreaElement
    assert.ok(textarea)
    assert.equal(textarea.placeholder, en.commentPlaceholder)
    assert.equal(textarea.maxLength, 1024)
    assert.equal(textarea.getAttribute('rows'), '3')
    const buttons = [...form.querySelectorAll('button')] as HTMLButtonElement[]
    assert.deepEqual(
      buttons.map(button => button.textContent),
      [en.cancel, en.send]
    )
    assert.deepEqual(
      buttons.map(button => button.value),
      ['cancel', 'send']
    )
    textarea.value = '  well written  '
    dialog.close('send')
    const state = await outcome(result)
    assert.equal(state.ok, true)
    assert.deepEqual(state.value, { comment: '  well written  ' })
    dom.restore()
  })

  it('resolves nothing when the reader cancels', async () => {
    const dom = mountDom()
    const result = confirm(draft, en, 'en', false)
    const dialog = created(dom, 'dialog') as HTMLDialogElement
    assert.ok(dialog)
    assert.equal(dialog.querySelectorAll('textarea').length, 0)
    const send = dialog.querySelector('button[value="send"]') as HTMLButtonElement
    assert.ok(send)
    assert.equal(send.autofocus, true)
    dialog.close('cancel')
    const state = await outcome(result)
    assert.equal(state.ok, true)
    assert.equal(state.value, undefined)
    dom.restore()
  })

  it('keeps the dialog inside a closed shadow root', async () => {
    const dom = mountDom()
    const result = confirm(draft, en, 'en', false)
    const host = created(dom, 'report-typo') as HTMLElement
    assert.ok(host)
    assert.equal(host.shadowRoot === null, true)
    assert.equal(host.isConnected, true)
    const root = dom.roots[0]
    assert.ok(root)
    assert.equal(root.adoptedStyleSheets.length, 1)
    assert.ok(root.adoptedStyleSheets[0]?.cssRules.length)
    const dialog = created(dom, 'dialog') as HTMLDialogElement
    dialog.close('send')
    await outcome(result)
    assert.equal(host.isConnected, false)
    dom.restore()
  })
})
