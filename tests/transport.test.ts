// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

import { afterEach, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { relay, retryAfterMs } from '../src/transport/relay.js'
import { webhook } from '../src/transport/webhook.js'
import { outcome } from './async.js'
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
    return new Response(undefined, { status, headers: { 'Retry-After': '0.001' } })
  })

afterEach(() => mock.restoreAll())

describe('relay', () => {
  it('posts the Reporting API envelope without credentials', async () => {
    const fetch = answer(204)
    await relay('https://relay.example/')(report)
    const first = fetch.mock.calls[0]
    assert.ok(first)
    const [url, init] = first.arguments as [string, RequestInit]
    assert.equal(url, 'https://relay.example/')
    assert.equal(init.method, 'POST')
    assert.equal(init.mode, 'cors')
    assert.equal(init.credentials, 'omit')
    assert.equal(init.keepalive, true)
    assert.deepEqual(init.headers, { 'Content-Type': 'application/reports+json' })
    assert.deepEqual(JSON.parse(init.body as string), [report])
  })

  it('retries once on 429', async () => {
    const debug = mock.method(console, 'debug', () => {})
    const fetch = answer(429, 204)
    const state = await outcome(relay('https://relay.example/')(report))
    assert.equal(state.ok, true)
    assert.equal(fetch.mock.callCount(), 2)
    const call = debug.mock.calls[0]
    assert.ok(call)
    assert.equal(call.arguments[0], 'report-typo: relay busy, retrying')
    const data = call.arguments[1] as { status: number; wait: number }
    assert.equal(data.status, 429)
    assert.ok(data.wait >= 1)
  })

  it('rejects when the retry is refused too', async () => {
    answer(429, 429)
    const state = await outcome(relay('https://relay.example/')(report))
    assert.equal(state.ok, true)
    assert.equal((state.error as Error).message.includes('429'), true)
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
    const only = fetch.mock.calls[0]
    assert.ok(only)
    const [, init] = only.arguments as [string, RequestInit]
    assert.deepEqual(JSON.parse(init.body as string), { text: 'tpyo' })
  })

  it('posts the report itself when no format is given', async () => {
    const fetch = answer(200)
    await webhook('https://hooks.example/')(report)
    const only = fetch.mock.calls[0]
    assert.ok(only)
    const [url, init] = only.arguments as [string, RequestInit]
    assert.equal(url, 'https://hooks.example/')
    assert.equal(init.method, 'POST')
    assert.deepEqual(init.headers, { 'Content-Type': 'application/json' })
    assert.equal(init.keepalive, true)
    assert.equal(init.credentials, 'omit')
    assert.deepEqual(JSON.parse(init.body as string), report)
  })

  it('rejects when the webhook refuses the report', async () => {
    answer(500)
    await assert.rejects(webhook('https://hooks.example/')(report), /webhook answered 500/)
  })
})
