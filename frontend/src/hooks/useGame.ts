import React from "react";
import {
  check_game_state,
  get_winning_mask,
  GameState,
} from "../wasm/wasm_rust.js";
import useAI from "./useAI";

type Player = "X" | "O" | " ";
const SIZE = 4;

const initializeBoard = (): Player[][][] =>
  Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => " "))
  );

function boardToBitmasks(board: Player[][][]) {
  let x_mask = 0n;
  let o_mask = 0n;
  for (let z = 0; z < SIZE; z++) {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = BigInt(x + 4 * y + 16 * z);
        if (board[z][y][x] === "X") x_mask |= 1n << idx;
        else if (board[z][y][x] === "O") o_mask |= 1n << idx;
      }
    }
  }
  return { x_mask, o_mask };
}

function moveIndexToCoords(moveIdx: number): [number, number, number] {
  const z = Math.floor(moveIdx / 16);
  const y = Math.floor((moveIdx % 16) / 4);
  const x = moveIdx % 4;
  return [z, y, x];
}

export default function useGame() {
  const [board, setBoard] = React.useState<Player[][][]>(initializeBoard);
  const [currentPlayer, setCurrentPlayer] = React.useState<Player>("X");

  const [playerSide, setPlayerSide] = React.useState<"X" | "O">("X");
  const [aiLevel, setAiLevel] = React.useState<"easy" | "medium" | "hard">(
    "medium"
  );
  const [isAIGame, setIsAIGame] = React.useState(false);
  const [isAITurn, setIsAITurn] = React.useState(false);
  const [gameResult, setGameResult] = React.useState<
    "win" | "loss" | "draw" | null
  >(null);
  const [winningCells, setWinningCells] = React.useState<Set<string>>(
    new Set()
  );
  const [closedGameResultModal, setClosedGameResultModal] =
    React.useState(false);

  const { wasmReady, playAIMove, AiDifficulty } = useAI();

  const maskToCells = React.useCallback((mask: bigint) => {
    const cells = new Set<string>();
    for (let z = 0; z < SIZE; z++) {
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const idx = BigInt(x + 4 * y + 16 * z);
          if ((mask & (1n << idx)) !== 0n) cells.add(`${z}-${y}-${x}`);
        }
      }
    }
    return cells;
  }, []);

  const playSound = React.useCallback((type: "win" | "loss" | "draw") => {
    const audio = new Audio(`/sounds/${type}.mp3`);
    audio.play().catch((err) => console.warn("Failed to play sound:", err));
  }, []);

  const checkGameState = React.useCallback(
    (boardState: Player[][][]) => {
      if (!wasmReady) return;
      const { x_mask, o_mask } = boardToBitmasks(boardState);
      const state = check_game_state(x_mask, o_mask);

      if (state === GameState.Ongoing) {
        setWinningCells(new Set());
        return;
      }

      if (state === GameState.Draw) {
        setGameResult("draw");
        setWinningCells(new Set());
        playSound("draw");
      } else {
        const winningMask = get_winning_mask(x_mask, o_mask);
        const cells = maskToCells(BigInt(winningMask));
        setWinningCells(cells);

        if (state === GameState.XWins) {
          if (isAIGame) {
            setGameResult(playerSide === "X" ? "win" : "loss");
            playSound(playerSide === "X" ? "win" : "loss");
          } else {
            setGameResult("win");
            playSound("win");
          }
        } else if (state === GameState.OWins) {
          if (isAIGame) {
            setGameResult(playerSide === "O" ? "win" : "loss");
            playSound(playerSide === "O" ? "win" : "loss");
          } else {
            setGameResult("win");
            playSound("win");
          }
        }
      }
    },
    [wasmReady, isAIGame, playerSide, maskToCells, playSound]
  );

  const resetGame = React.useCallback(() => {
    setBoard(initializeBoard());
    setCurrentPlayer("X");
    setGameResult(null);
    setWinningCells(new Set());
    setIsAIGame(false);
    setIsAITurn(false);
    setClosedGameResultModal(false);
  }, []);

  const makeMove = React.useCallback(
    (z: number, y: number, x: number, player: Player) => {
      if (board[z][y][x] !== " ") return false;
      if (gameResult !== null) return false;
      const newBoard = board.map((layer, lz) =>
        layer.map((row, ly) =>
          row.map((cell, lx) =>
            lz === z && ly === y && lx === x ? player : cell
          )
        )
      );
      setBoard(newBoard);
      setCurrentPlayer((prev) => (prev === "X" ? "O" : "X"));
      setTimeout(() => checkGameState(newBoard), 0);
      return true;
    },
    [board, gameResult, checkGameState]
  );

  const startAIGame = React.useCallback(() => {
    if (!wasmReady) {
      console.warn("WASM not ready yet");
      return;
    }
    setBoard(initializeBoard());
    setIsAIGame(true);
    setIsAITurn(false);
    setGameResult(null);
    setCurrentPlayer("X");
  }, [wasmReady]);

  // Trigger AI move when appropriate
  React.useEffect(() => {
    let mounted = true;
    async function tryAIMove() {
      if (!isAIGame || !wasmReady || isAITurn || gameResult !== null) return;
      const aiSide = playerSide === "X" ? "O" : "X";
      if (currentPlayer !== aiSide) return;

      setIsAITurn(true);
      const { x_mask, o_mask } = boardToBitmasks(board);
      const player = aiSide === "X" ? 1 : 2;
      const difficultyMap: Record<string, number> = {
        easy: AiDifficulty.Easy,
        medium: AiDifficulty.Medium,
        hard: AiDifficulty.Hard,
      };
      const difficulty = difficultyMap[aiLevel];

      try {
        const moveIdx = await playAIMove(x_mask, o_mask, player, difficulty);
        if (!mounted) return;
        if (typeof moveIdx === "number" && moveIdx >= 0 && moveIdx < 64) {
          const [z, y, x] = moveIndexToCoords(moveIdx);
          makeMove(z, y, x, aiSide);
        }
      } catch (err) {
        console.error("Error during AI move:", err);
      } finally {
        if (mounted) setIsAITurn(false);
      }
    }

    // small delay to improve UX
    const timer = setTimeout(() => {
      tryAIMove();
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [
    isAIGame,
    wasmReady,
    isAITurn,
    currentPlayer,
    playerSide,
    board,
    aiLevel,
    playAIMove,
    gameResult,
    makeMove,
  ]);

  const handleClick = React.useCallback(
    (z: number, y: number, x: number) => {
      if (!isAIGame) return;
      if (gameResult !== null) return;
      if (isAITurn) return;
      if (currentPlayer !== playerSide) return;
      makeMove(z, y, x, currentPlayer);
    },
    [isAIGame, gameResult, isAITurn, currentPlayer, playerSide, makeMove]
  );

  return {
    // state
    board,
    currentPlayer,
    playerSide,
    setPlayerSide,
    aiLevel,
    setAiLevel,
    isAIGame,
    setIsAIGame,
    isAITurn,
    gameResult,
    winningCells,
    wasmReady,
    closedGameResultModal,
    setClosedGameResultModal,
    // actions
    makeMove,
    handleClick,
    startAIGame,
    resetGame,
    setIsAITurn,
  } as const;
}
