// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

import { Window } from 'happy-dom'

/** The globals the library reads at runtime. */
const globals = [
  'document',
  'navigator',
  'location',
  'getSelection',
  'Element',
  'CSSStyleSheet'
] as const

export interface Dom {
  window: Window
  document: Document
  /** Every element the code created, in order. */
  created: Element[]
  /** Every shadow root the code attached. */
  roots: ShadowRoot[]
  /** Restores the globals the window shadowed. */
  restore(): void
}

/** Mounts a happy-dom window on the globals the library reads. */
export const mountDom = (url = 'https://example.com/article'): Dom => {
  const window = new Window({ url })
  const document = window.document as unknown as Document
  const created: Element[] = []
  const roots: ShadowRoot[] = []
  const createElement = document.createElement.bind(document) as (
    tag: string,
    options?: ElementCreationOptions
  ) => Element
  document.createElement = ((tag: string, options?: ElementCreationOptions) => {
    const element = createElement(tag, options)
    created.push(element)
    const attach = element.attachShadow.bind(element)
    element.attachShadow = (init: ShadowRootInit) => {
      const root = attach(init)
      roots.push(root)
      return root
    }
    return element
  }) as Document['createElement']
  const saved = globals.map(
    name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const
  )
  for (const name of globals) {
    const value =
      name === 'getSelection'
        ? () => window.getSelection()
        : (window as unknown as Record<string, unknown>)[name]
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true })
  }
  return {
    window,
    document,
    created,
    roots,
    restore() {
      for (const [name, descriptor] of saved) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor)
        else Reflect.deleteProperty(globalThis, name)
      }
      void window.happyDOM.close()
    }
  }
}

/** The element the code created with this tag. */
export const created = (dom: Dom, tag: string): Element | undefined =>
  dom.created.find(element => element.tagName.toLowerCase() === tag)

/** Selects a slice of the text of the first match of the selector. */
export const select = (dom: Dom, selector: string, from: number, to: number): Selection => {
  const element = dom.document.querySelector(selector)
  const text = element?.firstChild
  if (!text) throw new Error(`no text to select in ${selector}`)
  const range = dom.document.createRange()
  range.setStart(text, from)
  range.setEnd(text, to)
  const selection = dom.window.getSelection()
  selection.removeAllRanges()
  selection.addRange(range as unknown as Parameters<typeof selection.addRange>[0])
  return selection as unknown as Selection
}
