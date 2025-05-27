export default function handler(req: any, res: any) {
  const auth = req.headers.authorization;

  const USER = process.env.BASIC_AUTH_USER || 'admin';
  const PASS = process.env.BASIC_AUTH_PASS || 'password';

  if (!auth) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Protected Area"');
    res.statusCode = 401;
    res.end('Authentication required.');
    return;
  }

  const [scheme, encoded] = auth.split(' ');
  if (scheme !== 'Basic') {
    res.statusCode = 400;
    res.end('Unsupported auth scheme.');
    return;
  }

  const [user, pass] = Buffer.from(encoded, 'base64').toString().split(':');

  if (user === USER && pass === PASS) {
    // Auth success — serve the Vite app by rewriting to root
    res.writeHead(302, { Location: '/' });
    res.end();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Protected Area"');
    res.statusCode = 401;
    res.end('Access denied.');
  }
}
