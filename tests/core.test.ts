// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { pick } from '../src/core.js'
import en from '../locales/en.yaml'
import es from '../locales/es.yaml'
import uk from '../locales/uk.yaml'

describe('pick', () => {
  const catalog = { en, es, uk }

  it('resolves a regional tag to its base locale', () => {
    assert.equal(pick(catalog, 'uk-UA')[0], 'uk')
    assert.equal(pick(catalog, 'ES')[0], 'es')
  })

  it('falls back to the first locale', () => {
    assert.equal(pick(catalog, 'ja')[0], 'en')
  })
})

describe('locales', () => {
  it('carry every key the English catalog has', () => {
    for (const messages of [es, uk]) {
      assert.deepEqual(
        Object.keys(messages).toSorted((a, b) => a.localeCompare(b)),
        Object.keys(en).toSorted((a, b) => a.localeCompare(b))
      )
    }
  })
})
