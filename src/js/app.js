import "./ui.js";
import { login, register, logout, getLoggedInUser } from "./auth.js";
import {
  showAuthView,
  showGameView,
  renderUserInfo,
  renderActiveBet,
  resetAuthUI,
  setMessage,
  renderChips,
  renderControls,
  clearBetChips,
  moveBetChipsToDealer,
  moveBetChipsToPlayer,
  moveBetChipsToPlaying,
  showZeroFundsGate,
  hideZeroFundsGate,
} from "./ui.js";
import {
  startRound,
  hitPlayer,
  stand,
  doublePlayer,
  getGameState,
  markRoundSettled,
  resetGameState,
  resetBet,
  getBetSize,
} from "./blackjack.js";
import { updateUserPot } from "./storage.js";

export const state = {};

const renderApp = () => {
  const user = getLoggedInUser();
  if (!user) { showAuthView(); return; }
  showGameView();
  renderUserInfo(user);
  renderChips();
  renderControls("idle");
  user.pot <= 0 ? showZeroFundsGate() : hideZeroFundsGate();
};

const setAuthMsg = (id, text, isError) => {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = `auth-message auth-${isError ? "error" : "success"}`;
};

const handleLogin = (e) => {
  e.preventDefault();
  const { username, password } = e.target;
  const result = login(username.value.trim(), password.value.trim());
  if (result.ok) {
    const betToRefund = getBetSize();
    const gs = getGameState();
    if (betToRefund > 0 && !gs.settled) {
      const user = getLoggedInUser();
      if (user) updateUserPot(user.id, user.pot + betToRefund);
    }
    resetGameState();
    clearBetChips();
    renderApp();
  } else {
    setAuthMsg("auth-message", result.message, true);
  }
};

const handleRegister = (e) => {
  e.preventDefault();
  const { username, password } = e.target;
  const result = register(username.value.trim(), password.value.trim());
  if (result.ok) {
    setAuthMsg("auth-message-register", "Account created! Please log in.", false);
  } else {
    setAuthMsg("auth-message-register", result.message, true);
  }
};

const handleLogout = () => {
  logout();
  resetAuthUI();
  renderApp();
};

const handleStartRound = () => {
  let bet = getBetSize();
  const gs = getGameState();
  if (bet <= 0) bet = gs.lastBet;
  if (bet <= 0) return;

  const user = getLoggedInUser();
  if (bet > user.pot) {
    setMessage("Not enough funds.");
    return;
  }

  if (getBetSize() <= 0) {
    const updated = updateUserPot(user.id, user.pot - bet);
    renderUserInfo(updated);
  }

  renderActiveBet(bet);
  moveBetChipsToPlaying();
  startRound(bet);
  settleRoundIfFinished();
};

const handleHitPlayer = () => { hitPlayer(); settleRoundIfFinished(); };
const handleStand = async () => { await stand(); settleRoundIfFinished(); };
const handleDouble = async () => { await doublePlayer(); settleRoundIfFinished(); };

const handleNewRound = () => {
  clearBetChips();
  resetGameState();
  setMessage("");
};

const handleTopUp = () => {
  const user = getLoggedInUser();
  if (!user) return;
  const updated = updateUserPot(user.id, user.pot + 1000);
  hideZeroFundsGate();
  renderUserInfo(updated);
  renderControls(getGameState().phase);
  resetBet();
  clearBetChips();
  setMessage("Pot topped up by 1000.");
};

const POT_DELTA = { blackjack: (bet) => Math.round(bet * 2.5), win: (bet) => bet * 2, lose: (bet) => 0, push: (bet) => bet };

const settleRoundIfFinished = () => {
  const user = getLoggedInUser();
  const gs = getGameState();
  if (!user || gs.phase !== "roundOver" || !gs.result || gs.settled) return;

  const bet = gs.bet;
  const delta = POT_DELTA[gs.result];
  const newPot = user.pot + delta(bet);
  const updated = updateUserPot(user.id, newPot);

  markRoundSettled();
  gs.lastBet = bet;
  gs.bet = 0;
  renderActiveBet(0);
  renderUserInfo(updated);
  renderControls(gs.phase);
  renderChips();

  if (updated.pot <= 0) showZeroFundsGate();
  if (gs.result === "lose") moveBetChipsToDealer();
  else if (gs.result !== "push") moveBetChipsToPlayer();
};

const EVENTS = [
  ["login-form", "submit", handleLogin],
  ["register-form", "submit", handleRegister],
  ["logout-btn", "click", handleLogout],
  ["start-round-btn", "click", handleStartRound],
  ["hit-btn", "click", handleHitPlayer],
  ["stand-btn", "click", handleStand],
  ["double-btn", "click", handleDouble],
  ["play-again-btn", "click", handleStartRound],
  ["new-round-btn", "click", handleNewRound],
  ["top-up-btn", "click", handleTopUp],
  ["overlay-top-up-btn", "click", handleTopUp],
  ["reset-bet-btn", "click", () => { const updated = resetBet(); clearBetChips(); if (updated) renderUserInfo(updated); }],
];

const init = () => {
  for (const [id, event, handler] of EVENTS) {
    document.getElementById(id).addEventListener(event, handler);
  }
  renderApp();
};

init();
