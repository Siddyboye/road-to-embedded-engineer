# No PRIV_REQUIRES: like the official example, main then depends on every component, including the managed one.
idf_component_register(SRCS "main.c"
                       INCLUDE_DIRS ".")
