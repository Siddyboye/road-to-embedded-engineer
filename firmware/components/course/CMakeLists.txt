# The course's portable C, compiled from firmware/host so the firmware and the host tests share one copy.
set(host "${CMAKE_CURRENT_LIST_DIR}/../../host")
idf_component_register(SRCS "${host}/ringbuf.c" "${host}/crc8.c" "${host}/frame.c" "${host}/convert.c"
                            "${host}/nmea.c" "${host}/modbus.c" "${host}/bmp280_comp.c" "${host}/shell.c"
                       INCLUDE_DIRS "${host}")
