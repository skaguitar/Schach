const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
// Die "weißen" Unicode-Schachsymbole (♔♕♖...) sind in so gut wie jeder
// Schriftart nur eine dünne Kontur ohne füllbare Fläche im Innern – daher
// nutzen wir für beide Farben dieselben massiven ("schwarzen") Symbole und
// unterscheiden Weiß/Schwarz ausschließlich über fill/stroke in der CSS.
const PIECE_GLYPHS = {
  K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
};
const SQUARE = 60;
const BOARD_PX = SQUARE * 8;
const SVG_NS = "http://www.w3.org/2000/svg";
const PROMOTION_PIECES = ["q", "r", "b", "n"];

function fileRankToSquare(file, rank) {
  return FILES[file] + (rank + 1);
}

function squareToCoords(square, orientation) {
  const file = FILES.indexOf(square[0]);
  const rank = parseInt(square[1], 10) - 1;
  const col = orientation === "white" ? file : 7 - file;
  const row = orientation === "white" ? 7 - rank : rank;
  return { x: col * SQUARE, y: row * SQUARE };
}

function coordsToSquare(x, y, orientation) {
  const col = Math.floor(x / SQUARE);
  const row = Math.floor(y / SQUARE);
  if (col < 0 || col > 7 || row < 0 || row > 7) return null;
  const file = orientation === "white" ? col : 7 - col;
  const rank = orientation === "white" ? 7 - row : row;
  return fileRankToSquare(file, rank);
}

function parseFenBoard(fen) {
  const boardPart = fen.split(" ")[0];
  const rows = boardPart.split("/");
  const board = {};
  rows.forEach((row, rowIndex) => {
    const rank = 8 - rowIndex;
    let file = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) {
        file += parseInt(ch, 10);
      } else {
        board[fileRankToSquare(file, rank - 1)] = ch;
        file += 1;
      }
    }
  });
  return board;
}

export class ChessBoard {
  constructor(container, options = {}) {
    this.container = container;
    this.orientation = options.orientation || "white";
    this.interactive = options.interactive !== false;
    this.showCoordinates = options.showCoordinates !== false;
    this.onMove = options.onMove || null;
    this.legalMovesProvider = options.legalMovesProvider || null;
    this.pieces = {};
    this.selected = null;
    this.legalTargets = [];
    this.extraHighlights = new Map();
    this.lastMove = null;

    this._buildDom();
  }

  _buildDom() {
    this.wrapper = document.createElement("div");
    this.wrapper.className = "board-wrapper";

    this.svg = document.createElementNS(SVG_NS, "svg");
    this.svg.setAttribute("viewBox", `0 0 ${BOARD_PX} ${BOARD_PX}`);
    this.svg.classList.add("board-svg");

    this.squareLayer = document.createElementNS(SVG_NS, "g");
    this.highlightLayer = document.createElementNS(SVG_NS, "g");
    this.coordLayer = document.createElementNS(SVG_NS, "g");
    this.pieceLayer = document.createElementNS(SVG_NS, "g");

    this.svg.appendChild(this.squareLayer);
    this.svg.appendChild(this.highlightLayer);
    this.svg.appendChild(this.coordLayer);
    this.svg.appendChild(this.pieceLayer);

    this._drawSquares();

    this.wrapper.appendChild(this.svg);
    this.container.appendChild(this.wrapper);

    this.promoBox = document.createElement("div");
    this.promoBox.className = "promotion-picker hidden";
    this.wrapper.appendChild(this.promoBox);

    this.svg.addEventListener("click", (e) => this._handleClick(e));
  }

