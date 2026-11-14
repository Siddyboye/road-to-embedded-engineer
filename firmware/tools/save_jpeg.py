#!/usr/bin/env python3
"""Save the JPEG that lab 3.10 prints at start-up.

    pip install pyserial
    python save_jpeg.py PORT [frame.jpg]

Run it, then press reset on the ESP32-CAM. It waits for the marker lines, converts the hex between them
to bytes and writes the file.
"""
import sys

import serial


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    port, out = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else "frame.jpg")
    with serial.Serial(port, 115200, timeout=10) as link:
        print("waiting for a frame: press reset on the board")
        expected, hex_text, inside = 0, [], False
        while True:
            line = link.readline().decode(errors="replace").strip()
            if not line and not inside:
                continue
            if line.startswith("===JPEG BEGIN"):
                expected, inside = int(line.split()[2].rstrip("=")), True
            elif line.startswith("===JPEG END"):
                break
            elif inside:
                hex_text.append(line)
    data = bytes.fromhex("".join(hex_text))
    if len(data) != expected or data[:2] != b"\xff\xd8":
        print(f"got {len(data)} bytes, expected {expected}; the frame looks damaged")
        return 1
    with open(out, "wb") as f:
        f.write(data)
    print(f"saved {len(data)} bytes to {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
