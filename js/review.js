import { Engine } from "./engine.js";
import { MOVE_CLASSES, classifyLoss, gradeFromAcpl, scoreToCp, clampCp, pawns } from "./eval-utils.js";
import { uciToSan, describeThreat, explainMove } from "./coaching-text.js";

const ANALYSIS_MOVETIME = 400;
const ANALYSIS_LINES = 3;
const ANALYSIS_DIFFICULTY = { skill: 20, elo: null };

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
      // Matt-Distanz, falls der Spieler hier selbst matt setzen konnte bzw.
      // dem Gegner nach dem gespielten Zug ein erzwungenes Matt ermöglicht hat.
      missedMateIn: bestLine && bestLine.mate > 0 ? bestLine.mate : null,
      allowedMate: replyLine && replyLine.mate > 0 ? replyLine.mate : null,
      // Grobe Einschätzung, ob der Zug eine Figur ungedeckt lässt.
      threat: replyLine ? describeThreat(entry.after, replyLine.uciMove) : null,
    });

    totalLoss += cpLoss;
    countedMoves += 1;
  }

  const acpl = countedMoves ? Math.round(totalLoss / countedMoves) : 0;
  const grade = gradeFromAcpl(acpl);

  return { moves, acpl, grade, countedMoves };
}

function moveLabel(move) {
  return `${move.moveNumber}.${move.color === "b" ? ".." : ""} ${move.played}`;
}

function describeMove(move) {
  return `<strong>${moveLabel(move)}</strong> – ${explainMove(move)}`;
}

export function buildDebrief(review, colorLabel) {
  if (!review || review.countedMoves === 0) return [];

  const paragraphs = [];
  paragraphs.push(
    `Für diese Partie bekommst du als ${colorLabel} die Schulnote <strong>${review.grade.grade} (${review.grade.label})</strong>. ` +
      `Im Schnitt hast du pro Zug ${pawns(review.acpl)} Bauerneinheiten mehr hergegeben, als nötig gewesen wäre. Schauen wir uns die wichtigsten Momente an:`
  );

  if (review.moves.length < 4) {
    paragraphs.push({ heading: "Kurze Rückschau", items: review.moves.map(describeMove) });
    return paragraphs;
  }

  const byLossAsc = [...review.moves].sort((a, b) => a.cpLoss - b.cpLoss);
  const best = byLossAsc.slice(0, 3);
  const worst = byLossAsc.slice(-3).reverse();

  paragraphs.push({ heading: "Deine drei besten Züge", items: best.map(describeMove) });
  paragraphs.push({ heading: "Deine drei schwächsten Züge – hier lohnt sich Üben", items: worst.map(describeMove) });

  return paragraphs;
}

export function renderDebrief(root, review, colorLabel) {
  root.innerHTML = "";
  const paragraphs = buildDebrief(review, colorLabel);
  if (!paragraphs.length) {
    root.innerHTML = "<p>Für diese Partie gibt es keine Nachbesprechung.</p>";
    return;
  }

  const intro = document.createElement("p");
  intro.className = "debrief-intro";
  intro.innerHTML = paragraphs[0];
  root.appendChild(intro);

  for (const section of paragraphs.slice(1)) {
    const heading = document.createElement("h4");
    heading.textContent = section.heading;
    root.appendChild(heading);
    for (const text of section.items) {
      const p = document.createElement("p");
      p.className = "debrief-item";
      p.innerHTML = text;
      root.appendChild(p);
    }
  }
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
      <p>Durchschnittlicher Bewertungsverlust: <strong>${pawns(review.acpl)} Bauerneinheiten</strong> pro Zug</p>
      <p class="review-note">Schulnote für deine Züge als ${colorLabel} in dieser Partie, 1 = sehr gut, 6 = ungenügend.</p>
      <div class="review-counts">
        ${MOVE_CLASSES.map(
          (cls) => `<span class="review-count-pill pill-${cls.key}">${cls.label}: ${counts[cls.key]}</span>`
        ).join("")}
      </div>
    </div>
  `;
  root.appendChild(summary);

  const debriefEl = document.createElement("div");
  debriefEl.className = "review-debrief";
  renderDebrief(debriefEl, review, colorLabel);
  root.appendChild(debriefEl);

  const listHeading = document.createElement("h4");
  listHeading.className = "review-move-list-heading";
  listHeading.textContent = "Alle deine Züge im Detail";
  root.appendChild(listHeading);

  const list = document.createElement("div");
  list.className = "review-move-list";
  for (const move of review.moves) {
    const row = document.createElement("div");
    row.className = `review-move-row cls-${move.classification.key}`;
    const numLabel = `${move.moveNumber}.${move.color === "b" ? ".." : ""}`;

    row.innerHTML = `
      <div class="review-move-head">
        <span class="review-move-num">${numLabel}</span>
        <span class="review-move-san">${move.played}</span>
        <span class="review-move-badge badge-${move.classification.key}">${move.classification.label}</span>
        <span class="review-move-loss">${move.cpLoss > 0 ? "-" + pawns(move.cpLoss) : "±0.00"}</span>
      </div>
      <p class="review-move-detail">${explainMove(move)}</p>
    `;
    list.appendChild(row);
  }
  root.appendChild(list);
}
