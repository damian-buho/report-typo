// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

import es from '../../locales/es.yaml'
import { create } from '../core.js'

export type { Options } from '../core.js'
export type { Confirmation, Draft, Messages, Send, TypoBody, TypoReport, Ui } from '../types.js'
export { relay } from '../transport/relay.js'
export { webhook, type Format } from '../transport/webhook.js'

/** Starts listening for Ctrl+Enter and returns the function that stops it. */
export const reportTypo = create({ es })
