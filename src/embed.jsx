import { createRoot } from 'react-dom/client';
import MultiPlatformReviewsWidget from './Widget.jsx';
import { loadConfig } from './loader.js';

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
  if (node) return node;
  node = document.createElement('div');
  node.id = 'reassurance-widget';
  document.body.appendChild(node);
  return node;
}

async function mount() {
  const host = findMountNode();
  if (!host) return;
  if (host.shadowRoot) return; // already mounted

  let config;
  try {
    config = await loadConfig();
  } catch (err) {
    console.error('[reassurance-widget]', err.message);
    return;
  }

  const shadow = host.attachShadow({ mode: 'open' });
  const container = document.createElement('div');
  container.className = 'reassurance-widget-root';
  shadow.appendChild(container);

  const root = createRoot(container);

  function handleDismiss() {
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
      onDismiss={handleDismiss}
    />
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
