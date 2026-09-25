import { Chess } from "../vendor/chess.esm.js";
import { ChessBoard } from "./board.js";
import { getLegalTargets, gameOutcome, outcomeText } from "./chess-utils.js";
import { Engine, DIFFICULTIES } from "./engine.js";
import { classifyLoss, scoreToCp, clampCp } from "./eval-utils.js";
import { uciToSan, describeThreat, explainMove } from "./coaching-text.js";
import { mountNotationLegend } from "./notation-legend.js";

const MOVETIME_BASELINE = 500;
const MOVETIME_CANDIDATES = 500;
const MOVETIME_THREAT = 400;

export function mountCoach(root) {
  root.innerHTML = `
    <div class="coach-setup">
      <div class="setup-group">
        <span class="setup-label">Spielmodus</span>
        <div class="mode-buttons">
          <button class="btn mode-choice active" data-mode="sandbox">Beide Seiten selbst spielen</button>
          <button class="btn mode-choice" data-mode="engine">Gegen die Engine spielen</button>
        </div>
      </div>
      <div class="engine-mode-options hidden">
        <div class="setup-group">
          <span class="setup-label">Deine Farbe</span>
          <div class="color-buttons">
            <button class="btn color-choice active" data-color="white">Weiß</button>
            <button class="btn color-choice" data-color="black">Schwarz</button>
          </div>
        </div>
        <div class="setup-group">
          <span class="setup-label">Schwierigkeitsgrad der Engine</span>
          <div class="difficulty-buttons"></div>
        </div>
      </div>
      <button class="btn primary apply-setup">Übernehmen &amp; neu starten</button>
    </div>
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

  const modeButtons = root.querySelectorAll(".mode-choice");
  const engineModeOptions = root.querySelector(".engine-mode-options");
  const colorButtons = root.querySelectorAll(".color-choice");
  const difficultyButtonsEl = root.querySelector(".difficulty-buttons");
  const applySetupBtn = root.querySelector(".apply-setup");
  const boardSlot = root.querySelector(".coach-board-slot");
  const statusEl = root.querySelector(".coach-status");
  const undoBtn = root.querySelector(".undo-move");
  const newGameBtn = root.querySelector(".new-game");
  const notationLegendSlot = root.querySelector(".notation-legend-slot");

  mountNotationLegend(notationLegendSlot);

  const chess = new Chess();
  let mode = "sandbox"; // "sandbox" | "engine"
  let selectedColor = "white"; // Farbe des Menschen im Engine-Modus
  let selectedDifficulty = DIFFICULTIES[1];

  let analysisEngine = null;
  let analysisEngineLoading = null;
  let opponentEngine = null;
  let opponentEngineLoading = null;

  let baselineCache = { fen: null, line: null, san: null };
  let lastAnalysisMap = new Map();
  let currentTooltip = null;

  DIFFICULTIES.forEach((diff) => {
    const btn = document.createElement("button");
    btn.className = "btn difficulty-choice" + (diff.id === selectedDifficulty.id ? " active" : "");
    btn.textContent = diff.label;
    btn.dataset.diffId = diff.id;
    btn.addEventListener("click", () => {
      selectedDifficulty = diff;
      difficultyButtonsEl.querySelectorAll(".difficulty-choice").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
    difficultyButtonsEl.appendChild(btn);
  });

  async function ensureAnalysisEngine() {
    if (analysisEngine && analysisEngine.ready) return analysisEngine;
    if (!analysisEngineLoading) {
      analysisEngine = new Engine(new URL("../vendor/stockfish.js", import.meta.url));
      analysisEngineLoading = analysisEngine.init().then(() => {
        analysisEngine.setDifficulty({ skill: 20, elo: null });
      });
    }
    await analysisEngineLoading;
    return analysisEngine;
  }

  async function ensureOpponentEngine() {
    if (opponentEngine && opponentEngine.ready) return opponentEngine;
    if (!opponentEngineLoading) {
      opponentEngine = new Engine(new URL("../vendor/stockfish.js", import.meta.url));
      opponentEngineLoading = opponentEngine.init();
    }
    await opponentEngineLoading;
    opponentEngine.setDifficulty(selectedDifficulty);
    return opponentEngine;
  }

  async function ensureBaseline(fen) {
    if (baselineCache.fen === fen) return baselineCache;
    const line = await analysisEngine.analyzeBest(fen, MOVETIME_BASELINE);
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

  function isHumanTurn() {
    if (mode === "sandbox") return true;
    return chess.turn() === (selectedColor === "white" ? "w" : "b");
  }

  function updateStatus() {
    const outcome = gameOutcome(chess);
    if (outcome.over) {
      statusEl.textContent = outcomeText(outcome);
      board.setInteractive(false);
      return;
    }
    if (mode === "engine" && !isHumanTurn()) {
      statusEl.textContent = "Die Engine denkt nach …";
      board.setInteractive(false);
      return;
    }
    board.setInteractive(true);
    if (mode === "engine") {
      statusEl.textContent = "Du bist am Zug. Wähle eine Figur, um die Zugqualität zu sehen.";
    } else {
      const mover = chess.turn() === "w" ? "Weiß" : "Schwarz";
      statusEl.textContent = `${mover} ist am Zug. Wähle eine Figur, um die Zugqualität zu sehen.`;
    }
  }

  async function maybeEngineMove() {
    if (mode !== "engine") return;
    if (gameOutcome(chess).over) return;
    if (isHumanTurn()) {
      updateStatus();
      return;
    }

    board.setInteractive(false);
    statusEl.textContent = "Die Engine denkt nach …";
    try {
      await ensureOpponentEngine();
      const move = await opponentEngine.getBestMove(chess.fen(), selectedDifficulty.movetime);
      if (!move) return;
      chess.move({ from: move.from, to: move.to, promotion: move.promotion });
      board.setPosition(chess.fen(), { lastMove: { from: move.from, to: move.to } });
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Die Engine konnte keinen Zug finden.";
      return;
    }
    updateStatus();
  }

  async function legalMovesProviderCoach(square) {
    hideTooltip();
    const rawTargets = getLegalTargets(chess, square);
    if (rawTargets.length === 0) return [];

    lastAnalysisMap = new Map();
    statusEl.textContent = "Engine bewertet die Zugoptionen …";

    try {
      await ensureAnalysisEngine();
      const fen = chess.fen();
      const baseline = await ensureBaseline(fen);
      const evalBefore = clampCp(scoreToCp(baseline.line));

      const uciMoves = rawTargets.map((t) => t.from + t.to + (t.promotion ? "q" : ""));
      const { lines } = await analysisEngine.analyzeMoves(fen, uciMoves, MOVETIME_CANDIDATES);

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
        const reply = await analysisEngine.analyzeBest(afterFen, MOVETIME_THREAT);
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
    if (mode === "engine") maybeEngineMove();
  }

  const board = new ChessBoard(boardSlot, {
    orientation: "white",
    onMove: handleMove,
    legalMovesProvider: legalMovesProviderCoach,
    onLongPress: handleLongPress,
  });

  boardSlot.addEventListener("pointerdown", () => hideTooltip());

  function restart() {
    chess.reset();
    hideTooltip();
    lastAnalysisMap = new Map();
    baselineCache = { fen: null, line: null, san: null };
    board.setOrientation(mode === "engine" && selectedColor === "black" ? "black" : "white");
    board.setPosition(chess.fen());
    updateStatus();
    if (mode === "engine") maybeEngineMove();
  }

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      mode = btn.dataset.mode;
      modeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      engineModeOptions.classList.toggle("hidden", mode !== "engine");
    });
  });

  colorButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedColor = btn.dataset.color;
      colorButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  applySetupBtn.addEventListener("click", restart);
  newGameBtn.addEventListener("click", restart);

  undoBtn.addEventListener("click", () => {
    const history = chess.history();
    if (history.length === 0) return;
    chess.undo();
    if (mode === "engine" && !isHumanTurn() && history.length > 1) {
      chess.undo();
    }
    hideTooltip();
    lastAnalysisMap = new Map();
    board.setPosition(chess.fen());
    updateStatus();
  });

  board.setPosition(chess.fen());
  updateStatus();
}
