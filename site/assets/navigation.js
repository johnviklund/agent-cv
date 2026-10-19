const NAVIGATION_BREAKPOINT = "(max-width: 900px)";

export function initializeResponsiveNavigation({
  document: documentRef = globalThis.document,
  matchMedia = globalThis.matchMedia?.bind(globalThis),
} = {}) {
  const desktop = documentRef?.querySelector?.(".desktop-nav");
  const mobile = documentRef?.querySelector?.(".mobile-nav");
  const media = matchMedia?.(NAVIGATION_BREAKPOINT);
  if (!desktop || !mobile || !media) return () => {};

  const sync = () => {
    setNavigationAvailability(desktop, !media.matches);
    setNavigationAvailability(mobile, media.matches);
    if (!media.matches) mobile.open = false;
  };

  sync();
  media.addEventListener?.("change", sync);
  return () => media.removeEventListener?.("change", sync);
}

function setNavigationAvailability(element, available) {
  element.hidden = !available;
  element.inert = !available;
  if (available) element.removeAttribute("aria-hidden");
  else element.setAttribute("aria-hidden", "true");
}

if (typeof document !== "undefined" && typeof globalThis.matchMedia === "function") {
  initializeResponsiveNavigation();
}
