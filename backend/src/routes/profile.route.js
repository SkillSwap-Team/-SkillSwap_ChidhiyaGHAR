const express = require('express')
const router = express.Router()
const profileController = require('../controllers/profile.controller.js')
const { verifyToken, requireVerification } = require('../middleware/auth.middleware.js')
const { normalLimiter } = require('../services/rateLimitter.js')
const { updateProfileValidator } = require('../middleware/validation.js')
const multer = require('multer')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only JPEG, PNG, WebP images are allowed'))
  }
})

router.use(verifyToken)
router.use(normalLimiter)

// Profile
router.get('/', profileController.getMyProfile)
router.get('/search-users', profileController.searchUsers)
router.get('/online-users', profileController.getOnlineUsers)
router.get('/:userId', profileController.getPublicProfile)
router.put('/', updateProfileValidator, profileController.updateProfile)
router.post('/avatar', upload.single('avatar'), profileController.uploadAvatar)
router.delete('/avatar', profileController.deleteAvatar)

// Education
router.get('/education/list', profileController.getEducation)
router.post('/education', profileController.addEducation)
router.put('/education/:id', profileController.updateEducation)
router.delete('/education/:id', profileController.deleteEducation)

// Experience
router.get('/experience/list', profileController.getExperience)
router.post('/experience', profileController.addExperience)
router.put('/experience/:id', profileController.updateExperience)
router.delete('/experience/:id', profileController.deleteExperience)

// Availability
router.get('/availability/list', profileController.getAvailability)
router.post('/availability', profileController.setAvailability)
router.delete('/availability/:id', profileController.deleteAvailability)

// Follow system
router.post('/:userId/follow', profileController.followUser)
router.delete('/:userId/follow', profileController.unfollowUser)
router.get('/:userId/followers', profileController.getFollowers)
router.get('/:userId/following', profileController.getFollowing)

module.exports = router
