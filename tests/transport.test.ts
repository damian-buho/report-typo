// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

import { afterEach, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { relay, retryAfterMs } from '../src/transport/relay.js'
import { webhook } from '../src/transport/webhook.js'
import type { TypoReport } from '../src/types.js'

const report: TypoReport = {
  type: 'typo',
  age: 0,
  url: 'https://example.com/',
  body: { selection: 'tpyo', prefix: 'a ', suffix: ' b', lang: 'en' }
}

const answer = (...statuses: number[]) =>
  mock.method(globalThis, 'fetch', async () => {
    const status = statuses.shift() ?? 500
    return new Response(undefined, { status, headers: { 'Retry-After': '0' } })
  })

afterEach(() => mock.restoreAll())

describe('relay', () => {
  it('posts the Reporting API envelope without credentials', async () => {
    const fetch = answer(204)
    await relay('https://relay.example/')(report)
    const [url, init] = fetch.mock.calls[0]!.arguments as [string, RequestInit]
    assert.equal(url, 'https://relay.example/')
    assert.equal(init.credentials, 'omit')
    assert.equal(init.keepalive, true)
    assert.deepEqual(init.headers, { 'Content-Type': 'application/reports+json' })
    assert.deepEqual(JSON.parse(init.body as string), [report])
  })

  it('retries once on 429', async () => {
    const fetch = answer(429, 204)
    await relay('https://relay.example/')(report)
    assert.equal(fetch.mock.callCount(), 2)
  })

  it('rejects when the retry is refused too', async () => {
    answer(429, 429)
    await assert.rejects(relay('https://relay.example/')(report), /429/)
  })

  it('rejects a disabled intake without retrying', async () => {
    const fetch = answer(503)
    await assert.rejects(relay('https://relay.example/')(report), /503/)
    assert.equal(fetch.mock.callCount(), 1)
  })
})

describe('retryAfterMs', () => {
  it('honours seconds with jitter and defaults to one second', () => {
    assert.equal(
      retryAfterMs('2', () => 0),
      2000
    )
    assert.equal(
      retryAfterMs('2', () => 1),
      3000
    )
    assert.equal(
      retryAfterMs('', () => 0),
      1000
    )
    assert.equal(
      retryAfterMs('Wed, 21 Oct 2026 07:28:00 GMT', () => 0),
      1000
    )
  })
})

describe('webhook', () => {
  it('posts the formatted JSON', async () => {
    const fetch = answer(200)
    await webhook('https://hooks.example/', r => ({ text: r.body.selection }))(report)
    const [, init] = fetch.mock.calls[0]!.arguments as [string, RequestInit]
    assert.deepEqual(JSON.parse(init.body as string), { text: 'tpyo' })
  })
})