  _drawSquares() {
    this.squareLayer.innerHTML = "";
    this.coordLayer.innerHTML = "";
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const file = this.orientation === "white" ? col : 7 - col;
        const rank = this.orientation === "white" ? 7 - row : row;
        const square = fileRankToSquare(file, rank);
        const isLight = (file + rank) % 2 === 1;
        const rect = document.createElementNS(SVG_NS, "rect");
        rect.setAttribute("x", col * SQUARE);
        rect.setAttribute("y", row * SQUARE);
        rect.setAttribute("width", SQUARE);
        rect.setAttribute("height", SQUARE);
        rect.setAttribute("class", isLight ? "square light" : "square dark");
        rect.dataset.square = square;
        this.squareLayer.appendChild(rect);

        if (this.showCoordinates) {
          if (col === 0) {
            const label = document.createElementNS(SVG_NS, "text");
            label.setAttribute("x", col * SQUARE + 4);
            label.setAttribute("y", row * SQUARE + 14);
            label.setAttribute("class", `coord-label ${isLight ? "on-light" : "on-dark"}`);
            label.textContent = rank + 1;
            this.coordLayer.appendChild(label);
          }
          if (row === 7) {
            const label = document.createElementNS(SVG_NS, "text");
            label.setAttribute("x", col * SQUARE + SQUARE - 12);
            label.setAttribute("y", row * SQUARE + SQUARE - 6);
            label.setAttribute("class", `coord-label ${isLight ? "on-light" : "on-dark"}`);
            label.textContent = FILES[file];
            this.coordLayer.appendChild(label);
          }
        }
      }
    }
  }

  setOrientation(orientation) {
    this.orientation = orientation;
    this._drawSquares();
    this._renderPieces();
    this._renderHighlights();
  }

  setInteractive(flag) {
    this.interactive = flag;
    if (!flag) this._clearSelection();
  }

  setLegalMovesProvider(fn) {
    this.legalMovesProvider = fn;
  }

  setPosition(fen, options = {}) {
    this.pieces = parseFenBoard(fen);
    this.lastMove = options.lastMove || null;
    this._clearSelection();
    this._renderPieces();
    this._renderHighlights();
  }

  _renderPieces() {
    this.pieceLayer.innerHTML = "";
    for (const square of Object.keys(this.pieces)) {
      const piece = this.pieces[square];
      const { x, y } = squareToCoords(square, this.orientation);
      const text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("x", x + SQUARE / 2);
      text.setAttribute("y", y + SQUARE / 2 + 2);
      text.setAttribute("class", `piece ${piece === piece.toUpperCase() ? "white-piece" : "black-piece"}`);
      text.dataset.square = square;
      text.textContent = PIECE_GLYPHS[piece];
      this.pieceLayer.appendChild(text);
    }
  }

  _renderHighlights() {
    this.highlightLayer.innerHTML = "";
    const draw = (square, className) => {
      const { x, y } = squareToCoords(square, this.orientation);
      const rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", SQUARE);
      rect.setAttribute("height", SQUARE);
      rect.setAttribute("class", className);
      this.highlightLayer.appendChild(rect);
    };

    if (this.lastMove) {
      draw(this.lastMove.from, "highlight last-move");
      draw(this.lastMove.to, "highlight last-move");
    }
    for (const [square, className] of this.extraHighlights.entries()) {
      draw(square, `highlight ${className}`);
    }
    if (this.selected) {
      draw(this.selected, "highlight selected");
      for (const target of this.legalTargets) {
        draw(target.to, target.captured ? "highlight capture-target" : "highlight move-target");
      }
    }
  }

  highlightSquares(squares, className) {
    for (const square of squares) {
      this.extraHighlights.set(square, className);
    }
    this._renderHighlights();
  }

  clearHighlights() {
    this.extraHighlights.clear();
    this._renderHighlights();
  }

  _clearSelection() {
    this.selected = null;
    this.legalTargets = [];
  }

  _handleClick(evt) {
    if (!this.interactive) return;
    const rect = this.svg.getBoundingClientRect();
    const scale = BOARD_PX / rect.width;
    const x = (evt.clientX - rect.left) * scale;
    const y = (evt.clientY - rect.top) * scale;
    const square = coordsToSquare(x, y, this.orientation);
    if (!square) return;

    if (this.selected) {
      const target = this.legalTargets.find((m) => m.to === square);
      if (target) {
        this._completeMove(target);
        return;
      }
    }

    const piece = this.pieces[square];
    if (!piece) {
      this._clearSelection();
      this._renderHighlights();
      return;
    }
    if (!this.legalMovesProvider) return;
    const moves = this.legalMovesProvider(square) || [];
    if (moves.length === 0) {
      this._clearSelection();
      this._renderHighlights();
      return;
    }
    this.selected = square;
    this.legalTargets = moves;
    this._renderHighlights();
  }

  _completeMove(target) {
    const needsPromotion = target.promotion;
    this._clearSelection();
    this._renderHighlights();
    if (needsPromotion) {
      this._showPromotionPicker(target);
    } else if (this.onMove) {
      this.onMove(target.from, target.to, null);
    }
  }

  _showPromotionPicker(target) {
    const isWhite = this.pieces[target.from] === this.pieces[target.from].toUpperCase();
    const { x, y } = squareToCoords(target.to, this.orientation);
    const rect = this.svg.getBoundingClientRect();
    const scaleX = rect.width / BOARD_PX;
    const scaleY = rect.height / BOARD_PX;

    this.promoBox.innerHTML = "";
    this.promoBox.classList.remove("hidden");
    this.promoBox.style.left = `${x * scaleX}px`;
    this.promoBox.style.top = `${y * scaleY}px`;
    this.promoBox.style.width = `${SQUARE * scaleX}px`;

    for (const p of PROMOTION_PIECES) {
      const btn = document.createElement("button");
      const glyph = isWhite ? p.toUpperCase() : p;
      btn.textContent = PIECE_GLYPHS[glyph];
      btn.className = "promotion-choice";
      btn.addEventListener("click", () => {
        this.promoBox.classList.add("hidden");
        if (this.onMove) this.onMove(target.from, target.to, p);
      });
      this.promoBox.appendChild(btn);
    }
  }
}
