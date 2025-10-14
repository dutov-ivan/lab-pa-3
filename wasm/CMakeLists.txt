cmake_minimum_required(VERSION 3.10.0)
project(graph-coloring-local-search VERSION 0.1.0 LANGUAGES C CXX)
set(CMAKE_CXX_STANDARD 20)


add_executable(TicTacToe3D
    main.cpp
    tictactoe.cpp
)

# target_link_options(TicTacToe3D PRIVATE
#     --bind
#     -sMODULARIZE=1
#     -sEXPORT_ES6=1
#     --emit-tsd "$<TARGET_FILE_DIR:TicTacToe3D>/TicTacToe3D.d.ts" # or wherever else you want it to go

# )
