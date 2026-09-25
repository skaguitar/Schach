export function getLegalTargets(chess, square) {
  const verboseMoves = chess.moves({ square, verbose: true });
  const byTarget = new Map();
  for (const m of verboseMoves) {
    const existing = byTarget.get(m.to);
    const captured = Boolean(m.captured) || m.flags.includes("e");
    const promotion = Boolean(m.promotion);
    if (existing) {
      existing.promotion = existing.promotion || promotion;
      existing.captured = existing.captured || captured;
    } else {
      byTarget.set(m.to, { from: m.from, to: m.to, captured, promotion });
    }
  }
  return Array.from(byTarget.values());
}

export function gameOutcome(chess) {
  if (chess.isCheckmate()) {
    return { over: true, result: chess.turn() === "w" ? "black" : "white", reason: "checkmate" };
  }
  if (chess.isStalemate()) {
    return { over: true, result: "draw", reason: "stalemate" };
  }
  if (chess.isThreefoldRepetition()) {
    return { over: true, result: "draw", reason: "repetition" };
  }
  if (chess.isInsufficientMaterial()) {
    return { over: true, result: "draw", reason: "material" };
  }
  if (chess.isDraw()) {
    return { over: true, result: "draw", reason: "fifty-move" };
  }
  return { over: false };
}

export function outcomeText(outcome) {
  if (!outcome.over) return "";
  if (outcome.result === "draw") {
    const reasons = {
      stalemate: "Patt",
      repetition: "Stellungswiederholung",
      material: "ungenügendes Material",
      "fifty-move": "50-Züge-Regel",
    };
    return `Remis (${reasons[outcome.reason] || outcome.reason})`;
  }
  const winner = outcome.result === "white" ? "Weiß" : "Schwarz";
  return `Schachmatt – ${winner} gewinnt`;
}
