// SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
//
// SPDX-License-Identifier: MIT

import { readFileSync } from 'node:fs'
import type { PluginBuild } from 'esbuild'
import { parse as loadYaml } from 'yaml'
import { defineConfig } from 'tsup'

const yamlPlugin = {
  name: 'yaml',
  setup(build: PluginBuild) {
    build.onLoad({ filter: /\.ya?ml$/, namespace: 'file' }, async (a: { path: string }) => ({
      contents: `export default ${JSON.stringify(loadYaml(readFileSync(a.path, 'utf8')))}`,
      loader: 'js'
    }))
  }
}

const shared = {
  format: ['esm'] as const,
  dts: false,
  target: 'es2022' as const,
  esbuildPlugins: [yamlPlugin]
}

export default defineConfig(
  process.env.TEST_BUILD === '1'
    ? {
        ...shared,
        entry: ['tests/*.test.ts'],
        outDir: 'dist/test',
        clean: false,
        platform: 'node' as const,
        removeNodeProtocol: false
      }
    : {
        ...shared,
        entry: {
          index: 'src/index.ts',
          en: 'src/entries/en.ts',
          es: 'src/entries/es.ts',
          uk: 'src/entries/uk.ts'
        },
        outDir: 'dist',
        clean: true,
        minify: true,
        sourcemap: true,
        splitting: false,
        platform: 'browser' as const
      }
)
