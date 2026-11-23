const replay = document.querySelector(".feature-replay");

if (replay && typeof Element.prototype.getAnimations === "function") {
  const strokes = document.querySelectorAll(".feature-art--orbit path");
  replay.hidden = false;
  replay.addEventListener("click", () => {
    for (const stroke of strokes) {
      for (const animation of stroke.getAnimations()) {
        animation.cancel();
        animation.play();
      }
    }
  });
}
