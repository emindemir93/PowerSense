const router = require('express').Router();
const Joi = require('joi');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const auditLog = require('../middleware/audit.middleware');

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Geçerli bir email adresi girin.',
    'any.required': 'Email adresi zorunludur.',
  }),
  password: Joi.string().min(6).required().messages({
    'any.required': 'Şifre zorunludur.',
  }),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Yeni şifre en az 8 karakter olmalıdır.',
      'string.pattern.base': 'Şifre büyük/küçük harf ve rakam içermelidir.',
    }),
});

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Kimlik doğrulama işlemleri
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Kullanıcı girişi
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Başarılı giriş
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Hatalı kimlik bilgileri
 *       422:
 *         description: Doğrulama hatası
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Access token yenile
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token yenilendi
 *       401:
 *         description: Geçersiz refresh token
 */
router.post('/refresh', validate(refreshSchema), authController.refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Çıkış yap
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Çıkış başarılı
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Mevcut kullanıcı bilgisi
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Kullanıcı bilgileri
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Yetkisiz
 */
router.get('/me', authenticate, authController.me);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Şifre değiştir
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Şifre güncellendi
 *       400:
 *         description: Mevcut şifre hatalı
 */
router.post('/change-password', authenticate, auditLog('CHANGE_PASSWORD'), validate(changePasswordSchema), authController.changePassword);

module.exports = router;
