// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

import type { Send, TypoReport } from '../types.js'
import { TIMEOUT_MS } from './relay.js'

/** Turns a report into the JSON a webhook expects. */
export type Format = (report: TypoReport) => unknown

/** Sends reports as a plain JSON POST, shaped by `format` when given. */
export function webhook(url: string, format: Format = report => report): Send {
  return async report => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(format(report)),
      keepalive: true,
      credentials: 'omit',
      signal: AbortSignal.timeout(TIMEOUT_MS)
    })
    if (!response.ok) throw new Error(`webhook answered ${response.status}`)
  }
}
