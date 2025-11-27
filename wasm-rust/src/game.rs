use crate::board::{bit_at, Board};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Player {
    None = 0,
    X = 1,
    O = 2,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum GameState {
    Ongoing,
    Draw,
    XWins,
    OWins,
}

pub struct Game {
    pub board: Board,
    pub current_player: Player,
}

impl Game {
    pub fn new() -> Self {
        Self {
            board: Board::new(),
            current_player: Player::X,
        }
    }

    pub fn make_move(&mut self, x: i32, y: i32, z: i32) -> bool {
        if x < 0 || x >= 4 || y < 0 || y >= 4 || z < 0 || z >= 4 {
            return false;
        }

        let move_bit = bit_at(x, y, z);
        if (self.board.x_mask & move_bit) != 0 || (self.board.o_mask & move_bit) != 0 {
            return false; // Cell already occupied
        }

        match self.current_player {
            Player::X => {
                self.board.x_mask |= move_bit;
                self.current_player = Player::O;
            }
            Player::O => {
                self.board.o_mask |= move_bit;
                self.current_player = Player::X;
            }
            Player::None => return false,
        }
        true
    }

    pub fn check_game_state(&self) -> GameState {
        use crate::constants::WIN_MASKS;

        for &mask in &WIN_MASKS {
            if (self.board.x_mask & mask) == mask {
                return GameState::XWins;
            }
            if (self.board.o_mask & mask) == mask {
                return GameState::OWins;
            }
        }

        // Check for draw (full board)
        let occupied = self.board.x_mask | self.board.o_mask;
        if occupied.count_ones() == 64 {
            return GameState::Draw;
        }

        GameState::Ongoing
    }

    pub fn reset(&mut self) {
        self.board = Board::new();
        self.current_player = Player::X;
    }

    pub fn print_board(&self) {
        for z in 0..4 {
            for y in 0..4 {
                for x in 0..4 {
                    let c = if (self.board.x_mask & bit_at(x, y, z)) != 0 {
                        'X'
                    } else if (self.board.o_mask & bit_at(x, y, z)) != 0 {
                        'O'
                    } else {
                        '.'
                    };
                    print!("{} ", c);
                }
                println!();
            }
            println!();
        }
    }

    pub fn get_current_player(&self) -> Player {
        self.current_player
    }

    pub fn get_board(&self) -> &Board {
        &self.board
    }
}

impl Default for Game {
    fn default() -> Self {
        Self::new()
    }
}
