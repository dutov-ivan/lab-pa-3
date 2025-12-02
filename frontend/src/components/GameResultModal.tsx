import styles from "../App.module.css";

export default function GameResultModal({
  gameResult,
  onClose,
}: {
  gameResult: "win" | "loss" | "draw";
  onClose: () => void;
}) {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>
          {gameResult === "win"
            ? "You Won!"
            : gameResult === "loss"
            ? "You Lost!"
            : "It's a Draw!"}
        </h2>
        <div className={styles.modalButton} onClick={onClose}>
          {gameResult === "win"
            ? "Yuppy"
            : gameResult === "loss"
            ? "Oh NOOO!"
            : "The battle was intense"}
        </div>
      </div>
    </div>
  );
}
