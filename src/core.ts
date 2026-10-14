// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

import { capture, clipBytes, isEditable, isTrigger } from './capture.js'
import { confirm } from './dialog.js'
import { relay } from './transport/relay.js'
import { webhook, type Format } from './transport/webhook.js'
import type { Messages, Send, Ui } from './types.js'

/** Options of `reportTypo`; `endpoint` or `send` is required. */
export interface Options {
  endpoint?: string
  transport?: 'relay' | 'webhook'
  format?: Format
  send?: Send
  locale?: string
  maxSelection?: number
  cooldownMs?: number
  comment?: boolean
  ui?: Ui
}

const debug = (message: string, data: unknown): void =>
  console.debug(`report-typo: ${message}`, data)

/** Picks the catalog entry for a language tag by its base subtag, falling back to the first entry. */
export function pick(catalog: Record<string, Messages>, tag: string): [string, Messages] {
  const base = tag.toLowerCase().split('-', 1)[0] ?? ''
  const found = catalog[base]
  if (found) return [base, found]
  const [first] = Object.entries(catalog)
  if (!first) throw new TypeError('report-typo: empty locale catalog')
  return first
}

/** Builds `reportTypo` over a locale catalog, so each bundle ships only the locales it imports. */
export function create(catalog: Record<string, Messages>) {
  return function reportTypo(options: Options): () => void {
    const {
      endpoint,
      transport = 'relay',
      format,
      maxSelection = 256,
      cooldownMs = 2000,
      comment = false
    } = options
    if (!endpoint && !options.send) throw new TypeError('report-typo: set `endpoint` or `send`')
    let send: Send
    if (options.send) send = options.send
    else if (endpoint === undefined) throw new TypeError('report-typo: set `endpoint` or `send`')
    else send = transport === 'webhook' ? webhook(endpoint, format) : relay(endpoint)
    const pageLang = document.documentElement.lang
    const [locale, messages] = pick(catalog, options.locale ?? (pageLang || navigator.language))
    const ui = options.ui ?? (draft => confirm(draft, messages, locale, comment))
    let last = -Infinity
    let isOpen = false
    const onKey = async (event: KeyboardEvent): Promise<void> => {
      if (!isTrigger(event)) return
      if (isEditable(event.target))
        return debug('ignored in an editable field', { target: event.target })
      const draft = capture(getSelection(), maxSelection)
      if (!draft) return debug('ignored without a selection', { maxSelection })
      const wait = last + cooldownMs - Date.now()
      if (wait > 0) return debug('ignored while cooling down', { wait })
      if (isOpen) return debug('ignored while the dialog is open', { selection: draft.selection })
      event.preventDefault()
      isOpen = true
      try {
        const confirmation = await ui(draft)
        if (!confirmation) return debug('cancelled', { selection: draft.selection })
        last = Date.now()
        const note = clipBytes(confirmation.comment?.trim() ?? '')
        const body = { ...draft, lang: pageLang || locale, ...(note && { comment: note }) }
        await send({ type: 'typo', age: 0, url: location.href, body })
        debug('sent', { selection: draft.selection, transport, comment: Boolean(note) })
      } catch (error) {
        debug('not sent', { error })
      } finally {
        isOpen = false
      }
    }
    const listener = (event: KeyboardEvent): void => void onKey(event)
    document.addEventListener('keydown', listener)
    debug('listening', { locale, transport, cooldownMs })
    return () => {
      document.removeEventListener('keydown', listener)
      debug('disposed', { locale })
    }
  }
}
