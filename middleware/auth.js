const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32 || /^(replace|change)[-_ ]/i.test(JWT_SECRET)) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 characters.');
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const [scheme, token] = authHeader ? authHeader.split(' ') : [];
  const cookieToken = req.cookies?.velocad_admin_token;
  const authToken = scheme === 'Bearer' && token ? token : cookieToken;

  if (!authToken) {
    return res.status(401).json({ error: 'Access denied. Authentication is required.' });
  }

  jwt.verify(authToken, JWT_SECRET, {
    issuer: 'velocad-api',
    audience: 'velocad-admin'
  }, (err, user) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    req.authMethod = scheme === 'Bearer' && token ? 'bearer' : 'cookie';
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access is required.' });
  }
  if (
    req.authMethod === 'cookie' &&
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    !process.env.FRONTEND_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean).includes(req.get('origin'))
  ) {
    return res.status(403).json({ error: 'A trusted origin is required for this request.' });
  }
  next();
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireAdmin
};
