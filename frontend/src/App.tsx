import React from "react";
import styles from "./App.module.css";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import useInteractions from "./hooks/useInteractions";
import initWasm, {
  find_ai_move,
  AiDifficulty,
  check_game_state,
  GameState,
  get_winning_mask,
} from "./wasm/wasm_rust.js";

type Player = "X" | "O" | " ";

const SIZE = 4;
const CUBE_SIZE = 0.9; // actual cube size (slightly smaller to create gaps)
// spacing controls
const MIN_SPACING = 0.6; // minimum allowed spacing between cube centers
const MAX_SPACING = 3.0; // maximum allowed spacing between cube centers
const DEFAULT_SPACING = 1.4; // default distance between cube centers
const SPACING_STEP = 0.1; // spacing change per scroll tick

const initializeBoard = (): Player[][][] => {
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, () => " " as Player)
    )
  );
};

// Convert 3D board array to bitmasks (x_mask, o_mask)
function boardToBitmasks(board: Player[][][]): {
  x_mask: bigint;
  o_mask: bigint;
} {
  let x_mask = 0n;
  let o_mask = 0n;
  for (let z = 0; z < SIZE; z++) {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = BigInt(x + 4 * y + 16 * z);
        if (board[z][y][x] === "X") {
          x_mask |= 1n << idx;
        } else if (board[z][y][x] === "O") {
          o_mask |= 1n << idx;
        }
      }
    }
  }
  return { x_mask, o_mask };
}

// Convert move index (0-63) to (z, y, x) coordinates
function moveIndexToCoords(moveIdx: number): [number, number, number] {
  const z = Math.floor(moveIdx / 16);
  const y = Math.floor((moveIdx % 16) / 4);
  const x = moveIdx % 4;
  return [z, y, x];
}

