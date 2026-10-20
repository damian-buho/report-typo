// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { reportTypo as reportTypoAll } from '../src/index.js'
import { reportTypo as reportTypoEn } from '../src/entries/en.js'
import { reportTypo as reportTypoEs } from '../src/entries/es.js'
import { reportTypo as reportTypoUk } from '../src/entries/uk.js'
import type { Options } from '../src/core.js'
import { mountDom, type Dom } from './dom.js'

describe('entries', () => {
  let dom: Dom
  let logs: { message: string; data: unknown }[]

  beforeEach(() => {
    dom = mountDom()
    logs = []
    mock.method(console, 'debug', (message: string, data?: unknown) => {
      logs.push({ message, data })
    })
  })

  afterEach(() => {
    dom.restore()
    mock.restoreAll()
  })

  const locale = (reportTypo: (options: Options) => () => void): string => {
    const stop = reportTypo({ endpoint: 'https://relay.example/' })
    const entry = logs.findLast(log => log.message === 'report-typo: listening')
    stop()
    return (entry?.data as { locale: string }).locale
  }

  it('serves every locale of the full bundle', () => {
    assert.equal(locale(reportTypoAll), 'en')
  })

  it('serves the locale of the bundle', () => {
    assert.equal(locale(reportTypoEn), 'en')
    assert.equal(locale(reportTypoEs), 'es')
    assert.equal(locale(reportTypoUk), 'uk')
  })
})
