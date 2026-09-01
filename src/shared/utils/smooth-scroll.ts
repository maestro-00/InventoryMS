function easeInOutCubic(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - (-2 * progress + 2) ** 3 / 2;
}

function scrollTargetY(element: HTMLElement): number {
  const scrollMarginTop =
    Number.parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
  return element.getBoundingClientRect().top + window.scrollY - scrollMarginTop;
}

export const FEATURE_SECTION_SCROLL_MS = 2000;

let activeScrollFrame = 0;

export function smoothScrollToElement(
  element: HTMLElement,
  durationMs = FEATURE_SECTION_SCROLL_MS,
): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo({ top: scrollTargetY(element) });
    return;
  }

  const startY = window.scrollY;
  const targetY = scrollTargetY(element);
  const distance = targetY - startY;
  if (Math.abs(distance) < 1) return;

  const startTime = performance.now();
  const frameId = ++activeScrollFrame;

  function step(now: number) {
    if (frameId !== activeScrollFrame) return;

    const elapsed = now - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    window.scrollTo(0, startY + distance * easeInOutCubic(progress));

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}
