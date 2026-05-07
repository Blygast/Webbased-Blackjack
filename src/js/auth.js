import { loadDB, saveDB } from "./storage.js";

export const register = (username, password) => {
  const db = loadDB();
  if (db.users.some((u) => u.username === username)) {
    return { ok: false, message: "Username already exists" };
  }
  const newUser = { id: crypto.randomUUID(), username, password, pot: 500 };
  db.users.push(newUser);
  saveDB(db);
  return { ok: true, user: newUser };
};

export const login = (username, password) => {
  const db = loadDB();
  const user = db.users.find(
    (u) => u.username === username && u.password === password
  );
  if (!user) return { ok: false, message: "Wrong username or password" };
  db.session = { userId: user.id };
  saveDB(db);
  return { ok: true, user };
};

export const logout = () => {
  const db = loadDB();
  db.session = null;
  saveDB(db);
};

export const getLoggedInUser = () => {
  const db = loadDB();
  return db.users.find((u) => u.id === db.session?.userId) ?? null;
};
