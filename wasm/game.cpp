#include "game.h"
#include <iostream>

Game::Game()
{
    reset();
}

bool Game::makeMove(int x, int y, int z)
{
    if (x < 0 || x >= 4 || y < 0 || y >= 4 || z < 0 || z >= 4)
        return false;

    uint64_t move_bit = bit_at(x, y, z);
    if ((board_.x_mask & move_bit) || (board_.o_mask & move_bit))
        return false; // Cell already occupied

    if (currentPlayer_ == Player::X) {
        board_.x_mask |= move_bit;
        currentPlayer_ = Player::O;
    } else {
        board_.o_mask |= move_bit;
        currentPlayer_ = Player::X;
    }
    return true;
}

GameState Game::checkGameState() const
{
    return GameState();
}

void Game::reset()
{
    board_.o_mask = 0;
    board_.x_mask = 0;
    currentPlayer_ = Player::X;
}

void Game::printBoard() const
{
    for (int z = 0; z < 4; ++z) {
        for (int y = 0; y < 4; ++y) {
            for (int x = 0; x < 4; ++x) {
                char c = '.';
                if (board_.x_mask & bit_at(x, y, z))
                    c = 'X';
                else if (board_.o_mask & bit_at(x, y, z))
                    c = 'O';
                std::cout << c << ' ';
            }
            std::cout << '\n';
        }
        std::cout << '\n';
    }
}

Player Game::getCurrentPlayer() const
{
    return currentPlayer_;
}

const Board &Game::getBoard() const
{
    return board_;
}
