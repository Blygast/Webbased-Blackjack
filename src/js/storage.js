const STORAGE_KEY = "blackjack_db";

const DEFAULT_DB = { users: [], session: null };

export const loadDB = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DB));
    return structuredClone(DEFAULT_DB);
  }
  return JSON.parse(raw);
};

export const saveDB = (db) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));

export const updateUserPot = (userId, newPot) => {
  const db = loadDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return null;
  user.pot = Math.max(0, newPot);
  saveDB(db);
  return user;
};
