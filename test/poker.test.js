// Checks for the poker and trading logic behind the "Make a market" game.
// Run with: npm test   (or: node --test test/)
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  SHARP_CHANCE, TRADER_NOISE,
  benchmark, card, dealHand, exactEquity, exactJob, makeRng, makeTrader, rankCards, settle, simulate,
} from "../public/assets/poker.js";

const parse = text => text.trim().split(/\s+/).map(name => card("23456789TJQKA".indexOf(name[0]), "shdc".indexOf(name[1])));

// A second, deliberately plain five-card ranker written without the lookup tables,
// so the fast evaluator can be checked against something independent.
function plainFive(cards) {
  const ranks = cards.map(c => c >> 2).sort((x, y) => y - x);
  const flush = cards.every(c => (c & 3) === (cards[0] & 3));
  const distinct = [...new Set(ranks)];
  let straightTop = -1;
  if (distinct.length === 5) {
    if (ranks[0] - ranks[4] === 4) straightTop = ranks[0];
    else if (ranks.join() === "12,3,2,1,0") straightTop = 3;
  }
  const groups = distinct
    .map(rank => ({ rank, count: ranks.filter(r => r === rank).length }))
    .sort((x, y) => y.count - x.count || y.rank - x.rank);
  const shape = groups.map(group => group.count).join("");
  let category;
  if (straightTop >= 0 && flush) category = 8;
  else if (shape === "41") category = 7;
  else if (shape === "32") category = 6;
  else if (flush) category = 5;
  else if (straightTop >= 0) category = 4;
  else if (shape === "311") category = 3;
  else if (shape === "221") category = 2;
  else if (shape === "2111") category = 1;
  else category = 0;
  const order = straightTop >= 0 ? [straightTop] : groups.map(group => group.rank);
  return [category, ...order];
}

function compareLists(x, y) {
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    if ((x[i] ?? -1) !== (y[i] ?? -1)) return Math.sign((x[i] ?? -1) - (y[i] ?? -1));
  }
  return 0;
}

function plainBest(cards) {
  let best = null;
  for (let i = 0; i < cards.length; i += 1) {
    for (let j = i + 1; j < cards.length; j += 1) {
      const five = plainFive(cards.filter((_, index) => index !== i && index !== j));
      if (!best || compareLists(five, best) > 0) best = five;
    }
  }
  return best;
}

test("every five-card hand lands in the right category", () => {
  const counts = new Array(9).fill(0);
  const hand = new Uint8Array(5);
  for (let a = 0; a < 52; a += 1) for (let b = a + 1; b < 52; b += 1) for (let c = b + 1; c < 52; c += 1) {
    for (let d = c + 1; d < 52; d += 1) for (let e = d + 1; e < 52; e += 1) {
      hand[0] = a; hand[1] = b; hand[2] = c; hand[3] = d; hand[4] = e;
      counts[rankCards(hand, 5) >> 20] += 1;
    }
  }
  // High card, pair, two pair, three of a kind, straight, flush, full house, four of a kind, straight flush.
  assert.deepEqual(counts, [1302540, 1098240, 123552, 54912, 10200, 5108, 3744, 624, 40]);
});

