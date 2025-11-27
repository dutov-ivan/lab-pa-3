#[inline]
pub const fn bit_at(x: i32, y: i32, z: i32) -> u64 {
    1u64 << (x + 4 * y + 16 * z)
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct Board {
    pub x_mask: u64,
    pub o_mask: u64,
}

impl Board {
    pub fn new() -> Self {
        Self::default()
    }
}
