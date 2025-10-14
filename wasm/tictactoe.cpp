#include "tictactoe.h"
#include <iostream>

Game::Game()
{
    reset();
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
