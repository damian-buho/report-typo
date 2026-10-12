// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

/** The text a reader selected, with the words around it. */
export interface Draft {
  selection: string
  prefix: string
  suffix: string
}

/** The body of a `typo` report, as report-relay accepts it. */
export interface TypoBody extends Draft {
  lang: string
  comment?: string
}

/** One report in the Reporting API envelope. */
export interface TypoReport {
  type: 'typo'
  age: number
  url: string
  body: TypoBody
}

/** Delivers one report; rejects when it was not delivered. */
export type Send = (report: TypoReport) => Promise<void>

/** The strings of one locale. */
export interface Messages {
  dir: 'ltr' | 'rtl'
  title: string
  send: string
  cancel: string
}
