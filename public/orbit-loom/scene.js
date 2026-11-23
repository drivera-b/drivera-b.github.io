function polar(cx, cy, radius, degrees) {
  const radians = degrees * Math.PI / 180;
  return `${cx + radius * Math.cos(radians)} ${cy + radius * Math.sin(radians)}`;
}

export function twinComets(separation) {
  const strokes = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i += 1) {
      const radius = 52 + i * 25;
      const angle = 38 + side * i * 18;
      const hue = side < 0 ? 163 + i * 13 : 18 + i * 10;
      const start = polar(side * separation, side * 52, radius, angle);
      const end = polar(side * separation, side * 52, radius, angle + side * 294);
      strokes.push({
        geometry: `M ${start} A ${radius} ${radius} 0 1 ${side > 0 ? 1 : 0} ${end}`,
        color: `hsl(${hue} 75% 66%)`, start: i * 4, duration: 30, width: 3,
      });
    }
  }
  for (let i = 0; i < 7; i += 1) {
    const shift = (i - 3) * 15;
    const reach = 175 + i * 13;
    strokes.push({
      geometry: `M ${-separation} ${shift - 52} C -100 ${reach} 100 ${-reach} ${separation} ${52 - shift}`,
      color: `hsl(${252 + i * 11} 76% 71%)`, start: 22 + i * 3, duration: 31, width: 4,
    });
  }
  return strokes;
}
