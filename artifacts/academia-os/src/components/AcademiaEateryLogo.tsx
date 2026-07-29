import styles from "./AcademiaEateryLogo.module.css";

type AcademiaEateryLogoProps = {
  className?: string;
  showEatery?: boolean;
};

const letters = [
  { character: "A", yellow: false },
  { character: "c", yellow: false },
  { character: "a", yellow: false },
  { character: "d", yellow: false },
  { character: "e", yellow: false },
  { character: "m", yellow: false },
  { character: "i", yellow: false },
  { character: "a", yellow: false },
  { character: "O", yellow: true },
  { character: "S", yellow: true },
];

export function AcademiaEateryLogo({
  className = "",
  showEatery = true,
}: AcademiaEateryLogoProps) {
  const wrapperClassName = [styles.logoLockup, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={wrapperClassName}
      role="img"
      aria-label="AcademiaOS Eatery"
    >
      <div className={styles.animationStage} aria-hidden="true">
        <div className={styles.wordmark}>
          {letters.map((letter, index) => (
            <span
              key={`${letter.character}-${index}`}
              className={
                letter.yellow ? styles.yellowLetter : styles.navyLetter
              }
            >
              {letter.character}
            </span>
          ))}

          <span className={styles.finalDot} />
        </div>

        <span className={styles.eatingMask} />
        <span className={styles.restoringMask} />

        <div className={styles.runner}>
          <span className={styles.crumbs} />
          <span className={styles.pacman} />
        </div>
      </div>

      {showEatery && (
        <div className={styles.eaterySection} aria-hidden="true">
          <span className={styles.divider} />

          <span className={styles.eatery}>
            <span>E</span>
            <span>A</span>
            <span>T</span>
            <span>E</span>
            <span>R</span>
            <span>Y</span>
          </span>
        </div>
      )}
    </div>
  );
}

export default AcademiaEateryLogo;
