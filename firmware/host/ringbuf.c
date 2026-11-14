#include "ringbuf.h"

bool rb_init(ringbuf_t *rb, uint8_t *storage, size_t capacity)
{
    if (rb == NULL || storage == NULL || capacity == 0 || (capacity & (capacity - 1)) != 0) {
        return false;                       /* not a power of two */
    }
    rb->data = storage;
    rb->mask = (uint32_t)capacity - 1u;
    rb->head = 0;
    rb->tail = 0;
    return true;
}

size_t rb_count(const ringbuf_t *rb)
{
    return (size_t)(rb->head - rb->tail);   /* unsigned wrap-around makes this correct across overflow */
}

size_t rb_space(const ringbuf_t *rb)
{
    return (size_t)(rb->mask + 1u) - rb_count(rb);
}

bool rb_put(ringbuf_t *rb, uint8_t byte)
{
    if (rb_space(rb) == 0) {
        return false;
    }
    rb->data[rb->head & rb->mask] = byte;
    rb->head = rb->head + 1u;               /* publish only after the byte is stored */
    return true;
}

bool rb_get(ringbuf_t *rb, uint8_t *byte)
{
    if (rb_count(rb) == 0) {
        return false;
    }
    *byte = rb->data[rb->tail & rb->mask];
    rb->tail = rb->tail + 1u;
    return true;
}
