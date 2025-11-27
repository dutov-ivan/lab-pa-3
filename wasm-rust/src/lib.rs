pub mod board;
pub mod constants;
pub mod engine;
pub mod game;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Clone, Copy, Debug)]
pub enum AiDifficulty {
    Easy,
    Medium,
    Hard,
}

#[wasm_bindgen]
pub fn find_ai_move(x_mask: u64, o_mask: u64, player: u8, difficulty: AiDifficulty) -> i32 {
    let max_depth = match difficulty {
        AiDifficulty::Easy => 2,
        AiDifficulty::Medium => 4,
        AiDifficulty::Hard => 6,
    };
    let board = Board { x_mask, o_mask };
    let game = Game {
        board,
        current_player: if player == 1 { Player::X } else { Player::O },
    };
    let config = EngineConfig { max_depth };
    find_best_move(&game, &config)
}

pub use board::Board;
pub use constants::WIN_MASKS;
pub use engine::{find_best_move, EngineConfig};
pub use game::{Game, GameState, Player};
