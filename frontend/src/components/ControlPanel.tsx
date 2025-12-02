import styles from "../App.module.css";
import type { Player } from "./Cell";

export default function ControlPanel({
  playerSide,
  setPlayerSide,
  aiLevel,
  setAiLevel,
  startAIGame,
  resetGame,
  wasmReady,
  isAITurn,
  isAIGame,
  gameResult,
  spacing,
  increaseSpacing,
  decreaseSpacing,
  resetSpacing,
  currentPlayer,
}: {
  playerSide: Player;
  setPlayerSide: (p: "X" | "O") => void;
  aiLevel: "easy" | "medium" | "hard";
  setAiLevel: (l: "easy" | "medium" | "hard") => void;
  startAIGame: () => void;
  resetGame: () => void;
  wasmReady: boolean;
  isAITurn: boolean;
  isAIGame: boolean;
  gameResult: "win" | "loss" | "draw" | null;
  spacing: number;
  increaseSpacing: () => void;
  decreaseSpacing: () => void;
  resetSpacing: () => void;
  currentPlayer: Player;
}) {
  return (
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
  );
}
