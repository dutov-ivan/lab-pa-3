import styles from "../App.module.css";

export default function MobileToolbar({
  increaseSpacing,
  decreaseSpacing,
  resetSpacing,
}: {
  increaseSpacing: () => void;
  decreaseSpacing: () => void;
  resetSpacing: () => void;
}) {
  return (
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
  );
}
