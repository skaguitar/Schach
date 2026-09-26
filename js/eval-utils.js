// Gemeinsame, reine Hilfsfunktionen für die Bewertung von Engine-Scores.
// Genutzt vom Live-Coach (coach.js).

const MOVE_CLASSES = [
  { maxLoss: 10, key: "best", label: "Bestzug" },
  { maxLoss: 25, key: "good", label: "Gut" },
  { maxLoss: 50, key: "inaccuracy", label: "Ungenauigkeit" },
  { maxLoss: 100, key: "mistake", label: "Fehler" },
  { maxLoss: Infinity, key: "blunder", label: "Patzer" },
];

export function classifyLoss(cpLoss) {
  return MOVE_CLASSES.find((c) => cpLoss <= c.maxLoss);
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
