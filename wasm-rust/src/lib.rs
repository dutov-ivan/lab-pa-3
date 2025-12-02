pub mod board;
pub mod constants;
pub mod engine;
pub mod game;

use js_sys::Math;
use js_sys::Math;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Clone, Copy, Debug)]
pub enum AiDifficulty {
    Easy,
    Medium,
    Hard,
}

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum GameState {
    Ongoing,
    Draw,
    XWins,
    OWins,
}

#[wasm_bindgen]
pub fn find_ai_move(x_mask: u64, o_mask: u64, player: u8, difficulty: AiDifficulty) -> i32 {
    if let AiDifficulty::Easy = difficulty {
        let empty_cells = !(x_mask | o_mask);
        let mut possible_moves = Vec::new();

        for i in 0..64 {
            if (empty_cells & (1u64 << i)) != 0 {
                possible_moves.push(i);
            }
        }

        if !possible_moves.is_empty() {
            let idx = (Math::random() * (possible_moves.len() as f64)).floor() as usize;
            return possible_moves[idx] as i32;
        }
        return -1;
    }

    let max_depth = match difficulty {
        AiDifficulty::Easy => 1,
        AiDifficulty::Medium => 3,
        AiDifficulty::Hard => 5,
    };
    let board = Board { x_mask, o_mask };
    let game = Game {
        board,
        current_player: if player == 1 { Player::X } else { Player::O },
    };
    let hard_mode = matches!(difficulty, AiDifficulty::Hard);
    let config = EngineConfig::new_with_hard(max_depth, hard_mode);
    find_best_move(&game, &config)
}

#[wasm_bindgen]
pub fn check_game_state(x_mask: u64, o_mask: u64) -> GameState {
    let board = Board { x_mask, o_mask };
    let game = Game {
        board,
        current_player: Player::X, // current_player doesn't matter for state checking
    };
    match game.check_game_state() {
        game::GameState::Ongoing => GameState::Ongoing,
        game::GameState::Draw => GameState::Draw,
        game::GameState::XWins => GameState::XWins,
        game::GameState::OWins => GameState::OWins,
    }
}

#[wasm_bindgen]
pub fn get_winning_mask(x_mask: u64, o_mask: u64) -> u64 {
    use crate::constants::WIN_MASKS;
    let board = Board { x_mask, o_mask };

    for &mask in &WIN_MASKS {
        if (board.x_mask & mask) == mask {
            return mask;
        }
        if (board.o_mask & mask) == mask {
            return mask;
        }
    }

    0 // No winning sequence found
}

pub use board::Board;
pub use constants::WIN_MASKS;
pub use engine::{find_best_move, EngineConfig};
pub use game::{Game, Player};
