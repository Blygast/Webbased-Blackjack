const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const RANKS = [
  { rank: "ace", value: 11 },
  { rank: "2", value: 2 },
  { rank: "3", value: 3 },
  { rank: "4", value: 4 },
  { rank: "5", value: 5 },
  { rank: "6", value: 6 },
  { rank: "7", value: 7 },
  { rank: "8", value: 8 },
  { rank: "9", value: 9 },
  { rank: "10", value: 10 },
  { rank: "jack", value: 10 },
  { rank: "queen", value: 10 },
  { rank: "king", value: 10 },
];

export const createDeck = () =>
  SUITS.flatMap((suit) =>
    RANKS.map(({ rank, value }) => ({ suit, rank, value }))
  );

export const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const drawCard = (deck) => deck.pop();
