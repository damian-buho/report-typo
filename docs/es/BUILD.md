<!--
SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
SPDX-License-Identifier: MIT
pf-cli-managed: yes
-->

<!-- textlint-disable terminology,common-misspellings -->

[English](../BUILD.md) · [Українська](../uk/BUILD.md)

# Compilación

Clona el repositorio con sus submódulos:

```sh
git clone --recurse-submodules https://codeberg.org/damian-buho/report-typo report-typo && cd report-typo
```

- [Referencia del Makefile](../how-to/MAKEFILE.md)

Ejecuta `make` sin argumentos para el destino predeterminado; ejecuta `make help` para listar todos los destinos.

Puntos de entrada de la canalización:

- `make analyzed` — Ejecuta el análisis pesado (pruebas de mutación, benchmarks)
- `make audited` — Vuelve a escanear las dependencias fijadas y los artefactos publicados en busca de vulnerabilidades nuevas
- `make check-outdated` — Informa de cada dependencia fijada que va por detrás de su versión upstream
- `make ready-to-publish` — Ejecuta localmente el pipeline pseudo-CI — compila, prueba y escanea, sin publicar

<!-- textlint-enable -->
