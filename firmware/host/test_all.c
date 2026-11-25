/* Host tests for the Phase 1 modules. No framework: lesson 1.14 replaces this runner with Unity.
 * Build and run:  make test */
#include <stdio.h>
#include <string.h>
#include "ringbuf.h"
#include "crc8.h"
#include "frame.h"
#include "convert.h"
#include "nmea.h"
#include "modbus.h"
#include "bmp280_comp.h"
#include "shell.h"

static int failures, checks;
#define CHECK(cond) do { checks++; if (!(cond)) { failures++; printf("FAIL %s:%d  %s\n", __FILE__, __LINE__, #cond); } } while (0)

static void test_ringbuf(void)
{
    uint8_t store[8], b = 0;
    ringbuf_t rb;
    CHECK(!rb_init(&rb, store, 6));                 /* not a power of two */
    CHECK(rb_init(&rb, store, 8));
    CHECK(rb_count(&rb) == 0 && rb_space(&rb) == 8);
    CHECK(!rb_get(&rb, &b));                        /* empty */
    for (uint8_t i = 0; i < 8; i++) CHECK(rb_put(&rb, i));
    CHECK(!rb_put(&rb, 99));                        /* full: all eight slots used */
    CHECK(rb_count(&rb) == 8 && rb_space(&rb) == 0);
    for (uint8_t i = 0; i < 8; i++) { CHECK(rb_get(&rb, &b)); CHECK(b == i); }   /* first in, first out */
    CHECK(rb_count(&rb) == 0);

    rb.head = rb.tail = 0xFFFFFFFCu;                /* the counters are about to wrap */
    for (uint8_t i = 0; i < 6; i++) CHECK(rb_put(&rb, (uint8_t)(i + 10)));
    CHECK(rb_count(&rb) == 6);
    for (uint8_t i = 0; i < 6; i++) { CHECK(rb_get(&rb, &b)); CHECK(b == i + 10); }
}

static void test_crc8(void)
{
    const uint8_t msg[] = "123456789";
    CHECK(crc8_bitwise(msg, 9) == 0xF4);            /* published check value for CRC-8 */
    CHECK(crc8_table(msg, 9) == 0xF4);
    CHECK(crc8_bitwise(msg, 0) == 0x00);
    uint8_t flipped[9];
    memcpy(flipped, msg, 9);
    flipped[4] ^= 0x01;                             /* any single-bit error is detected */
    CHECK(crc8_bitwise(flipped, 9) != 0xF4);
}

static frame_result_t feed_all(frame_parser_t *p, const uint8_t *bytes, size_t n)
{
    frame_result_t last = FRAME_NONE;
    for (size_t i = 0; i < n; i++) {
        frame_result_t r = frame_feed(p, bytes[i]);
        if (r != FRAME_NONE) last = r;
    }
    return last;
}

static void test_frame(void)
{
    frame_parser_t p;
    uint8_t body[] = { 3, 'a', 'b', 'c' };          /* length, then payload */
    uint8_t good[] = { FRAME_SOF, 3, 'a', 'b', 'c', 0 };
    good[5] = crc8_bitwise(body, sizeof body);

    frame_init(&p);
    CHECK(feed_all(&p, good, sizeof good) == FRAME_OK);
    CHECK(p.len == 3 && memcmp(p.payload, "abc", 3) == 0);

    uint8_t noisy[] = { 0x00, 0x55, FRAME_SOF, 3, 'a', 'b', 'c', good[5] };   /* junk before the start byte */
    frame_init(&p);
    CHECK(feed_all(&p, noisy, sizeof noisy) == FRAME_OK);

    uint8_t bad[] = { FRAME_SOF, 3, 'a', 'X', 'c', good[5] };
    frame_init(&p);
    CHECK(feed_all(&p, bad, sizeof bad) == FRAME_BAD_CRC);
    CHECK(feed_all(&p, good, sizeof good) == FRAME_OK);                        /* recovers on the next frame */

    uint8_t toolong[] = { FRAME_SOF, FRAME_MAX + 1 };
    frame_init(&p);
    CHECK(feed_all(&p, toolong, sizeof toolong) == FRAME_BAD_LENGTH);
}

static void test_convert(void)
{
    CHECK(bcd_to_bin(0x59) == 59 && bin_to_bcd(59) == 0x59 && bcd_to_bin(0x00) == 0);
    CHECK(ds18b20_raw_to_milli_c(0x0191) == 25062);                 /* datasheet: +25.0625 C  */
    CHECK(ds18b20_raw_to_milli_c((int16_t)0xFF5E) == -10125);       /* datasheet: -10.125 C   */
    CHECK(ds18b20_raw_to_milli_c(0x07D0) == 125000);                /* datasheet: +125 C      */
    const uint8_t msg[] = "123456789";
    CHECK(crc8_maxim(msg, 9) == 0xA1);                              /* published check value for CRC-8/MAXIM */
    CHECK(mpu6050_accel_to_mg(16384) == 1000 && mpu6050_accel_to_mg(-8192) == -500);
    const uint8_t rx[3] = { 0xFF, 0xFE, 0x9A };                     /* only the low 10 bits count */
    CHECK(mcp3008_decode(rx) == 0x29A);
    const uint8_t be[2] = { 0xFF, 0x38 };
    CHECK(be16(be) == -200);
}

