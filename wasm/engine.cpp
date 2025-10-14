#include "engine.h"
#include "constants.h"
#include <iostream>
#include <vector>
#include <algorithm> // For std::max and std::min
#include <utility>   // For std::pair

std::pair<int, int> minimax(const Board& board, int depth, bool isMaximizing, int alpha, int beta);
int evaluateBoard(const Board& board);

int findBestMove(const Game &game, const EngineConfig &config)
{
    const Board &board = game.getBoard();
    
    // This makes the engine work for either X or O.
    bool isMaximizing = (game.getCurrentPlayer() == Player::X);

    // The minimax function will now return a pair: {score, move}.
    auto [score, bestMove] = minimax(board, config.maxDepth, isMaximizing, -1000000, 1000000);

    std::cout << "Engine chose move: " << bestMove << " with a score of: " << score << std::endl;

    return bestMove;
}

std::pair<int, int> minimax(const Board& board, int depth, bool isMaximizing, int alpha, int beta) {
    
    for (const auto &mask : WIN_MASKS) {
        if ((board.x_mask & mask) == mask) {
            return {100000 + depth, -1};
        }
        if ((board.o_mask & mask) == mask) {
            return {-100000 - depth, -1};
        }
    }

    // A full board is a draw
    if (__builtin_popcountll(board.x_mask | board.o_mask) == 64) {
        return {0, -1}; // Draw
    }
    
    // Base case: If we've reached max depth, return the board's heuristic evaluation.
    if (depth == 0) {
        return {evaluateBoard(board), -1}; // -1 indicates no move, just a score.
    }

    int bestMove = -1;
    int bestScore = isMaximizing ? -1000000 : 1000000;
    
    std::uint64_t occupied = board.x_mask | board.o_mask;
    std::uint64_t empty = ~occupied; // No need to mask with 0xFFF... if it's already 64-bit

    while (empty != 0) {
        int move = __builtin_ctzll(empty);
        std::uint64_t move_bit = 1ULL << move;
        Board newBoard = board;

        if (isMaximizing) {
            newBoard.x_mask |= move_bit;
            int score = minimax(newBoard, depth - 1, false, alpha, beta).first; // We only need the score from the recursive call
            if (score > bestScore) {
                bestScore = score;
                bestMove = move; // FOUND a better move at this level
            }
            alpha = std::max(alpha, bestScore);
        } else { // Minimizing player
            newBoard.o_mask |= move_bit;
            int score = minimax(newBoard, depth - 1, true, alpha, beta).first;
            if (score < bestScore) {
                bestScore = score;
                bestMove = move; // FOUND a better move at this level
            }
            beta = std::min(beta, bestScore);
        }

        if (beta <= alpha) {
            break; // Alpha-beta pruning
        }

        empty &= ~move_bit; // Remove the considered move and continue the loop
    }

    return {bestScore, bestMove};
}



int weight(int count) {
    if (count == 3) return 100;
    if (count == 2) return 10;
    if (count == 1) return 1;
    return 0;
}

int evaluateBoard(const Board &board)
{
    int weighted_score = 0;
    for (const auto &mask : WIN_MASKS) {
        int x_count = __builtin_popcountll(board.x_mask & mask);
        int o_count = __builtin_popcountll(board.o_mask & mask);
        
        // If a line is open for X (no O's present)
        if (x_count > 0 && o_count == 0) {
            weighted_score += weight(x_count);
        } 
        // If a line is open for O (no X's present)
        else if (o_count > 0 && x_count == 0) {
            weighted_score -= weight(o_count);
        }
    }
    return weighted_score;
}