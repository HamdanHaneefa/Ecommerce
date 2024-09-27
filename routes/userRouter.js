const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const authController = require('../controllers/user/authController');
const shopController = require('../controllers/user/shopController')
const profileController = require('../controllers/user/profileController')
const passport = require('../config/passport');
const {userAuth,adminAuth} = require('../middlewares/auth')
const {upload} = require('../helpers/multers')


//PAGENOTFOUND
router.get("/pageNotFound",userController.pageNotFound)


//HOMEPAGE & AUTHENTICATIONS
router.get("/",userController.loadHomepage);
router.get("/signup",userController.loadSignup)
router.post("/signup",authController.signup)
router.post("/verify-otp",authController.verifyOtp)
router.post("/resend-otp",authController.resendOtp)
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    req.session.user = req.user._id 
    if(req.session.user){
        res.redirect('/')
    }
}); 
router.get('/login',userController.loadLogin) 
router.post('/login',authController.login) 
router.get("/logout",authController.logout)
router.get('/forgot-password',userController.loadforget)
router.post('/forgot-password',authController.forget)
router.get('/forgot-verify-otp',userController.loadforgotVerify)
router.post('/forgot-verify-otp',authController.forgotVerify) 
router.get('/change-password',userController.LoadChangePassword)
router.post('/change-password',authController.changePassword)



//SHOP
router.get('/shop',shopController.loadShop)


//PROFILE
router.get('/profile',profileController.loadProfile)
router.post('/profile/update',upload.single('profileImage'),profileController.updateProfile)
router.get('/profile/change-password', profileController.LoadChangePassword);
router.post('/profile/change-password', profileController.changePassword);
router.post('/profile/delete',profileController.deleteImage)

//ADDRESS
router.get('/address',profileController.loadAddress)
router.get('/address/add-address',profileController.loadAddAddress)
router.post('/address/add-address',profileController.addAddress)
router.get('/address/:id/remove',profileController.removeAddress)
router.post('/address/:id/edit',profileController.editAddress)

module.exports = router 