static void test_nmea(void)
{
    char gga[] = "$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47";
    CHECK(nmea_checksum_ok(gga));
    char bad[] = "$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*48";
    CHECK(!nmea_checksum_ok(bad));
    CHECK(!nmea_checksum_ok("GPGGA,1*00") && !nmea_checksum_ok("$GPGGA,1"));
    char *f[20];
    int n = nmea_split(gga, f, 20);
    CHECK(n == 15);
    CHECK(strcmp(f[0], "GPGGA") == 0 && strcmp(f[1], "123519") == 0 && strcmp(f[2], "4807.038") == 0 && strcmp(f[7], "08") == 0);
    CHECK(f[13][0] == '\0');                                        /* empty fields are kept, not skipped */
}

static void test_modbus(void)
{
    const uint8_t msg[] = "123456789";
    CHECK(modbus_crc16(msg, 9) == 0x4B37);                          /* published check value for CRC-16/MODBUS */
    uint8_t req[8];
    CHECK(modbus_build_read(1, 0, 2, req) == 8);
    const uint8_t want[8] = { 0x01, 0x03, 0x00, 0x00, 0x00, 0x02, 0xC4, 0x0B };
    CHECK(memcmp(req, want, 8) == 0);

    uint16_t holding[4] = { 0x1234, 0xABCD, 7, 8 };
    uint8_t resp[32];
    size_t n = modbus_slave_handle(1, req, 8, holding, 4, resp, sizeof resp);
    CHECK(n == 9 && resp[0] == 1 && resp[1] == 3 && resp[2] == 4);
    CHECK(resp[3] == 0x12 && resp[4] == 0x34 && resp[5] == 0xAB && resp[6] == 0xCD);
    CHECK(modbus_crc16(resp, n) == 0);                              /* CRC over a frame including its CRC is zero */

    CHECK(modbus_slave_handle(2, req, 8, holding, 4, resp, sizeof resp) == 0);     /* another unit: stay silent */
    req[7] ^= 0x01;
    CHECK(modbus_slave_handle(1, req, 8, holding, 4, resp, sizeof resp) == 0);     /* bad CRC: stay silent */

    modbus_build_read(1, 3, 2, req);                                               /* runs past the end */
    n = modbus_slave_handle(1, req, 8, holding, 4, resp, sizeof resp);
    CHECK(n == 5 && resp[1] == 0x83 && resp[2] == MODBUS_EX_ADDRESS);

    uint8_t wr[8] = { 0x01, 0x06, 0x00, 0x02, 0x00, 0x63, 0, 0 };
    uint16_t crc = modbus_crc16(wr, 6);
    wr[6] = (uint8_t)(crc & 0xFF); wr[7] = (uint8_t)(crc >> 8);
    n = modbus_slave_handle(1, wr, 8, holding, 4, resp, sizeof resp);
    CHECK(n == 8 && holding[2] == 99 && memcmp(resp, wr, 8) == 0);

    uint8_t unk[8] = { 0x01, 0x2B, 0, 0, 0, 0, 0, 0 };
    crc = modbus_crc16(unk, 6);
    unk[6] = (uint8_t)(crc & 0xFF); unk[7] = (uint8_t)(crc >> 8);
    n = modbus_slave_handle(1, unk, 8, holding, 4, resp, sizeof resp);
    CHECK(n == 5 && resp[1] == 0xAB && resp[2] == MODBUS_EX_FUNCTION);
}

static void test_bmp280(void)
{
    /* The worked example printed in the Bosch datasheet. */
    const bmp280_calib_t c = { 27504, 26435, -1000, 36477, -10685, 3024, 2855, 140, -7, 15500, -14600, 6000 };
    int32_t t_fine = 0;
    CHECK(bmp280_temp_centi_c(&c, 519888, &t_fine) == 2508);        /* 25.08 C */
    CHECK(t_fine == 128422);
    uint32_t p = bmp280_press_q24_8(&c, 415148, t_fine);
    CHECK(p / 256 == 100653);                                       /* 100653.27 Pa */
}

static int calls, last_argc;
static int cmd_led(int argc, char **argv) { calls++; last_argc = argc; return (argc > 1 && strcmp(argv[1], "on") == 0) ? 1 : 2; }
static int cmd_help(int argc, char **argv) { (void)argc; (void)argv; return 7; }

static void test_shell(void)
{
    const shell_cmd_t table[] = { { "help", "list commands", cmd_help }, { "led", "led on|off", cmd_led } };
    char a[] = "led on", b[] = "  led   off  \r\n", c[] = "", d[] = "reboot now", e[] = "help";
    CHECK(shell_exec(a, table, 2) == 1 && last_argc == 2);
    CHECK(shell_exec(b, table, 2) == 2 && last_argc == 2);
    CHECK(shell_exec(c, table, 2) == 0);
    CHECK(shell_exec(d, table, 2) == SHELL_UNKNOWN);
    CHECK(shell_exec(e, table, 2) == 7 && calls == 2);
}

int main(void)
{
    test_ringbuf();
    test_crc8();
    test_frame();
    test_convert();
    test_nmea();
    test_modbus();
    test_bmp280();
    test_shell();
    printf("%d checks, %d failed\n", checks, failures);
    return failures ? 1 : 0;
}
