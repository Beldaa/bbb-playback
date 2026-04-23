import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const ZOOM_FACTOR = 1.1;

const getPointer = (e) => {
  const t = e.touches?.[0] ?? e.changedTouches?.[0] ?? e;
  return { x: t.clientX, y: t.clientY };
};

const isInsideControls = (e) =>
  e.target?.closest?.('.zoom-wrapper-controls') != null;

const useZoomPan = (resetKey) => {
  const containerRef = useRef();
  const innerRef = useRef();
  const transformRef = useRef({ scale: MIN_SCALE, tx: 0, ty: 0 });
  const dragRef = useRef(null);
  const [scale, setScale] = useState(MIN_SCALE);
  const [cursor, setCursor] = useState('default');

  const clamp = useCallback((newScale, tx, ty) => {
    const el = containerRef.current;
    if (!el || newScale <= MIN_SCALE) return { tx: 0, ty: 0 };
    const w = el.clientWidth;
    const h = el.clientHeight;
    return {
      tx: Math.min(0, Math.max(w - w * newScale, tx)),
      ty: Math.min(0, Math.max(h - h * newScale, ty)),
    };
  }, []);

  const writeTransform = useCallback((s, tx, ty) => {
    if (innerRef.current) {
      innerRef.current.style.transform =
        `translate(${tx}px, ${ty}px) scale(${s})`;
    }
  }, []);

  const commit = useCallback((newScale, tx, ty) => {
    const { tx: ctx, ty: cty } = clamp(newScale, tx, ty);
    transformRef.current = { scale: newScale, tx: ctx, ty: cty };
    setScale(newScale);
    writeTransform(newScale, ctx, cty);
    setCursor(newScale > MIN_SCALE ? 'grab' : 'default');
  }, [clamp, writeTransform]);

  const zoomAt = useCallback((newScale, ax, ay) => {
    const { scale: s, tx, ty } = transformRef.current;
    commit(newScale, ax - (ax - tx) * newScale / s, ay - (ay - ty) * newScale / s);
  }, [commit]);

  const reset = useCallback(() => commit(MIN_SCALE, 0, 0), [commit]);

  // reset when the key changes (e.g. slide/content change)
  useEffect(() => {
    reset();
  }, [resetKey, reset]);

  // --- wheel zoom (anchored at pointer) ---
  const onWheel = useCallback((e) => {
    if (isInsideControls(e)) return;
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ns = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, transformRef.current.scale * (e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR)),
    );
    zoomAt(ns, e.clientX - rect.left, e.clientY - rect.top);
  }, [zoomAt]);

  // --- slider (anchored at center) ---
  const onSliderChange = useCallback((e) => {
    const el = containerRef.current;
    if (!el) return;
    zoomAt(Number(e.target.value), el.clientWidth / 2, el.clientHeight / 2);
  }, [zoomAt]);

  // --- drag (mouse + touch) ---
  const startDrag = useCallback((e) => {
    if (isInsideControls(e)) return;
    const { scale: s, tx, ty } = transformRef.current;
    if (s <= MIN_SCALE) return;
    if (e.cancelable) e.preventDefault();
    const { x, y } = getPointer(e);
    dragRef.current = { x0: x, y0: y, tx0: tx, ty0: ty };
    setCursor('grabbing');
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current) return;
      const { x0, y0, tx0, ty0 } = dragRef.current;
      const { scale: s } = transformRef.current;
      const { x, y } = getPointer(e);
      const { tx, ty } = clamp(s, tx0 + x - x0, ty0 + y - y0);
      transformRef.current = { scale: s, tx, ty };
      writeTransform(s, tx, ty);
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setCursor(transformRef.current.scale > MIN_SCALE ? 'grab' : 'default');
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchcancel', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchcancel', onUp);
    };
  }, [clamp, writeTransform]);

  // wheel + mousedown + touchstart on container in capture phase, so
  // children that stop propagation (e.g. Tldraw) cannot swallow them
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false, capture: true });
    el.addEventListener('mousedown', startDrag, { capture: true });
    el.addEventListener('touchstart', startDrag, { passive: false, capture: true });
    return () => {
      el.removeEventListener('wheel', onWheel, { capture: true });
      el.removeEventListener('mousedown', startDrag, { capture: true });
      el.removeEventListener('touchstart', startDrag, { capture: true });
    };
  }, [onWheel, startDrag]);

  // re-clamp on container resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const { scale: s, tx, ty } = transformRef.current;
      const { tx: nx, ty: ny } = clamp(s, tx, ty);
      if (nx !== tx || ny !== ty) {
        transformRef.current = { scale: s, tx: nx, ty: ny };
        writeTransform(s, nx, ny);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [clamp, writeTransform]);

  return {
    containerRef,
    innerRef,
    scale,
    cursor,
    min: MIN_SCALE,
    max: MAX_SCALE,
    onDoubleClick: reset,
    onSliderChange,
  };
};

export default useZoomPan;
