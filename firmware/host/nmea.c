#include "nmea.h"
#include <stddef.h>

static int hex_value(char c)
{
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'A' && c <= 'F') return c - 'A' + 10;
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    return -1;
}

bool nmea_checksum_ok(const char *s)
{
    if (s == NULL || s[0] != '$') {
        return false;
    }
    unsigned sum = 0;
    const char *p = s + 1;
    while (*p != '\0' && *p != '*') {
        sum ^= (unsigned char)*p++;
    }
    if (*p != '*') {
        return false;                           /* no checksum field */
    }
    int hi = hex_value(p[1]);
    int lo = (hi < 0) ? -1 : hex_value(p[2]);
    return hi >= 0 && lo >= 0 && sum == (unsigned)(hi * 16 + lo);
}

int nmea_split(char *s, char *fields[], int max_fields)
{
    int n = 0;
    if (s == NULL || max_fields <= 0) {
        return 0;
    }
    if (*s == '$') {
        s++;
    }
    fields[n++] = s;
    for (; *s != '\0'; s++) {
        if (*s == '*' || *s == '\r' || *s == '\n') {
            *s = '\0';
            break;
        }
        if (*s == ',') {
            *s = '\0';
            if (n < max_fields) {
                fields[n++] = s + 1;
            }
        }
    }
    return n;
}
