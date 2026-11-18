// Poker and trading logic for the "Make a market" game on the home page.
// No DOM here, so the same file is imported by market.js and by test/poker.test.js.
//
// A card is an integer 0..51: rank = card >> 2 (0 is a two, 12 is an ace), suit = card & 3.

export const RANK_LABELS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
export const RANK_NAMES = ["Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Jack", "Queen", "King", "Ace"];
export const SUIT_NAMES = ["spades", "hearts", "diamonds", "clubs"];

// The trader model. One trader in three knows the fair value exactly.
// The rest believe fair value plus normal noise with this standard deviation, in points.
export const SHARP_CHANCE = 1 / 3;
export const TRADER_NOISE = 8;
// Half-width of the comparison quote shown at the end of a game.
export const BENCHMARK_HALF_WIDTH = 6;

export function card(rank, suit) {
  return rank * 4 + suit;
}

// The worked example in the home page walkthrough: ace-king of spades against two red queens.
// test/poker.test.js checks these numbers against the engine and against the words in content/site.json.
export const EXAMPLE = { a: [card(12, 0), card(11, 0)], b: [card(10, 1), card(10, 2)], fair: 46.2, bid: 40, ask: 52, belief: 58 };

// Lookup tables over 13-bit rank masks.
const MASKS = 1 << 13;
const STRAIGHT = new Int8Array(MASKS).fill(-1); // top rank of the best straight, or -1
const TOP = [1, 2, 3, 5].map(() => new Uint32Array(MASKS)); // highest 1, 2, 3, and 5 ranks, packed 4 bits each
for (let mask = 0; mask < MASKS; mask += 1) {
  for (let high = 12; high >= 4; high -= 1) {
    if (((mask >> (high - 4)) & 31) === 31) {
      STRAIGHT[mask] = high;
      break;
    }
  }
  // Ace to five: the ace plays low and the five is the top card.
  if (STRAIGHT[mask] < 0 && (mask & 0x100f) === 0x100f) STRAIGHT[mask] = 3;
  for (const [slot, size] of [1, 2, 3, 5].entries()) {
    let packed = 0;
    let taken = 0;
    for (let rank = 12; rank >= 0 && taken < size; rank -= 1) {
      if (mask & (1 << rank)) {
        packed = (packed << 4) | rank;
        taken += 1;
      }
    }
    TOP[slot][mask] = packed << (4 * (size - taken));
  }
}
const [TOP1, TOP2, TOP3, TOP5] = TOP;

const rankCount = new Uint8Array(13);
const suitCount = new Uint8Array(4);
const suitMask = new Uint16Array(4);

// Strength of the best five-card hand among the first `size` cards (5 to 7).
// A higher number is a better hand and equal numbers split the pot.
// Bits 20 and up hold the category (8 straight flush ... 0 high card); the low 20 bits break ties.
export function rankCards(cards, size = cards.length) {
  rankCount.fill(0);
  suitCount.fill(0);
  suitMask.fill(0);
  let ranks = 0;
  for (let i = 0; i < size; i += 1) {
    const rank = cards[i] >> 2;
    const suit = cards[i] & 3;
    rankCount[rank] += 1;
    suitCount[suit] += 1;
    suitMask[suit] |= 1 << rank;
    ranks |= 1 << rank;
  }

  // With seven cards or fewer, a flush rules out four of a kind and a full house.
  for (let suit = 0; suit < 4; suit += 1) {
    if (suitCount[suit] >= 5) {
      const straightFlush = STRAIGHT[suitMask[suit]];
      return straightFlush >= 0 ? (8 << 20) | straightFlush : (5 << 20) | TOP5[suitMask[suit]];
    }
  }

  let four = -1;
  let three = -1;
  let secondThree = -1;
  let pair = -1;
  let secondPair = -1;
  for (let rank = 12; rank >= 0; rank -= 1) {
    const count = rankCount[rank];
    if (count === 4) four = rank;
    else if (count === 3) {
      if (three < 0) three = rank;
      else if (secondThree < 0) secondThree = rank;
    } else if (count === 2) {
      if (pair < 0) pair = rank;
      else if (secondPair < 0) secondPair = rank;
    }
  }

  if (four >= 0) return (7 << 20) | (four << 4) | TOP1[ranks ^ (1 << four)];
  if (three >= 0 && (secondThree >= 0 || pair >= 0)) {
    return (6 << 20) | (three << 4) | Math.max(secondThree, pair);
  }
  const straight = STRAIGHT[ranks];
  if (straight >= 0) return (4 << 20) | straight;
  if (three >= 0) return (3 << 20) | (three << 8) | TOP2[ranks ^ (1 << three)];
  if (secondPair >= 0) {
    // A third pair, if there is one, can still supply the kicker.
    return (2 << 20) | (pair << 8) | (secondPair << 4) | TOP1[ranks ^ (1 << pair) ^ (1 << secondPair)];
  }
  if (pair >= 0) return (1 << 20) | (pair << 12) | TOP3[ranks ^ (1 << pair)];
  return TOP5[ranks];
}

