#ifndef CONSTANTS_H
#define CONSTANTS_H

#include <cstdint>
#include <array>

#include <array>
#include <cstdint>
#include "board.h"

constexpr int N = 4;

constexpr std::array<uint64_t, 76> generate_win_masks() {
    std::array<uint64_t, 76> masks{};
    int i = 0;

    // 1. Lines along X-axis
    for (int y = 0; y < N; ++y)
        for (int z = 0; z < N; ++z) {
            uint64_t m = 0;
            for (int x = 0; x < N; ++x) m |= bit_at(x, y, z);
            masks[i++] = m;
        }

    // 2. Lines along Y-axis
    for (int x = 0; x < N; ++x)
        for (int z = 0; z < N; ++z) {
            uint64_t m = 0;
            for (int y = 0; y < N; ++y) m |= bit_at(x, y, z);
            masks[i++] = m;
        }

    // 3. Lines along Z-axis
    for (int x = 0; x < N; ++x)
        for (int y = 0; y < N; ++y) {
            uint64_t m = 0;
            for (int z = 0; z < N; ++z) m |= bit_at(x, y, z);
            masks[i++] = m;
        }

    // 4. Diagonals in each XY-plane
    for (int z = 0; z < N; ++z) {
        uint64_t m1 = 0, m2 = 0;
        for (int d = 0; d < N; ++d) {
            m1 |= bit_at(d, d, z);
            m2 |= bit_at(d, N - 1 - d, z);
        }
        masks[i++] = m1;
        masks[i++] = m2;
    }

    // 5. Diagonals in each XZ-plane
    for (int y = 0; y < N; ++y) {
        uint64_t m1 = 0, m2 = 0;
        for (int d = 0; d < N; ++d) {
            m1 |= bit_at(d, y, d);
            m2 |= bit_at(d, y, N - 1 - d);
        }
        masks[i++] = m1;
        masks[i++] = m2;
    }

    // 6. Diagonals in each YZ-plane
    for (int x = 0; x < N; ++x) {
        uint64_t m1 = 0, m2 = 0;
        for (int d = 0; d < N; ++d) {
            m1 |= bit_at(x, d, d);
            m2 |= bit_at(x, d, N - 1 - d);
        }
        masks[i++] = m1;
        masks[i++] = m2;
    }

    // 7. Four main space diagonals
    {
        uint64_t m1 = 0, m2 = 0, m3 = 0, m4 = 0;
        for (int d = 0; d < N; ++d) {
            m1 |= bit_at(d, d, d);
            m2 |= bit_at(d, d, N - 1 - d);
            m3 |= bit_at(d, N - 1 - d, d);
            m4 |= bit_at(N - 1 - d, d, d);
        }
        masks[i++] = m1;
        masks[i++] = m2;
        masks[i++] = m3;
        masks[i++] = m4;
    }

    return masks;
}

inline constexpr std::array<uint64_t, 76> WIN_MASKS = generate_win_masks();


#endif // CONSTANTS_H