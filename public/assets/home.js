const projectIndex = document.querySelector(".project-index");
const previews = projectIndex.querySelector(".project-previews");
const defaultPreview = previews.querySelector("[data-current-preview]");
let currentPreview = defaultPreview;

function showPreview(preview) {
  if (!preview || preview === currentPreview) return;
  if (currentPreview) currentPreview.hidden = true;
  preview.hidden = false;
  currentPreview = preview;
}

function previewFor(element) {
  const row = element?.closest(".home-projects .index-row");
  return row ? document.getElementById(row.id.replace(/^project-/, "preview-")) : null;
}

projectIndex.addEventListener("pointerover", event => {
  if (event.pointerType === "mouse") showPreview(previewFor(event.target));
});
projectIndex.addEventListener("pointerleave", () => {
  showPreview(previewFor(document.activeElement) ?? defaultPreview);
});
projectIndex.addEventListener("focusin", event => showPreview(previewFor(event.target)));
projectIndex.addEventListener("focusout", event => {
  if (!projectIndex.contains(event.relatedTarget)) showPreview(defaultPreview);
});
