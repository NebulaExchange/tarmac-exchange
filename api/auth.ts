module.exports = function handler(req: any, res: any) {
  const auth = req.headers.authorization || '';
  const cookies = req.headers.cookie || '';

  const USER = process.env.BASIC_AUTH_USER || 'admin';
  const PASS = process.env.BASIC_AUTH_PASS || 'password';

  // If cookie is present, allow request to continue (serve Vite app)
  if (cookies.includes('auth=1')) {
    // Let the request pass to the app
    res.statusCode = 200;
    res.end();
    return;
  }

  // Check Basic Auth header
  if (auth.startsWith('Basic ')) {
    const encoded = auth.split(' ')[1];
    const [user, pass] = Buffer.from(encoded, 'base64').toString().split(':');

    if (user === USER && pass === PASS) {
      // Set cookie to avoid repeated auth prompts
      res.setHeader('Set-Cookie', 'auth=1; Path=/; HttpOnly; Secure; SameSite=Lax');

      // Redirect to original URL or '/'
      res.writeHead(302, { Location: req.url || '/' });
      res.end();
      return;
    }
  }

  // Otherwise, ask for credentials
  res.setHeader('WWW-Authenticate', 'Basic realm="Protected Area"');
  res.statusCode = 401;
  res.end('Authentication required.');
};
