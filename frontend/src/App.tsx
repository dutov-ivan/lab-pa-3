import React from "react";
import styles from "./App.module.css";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import useInteractions from "./hooks/useInteractions";
import Cell from "./components/Cell";
import SpacingOverlay from "./components/SpacingOverlay";
import ControlPanel from "./components/ControlPanel";
import GameResultModal from "./components/GameResultModal";
import MobileToolbar from "./components/MobileToolbar";
import initWasm, {
  find_ai_move,
  AiDifficulty,
  check_game_state,
  GameState,
  get_winning_mask,
} from "./wasm/wasm_rust.js";

type Player = "X" | "O" | " ";

const SIZE = 4;
// spacing controls
const MIN_SPACING = 0.6; // minimum allowed spacing between cube centers
const MAX_SPACING = 3.0; // maximum allowed spacing between cube centers
const DEFAULT_SPACING = 1.4; // default distance between cube centers
const SPACING_STEP = 0.1; // spacing change per scroll tick

export default function App() {
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

  // game state (moved into hook for readability)
  const {
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
    makeMove,
    handleClick,
    startAIGame,
    resetGame,
  } = useGame();

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

      <SpacingOverlay
        spacing={spacing}
        min={MIN_SPACING}
        max={MAX_SPACING}
        isMobile={isMobile}
      />

      <ControlPanel
        playerSide={playerSide}
        setPlayerSide={setPlayerSide}
        aiLevel={aiLevel}
        setAiLevel={setAiLevel}
        startAIGame={startAIGame}
        resetGame={resetGame}
        wasmReady={wasmReady}
        isAITurn={isAITurn}
        isAIGame={isAIGame}
        gameResult={gameResult}
        spacing={spacing}
        increaseSpacing={increaseSpacing}
        decreaseSpacing={decreaseSpacing}
        resetSpacing={resetSpacing}
        currentPlayer={currentPlayer}
      />

      {/* Game Result Modal */}
      {gameResult !== null && !closedGameResultModal && (
        <GameResultModal
          gameResult={gameResult}
          onClose={() => setClosedGameResultModal(true)}
        />
      )}

      {/* Mobile bottom toolbar for quick spacing */}
      {isMobile && (
        <MobileToolbar
          increaseSpacing={increaseSpacing}
          decreaseSpacing={decreaseSpacing}
          resetSpacing={resetSpacing}
        />
      )}
    </div>
  );
}
