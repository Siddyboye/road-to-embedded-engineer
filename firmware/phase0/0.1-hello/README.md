# 0.1 hello

Lesson 0.1 in the course app. Build status: **not yet built**. See the top-level README.

```
idf.py set-target esp32s3      # or esp32 for the ESP32-CAM and DevKitC-VE
idf.py build
idf.py flash monitor           # leave the monitor with Ctrl+]
```

Expected output after the boot log (numbers vary):

```
Hello from esp32s3: 2 core(s), silicon revision v<major>.<minor>
Free heap: <n> bytes
tick 0
tick 1
```
