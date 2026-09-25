import { Chess } from "../vendor/chess.esm.js";
import { ChessBoard } from "./board.js";
import { getLegalTargets } from "./chess-utils.js";
import { LESSONS } from "./lessons-data.js";

const PROGRESS_KEY = "schach-lernen:completed-chapters";

function loadProgress() {
  try {
    return new Set(JSON.parse(localStorage.getItem(PROGRESS_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveProgress(set) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* Speicher nicht verfügbar, Fortschritt wird für diese Sitzung nicht gesichert */
  }
}

function isSolutionMove(afterChess, move, step) {
  for (const sol of step.solutions) {
    if (sol.mode === "checkmate") {
      if (afterChess.isCheckmate()) return true;
      continue;
    }
    if (sol.mode === "resolvesCheck") {
      if (!afterChess.inCheck()) return true;
      continue;
    }
    if (move.from === sol.from && move.to === sol.to && (!sol.promotion || sol.promotion === move.promotion)) {
      return true;
    }
  }
  return false;
}

export function mountLessons(root) {
  const completed = loadProgress();

  root.innerHTML = `
    <div class="lessons-list"></div>
    <div class="lesson-runner hidden">
      <div class="lesson-runner-header">
        <button class="btn-text back-to-list">&larr; Lektionen</button>
        <h2 class="lesson-chapter-title"></h2>
        <div class="lesson-step-dots"></div>
      </div>
      <div class="lesson-body">
        <div class="lesson-board-slot"></div>
        <div class="lesson-panel">
          <p class="lesson-text"></p>
          <p class="lesson-feedback"></p>
          <div class="lesson-nav">
            <button class="btn prev-step">Zurück</button>
            <button class="btn primary next-step">Weiter</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const listEl = root.querySelector(".lessons-list");
  const runnerEl = root.querySelector(".lesson-runner");
  const titleEl = root.querySelector(".lesson-chapter-title");
  const dotsEl = root.querySelector(".lesson-step-dots");
  const textEl = root.querySelector(".lesson-text");
  const feedbackEl = root.querySelector(".lesson-feedback");
  const prevBtn = root.querySelector(".prev-step");
  const nextBtn = root.querySelector(".next-step");
  const boardSlot = root.querySelector(".lesson-board-slot");
  const backBtn = root.querySelector(".back-to-list");

  let board = null;
  let state = null;

  function renderList() {
    listEl.innerHTML = "";
    LESSONS.forEach((chapter, idx) => {
      const card = document.createElement("button");
      card.className = "chapter-card";
      const done = completed.has(chapter.id);
      card.innerHTML = `
        <span class="chapter-index">${idx + 1}</span>
        <span class="chapter-info">
          <span class="chapter-title">${chapter.title}</span>
          <span class="chapter-meta">${chapter.steps.length} Schritte</span>
        </span>
        <span class="chapter-status">${done ? "✓" : ""}</span>
      `;
      card.addEventListener("click", () => openChapter(chapter));
      listEl.appendChild(card);
    });
  }

  function openChapter(chapter) {
    state = { chapter, stepIndex: 0, solved: false };
    listEl.classList.add("hidden");
    runnerEl.classList.remove("hidden");
    titleEl.textContent = chapter.title;

    if (!board) {
      board = new ChessBoard(boardSlot, { interactive: false });
    }
    renderStep();
  }

  function closeChapter() {
    runnerEl.classList.add("hidden");
    listEl.classList.remove("hidden");
    renderList();
  }

  function renderDots() {
    dotsEl.innerHTML = "";
    state.chapter.steps.forEach((_, idx) => {
      const dot = document.createElement("span");
      dot.className = "step-dot" + (idx === state.stepIndex ? " active" : "");
      dotsEl.appendChild(dot);
    });
  }

  function renderStep() {
    const step = state.chapter.steps[state.stepIndex];
    state.solved = false;
    state.chess = new Chess(step.fen);
    feedbackEl.textContent = "";
    feedbackEl.className = "lesson-feedback";
    renderDots();

    board.clearHighlights();
    board.setPosition(step.fen);

    if (step.type === "info") {
      textEl.innerHTML = step.paragraphs.map((p) => `<p>${p}</p>`).join("");
      if (step.highlights) {
        for (const h of step.highlights) {
          board.highlightSquares(h.squares, h.className);
        }
      }
      board.setInteractive(false);
      nextBtn.textContent = isLastStep() ? "Kapitel abschließen" : "Weiter";
      nextBtn.disabled = false;
    } else {
      textEl.innerHTML = `<p><strong>Aufgabe:</strong> ${step.instruction}</p>`;
      board.setInteractive(true);
      board.setLegalMovesProvider((square) => getLegalTargets(state.chess, square));
      board.onMove = (from, to, promotion) => handleMove(step, from, to, promotion);
      nextBtn.textContent = isLastStep() ? "Kapitel abschließen" : "Weiter";
      nextBtn.disabled = true;
    }

    prevBtn.disabled = state.stepIndex === 0;
  }

  function isLastStep() {
    return state.stepIndex === state.chapter.steps.length - 1;
  }

  function handleMove(step, from, to, promotion) {
    const move = state.chess.move({ from, to, promotion: promotion || undefined });
    if (!move) return;

    if (isSolutionMove(state.chess, { from, to, promotion }, step)) {
      board.setPosition(state.chess.fen(), { lastMove: { from, to } });
      board.setInteractive(false);
      feedbackEl.textContent = step.successText || "Richtig!";
      feedbackEl.className = "lesson-feedback success";
      state.solved = true;
      nextBtn.disabled = false;
    } else {
      feedbackEl.textContent = "Das war ein legaler Zug, aber nicht die gesuchte Lösung. Versuch es noch einmal.";
      feedbackEl.className = "lesson-feedback error";
      state.chess = new Chess(step.fen);
      board.setPosition(step.fen);
    }
  }

  prevBtn.addEventListener("click", () => {
    if (state.stepIndex > 0) {
      state.stepIndex -= 1;
      renderStep();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (isLastStep()) {
      completed.add(state.chapter.id);
      saveProgress(completed);
      closeChapter();
      return;
    }
    state.stepIndex += 1;
    renderStep();
  });

  backBtn.addEventListener("click", closeChapter);

  renderList();
}
