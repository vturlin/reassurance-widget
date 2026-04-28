import { createRoot } from 'react-dom/client';
import MultiPlatformReviewsWidget from './Widget.jsx';
import { loadConfig } from './loader.js';

// ─── Dismiss persistence ────────────────────────────────────────────
// Once the visitor closes the toast we keep it muted for the rest of
// the session (sessionStorage = cleared on tab close). Keyed by
// hotelId so a browser visiting two hotels in the same session sees
// each toast once. Try/catch covers private-mode browsers that throw
// on storage access.
const DISMISSED_KEY_PREFIX = 'reassurance_dismissed_';

function isDismissedThisSession(hotelId) {
  try {
    return !!sessionStorage.getItem(DISMISSED_KEY_PREFIX + (hotelId || 'default'));
  } catch {
    return false;
  }
}

function markDismissedThisSession(hotelId) {
  try {
    sessionStorage.setItem(DISMISSED_KEY_PREFIX + (hotelId || 'default'), '1');
  } catch {
    /* private mode / sessionStorage unavailable — silently no-op */
  }
}

/**
 * Auto-mount on DOM ready. Finds #reassurance-widget (documented
 * target) or data-reassurance-widget (advanced); auto-creates one
 * otherwise so the widget is embeddable via tag managers (GTM/Wix)
 * where injecting markup is not always possible.
 *
 * Style isolation: mounted into Shadow DOM so host-page CSS resets
 * cannot reach the toast. The component styles itself inline and
 * injects its own keyframes <style> on mount, so there is no
 * sibling stylesheet to fetch.
 */

function findMountNode() {
  let node =
    document.getElementById('reassurance-widget') ||
    document.querySelector('[data-reassurance-widget]');
  if (node) return { node, autoCreated: false };
  node = document.createElement('div');
  node.id = 'reassurance-widget';
  document.body.appendChild(node);
  return { node, autoCreated: true };
}

async function mount() {
  const { node: host, autoCreated } = findMountNode();
  if (!host) return;
  if (host.shadowRoot) {
    // Surface the silent no-op so a duplicated <script> tag, GTM
    // re-firing, or HMR don't look like the widget never loaded.
    console.warn('[reassurance-widget] already mounted, skipping');
    return;
  }

  let config;
  try {
    config = await loadConfig();
  } catch (err) {
    console.error('[reassurance-widget]', err.message);
    // Don't leave an empty <div> stuck in the host page when the
    // config failed and we created the mount point ourselves.
    if (autoCreated) host.remove();
    return;
  }

  // Skip mount entirely if the visitor dismissed the toast earlier
  // in this session. Preview mode (admin iframe) bypasses the check
  // so the operator can keep editing without re-opening the tab.
  if (!config._preview && isDismissedThisSession(config._hotelId)) {
    if (autoCreated) host.remove();
    return;
  }

  const shadow = host.attachShadow({ mode: 'open' });
  const container = document.createElement('div');
  container.className = 'reassurance-widget-root';
  shadow.appendChild(container);

  const root = createRoot(container);

  function handleDismiss() {
    if (!config._preview) markDismissedThisSession(config._hotelId);
    root.unmount();
    host.remove();
  }

  root.render(
    <MultiPlatformReviewsWidget
      aggregateScore={config.aggregateScore}
      totalReviews={config.totalReviews}
      accentColor={config.accentColor}
      footerText={config.footerText}
      platforms={config.platforms}
      position={config.position}
      triggerMode={config.triggerMode}
      triggerDelaySec={config.triggerDelaySec}
      triggerScrollPercent={config.triggerScrollPercent}
      onDismiss={handleDismiss}
    />
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
