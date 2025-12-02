use crate::board::Board;
use crate::constants::WIN_MASKS;
use crate::game::{Game, Player};

pub struct EngineConfig {
    pub max_depth: i32,
    pub hard_mode: bool,
}

impl EngineConfig {
    pub fn new(max_depth: i32) -> Self {
        Self {
            max_depth,
            hard_mode: false,
        }
    }

    pub fn new_with_hard(max_depth: i32, hard_mode: bool) -> Self {
        Self {
            max_depth,
            hard_mode,
        }
    }
}

pub fn find_best_move(game: &Game, config: &EngineConfig) -> i32 {
    let board = game.get_board();

    // This makes the engine work for either X or O.
    let is_maximizing = game.get_current_player() == Player::X;

    // In hard mode: if there is exactly one move that prevents an immediate
    // opponent win on the next turn, return it immediately.
    if config.hard_mode {
        let occupied = board.x_mask | board.o_mask;
        let mut safe_moves: Vec<i32> = Vec::new();

        let mut empty_bits = !occupied;
        while empty_bits != 0 {
            let move_pos = empty_bits.trailing_zeros() as i32;
            let move_bit = 1u64 << move_pos;
            let mut new_board = *board;

            if is_maximizing {
                new_board.x_mask |= move_bit;
            } else {
                new_board.o_mask |= move_bit;
            }

            // Now check whether the opponent has any immediate winning move
            // after this simulated move. If they do, this candidate is bad.
            let mut opp_can_win = false;
            let mut opp_empty = !(new_board.x_mask | new_board.o_mask);
            while opp_empty != 0 {
                let opp_pos = opp_empty.trailing_zeros() as i32;
                let opp_bit = 1u64 << opp_pos;
                let mut opp_board = new_board;

                if is_maximizing {
                    // opponent is O
                    opp_board.o_mask |= opp_bit;
                    for &mask in &WIN_MASKS {
                        if (opp_board.o_mask & mask) == mask {
                            opp_can_win = true;
                            break;
                        }
                    }
                } else {
                    // opponent is X
                    opp_board.x_mask |= opp_bit;
                    for &mask in &WIN_MASKS {
                        if (opp_board.x_mask & mask) == mask {
                            opp_can_win = true;
                            break;
                        }
                    }
                }

                if opp_can_win {
                    break;
                }

                opp_empty &= !opp_bit;
            }

            if !opp_can_win {
                safe_moves.push(move_pos);
            }

            empty_bits &= !move_bit;
        }

        if safe_moves.len() == 1 {
            let chosen = safe_moves[0];
            println!("Hard-mode safe-move selected: {}", chosen);
            return chosen;
        }
    }

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
