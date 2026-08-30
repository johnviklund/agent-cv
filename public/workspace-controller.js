const WORKSPACE_MODES = new Set(["home", "compare"]);

export function createWorkspaceController({
  getHash = () => globalThis.location?.hash || "",
  replaceHash = (hash) => globalThis.history?.replaceState?.(null, "", hash || `${globalThis.location?.pathname || "/"}${globalThis.location?.search || ""}`),
  subscribeHashChange = (listener) => {
    globalThis.addEventListener?.("hashchange", listener);
    return () => globalThis.removeEventListener?.("hashchange", listener);
  },
  comparison,
  chat,
  onModeChange = () => {},
  focusMode = () => {},
} = {}) {
  if (!comparison || typeof comparison.cancelComparison !== "function" || typeof comparison.isBusy !== "function") {
    throw new TypeError("A comparison controller is required.");
  }
  if (!chat || typeof chat.isBusy !== "function") throw new TypeError("A chat controller is required.");

  let mode = "home";
  let unsubscribe = null;

  function start() {
    mode = modeFromHash(getHash());
    onModeChange(mode);
    focusMode(mode);
    unsubscribe ??= subscribeHashChange(handleHashChange);
    return mode;
  }

  function stop() {
    unsubscribe?.();
    unsubscribe = null;
  }

  function requestMode(nextMode) {
    if (!WORKSPACE_MODES.has(nextMode)) return { status: "invalid" };
    if (nextMode === mode) {
      focusMode(mode);
      return { status: "unchanged", mode };
    }
    if (chat.isBusy()) return { status: "blocked", reason: "chat_busy", mode };
    applyMode(nextMode, true);
    return { status: "changed", mode };
  }

  function handleHashChange() {
    const requestedMode = modeFromHash(getHash());
    if (requestedMode === mode) return;
    if (chat.isBusy()) {
      replaceHash(hashForMode(mode));
      return;
    }
    applyMode(requestedMode, false);
  }

  function applyMode(nextMode, updateHash) {
    if (mode === "compare" && nextMode !== "compare" && comparison.isBusy()) {
      comparison.cancelComparison();
    }
    mode = nextMode;
    if (updateHash) replaceHash(hashForMode(mode));
    onModeChange(mode);
    focusMode(mode);
  }

  return {
    start,
    stop,
    getMode: () => mode,
    requestMode,
    handleHashChange,
  };
}

export function modeFromHash(hash) {
  return typeof hash === "string" && hash.toLowerCase() === "#compare" ? "compare" : "home";
}

function hashForMode(mode) {
  return mode === "compare" ? "#compare" : "";
}
