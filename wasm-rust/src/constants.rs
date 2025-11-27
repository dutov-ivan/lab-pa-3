use crate::board::bit_at;

const N: i32 = 4;

const fn generate_win_masks() -> [u64; 76] {
    let mut masks = [0u64; 76];
    let mut i = 0;

    // 1. Lines along X-axis
    let mut y = 0;
    while y < N {
        let mut z = 0;
        while z < N {
            let mut m = 0u64;
            let mut x = 0;
            while x < N {
                m |= bit_at(x, y, z);
                x += 1;
            }
            masks[i] = m;
            i += 1;
            z += 1;
        }
        y += 1;
    }

    // 2. Lines along Y-axis
    let mut x = 0;
    while x < N {
        let mut z = 0;
        while z < N {
            let mut m = 0u64;
            let mut y = 0;
            while y < N {
                m |= bit_at(x, y, z);
                y += 1;
            }
            masks[i] = m;
            i += 1;
            z += 1;
        }
        x += 1;
    }

    // 3. Lines along Z-axis
    let mut x = 0;
    while x < N {
        let mut y = 0;
        while y < N {
            let mut m = 0u64;
            let mut z = 0;
            while z < N {
                m |= bit_at(x, y, z);
                z += 1;
            }
            masks[i] = m;
            i += 1;
            y += 1;
        }
        x += 1;
    }

    // 4. Diagonals in each XY-plane
    let mut z = 0;
    while z < N {
        let mut m1 = 0u64;
        let mut m2 = 0u64;
        let mut d = 0;
        while d < N {
            m1 |= bit_at(d, d, z);
            m2 |= bit_at(d, N - 1 - d, z);
            d += 1;
        }
        masks[i] = m1;
        i += 1;
        masks[i] = m2;
        i += 1;
        z += 1;
    }

    // 5. Diagonals in each XZ-plane
    let mut y = 0;
    while y < N {
        let mut m1 = 0u64;
        let mut m2 = 0u64;
        let mut d = 0;
        while d < N {
            m1 |= bit_at(d, y, d);
            m2 |= bit_at(d, y, N - 1 - d);
            d += 1;
        }
        masks[i] = m1;
        i += 1;
        masks[i] = m2;
        i += 1;
        y += 1;
    }

    // 6. Diagonals in each YZ-plane
    let mut x = 0;
    while x < N {
        let mut m1 = 0u64;
        let mut m2 = 0u64;
        let mut d = 0;
        while d < N {
            m1 |= bit_at(x, d, d);
            m2 |= bit_at(x, d, N - 1 - d);
            d += 1;
        }
        masks[i] = m1;
        i += 1;
        masks[i] = m2;
        i += 1;
        x += 1;
    }

    // 7. Four main space diagonals
    let mut m1 = 0u64;
    let mut m2 = 0u64;
    let mut m3 = 0u64;
    let mut m4 = 0u64;
    let mut d = 0;
    while d < N {
        m1 |= bit_at(d, d, d);
        m2 |= bit_at(d, d, N - 1 - d);
        m3 |= bit_at(d, N - 1 - d, d);
        m4 |= bit_at(N - 1 - d, d, d);
        d += 1;
    }
    masks[i] = m1;
    i += 1;
    masks[i] = m2;
    i += 1;
    masks[i] = m3;
    i += 1;
    masks[i] = m4;

    masks
}

pub const WIN_MASKS: [u64; 76] = generate_win_masks();
