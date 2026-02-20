const router = require('express').Router();
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const auditLog = require('../middleware/audit.middleware');

const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
  role: Joi.string().valid('admin', 'analyst', 'viewer').default('viewer'),
  is_active: Joi.boolean().default(true),
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  email: Joi.string().email(),
  role: Joi.string().valid('admin', 'analyst', 'viewer'),
  is_active: Joi.boolean(),
});

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Kullanıcı yönetimi (Sadece admin)
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Tüm kullanıcıları listele
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [admin, analyst, viewer] }
 *     responses:
 *       200:
 *         description: Kullanıcı listesi
 */
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role, is_active } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = db('users').select('id', 'name', 'email', 'role', 'is_active', 'last_login', 'created_at');

    if (search) {
      query = query.where((q) => q.where('name', 'ilike', `%${search}%`).orWhere('email', 'ilike', `%${search}%`));
    }
    if (role) query = query.where({ role });
    if (is_active !== undefined) query = query.where({ is_active: is_active === 'true' });

    const [{ count }] = await query.clone().count('* as count');
    const users = await query.orderBy('created_at', 'desc').limit(parseInt(limit)).offset(offset);

    res.json({
      success: true,
      data: users,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(count),
        totalPages: Math.ceil(parseInt(count) / parseInt(limit)),
      },
    });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Kullanıcı detayı
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Kullanıcı bilgileri
 *       404:
 *         description: Kullanıcı bulunamadı
 */
router.get('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const user = await db('users')
      .where({ id: req.params.id })
      .select('id', 'name', 'email', 'role', 'is_active', 'last_login', 'created_at', 'updated_at')
      .first();

    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Yeni kullanıcı oluştur
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               role: { type: string, enum: [admin, analyst, viewer] }
 *     responses:
 *       201:
 *         description: Kullanıcı oluşturuldu
 *       409:
 *         description: Email zaten kullanımda
 */
router.post('/', authenticate, authorize('admin'), auditLog('CREATE_USER'), validate(createUserSchema), async (req, res, next) => {
  try {
    const { name, email, password, role, is_active } = req.body;

    const existing = await db('users').where({ email: email.toLowerCase() }).first();
    if (existing) return res.status(409).json({ success: false, message: 'Bu email adresi zaten kullanımda.' });

    const password_hash = await bcrypt.hash(password, 12);
    const [user] = await db('users').insert({
      id: uuidv4(),
      name,
      email: email.toLowerCase(),
      password_hash,
      role,
      is_active,
      created_at: new Date(),
      updated_at: new Date(),
    }).returning(['id', 'name', 'email', 'role', 'is_active', 'created_at']);

    res.status(201).json({ success: true, message: 'Kullanıcı oluşturuldu.', data: user });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Kullanıcı güncelle
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Kullanıcı güncellendi
 */
router.put('/:id', authenticate, authorize('admin'), auditLog('UPDATE_USER'), validate(updateUserSchema), async (req, res, next) => {
  try {
    const updates = { ...req.body, updated_at: new Date() };
    if (updates.email) updates.email = updates.email.toLowerCase();

    const [user] = await db('users').where({ id: req.params.id }).update(updates)
      .returning(['id', 'name', 'email', 'role', 'is_active', 'updated_at']);

    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
    res.json({ success: true, message: 'Kullanıcı güncellendi.', data: user });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Kullanıcı sil
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Kullanıcı silindi
 *       403:
 *         description: Kendi hesabını silemezsin
 */
router.delete('/:id', authenticate, authorize('admin'), auditLog('DELETE_USER'), async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(403).json({ success: false, message: 'Kendi hesabınızı silemezsiniz.' });
    }
    const deleted = await db('users').where({ id: req.params.id }).delete();
    if (!deleted) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
    res.json({ success: true, message: 'Kullanıcı silindi.' });
  } catch (err) { next(err); }
});

module.exports = router;
