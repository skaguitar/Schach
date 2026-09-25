const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export const LESSONS = [
  {
    id: "brett",
    title: "Das Schachbrett",
    steps: [
      {
        type: "info",
        fen: START_FEN,
        paragraphs: [
          "Das Schachbrett hat 8x8 Felder, abwechselnd hell und dunkel.",
          "Die Spalten heißen a bis h, die Reihen 1 bis 8. Jedes Feld hat so eine eindeutige Adresse, zum Beispiel e4.",
          "Merkregel: Aus Sicht von Weiß ist das Feld unten rechts (h1) immer hell.",
        ],
      },
      {
        type: "info",
        fen: START_FEN,
        highlights: [{ squares: ["d4", "d5", "e4", "e5"], className: "hint" }],
        paragraphs: [
          "Die vier markierten Felder in der Mitte des Bretts nennt man das Zentrum.",
          "Wer das Zentrum kontrolliert, hat mehr Bewegungsfreiheit für seine Figuren. Das wird später bei der Eröffnung wichtig.",
        ],
      },
      {
        type: "info",
        fen: START_FEN,
        paragraphs: [
          "Die Grundaufstellung: In der Ecke stehen die Türme, daneben die Springer, dann die Läufer, und in der Mitte König und Dame.",
          "Merksatz: 'Die Dame steht auf ihrer eigenen Farbe.' Die weiße Dame startet auf einem hellen Feld (d1), die schwarze auf einem dunklen (d8).",
        ],
      },
    ],
  },
  {
    id: "figuren",
    title: "Wie die Figuren ziehen",
    steps: [
      {
        type: "info",
        fen: "6k1/8/8/8/8/8/4P3/4K3 w - - 0 1",
        paragraphs: [
          "Der Bauer zieht nur geradeaus, ein Feld pro Zug – von seinem Startfeld aus darf er auch zwei Felder ziehen.",
          "Schlagen kann er nur diagonal, ein Feld nach vorn.",
        ],
      },
      {
        type: "task",
        fen: "6k1/8/8/8/8/8/4P3/4K3 w - - 0 1",
        instruction: "Ziehe den Bauern von seinem Startfeld zwei Felder nach vorn: e2 nach e4.",
        solutions: [{ from: "e2", to: "e4" }],
        successText: "Richtig! Vom Startfeld aus darf der Bauer zwei Felder ziehen.",
      },
      {
        type: "info",
        fen: "6k1/8/8/8/8/8/8/4K1N1 w - - 0 1",
        paragraphs: [
          "Der Springer zieht in einem 'L': zwei Felder in eine Richtung, dann ein Feld seitlich.",
          "Er ist die einzige Figur, die über andere Figuren springen kann.",
        ],
      },
      {
        type: "task",
        fen: "6k1/8/8/8/8/8/8/4K1N1 w - - 0 1",
        instruction: "Ziehe den Springer von g1 nach f3.",
        solutions: [{ from: "g1", to: "f3" }],
        successText: "Genau richtig, das ist der klassische Entwicklungszug für den Springer.",
      },
      {
        type: "info",
        fen: "6k1/8/8/8/8/8/8/2B1K3 w - - 0 1",
        paragraphs: [
          "Der Läufer zieht beliebig weit diagonal – bleibt dabei aber immer auf Feldern derselben Farbe.",
        ],
      },
      {
        type: "task",
        fen: "6k1/8/8/8/8/8/8/2B1K3 w - - 0 1",
        instruction: "Ziehe den Läufer diagonal von c1 nach g5.",
        solutions: [{ from: "c1", to: "g5" }],
        successText: "Gut gemacht! So nutzt du die volle Reichweite des Läufers.",
      },
      {
        type: "info",
        fen: "6k1/8/8/8/8/8/8/R3K3 w - - 0 1",
        paragraphs: [
          "Der Turm zieht beliebig weit geradeaus oder seitwärts, aber nicht diagonal.",
        ],
      },
      {
        type: "task",
        fen: "6k1/8/8/8/8/8/8/R3K3 w - - 0 1",
        instruction: "Ziehe den Turm von a1 nach a5.",
        solutions: [{ from: "a1", to: "a5" }],
        successText: "Richtig! Türme sind besonders stark auf offenen Linien.",
      },
      {
        type: "info",
        fen: "6k1/8/8/8/8/8/8/3QK3 w - - 0 1",
        paragraphs: [
          "Die Dame ist die stärkste Figur: Sie zieht wie Turm und Läufer zusammen – beliebig weit in jede Richtung.",
        ],
      },
      {
        type: "task",
        fen: "6k1/8/8/8/8/8/8/3QK3 w - - 0 1",
        instruction: "Ziehe die Dame diagonal von d1 nach h5.",
        solutions: [{ from: "d1", to: "h5" }],
        successText: "Perfekt – die Dame kombiniert Turm- und Läuferzüge.",
      },
      {
        type: "info",
        fen: "6k1/8/8/8/8/8/8/4K3 w - - 0 1",
        paragraphs: [
          "Der König zieht nur ein Feld in jede Richtung – darf sich dabei aber nie auf ein Feld stellen, das von einer gegnerischen Figur angegriffen wird.",
        ],
      },
      {
        type: "task",
        fen: "6k1/8/8/8/8/8/8/4K3 w - - 0 1",
        instruction: "Ziehe den König ein Feld vor, von e1 nach e2.",
        solutions: [{ from: "e1", to: "e2" }],
        successText: "Genau so bewegt sich der König – Schritt für Schritt.",
      },
    ],
  },
  {
    id: "spezialzuege",
    title: "Schlagen und Spezialzüge",
    steps: [
      {
        type: "info",
        fen: "6k1/8/8/8/8/2n5/8/B3K3 w - - 0 1",
        paragraphs: [
          "Schlagen funktioniert wie ziehen: Deine Figur landet auf dem Feld der gegnerischen Figur, die dann vom Brett genommen wird.",
        ],
      },
      {
        type: "task",
        fen: "6k1/8/8/8/8/2n5/8/B3K3 w - - 0 1",
        instruction: "Schlage den schwarzen Springer mit deinem Läufer.",
        solutions: [{ from: "a1", to: "c3" }],
        successText: "Gewonnenes Material – genauso funktioniert Schlagen.",
      },
      {
        type: "info",
        fen: "4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1",
        paragraphs: [
          "Die Rochade ist der einzige Zug, bei dem sich zwei eigene Figuren gleichzeitig bewegen.",
          "Bedingungen: König und der beteiligte Turm haben sich noch nicht bewegt, die Felder dazwischen sind frei, und der König steht nicht im Schach, zieht nicht durchs Schach und landet nicht im Schach.",
        ],
      },
      {
        type: "task",
        fen: "4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1",
        instruction: "Rochiere kurz: Ziehe den König zwei Felder in Richtung des Turms auf h1.",
        solutions: [{ from: "e1", to: "g1" }],
        successText: "So geht die kurze Rochade – König und Turm springen gemeinsam.",
      },
      {
        type: "info",
        fen: "k7/8/8/3pP3/8/8/8/4K3 w - d6 0 1",
        paragraphs: [
          "En passant: Zieht ein gegnerischer Bauer von seinem Startfeld aus zwei Felder vor und landet direkt neben deinem Bauern, darfst du ihn so schlagen, als wäre er nur ein Feld gezogen – aber nur im direkt folgenden Zug.",
        ],
      },
      {
        type: "task",
        fen: "k7/8/8/3pP3/8/8/8/4K3 w - d6 0 1",
        instruction: "Der schwarze Bauer ist gerade von d7 nach d5 gezogen. Schlage ihn en passant: e5 nach d6.",
        solutions: [{ from: "e5", to: "d6" }],
        successText: "Richtig geschlagen – en passant wird oft übersehen, jetzt kennst du es.",
      },
      {
        type: "info",
        fen: "k7/4P3/8/8/8/8/8/4K3 w - - 0 1",
        paragraphs: [
          "Erreicht ein Bauer die letzte Reihe, wird er umgewandelt – meist in eine Dame, seltener in Turm, Läufer oder Springer.",
        ],
      },
      {
        type: "task",
        fen: "k7/4P3/8/8/8/8/8/4K3 w - - 0 1",
        instruction: "Verwandle deinen Bauern in eine Dame: Ziehe ihn von e7 nach e8 und wähle die Dame.",
        solutions: [{ from: "e7", to: "e8", promotion: "q" }],
        successText: "Aus dem Bauern wird eine Dame – das ist oft entscheidend im Endspiel.",
      },
    ],
  },
  {
    id: "schach-matt-patt",
    title: "Schach, Matt und Patt",
    steps: [
      {
        type: "info",
        fen: "4k3/8/8/8/8/8/4q3/4K3 w - - 0 1",
        paragraphs: [
          "Steht dein König im Schach, musst du sofort reagieren: die angreifende Figur schlagen, den Angriff blocken, oder mit dem König ausweichen.",
        ],
      },
      {
        type: "task",
        fen: "4k3/8/8/8/8/8/4q3/4K3 w - - 0 1",
        instruction: "Dein König steht im Schach. Schlage die Dame, um dem Schach zu entkommen.",
        solutions: [{ from: "e1", to: "e2" }],
        successText: "So wehrst du Schach durch Schlagen ab.",
      },
      {
        type: "task",
        fen: "k3r3/8/8/8/8/2B5/8/4K3 w - - 0 1",
        instruction: "Auch hier steht dein König im Schach. Finde einen Zug, der das Schach beendet – blocken oder ausweichen sind beide möglich.",
        solutions: [{ mode: "resolvesCheck" }],
        successText: "Gut erkannt – es gab mehrere richtige Lösungen.",
      },
      {
        type: "info",
        fen: "k7/8/1K6/8/8/8/7Q/8 w - - 0 1",
        paragraphs: [
          "Schachmatt bedeutet: Der König steht im Schach, und es gibt keinen einzigen legalen Zug, der das Schach beendet. Das Spiel ist sofort vorbei.",
        ],
      },
      {
        type: "task",
        fen: "k7/8/1K6/8/8/8/7Q/8 w - - 0 1",
        instruction: "Setze in einem Zug matt. Dein König auf b6 schneidet dem gegnerischen König die Fluchtfelder ab.",
        solutions: [{ mode: "checkmate" }],
        successText: "Schachmatt! Die Dame gibt Schach auf der Reihe, dein König deckt die Fluchtfelder.",
      },
      {
        type: "info",
        fen: "7k/5K2/6Q1/8/8/8/8/8 b - - 0 1",
        paragraphs: [
          "Patt: Der König steht nicht im Schach, hat aber auch keinen einzigen legalen Zug. In diesem Fall endet die Partie remis – unentschieden.",
          "In dieser Stellung ist Schwarz am Zug, steht nicht im Schach, kann sich aber nirgendwo hinbewegen. Das ist Patt – eine häufige Falle, wenn man mit klarem Vorteil zu unvorsichtig spielt.",
        ],
      },
    ],
  },
  {
    id: "eroeffnung",
    title: "Grundprinzipien der Eröffnung",
    steps: [
      {
        type: "info",
        fen: START_FEN,
        paragraphs: [
          "Drei Grundprinzipien für den Beginn jeder Partie:",
          "1. Kontrolliere das Zentrum mit deinen Bauern.",
          "2. Entwickle Springer und Läufer zügig – bringe deine Figuren ins Spiel.",
          "3. Bringe deinen König früh in Sicherheit, meist durch Rochade. Zieh die Dame nicht zu früh heraus.",
        ],
      },
      {
        type: "task",
        fen: START_FEN,
        instruction: "Spiele einen guten ersten Zug, der das Zentrum besetzt.",
        solutions: [
          { from: "e2", to: "e4" },
          { from: "d2", to: "d4" },
          { from: "g1", to: "f3" },
          { from: "c2", to: "c4" },
        ],
        successText: "Ein solider erster Zug – so beginnen die meisten guten Eröffnungen.",
      },
      {
        type: "info",
        fen: "rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2",
        paragraphs: [
          "Warnbeispiel: Nach 1.e4 e5 2.Dh5 sieht die weiße Dame aktiv aus, ist aber sehr früh im Spiel und kann leicht mit Tempogewinn angegriffen werden, zum Beispiel durch ...Sc6 und ...g6.",
          "Deshalb gilt: Erst die kleinen Figuren entwickeln, die Dame kommt später.",
        ],
      },
    ],
  },
  {
    id: "taktik",
    title: "Taktische Motive",
    steps: [
      {
        type: "info",
        fen: "r3k3/8/8/1N6/8/8/8/6K1 w - - 0 1",
        paragraphs: [
          "Eine Gabel ist ein Zug, der zwei gegnerische Figuren gleichzeitig angreift – meistens mit dem Springer, weil er so ungewöhnlich zieht.",
        ],
      },
      {
        type: "task",
        fen: "r3k3/8/8/1N6/8/8/8/6K1 w - - 0 1",
        instruction: "Finde die Springergabel: ein Zug, der König und Turm gleichzeitig angreift.",
        solutions: [{ from: "b5", to: "c7" }],
        successText: "Perfekt – der Springer gibt Schach und attackiert gleichzeitig den Turm auf a8.",
      },
      {
        type: "info",
        fen: "4k3/8/8/4q3/8/8/8/4R1K1 w - - 0 1",
        paragraphs: [
          "Ein Spieß ähnelt einer Fesselung, nur umgekehrt: Die wertvollere Figur steht vorn und muss wegziehen, wodurch die dahinterstehende Figur ungeschützt ins Schlagen gerät.",
        ],
      },
      {
        type: "info",
        fen: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/8/PPPP1PPP/RNBQK1NR b KQkq - 3 3",
        paragraphs: [
          "Eine Fesselung liegt vor, wenn eine Figur sich nicht bewegen darf (oder sollte), weil dahinter eine wertvollere Figur – oft der König – ungeschützt wäre.",
          "Hier fesselt der weiße Läufer auf b5 den Springer auf c6 an den König auf e8.",
        ],
      },
    ],
  },
  {
    id: "mattbilder",
    title: "Einfache Mattbilder",
    steps: [
      {
        type: "info",
        fen: "6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1",
        paragraphs: [
          "Das Grundreihenmatt entsteht, wenn der König durch seine eigenen Bauern auf der letzten Reihe eingesperrt ist und ein Turm oder eine Dame dort eindringen kann.",
        ],
      },
      {
        type: "task",
        fen: "6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1",
        instruction: "Setze Schwarz in einem Zug matt: Bring deinen Turm auf die letzte Reihe.",
        solutions: [{ mode: "checkmate" }],
        successText: "Grundreihenmatt! Der König hatte kein Fluchtfeld.",
      },
      {
        type: "info",
        fen: "6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1",
        paragraphs: [
          "Tipp gegen das eigene Grundreihenmatt: Schaffe rechtzeitig ein 'Luftloch' für deinen König, zum Beispiel mit einem Zug wie h6 oder h3.",
        ],
      },
    ],
  },
];
