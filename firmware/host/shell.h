/* Table-driven command shell. Lessons 1.12 and 3.1. */
#ifndef SHELL_H
#define SHELL_H

#include <stddef.h>

#define SHELL_MAX_ARGS  8
#define SHELL_UNKNOWN   (-1)

typedef int (*shell_fn_t)(int argc, char **argv);
typedef struct { const char *name; const char *help; shell_fn_t fn; } shell_cmd_t;

/* Splits `line` in place into words and runs the matching command.
 * Returns the handler's result, 0 for an empty line, SHELL_UNKNOWN when no command matches. */
int shell_exec(char *line, const shell_cmd_t *table, size_t n_cmds);

#endif
