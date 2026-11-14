cmake_minimum_required(VERSION 3.22)

# Shared, host-tested course code (ring buffer, CRC, frame parser, conversions, Modbus, NMEA, shell).
set(EXTRA_COMPONENT_DIRS "${CMAKE_CURRENT_LIST_DIR}/../../components")

include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(modbus_slave)
