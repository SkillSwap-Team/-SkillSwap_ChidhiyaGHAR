const express = require('express')
const router = express.Router()
const skillsController = require('../controllers/skills.controller.js')
const { verifyToken, requireVerification } = require('../middleware/auth.middleware.js')
const { requireAdmin } = require('../middleware/rbac.middleware.js')
const { normalLimiter } = require('../services/rateLimitter.js')
const { addSkillValidator, addWantedSkillValidator } = require('../middleware/validation.js')

router.use(normalLimiter)

// ✅ Public: categories and skills
router.get('/categories', skillsController.getCategories)
router.get('/categories/:categoryId', skillsController.getCategoryWithSkills)
router.get('/', skillsController.getAllSkills)
router.get('/all', skillsController.getAllSkills)
router.get('/search', skillsController.searchSkills)
router.get('/:skillId', skillsController.getSkillById)

// ✅ Authenticated: user skills
router.use(verifyToken)
router.post('/custom', skillsController.createCustomSkill)

// offered skills (both styles supported)
router.get('/user/offered', skillsController.getMyOfferedSkills)
router.get('/offered', skillsController.getMyOfferedSkills)
router.post('/user/offered', addSkillValidator, skillsController.addOfferedSkill)
router.post('/offered', addSkillValidator, skillsController.addOfferedSkill)
router.put('/user/offered/:id', skillsController.updateOfferedSkill)
router.put('/offered/:id', skillsController.updateOfferedSkill)
router.delete('/user/offered/:id', skillsController.removeOfferedSkill)
router.delete('/offered/:id', skillsController.removeOfferedSkill)

// wanted skills (both styles supported)
router.get('/user/wanted', skillsController.getMyWantedSkills)
router.get('/wanted', skillsController.getMyWantedSkills)
router.post('/user/wanted', addWantedSkillValidator, skillsController.addWantedSkill)
router.post('/wanted', addWantedSkillValidator, skillsController.addWantedSkill)
router.put('/user/wanted/:id', skillsController.updateWantedSkill)
router.put('/wanted/:id', skillsController.updateWantedSkill)
router.delete('/user/wanted/:id', skillsController.removeWantedSkill)
router.delete('/wanted/:id', skillsController.removeWantedSkill)

// ✅ Admin: skill verification and management
router.post('/admin/create', requireAdmin, skillsController.createSkill)
router.put('/admin/:skillId/verify', requireAdmin, skillsController.verifySkill)
router.put('/admin/:skillId', requireAdmin, skillsController.updateSkill)

module.exports = router
