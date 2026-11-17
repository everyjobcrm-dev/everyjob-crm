# Dependency licence inventory

Generated 2026-11-17 from `npm ls --omit=dev --all` (installed production dependencies, direct and transitive) and each package's `license` field. Regenerate before handover.

**Result:** 230 packages, all permissive or permissive in practice. No copyleft obligation on the application code. Items needing a note are under *Notes*.

## By licence

| Licence | Packages |
|---|---|
| MIT | 191 |
| ISC | 17 |
| Apache-2.0 | 10 |
| BSD-3-Clause | 3 |
| 0BSD | 1 |
| Apache-2.0 AND LGPL-3.0-or-later AND MIT | 1 |
| (MIT OR GPL-3.0-or-later) | 1 |
| (MIT AND Zlib) | 1 |
| Unlicense | 1 |
| UNKNOWN | 1 |
| MIT/X11 | 1 |
| CC-BY-4.0 | 1 |
| Apache-2.0 AND LGPL-3.0-or-later | 1 |

## Notes

| Package | Version | Licence | Note |
|---|---|---|---|
| @img/sharp-wasm32 | 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later AND MIT | As above (WebAssembly build of sharp). |
| jszip | 3.10.2 | (MIT OR GPL-3.0-or-later) | Dual licence; used under MIT. |
| pako | 1.0.11 | (MIT AND Zlib) | Both permissive. |
| buffers | 0.1.1 | UNKNOWN | No licence file (exceljs → unzipper → binary → buffers, by the author of MIT-licensed `binary`). Low risk; ask the exceljs maintainers or replace exceljs if the buyer requires strict SPDX coverage. |
| chainsaw | 0.1.0 | MIT/X11 | MIT variant, permissive. |
| caniuse-lite | 1.0.30001826 | CC-BY-4.0 | Browser-support data (caniuse-lite); attribution only, not shipped as code. |
| @img/sharp-win32-x64 | 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later | sharp prebuilt binary bundles libvips (LGPL), loaded dynamically and unmodified: LGPL obligations are met by the unmodified shared library; no copyleft on application code. |

## Direct dependencies

| Package | Version | Licence |
|---|---|---|
| @emnapi/core | 1.10.0 | MIT |
| @emnapi/runtime | 1.11.3 | MIT |
| @emnapi/wasi-threads | 1.2.1 | MIT |
| @hookform/resolvers | 5.5.7 | MIT |
| @img/sharp-wasm32 | 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later AND MIT |
| @napi-rs/wasm-runtime | 1.1.6 | MIT |
| @supabase/ssr | 0.12.3 | MIT |
| @supabase/supabase-js | 2.110.7 | MIT |
| @tybys/wasm-util | 0.10.3 | MIT |
| canvas-confetti | 1.9.4 | ISC |
| class-variance-authority | 0.7.1 | Apache-2.0 |
| clsx | 2.1.1 | MIT |
| exceljs | 4.4.0 | MIT |
| framer-motion | 12.42.2 | MIT |
| lucide-react | 1.25.0 | ISC |
| motion | 12.42.2 | MIT |
| next | 16.4.6 | MIT |
| react | 19.2.4 | MIT |
| react-dom | 19.2.4 | MIT |
| react-hook-form | 7.83.0 | MIT |
| tailwind-merge | 3.6.0 | MIT |
| zod | 3.25.76 | MIT |
