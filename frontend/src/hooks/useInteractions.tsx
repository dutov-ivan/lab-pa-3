import React from "react";

type UseInteractionsOptions = {
  minSpacing?: number;
  maxSpacing?: number;
  step?: number;
};

type UseInteractionsReturn = {
  spacing: number;
  setSpacing: React.Dispatch<React.SetStateAction<number>>;
  isMobile: boolean;
  isShiftDown: boolean;
  onWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
  onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchMove: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchEnd: (e: React.TouchEvent<HTMLDivElement>) => void;
  increaseSpacing: () => void;
  decreaseSpacing: () => void;
  resetSpacing: () => void;
};

export function useInteractions(
  initialSpacing: number,
  opts: UseInteractionsOptions = {}
): UseInteractionsReturn {
  const { minSpacing = 0.6, maxSpacing = 3.0, step = 0.1 } = opts;

  const [spacing, setSpacing] = React.useState<number>(initialSpacing);
  const [isShiftDown, setIsShiftDown] = React.useState<boolean>(false);

  const isMobile =
    typeof window !== "undefined" &&
    ("ontouchstart" in window ||
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0));

  const pinchRef = React.useRef({
    isPinching: false,
    startDist: 0,
    startSpacing: initialSpacing,
    lastSpacing: initialSpacing,
  });

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftDown(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftDown(false);
    };
    const onBlur = () => setIsShiftDown(false);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // wheel handler: when Shift is held, intercept wheel to change spacing
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.shiftKey) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    const delta = e.deltaY;
    const change = delta < 0 ? step : -step;
    setSpacing((s) => {
      const next = Math.min(
        maxSpacing,
        Math.max(minSpacing, +(s + change).toFixed(3))
      );
      return next;
    });
  };

  const touchDistance = (
    t1: { clientX: number; clientY: number },
    t2: { clientX: number; clientY: number }
  ) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.hypot(dx, dy);
  };

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const d = touchDistance(e.touches[0], e.touches[1]);
      pinchRef.current.isPinching = true;
      pinchRef.current.startDist = d;
      pinchRef.current.startSpacing = spacing;
      pinchRef.current.lastSpacing = spacing;
      e.preventDefault();
    }
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (pinchRef.current.isPinching && e.touches.length === 2) {
      const d = touchDistance(e.touches[0], e.touches[1]);
      const ratio = d / pinchRef.current.startDist;
      const desired = +(pinchRef.current.startSpacing * ratio).toFixed(3);
      const next = Math.min(maxSpacing, Math.max(minSpacing, desired));
      if (next !== pinchRef.current.lastSpacing) {
        setSpacing(next);
        pinchRef.current.lastSpacing = next;
      }
      e.preventDefault();
    }
  };

  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (pinchRef.current.isPinching && e.touches.length < 2) {
      pinchRef.current.isPinching = false;
    }
  };

  const increaseSpacing = () =>
    setSpacing((s) => Math.min(maxSpacing, +(s + step).toFixed(3)));

  const decreaseSpacing = () =>
    setSpacing((s) => Math.max(minSpacing, +(s - step).toFixed(3)));

  const resetSpacing = () => setSpacing(initialSpacing);

  return {
    spacing,
    setSpacing,
    isMobile,
    isShiftDown,
    onWheel,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    increaseSpacing,
    decreaseSpacing,
    resetSpacing,
  };
}

export default useInteractions;
