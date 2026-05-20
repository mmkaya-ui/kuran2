// Service Worker Registration + Update Prompt
// Registers /sw.js (served from public/) once the page is loaded
// and surfaces an in-app update banner when a new SW becomes available.

export function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (import.meta.env.DEV) return; // Skip in dev — Vite serves modules directly

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (!newWorker) return;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        const banner = document.createElement('div');
                        banner.id = 'sw-update-banner';
                        banner.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9999;background:#047857;color:#fff;padding:10px 18px;border-radius:99px;font-size:13px;font-family:Inter,sans-serif;display:flex;align-items:center;gap:10px;box-shadow:0 4px 20px rgba(0,0,0,0.25);white-space:nowrap;';
                        banner.innerHTML = '<span>Yeni sürüm hazır!</span><button id="sw-update-btn" style="background:#fff;color:#047857;border:none;border-radius:99px;padding:4px 12px;font-size:12px;font-weight:700;cursor:pointer;">Güncelle</button>';
                        document.body.appendChild(banner);
                        document.getElementById('sw-update-btn').addEventListener('click', () => {
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                            banner.remove();
                            window.location.reload();
                        });
                    }
                });
            });
        }).catch(err => console.warn('[SW] Registration failed:', err));

        // If a new SW just took over, reload once cleanly
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) { refreshing = true; window.location.reload(); }
        });
    });
}
