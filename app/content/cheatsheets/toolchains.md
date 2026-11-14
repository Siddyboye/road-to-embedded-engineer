---
title: idf.py and PlatformIO, side by side
order: 0
---

Every firmware lab builds two ways from the same files. Use whichever you prefer; lessons say “build and flash” and mean either column. Both use the ESP-IDF framework underneath. Arduino appears only where a lesson compares against it.

| Task | ESP-IDF command line | PlatformIO |
| --- | --- | --- |
| Choose the chip | `idf.py set-target esp32s3` | Pick an environment: `-e esp32s3`, `-e esp32cam` or `-e esp32dev` |
| Build | `idf.py build` | `pio run -e esp32s3` |
| Flash | `idf.py -p PORT flash` | `pio run -e esp32s3 -t upload` |
| Serial monitor | `idf.py -p PORT monitor`, leave with Ctrl+] | `pio device monitor`, leave with Ctrl+C |
| Flash and monitor | `idf.py flash monitor` | `pio run -e esp32s3 -t upload -t monitor` |
| Configuration menu | `idf.py menuconfig` | `pio run -e esp32s3 -t menuconfig` |
| Size report | `idf.py size`, `idf.py size-components` | `pio run -e esp32s3 -t size` |
| Clean everything | `idf.py fullclean` | `pio run -t fullclean` |
| Your saved options | `sdkconfig.defaults`, `sdkconfig.defaults.<target>` | The same files |
| The generated configuration | `sdkconfig` | `sdkconfig.<environment>` |
| Build output | `build/` | `.pio/build/<environment>/` |
| Add a library | `idf.py add-dependency "espressif/mqtt"` | The same `main/idf_component.yml` file, edited by hand |

Three differences worth knowing:

- **Which ESP-IDF you get.** With `idf.py` you install the version you choose. PlatformIO bundles one with its `espressif32` platform. Platform 8.0.0, released on 19 October 2026, ships ESP-IDF 6.1, which is the version this course is written against; the older 6.x platform releases ship ESP-IDF 5.x. Every lab’s `platformio.ini` asks for `espressif32 @ ^8.0.0`, so PlatformIO installs the right one. If a build complains about that line, update PlatformIO itself (`pio upgrade`).
- **Libraries from the component registry.** Labs that need one (USB, camera) declare it in `main/idf_component.yml`. PlatformIO downloads it on the first build, so that build needs an internet connection.
- **Where the source lives.** PlatformIO normally expects `src/`. Each lab’s `platformio.ini` sets `src_dir = main`, so the ESP-IDF layout is kept and nothing is duplicated.
- **The S3 N16R8 board.** The labs use the generic `esp32-s3-devkitc-1` board with the flash size raised to 16 MB. The PSRAM and flash options come from `sdkconfig.defaults.esp32s3`, as they do under `idf.py`.

The `platformio.ini` files have not been run by me: PlatformIO could not be installed where the course was built. If a lab fails, send me the first error it prints.
