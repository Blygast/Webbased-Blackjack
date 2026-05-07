import { getLoggedInUser } from "./auth";
import { getBetSize, getGameState, increaseBet, decreaseBet } from "./blackjack";
import { chips, getChipImagePath } from "./chip";

const $ = (id) => document.getElementById(id);
const authView = $("auth-view");
const gameView = $("game-view");
const currentUserEl = $("current-user");
const currentPotEl = $("current-pot");
const betChipsEl = $("bet-chips");

let betChipHistory = [];

const switchView = (show, hide) => {
  hide.classList.add("hidden");
  show.classList.remove("hidden");
  show.classList.add("view-entering");
  const onDone = () => { show.classList.remove("view-entering"); show.removeEventListener("animationend", onDone); };
  show.addEventListener("animationend", onDone);
};

export const showAuthView = () => switchView(authView, gameView);
export const showGameView = () => switchView(gameView, authView);

const PULSE_CLASSES = ["pot-animating-up", "pot-animating-down"];
let potAnimInterval = null;
let potAnimTimeout = null;

const animatePotValue = (target) => {
  if (potAnimInterval) clearInterval(potAnimInterval);
  if (potAnimTimeout) clearTimeout(potAnimTimeout);
  const current = parseInt(currentPotEl.textContent) || 0;
  const diff = target - current;
  if (diff === 0) { currentPotEl.textContent = target; return; }

  const isGain = diff > 0;
  const steps = Math.min(Math.abs(diff), 40);
  let step = 0;

  let signEl = currentPotEl.parentElement.querySelector(".pot-sign");
  if (!signEl) {
    signEl = document.createElement("span");
    signEl.className = "pot-sign";
    currentPotEl.parentElement.insertAdjacentElement("afterbegin", signEl);
  }
  Object.assign(signEl, { textContent: isGain ? "+" : "-" });
  signEl.dataset.direction = isGain ? "up" : "down";

  requestAnimationFrame(() => {
    signEl.classList.add("pot-sign-visible");
    currentPotEl.classList.add("pot-value-shifted");
    currentPotEl.classList.remove(...PULSE_CLASSES);
    void currentPotEl.offsetWidth;
    currentPotEl.classList.add(isGain ? "pot-animating-up" : "pot-animating-down");
  });

  potAnimInterval = setInterval(() => {
    currentPotEl.textContent = Math.round(current + diff * (1 - Math.pow(1 - ++step / steps, 3)));
    if (step >= steps) {
      clearInterval(potAnimInterval);
      potAnimInterval = null;
      currentPotEl.textContent = target;
      signEl.classList.remove("pot-sign-visible");
      currentPotEl.classList.remove("pot-value-shifted");
          potAnimTimeout = setTimeout(() => { currentPotEl.classList.remove(...PULSE_CLASSES); signEl.dataset.direction = ""; potAnimTimeout = null; }, 300);
    }
  }, 1200 / steps);
};

export const renderUserInfo = (user) => {
  currentUserEl.textContent = user.username;
  animatePotValue(user.pot);
};

export const renderActiveBet = (bet) => { $("active-bet-display").textContent = bet ?? "0"; };

const loginPanel = $("login-panel");
const registerPanel = $("register-panel");

const animatePanelSwitch = (outPanel, inPanel, dir) => {
  const exitClass = `panel-exit-${dir}`;
  const enterClass = `panel-enter-${dir === "left" ? "right" : "left"}`;
  outPanel.classList.add(exitClass);
  outPanel.addEventListener("animationend", () => {
    outPanel.classList.add("hidden");
    outPanel.classList.remove(exitClass);
    inPanel.classList.remove("hidden");
    inPanel.classList.add(enterClass);
    inPanel.addEventListener("animationend", () => inPanel.classList.remove(enterClass), { once: true });
  }, { once: true });
};

const clearMsg = (id) => { const el = $(id); el.textContent = null; el.className = "auth-message"; };

$("show-register-btn").addEventListener("click", () => { clearMsg("auth-message"); animatePanelSwitch(loginPanel, registerPanel, "left"); });
$("show-login-btn").addEventListener("click", () => { clearMsg("auth-message-register"); animatePanelSwitch(registerPanel, loginPanel, "right"); });

export const resetAuthUI = () => { $("login-form").reset(); $("register-form").reset(); clearMsg("auth-message"); clearMsg("auth-message-register"); };

