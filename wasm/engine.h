#ifndef ENGINE_H
#define ENGINE_H

#include "game.h"
#include <vector>

struct EngineConfig {
    int maxDepth;
};

int findBestMove(const Game& game, const EngineConfig& config);
std::pair<int, int> minimax(const Board& board, int depth, bool isMaximizing, int alpha, int beta);

int evaluateBoard(const Board& board);

#endif // ENGINE_H