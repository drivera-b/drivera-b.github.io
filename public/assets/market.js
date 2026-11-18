// The "Make a market" game on the home page.
// The rules text is in content/site.json. The poker and trading logic is in poker.js.
import {
  BENCHMARK_HALF_WIDTH, RANK_LABELS, RANK_NAMES, SUIT_NAMES,
  benchmark, dealHand, exactJob, makeRng, makeTrader, settle, simulate,
} from "./poker.js";

const section = document.querySelector("#market");
const table = document.querySelector("#market-table");

// Community cards showing in each hand of a game: two before the flop, two on the flop, one on the turn.
const BOARD_SIZES = [0, 0, 3, 3, 4];
const STREETS = { 0: "before the flop", 3: "on the flop", 4: "on the turn" };
const DEALS = 20000;
const SUIT_SHAPES = [
  '<path d="M8 1.2C8 1.2 1.6 6 1.6 9.6c0 2 1.5 3.3 3.2 3.3 1.1 0 2-.5 2.6-1.3-.1 1.4-.7 2.5-1.6 3.3h4.4c-.9-.8-1.5-1.9-1.6-3.3.6.8 1.5 1.3 2.6 1.3 1.7 0 3.2-1.3 3.2-3.3C14.4 6 8 1.2 8 1.2z"/>',
  '<path d="M8 14.6S1.5 10.1 1.5 5.7c0-2.3 1.8-3.8 3.7-3.8 1.2 0 2.2.6 2.8 1.6.6-1 1.6-1.6 2.8-1.6 1.9 0 3.7 1.5 3.7 3.8 0 4.4-6.5 8.9-6.5 8.9z"/>',
  '<path d="M8 1l5.4 7L8 15 2.6 8z"/>',
  '<circle cx="8" cy="4.5" r="3"/><circle cx="4.5" cy="9.3" r="3"/><circle cx="11.5" cy="9.3" r="3"/><path d="M7.3 8.5c0 3-.6 5.2-1.5 6.4h4.4c-.9-1.2-1.5-3.4-1.5-6.4z"/>',
];

const round1 = value => Math.round(value * 10) / 10;
const fmt = value => round1(value).toFixed(1);
const signed = value => {
  const rounded = round1(value);
  return `${rounded > 0 ? "+" : rounded < 0 ? "\u2212" : ""}${Math.abs(rounded).toFixed(1)}`;
};
const points = value => `${fmt(value)} ${round1(value) === 1 ? "point" : "points"}`;

function el(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (name === "class") node.className = value;
    else if (value === true) node.setAttribute(name, "");
    else if (value !== false && value != null) node.setAttribute(name, value);
  }
  node.append(...children.filter(child => child != null && child !== false));
  return node;
}

function cardNode(card) {
  const rank = card >> 2;
  const suit = card & 3;
  const node = el("span", {
    class: `card${suit === 1 || suit === 2 ? " card-red" : ""}`,
    role: "img",
    "aria-label": `${RANK_NAMES[rank]} of ${SUIT_NAMES[suit]}`,
  });
  node.innerHTML = `<span class="card-rank" aria-hidden="true">${RANK_LABELS[rank]}</span>`
    + `<svg class="card-suit" viewBox="0 0 16 16" aria-hidden="true">${SUIT_SHAPES[suit]}</svg>`;
  return node;
}

function cardGroup(label, cards, empty = 0) {
  const row = el("span", { class: "cards" }, ...cards.map(cardNode));
  for (let i = 0; i < empty; i += 1) row.append(el("span", { class: "card card-empty", "aria-hidden": "true" }));
  return el("div", { class: "mt-group" }, el("span", { class: "mt-label" }, label), row);
}

// One announcement area that stays in the page, so screen readers hear each result.
const live = el("p", { class: "visually-hidden", role: "status" });
const stage = el("div", { class: "mt-stage" });

let game = null;
let plot = null; // the convergence figure currently on screen

function seedFromUrl() {
  const seed = Number(new URL(window.location.href).searchParams.get("game"));
  return Number.isInteger(seed) && seed >= 1 && seed <= 99999 ? seed : null;
}

function newGame(seed, focus = false) {
  game = { seed, results: [], index: 0, hand: null };
  showHand(focus);
}

// Fair value is exact: every way the board can finish is counted, in short slices
// so typing stays responsive. Rounded to a tenth so the arithmetic on screen adds up.
function price(hand) {
  hand.pricing ??= new Promise(resolve => {
    const slice = () => {
      const started = performance.now();
      while (!hand.job.done && performance.now() - started < 10) hand.job.step(4000);
      if (hand.job.done) resolve(round1(hand.job.value));
      else setTimeout(slice, 0);
    };
    slice();
  });
  return hand.pricing;
}

