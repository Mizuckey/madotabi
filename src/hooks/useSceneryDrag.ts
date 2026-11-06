"use client";

import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';

type Drag = { id: string; target: string; pointerId: number; startX: number; startY: number; x: number; y: number; active: boolean; element: HTMLElement };
export function useSceneryDrag(ids: string[], disabled: boolean, commit: (source: string, target: string) => Promise<void>) {
  const pointer = useRef<Drag | null>(null);
  const frame = useRef<number | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);

  function clear() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null; pointer.current = null; setSource(null); setTarget(null); setKeyboard(false);
  }
  function scan() {
    const drag = pointer.current;
    if (!drag || !drag.active) return;
    const scroller = drag.element.closest('.personal-stage.is-library');
    if (scroller) {
      const rect = scroller.getBoundingClientRect();
      if (drag.y < rect.top + 48) scroller.scrollTop -= 12;
      else if (drag.y > rect.bottom - 48) scroller.scrollTop += 12;
    }
    const card = document.elementFromPoint(drag.x, drag.y)?.closest<HTMLElement>('[data-scenery-id]');
    const id = card?.dataset.sceneryId;
    if (id && ids.includes(id) && drag.target !== id) { drag.target = id; setTarget(id); }
  }
  function start(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (disabled || pointer.current || event.button !== 0) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = { id, target: id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, active: false, element: event.currentTarget };
    setSource(id); setTarget(id); setKeyboard(false);
    const tick = () => { if (!pointer.current) return; scan(); frame.current = requestAnimationFrame(tick); };
    frame.current = requestAnimationFrame(tick);
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const drag = pointer.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.x = event.clientX; drag.y = event.clientY;
    if (Math.hypot(drag.x - drag.startX, drag.y - drag.startY) >= 6) drag.active = true;
    scan();
  }
  function drop(event: PointerEvent<HTMLButtonElement>) {
    const drag = pointer.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const { id, target, active } = drag;
    clear();
    if (active && id !== target) void commit(id, target);
  }
  function key(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    if (disabled) return;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (keyboard && source === id) { const to = target; clear(); if (to && to !== id) void commit(id, to); }
      else { setKeyboard(true); setSource(id); setTarget(id); }
    } else if (keyboard && source === id && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      const index = ids.indexOf(target ?? id) + (event.key === 'ArrowUp' ? -1 : 1);
      if (ids[index]) setTarget(ids[index]);
    } else if (event.key === 'Escape') { event.preventDefault(); clear(); }
  }
  const handles = (id: string) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => start(event, id),
    onPointerMove: move, onPointerUp: drop,
    onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => { if (pointer.current?.pointerId === event.pointerId) clear(); },
    onLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => { if (pointer.current?.pointerId === event.pointerId) clear(); },
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => key(event, id),
    onBlur: () => { if (keyboard) clear(); },
    'aria-pressed': source === id,
  });
  return { source, target, handles, announcement: source && target ? `移動先：${ids.indexOf(target) + 1}番目。離すかEnterで保存、Escapeで中止します。` : '' };
}
