import { useEffect, useState } from 'react';

/**
 * 跟踪 window.scrollY 的轻量 hook。
 * 使用 requestAnimationFrame 节流，避免高频滚动时大量 setState。
 */
export function useScrollY(): number {
  const [scrollY, setScrollY] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return window.scrollY;
  });

  useEffect(() => {
    let frameId: number | null = null;
    let ticking = false;

    const update = () => {
      setScrollY(window.scrollY);
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      frameId = requestAnimationFrame(update);
    };

    // 初始化一次
    update();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return scrollY;
}