function total() {
  return game.results.reduce((sum, result) => sum + result.pnl, 0);
}

function topLine(...parts) {
  return el("p", { class: "mt-top" }, ...parts.map(part => el("span", {}, part)));
}

function showHand(focus) {
  const index = game.index;
  const deal = dealHand(makeRng(game.seed * 1000 + index * 10 + 1), BOARD_SIZES[index]);
  const hand = { index, deal, job: exactJob(deal.a, deal.b, deal.board), pricing: null, locked: false };
  game.hand = hand;
  plot = null;

  const bid = el("input", { id: "mt-bid", name: "bid", type: "text", inputmode: "decimal", autocomplete: "off", "aria-describedby": "mt-hint" });
  const ask = el("input", { id: "mt-ask", name: "ask", type: "text", inputmode: "decimal", autocomplete: "off", "aria-describedby": "mt-hint" });
  const quote = el("button", { type: "submit", class: "mt-button" }, "Quote");
  const error = el("p", { class: "mt-error", role: "alert", hidden: true });
  const prompt = el("p", { class: "mt-prompt" }, "What is hand A worth, out of 100?");
  const hint = el("p", { class: "mt-hint", id: "mt-hint" }, "The trader can sell to you at your bid or buy from you at your ask.");
  const form = el("form", { class: "mt-form", novalidate: true },
    prompt,
    el("div", { class: "mt-fields" },
      el("label", { class: "mt-field", for: "mt-bid" }, "Bid", bid),
      el("label", { class: "mt-field", for: "mt-ask" }, "Ask", ask),
      quote),
    hint,
    error);
  const result = el("div", { class: "mt-result", hidden: true });
  const boardLabel = deal.board.length
    ? `Board: ${deal.board.length} cards showing, ${5 - deal.board.length} to come`
    : "Board: no cards yet, five to come";

  stage.replaceChildren(
    topLine(`Hand ${index + 1} of ${BOARD_SIZES.length}`, `P&L ${signed(total())}`),
    el("div", { class: "mt-hands" },
      cardGroup("Hand A", deal.a),
      el("span", { class: "mt-vs", "aria-hidden": "true" }, "vs"),
      cardGroup("Hand B", deal.b)),
    el("div", { class: "mt-board", role: "group", "aria-label": boardLabel }, cardGroup(`Board, ${STREETS[deal.board.length]}`, deal.board, 5 - deal.board.length)),
    form,
    result,
  );

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (hand.locked) return;
    const read = input => (input.value.trim() === "" ? NaN : Number(input.value.trim().replace(",", ".")));
    const values = { bid: round1(read(bid)), ask: round1(read(ask)) };
    const inRange = value => Number.isFinite(value) && value >= 0 && value <= 100;
    let message = "";
    let culprit = null;
    if (!inRange(values.bid)) [message, culprit] = ["Enter a bid between 0 and 100.", bid];
    else if (!inRange(values.ask)) [message, culprit] = ["Enter an ask between 0 and 100.", ask];
    else if (values.bid >= values.ask) [message, culprit] = ["Your bid has to be below your ask.", bid];
    error.textContent = message;
    error.hidden = !message;
    if (message) {
      culprit.focus();
      return;
    }

    hand.locked = true;
    bid.value = fmt(values.bid);
    ask.value = fmt(values.ask);
    bid.readOnly = true;
    ask.readOnly = true;
    quote.disabled = true;
    quote.textContent = "Pricing\u2026";
    const fair = await price(hand);
    if (game.hand !== hand) return;
    quote.hidden = true;
    hint.hidden = true;
    prompt.textContent = "Your market for hand A";
    reveal(hand, values, fair, result);
  });

  // Once someone is playing, price the next hand while they think.
  if (index > 0) price(hand);
  if (focus) bid.focus();
}

