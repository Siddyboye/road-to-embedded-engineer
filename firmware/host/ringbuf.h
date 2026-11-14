/* Single-producer, single-consumer byte ring buffer. Lesson 1.8.
 * Capacity must be a power of two. head and tail are free-running counters:
 * the buffer is empty when they are equal and full when they differ by the capacity,
 * so every slot is usable and no "one slot left empty" rule is needed. */
#ifndef RINGBUF_H
#define RINGBUF_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

typedef struct {
    uint8_t *data;
    uint32_t mask;              /* capacity - 1 */
    volatile uint32_t head;     /* written only by the producer */
    volatile uint32_t tail;     /* written only by the consumer */
} ringbuf_t;

bool   rb_init(ringbuf_t *rb, uint8_t *storage, size_t capacity);
bool   rb_put(ringbuf_t *rb, uint8_t byte);    /* false when full  */
bool   rb_get(ringbuf_t *rb, uint8_t *byte);   /* false when empty */
size_t rb_count(const ringbuf_t *rb);
size_t rb_space(const ringbuf_t *rb);

#endif
