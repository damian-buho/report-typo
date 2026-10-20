// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { create, pick } from '../src/core.js'
import en from '../locales/en.yaml'
import es from '../locales/es.yaml'
import uk from '../locales/uk.yaml'
import { created, mountDom, select, type Dom } from './dom.js'
import { tick } from './async.js'
import type { Confirmation, TypoReport } from '../src/types.js'

const catalog = { en, es, uk }
const page = '<p>the quick brown fox jumps</p>'

describe('reportTypo', () => {
  let dom: Dom
  let reports: TypoReport[]
  let logs: { message: string; data: unknown }[]

  beforeEach(() => {
    dom = mountDom()
    reports = []
    logs = []
    mock.method(console, 'debug', (message: string, data?: unknown) => {
      logs.push({ message, data })
    })
  })

  afterEach(() => {
    dom.restore()
    mock.restoreAll()
  })

  const logged = (message: string) =>
    logs.find(entry => entry.message === `report-typo: ${message}`)

  const payload = (message: string): Record<string, unknown> =>
    (logged(message)?.data ?? {}) as Record<string, unknown>

  const press = (
    target: EventTarget,
    init: { key?: string; ctrlKey?: boolean; metaKey?: boolean } = {}
  ): Event => {
    const event = new dom.window.KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
      ...init
    })
    target.dispatchEvent(event as unknown as Event)
    return event as unknown as Event
  }

  const send = async (report: TypoReport): Promise<void> => {
    reports.push(report)
  }

  it('requires an endpoint or a send function', () => {
    const reportTypo = create(catalog)
    assert.throws(() => reportTypo({}), /report-typo: set `endpoint` or `send`/)
    assert.throws(() => reportTypo({ endpoint: '' }), /report-typo: set `endpoint` or `send`/)
  })

  it('logs what it listens for', () => {
    const stop = create(catalog)({ endpoint: 'https://relay.example/' })
    assert.deepEqual(logged('listening')?.data, {
      locale: 'en',
      transport: 'relay',
      cooldownMs: 2000
    })
    stop()
  })

  it('sends the report through the relay', async () => {
    dom.document.body.innerHTML = page
    select(dom, 'p', 10, 15)
    const fetch = mock.method(
      globalThis,
      'fetch',
      async () => new Response(undefined, { status: 204 })
    )
    const stop = create(catalog)({ endpoint: 'https://relay.example/', ui: async () => ({}) })
    const event = press(dom.document)
    await tick()
    assert.equal(event.defaultPrevented, true)
    assert.equal(fetch.mock.callCount(), 1)
    const first = fetch.mock.calls[0]
    assert.ok(first)
    const [url, init] = first.arguments as unknown as [string, RequestInit]
    assert.equal(url, 'https://relay.example/')
    assert.deepEqual(JSON.parse(init.body as string), [
      {
        type: 'typo',
        age: 0,
        url: 'https://example.com/article',
        body: { selection: 'brown', prefix: 'the quick ', suffix: ' fox jumps', lang: 'en' }
      }
    ])
    assert.deepEqual(logged('sent')?.data, {
      selection: 'brown',
      transport: 'relay',
      comment: false
    })
    stop()
  })

  it('sends the report through the webhook', async () => {
    dom.document.body.innerHTML = page
    select(dom, 'p', 10, 15)
    const fetch = mock.method(
      globalThis,
      'fetch',
      async () => new Response(undefined, { status: 200 })
    )
    const stop = create(catalog)({
      endpoint: 'https://hooks.example/',
      transport: 'webhook',
      format: report => ({ text: report.body.selection }),
      ui: async () => ({})
    })
    press(dom.document)
    await tick()
    assert.equal(fetch.mock.callCount(), 1)
    const only = fetch.mock.calls[0]
    assert.ok(only)
    const [, init] = only.arguments as unknown as [string, RequestInit]
    assert.deepEqual(JSON.parse(init.body as string), { text: 'brown' })
    stop()
  })

  it('sends the report with the send function of the caller', async () => {
    dom.document.body.innerHTML = page
    select(dom, 'p', 10, 15)
    const fetch = mock.method(
      globalThis,
      'fetch',
      async () => new Response(undefined, { status: 204 })
    )
    const stop = create(catalog)({ send, endpoint: 'https://relay.example/', ui: async () => ({}) })
    press(dom.document)
    await tick()
    assert.equal(reports.length, 1)
    assert.equal(reports[0]?.body.selection, 'brown')
    assert.equal(fetch.mock.callCount(), 0)
    stop()
  })

  it('ignores a key press that is not the trigger', async () => {
    dom.document.body.innerHTML = page
    select(dom, 'p', 10, 15)
    const stop = create(catalog)({ send, ui: async () => ({}) })
    press(dom.document, { key: 'a', ctrlKey: false })
    await tick()
    assert.equal(reports.length, 0)
    stop()
  })

  it('ignores a key press inside a field', async () => {
    const field = dom.document.createElement('input')
    dom.document.body.append(field)
    const stop = create(catalog)({ send, ui: async () => ({}) })
    press(field)
    await tick()
    assert.equal(reports.length, 0)
    assert.equal(payload('ignored in an editable field').target === field, true)
    stop()
  })

  it('ignores a key press without a selection', async () => {
    let calls = 0
    const stop = create(catalog)({
      send,
      ui: async () => {
        calls += 1
        return null
      }
    })
    const event = press(dom.document)
    await tick()
    assert.equal(calls, 0)
    assert.equal(reports.length, 0)
    assert.equal(event.defaultPrevented, false)
    assert.equal(payload('ignored without a selection').maxSelection, 256)
    stop()
  })

  it('ignores a second report while cooling down', async () => {
    let now = 1000
    mock.method(Date, 'now', () => now)
    dom.document.body.innerHTML = page
    select(dom, 'p', 10, 15)
    const stop = create(catalog)({ send, cooldownMs: 1000, ui: async () => ({}) })
    press(dom.document)
    await tick()
    assert.equal(reports.length, 1)
    now += 500
    press(dom.document)
    await tick()
    assert.equal(reports.length, 1)
    assert.equal(typeof payload('ignored while cooling down').wait, 'number')
    now += 500
    press(dom.document)
    await tick()
    assert.equal(reports.length, 2)
    stop()
  })

  it('ignores a second report while the dialog is open', async () => {
    let calls = 0
    const { promise, resolve } = Promise.withResolvers<Confirmation | undefined>()
    const ui = () => {
      calls += 1
      return promise
    }
    dom.document.body.innerHTML = page
    select(dom, 'p', 10, 15)
    const stop = create(catalog)({ send, ui })
    press(dom.document)
    await tick()
    press(dom.document)
    await tick()
    assert.equal(calls, 1)
    assert.equal(payload('ignored while the dialog is open').selection, 'brown')
    resolve(undefined)
    await tick()
    stop()
  })

  it('does not send when the reader cancels', async () => {
    dom.document.body.innerHTML = page
    select(dom, 'p', 10, 15)
    const stop = create(catalog)({ send, ui: async () => null })
    press(dom.document)
    await tick()
    assert.equal(reports.length, 0)
    assert.equal(payload('cancelled').selection, 'brown')
    assert.equal(logged('not sent'), undefined)
    stop()
  })

  it('keeps listening when the delivery fails', async () => {
    const failure = new Error('boom')
    let calls = 0
    dom.document.body.innerHTML = page
    select(dom, 'p', 10, 15)
    const stop = create(catalog)({
      send: async () => {
        calls += 1
        throw failure
      },
      cooldownMs: 0,
      ui: async () => ({})
    })
    press(dom.document)
    await tick()
    assert.equal(calls, 1)
    assert.equal(payload('not sent').error === failure, true)
    press(dom.document)
    await tick()
    assert.equal(calls, 2)
    stop()
  })

  it('sends the comment of the reader', async () => {
    dom.document.body.innerHTML = page
    select(dom, 'p', 10, 15)
    const stop = create(catalog)({ send, ui: async () => ({ comment: '  well written  ' }) })
    press(dom.document)
    await tick()
    assert.equal(reports[0]?.body.comment, 'well written')
    assert.deepEqual(logged('sent')?.data, {
      selection: 'brown',
      transport: 'relay',
      comment: true
    })
    stop()
  })

  it('sends the report from the built-in dialog', async () => {
    dom.document.body.innerHTML = page
    select(dom, 'p', 10, 15)
    const fetch = mock.method(
      globalThis,
      'fetch',
      async () => new Response(undefined, { status: 204 })
    )
    const stop = create(catalog)({ endpoint: 'https://relay.example/' })
    press(dom.document)
    await tick()
    const dialog = created(dom, 'dialog') as HTMLDialogElement
    assert.ok(dialog)
    assert.equal(dialog.querySelectorAll('textarea').length, 0)
    dialog.close('send')
    await tick()
    assert.equal(fetch.mock.callCount(), 1)
    stop()
  })

  it('picks the locale of the caller', () => {
    const stop = create(catalog)({ endpoint: 'https://relay.example/', locale: 'es' })
    assert.deepEqual(logged('listening')?.data, {
      locale: 'es',
      transport: 'relay',
      cooldownMs: 2000
    })
    stop()
  })

  it('follows the language of the page', () => {
    dom.document.documentElement.lang = 'uk'
    const stop = create(catalog)({ endpoint: 'https://relay.example/' })
    assert.deepEqual(logged('listening')?.data, {
      locale: 'uk',
      transport: 'relay',
      cooldownMs: 2000
    })
    stop()
  })

  it('stops listening when disposed', async () => {
    dom.document.body.innerHTML = page
    select(dom, 'p', 10, 15)
    const stop = create(catalog)({ send, ui: async () => ({}) })
    stop()
    press(dom.document)
    await tick()
    assert.equal(reports.length, 0)
    assert.equal(payload('disposed').locale, 'en')
  })
})

describe('pick', () => {
  const catalog = { en, es, uk }

  it('resolves a regional tag to its base locale', () => {
    assert.equal(pick(catalog, 'uk-UA')[0], 'uk')
    assert.equal(pick(catalog, 'ES')[0], 'es')
  })

  it('falls back to the first locale', () => {
    assert.equal(pick(catalog, 'ja')[0], 'en')
  })

  it('refuses an empty catalog', () => {
    assert.throws(() => pick({}, 'en'), /report-typo: empty locale catalog/)
  })
})
