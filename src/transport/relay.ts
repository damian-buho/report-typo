// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

import type { Send, TypoReport } from '../types.js'

/** Per-attempt deadline of one delivery. */
export const TIMEOUT_MS = 5000

const post = (endpoint: string, report: TypoReport): Promise<Response> =>
  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/reports+json' },
    body: JSON.stringify([report]),
    keepalive: true,
    credentials: 'omit',
    mode: 'cors',
    signal: AbortSignal.timeout(TIMEOUT_MS)
  })

/** Milliseconds to wait on a `Retry-After` header, with up to 50% jitter; 1 s when absent or a date. */
export function retryAfterMs(header: string | null, random = Math.random): number {
  const seconds = Number(header)
  return (Number.isFinite(seconds) && seconds > 0 ? seconds : 1) * 1000 * (1 + random() / 2)
}

/** Sends reports to a report-relay intake, retrying once on 429. */
export function relay(endpoint: string): Send {
  return async report => {
    let response = await post(endpoint, report)
    if (response.status === 429) {
      const wait = retryAfterMs(response.headers.get('Retry-After'))
      console.debug('report-typo: relay busy, retrying', { status: response.status, wait })
      await new Promise(resolve => setTimeout(resolve, wait))
      response = await post(endpoint, report)
    }
    if (!response.ok) throw new Error(`report-relay answered ${response.status}`)
  }
}
