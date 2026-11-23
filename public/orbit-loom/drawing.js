import { twinComets } from "./scene.js";

const drawing = document.querySelector("#drawing");
const shape = document.querySelector("#shape");
const speed = document.querySelector("#speed");
const play = document.querySelector("#play");
const replay = document.querySelector("#replay");
const strokes = twinComets(150);
const endTick = Math.max(...strokes.map(({ start, duration }) => start + duration));
let time = 0;
let lastFrame = null;
let frameId = null;

const paths = strokes.map(({ color, start, duration, width }) => {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", width);
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("pathLength", 1);
  path.setAttribute("stroke-dasharray", "1 1");
  drawing.append(path);
  return { path, start, duration };
});

function updateShape() {
  const separation = 125 + Number(shape.value) / 2;
  const drawingStrokes = twinComets(separation);
  paths.forEach(({ path }, index) => path.setAttribute("d", drawingStrokes[index].geometry));
}

function paint() {
  for (const { path, start, duration } of paths) {
    const progress = Math.max(0, Math.min(1, (time - start) / duration));
    path.setAttribute("visibility", progress > 0 ? "visible" : "hidden");
    path.setAttribute("stroke-dashoffset", 1 - progress);
  }
}

function stop() {
  cancelAnimationFrame(frameId);
  frameId = null;
  lastFrame = null;
  play.textContent = "Play";
  play.disabled = time >= endTick;
}

function tick(now) {
  if (lastFrame !== null) time = Math.min(endTick, time + (now - lastFrame) * Number(speed.value) / 38);
  lastFrame = now;
  paint();
  if (time >= endTick) stop();
  else frameId = requestAnimationFrame(tick);
}

function start() {
  if (frameId !== null) return;
  play.disabled = false;
  play.textContent = "Pause";
  frameId = requestAnimationFrame(tick);
}

shape.addEventListener("input", updateShape);
play.addEventListener("click", () => frameId === null ? start() : stop());
replay.addEventListener("click", () => {
  time = 0;
  lastFrame = null;
  paint();
  start();
});

updateShape();
if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
  time = endTick;
  stop();
} else {
  start();
}
paint();
document.querySelector(".controls").hidden = false;
