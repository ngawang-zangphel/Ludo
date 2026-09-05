const BACKEND_URL = 'https://zludo.apps.selise.dev';

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
    secure: true,
    changeOrigin: true,
    cookieDomainRewrite: 'localhost',
    configure: rewriteProxiedCookies,
    headers: { origin: BACKEND_URL },
  },
  '/socket.io': {
    target: BACKEND_URL,
    secure: true,
    changeOrigin: true,
    cookieDomainRewrite: 'localhost',
    configure: rewriteProxiedCookies,
    headers: { origin: BACKEND_URL },
  },
};
