const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db/database');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

const router = express.Router();
const cookieMaxAge = 12 * 60 * 60 * 1000;

function authCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.AUTH_COOKIE_SAME_SITE || 'lax',
    maxAge: cookieMaxAge,
    path: '/api'
  };
}

router.post('/login', async (req, res) => {
  try {
    const body = req.body || {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password || email.length > 191 || password.length > 256) {
      return res.status(400).json({ error: 'A valid email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const isMatch = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!isMatch || user.role !== 'admin') {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, username: user.username },
      JWT_SECRET,
      { expiresIn: '12h', issuer: 'velocad-api', audience: 'velocad-admin' }
    );

    res.cookie('velocad_admin_token', token, authCookieOptions());
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

router.post('/logout', (req, res) => {
  const { maxAge, ...clearOptions } = authCookieOptions();
  res.clearCookie('velocad_admin_token', clearOptions);
  res.json({ message: 'Logout successful.' });
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, email: true, role: true }
    });
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ error: 'Administrator account is unavailable.' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Error fetching current admin:', error);
    res.status(500).json({ error: 'Failed to verify administrator account.' });
  }
});

module.exports = router;
