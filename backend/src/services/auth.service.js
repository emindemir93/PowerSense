const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const generateTokens = (user) => {
  const payload = { id: user.id, email: user.email, role: user.role };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

const login = async (email, password) => {
  const user = await db('users')
    .where({ email: email.toLowerCase(), is_active: true })
    .select('id', 'name', 'email', 'role', 'password_hash', 'is_active', 'last_login')
    .first();

  if (!user) throw { status: 401, message: 'Email veya şifre hatalı.' };

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw { status: 401, message: 'Email veya şifre hatalı.' };

  // Update last login
  await db('users').where({ id: user.id }).update({ last_login: new Date() });

  // Save refresh token
  const tokens = generateTokens(user);
  await db('refresh_tokens').insert({
    id: uuidv4(),
    user_id: user.id,
    token: tokens.refreshToken,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    created_at: new Date(),
  });

  const { password_hash, ...safeUser } = user;
  return { user: safeUser, ...tokens };
};

const refresh = async (refreshToken) => {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw { status: 401, message: 'Geçersiz veya süresi dolmuş refresh token.' };
  }

  const stored = await db('refresh_tokens')
    .where({ token: refreshToken, user_id: decoded.id })
    .where('expires_at', '>', new Date())
    .first();

  if (!stored) throw { status: 401, message: 'Refresh token bulunamadı veya süresi dolmuş.' };

  const user = await db('users')
    .where({ id: decoded.id, is_active: true })
    .select('id', 'name', 'email', 'role')
    .first();

  if (!user) throw { status: 401, message: 'Kullanıcı bulunamadı.' };

  // Rotate refresh token
  await db('refresh_tokens').where({ id: stored.id }).delete();
  const tokens = generateTokens(user);
  await db('refresh_tokens').insert({
    id: uuidv4(),
    user_id: user.id,
    token: tokens.refreshToken,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    created_at: new Date(),
  });

  return { user, ...tokens };
};

const logout = async (refreshToken, userId) => {
  await db('refresh_tokens').where({ token: refreshToken, user_id: userId }).delete();
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await db('users').where({ id: userId }).select('password_hash').first();
  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw { status: 400, message: 'Mevcut şifre hatalı.' };

  const hash = await bcrypt.hash(newPassword, 12);
  await db('users').where({ id: userId }).update({ password_hash: hash, updated_at: new Date() });

  // Invalidate all refresh tokens
  await db('refresh_tokens').where({ user_id: userId }).delete();
};

module.exports = { login, refresh, logout, changePassword };
