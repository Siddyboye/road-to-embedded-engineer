# Embedded engineer, by building

A local-first course app plus a firmware repository: ESP32-S3 first, ESP-IDF in C, from signals and registers to edge AI. It contains the app (every page, 29 interactive tools, the quiz engine), all 126 lessons, and the firmware repository.

## Run the app

```
cd app
npm install
npm run dev          # opens on http://localhost:5173
```

Press Ctrl+K (or /) anywhere to jump to a lesson, tool or page.

Other commands: `npm run build` (static site in `app/dist`), `npm run selftest` (checks the maths behind the tools), `npm run typecheck`.

If `npm run dev` fails on your machine, `npm run build:esbuild` produces `app/dist-esbuild/index.html` using esbuild alone; open that file in a browser. Add `-- --single` for one self-contained HTML file.

Progress is stored in your browser only. Use **Your data** in the app to export, import or erase it.

## What was verified, and what was not

| Item | State |
| --- | --- |
| App source bundles and runs | Verified: bundled with esbuild; all 126 lessons, all 29 tools and all 11 phase quizzes loaded in headless Chromium with no page errors, no unknown widgets and no horizontal overflow at phone width |
| Tool logic and data | Verified: `npm run selftest`, 53 checks (CRC catalogue values, UART/I2C/SPI encode-decode, scheduler inversion, quantization, FFT, debounce, aliasing, float bits, struct layout, CAN arbitration, baud drift, PID, every quiz answer key, every cross-reference) |
| Host C code (`firmware/host`) | Verified: compiled with gcc 13, `-Wall -Wextra -Werror -Wconversion`, address and undefined-behaviour sanitizers; 93 checks pass, including the BMP280 datasheet example, the DS18B20 datasheet table, and published CRC and Modbus values |
| Reference firmware for Phases 0, 2 and 3 (37 sources) | **Not built.** Checked against the real ESP-IDF v6.1 source: every header, function, macro, type, struct field and component name they use exists there. Their protocol and conversion logic is the verified host code above. Argument types, linking and behaviour on hardware are untested |
| `npm install` and Vite | Run by you, reported working |
| Building firmware | **Not possible where this was written:** neither PlatformIO nor the ESP-IDF toolchain could be installed. Your `pio run`, or the GitHub Actions workflow, is the compile gate; `firmware/README.md` tracks status per lab |
| `platformio.ini` files | **Not run.** Written to the documented `framework = espidf` layout and pinned to `espressif32 @ ^8.0.0` (ESP-IDF 6.1, confirmed from the platform's own package list); your first `pio run` is their first test |
| Lessons for Phases 1 to 10 | Written as specifications: what to build, how it works, how to break it, how to check it. They do **not** yet come with reference firmware, except the host C code. API names in them follow the ESP-IDF v6 documentation as I know it and are not compiled |
| Fonts | Geist and Geist Mono load from Google Fonts when online; system fonts are used offline, and were what I saw in testing |

## Two toolchains

Every firmware lab builds with PlatformIO (`framework = espidf`) or with ESP-IDF's `idf.py`, from the same sources. Each `platformio.ini` pins `espressif32 @ ^8.0.0`, the platform release of 19 October 2026 that ships ESP-IDF 6.1. In any lab folder: `pio run -t upload -t monitor`. See the cheatsheet "idf.py and PlatformIO, side by side" in the app.

If the app shows "Unknown widget", your `app/src` is older than your `app/content`: replace the whole `app/` folder from the latest zip instead of merging. `npm run dev` now stops with that message if it detects the mismatch.

## Layout

```
app/
  content/            Markdown lessons and cheatsheets (the source of truth for prose)
    phase0/0.1.md
    cheatsheets/*.md
  scripts/            build-content.mjs, build-esbuild.mjs, selftest.ts
  src/
    data/             syllabus, roadmap boxes, hardware, books, glossary, projects, quiz bank
    lib/              router, progress store, Markdown renderer, UI helpers
    pages/            Dashboard, Roadmap, Phase, Lesson, Quiz, Hardware, Reading, Job market, ...
    widgets/          the 21 interactive tools
firmware/
  phase0/0.1-hello/   one ESP-IDF project per lab
  host/  tools/       host-side tests and Python tools (from Phase 1)
.github/workflows/    firmware-build.yml
```

## Writing content

A lesson is a Markdown file at `app/content/phase<N>/<id>.md`:

```
---
id: 0.1
title: Optional title override
status: Optional status chip, e.g. "draft"
---
```

A phase may instead be one file, `content/phase<N>/lessons.md`, holding many lessons. Each starts with a line `=== <id> | <status>`, and section headings are written as short markers (`@why`, `@need`, `@build`, `@how`, `@deep`, `@when`, `@break`, `@check`, `@stretch`, `@read`, `@pit`) that the content builder expands.

Two extensions beyond plain Markdown:

- `::widget <id>` on its own line embeds a tool. Ids are listed in `app/src/widgets/index.ts`; the content builder fails with a clear message if a lesson names one that does not exist.
- A fenced block with the language `expected` is styled as “serial output you should see”.

Task-list items (`- [ ]`) become checkboxes saved in the learner’s progress. Run `npm run content` (or just `npm run dev`) after adding files.

Quiz questions live in `app/src/data/quiz.ts`; the eight supported types are documented at the top of that file.

## Status

- Steps 1 to 3: done
- Step 4, content: all 11 phases are written, 126 lessons, each in the 11-part template; 83 quiz questions; 29 interactive tools, 42 lessons embed at least one
- Reference code: Phase 0 (7 labs), Phase 1 (host C, verified), Phases 2 and 3 (30 labs, plus an STM32 register file). All firmware is unbuilt until CI says otherwise. Phases 4 to 10 give build specifications only
- Lesson pages show where the reference is once you press “I have attempted it”
- Every lesson is marked draft until its code has been built
- Step 5, the capstone guide: the capstones are specified in the lessons and on the Projects page; a dedicated guide is still to write. Cheatsheets: toolchains, S3 pins, legacy drivers, protocols, C pitfalls, FreeRTOS, GDB

## Credits

The Roadmap page adapts the Embedded Systems Engineering Roadmap by Meysam Parvizi (v2.0.3, github.com/m3y54m/Embedded-Engineering-Roadmap), licensed CC BY-SA 4.0. The adaptation in `app/src/data/catalog.ts` and `app/src/pages/Roadmap.tsx` is shared under the same licence.
