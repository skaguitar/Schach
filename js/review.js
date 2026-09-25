import { Chess } from "../vendor/chess.esm.js";
import { Engine } from "./engine.js";

const ANALYSIS_MOVETIME = 400;
const ANALYSIS_LINES = 3;
const ANALYSIS_DIFFICULTY = { skill: 20, elo: null };

const MOVE_CLASSES = [
  { maxLoss: 10, key: "best", label: "Bestzug" },
  { maxLoss: 25, key: "good", label: "Gut" },
  { maxLoss: 50, key: "inaccuracy", label: "Ungenauigkeit" },
  { maxLoss: 100, key: "mistake", label: "Fehler" },
  { maxLoss: Infinity, key: "blunder", label: "Patzer" },
];

const GRADE_SCALE = [
  { maxAcpl: 15, grade: 1, label: "Sehr gut" },
  { maxAcpl: 30, grade: 2, label: "Gut" },
  { maxAcpl: 55, grade: 3, label: "Befriedigend" },
  { maxAcpl: 90, grade: 4, label: "Ausreichend" },
  { maxAcpl: 150, grade: 5, label: "Mangelhaft" },
  { maxAcpl: Infinity, grade: 6, label: "Ungenügend" },
];

function classifyLoss(cpLoss) {
  return MOVE_CLASSES.find((c) => cpLoss <= c.maxLoss);
}

function gradeFromAcpl(acpl) {
  return GRADE_SCALE.find((g) => acpl <= g.maxAcpl);
}

// Wandelt eine Engine-Bewertung (Centipawns oder Matt-Distanz) in einen
// einzelnen Centipawn-Wert um, aus Sicht der Partei, die am Zug ist.
function scoreToCp(line) {
  if (!line) return 0;
  if (line.mate !== null && line.mate !== undefined) {
    const m = line.mate;
    return m > 0 ? 10000 - m * 10 : -10000 - m * 10;
  }
  return line.scoreCp ?? 0;
}

function clampCp(cp) {
  return Math.max(-1000, Math.min(1000, cp));
}

function uciToSan(fen, uciMove) {
  if (!uciMove) return null;
  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: uciMove.slice(0, 2),
      to: uciMove.slice(2, 4),
      promotion: uciMove.length > 4 ? uciMove.slice(4, 5) : undefined,
    });
    return move ? move.san : null;
  } catch {
    return null;
  }
}

/**
 * Analysiert eine beendete oder abgebrochene Partie und bewertet nur die
 * Züge der angegebenen Spielerfarbe ("w"/"b"). history stammt aus
 * chess.history({ verbose: true }).
 */
export async function analyzeGame(history, playerColor, onProgress) {
  if (!history.length) return null;

  const engine = new Engine(new URL("../vendor/stockfish.js", import.meta.url));
  await engine.init();
  engine.setDifficulty(ANALYSIS_DIFFICULTY);
  engine.setMultiPv(ANALYSIS_LINES);

  const fens = [history[0].before, ...history.map((h) => h.after)];
  const analyses = [];
  try {
    for (let i = 0; i < fens.length; i++) {
      if (onProgress) onProgress(i, fens.length);
      analyses.push(await engine.analyzeMultiPv(fens[i], ANALYSIS_MOVETIME));
    }
  } finally {
    engine.terminate();
  }

  const moves = [];
  let totalLoss = 0;
  let countedMoves = 0;

  for (let i = 0; i < history.length; i++) {
    const entry = history[i];
    if (entry.color !== playerColor) continue;

    const before = analyses[i];
    const after = analyses[i + 1];
    const bestLine = before.lines[0] || null;
    const replyLine = after.lines[0] || null;

    const evalBefore = clampCp(scoreToCp(bestLine));
    const evalAfter = clampCp(-scoreToCp(replyLine));
    const cpLoss = Math.max(0, Math.round(evalBefore - evalAfter));
    const classification = classifyLoss(cpLoss);

    const alternatives = before.lines
      .map((line) => ({ san: uciToSan(entry.before, line.uciMove), scoreCp: scoreToCp(line) }))
      .filter((alt) => alt.san && alt.san !== entry.san);

    moves.push({
      ply: i + 1,
      moveNumber: Math.floor(i / 2) + 1,
      color: entry.color,
      played: entry.san,
      cpLoss,
      classification,
      wasBest: bestLine && bestLine.uciMove === entry.lan,
      bestMoveSan: bestLine ? uciToSan(entry.before, bestLine.uciMove) : null,
      alternatives: alternatives.slice(0, 2),
    });

    totalLoss += cpLoss;
    countedMoves += 1;
  }

  const acpl = countedMoves ? Math.round(totalLoss / countedMoves) : 0;
  const grade = gradeFromAcpl(acpl);

  return { moves, acpl, grade, countedMoves };
}

function summaryCounts(moves) {
  const counts = {};
  for (const cls of MOVE_CLASSES) counts[cls.key] = 0;
  for (const move of moves) counts[move.classification.key] += 1;
  return counts;
}

export function renderReview(root, review, colorLabel) {
  root.innerHTML = "";

  if (!review || review.countedMoves === 0) {
    const empty = document.createElement("p");
    empty.textContent = "Für diese Partie gab es keine eigenen Züge zum Auswerten.";
    root.appendChild(empty);
    return;
  }

  const counts = summaryCounts(review.moves);

  const summary = document.createElement("div");
  summary.className = "review-summary";
  summary.innerHTML = `
    <div class="review-grade grade-${review.grade.grade}">
      <span class="review-grade-number">${review.grade.grade}</span>
      <span class="review-grade-label">${review.grade.label}</span>
    </div>
    <div class="review-stats">
      <p>Durchschnittlicher Bewertungsverlust: <strong>${(review.acpl / 100).toFixed(2)} Bauerneinheiten</strong> pro Zug</p>
      <p class="review-note">Schulnote für deine Züge als ${colorLabel} in dieser Partie, 1 = sehr gut, 6 = ungenügend.</p>
      <div class="review-counts">
        ${MOVE_CLASSES.map(
          (cls) => `<span class="review-count-pill pill-${cls.key}">${cls.label}: ${counts[cls.key]}</span>`
        ).join("")}
      </div>
    </div>
  `;
  root.appendChild(summary);

  const list = document.createElement("div");
  list.className = "review-move-list";
  for (const move of review.moves) {
    const row = document.createElement("div");
    row.className = `review-move-row cls-${move.classification.key}`;
    const moveLabel = `${move.moveNumber}.${move.color === "b" ? ".." : ""}`;

    let detail = "";
    if (move.wasBest) {
      detail = "Das war der beste Zug in dieser Stellung.";
    } else if (move.bestMoveSan) {
      const alts = move.alternatives.map((a) => a.san).filter((s) => s !== move.bestMoveSan);
      detail = `Besser wäre gewesen: <strong>${move.bestMoveSan}</strong>`;
      if (alts.length) {
        detail += ` (Alternativen: ${alts.join(", ")})`;
      }
    }

    row.innerHTML = `
      <div class="review-move-head">
        <span class="review-move-num">${moveLabel}</span>
        <span class="review-move-san">${move.played}</span>
        <span class="review-move-badge badge-${move.classification.key}">${move.classification.label}</span>
        <span class="review-move-loss">${move.cpLoss > 0 ? "-" + (move.cpLoss / 100).toFixed(2) : "±0.00"}</span>
      </div>
      ${detail ? `<p class="review-move-detail">${detail}</p>` : ""}
    `;
    list.appendChild(row);
  }
  root.appendChild(list);
}
