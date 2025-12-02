import React from "react";
import styles from "./App.module.css";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import useInteractions from "./hooks/useInteractions";
import Cell from "./components/Cell";
import useGame from "./hooks/useGame";
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
