import React from "react";
import "./App.css";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import useInteractions from "./hooks/useInteractions";
import initWasm, { find_ai_move, AiDifficulty } from "./wasm/wasm_rust.js";

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
  // Make a move on the board
  const makeMove = React.useCallback(
    (z: number, y: number, x: number, player: Player) => {
      // If the cell is already taken, do nothing.
      if (board[z][y][x] !== " ") {
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
      return true;
    },
    [board]
  );

  // Play AI move
  const playAIMove = React.useCallback(async () => {
    if (!wasmReady || !isAIGame || isAITurn) return;

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

      const moveIdx = find_ai_move(x_mask, o_mask, player, difficulty);

      if (moveIdx >= 0 && moveIdx < 64) {
        const [z, y, x] = moveIndexToCoords(moveIdx);
        makeMove(z, y, x, aiSide);
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
  ]);

  // Trigger AI move after player move
  React.useEffect(() => {
    if (isAIGame && wasmReady && !isAITurn) {
      const aiSide = playerSide === "X" ? "O" : "X";
      if (currentPlayer === aiSide) {
        // Small delay to allow UI to update
        const timer = setTimeout(() => {
          playAIMove();
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [isAIGame, wasmReady, isAITurn, currentPlayer, playerSide, playAIMove]);

  const handleClick = (z: number, y: number, x: number) => {
    // If AI game is active and it's AI's turn, ignore clicks
    if (isAIGame && isAITurn) {
      return;
    }

    // If AI game is active and it's not player's turn, ignore clicks
    if (isAIGame && currentPlayer !== playerSide) {
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
      style={{ width: "100vw", height: "100vh", touchAction: "none" }}
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
                  />
                );
              })
            )
          )}
        </group>
      </Canvas>

      {/* small overlay to show current spacing and instructions */}
      <div
        style={{
          position: "absolute",
          left: 12,
          top: 12,
          padding: "6px 10px",
          background: "rgba(0,0,0,0.45)",
          color: "#fff",
          borderRadius: 6,
          fontSize: 13,
          userSelect: "none",
        }}
      >
        <div style={{ fontWeight: 600 }}>Spacing: {spacing.toFixed(2)}</div>
        <div style={{ opacity: 0.85 }}>
          {isMobile
            ? "Tap to place. Pinch to change spacing"
            : "Scroll to zoom. Hold Shift + scroll to change spacing"}
        </div>
        <div style={{ opacity: 0.7, fontSize: 12 }}>
          min: {MIN_SPACING}, max: {MAX_SPACING}
        </div>
      </div>

      {/* Control panel mockup (UI-only) */}
      <div className="control-panel" role="region" aria-label="Game controls">
        <div className="panel-title">Play vs AI</div>

        <div className="control-section">
          <div className="section-label">Choose side</div>
          <div className="side-options">
            <label className={`side-btn ${playerSide === "X" ? "active" : ""}`}>
              <input
                type="radio"
                name="side"
                value="X"
                checked={playerSide === "X"}
                onChange={() => setPlayerSide("X")}
              />
              <span className="side-label">X</span>
            </label>

            <label className={`side-btn ${playerSide === "O" ? "active" : ""}`}>
              <input
                type="radio"
                name="side"
                value="O"
                checked={playerSide === "O"}
                onChange={() => setPlayerSide("O")}
              />
              <span className="side-label">O</span>
            </label>
          </div>
        </div>

        <div className="control-section">
          <div className="section-label">AI level</div>
          <div className="ai-options">
            <label className={`ai-item ${aiLevel === "easy" ? "active" : ""}`}>
              <input
                type="radio"
                name="ai"
                value="easy"
                checked={aiLevel === "easy"}
                onChange={() => setAiLevel("easy")}
              />
              Easy
            </label>
            <label
              className={`ai-item ${aiLevel === "medium" ? "active" : ""}`}
            >
              <input
                type="radio"
                name="ai"
                value="medium"
                checked={aiLevel === "medium"}
                onChange={() => setAiLevel("medium")}
              />
              Medium
            </label>
            <label className={`ai-item ${aiLevel === "hard" ? "active" : ""}`}>
              <input
                type="radio"
                name="ai"
                value="hard"
                checked={aiLevel === "hard"}
                onChange={() => setAiLevel("hard")}
              />
              Hard
            </label>
          </div>
        </div>

        <div className="control-actions">
          <button
            className="start-btn"
            onClick={startAIGame}
            disabled={!wasmReady || isAITurn}
          >
            {!wasmReady
              ? "Loading WASM..."
              : isAITurn
              ? "AI thinking..."
              : "Start vs AI"}
          </button>
          {/* Spacing controls accessible from the control panel (desktop + mobile) */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 8,
              alignItems: "center",
            }}
          >
            <button
              aria-label="Decrease spacing"
              onClick={decreaseSpacing}
              style={{ padding: "6px 10px" }}
            >
              −
            </button>
            <div style={{ color: "#fff", minWidth: 86, textAlign: "center" }}>
              Spacing {spacing.toFixed(2)}
            </div>
            <button
              aria-label="Increase spacing"
              onClick={increaseSpacing}
              style={{ padding: "6px 10px" }}
            >
              +
            </button>
            <button
              aria-label="Reset spacing"
              onClick={resetSpacing}
              style={{ padding: "6px 10px", marginLeft: 8 }}
            >
              Reset
            </button>
          </div>
          {isAIGame && (
            <div
              className="hint"
              style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}
            >
              {isAITurn
                ? "AI is thinking..."
                : currentPlayer === playerSide
                ? "Your turn"
                : "AI's turn"}
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom toolbar for quick spacing */}
      {isMobile && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: 12,
            display: "flex",
            gap: 10,
            background: "rgba(0,0,0,0.5)",
            padding: 8,
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          <button
            aria-label="Spacing decrease"
            onClick={decreaseSpacing}
            style={{ padding: 10, fontSize: 18 }}
          >
            −
          </button>
          <button
            aria-label="Spacing increase"
            onClick={increaseSpacing}
            style={{ padding: 10, fontSize: 18 }}
          >
            +
          </button>

          <button
            aria-label="Reset spacing"
            onClick={resetSpacing}
            style={{ padding: 8, fontSize: 14 }}
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
}: {
  position: [number, number, number];
  value: Player;
  onClick: () => void;
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
          color={hovered ? "#b3d4ff" : "#97a6b3"}
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
