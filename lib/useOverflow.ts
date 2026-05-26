import { useEffect, useState, type RefObject } from "react";

export function useOverflow(
  ref: RefObject<HTMLElement | null>,
  name: string | null | undefined
): boolean {
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function measure() {
      if (!el) return;
      const overflow = el.scrollWidth - el.clientWidth;
      const overflows = overflow > 0;
      setIsOverflowing(overflows);
      if (overflows) {
        el.style.setProperty("--mq-end", `-${overflow}px`);
      } else {
        el.style.removeProperty("--mq-end");
      }
    }

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);

    document.fonts.ready.then(measure);

    return () => ro.disconnect();
  }, [ref, name]);

  return isOverflowing;
}
