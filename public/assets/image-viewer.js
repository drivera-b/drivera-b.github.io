const viewer = document.querySelector(".image-viewer");

if (typeof viewer?.showModal === "function") {
  const figure = viewer.querySelector("figure");
  const caption = figure.querySelector("figcaption");
  const enlarged = new Image();
  figure.prepend(enlarged);

  document.addEventListener("click", event => {
    const link = event.target.closest?.("a.figure-link");
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const original = link.querySelector("img");
    if (!original) return;
    enlarged.alt = original.alt;
    enlarged.src = link.href;
    caption.textContent = link.closest("figure").querySelector("figcaption")?.textContent ?? "";
    caption.hidden = !caption.textContent;
    viewer.showModal();
    event.preventDefault();
  });

  viewer.addEventListener("click", event => {
    if (event.target === viewer) viewer.close();
  });
}
