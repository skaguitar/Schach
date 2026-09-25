const PIECES = [
  { abbr: "K", name: "König" },
  { abbr: "Q", name: "Dame" },
  { abbr: "R", name: "Turm" },
  { abbr: "B", name: "Läufer" },
  { abbr: "N", name: "Springer" },
  { abbr: "–", name: "Bauer (steht ohne Buchstabe vor dem Zielfeld, z. B. „e4“)" },
];

const MOVE_SIGNS = [
  { abbr: "x", name: "schlägt eine gegnerische Figur, z. B. „Nxe5“" },
  { abbr: "+", name: "Schach" },
  { abbr: "#", name: "Schachmatt" },
  { abbr: "O-O", name: "kurze Rochade" },
  { abbr: "O-O-O", name: "lange Rochade" },
  { abbr: "=Q", name: "Bauernumwandlung, hier zur Dame, z. B. „e8=Q“" },
];

function listItems(entries) {
  return entries
    .map((e) => `<li><span class="notation-abbr">${e.abbr}</span><span class="notation-name">${e.name}</span></li>`)
    .join("");
}

export function mountNotationLegend(container) {
  container.innerHTML = `
    <details class="notation-legend">
      <summary>Notation-Legende (Abkürzungen erklärt)</summary>
      <div class="notation-legend-body">
        <h5>Figuren</h5>
        <ul class="notation-list">${listItems(PIECES)}</ul>
        <p class="notation-hint">
          Diese App nutzt die international übliche englische Notation. Deshalb steht
          „N" für Springer (englisch „Knight"), nicht „S".
        </p>
        <h5>Zugzeichen</h5>
        <ul class="notation-list">${listItems(MOVE_SIGNS)}</ul>
      </div>
    </details>
  `;
}