function reveal(hand, quote, fair, result) {
  const { deal, index } = hand;
  const trader = makeTrader(makeRng(game.seed * 1000 + index * 10 + 2), fair);
  const belief = round1(trader.belief);
  const outcome = settle({ ...quote, fair, belief });
  const pnl = round1(outcome.pnl);
  const run = simulate(deal.a, deal.b, deal.board, makeRng(game.seed * 1000 + index * 10 + 3), DEALS);
  game.results.push({ ...quote, fair, belief, sharp: trader.sharp, side: outcome.side, price: outcome.price, pnl });

  const earned = pnl > 0 ? `made ${points(pnl)}` : pnl < 0 ? `lost ${points(-pnl)}` : "broke even";
  const headline = outcome.side === "none"
    ? `No trade. Fair value is ${fmt(fair)}.`
    : `You ${outcome.side} at ${fmt(outcome.price)}. Fair value is ${fmt(fair)}, so you ${earned}.`;
  const about = trader.sharp
    ? `This trader was sharp and knew fair value${outcome.side === "none" ? ". It sat inside your market, so there was nothing to take." : "."}`
    : `This trader was guessing and thought hand A was worth ${fmt(belief)}${outcome.side === "none" ? ", which is inside your market." : "."}`;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `Running estimate from ${DEALS.toLocaleString("en-US")} simulated deals. It ends at ${fmt(run.estimate)}. The exact value is ${fmt(fair)}.`);
  const last = index === BOARD_SIZES.length - 1;
  const next = el("button", { type: "button", class: "mt-button" }, last ? "See how you did" : "Next hand");
  next.addEventListener("click", () => {
    if (last) return showSummary();
    game.index += 1;
    showHand(true);
  });

  result.replaceChildren(
    el("p", { class: "mt-headline" }, headline),
    el("p", { class: "mt-trader" }, about),
    el("figure", { class: "mt-plot" }, svg,
      el("figcaption", {}, `The solid line is a running estimate over ${DEALS.toLocaleString("en-US")} simulated deals, ending at ${fmt(run.estimate)}. The dashed line is the exact value from all ${hand.job.total.toLocaleString("en-US")} ways the board can finish.`)),
    next,
  );
  result.hidden = false;
  stage.querySelector(".mt-top span:last-child").textContent = `P&L ${signed(total())}`;
  live.textContent = `${headline} ${about}`;
  next.focus({ preventScroll: true });

  plot = { svg, model: { ...quote, fair, path: run.path, deals: DEALS }, progress: 0 };
  animate(plot);
}