// Seeded random numbers (mulberry32), so a game number always deals the same hands.
export function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function standardNormal(rng) {
  const u = 1 - rng(); // in (0, 1], so the logarithm is finite
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

// Two hole cards each, plus `boardSize` community cards (0, 3, or 4).
export function dealHand(rng, boardSize) {
  const deck = Array.from({ length: 52 }, (_, index) => index);
  const needed = 4 + boardSize;
  for (let i = 0; i < needed; i += 1) {
    const j = i + Math.floor(rng() * (52 - i));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return { a: deck.slice(0, 2), b: deck.slice(2, 4), board: deck.slice(4, needed) };
}

function unseenCards(a, b, board) {
  const seen = new Set([...a, ...b, ...board]);
  if (seen.size !== 4 + board.length) throw new Error("A card appears twice");
  const deck = [];
  for (let c = 0; c < 52; c += 1) if (!seen.has(c)) deck.push(c);
  return deck;
}

function choose(n, k) {
  let result = 1;
  for (let i = 1; i <= k; i += 1) result = (result * (n - k + i)) / i;
  return Math.round(result);
}

// Exact equity of hand A, in points out of 100, by finishing the board every possible way.
// Before the flop that is 1,712,304 boards, so the work is done in steps the page can spread out.
export function exactJob(a, b, board = []) {
  const deck = unseenCards(a, b, board);
  const missing = 5 - board.length;
  const first = 2 + board.length;
  const handA = Uint8Array.from([...a, ...board, 0, 0, 0, 0, 0].slice(0, 7));
  const handB = Uint8Array.from([...b, ...board, 0, 0, 0, 0, 0].slice(0, 7));
  const picks = Array.from({ length: missing }, (_, index) => index);
  const total = choose(deck.length, missing);
  let seen = 0;
  let doubled = 0; // two per win, one per tie
  let done = false;

  return {
    total,
    get done() { return done; },
    get seen() { return seen; },
    // Looks at up to `limit` more boards. Returns true once every board has been counted.
    step(limit = Infinity) {
      for (let count = 0; !done && count < limit; count += 1) {
        for (let j = 0; j < missing; j += 1) {
          handA[first + j] = deck[picks[j]];
          handB[first + j] = deck[picks[j]];
        }
        const strengthA = rankCards(handA, 7);
        const strengthB = rankCards(handB, 7);
        doubled += strengthA > strengthB ? 2 : strengthA === strengthB ? 1 : 0;
        seen += 1;
        // Move to the next combination of unseen cards.
        let i = missing - 1;
        while (i >= 0 && picks[i] === deck.length - missing + i) i -= 1;
        if (i < 0) {
          done = true;
        } else {
          picks[i] += 1;
          for (let j = i + 1; j < missing; j += 1) picks[j] = picks[j - 1] + 1;
        }
      }
      return done;
    },
    get value() { return (100 * doubled) / (2 * seen); },
  };
}

export function exactEquity(a, b, board = []) {
  const job = exactJob(a, b, board);
  job.step();
  return job.value;
}

// Monte Carlo estimate of the same number. `path` records the running estimate at
// log-spaced deal counts so the page can draw it converging.
export function simulate(a, b, board, rng, deals = 20000) {
  const deck = unseenCards(a, b, board);
  const missing = 5 - board.length;
  const first = 2 + board.length;
  const handA = Uint8Array.from([...a, ...board, 0, 0, 0, 0, 0].slice(0, 7));
  const handB = Uint8Array.from([...b, ...board, 0, 0, 0, 0, 0].slice(0, 7));
  const marks = new Set();
  for (let i = 0; i <= 140; i += 1) marks.add(Math.round(10 ** (1 + (i / 140) * (Math.log10(deals) - 1))));

  const path = [];
  let wins = 0;
  let ties = 0;
  for (let n = 1; n <= deals; n += 1) {
    for (let j = 0; j < missing; j += 1) {
      const k = j + Math.floor(rng() * (deck.length - j));
      const picked = deck[k];
      deck[k] = deck[j];
      deck[j] = picked;
      handA[first + j] = picked;
      handB[first + j] = picked;
    }
    const strengthA = rankCards(handA, 7);
    const strengthB = rankCards(handB, 7);
    if (strengthA > strengthB) wins += 1;
    else if (strengthA === strengthB) ties += 1;
    if (marks.has(n)) path.push([n, (100 * (wins + ties / 2)) / n]);
  }
  const mean = (wins + ties / 2) / deals;
  const variance = Math.max(0, (wins + ties / 4) / deals - mean * mean);
  return { deals, path, estimate: (100 * (wins + ties / 2)) / deals, standardError: 100 * Math.sqrt(variance / deals) };
}

// What this hand's trader believes the contract is worth.
export function makeTrader(rng, fair) {
  const sharp = rng() < SHARP_CHANCE;
  const noise = standardNormal(rng) * TRADER_NOISE;
  return { sharp, belief: sharp ? fair : Math.min(100, Math.max(0, fair + noise)) };
}

// The trader buys at the ask if they think the hand is worth more, sells at the bid
// if they think it is worth less, and otherwise leaves the quote alone.
// `side` and `pnl` are from the point of view of the person who quoted.
export function settle({ bid, ask, fair, belief }) {
  if (belief > ask) return { side: "sold", price: ask, pnl: ask - fair };
  if (belief < bid) return { side: "bought", price: bid, pnl: fair - bid };
  return { side: "none", price: null, pnl: 0 };
}

// What someone who knew fair value and quoted a fixed width around it would have made.
export function benchmark(fair, belief) {
  return settle({ bid: fair - BENCHMARK_HALF_WIDTH, ask: fair + BENCHMARK_HALF_WIDTH, fair, belief }).pnl;
}
