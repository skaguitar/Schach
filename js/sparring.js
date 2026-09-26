import { Chess } from "../vendor/chess.esm.js";
import { ChessBoard } from "./board.js";
import { getLegalTargets, gameOutcome, outcomeText } from "./chess-utils.js";
import { Engine, DIFFICULTIES } from "./engine.js";
import { mountNotationLegend } from "./notation-legend.js";
import { MILESTONES, loadProgress, isUnlocked, winsNeeded, recordResult } from "./progress.js";

export function mountSparring(root) {
  root.innerHTML = `
    <div class="sparring-setup">
      <div class="progress-panel">
        <h3>Meilensteine</h3>
        <div class="milestone-list"></div>
      </div>
      <div class="setup-group">
        <span class="setup-label">Schwierigkeitsgrad</span>
        <div class="difficulty-buttons"></div>
        <p class="difficulty-lock-hint"></p>
      </div>
      <div class="setup-group">
        <span class="setup-label">Deine Farbe</span>
        <div class="color-buttons">
          <button class="btn color-choice active" data-color="white">Weiß</button>
          <button class="btn color-choice" data-color="black">Schwarz</button>
        </div>
      </div>
      <button class="btn primary new-game">Neues Spiel</button>
    </div>
    <div class="sparring-game hidden">
      <div class="sparring-board-slot"></div>
      <div class="sparring-panel">
        <p class="sparring-status"></p>
        <div class="notation-legend-slot"></div>
        <div class="move-history"></div>
        <div class="sparring-actions">
          <button class="btn undo-move">Zug zurücknehmen</button>
          <button class="btn back-to-setup">Neues Spiel</button>
        </div>
      </div>
    </div>
  `;

  const setupEl = root.querySelector(".sparring-setup");
  const gameEl = root.querySelector(".sparring-game");
  const milestoneListEl = root.querySelector(".milestone-list");
  const difficultyButtonsEl = root.querySelector(".difficulty-buttons");
  const lockHintEl = root.querySelector(".difficulty-lock-hint");
  const colorButtons = root.querySelectorAll(".color-choice");
  const newGameBtn = root.querySelector(".new-game");
  const boardSlot = root.querySelector(".sparring-board-slot");
  const statusEl = root.querySelector(".sparring-status");
  const historyEl = root.querySelector(".move-history");
  const undoBtn = root.querySelector(".undo-move");
  const backBtn = root.querySelector(".back-to-setup");
  const notationLegendSlot = root.querySelector(".notation-legend-slot");

  mountNotationLegend(notationLegendSlot);

  const difficultyIds = DIFFICULTIES.map((d) => d.id);
  let progress = loadProgress(difficultyIds);
  let selectedDifficulty = DIFFICULTIES.find((d) => d.id === progress.unlocked[progress.unlocked.length - 1]) || DIFFICULTIES[0];
  let selectedColor = "white";
  let engine = null;
  let board = null;
  let chess = null;
  let playerColor = "w";
  let gameOver = false;
  let engineThinking = false;

  function renderMilestones() {
    milestoneListEl.innerHTML = "";
    for (const milestone of MILESTONES) {
      const earned = Boolean(progress.milestones[milestone.id]);
      const item = document.createElement("div");
      item.className = "milestone-item" + (earned ? " earned" : "");
      item.innerHTML = `
        <span class="milestone-check"></span>
        <span>
          <span class="milestone-label">${milestone.label}${earned ? " (erreicht)" : ""}</span><br>
          <span class="milestone-desc">${milestone.description}</span>
        </span>
      `;
      milestoneListEl.appendChild(item);
    }
  }

  function renderDifficultyButtons() {
    difficultyButtonsEl.innerHTML = "";
    DIFFICULTIES.forEach((diff) => {
      const unlocked = isUnlocked(progress, diff.id);
      const btn = document.createElement("button");
      btn.className =
        "btn difficulty-choice" + (diff.id === selectedDifficulty.id ? " active" : "") + (unlocked ? "" : " locked");
      btn.textContent = unlocked ? diff.label : `${diff.label} (gesperrt)`;
      btn.disabled = !unlocked;
      if (unlocked) {
        btn.addEventListener("click", () => {
          selectedDifficulty = diff;
          renderDifficultyButtons();
        });
      }
      difficultyButtonsEl.appendChild(btn);
    });

    const nextLockedIdx = DIFFICULTIES.findIndex((d) => !isUnlocked(progress, d.id));
    if (nextLockedIdx > 0) {
      const gate = DIFFICULTIES[nextLockedIdx - 1];
      const target = DIFFICULTIES[nextLockedIdx];
      const remaining = winsNeeded(progress, gate.id);
      lockHintEl.textContent = `Noch ${remaining} Sieg${remaining === 1 ? "" : "e"} in Folge bei "${gate.label}", um "${target.label}" freizuschalten.`;
    } else {
      lockHintEl.textContent = "";
    }
  }

  renderMilestones();
  renderDifficultyButtons();

  colorButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedColor = btn.dataset.color;
      colorButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  async function ensureEngine() {
    if (engine && engine.ready) return;
    statusEl.textContent = "Engine wird geladen …";
    engine = new Engine(new URL("../vendor/stockfish.js", import.meta.url));
    await engine.init();
  }

  function renderHistory() {
    const verboseHistory = chess.history({ verbose: true });
    historyEl.innerHTML = "";
    for (let i = 0; i < verboseHistory.length; i += 2) {
      const row = document.createElement("div");
      row.className = "history-row";
      const num = i / 2 + 1;
      const white = verboseHistory[i]?.san || "";
      const black = verboseHistory[i + 1]?.san || "";
      row.innerHTML = `<span class="move-num">${num}.</span><span>${white}</span><span>${black}</span>`;
      historyEl.appendChild(row);
    }
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  function updateStatus() {
    if (gameOver) return;
    if (engineThinking) {
      statusEl.textContent = "Die Engine denkt nach …";
      return;
    }
    const turnIsPlayer = chess.turn() === playerColor;
    let text = turnIsPlayer ? "Du bist am Zug." : "Die Engine ist am Zug.";
    if (chess.inCheck()) text += " Schach!";
    statusEl.textContent = text;
  }

  let noMovesMsgTimer = null;

  function handleNoLegalMoves(square) {
    if (gameOver || engineThinking) return;
    const piece = chess.get(square);
    const text =
      piece && piece.color !== chess.turn()
        ? "Diese Figur ist gerade nicht am Zug."
        : "Diese Figur kann sich gerade nicht bewegen, zum Beispiel weil sie gebunden ist oder dein König sonst im Schach stünde.";
    statusEl.textContent = text;
    clearTimeout(noMovesMsgTimer);
    noMovesMsgTimer = setTimeout(updateStatus, 2800);
  }

  function finishIfOver() {
    const outcome = gameOutcome(chess);
    if (!outcome.over) return false;

    gameOver = true;
    board.setInteractive(false);

    const result =
      outcome.result === "draw" ? "draw" : outcome.result === (playerColor === "w" ? "white" : "black") ? "win" : "loss";
    const newlyEarned = recordResult(progress, DIFFICULTIES, selectedDifficulty.id, result);

    let text = outcomeText(outcome);
    if (newlyEarned.length) {
      const labels = newlyEarned.map((id) => MILESTONES.find((m) => m.id === id)?.label).filter(Boolean);
      text += ` Neuer Meilenstein: ${labels.join(", ")}!`;
    }
    statusEl.textContent = text;
    return true;
  }

  async function maybeEngineMove() {
    if (gameOver) return;
    if (chess.turn() === playerColor) {
      board.setInteractive(true);
      updateStatus();
      return;
    }
    board.setInteractive(false);
    engineThinking = true;
    updateStatus();
    try {
      const move = await engine.getBestMove(chess.fen(), selectedDifficulty.movetime);
      if (!move) return;
      chess.move({ from: move.from, to: move.to, promotion: move.promotion });
      board.setPosition(chess.fen(), { lastMove: { from: move.from, to: move.to } });
      renderHistory();
    } catch (err) {
      statusEl.textContent = "Die Engine konnte keinen Zug finden. Bitte neues Spiel starten.";
      console.error(err);
      return;
    } finally {
      engineThinking = false;
    }
    if (finishIfOver()) return;
    board.setInteractive(true);
    updateStatus();
  }

  function handlePlayerMove(from, to, promotion) {
    if (gameOver || engineThinking) return;
    const move = chess.move({ from, to, promotion: promotion || undefined });
    if (!move) return;
    board.setPosition(chess.fen(), { lastMove: { from, to } });
    renderHistory();
    if (finishIfOver()) return;
    maybeEngineMove();
  }

  async function startGame() {
    newGameBtn.disabled = true;
    try {
      await ensureEngine();
    } catch (err) {
      statusEl.textContent = "Die Schach-Engine konnte nicht geladen werden.";
      console.error(err);
      newGameBtn.disabled = false;
      return;
    }
    engine.setDifficulty(selectedDifficulty);

    chess = new Chess();
    playerColor = selectedColor === "white" ? "w" : "b";
    gameOver = false;
    engineThinking = false;

    setupEl.classList.add("hidden");
    gameEl.classList.remove("hidden");

    if (!board) {
      board = new ChessBoard(boardSlot, {
        orientation: selectedColor,
        onMove: handlePlayerMove,
        legalMovesProvider: (square) => getLegalTargets(chess, square),
        onNoLegalMoves: handleNoLegalMoves,
      });
    } else {
      board.setOrientation(selectedColor);
      board.setLegalMovesProvider((square) => getLegalTargets(chess, square));
      board.onMove = handlePlayerMove;
    }
    board.setPosition(chess.fen());
    historyEl.innerHTML = "";
    newGameBtn.disabled = false;

    await maybeEngineMove();
  }

  newGameBtn.addEventListener("click", startGame);

  backBtn.addEventListener("click", () => {
    gameEl.classList.add("hidden");
    setupEl.classList.remove("hidden");
    renderMilestones();
    renderDifficultyButtons();
  });

  undoBtn.addEventListener("click", () => {
    if (!chess || engineThinking) return;
    const history = chess.history();
    if (history.length === 0) return;
    chess.undo();
    if (chess.turn() !== playerColor && history.length > 1) {
      chess.undo();
    }
    gameOver = false;
    board.setInteractive(true);
    board.setPosition(chess.fen());
    renderHistory();
    updateStatus();
  });
}
