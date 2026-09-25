import { Chess } from "../vendor/chess.esm.js";

const PIECE_ACC = {
  p: "deinen Bauern",
  n: "deinen Springer",
  b: "deinen Läufer",
  r: "deinen Turm",
  q: "deine Dame",
  k: "deinen König",
};

export function uciToSan(fen, uciMove) {
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

// Prüft, ob die vom Gegner nach dem gespielten Zug beste Antwort eine
// Figur schlägt – einfache Annäherung an "diese Figur hängt jetzt".
export function describeThreat(afterFen, replyUciMove) {
  if (!replyUciMove) return null;
  try {
    const chess = new Chess(afterFen);
    const move = chess.move({
      from: replyUciMove.slice(0, 2),
      to: replyUciMove.slice(2, 4),
      promotion: replyUciMove.length > 4 ? replyUciMove.slice(4, 5) : undefined,
    });
    if (move && move.captured) {
      return { pieceAcc: PIECE_ACC[move.captured] || "eine Figur", square: move.to };
    }
  } catch {
    /* Zug ließ sich nicht nachbilden – dann einfach keine Detail-Drohung nennen */
  }
  return null;
}

/**
 * Erzeugt einen kurzen, coach-artigen Erklärsatz in Alltagssprache für einen
 * Zug. Erwartet:
 *  - classification: Eintrag aus MOVE_CLASSES (eval-utils.js)
 *  - wasBest: war es exakt der Bestzug?
 *  - bestMoveSan: SAN des besten Zugs (falls abweichend)
 *  - allowedMate: Matt-Distanz, falls der Zug dem Gegner ein erzwungenes Matt erlaubt
 *  - missedMateIn: Matt-Distanz, falls der Spieler selbst ein Matt verpasst hat
 *  - threat: Ergebnis von describeThreat() oder null
 */
export function explainMove({ classification, wasBest, bestMoveSan, allowedMate, missedMateIn, threat }) {
  if (wasBest) {
    return "Bestzug! Genau das hätte die Engine hier auch gespielt.";
  }

  if (classification.key === "good") {
    let text = "Guter Zug.";
    if (bestMoveSan) text += ` ${bestMoveSan} wäre minimal genauer gewesen, aber der Unterschied ist klein.`;
    return text;
  }

  if (classification.key === "inaccuracy") {
    let text = "Nicht ganz optimal, aber kein großes Problem.";
    if (bestMoveSan) text += ` ${bestMoveSan} hätte deine Stellung etwas verbessert.`;
    return text;
  }

  // mistake oder blunder
  let text = classification.key === "blunder" ? "Vorsicht, das war ein klarer Patzer." : "Das war ein Fehler.";

  if (allowedMate) {
    text += ` Der Gegner kann dich jetzt in ${allowedMate} Zug${allowedMate === 1 ? "" : "en"} mattsetzen!`;
  } else if (threat) {
    text += ` Der Gegner kann jetzt ${threat.pieceAcc} auf ${threat.square} schlagen.`;
  }

  if (bestMoveSan) {
    text += ` Spiele stattdessen ${bestMoveSan}`;
    if (missedMateIn) {
      text += `, damit setzt du sogar in ${missedMateIn} Zug${missedMateIn === 1 ? "" : "en"} selbst matt`;
    }
    text += ".";
  }

  return text;
}
