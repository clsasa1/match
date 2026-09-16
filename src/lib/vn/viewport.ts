/** Keep the shell inside iOS Safari's visual viewport (address bar, home indicator). */
export function bindVisualViewport(root: HTMLElement) {
  const apply = () => {
    const vv = window.visualViewport;
    const top = vv?.offsetTop ?? 0;
    const height = vv?.height ?? window.innerHeight;
    root.style.top = `${top}px`;
    root.style.height = `${height}px`;
    document.documentElement.style.setProperty("--app-height", `${height}px`);
  };

  apply();
  const vv = window.visualViewport;
  vv?.addEventListener("resize", apply);
  vv?.addEventListener("scroll", apply);
  window.addEventListener("orientationchange", apply);
  window.addEventListener("resize", apply);

  const blockPinch = (e: Event) => e.preventDefault();
  document.addEventListener("gesturestart", blockPinch);
  document.addEventListener("gesturechange", blockPinch);

  return () => {
    vv?.removeEventListener("resize", apply);
    vv?.removeEventListener("scroll", apply);
    window.removeEventListener("orientationchange", apply);
    window.removeEventListener("resize", apply);
    document.removeEventListener("gesturestart", blockPinch);
    document.removeEventListener("gesturechange", blockPinch);
  };
}
