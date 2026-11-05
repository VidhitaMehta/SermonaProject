/**
 * Tiny dependency-free confetti burst.
 * Creates a few dozen coloured pieces, animates them with the Web Animations API
 * and removes them when done.
 */
const COLORS = ['#ffb020', '#ffcd6e', '#45c8f5', '#3ddc84', '#f0f3f6', '#ff8a1f'];

export function fireConfetti(origin?: { x: number; y: number }, count = 70) {
  if (typeof document === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const x0 = origin?.x ?? window.innerWidth / 2;
  const y0 = origin?.y ?? window.innerHeight / 3;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    const w = 6 + Math.random() * 6;
    const h = Math.random() < 0.3 ? w : w * 0.45;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.background = COLORS[i % COLORS.length];
    if (Math.random() < 0.25) el.style.borderRadius = '50%';
    document.body.appendChild(el);

    const angle = Math.random() * Math.PI * 2;
    const speed = 120 + Math.random() * 260;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed - 180; // bias upward
    const fall = 320 + Math.random() * 260;
    const spin = (Math.random() - 0.5) * 1080;
    const duration = 1100 + Math.random() * 900;

    const anim = el.animate(
      [
        { transform: `translate(${x0}px, ${y0}px) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${x0 + dx}px, ${y0 + dy}px) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${x0 + dx * 1.3}px, ${y0 + dy + fall}px) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration, easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)', fill: 'forwards' }
    );
    anim.onfinish = () => el.remove();
  }
}
