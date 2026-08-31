import test from "node:test";
import assert from "node:assert/strict";
import { initializeResponsiveNavigation } from "../public/navigation.js";

function createNavigationElement() {
  const attributes = new Map();
  return {
    hidden: false,
    inert: false,
    open: false,
    setAttribute(name, value) { attributes.set(name, value); },
    removeAttribute(name) { attributes.delete(name); },
    getAttribute(name) { return attributes.get(name) ?? null; },
  };
}

function createFixture(matches) {
  const desktop = createNavigationElement();
  const mobile = createNavigationElement();
  let listener = null;
  const media = {
    matches,
    addEventListener(type, callback) {
      if (type === "change") listener = callback;
    },
    removeEventListener(type, callback) {
      if (type === "change" && listener === callback) listener = null;
    },
    update(nextMatches) {
      this.matches = nextMatches;
      listener?.({ matches: nextMatches });
    },
    hasListener() { return Boolean(listener); },
  };
  const document = {
    querySelector(selector) {
      if (selector === ".desktop-nav") return desktop;
      if (selector === ".mobile-nav") return mobile;
      return null;
    },
  };
  return { desktop, mobile, media, document };
}

function assertAvailable(element) {
  assert.equal(element.hidden, false);
  assert.equal(element.inert, false);
  assert.equal(element.getAttribute("aria-hidden"), null);
}

function assertUnavailable(element) {
  assert.equal(element.hidden, true);
  assert.equal(element.inert, true);
  assert.equal(element.getAttribute("aria-hidden"), "true");
}

test("responsive navigation exposes only desktop navigation above the breakpoint", () => {
  const fixture = createFixture(false);
  fixture.mobile.open = true;

  const cleanup = initializeResponsiveNavigation({
    document: fixture.document,
    matchMedia: () => fixture.media,
  });

  assertAvailable(fixture.desktop);
  assertUnavailable(fixture.mobile);
  assert.equal(fixture.mobile.open, false);
  assert.equal(fixture.media.hasListener(), true);

  cleanup();
  assert.equal(fixture.media.hasListener(), false);
});

test("responsive navigation swaps the accessible navigation when the breakpoint changes", () => {
  const fixture = createFixture(false);
  initializeResponsiveNavigation({
    document: fixture.document,
    matchMedia: () => fixture.media,
  });

  fixture.media.update(true);
  assertUnavailable(fixture.desktop);
  assertAvailable(fixture.mobile);

  fixture.media.update(false);
  assertAvailable(fixture.desktop);
  assertUnavailable(fixture.mobile);
});

test("responsive navigation safely no-ops when a page has incomplete navigation markup", () => {
  const cleanup = initializeResponsiveNavigation({
    document: { querySelector: () => null },
    matchMedia: () => ({ matches: false }),
  });
  assert.doesNotThrow(cleanup);
});
