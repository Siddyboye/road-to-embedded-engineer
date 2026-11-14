#include "shell.h"
#include <string.h>

int shell_exec(char *line, const shell_cmd_t *table, size_t n_cmds)
{
    char *argv[SHELL_MAX_ARGS];
    int argc = 0;
    char *p = line;

    while (*p != '\0' && argc < SHELL_MAX_ARGS) {
        while (*p == ' ' || *p == '\t' || *p == '\r' || *p == '\n') {
            *p++ = '\0';
        }
        if (*p == '\0') {
            break;
        }
        argv[argc++] = p;
        while (*p != '\0' && *p != ' ' && *p != '\t' && *p != '\r' && *p != '\n') {
            p++;
        }
    }
    if (argc == 0) {
        return 0;
    }
    for (size_t i = 0; i < n_cmds; i++) {
        if (strcmp(argv[0], table[i].name) == 0) {
            return table[i].fn(argc, argv);
        }
    }
    return SHELL_UNKNOWN;
}