const getCardImagePath = (card, hidden = false) =>
  new URL(hidden ? "../assets/cards/large/back_red.png" : `../assets/cards/large/${card.rank}_of_${card.suit}.png`, import.meta.url).href;

export const clearHands = () => { $("dealer-cards").innerHTML = ""; $("player-cards").innerHTML = ""; };

export const flipDealerCard = (card) => {
  const el = $("dealer-cards").children[1];
  if (!el) return;
  el.classList.add("card-flip");
  setTimeout(() => { el.src = getCardImagePath(card); el.alt = `${card.rank} of ${card.suit}`; }, 250);
};

const snapshotPositions = (container) =>
  Array.from(container.children).map((el) => ({
    rotate: el.style.getPropertyValue("--rot"),
    top: el.style.top,
    left: el.style.left,
  }));

export const renderHand = (cards, container, hideCard = false) => {
  const saved = snapshotPositions(container);
  container.innerHTML = "";
  container.style.transform = "translateX(-50%)";

  const spread = 22 / 16;
  let leftOffset = saved.length > 0
    ? parseFloat(saved.at(-1).left) + Math.random() * spread + spread
    : 0;

  cards.forEach((card, i) => {
    const hidden = hideCard && i === 1;
    const img = document.createElement("img");
    img.src = getCardImagePath(card, hidden);
    img.alt = hidden ? "Hidden card" : `${card.rank} of ${card.suit}`;
    img.classList.add("card");

    const s = saved[i];
    if (s) {
      img.style.setProperty("--rot", s.rotate);
      img.style.top = s.top;
      img.style.left = s.left;
    } else {
      const rot = Math.random() * 8 - 4;
      img.style.setProperty("--rot", `${rot}deg`);
      img.style.rotate = `${rot}deg`;
      img.style.top = `${(Math.random() * 10 + 5) / 16}rem`;
      img.style.left = `${leftOffset}rem`;
      img.classList.add("card-deal");
      img.style.animationDelay = `${(i - saved.length) * 300}ms`;
      leftOffset += Math.random() * spread + spread;
    }

    container.appendChild(img);
  });

  if (cards.length > 0) {
    const maxLeft = parseFloat(container.lastChild.style.left) || 0;
    const shift = (20 - maxLeft - 5) / 2;
    container.style.transform = shift > 0 ? `translateX(calc(-50% + ${shift}rem))` : "translateX(-50%)";
  }
};

const pulseScore = (el, text) => {
  if (el.textContent !== text && text) { el.classList.remove("score-pulse"); void el.offsetWidth; el.classList.add("score-pulse"); }
  el.textContent = text;
};

export const renderScore = (playerScore, dealerScore, phase) => {
  const fmt = (s) => phase === "idle" ? "" : `Score: ${s.soft ? "Soft " : ""}${s.total}`;
  pulseScore($("player-score"), fmt(playerScore));
  pulseScore($("dealer-score"), fmt(dealerScore));
};

const triggerSparkles = (container) => {
  for (let i = 0; i < 50; i++) {
    const el = document.createElement("div");
    el.className = "sparkle-particle";
    const angle = (Math.PI * 2 * i) / 50 + (Math.random() - 0.5) * 0.5;
    const dist = 3.75 + Math.random() * 15;
    const size = Math.random() * 0.35 + 0.2;
    el.style.cssText = `left:50%;top:50%;--dx:${Math.cos(angle) * dist}rem;--dy:${Math.sin(angle) * dist}rem;animation-delay:${Math.random() * 0.5}s;animation-duration:${0.8 + Math.random() * 0.8}s;width:${size.toFixed(3)}rem;height:${size.toFixed(3)}rem`;
    if (Math.random() > 0.5) el.style.background = "var(--emerald)";
    container.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }
};

