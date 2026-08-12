const basePath = import.meta.env.BASE_URL;
const relativePath = window.location.pathname
  .slice(basePath.length)
  .replace(/^\/+|\/+$/gu, "");
const isLab = relativePath === "lab" || relativePath.startsWith("lab/");

if (isLab) {
  const lab = document.getElementById("app");
  if (lab !== null) lab.hidden = false;
  document.title = "Shape Lab · Order in Space";
  void import("./main.js");
} else {
  const story = document.getElementById("story-app");
  if (story !== null) story.hidden = false;
  void import("./story.js").then(() => {
    const anchor = window.location.hash.slice(1);
    if (anchor.length === 0) return;
    const target = document.getElementById(anchor);
    requestAnimationFrame(() => {
      const previousBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      target?.scrollIntoView({ block: "start" });
      document.documentElement.style.scrollBehavior = previousBehavior;
    });
  });
}
