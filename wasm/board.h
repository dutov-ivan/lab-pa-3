#ifndef CONSTANTS_H
#define CONSTANTS_H

#include <cstdint>

constexpr uint64_t bit_at(int x, int y, int z) {
    return 1ULL << (x + 4 * y + 16 * z);
}

struct Board {
    std::uint64_t x_mask = 0;
    std::uint64_t o_mask = 0;
};


#endif // CONSTANTS_H