// Twin Comets uses SVG arcs and cubic Bézier curves for the original drawing.
const drawing = document.querySelector("#drawing");
const shape = document.querySelector("#shape");
const speed = document.querySelector("#speed");
const play = document.querySelector("#play");
const replay = document.querySelector("#replay");
const endTick = 71;
const paths = [];
let time = 0;
let lastFrame = null;
let frameId = null;

function addPath(geometry, color, start, duration, width) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", width);
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("pathLength", 1);
  path.setAttribute("stroke-dasharray", "1 1");
  drawing.append(path);
  paths.push({ path, geometry, start, duration });
}

function polar(cx, cy, radius, degrees) {
  const radians = degrees * Math.PI / 180;
  return `${cx + radius * Math.cos(radians)} ${cy + radius * Math.sin(radians)}`;
}

for (const side of [-1, 1]) {
  for (let i = 0; i < 5; i += 1) {
    const radius = 52 + 25 * i;
    const startAngle = 38 + side * i * 18;
    const endAngle = startAngle + side * 294;
    const hue = side < 0 ? 163 + 13 * i : 18 + 10 * i;
    addPath(separation => {
      const start = polar(side * separation, side * 52, radius, startAngle);
      const end = polar(side * separation, side * 52, radius, endAngle);
      return `M ${start} A ${radius} ${radius} 0 1 ${side > 0 ? 1 : 0} ${end}`;
    }, `hsl(${hue} 75% 66%)`, i * 4, 30, 3);
  }
}

for (let i = 0; i < 7; i += 1) {
  const shift = (i - 3) * 15;
  const reach = 175 + 13 * i;
  addPath(separation => `M ${-separation} ${shift - 52} C -100 ${reach} 100 ${-reach} ${separation} ${52 - shift}`,
    `hsl(${252 + 11 * i} 76% 71%)`, 22 + i * 3, 31, 4);
}

function updateShape() {
  const separation = 125 + Number(shape.value) / 2;
  for (const { path, geometry } of paths) path.setAttribute("d", geometry(separation));
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
