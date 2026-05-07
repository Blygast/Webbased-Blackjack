import { createDeck, shuffleDeck, drawCard } from "./deck.js";
import {
  renderHand,
  renderScore,
  setMessage,
  renderControls,
  renderUserInfo,
  renderActiveBet,
  renderChips,
  clearHands,
  flipDealerCard,
} from "./ui.js";
import { getLoggedInUser } from "./auth.js";
import { updateUserPot } from "./storage.js";

const INITIAL_STATE = {
  deck: [],
  playerHand: [],
  dealerHand: [],
  phase: "idle",
  bet: 0,
  lastBet: 0,
  result: null,
  settled: false,
};

const gameState = { ...INITIAL_STATE };

export const getGameState = () => gameState;
export const markRoundSettled = () => { gameState.settled = true; };

const calculateHandValue = (hand) => {
  let { total, aces } = hand.reduce(
    (acc, card) => ({
      total: acc.total + card.value,
      aces: acc.aces + (card.rank === "ace" ? 1 : 0),
    }),
    { total: 0, aces: 0 }
  );
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
};

const checkPlayerBust = () => {
  if (calculateHandValue(gameState.playerHand).total > 21) {
    gameState.result = "lose";
    gameState.phase = "roundOver";
    setMessage("You bust! Dealer wins.", "lose");
    return true;
  }
  return false;
};

const draw = () => drawCard(gameState.deck);

export const startRound = (betAmount) => {
  clearHands();
  gameState.deck = shuffleDeck(createDeck());
  gameState.playerHand = [draw(), draw()];
  gameState.dealerHand = [draw(), draw()];
  Object.assign(gameState, { phase: "playerTurn", bet: betAmount, result: null, settled: false });
  setMessage("");
  checkNaturalBlackJack();
  renderGame();
};

const renderGame = () => {
  const hideDealer = gameState.phase === "playerTurn";
  renderHand(gameState.playerHand, document.getElementById("player-cards"));
  renderHand(gameState.dealerHand, document.getElementById("dealer-cards"), hideDealer);

  const playerScore = calculateHandValue(gameState.playerHand);
  const dealerScore = hideDealer
    ? calculateHandValue([gameState.dealerHand[0]])
    : calculateHandValue(gameState.dealerHand);

  renderScore(playerScore, dealerScore, gameState.phase);
  if (gameState.phase !== "roundOver") {
    renderControls(gameState.phase);
    renderChips();
    renderUserInfo(getLoggedInUser());
  }
};

export const hitPlayer = () => {
  if (gameState.phase !== "playerTurn") return;
  const card = draw();
  if (!card) return;
  gameState.playerHand.push(card);
  checkPlayerBust();
  renderGame();
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const dealerPlay = async () => {
  flipDealerCard(gameState.dealerHand[1]);
  await delay(600);
  while (calculateHandValue(gameState.dealerHand).total < 17) {
    gameState.dealerHand.push(draw());
    renderGame();
    await delay(500);
  }
  decideWinner();
  renderGame();
};

export const stand = () => {
  if (gameState.phase !== "playerTurn") return;
  gameState.phase = "dealerTurn";
  return dealerPlay();
};

export const doublePlayer = () => {
  if (gameState.phase !== "playerTurn" || gameState.playerHand.length !== 2) return;
  const user = getLoggedInUser();
  if (!user || user.pot < gameState.bet) {
    setMessage("Not enough funds to double.");
    return;
  }
  const additionalBet = gameState.bet;
  gameState.bet *= 2;
  updateUserPot(user.id, user.pot - additionalBet);
  renderActiveBet(gameState.bet);
  gameState.playerHand.push(draw());
  if (!checkPlayerBust()) gameState.phase = "dealerTurn";
  renderGame();
  if (gameState.phase === "dealerTurn") return dealerPlay();
};

const decideWinner = () => {
  const p = calculateHandValue(gameState.playerHand).total;
  const d = calculateHandValue(gameState.dealerHand).total;

  if (d > 21) { gameState.result = "win"; setMessage("Dealer busts! You win.", "win"); }
  else if (p > d) { gameState.result = "win"; setMessage("You win.", "win"); }
  else if (d > p) { gameState.result = "lose"; setMessage("Dealer wins.", "lose"); }
  else { gameState.result = "push"; setMessage("Push! It's a tie.", "push"); }

  gameState.phase = "roundOver";
};

const hasBlackJack = (hand) =>
  hand.length === 2 && calculateHandValue(hand).total === 21;

const checkNaturalBlackJack = () => {
  const pBJ = hasBlackJack(gameState.playerHand);
  const dBJ = hasBlackJack(gameState.dealerHand);

  if (pBJ && dBJ) { gameState.result = "push"; }
  else if (pBJ) { gameState.result = "blackjack"; }
  else if (dBJ) { gameState.result = "lose"; }
  else { gameState.phase = "playerTurn"; return; }

  gameState.phase = "roundOver";
  const messages = {
    push: ["Both have blackjack. Its a push.", "push"],
    blackjack: ["Blackjack! You win 1.5x", "blackjack"],
    lose: ["Dealer has blackjack. You lose.", "lose"],
  };
  setMessage(...messages[gameState.result]);
};

export const resetGameState = () => {
  Object.assign(gameState, { ...INITIAL_STATE });
  renderGame();
};

export const increaseBet = (amount) => {
  const user = getLoggedInUser();
  if (amount > user.pot) {
    setMessage(`Not enough funds.`);
    return null;
  }
  gameState.bet += amount;
  const updated = updateUserPot(user.id, user.pot - amount);
  renderActiveBet(gameState.bet);
  renderControls(gameState.phase);
  return updated;
};

export const decreaseBet = (amount) => {
  if (gameState.bet < amount || gameState.settled) return null;
  gameState.bet -= amount;
  const user = getLoggedInUser();
  const updated = updateUserPot(user.id, user.pot + amount);
  renderActiveBet(gameState.bet);
  renderControls(gameState.phase);
  return updated;
};

export const resetBet = () => {
  const bet = gameState.bet;
  gameState.bet = 0;
  let updated = null;
  if (!gameState.settled && bet > 0) {
    const user = getLoggedInUser();
    if (user) updated = updateUserPot(user.id, user.pot + bet);
  }
  renderActiveBet(0);
  renderChips();
  return updated;
};

export const getBetSize = () => gameState.bet;
