// Local API by default so new routes work during development.
// Remote: BACKEND_URL=https://zludo.apps.selise.dev nx serve web
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

function rewriteProxiedCookies(proxy) {
  proxy.on('error', () => undefined);
  proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
    socket.on('error', () => undefined);
  });
  proxy.on('proxyRes', (proxyRes) => {
    const cookies = proxyRes.headers['set-cookie'];
    if (!cookies) {
      return;
    }
    proxyRes.headers['set-cookie'] = cookies.map((cookie) =>
      cookie
        .replace(/;\s*Secure/gi, '')
        .replace(/;\s*Domain=[^;]+/gi, '')
        .replace(/;\s*SameSite=None/gi, '; SameSite=Lax')
    );
  });
}

module.exports = {
  '/api': {
    target: BACKEND_URL,
    secure: BACKEND_URL.startsWith('https'),
    changeOrigin: true,
    cookieDomainRewrite: 'localhost',
    configure: rewriteProxiedCookies,
    headers: { origin: BACKEND_URL },
  },
  '/socket.io': {
    target: BACKEND_URL,
    secure: BACKEND_URL.startsWith('https'),
    changeOrigin: true,
    cookieDomainRewrite: 'localhost',
    ws: true,
    configure: rewriteProxiedCookies,
    headers: { origin: BACKEND_URL },
  },
};
