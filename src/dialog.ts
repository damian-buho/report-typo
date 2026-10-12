// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

import { MAX_TEXT_BYTES } from './capture.js'
import type { Confirmation, Draft, Messages } from './types.js'

const CSS = `dialog{max-inline-size:min(32rem,90vw);font:var(--report-typo-font,1rem/1.5 system-ui,sans-serif);
color:var(--report-typo-color,CanvasText);background:var(--report-typo-background,Canvas);
border:var(--report-typo-border,1px solid GrayText);border-radius:var(--report-typo-radius,.5rem)}
p,label{display:block;margin:0 0 1rem}mark{padding:0 .1em;background:var(--report-typo-highlight,Mark)}
textarea{display:block;box-sizing:border-box;inline-size:100%;font:inherit}
menu{display:flex;gap:.5rem;justify-content:end;margin:0;padding:0}`

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
export function confirm(
  draft: Draft,
  messages: Messages,
  lang: string,
  hasComment: boolean
): Promise<Confirmation | undefined> {
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
  const label = hasComment ? element('label', form, messages.comment) : undefined
  const comment = label ? element('textarea', label) : undefined
  if (comment) {
    comment.placeholder = messages.commentPlaceholder
    comment.maxLength = MAX_TEXT_BYTES
    comment.rows = 3
  }
  const menu = element('menu', form)
  element('button', menu, messages.cancel).value = 'cancel'
  const send = element('button', menu, messages.send)
  send.value = 'send'
  send.autofocus = !comment
  document.body.append(host)
  return new Promise(resolve => {
    dialog.addEventListener('close', () => {
      host.remove()
      resolve(dialog.returnValue === 'send' ? { comment: comment?.value } : undefined)
    })
    dialog.showModal()
    comment?.focus()
  })
}
