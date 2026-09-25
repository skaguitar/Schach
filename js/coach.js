import { Chess } from "../vendor/chess.esm.js";
import { ChessBoard } from "./board.js";
import { getLegalTargets, gameOutcome, outcomeText } from "./chess-utils.js";
import { Engine } from "./engine.js";
import { classifyLoss, scoreToCp, clampCp } from "./eval-utils.js";
import { uciToSan, describeThreat, explainMove } from "./coaching-text.js";
import { mountNotationLegend } from "./notation-legend.js";

const MOVETIME_BASELINE = 500;
const MOVETIME_CANDIDATES = 500;
const MOVETIME_THREAT = 400;

export function mountCoach(root) {
  root.innerHTML = `
    <div class="coach-intro">
      <p>
        Wähle eine Figur. Ihre möglichen Züge werden nach Qualität eingefärbt.
        Halte ein farbiges Zielfeld etwas länger gedrückt, um zu erfahren, warum
        dieser Zug gerade gut oder schlecht wäre.
      </p>
      <div class="coach-quality-legend">
        <span class="review-count-pill pill-best">Bestzug</span>
        <span class="review-count-pill pill-good">Gut</span>
        <span class="review-count-pill pill-inaccuracy">Ungenauigkeit</span>
        <span class="review-count-pill pill-mistake">Fehler</span>
        <span class="review-count-pill pill-blunder">Patzer</span>
      </div>
      <div class="notation-legend-slot"></div>
    </div>
    <div class="coach-board-slot"></div>
    <div class="coach-panel">
      <p class="coach-status"></p>
      <div class="coach-actions">
        <button class="btn undo-move">Zug zurücknehmen</button>
        <button class="btn new-game">Neu starten</button>
      </div>
    </div>
  `;

  const boardSlot = root.querySelector(".coach-board-slot");
  const statusEl = root.querySelector(".coach-status");
  const undoBtn = root.querySelector(".undo-move");
  const newGameBtn = root.querySelector(".new-game");
  const notationLegendSlot = root.querySelector(".notation-legend-slot");

  mountNotationLegend(notationLegendSlot);

  const chess = new Chess();
  let engine = null;
  let engineLoading = null;
  let baselineCache = { fen: null, line: null, san: null };
  let lastAnalysisMap = new Map();
  let currentTooltip = null;

  async function ensureEngine() {
    if (engine && engine.ready) return engine;
    if (!engineLoading) {
      statusEl.textContent = "Engine wird geladen …";
      engine = new Engine(new URL("../vendor/stockfish.js", import.meta.url));
      engineLoading = engine.init().then(() => {
        engine.setDifficulty({ skill: 20, elo: null });
      });
    }
    await engineLoading;
    return engine;
  }

  async function ensureBaseline(fen) {
    if (baselineCache.fen === fen) return baselineCache;
    const line = await engine.analyzeBest(fen, MOVETIME_BASELINE);
    const san = line ? uciToSan(fen, line.uciMove) : null;
    baselineCache = { fen, line, san };
    return baselineCache;
  }

  function hideTooltip() {
    if (currentTooltip) {
      currentTooltip.remove();
      currentTooltip = null;
    }
  }

  function showTooltip(square, text) {
    hideTooltip();
    const rect = board.getSquareScreenRect(square);
    const tooltip = document.createElement("div");
    tooltip.className = "coach-tooltip";
    tooltip.textContent = text;
    const showBelow = rect.top < 150;
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    if (showBelow) {
      tooltip.style.top = `${rect.top + rect.height + 6}px`;
      tooltip.classList.add("below");
    } else {
      tooltip.style.top = `${rect.top - 6}px`;
    }
    board.wrapper.appendChild(tooltip);
    currentTooltip = tooltip;
  }

  function updateStatus() {
    const outcome = gameOutcome(chess);
    if (outcome.over) {
      statusEl.textContent = outcomeText(outcome);
      board.setInteractive(false);
      return;
    }
    board.setInteractive(true);
    const mover = chess.turn() === "w" ? "Weiß" : "Schwarz";
    statusEl.textContent = `${mover} ist am Zug. Wähle eine Figur, um die Zugqualität zu sehen.`;
  }

  async function legalMovesProviderCoach(square) {
    hideTooltip();
    const rawTargets = getLegalTargets(chess, square);
    if (rawTargets.length === 0) return [];

    lastAnalysisMap = new Map();
    statusEl.textContent = "Engine bewertet die Zugoptionen …";

    try {
      await ensureEngine();
      const fen = chess.fen();
      const baseline = await ensureBaseline(fen);
      const evalBefore = clampCp(scoreToCp(baseline.line));

      const uciMoves = rawTargets.map((t) => t.from + t.to + (t.promotion ? "q" : ""));
      const { lines } = await engine.analyzeMoves(fen, uciMoves, MOVETIME_CANDIDATES);

      const results = rawTargets.map((t) => {
        const uci = t.from + t.to + (t.promotion ? "q" : "");
        const line = lines.find((l) => l.uciMove === uci) || null;
        const evalAfter = clampCp(scoreToCp(line));
        const cpLoss = Math.max(0, Math.round(evalBefore - evalAfter));
        const classification = classifyLoss(cpLoss);
        const wasBest = Boolean(baseline.line && baseline.line.uciMove === uci);

        return {
          from: t.from,
          to: t.to,
          captured: t.captured,
          promotion: t.promotion,
          uci,
          san: uciToSan(fen, uci),
          cpLoss,
          classification,
          wasBest,
          bestMoveSan: baseline.san,
          missedMateIn: !wasBest && baseline.line && baseline.line.mate > 0 ? baseline.line.mate : null,
          allowedMate: null,
          threat: null,
          className: `highlight quality-${classification.key}`,
        };
      });

      for (const r of results) lastAnalysisMap.set(r.to, r);
      statusEl.textContent = "Zielfeld tippen zum Ziehen, gedrückt halten für eine Erklärung.";
      return results;
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Die Bewertung ist fehlgeschlagen. Du kannst trotzdem normal ziehen.";
      return rawTargets;
    }
  }

  async function handleLongPress(square) {
    const info = lastAnalysisMap.get(square);
    if (!info) return;
    showTooltip(square, "Analysiere …");

    // Für Fehler/Patzer lohnt sich ein Blick auf die beste Antwort des
    // Gegners – das erklärt, WARUM der Zug problematisch ist. Wird erst
    // hier (statt für alle Kandidaten sofort) berechnet, um die erste
    // Einfärbung schnell zu halten.
    if (!info.wasBest && !info.missedMateIn && (info.classification.key === "mistake" || info.classification.key === "blunder")) {
      try {
        const afterChess = new Chess(chess.fen());
        afterChess.move({ from: info.from, to: info.to, promotion: info.promotion ? "q" : undefined });
        const afterFen = afterChess.fen();
        const reply = await engine.analyzeBest(afterFen, MOVETIME_THREAT);
        if (reply && reply.mate > 0) {
          info.allowedMate = reply.mate;
        } else {
          info.threat = describeThreat(afterFen, reply ? reply.uciMove : null);
        }
      } catch (err) {
        console.error(err);
      }
    }

    showTooltip(square, explainMove(info));
  }

  function handleMove(from, to, promotion) {
    const move = chess.move({ from, to, promotion: promotion || undefined });
    if (!move) return;
    hideTooltip();
    lastAnalysisMap = new Map();
    board.setPosition(chess.fen(), { lastMove: { from, to } });
    updateStatus();
  }

  const board = new ChessBoard(boardSlot, {
    orientation: "white",
    onMove: handleMove,
    legalMovesProvider: legalMovesProviderCoach,
    onLongPress: handleLongPress,
  });

  boardSlot.addEventListener("pointerdown", () => hideTooltip());

  newGameBtn.addEventListener("click", () => {
    chess.reset();
    hideTooltip();
    lastAnalysisMap = new Map();
    baselineCache = { fen: null, line: null, san: null };
    board.setPosition(chess.fen());
    updateStatus();
  });

  undoBtn.addEventListener("click", () => {
    if (chess.history().length === 0) return;
    chess.undo();
    hideTooltip();
    lastAnalysisMap = new Map();
    board.setPosition(chess.fen());
    updateStatus();
  });

  board.setPosition(chess.fen());
  updateStatus();
}
