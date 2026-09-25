import { Chess } from "../vendor/chess.esm.js";
import { ChessBoard } from "./board.js";
import { getLegalTargets, gameOutcome, outcomeText } from "./chess-utils.js";
import { Engine, DIFFICULTIES } from "./engine.js";
import { analyzeGame, renderReview } from "./review.js";

export function mountSparring(root) {
  root.innerHTML = `
    <div class="sparring-setup">
      <div class="setup-group">
        <span class="setup-label">Schwierigkeitsgrad</span>
        <div class="difficulty-buttons"></div>
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
        <div class="move-history"></div>
        <div class="sparring-actions">
          <button class="btn undo-move">Zug zurücknehmen</button>
          <button class="btn review-game" disabled>Partie auswerten</button>
          <button class="btn back-to-setup">Neues Spiel</button>
        </div>
        <div class="review-panel hidden"></div>
      </div>
    </div>
  `;

  const setupEl = root.querySelector(".sparring-setup");
  const gameEl = root.querySelector(".sparring-game");
  const difficultyButtonsEl = root.querySelector(".difficulty-buttons");
  const colorButtons = root.querySelectorAll(".color-choice");
  const newGameBtn = root.querySelector(".new-game");
  const boardSlot = root.querySelector(".sparring-board-slot");
  const statusEl = root.querySelector(".sparring-status");
  const historyEl = root.querySelector(".move-history");
  const undoBtn = root.querySelector(".undo-move");
  const backBtn = root.querySelector(".back-to-setup");
  const reviewBtn = root.querySelector(".review-game");
  const reviewPanel = root.querySelector(".review-panel");

  let selectedDifficulty = DIFFICULTIES[1];
  let selectedColor = "white";
  let engine = null;
  let board = null;
  let chess = null;
  let playerColor = "w";
  let gameOver = false;
  let engineThinking = false;

  DIFFICULTIES.forEach((diff) => {
    const btn = document.createElement("button");
    btn.className = "btn difficulty-choice" + (diff.id === selectedDifficulty.id ? " active" : "");
    btn.textContent = diff.label;
    btn.addEventListener("click", () => {
      selectedDifficulty = diff;
      difficultyButtonsEl.querySelectorAll(".difficulty-choice").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
    difficultyButtonsEl.appendChild(btn);
  });

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
    reviewBtn.disabled = verboseHistory.length === 0;
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

  function finishIfOver() {
    const outcome = gameOutcome(chess);
    if (outcome.over) {
      gameOver = true;
      board.setInteractive(false);
      statusEl.textContent = outcomeText(outcome);
      return true;
    }
    return false;
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
      });
    } else {
      board.setOrientation(selectedColor);
      board.setLegalMovesProvider((square) => getLegalTargets(chess, square));
      board.onMove = handlePlayerMove;
    }
    board.setPosition(chess.fen());
    historyEl.innerHTML = "";
    newGameBtn.disabled = false;
    reviewBtn.disabled = true;
    reviewPanel.classList.add("hidden");
    reviewPanel.innerHTML = "";

    await maybeEngineMove();
  }

  newGameBtn.addEventListener("click", startGame);

  reviewBtn.addEventListener("click", async () => {
    if (!chess) return;
    const history = chess.history({ verbose: true });
    if (!history.length) return;

    reviewBtn.disabled = true;
    undoBtn.disabled = true;
    backBtn.disabled = true;
    reviewPanel.classList.remove("hidden");
    reviewPanel.innerHTML = `<p class="review-progress">Engine analysiert die Partie …</p>`;

    const colorLabel = playerColor === "w" ? "Weiß" : "Schwarz";
    try {
      const review = await analyzeGame(history, playerColor, (done, total) => {
        const progressEl = reviewPanel.querySelector(".review-progress");
        if (progressEl) progressEl.textContent = `Engine analysiert die Partie … (${done}/${total})`;
      });
      renderReview(reviewPanel, review, colorLabel);
      const closeBtn = document.createElement("button");
      closeBtn.className = "btn review-close";
      closeBtn.textContent = "Auswertung schließen";
      closeBtn.addEventListener("click", () => reviewPanel.classList.add("hidden"));
      reviewPanel.appendChild(closeBtn);
    } catch (err) {
      reviewPanel.innerHTML = `<p class="review-progress">Die Analyse ist fehlgeschlagen. Bitte erneut versuchen.</p>`;
      console.error(err);
    } finally {
      reviewBtn.disabled = false;
      undoBtn.disabled = false;
      backBtn.disabled = false;
    }
  });

  backBtn.addEventListener("click", () => {
    gameEl.classList.add("hidden");
    setupEl.classList.remove("hidden");
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