function animate(target) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    target.progress = 1;
    drawPlot(target);
    return;
  }
  const started = performance.now();
  const frame = now => {
    if (plot !== target) return;
    target.progress = Math.min(1, (now - started) / 900);
    drawPlot(target);
    if (target.progress < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// Running Monte Carlo estimate against the exact value, with the quoted market shaded.
function drawPlot({ svg, model, progress }) {
  const box = svg.getBoundingClientRect();
  const width = Math.max(240, Math.round(box.width));
  const height = Math.max(140, Math.round(box.height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const left = 30;
  const right = 68;
  const top = 8;
  const bottom = 22;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const { fair, bid, ask, path, deals } = model;

  // Keep fair value in the middle and widen the view until the quote fits, up to a point.
  const half = Math.min(25, Math.max(8, Math.abs(bid - fair) + 3, Math.abs(ask - fair) + 3));
  let low = fair - half;
  let high = fair + half;
  if (low < 0) [low, high] = [0, high - low];
  if (high > 100) [low, high] = [low - (high - 100), 100];
  const x = n => left + ((Math.log10(n) - 1) / (Math.log10(deals) - 1)) * plotWidth;
  const y = value => top + ((high - value) / (high - low)) * plotHeight;
  const inView = value => value >= low && value <= high;
  const px = value => value.toFixed(1);

  const parts = [`<defs><clipPath id="mt-clip"><rect x="${left}" y="${top}" width="${plotWidth}" height="${plotHeight}"/></clipPath></defs>`];
  const step = [2, 5, 10].find(size => (high - low) / size <= 6) ?? 10;
  for (let tick = Math.ceil(low / step) * step; tick <= high; tick += step) {
    parts.push(`<line class="mp-grid" x1="${left}" x2="${left + plotWidth}" y1="${px(y(tick))}" y2="${px(y(tick))}"/>`);
    parts.push(`<text x="${left - 6}" y="${px(y(tick) + 3.5)}" text-anchor="end">${tick}</text>`);
  }
  for (const [n, label] of [[10, "10"], [100, "100"], [1000, "1,000"], [10000, "10,000 deals"]]) {
    if (n > deals) continue;
    parts.push(`<line class="mp-grid" x1="${px(x(n))}" x2="${px(x(n))}" y1="${top + plotHeight}" y2="${top + plotHeight + 4}"/>`);
    // The last label starts under its tick so the word "deals" runs into the right margin.
    const anchor = n === 10000 ? `x="${px(x(n) - 19)}"` : `x="${px(x(n))}" text-anchor="${n === 10 ? "start" : "middle"}"`;
    parts.push(`<text ${anchor} y="${height - 5}">${label}</text>`);
  }

  const bandTop = y(Math.min(ask, high));
  const bandBottom = y(Math.max(bid, low));
  if (bandBottom > bandTop) {
    parts.push(`<rect class="mp-band" x="${left}" y="${px(bandTop)}" width="${plotWidth}" height="${px(bandBottom - bandTop)}"/>`);
  }
  const labels = [];
  for (const [value, name, kind] of [[ask, "ask", "quote"], [fair, "exact", "fair"], [bid, "bid", "quote"]]) {
    if (!inView(value)) continue;
    parts.push(`<line class="mp-${kind}" x1="${left}" x2="${left + plotWidth}" y1="${px(y(value))}" y2="${px(y(value))}"/>`);
    labels.push({ at: y(value) + 3.5, text: `${name} ${fmt(value)}`, kind });
  }
  // Nudge the labels apart when the quote is tight around fair value.
  labels.sort((a, b) => a.at - b.at);
  for (let i = 1; i < labels.length; i += 1) labels[i].at = Math.max(labels[i].at, labels[i - 1].at + 12);
  const overflow = labels.length ? labels.at(-1).at - (top + plotHeight + 3) : 0;
  if (overflow > 0) {
    labels.at(-1).at -= overflow;
    for (let i = labels.length - 2; i >= 0; i -= 1) labels[i].at = Math.min(labels[i].at, labels[i + 1].at - 12);
  }
  for (const label of labels) {
    parts.push(`<text class="mp-${label.kind}-label" x="${left + plotWidth + 6}" y="${px(label.at)}">${label.text}</text>`);
  }

  const shown = path.slice(0, Math.max(1, Math.ceil(progress * path.length)));
  const line = shown.map(([n, value]) => `${px(x(n))},${px(y(value))}`).join(" ");
  parts.push(`<polyline class="mp-run" clip-path="url(#mt-clip)" points="${line}"/>`);
  const [endN, endValue] = shown.at(-1);
  if (inView(endValue)) parts.push(`<circle class="mp-dot" cx="${px(x(endN))}" cy="${px(y(endValue))}" r="2.5"/>`);
  svg.innerHTML = parts.join("");
}

function showSummary() {
  const results = game.results;
  const sum = round1(total());
  const miss = results.reduce((all, r) => all + Math.abs((r.bid + r.ask) / 2 - r.fair), 0) / results.length;
  const reference = results.reduce((all, r) => all + benchmark(r.fair, r.belief), 0);
  const verdict = sum > 0 ? `You finished up ${points(sum)}.` : sum < 0 ? `You finished down ${points(-sum)}.` : "You finished flat.";
  const trade = r => (r.side === "none" ? "None" : `${r.side === "sold" ? "Sold" : "Bought"} ${fmt(r.price)}`);
  const cell = (tag, text, attributes = {}) => el(tag, attributes, text);

  const again = el("button", { type: "button", class: "mt-button" }, "Play again");
  again.addEventListener("click", () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("game");
    window.history.replaceState(null, "", url);
    newGame(1 + Math.floor(Math.random() * 99999), true);
  });
  plot = null;
  game.hand = null;

  stage.replaceChildren(
    topLine(`Game ${game.seed}`, `${results.length} hands`),
    el("p", { class: "mt-total" }, verdict),
    el("table", { class: "mt-scores", "aria-label": "Results by hand" },
      el("thead", {}, el("tr", {},
        cell("th", "#", { scope: "col", "aria-label": "Hand" }),
        ...["Market", "Fair", "Trade", "P&L"].map(name => cell("th", name, { scope: "col" })))),
      el("tbody", {}, ...results.map((r, i) => el("tr", {},
        cell("th", String(i + 1), { scope: "row" }),
        cell("td", `${fmt(r.bid)}\u2013${fmt(r.ask)}`),
        cell("td", fmt(r.fair)),
        cell("td", `${trade(r)}${r.sharp ? "*" : ""}`),
        cell("td", signed(r.pnl)))))),
    el("p", { class: "mt-note" }, `* a sharp trader. The middle of your market missed fair value by ${points(miss)} on average. `
      + `Someone who knew every fair value and quoted ${BENCHMARK_HALF_WIDTH} points either side would have made ${signed(reference)} against the same traders.`),
    el("p", { class: "mt-actions" }, again, el("a", { href: `?game=${game.seed}#market` }, "Link to this game")),
  );
  live.textContent = verdict;
  again.focus({ preventScroll: true });
}

if (section && table) {
  table.replaceChildren(live, stage);
  // Fair value for the first hand is only worked out if someone starts to play.
  for (const type of ["focusin", "pointerdown"]) {
    table.addEventListener(type, () => { if (game?.hand) price(game.hand); });
  }
  new ResizeObserver(() => { if (plot?.svg.isConnected) drawPlot(plot); }).observe(table);
  newGame(seedFromUrl() ?? 1 + Math.floor(Math.random() * 99999));
  table.hidden = false;
  section.classList.add("market-live");
}
