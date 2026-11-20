import React, { useRef, useState } from 'react';
import { Reply } from 'lucide-react';

const TRIGGER_PX = 60; // how far you must swipe right to reply
const MAX_PX = 90;

/**
 * WhatsApp-style "swipe right to reply". Works with touch, pen and mouse drag.
 * Vertical movement is left alone so the chat still scrolls normally.
 */
export const SwipeToReply: React.FC<{ onReply: () => void; children: React.ReactNode }> = ({ onReply, children }) => {
  const start = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const swiping = useRef(false);
  const [dx, setDx] = useState(0);
  const dxRef = useRef(0); // latest offset, readable in pointerup without waiting for a re-render
  const move = (v: number) => {
    dxRef.current = v;
    setDx(v);
  };

  const reset = () => {
    start.current = null;
    swiping.current = false;
    move(0);
  };

  return (
    <div
      className="relative"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        // Keep buttons, inputs and code blocks clickable / selectable
        if ((e.target as HTMLElement).closest('button, a, input, textarea, select, pre')) return;
        start.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
      }}
      onPointerMove={(e) => {
        const s = start.current;
        if (!s || s.pointerId !== e.pointerId) return;
        const moveX = e.clientX - s.x;
        const moveY = e.clientY - s.y;
        if (!swiping.current) {
          if (Math.abs(moveY) > 10 && Math.abs(moveY) > Math.abs(moveX)) {
            start.current = null; // the user is scrolling, not swiping
            return;
          }
          if (moveX > 10 && moveX > Math.abs(moveY)) {
            swiping.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            window.getSelection()?.removeAllRanges();
          } else {
            return;
          }
        }
        move(Math.max(0, Math.min(MAX_PX, moveX)));
      }}
      onPointerUp={() => {
        if (swiping.current && dxRef.current >= TRIGGER_PX) onReply();
        reset();
      }}
      onPointerCancel={reset}
    >
      {/* Reply arrow revealed behind the message while swiping */}
      <div
        aria-hidden="true"
        className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center pointer-events-none"
        style={{ opacity: Math.min(dx / TRIGGER_PX, 1), transform: `translateY(-50%) scale(${dx >= TRIGGER_PX ? 1.15 : 1})` }}
      >
        <Reply className="w-4 h-4" />
      </div>
      <div
        className={dx > 0 ? 'select-none' : ''}
        style={{ transform: `translateX(${dx}px)`, transition: dx === 0 ? 'transform 0.2s ease' : 'none' }}
      >
        {children}
      </div>
    </div>
  );
};
