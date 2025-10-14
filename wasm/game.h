#ifndef TICTACTOE_H
#define TICTACTOE_H
#include <array>
#include <cstdint>
#include "board.h"

enum class Player { NONE = 0, X = 1, O = 2 };
enum class GameState { ONGOING, DRAW, X_WINS, O_WINS };

class Game {
public:
    Game();
    bool makeMove(int x, int y, int z);
    GameState checkGameState() const;
    void reset();

    void printBoard() const;
    Player getCurrentPlayer() const;
    const Board& getBoard() const;

private:
    Board board_;
    Player currentPlayer_;
};


#endif // TICTACTOE_H