const triggerCoinRain = (container) => {
  for (let i = 0; i < 40; i++) {
    const el = document.createElement("div");
    el.className = "coin-particle";
    el.style.cssText = `left:${10 + Math.random() * 80}%;top:-2rem;--fall-y:${60 + Math.random() * 40}vh;--drift-x:${(Math.random() - 0.5) * 6}rem;--spin:${Math.random() * 1080 - 540}deg;animation-delay:${Math.random() * 1.2}s;animation-duration:${1.2 + Math.random() * 1}s;--size:${0.6 + Math.random() * 0.5}rem`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
};

const CONFETTI_COLORS = ["var(--gold)", "var(--gold-light)", "var(--emerald)", "var(--emerald-light)", "var(--white-70)"];

const triggerConfettiBurst = (container) => {
  for (let i = 0; i < 60; i++) {
    const el = document.createElement("div");
    el.className = "confetti-piece";
    const angle = (Math.PI * 2 * i) / 60 + (Math.random() - 0.5) * 0.4;
    const dist = 4 + Math.random() * 18;
    el.style.cssText = `left:50%;top:50%;--dx:${Math.cos(angle) * dist}rem;--dy:${Math.sin(angle) * dist - 5}rem;--spin:${Math.random() * 720 - 360}deg;--drift:${(Math.random() - 0.5) * 4}rem;background:${CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]};animation-delay:${Math.random() * 0.4}s;animation-duration:${1 + Math.random() * 1.2}s;width:${(0.3 + Math.random() * 0.4).toFixed(3)}rem;height:${(0.15 + Math.random() * 0.25).toFixed(3)}rem`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }
};

const triggerFireworks = (container) => {
  const fwColors = ["var(--gold)", "var(--emerald-light)", "var(--gold-light)"];
  const launches = 4 + Math.floor(Math.random() * 3);
  for (let f = 0; f < launches; f++) {
    const cx = 20 + Math.random() * 60;
    const cy = 15 + Math.random() * 40;
    setTimeout(() => {
      const rocket = document.createElement("div");
      rocket.className = "firework-rocket";
      rocket.style.cssText = `left:${cx}%;bottom:0;--target-y:${cy}vh;animation-duration:0.6s`;
      container.appendChild(rocket);
      setTimeout(() => {
        rocket.remove();
        const burst = document.createElement("div");
        burst.className = "firework-burst";
        burst.style.left = `${cx}%`;
        burst.style.top = `${cy}vh`;
        const color = fwColors[Math.floor(Math.random() * fwColors.length)];
        for (let s = 0; s < 30; s++) {
          const spark = document.createElement("div");
          spark.className = "firework-spark";
          const a = (Math.PI * 2 * s) / 30;
          const d = 2 + Math.random() * 4;
          spark.style.cssText = `--dx:${(Math.cos(a) * d).toFixed(3)}rem;--dy:${(Math.sin(a) * d).toFixed(3)}rem;background:${color};animation-delay:${(Math.random() * 0.15).toFixed(3)}s`;
          burst.appendChild(spark);
        }
        container.appendChild(burst);
        setTimeout(() => burst.remove(), 1500);
      }, 600);
    }, (f * 0.35 + Math.random() * 0.2) * 1000);
  }
};

const triggerCelebration = (isBlackjack = false) => {
  const container = $("celebration-container");
  if (isBlackjack) { triggerSparkles(container); triggerConfettiBurst(container); triggerFireworks(container); triggerCoinRain(container); return; }
  [triggerSparkles, triggerConfettiBurst, triggerFireworks][Math.floor(Math.random() * 3)](container);
};

const triggerDefeatEffect = () => {
  const container = $("celebration-container");
  const flash = Object.assign(document.createElement("div"), { className: "defeat-flash" });
  container.appendChild(flash);
  setTimeout(() => flash.remove(), 600);
  for (let i = 0; i < 20; i++) {
    const el = document.createElement("div");
    el.className = "defeat-shard";
    const angle = (Math.PI * 2 * i) / 20 + (Math.random() - 0.5) * 0.3;
    const dist = 2 + Math.random() * 8;
    el.style.cssText = `left:50%;top:50%;--dx:${Math.cos(angle) * dist}rem;--dy:${Math.sin(angle) * dist - 2}rem;animation-delay:${Math.random() * 0.15}s;--rot:${Math.random() * 360}deg`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }
};

const RESULT_ICONS = {
  blackjack: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="M5 20V9l7-7 7 7v11"/><path d="M9 20v-6h6v6"/><circle cx="12" cy="6.5" r="0.5" fill="currentColor"/></svg>`,
  win: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 7 7 7 7"/><path d="M18 9h1.5a2.5 2.5 0 000-5C17 4 17 7 17 7"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></svg>`,
  lose: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
  push: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 8V4"/><path d="M8 4h8"/><path d="M12 12v4"/><path d="M10 14h4"/></svg>`,
};

const RESULT_SUBS = { blackjack: "Perfect hand!", win: "Well played!", lose: "Better luck next time", push: "It's a tie" };
const RESULT_FX = { blackjack: () => { triggerCelebration(true); setTimeout(() => triggerCelebration(true), 400); }, win: () => triggerCelebration(), lose: triggerDefeatEffect };

export const setMessage = (message, type) => {
  const container = $("game-notifications");
  if (!container) return;
  container.innerHTML = "";
  if (!message) return;

  const toast = document.createElement("div");
  toast.className = "notification-toast";

  if (type) {
    toast.classList.add("toast-result", `toast-result-${type}`);
    RESULT_FX[type]?.();

    const iconEl = Object.assign(document.createElement("div"), { className: "toast-result-icon", innerHTML: RESULT_ICONS[type] });
    const titleEl = document.createElement("div");
    titleEl.className = "toast-result-title";
    for (const [i, char] of message.split("").entries()) {
      const span = document.createElement("span");
      Object.assign(span, { textContent: char === " " ? "\u00A0" : char, className: "toast-char" });
      span.style.animationDelay = `${0.08 + i * 0.04}s`;
      titleEl.appendChild(span);
    }
    const subEl = Object.assign(document.createElement("div"), { className: "toast-result-sub", textContent: RESULT_SUBS[type] });
    toast.append(iconEl, titleEl, subEl);
    setTimeout(() => { toast.classList.add("toast-exit"); setTimeout(() => toast.remove(), 600); }, 3500);
  } else {
    toast.classList.add("toast-info");
    toast.textContent = message;
    setTimeout(() => { toast.classList.add("toast-exit"); setTimeout(() => toast.remove(), 400); }, 2500);
  }

  container.appendChild(toast);
};

export const renderControls = (phase) => {
  const isIdle = phase === "idle";
  const isPlayerTurn = phase === "playerTurn";
  const isRoundActive = isPlayerTurn || phase === "dealerTurn";
  const user = getLoggedInUser();
  const betSize = getBetSize();

  document.querySelector(".controls-bet").classList.toggle("hidden", !isIdle);
  document.querySelector(".controls-play").classList.toggle("hidden", !isPlayerTurn);
  document.querySelector(".controls-result").classList.toggle("hidden", phase !== "roundOver");

  $("start-round-btn").disabled = betSize <= 0;
  const effectiveBet = betSize > 0 ? betSize : getGameState().lastBet;
  $("play-again-btn").disabled = effectiveBet <= 0 || user.pot < effectiveBet;
  $("top-up-btn").disabled = isRoundActive;
  $("reset-bet-btn").disabled = isRoundActive;

  const doubleBtn = $("double-btn");
  if (doubleBtn) doubleBtn.disabled = !isPlayerTurn || getGameState().playerHand?.length !== 2 || user.pot < betSize;

  $("chip-container").classList.toggle("disabled", isRoundActive);
  betChipsEl.classList.toggle("disabled", isRoundActive);
  betChipsEl.classList.toggle("bet-chips-playing", isRoundActive);
  betChipsEl.classList.toggle("bet-chips-idle", !isRoundActive);
};

export const renderChips = () => {
  const container = $("chip-container");
  container.innerHTML = null;
  const pot = getLoggedInUser().pot;

  chips.forEach((value) => {
    const canAfford = value <= pot;
    const img = document.createElement("img");
    img.src = getChipImagePath(value);
    img.alt = value;
    img.classList.add("chips");
    if (!canAfford) { img.classList.add("disabled"); img.style.pointerEvents = "none"; }
    img.addEventListener("click", (e) => {
      flyChipToBet(e.target, value);
      const updated = increaseBet(value);
      renderChips();
      if (updated) renderUserInfo(updated);
    });
    container.appendChild(img);
  });
};

const flyChipToBet = (sourceEl, value) => {
  const { left: sx, top: sy, width: sw, height: sh } = sourceEl.getBoundingClientRect();
  const { left: tx, top: ty, width: tw, height: th } = betChipsEl.getBoundingClientRect();

  const clone = document.createElement("img");
  clone.src = getChipImagePath(value);
  clone.classList.add("chip-flying");
  clone.style.cssText = `position:fixed;left:${sx + sw / 2}px;top:${sy + sh / 2}px;width:4.375rem;height:4.375rem;pointer-events:none;z-index:200;transition:all 0.45s cubic-bezier(0.22,0.61,0.36,1);transform:translate(-50%,-50%)`;
  document.body.appendChild(clone);
  requestAnimationFrame(() => { clone.style.left = `${tx + tw / 2}px`; clone.style.top = `${ty + th / 2}px`; clone.style.opacity = "1"; });
  setTimeout(() => { clone.remove(); betChipHistory.push(value); renderBetChips(); }, 450);
};

export const renderBetChips = () => {
  betChipsEl.innerHTML = null;
  if (!betChipHistory.length) return;

  const groups = betChipHistory.reduce((acc, val) => { acc[val] = (acc[val] || 0) + 1; return acc; }, {});
  const sorted = Object.keys(groups).map(Number).sort((a, b) => a - b);
  const numGroups = sorted.length;

  sorted.forEach((value, g) => {
    const count = groups[value];
    const spreadX = numGroups > 1 ? (g / (numGroups - 1)) * 4.375 : 0;
    const baseX = spreadX + (Math.random() * 8 - 4) / 16;
    const baseY = (Math.random() * 8 - 4) / 16;

    for (let i = 0; i < count; i++) {
      const img = document.createElement("img");
      img.src = getChipImagePath(value);
      img.alt = value;
      img.classList.add("bet-chip");
      img.style.cssText = `left:${baseX + (Math.random() * 8 - 4) / 16}rem;top:${baseY + (Math.random() * 8 - 4) / 16}rem;rotate:${Math.random() * 24 - 12}deg;z-index:${i}`;
      img.addEventListener("click", () => {
        const idx = betChipHistory.indexOf(value);
        if (idx === -1) return;
        betChipHistory.splice(idx, 1);
        const updated = decreaseBet(value);
        renderBetChips();
        renderChips();
        if (updated) renderUserInfo(updated);
      });
      if (g === numGroups - 1 && i === count - 1) img.classList.add("chip-land");
      betChipsEl.appendChild(img);
    }
  });
};

const setBetChipsClass = (add, remove) => { betChipsEl.classList.remove(...remove); betChipsEl.classList.add(add); };
const BET_CHIP_STATES = {
  idle: ["bet-chips-idle", ["bet-chips-playing", "bet-chips-dealer", "bet-chips-player"]],
  dealer: ["bet-chips-dealer", ["bet-chips-playing", "bet-chips-idle"]],
  player: ["bet-chips-player", ["bet-chips-playing", "bet-chips-idle"]],
  playing: ["bet-chips-playing", ["bet-chips-dealer", "bet-chips-player", "bet-chips-idle"]],
};

export const clearBetChips = () => { betChipHistory = []; betChipsEl.innerHTML = null; setBetChipsClass(...BET_CHIP_STATES.idle); };

export const rebetChips = (amount) => {
  betChipHistory = [];
  const denominations = [1000, 500, 100, 50, 10];
  let remaining = amount;
  for (const d of denominations) {
    while (remaining >= d) {
      betChipHistory.push(d);
      remaining -= d;
    }
  }
  renderBetChips();
};
export const moveBetChipsToDealer = () => setBetChipsClass(...BET_CHIP_STATES.dealer);
export const moveBetChipsToPlayer = () => setBetChipsClass(...BET_CHIP_STATES.player);
export const moveBetChipsToPlaying = () => setBetChipsClass(...BET_CHIP_STATES.playing);

export const toggleZeroFundsGate = (show) => { const o = $("zero-funds-overlay"); o.classList.toggle("hidden", !show); o.setAttribute("aria-hidden", String(!show)); };
export const showZeroFundsGate = () => toggleZeroFundsGate(true);
export const hideZeroFundsGate = () => toggleZeroFundsGate(false);

function initParticles() {
  const canvas = $("particles-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  let { width: w, height: h } = canvas;

  const particles = Array.from({ length: 45 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    size: Math.random() * 2 + 0.5,
    speedX: (Math.random() - 0.5) * 0.3,
    speedY: -Math.random() * 0.4 - 0.1,
    opacity: Math.random() * 0.35 + 0.05,
    pulse: Math.random() * Math.PI * 2,
  }));

  const animate = () => {
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.pulse += 0.02;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 215, 0, ${Math.max(0, p.opacity + Math.sin(p.pulse) * 0.08)})`;
      ctx.fill();
      p.x += p.speedX;
      p.y += p.speedY;
      if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
    }
    requestAnimationFrame(animate);
  };

  animate();
  window.addEventListener("resize", () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; w = canvas.width; h = canvas.height; });
}

initParticles();
