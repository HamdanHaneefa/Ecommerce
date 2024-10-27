const express = require('express')
const router = express.Router();
const adminController = require('../controllers/admin/adminController')
const authController = require('../controllers/admin/authController')
const customerController = require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController')
const productController = require('../controllers/admin/productController')
const orderController = require('../controllers/admin/orderController');
const {userAuth,adminAuth} = require('../middlewares/auth')
const {upload} = require('../helpers/multers')



//PAGE ERROR
router.get('/pageError',adminController.pageNotFound)


//AUTHENTICATION
router.get('/login',adminController.loadLogin)
router.post('/login',authController.login)
router.get('/',adminAuth,adminController.loadDashboard)
router.get('/logout',authController.logout)


//CUSTOMER
router.get('/users',adminAuth,customerController.customerInfo)
router.get('/blockCustomer',adminAuth,customerController.customerUnblocked);
router.get('/unblockCustomer',adminAuth,customerController.customerBlocked)


//CATEGORY
router.get('/category',adminAuth,categoryController.categoryInfo)
router.post('/addBrand',adminAuth,categoryController.addBrand)
router.post('/changeStatus',adminAuth,categoryController.changeStatus)
router.post('/editBrand',adminAuth,categoryController.editBrand)
router.post('/deleteBrand',adminAuth,categoryController.deleteBrand)


//PRODUCT
router.get('/product',adminAuth,productController.productInfo)
router.get('/addProducts',adminAuth,productController.getProductAddPage)
router.post('/addProducts',adminAuth,upload.any(),productController.addProducts)
router.post('/add-products', adminAuth, upload.array('files'), productController.addProducts);
router.get('/blockProduct',adminAuth,productController.productUnblocked)
router.get('/unblockProduct',adminAuth,productController.productBlocked)
router.get('/deleteProduct/:id',adminAuth, productController.deleteProduct);
router.post('/updateProduct/:id',adminAuth,productController.productUpdate)


//PRODUCT VARIENT
router.get('/product-varient/:id', adminAuth, productController.loadVariant);
router.post('/product-varient/:id',adminAuth,upload.array('variantImages'),productController.addVarient);
router.get('/toggleVariant/:id', adminAuth, productController.toggleVariant);
router.get('/deleteVariant/:id',adminAuth,productController.deleteVariant)
router.post('/updateVariant',adminAuth,productController.editVariant)


//ORDERS
router.get('/orders', adminAuth,orderController.loadOrders);
router.get('/order-details/:id',adminAuth,orderController.orderDetails);
router.post('/update-status',adminAuth,orderController.changeStatus)


//COUPONS 
router.get('/coupons',adminAuth,orderController.loadCoupons)
router.post('/coupons/add-coupon',adminAuth,orderController.addCoupon)
router.post('/toggleCoupon/:action/:id', adminAuth, orderController.toggleCoupon);
router.delete('/coupons/:id', adminAuth, orderController.deleteCoupon);
router.post('/coupon/edit-coupon',adminAuth, orderController.editCoupon)


//OFFERS
router.get('/offers',adminAuth,orderController.loadOffers)
router.get('/add-product-offer',adminAuth,orderController.loadProductOffer)
router.get('/add-brand-offer',adminAuth,orderController.loadBrandOffer)
router.post('/saveOffer',adminAuth,orderController.saveOffer)
router.delete('/deleteOffer',adminAuth,orderController.deleteOffer)




module.exports = router;