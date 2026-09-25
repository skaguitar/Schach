// Gemeinsame, reine Hilfsfunktionen für die Bewertung von Engine-Scores.
// Werden sowohl von der Partie-Auswertung (review.js) als auch vom
// Live-Coach (coach.js) genutzt.

export const MOVE_CLASSES = [
  { maxLoss: 10, key: "best", label: "Bestzug" },
  { maxLoss: 25, key: "good", label: "Gut" },
  { maxLoss: 50, key: "inaccuracy", label: "Ungenauigkeit" },
  { maxLoss: 100, key: "mistake", label: "Fehler" },
  { maxLoss: Infinity, key: "blunder", label: "Patzer" },
];

export const GRADE_SCALE = [
  { maxAcpl: 15, grade: 1, label: "Sehr gut" },
  { maxAcpl: 30, grade: 2, label: "Gut" },
  { maxAcpl: 55, grade: 3, label: "Befriedigend" },
  { maxAcpl: 90, grade: 4, label: "Ausreichend" },
  { maxAcpl: 150, grade: 5, label: "Mangelhaft" },
  { maxAcpl: Infinity, grade: 6, label: "Ungenügend" },
];

export function classifyLoss(cpLoss) {
  return MOVE_CLASSES.find((c) => cpLoss <= c.maxLoss);
}

export function gradeFromAcpl(acpl) {
  return GRADE_SCALE.find((g) => acpl <= g.maxAcpl);
}

// Wandelt eine Engine-Bewertung (Centipawns oder Matt-Distanz) in einen
// einzelnen Centipawn-Wert um, aus Sicht der Partei, die am Zug ist.
export function scoreToCp(line) {
  if (!line) return 0;
  if (line.mate !== null && line.mate !== undefined) {
    const m = line.mate;
    return m > 0 ? 10000 - m * 10 : -10000 - m * 10;
  }
  return line.scoreCp ?? 0;
}

export function clampCp(cp) {
  return Math.max(-1000, Math.min(1000, cp));
}

export function pawns(cp) {
  return (cp / 100).toFixed(2);
}