test("seven-card strength agrees with the plain best-five ranker", () => {
  const rng = makeRng(2025);
  const draw = () => {
    const deck = Array.from({ length: 52 }, (_, index) => index);
    for (let i = 0; i < 7; i += 1) {
      const j = i + Math.floor(rng() * (52 - i));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck.slice(0, 7);
  };
  for (let trial = 0; trial < 60000; trial += 1) {
    const x = draw();
    const y = draw();
    const fast = Math.sign(rankCards(x, 7) - rankCards(y, 7));
    const plain = compareLists(plainBest(x), plainBest(y));
    assert.equal(fast, plain, `hands ${x} and ${y}`);
  }
});

test("named hands rank the way the rules say", () => {
  const strength = text => rankCards(parse(text));
  assert.ok(strength("As Ks Qs Js Ts 2h 3d") > strength("9h 9d 9c 9s Ah Kd 2c"), "royal flush beats four of a kind");
  assert.ok(strength("5h 4d 3c 2s Ah Kd Qc") > strength("Ah Ad Kc Qs Jh 9d 7c"), "a wheel is a straight");
  assert.ok(strength("6h 5d 4c 3s 2h Kd Qc") > strength("5h 4d 3c 2s Ah Kd Qc"), "six-high straight beats the wheel");
  assert.equal(strength("Ah Kd 7c 7s 4h 3d 2c"), strength("As Kc 7h 7d 4s 3c 2h"), "same pair and kickers tie");
  assert.ok(strength("Ah Ad 7c 7s Kh 3d 2c") > strength("Ah Ad 7c 7s Qh 3d 2c"), "two pair is decided by the kicker");
  assert.ok(strength("Kh Kd 7c 7s 3h 3d Ac") > strength("Kh Kd 7c 7s 3h 3d Qc"), "with three pairs the kicker can outrank the third pair");
  assert.equal(strength("Qh Qd Qc 8s 8h 8d 2c") >> 20, 6, "two sets of three make a full house");
});

test("exact equity counts every board and splits ties", () => {
  const job = exactJob(parse("As Ks"), parse("Qh Qd"));
  assert.equal(job.total, 1712304);
  while (!job.step(50000));
  assert.equal(job.seen, 1712304);
  const mirror = exactEquity(parse("Qh Qd"), parse("As Ks"));
  assert.ok(Math.abs(job.value + mirror - 100) < 1e-9, "the two hands share the whole pot");
  assert.equal(job.value.toFixed(1), "46.2");

  // Swapping the suits turns each hand into the other, so the pot must split evenly on average.
  const split = exactEquity(parse("Ah Kd"), parse("As Kc"));
  assert.ok(Math.abs(split - 50) < 1e-9, `mirrored hands are worth exactly half, got ${split}`);

  assert.equal(exactJob(parse("As Ks"), parse("Qh Qd"), parse("2c 7d 9h")).total, 990);
  assert.equal(exactJob(parse("As Ks"), parse("Qh Qd"), parse("2c 7d 9h Js")).total, 44);
});

test("counting outs by hand matches on the turn", () => {
  // Hand B has three queens, so hand A needs a spade for the flush. Nine spades are unseen
  // among the 44 river cards, but the queen gives B four of a kind and the nine pairs the
  // board for a full house. That leaves seven winning cards and no ties.
  const value = exactEquity(parse("As Ks"), parse("Qh Qd"), parse("Qc 7s 2s 9d"));
  assert.ok(Math.abs(value - (100 * 7) / 44) < 1e-9, `seven clean outs of 44, got ${value}`);
});

test("simulation lands within its own error bars of the exact value", () => {
  for (const [a, b, board] of [["As Ks", "Qh Qd", ""], ["7h 2c", "Jd Js", "7s 7d Kc"], ["9c 8c", "Ah Ad", "Tc 2c 5h Kd"]]) {
    const exact = exactEquity(parse(a), parse(b), board ? parse(board) : []);
    const run = simulate(parse(a), parse(b), board ? parse(board) : [], makeRng(7), 20000);
    assert.ok(Math.abs(run.estimate - exact) < 4 * run.standardError + 1e-9, `${a} v ${b}: ${run.estimate} vs ${exact}`);
    assert.equal(run.path.at(-1)[0], 20000);
    assert.equal(run.path.at(-1)[1], run.estimate);
  }
});

test("the same seed deals the same game", () => {
  assert.deepEqual(dealHand(makeRng(41), 3), dealHand(makeRng(41), 3));
  const hand = dealHand(makeRng(41), 4);
  assert.equal(new Set([...hand.a, ...hand.b, ...hand.board]).size, 8);
});

test("the trader only takes a quote that looks wrong to them", () => {
  assert.deepEqual(settle({ bid: 44, ask: 52, fair: 46, belief: 55 }), { side: "sold", price: 52, pnl: 6 });
  assert.deepEqual(settle({ bid: 44, ask: 52, fair: 46, belief: 40 }), { side: "bought", price: 44, pnl: 2 });
  assert.deepEqual(settle({ bid: 44, ask: 52, fair: 46, belief: 46 }), { side: "none", price: null, pnl: 0 });
  // A sharp trader only trades when fair value is outside the quote, so the quoter always loses.
  assert.equal(settle({ bid: 50, ask: 56, fair: 46, belief: 46 }).pnl, -4);
  assert.equal(benchmark(46, 46), 0);
  assert.equal(benchmark(46, 60), 6);
  assert.equal(benchmark(46, 41), 0);
});

test("about one trader in three is sharp and the rest are noisy around fair value", () => {
  const rng = makeRng(99);
  let sharp = 0;
  let sum = 0;
  let squares = 0;
  const trials = 60000;
  for (let i = 0; i < trials; i += 1) {
    const trader = makeTrader(rng, 50);
    if (trader.sharp) {
      sharp += 1;
      assert.equal(trader.belief, 50);
    } else {
      sum += trader.belief - 50;
      squares += (trader.belief - 50) ** 2;
    }
  }
  const noisy = trials - sharp;
  assert.ok(Math.abs(sharp / trials - 1 / 3) < 0.01);
  assert.ok(Math.abs(sum / noisy) < 0.15, "noise is centered on fair value");
  assert.ok(Math.abs(Math.sqrt(squares / noisy) - 8) < 0.15, "noise has a standard deviation of 8 points");
});

test("the rules on the page describe the trader the code implements", async () => {
  const site = JSON.parse(await readFile(new URL("../content/site.json", import.meta.url), "utf8"));
  const rules = site.market.rules.join(" ");
  assert.ok(site.market.formula.expression.includes(`N(0, ${TRADER_NOISE}²)`), "noise in the formula");
  assert.ok(SHARP_CHANCE === 1 / 3 && rules.includes("One trader in three is sharp"), "share of sharp traders");
  assert.ok(rules.includes("Ace-king of spades against two red queens before the flop is worth 46.2"), "worked example");
});
