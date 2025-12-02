import styles from "../App.module.css";

export default function SpacingOverlay({
  spacing,
  min,
  max,
  isMobile,
}: {
  spacing: number;
  min: number;
  max: number;
  isMobile: boolean;
}) {
  return (
    <div className={styles.spacingOverlay}>
      <div className={styles.spacingValue}>Spacing: {spacing.toFixed(2)}</div>
      <div className={styles.spacingInstruction}>
        {isMobile
          ? "Tap to place. Pinch to change spacing"
          : "Scroll to zoom. Hold Shift + scroll to change spacing"}
      </div>
      <div className={styles.spacingRange}>
        min: {min}, max: {max}
      </div>
    </div>
  );
}
