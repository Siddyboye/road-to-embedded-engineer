CC ?= gcc
CFLAGS = -std=c11 -Wall -Wextra -Werror -Wconversion -g -fsanitize=address,undefined
SRC = ringbuf.c crc8.c frame.c convert.c nmea.c modbus.c bmp280_comp.c shell.c test_all.c

test: $(SRC) $(wildcard *.h)
	$(CC) $(CFLAGS) $(SRC) -o test_all
	./test_all

clean:
	rm -f test_all

.PHONY: test clean
