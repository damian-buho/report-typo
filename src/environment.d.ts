// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

declare module '*.yaml' {
  const messages: import('./types.js').Messages
  export default messages
}
