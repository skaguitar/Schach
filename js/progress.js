// Fortschritt im Sparring: Freischaltung der Schwierigkeitsgrade nacheinander
// und ein paar motivierende Meilensteine. Wird in localStorage gespeichert.

const STORAGE_KEY = "schach-lernen:sparring-progress";
const WIN_STREAK_TARGET = 5;

export const MILESTONES = [
  { id: "first-win", label: "Erster Sieg", description: "Gewinne dein erstes Sparring gegen die Engine." },
  {
    id: "anfaenger-mastered",
    label: "Anfänger gemeistert",
    description: `${WIN_STREAK_TARGET} Siege in Folge gegen "Anfänger" – schaltet "Leicht" frei.`,
  },
  {
    id: "leicht-mastered",
    label: "Leicht gemeistert",
    description: `${WIN_STREAK_TARGET} Siege in Folge gegen "Leicht" – schaltet "Mittel" frei.`,
  },
  {
    id: "mittel-mastered",
    label: "Mittel gemeistert",
    description: `${WIN_STREAK_TARGET} Siege in Folge gegen "Mittel" – schaltet "Fortgeschritten" frei.`,
  },
  {
    id: "fortgeschritten-mastered",
    label: "Fortgeschritten gemeistert",
    description: `${WIN_STREAK_TARGET} Siege in Folge gegen "Fortgeschritten" – schaltet "Stark" frei.`,
  },
  { id: "stark-sieg", label: "Großmeister-Herausforderer", description: 'Gewinne dein erstes Spiel gegen "Stark".' },
];

function defaultState(difficultyIds) {
  const streaks = {};
  difficultyIds.forEach((id) => {
    streaks[id] = 0;
  });
  return { unlocked: [difficultyIds[0]], streaks, milestones: {}, hasEverWon: false };
}

export function loadProgress(difficultyIds) {
  const fallback = defaultState(difficultyIds);
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!raw) return fallback;
    return {
      ...fallback,
      ...raw,
      streaks: { ...fallback.streaks, ...raw.streaks },
      milestones: { ...raw.milestones },
    };
  } catch {
    return fallback;
  }
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* Speicher nicht verfügbar, Fortschritt wird für diese Sitzung nicht gesichert */
  }
}

export function isUnlocked(state, difficultyId) {
  return state.unlocked.includes(difficultyId);
}

export function winsNeeded(state, difficultyId) {
  return Math.max(0, WIN_STREAK_TARGET - (state.streaks[difficultyId] || 0));
}

/**
 * Trägt das Ergebnis einer Sparring-Partie ein und schaltet ggf. den
 * nächsten Schwierigkeitsgrad frei. difficulties ist das geordnete
 * DIFFICULTIES-Array aus engine.js. Gibt die IDs neu freigeschalteter
 * Meilensteine zurück.
 */
export function recordResult(state, difficulties, difficultyId, result) {
  const newlyEarned = [];

  if (result !== "win") {
    state.streaks[difficultyId] = 0;
    save(state);
    return newlyEarned;
  }

  if (!state.hasEverWon) {
    state.hasEverWon = true;
    newlyEarned.push("first-win");
  }

  state.streaks[difficultyId] = (state.streaks[difficultyId] || 0) + 1;

  const idx = difficulties.findIndex((d) => d.id === difficultyId);
  const isTopDifficulty = idx === difficulties.length - 1;

  if (isTopDifficulty) {
    if (!state.milestones["stark-sieg"]) newlyEarned.push("stark-sieg");
  } else if (state.streaks[difficultyId] >= WIN_STREAK_TARGET) {
    const nextId = difficulties[idx + 1].id;
    if (!state.unlocked.includes(nextId)) {
      state.unlocked.push(nextId);
      const masteryId = `${difficultyId}-mastered`;
      if (!state.milestones[masteryId]) newlyEarned.push(masteryId);
    }
  }

  newlyEarned.forEach((id) => {
    state.milestones[id] = true;
  });
  save(state);
  return newlyEarned;
}
