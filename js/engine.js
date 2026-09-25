export const DIFFICULTIES = [
  { id: "anfaenger", label: "Anfänger", skill: 0, elo: 1320, movetime: 400 },
  { id: "leicht", label: "Leicht", skill: 5, elo: 1500, movetime: 600 },
  { id: "mittel", label: "Mittel", skill: 10, elo: 1800, movetime: 900 },
  { id: "fortgeschritten", label: "Fortgeschritten", skill: 15, elo: 2200, movetime: 1200 },
  { id: "stark", label: "Stark", skill: 20, elo: null, movetime: 1500 },
];

export class Engine {
  constructor(scriptUrl) {
    this.scriptUrl = scriptUrl;
    this.worker = null;
    this.ready = false;
    this._lineWaiters = [];
    this._multiPvInfo = {};
  }

  _onLine(line) {
    if (line.startsWith("info ") && line.includes(" pv ")) {
      const multipvMatch = line.match(/ multipv (\d+)/);
      const idx = multipvMatch ? parseInt(multipvMatch[1], 10) : 1;
      const mateMatch = line.match(/ score mate (-?\d+)/);
      const cpMatch = line.match(/ score cp (-?\d+)/);
      const pvMatch = line.match(/ pv (.+)$/);
      if (pvMatch && (mateMatch || cpMatch)) {
        this._multiPvInfo[idx] = {
          uciMove: pvMatch[1].split(" ")[0],
          scoreCp: cpMatch ? parseInt(cpMatch[1], 10) : null,
          mate: mateMatch ? parseInt(mateMatch[1], 10) : null,
        };
      }
    }

    for (let i = this._lineWaiters.length - 1; i >= 0; i--) {
      const waiter = this._lineWaiters[i];
      if (waiter.test(line)) {
        this._lineWaiters.splice(i, 1);
        waiter.resolve(line);
      }
    }
  }

  _waitFor(test, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._lineWaiters = this._lineWaiters.filter((w) => w.resolve !== resolve);
        reject(new Error("Engine-Zeitüberschreitung"));
      }, timeoutMs);
      this._lineWaiters.push({
        test,
        resolve: (line) => {
          clearTimeout(timer);
          resolve(line);
        },
      });
    });
  }

  async init() {
    this.worker = new Worker(this.scriptUrl);
    this.worker.onmessage = (e) => this._onLine(typeof e.data === "string" ? e.data : "");
    this.worker.onerror = (e) => console.error("Engine-Fehler:", e.message);

    this.worker.postMessage("uci");
    await this._waitFor((line) => line === "uciok");
    this.worker.postMessage("isready");
    await this._waitFor((line) => line === "readyok");
    this.ready = true;
  }

  setDifficulty(diff) {
    this.worker.postMessage(`setoption name Skill Level value ${diff.skill}`);
    if (diff.elo) {
      this.worker.postMessage("setoption name UCI_LimitStrength value true");
      this.worker.postMessage(`setoption name UCI_Elo value ${diff.elo}`);
    } else {
      this.worker.postMessage("setoption name UCI_LimitStrength value false");
    }
    this.worker.postMessage("ucinewgame");
  }

  async getBestMove(fen, movetimeMs) {
    this.worker.postMessage(`position fen ${fen}`);
    const resultPromise = this._waitFor((line) => line.startsWith("bestmove"));
    this.worker.postMessage(`go movetime ${movetimeMs}`);
    const line = await resultPromise;
    const parts = line.split(" ");
    const uciMove = parts[1];
    if (!uciMove || uciMove === "(none)") return null;
    return {
      from: uciMove.slice(0, 2),
      to: uciMove.slice(2, 4),
      promotion: uciMove.length > 4 ? uciMove.slice(4, 5) : undefined,
    };
  }

  setMultiPv(n) {
    this.worker.postMessage(`setoption name MultiPV value ${n}`);
  }

  async analyzeMultiPv(fen, movetimeMs) {
    this._multiPvInfo = {};
    this.worker.postMessage(`position fen ${fen}`);
    const resultPromise = this._waitFor((line) => line.startsWith("bestmove"));
    this.worker.postMessage(`go movetime ${movetimeMs}`);
    await resultPromise;
    const lines = Object.keys(this._multiPvInfo)
      .map((key) => parseInt(key, 10))
      .sort((a, b) => a - b)
      .map((idx) => this._multiPvInfo[idx]);
    return { lines };
  }

  // Bewertet gezielt eine begrenzte Liste von Zügen (UCI-Notation, z. B.
  // "e2e4") über "go ... searchmoves", statt die ganze Stellung zu
  // durchsuchen. So lassen sich z. B. alle Zugoptionen einer einzelnen
  // Figur mit vertretbarem Aufwand einzeln bewerten.
  async analyzeMoves(fen, uciMoves, movetimeMs) {
    if (!uciMoves.length) return { lines: [] };
    this.setMultiPv(uciMoves.length);
    this._multiPvInfo = {};
    this.worker.postMessage(`position fen ${fen}`);
    const resultPromise = this._waitFor((line) => line.startsWith("bestmove"));
    this.worker.postMessage(`go movetime ${movetimeMs} searchmoves ${uciMoves.join(" ")}`);
    await resultPromise;
    const lines = Object.keys(this._multiPvInfo)
      .map((key) => parseInt(key, 10))
      .sort((a, b) => a - b)
      .map((idx) => this._multiPvInfo[idx]);
    return { lines };
  }

  // Liefert nur den besten Zug samt Bewertung der Gesamtstellung (MultiPV 1).
  async analyzeBest(fen, movetimeMs) {
    this.setMultiPv(1);
    const { lines } = await this.analyzeMultiPv(fen, movetimeMs);
    return lines[0] || null;
  }

  terminate() {
    if (this.worker) this.worker.terminate();
    this.worker = null;
    this.ready = false;
  }
}
