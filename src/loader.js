/**
 * Remote config loader for the reassurance widget.
 *
 * Resolves the widget config from (in priority order):
 *   1. ?preview=<base64> on the host page URL  (admin live preview)
 *   2. ?id=xxx in the <script src>             (remote CDN fetch)
 *   3. window.REASSURANCE_WIDGET_CONFIG        (inline override)
 *   4. {} — render with the component's defaults
 */

const CONFIGS_BASE_URL = resolveConfigsBase();

function resolveConfigsBase() {
  const scripts = document.getElementsByTagName('script');
  for (let i = scripts.length - 1; i >= 0; i--) {
    const src = scripts[i].src || '';
    if (src.includes('widget.js')) {
      return src.replace(/widget\.js(?:\?.*)?$/, '') + 'configs/';
    }
  }
  return './configs/';
}

function findSelfScript() {
  if (document.currentScript && document.currentScript.src) {
    return document.currentScript.src;
  }
  const scripts = document.getElementsByTagName('script');
  for (let i = scripts.length - 1; i >= 0; i--) {
    const src = scripts[i].src || '';
    if (src.includes('widget.js')) return src;
  }
  return null;
}

function extractIdFromScript() {
  const src = findSelfScript();
  if (!src) return null;
  try {
    const url = new URL(src);
    const id = url.searchParams.get('id');
    return id && id.trim() ? id.trim() : null;
  } catch {
    return null;
  }
}

const ALLOWED_SCALES = new Set(['/5', '/10']);

// Per-row sanitizer. Drops anything that doesn't fit the Platform
// shape so a partial admin save can't crash the widget.
function normalizePlatform(p) {
  if (!p || typeof p !== 'object') return null;
  const id = typeof p.id === 'string' ? p.id : null;
  const name = typeof p.name === 'string' ? p.name : null;
  if (!id || !name) return null;
  return {
    id,
    name,
    short: typeof p.short === 'string' ? p.short.slice(0, 4) : '',
    score: typeof p.score === 'string' ? p.score : String(p.score ?? ''),
    scale: ALLOWED_SCALES.has(p.scale) ? p.scale : '/10',
    color: typeof p.color === 'string' ? p.color : '#999999',
    count: typeof p.count === 'string' ? p.count : String(p.count ?? ''),
  };
}

export function normalizeConfig(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const pick = (k) =>
    typeof raw[k] === 'string' && raw[k].trim() ? raw[k] : undefined;

  const platforms = Array.isArray(raw.platforms)
    ? raw.platforms.map(normalizePlatform).filter(Boolean).slice(0, 8)
    : undefined;

  const validPositions = [
    'bottom-right', 'bottom-left',
    'center-right', 'center-left',
    'top-right',    'top-left',
  ];
  const position = validPositions.includes(raw.position)
    ? raw.position
    : undefined;

  const validTriggers = ['immediate', 'time', 'scroll', 'time_or_scroll'];
  const triggerMode = validTriggers.includes(raw.triggerMode)
    ? raw.triggerMode
    : undefined;

  const triggerDelaySec = Number.isFinite(raw.triggerDelaySec)
    ? Math.max(0, Math.min(120, Math.round(raw.triggerDelaySec)))
    : undefined;

  const triggerScrollPercent = Number.isFinite(raw.triggerScrollPercent)
    ? Math.max(5, Math.min(95, Math.round(raw.triggerScrollPercent)))
    : undefined;

  return {
    _hotelId: raw._hotelId || null,
    aggregateScore: pick('aggregateScore'),
    totalReviews: pick('totalReviews'),
    accentColor: pick('accentColor'),
    footerText: pick('footerText'),
    platforms,
    position,
    triggerMode,
    triggerDelaySec,
    triggerScrollPercent,
    _preview: raw._preview === true,
  };
}

export function extractPreviewConfig() {
  try {
    const params = new URLSearchParams(window.location.search);
    const b64 = params.get('preview');
    if (!b64) return null;
    const std = b64.replace(/-/g, '+').replace(/_/g, '/');
    const pad = std.length % 4 === 0 ? '' : '='.repeat(4 - (std.length % 4));
    const binary = atob(std + pad);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  } catch (err) {
    console.warn('[reassurance-widget] extractPreviewConfig failed', err);
    return null;
  }
}

export async function loadConfig() {
  const previewConfig = extractPreviewConfig();
  if (previewConfig) {
    previewConfig._hotelId = previewConfig._hotelId || 'preview';
    return normalizeConfig(previewConfig);
  }

  const id = extractIdFromScript();
  if (id) {
    const url = `${CONFIGS_BASE_URL}${encodeURIComponent(id)}.json`;
    try {
      const res = await fetch(url, { credentials: 'omit' });
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching config ${id}`);
      const raw = await res.json();
      raw._hotelId = id;
      return normalizeConfig(raw);
    } catch (err) {
      if (window.REASSURANCE_WIDGET_CONFIG) {
        console.warn(
          `[reassurance-widget] Remote config '${id}' failed, falling back to inline.`,
          err
        );
        return normalizeConfig(window.REASSURANCE_WIDGET_CONFIG);
      }
      throw err;
    }
  }

  if (window.REASSURANCE_WIDGET_CONFIG) {
    return normalizeConfig(window.REASSURANCE_WIDGET_CONFIG);
  }

  return {};
}
