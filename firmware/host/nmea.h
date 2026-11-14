/* NMEA 0183 sentence helpers. Lesson 3.1. */
#ifndef NMEA_H
#define NMEA_H

#include <stdbool.h>

bool nmea_checksum_ok(const char *sentence);                     /* "$GPGGA,...*47": XOR of the characters between $ and * */
int  nmea_split(char *sentence, char *fields[], int max_fields); /* splits in place at ',' and '*'; returns the field count */

#endif
