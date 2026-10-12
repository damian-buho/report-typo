// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

import type { Draft, Messages } from './types.js'

const CSS = `dialog{max-inline-size:min(32rem,90vw);font:1rem/1.5 system-ui,sans-serif}
p{margin:0 0 1rem}mark{padding:0 .1em}menu{display:flex;gap:.5rem;justify-content:end;margin:0;padding:0}`

/** What the reader confirmed, or undefined when they cancelled. */
export type Confirmation = Record<string, never> | undefined

const element = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  parent: ParentNode,
  text = ''
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag)
  node.textContent = text
  parent.append(node)
  return node
}

/** Shows the draft in a modal dialog inside a closed shadow root and waits for Send or Cancel. */
export function confirm(draft: Draft, messages: Messages, lang: string): Promise<Confirmation> {
  const host = document.createElement('report-typo')
  const root = host.attachShadow({ mode: 'closed' })
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(CSS)
  root.adoptedStyleSheets = [sheet]
  const dialog = element('dialog', root)
  dialog.dir = messages.dir
  dialog.lang = lang
  const form = element('form', dialog)
  form.method = 'dialog'
  element('h2', form, messages.title)
  const context = element('p', form, draft.prefix)
  element('mark', context, draft.selection)
  context.append(draft.suffix)
  const menu = element('menu', form)
  element('button', menu, messages.cancel).value = 'cancel'
  const send = element('button', menu, messages.send)
  send.value = 'send'
  send.autofocus = true
  document.body.append(host)
  return new Promise(resolve => {
    dialog.addEventListener('close', () => {
      host.remove()
      resolve(dialog.returnValue === 'send' ? {} : undefined)
    })
    dialog.showModal()
  })
}
