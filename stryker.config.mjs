// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

// @ts-check
const config = {
  _comment:
    "This config was generated using 'stryker init'. Please take a look at: https://stryker-mutator.io/docs/stryker-js/configuration/ for more information.",
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress', 'json'],
  testRunner: 'command',
  testRunner_comment:
    "Take a look at (missing 'homepage' URL in package.json) for information about the command plugin.",
  coverageAnalysis: 'off',
  buildCommand: 'npm run build:test',
  commandRunner: {
    command: "node --test 'dist/test/*.test.js'"
  },
  concurrency: 1,
  timeoutMS: 10_000
}
export default config
