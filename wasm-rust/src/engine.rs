use crate::board::Board;
use crate::constants::WIN_MASKS;
use crate::game::{Game, Player};

pub struct EngineConfig {
    pub max_depth: i32,
}

impl EngineConfig {
    pub fn new(max_depth: i32) -> Self {
        Self { max_depth }
    }
}

pub fn find_best_move(game: &Game, config: &EngineConfig) -> i32 {
    let board = game.get_board();

    // This makes the engine work for either X or O.
    let is_maximizing = game.get_current_player() == Player::X;

    // The minimax function will now return a pair: (score, move).
    let (score, best_move) = minimax(*board, config.max_depth, is_maximizing, -1000000, 1000000);

    println!(
        "Engine chose move: {} with a score of: {}",
        best_move, score
    );

    best_move
}

fn minimax(
    board: Board,
    depth: i32,
    is_maximizing: bool,
    mut alpha: i32,
    mut beta: i32,
) -> (i32, i32) {
    // Check for win conditions
    for &mask in &WIN_MASKS {
        if (board.x_mask & mask) == mask {
            return (100000 + depth, -1);
        }
        if (board.o_mask & mask) == mask {
            return (-100000 - depth, -1);
        }
    }

    // A full board is a draw
    let occupied = board.x_mask | board.o_mask;
    if occupied.count_ones() == 64 {
        return (0, -1); // Draw
    }

    // Base case: If we've reached max depth, return the board's heuristic evaluation.
    if depth == 0 {
        return (evaluate_board(&board), -1); // -1 indicates no move, just a score.
    }

    let mut best_move = -1;
    let mut best_score = if is_maximizing { -1000000 } else { 1000000 };

    let empty = !occupied;

    let mut empty_bits = empty;
    while empty_bits != 0 {
        let move_pos = empty_bits.trailing_zeros() as i32;
        let move_bit = 1u64 << move_pos;
        let mut new_board = board;

        if is_maximizing {
            new_board.x_mask |= move_bit;
            let (score, _) = minimax(new_board, depth - 1, false, alpha, beta);
            if score > best_score {
                best_score = score;
                best_move = move_pos; // FOUND a better move at this level
            }
            alpha = alpha.max(best_score);
            if beta <= alpha {
                break; // Alpha-beta pruning
            }
        } else {
            // Minimizing player
            new_board.o_mask |= move_bit;
            let (score, _) = minimax(new_board, depth - 1, true, alpha, beta);
            if score < best_score {
                best_score = score;
                best_move = move_pos; // FOUND a better move at this level
            }
            beta = beta.min(best_score);
            if beta <= alpha {
                break; // Alpha-beta pruning
            }
        }

        empty_bits &= !move_bit; // Remove the considered move and continue the loop
    }

    (best_score, best_move)
}

fn weight(count: i32) -> i32 {
    match count {
        3 => 100,
        2 => 10,
        1 => 1,
        _ => 0,
    }
}

fn evaluate_board(board: &Board) -> i32 {
    let mut weighted_score = 0;
    for &mask in &WIN_MASKS {
        let x_count = (board.x_mask & mask).count_ones() as i32;
        let o_count = (board.o_mask & mask).count_ones() as i32;

        // If a line is open for X (no O's present)
        if x_count > 0 && o_count == 0 {
            weighted_score += weight(x_count);
        }
        // If a line is open for O (no X's present)
        else if o_count > 0 && x_count == 0 {
            weighted_score -= weight(o_count);
        }
    }
    weighted_score
}
