<!--
SPDX-FileCopyrightText: 2026 Damián Búho <damian.buho@proton.me>
SPDX-License-Identifier: MIT
pf-cli-managed: yes
-->

[Español](es/BUILD.md) · [Українська](uk/BUILD.md)

# Building

Clone the repository with its submodules:

```sh
git clone --recurse-submodules https://codeberg.org/damian-buho/report-typo report-typo && cd report-typo
```

- [Makefile reference](how-to/MAKEFILE.md)

Run `make` with no arguments for the default target; run `make help` to list every target.

Pipeline entry points:

- `make analyzed` — Run the heavy analysis sweep (mutation testing, benchmarks)
- `make audited` — Re-scan the pinned dependencies and published artifacts for new vulnerabilities
- `make check-outdated` — Report every pinned dependency that lags upstream
- `make release-is-ready` — Run the pseudo-CI pipeline locally — build, test and scan, without publishing
