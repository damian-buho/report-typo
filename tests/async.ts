// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

/** Waits for the pending microtasks and one macrotask. */
export const tick = (): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, 0)
  })

/** The state of a promise after it settled or the deadline passed. */
export interface Outcome<T> {
  ok: boolean
  value?: T
  error?: unknown
}

/** Reads the state of a promise without waiting for it forever. */
export const outcome = async <T>(promise: Promise<T>, deadline = 50): Promise<Outcome<T>> => {
  let state: Outcome<T> = { ok: false }
  void promise
    .then(value => {
      state = { ok: true, value }
      return state
    })
    .catch(error => {
      state = { ok: true, error }
      return state
    })
  for (let wait = 0; wait < deadline && !state.ok; wait += 1) {
    await new Promise(resolve => {
      setTimeout(resolve, 1)
    })
  }
  return state
}