export default function App() {
  const [board, setBoard] = React.useState<Player[][][]>(initializeBoard);
  const [currentPlayer, setCurrentPlayer] = React.useState<Player>("X");
  // spacing state (controls distance between cubes)
  // interaction hooks: spacing, touch/wheel/shift handlers
  const {
    spacing,
    isMobile,
    isShiftDown,
    onWheel,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    increaseSpacing,
    decreaseSpacing,
    resetSpacing,
  } = useInteractions(DEFAULT_SPACING, {
    minSpacing: MIN_SPACING,
    maxSpacing: MAX_SPACING,
    step: SPACING_STEP,
  });

  // Game state
  const [playerSide, setPlayerSide] = React.useState<"X" | "O">("X");
  const [aiLevel, setAiLevel] = React.useState<"easy" | "medium" | "hard">(
    "medium"
  );
  const [isAIGame, setIsAIGame] = React.useState(false);
  const [isAITurn, setIsAITurn] = React.useState(false);
  const [wasmReady, setWasmReady] = React.useState(false);
  const [gameResult, setGameResult] = React.useState<
    "win" | "loss" | "draw" | null
  >(null);

  const [closedGameResultModal, setClosedGameResultModal] =
    React.useState(false);
  const [winningCells, setWinningCells] = React.useState<Set<string>>(
    new Set()
  );

  // Web Worker for AI computations (initialized once)
  const aiWorkerRef = React.useRef<Worker | null>(null);
  const aiReqIdRef = React.useRef(0);
  const aiPendingRef = React.useRef(new Map<number, (res: any) => void>());

  // Create the worker once on mount and teardown on unmount.
  React.useEffect(() => {
    // Only run in browsers that support Worker + module workers
    if (typeof window !== "undefined" && typeof Worker !== "undefined") {
      try {
        // Vite-friendly worker creation
        const worker = new Worker(
          new URL("./wasm/aiWorker.ts", import.meta.url),
          {
            type: "module",
          }
        );

        worker.onmessage = (ev: MessageEvent) => {
          const { id, move, error } = ev.data || {};
          const resolver = aiPendingRef.current.get(id);
          if (resolver) {
            resolver({ move, error });
            aiPendingRef.current.delete(id);
          }
        };

        aiWorkerRef.current = worker;
      } catch (err) {
        // If worker creation fails, keep aiWorkerRef null and fallback to main-thread call
        console.warn(
          "Failed to create AI worker, falling back to main thread:",
          err
        );
        aiWorkerRef.current = null;
      }
    }

    return () => {
      if (aiWorkerRef.current) {
        aiWorkerRef.current.terminate();
        aiWorkerRef.current = null;
      }
      aiPendingRef.current.clear();
    };
  }, []);

  // Initialize WASM module
  React.useEffect(() => {
    initWasm()
      .then(() => {
        setWasmReady(true);
      })
      .catch((err: unknown) => {
        console.error("Failed to initialize WASM:", err);
      });
  }, []);
  // Convert winning mask to set of cell coordinates
  const maskToCells = React.useCallback((mask: bigint): Set<string> => {
    const cells = new Set<string>();
    for (let z = 0; z < SIZE; z++) {
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const idx = BigInt(x + 4 * y + 16 * z);
          if ((mask & (1n << idx)) !== 0n) {
            cells.add(`${z}-${y}-${x}`);
          }
        }
      }
    }
    return cells;
  }, []);

  // Check game state and update result
  const checkGameState = React.useCallback(
    (boardState: Player[][][]) => {
      if (!wasmReady) return;

      const { x_mask, o_mask } = boardToBitmasks(boardState);
      const state = check_game_state(x_mask, o_mask);

      if (state === GameState.Ongoing) {
        setWinningCells(new Set());
        return;
      }

      // Game is over - get winning cells
      if (state === GameState.Draw) {
        setGameResult("draw");
        setWinningCells(new Set());
        playSound("draw");
      } else {
        // Get winning mask and convert to cell coordinates
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
    [wasmReady, isAIGame, playerSide, maskToCells]
  );

  // Play sound effect
  const playSound = React.useCallback((type: "win" | "loss" | "draw") => {
    const audio = new Audio(`/sounds/${type}.mp3`);
    audio.play().catch((err) => {
      console.warn("Failed to play sound:", err);
    });
  }, []);

  // Reset game
  const resetGame = React.useCallback(() => {
    setBoard(initializeBoard());
    setCurrentPlayer("X");
    setGameResult(null);
    setWinningCells(new Set());
    setIsAIGame(false);
    setIsAITurn(false);
    setClosedGameResultModal(false);
  }, []);

  // Make a move on the board
  const makeMove = React.useCallback(
    (z: number, y: number, x: number, player: Player) => {
      // If the cell is already taken, do nothing.
      if (board[z][y][x] !== " ") {
        return false;
      }

      // If game is over, don't allow moves
      if (gameResult !== null) {
        return false;
      }

      // Create a new board state with the updated cell.
      const newBoard = board.map((layer, lz) =>
        layer.map((row, ly) =>
          row.map((cell, lx) => {
            if (lz === z && ly === y && lx === x) {
              return player;
            }
            return cell;
          })
        )
      );
      setBoard(newBoard);

      // Toggle the current player for the next turn.
      setCurrentPlayer((prev) => (prev === "X" ? "O" : "X"));

      // Check game state after move
      setTimeout(() => {
        checkGameState(newBoard);
      }, 0);

      return true;
    },
    [board, gameResult, checkGameState]
  );

  // Play AI move
  const playAIMove = React.useCallback(async () => {
    if (!wasmReady || !isAIGame || isAITurn || gameResult !== null) return;

    const aiSide = playerSide === "X" ? "O" : "X";

    // Check if it's actually the AI's turn
    if (currentPlayer !== aiSide) return;

    setIsAITurn(true);

    try {
      const { x_mask, o_mask } = boardToBitmasks(board);
      const player = aiSide === "X" ? 1 : 2;

      // Map difficulty string to enum
      const difficultyMap: Record<string, number> = {
        easy: AiDifficulty.Easy,
        medium: AiDifficulty.Medium,
        hard: AiDifficulty.Hard,
      };
      const difficulty = difficultyMap[aiLevel];

      // If we have a worker, run the WASM AI computation off the main thread.
      let moveIdx: number | null = null;

      const worker = aiWorkerRef.current;
      if (worker) {
        // send request and await response via a simple promise map
        const id = ++aiReqIdRef.current;
        const promise: Promise<{ move?: number; error?: any }> = new Promise(
          (resolve) => {
            aiPendingRef.current.set(id, resolve);
            // post x_mask and o_mask (BigInt supported by structured clone)
            worker.postMessage({ id, x_mask, o_mask, player, difficulty });
          }
        );

        const res = await promise;
        if (res && res.error) {
          console.error("AI worker error:", res.error);
        } else if (res && typeof res.move === "number") {
          moveIdx = res.move;
        }
      } else {
        // Fallback: call WASM on the main thread (keeps previous behavior).
        // This may block UI for heavy computations but only occurs when workers are unavailable.
        moveIdx = find_ai_move(x_mask, o_mask, player, difficulty);
      }

      if (moveIdx !== null && moveIdx >= 0 && moveIdx < 64) {
        const [z, y, x] = moveIndexToCoords(moveIdx);
        makeMove(z, y, x, aiSide);
        // Game state is checked inside makeMove
      }
    } catch (err) {
      console.error("Error playing AI move:", err);
    } finally {
      setIsAITurn(false);
    }
  }, [
    wasmReady,
    isAIGame,
    isAITurn,
    board,
    playerSide,
    aiLevel,
    makeMove,
    currentPlayer,
    gameResult,
  ]);

  // Trigger AI move after player move
  React.useEffect(() => {
    if (isAIGame && wasmReady && !isAITurn && gameResult === null) {
      const aiSide = playerSide === "X" ? "O" : "X";
      if (currentPlayer === aiSide) {
        // Small delay to allow UI to update
        const timer = setTimeout(() => {
          playAIMove();
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [
    isAIGame,
    wasmReady,
    isAITurn,
    currentPlayer,
    playerSide,
    playAIMove,
    gameResult,
  ]);

  const handleClick = (z: number, y: number, x: number) => {
    // Don't allow moves if game hasn't started
    if (!isAIGame) {
      return;
    }

    // Don't allow moves if game is over
    if (gameResult !== null) {
      return;
    }

    // If AI game is active and it's AI's turn, ignore clicks
    if (isAITurn) {
      return;
    }

    // If AI game is active and it's not player's turn, ignore clicks
    if (currentPlayer !== playerSide) {
      return;
    }

    // Make the move
    makeMove(z, y, x, currentPlayer);
  };

  // Start AI game
  const startAIGame = React.useCallback(() => {
    if (!wasmReady) {
      console.warn("WASM not ready yet");
      return;
    }

    setBoard(initializeBoard());
    setIsAIGame(true);
    setIsAITurn(false);
    setGameResult(null);

    // If AI goes first (playerSide is O, so AI is X), set current player to X
    // Otherwise, player (X) goes first
    // The useEffect will automatically trigger AI move when currentPlayer === aiSide
    if (playerSide === "O") {
      // AI (X) goes first
      setCurrentPlayer("X");
    } else {
      // Player (X) goes first
      setCurrentPlayer("X");
    }
  }, [wasmReady, playerSide]);

  // center offset so the cube cluster is centered at origin (recomputed when spacing changes)
  const centerOffset = ((SIZE - 1) * spacing) / 2;

  return (
    <div
      className={styles.container}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <Canvas camera={{ position: [6, 6, 6], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />

        {/* OrbitControls: disable wheel-zoom while Shift is held (so Shift+scroll only adjusts spacing).
            On mobile we default to locked camera (no rotate/zoom) and expose a toggle in the UI. */}
        <OrbitControls
          enablePan={!isMobile}
          // keep desktop zoom enabled except when Shift is held (Shift+scroll used for spacing)
          enableZoom={!isMobile && !isShiftDown}
          // on desktop allow rotate by default; on mobile rotate is disabled by default
          enableRotate={!isMobile}
          // ensure left mouse button rotates, middle dolly, right pan — explicit mapping fixes platform differences
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN,
          }}
        />

        <group>
          {board.map((layer, z) =>
            layer.map((row, y) =>
              row.map((cell, x) => {
                const posX = x * spacing - centerOffset;
                const posY = y * spacing - centerOffset;
                const posZ = z * spacing - centerOffset;
                return (
                  <Cell
                    key={`${z}-${y}-${x}`}
                    position={[posX, posY, posZ]}
                    value={cell}
                    onClick={() => handleClick(z, y, x)}
                    isWinning={winningCells.has(`${z}-${y}-${x}`)}
                  />
                );
              })
            )
          )}
        </group>
      </Canvas>

      {/* small overlay to show current spacing and instructions */}
      <div className={styles.spacingOverlay}>
        <div className={styles.spacingValue}>Spacing: {spacing.toFixed(2)}</div>
        <div className={styles.spacingInstruction}>
          {isMobile
            ? "Tap to place. Pinch to change spacing"
            : "Scroll to zoom. Hold Shift + scroll to change spacing"}
        </div>
        <div className={styles.spacingRange}>
          min: {MIN_SPACING}, max: {MAX_SPACING}
        </div>
      </div>

      {/* Control panel mockup (UI-only) */}
      <div
        className={styles.controlPanel}
        role="region"
        aria-label="Game controls"
      >
        <div className={styles.panelTitle}>Play vs AI</div>

        <div className={styles.controlSection}>
          <div className={styles.sectionLabel}>Choose side</div>
          <div className={styles.sideOptions}>
            <label
              className={`${styles.sideBtn} ${
                playerSide === "X" ? styles.active : ""
              }`}
            >
              <input
                type="radio"
                name="side"
                value="X"
                checked={playerSide === "X"}
                onChange={() => setPlayerSide("X")}
                disabled={gameResult !== null}
              />
              <span className={styles.sideLabel}>X</span>
            </label>

            <label
              className={`${styles.sideBtn} ${
                playerSide === "O" ? styles.active : ""
              }`}
            >
              <input
                type="radio"
                name="side"
                value="O"
                checked={playerSide === "O"}
                onChange={() => setPlayerSide("O")}
                disabled={gameResult !== null}
              />
              <span className={styles.sideLabel}>O</span>
            </label>
          </div>
        </div>

        <div className={styles.controlSection}>
          <div className={styles.sectionLabel}>AI level</div>
          <div className={styles.aiOptions}>
            <label
              className={`${styles.aiItem} ${
                aiLevel === "easy" ? styles.active : ""
              }`}
            >
              <input
                type="radio"
                name="ai"
                value="easy"
                checked={aiLevel === "easy"}
                onChange={() => setAiLevel("easy")}
                disabled={gameResult !== null}
              />
              Easy
            </label>
            <label
              className={`${styles.aiItem} ${
                aiLevel === "medium" ? styles.active : ""
              }`}
            >
              <input
                type="radio"
                name="ai"
                value="medium"
                checked={aiLevel === "medium"}
                onChange={() => setAiLevel("medium")}
                disabled={gameResult !== null}
              />
              Medium
            </label>
            <label
              className={`${styles.aiItem} ${
                aiLevel === "hard" ? styles.active : ""
              }`}
            >
              <input
                type="radio"
                name="ai"
                value="hard"
                checked={aiLevel === "hard"}
                onChange={() => setAiLevel("hard")}
                disabled={gameResult !== null}
              />
              Hard
            </label>
          </div>
        </div>

        <div className={styles.controlActions}>
          {gameResult === null ? (
            <button
              className={styles.startBtn}
              onClick={startAIGame}
              disabled={!wasmReady || isAITurn}
            >
              {!wasmReady
                ? "Loading WASM..."
                : isAITurn
                ? "AI thinking..."
                : "Start vs AI"}
            </button>
          ) : (
            <button className={styles.resetBtn} onClick={resetGame}>
              Reset Game
            </button>
          )}
          {/* Spacing controls accessible from the control panel (desktop + mobile) */}
          <div className={styles.spacingControls}>
            <button
              aria-label="Decrease spacing"
              onClick={decreaseSpacing}
              className={styles.spacingButton}
            >
              −
            </button>
            <div className={styles.spacingDisplay}>
              Spacing {spacing.toFixed(2)}
            </div>
            <button
              aria-label="Increase spacing"
              onClick={increaseSpacing}
              className={styles.spacingButton}
            >
              +
            </button>
            <button
              aria-label="Reset spacing"
              onClick={resetSpacing}
              className={styles.spacingResetButton}
            >
              Reset
            </button>
          </div>
          {isAIGame && gameResult === null && (
            <div className={styles.hintWithMargin}>
              {isAITurn
                ? "AI is thinking..."
                : currentPlayer === playerSide
                ? "Your turn"
                : "AI's turn"}
            </div>
          )}
        </div>
      </div>

      {/* Game Result Modal */}
      {gameResult !== null && !closedGameResultModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>
              {gameResult === "win"
                ? "You Won!"
                : gameResult === "loss"
                ? "You Lost!"
                : "It's a Draw!"}
            </h2>
            <div
              className={styles.modalButton}
              onClick={() => setClosedGameResultModal(true)}
            >
              {gameResult === "win"
                ? "Yuppy"
                : gameResult === "loss"
                ? "Oh NOOO!"
                : "The battle was intense"}
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom toolbar for quick spacing */}
      {isMobile && (
        <div className={styles.mobileToolbar}>
          <button
            aria-label="Spacing decrease"
            onClick={decreaseSpacing}
            className={styles.mobileToolbarButton}
          >
            −
          </button>
          <button
            aria-label="Spacing increase"
            onClick={increaseSpacing}
            className={styles.mobileToolbarButton}
          >
            +
          </button>

          <button
            aria-label="Reset spacing"
            onClick={resetSpacing}
            className={styles.mobileToolbarResetButton}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

function Cell({
  position,
  value,
  onClick,
  isWinning,
}: {
  position: [number, number, number];
  value: Player;
  onClick: () => void;
  isWinning?: boolean;
}) {
  const meshRef = React.useRef<THREE.Mesh | null>(null);
  const [hovered, setHovered] = React.useState(false);

  const textOffset = CUBE_SIZE / 2 + 0.01; // Position text slightly off the face

  return (
    <group position={position}>
      {/* Invisible larger mesh to improve touch hit area on mobile. This captures clicks/touches.
          It also proxies hover state to the visible cube. */}
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <boxGeometry
          args={[CUBE_SIZE + 0.4, CUBE_SIZE + 0.4, CUBE_SIZE + 0.4]}
        />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Visible cube (visual only) */}
      <mesh ref={meshRef} scale={hovered ? 1.05 : 1} castShadow receiveShadow>
        <boxGeometry args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]} />
        <meshStandardMaterial
          transparent={true}
          // semi-transparent when the cell is empty (value === " "), opaque otherwise
          opacity={value === " " ? 0.25 : 1}
          // disable depthWrite for transparent cubes to avoid rendering artifacts
          depthWrite={value === " " ? false : true}
          metalness={0.2}
          roughness={0.2}
          color={isWinning ? "#4ade80" : hovered ? "#b3d4ff" : "#97a6b3"}
        />
      </mesh>

      {/* --- MODIFIED: Text rendering --- */}
      {/* A Text component is now rendered on each of the 6 faces of the cube. */}
      {value !== " " && (
        <>
          {/* Front Face */}
          <Text
            position={[0, 0, textOffset]}
            fontSize={0.45}
            anchorX="center"
            anchorY="middle"
          >
            {value}
          </Text>
          {/* Back Face */}
          <Text
            position={[0, 0, -textOffset]}
            rotation={[0, Math.PI, 0]}
            fontSize={0.45}
            anchorX="center"
            anchorY="middle"
          >
            {value}
          </Text>
          {/* Right Face */}
          <Text
            position={[textOffset, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
            fontSize={0.45}
            anchorX="center"
            anchorY="middle"
          >
            {value}
          </Text>
          {/* Left Face */}
          <Text
            position={[-textOffset, 0, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            fontSize={0.45}
            anchorX="center"
            anchorY="middle"
          >
            {value}
          </Text>
          {/* Top Face */}
          <Text
            position={[0, textOffset, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.45}
            anchorX="center"
            anchorY="middle"
          >
            {value}
          </Text>
          {/* Bottom Face */}
          <Text
            position={[0, -textOffset, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            fontSize={0.45}
            anchorX="center"
            anchorY="middle"
          >
            {value}
          </Text>
        </>
      )}
    </group>
  );
}
