/**
 * MultiPlatformReviewsWidget — bottom-left reassurance toast that
 * shows an aggregate guest rating broken down across review platforms
 * (Booking, Google, Tripadvisor, Hotels.com…).
 *
 * Three vertical sections separated by 1px dividers:
 *   1. Header strip   — aggregate score + dismiss ×
 *   2. Per-platform   — letter dot + name + score + thin progress bar
 *   3. Footer         — small check + trust line
 *
 * Self-contained: styles are inline, the only DOM dependency is a
 * single <style> tag injected on mount for the slide-in keyframes
 * and the mobile media query. Stylesheet attaches to the closest
 * root, so a shadow-DOM mount scopes everything correctly.
 */

import { useEffect, useRef } from 'react';

const STYLE_ID = 'reassurance-widget-keyframes';
const STYLE_TEXT = `
@keyframes reassure-slide-in {
  from { opacity: 0; transform: translateX(-16px) translateY(8px); }
  to   { opacity: 1; transform: translateX(0) translateY(0); }
}

/* Mobile (<= 480px): pin to bottom and stretch horizontally with a
   small inset so the toast doesn't overflow narrow viewports. */
@media (max-width: 480px) {
  .reassure-toast {
    left: 12px !important;
    right: 12px !important;
    width: auto !important;
  }
}
`;

function ensureKeyframes(rootNode) {
  const target =
    rootNode && rootNode.nodeType === 11 /* DOCUMENT_FRAGMENT */
      ? rootNode
      : document.head;
  if (target.getElementById && target.getElementById(STYLE_ID)) return;
  if (target.querySelector && target.querySelector('#' + STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE_TEXT;
  target.appendChild(style);
}

const DEFAULT_PLATFORMS = [
  { id: 'booking',     name: 'Booking.com',  short: 'B.', score: '8.9', scale: '/10', color: '#003580', count: '842' },
  { id: 'google',      name: 'Google',       short: 'G',  score: '4.8', scale: '/5',  color: '#4285F4', count: '316' },
  { id: 'tripadvisor', name: 'Tripadvisor',  short: 'TA', score: '4.7', scale: '/5',  color: '#34E0A1', count: '189' },
];

// Normalize a score string into a 0–1 ratio for the progress bar.
// /5 scales divide by 5, /10 scales divide by 10. Coerced into
// [0, 1] so a malformed value can't push the fill past the track.
function normalizedRatio(scoreStr, scale) {
  const n = parseFloat(scoreStr);
  if (!Number.isFinite(n) || n < 0) return 0;
  const denom = scale === '/5' ? 5 : 10;
  const r = n / denom;
  return Math.max(0, Math.min(1, r));
}

export default function MultiPlatformReviewsWidget({
  aggregateScore = '4.8',
  totalReviews = '1,347',
  accentColor = '#432975',
  platforms = DEFAULT_PLATFORMS,
  footerText = 'Verified guest reviews · Updated daily',
  onDismiss,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const root = ref.current.getRootNode
      ? ref.current.getRootNode()
      : document;
    ensureKeyframes(root);
  }, []);

  const safePlatforms = Array.isArray(platforms) && platforms.length
    ? platforms
    : DEFAULT_PLATFORMS;

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Guest reviews"
      className="reassure-toast"
      style={{
        position: 'fixed',
        left: 24,
        bottom: 24,
        zIndex: 1000,
        width: 340,
        maxWidth: 'calc(100vw - 48px)',
        background: '#FFFFFF',
        border: '1px solid #E7E5E4',
        borderRadius: 8,
        boxShadow:
          '0 20px 60px rgba(20, 12, 36, 0.18), 0 2px 4px rgba(20, 12, 36, 0.06)',
        overflow: 'hidden',
        fontFamily:
          '"Open Sans", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        animation: 'reassure-slide-in 420ms cubic-bezier(.2,.7,.3,1) both',
      }}
    >
      {/* ── Header strip ───────────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          padding: '12px 16px',
          background: '#FBFAF9',
          borderBottom: '1px solid #E7E5E4',
        }}
      >
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            style={{
              position: 'absolute',
              top: 6,
              right: 8,
              width: 18,
              height: 18,
              padding: 0,
              background: 'transparent',
              border: 0,
              color: '#bbb',
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1,
              fontFamily: 'inherit',
            }}
          >
            ×
          </button>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: accentColor,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}
          >
            {aggregateScore}
          </span>
          <span style={{ fontSize: 11, color: '#666', lineHeight: 1.3 }}>
            across <span style={{ color: '#424242' }}>{totalReviews}</span>{' '}
            reviews
          </span>
        </div>
      </div>

      {/* ── Per-platform list ──────────────────────────────────── */}
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          borderBottom: '1px solid #E7E5E4',
        }}
      >
        {safePlatforms.map((p) => (
          <PlatformRow key={p.id} platform={p} />
        ))}
      </div>

      {/* ── Footer trust line ──────────────────────────────────── */}
      <div
        style={{
          padding: '8px 16px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 10,
          color: '#999',
        }}
      >
        <CheckIcon />
        <span>{footerText}</span>
      </div>
    </div>
  );
}

function PlatformRow({ platform }) {
  const { name, short, score, scale, color, count } = platform;
  const ratio = normalizedRatio(score, scale);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Letter dot */}
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: color,
          color: '#FFFFFF',
          fontSize: 10,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          letterSpacing: '0.02em',
        }}
      >
        {short}
      </span>

      {/* Right column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#424242',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {name}
          </span>
          <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
            <strong
              style={{
                color: '#424242',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {score}
            </strong>
            <span style={{ color: '#999' }}>{scale}</span>
            <span style={{ color: '#999', marginLeft: 6 }}>· {count}</span>
          </span>
        </div>

        {/* Progress bar */}
        <div
          aria-hidden="true"
          style={{
            marginTop: 5,
            height: 4,
            background: '#F1EFEC',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${ratio * 100}%`,
              background: color,
              borderRadius: 2,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 11 11"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M2 6 L4.2 8 L9 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
