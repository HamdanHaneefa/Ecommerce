const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Address = require('../../models/addressSchema');
const Coupon = require('../../models/couponSchema');
const Product = require('../../models/productSchema');
const Offer = require('../../models/offerSchema');
const Brand = require('../../models/brandSchema');

const loadOrders = async(req, res) =>{
    try {
        const orders = await Order.find().populate('userId')
        res.render('orderinfo', { orders ,url: req.originalUrl });
    } catch (error) {
        console.log("Error occured in loadOrders",error)
        res.redirect('/admin/')
    }
}

const orderDetails = async (req,res) =>{
    try {
        const orderId = req.params.id
        const order = await Order.findById(orderId).populate('orderedItems.product')
        const user = await User.findById(order.userId);
        const address = await Address.findOne({userId:order.userId})
        const addressDetail = address.addresses.id(order.address.addressId)

        if(!orderId || !order || !user || !address || !addressDetail){
            console.log("Required all things , something missing!")
            res.redirect('/admin/orders')
        }

        let errorMessage = null;
        if (order.status === 'Cancelled') {
            errorMessage = "You can't update the status once it is&nbsp;<strong>Cancelled</strong>.";
        } else if (order.status === 'Delivered') {
            errorMessage = "You can't update the status once it is&nbsp;<strong>Delivered</strong>.";
        }  else if (order.status === 'Returned') {
            errorMessage = "You can't update the status once it is&nbsp;<strong>Returned</strong>.";
        }

        const returnRequest = order.status === 'Return Request' ? true : false;

        const orderDetails = order.orderedItems.map(item => {
            const variant = item.product.variants.id(item.variantId); 
            return {
                orderId: order._id,
                productName: item.product.productName,
                price: variant.price,
                color: variant.color,
                quantity: item.quantity,
                productPrice: variant.price*item.quantity,
                productImage: variant.images[0], 
                createdOn: variant.createdAt,
                status: order.status,
            };
        });

        res.render('orderDetails',{order, orderDetails, addressDetail, errorMessage ,returnRequest, user, url: req.originalUrl })
    
    } catch (error) {
        console.log("Error occured in orderDetails ",error)
        res.redirect('/admin/')
    }
}

const changeStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        console.log(orderId, status);
        const order = await Order.findById(orderId);
        const user = await User.findById(order.userId)

        const Status = status === 'pending' ? 'Pending' : status === 'shipped' ? 'Shipped' : status === 'delivered' ? 'Delivered' : status === 'approve' ? 'Returned' : status === 'decline' ? 'Return Cancelled' : null;

        if (!Status) {
            return res.status(400).json({ success: false, message: 'Invalid status provided.' });
        }
        console.log(Status)
        if( order.status === 'Cancelled'){
            return res.status(400).json({success:false , message:"You can't update the status once it is Returned."})
        }
        if(order.status === 'Delivered'){
            return res.status(400).json({success:false , message:"You can't update the status once it is Delivered."})
        }
        if(order.status === 'Returned'){
            return res.status(400).json({success:false , message:"You can't update the status once it is Returned."})
        }
        if(Status == 'Returned'){
            // console.log('USER TRANSACTION :',user.transaction)
            // console.log('ORDER ID :',order._id)
            let transaction = user.transaction.find(tx => tx.orderId.equals(order._id));
            console.log(transaction)
            transaction.status = true
            if(transaction.type == 'Razorpay'){
                user.wallet += transaction.amount
                transaction.status = true
            }
            console.log(transaction)
        }
        order.status = Status; 
        await order.save();
        await user.save()
        res.json({ success: true, status: Status });
        console.log(Status)
    } catch (error) {
        console.error("Error occurred in changeStatus", error);
        res.status(500).json({ success: false, message: 'An error occurred while updating the order status.' });
    }
}

// CATEGORY MANAGEMENT 
const loadCoupons = async (req,res) =>{
    try {
        const coupons = await Coupon.find({});
        res.render('coupons',{coupons,url:req.originalUrl})

    } catch (error) {
        console.log("Error occured in loadCategory",error)
        res.redirect('/admin/');
    }
}

const addCoupon = async (req,res) =>{
    try {
        const { code, discount, minPurchase , maxAmount , expirationDate} =req.body;
        console.log(code, discount, minPurchase , maxAmount , expirationDate)
        if (!code || !discount || !minPurchase || !maxAmount || !expirationDate) {
            return res.status(404).json({ success:false, error: "Required all fields " });
        }
        const couponCodePattern = /^[A-Z0-9]{5,10}$/;
        if (!couponCodePattern.test(code)) {
            return res.status(404).json({ success: false, error: "Coupon code must be 5-10 uppercase letters/numbers." });
        }

        if (isNaN(discount) || isNaN(maxAmount)) {
            return res.status(404).json({ success: false, error: "Discount and Maximum Discount must be valid numbers." });
        }
        
        if (discount <= 0 || maxAmount <= 0) {
            return res.status(404).json({ success: false, error: "Discount and Maximum Discount must be positive numbers." });
        }

        if (discount >= 100) {
            return res.status(404).json({ success: false, error: "Discount must be less than 100." });
        }

        const currentDate = new Date();
        const inputExpirationDate = new Date(expirationDate);
        if (inputExpirationDate <= currentDate) {
            return res.status(404).json({ success: false, error: "Expiration date must be in the future." });
        }

        const existingCoupon = await Coupon.findOne({ name: code });
        if (existingCoupon) {
            return res.status(400).json({ success: false, error: "Coupon with the same code already exists." });
        }

          // Create new coupon object
          const newCoupon = new Coupon({
            name: code,
            discount: discount,
            minimumPrice: minPurchase,
            maximumPrice: maxAmount,
            discount:discount,
            expireOn: inputExpirationDate
        });

        // Save the coupon to the database
        await newCoupon.save();

        // Return success message
        return res.status(200).json({ success: true, message: "Coupon added successfully!" });

    } catch (error) {
        console.log("Error occured in addCoupon",error)
        res.redirect('/admin/coupons')
    }
}

const toggleCoupon = async(req,res) =>{
    try {
        const action = req.params.action;
        const couponId = req.params.id;
        console.log(action, couponId)

        const coupon = await Coupon.findById(couponId)
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }
        
        if (action === 'deactivate' || action === 'activate') {
            coupon.isList = (action === 'activate'); 
            await coupon.save(); 
            res.status(200).json({ message: `Coupon ${action}d successfully` });
        } else {
            return res.status(400).json({ message: 'Invalid action' });
        }

    } catch (error) {
        console.log("Error occured in toggleCoupon",error)
        res.redirect('/admin/coupons');
    }
}

const deleteCoupon = async(req,res) =>{
    try {
        const couponId = req.params.id;
        const coupon = await Coupon.findByIdAndDelete(couponId)
        return res.status(200).json({ success:true });
    } catch (error) {
        console.log('Error occured in deleteCoupon',error)
        res.redirect('/admin/coupon')
    }
}

const editCoupon = async (req, res) => {
    try {
        const { code, discount, minPurchase, maxAmount, expirationDate } = req.body;
        if (!code || !discount || !minPurchase || !maxAmount || !expirationDate) {
            return res.status(404).json({ success: false, error: "All fields are required." });
        }

        const couponCodePattern = /^[A-Z0-9]{5,10}$/;
        if (!couponCodePattern.test(code)) {
            return res.status(404).json({ success: false, error: "Coupon code must be 5-10 uppercase letters/numbers." });
        }

        if (isNaN(discount) || isNaN(maxAmount)) {
            return res.status(404).json({ success: false, error: "Discount and Maximum Discount must be valid numbers." });
        }

        if (discount <= 0 || maxAmount <= 0) {
            return res.status(404).json({ success: false, error: "Discount and Maximum Discount must be positive numbers." });
        }

        if (discount >= 100) {
            return res.status(404).json({ success: false, error: "Discount must be less than 100." });
        }

        const currentDate = new Date();
        const inputExpirationDate = new Date(expirationDate);
        if (inputExpirationDate <= currentDate) {
            return res.status(404).json({ success: false, error: "Expiration date must be in the future." });
        }

        const existingCoupon = await Coupon.findOne({ name: code, _id: { $ne: req.params.id } });
        if (existingCoupon) {
            return res.status(400).json({ success: false, error: "Coupon with the same code already exists." });
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            req.params.id,
            {
                name: code,
                discount: discount,
                minimumPrice: minPurchase,
                maximumPrice: maxAmount,
                expireOn: inputExpirationDate,
            },
            { new: true }
        );

        if (updatedCoupon) {
            return res.status(200).json({ success: true, message: "Coupon updated successfully!" });
        } else {
            return res.status(404).json({ success: false, error: "Coupon not found." });
        }
    } catch (error) {
        console.log("Error occurred in editCoupon", error);
        res.redirect('/admin/coupons');
    }
};



//OFFER MANAGEMENT
const  loadOffers = async (req,res) =>{
    try {
        const brands = await Brand.find({offerPercentage: { $exists: true, $gt: 0 } })
        const products = await Product.find({offerPercentage: { $exists: true, $gt: 0 } });
        res.render('offeres',{url:req.originalUrl,brands,products});
    } catch (error) {
        console.log("Error occured in loadOffers",error)
        res.redirect('/admin/');
    }
}

const loadProductOffer = async (req,res) =>{
    try {
        const products = await Product.find({ offerPercentage: { $exists: false } })
        res.render('add-productOffer',{url:req.originalUrl,products})
    } catch (error) {
        console.log("Error occured in loadaAddOffer",error)
        res.redirect('/admin/offers');
    }
}


const loadBrandOffer = async (req,res) =>{
    try {
        const brands = await Brand.find({ offerPercentage: { $exists: false } })
        res.render('add-brandOffer',{url:req.originalUrl,brands})
    } catch (error) {   
        console.log("Error occured in loadBrandOffer",error)
        res.redirect('/admin/offers');
    }
}

const saveOffer = async (req, res) => {
    const { type, typeId, percentage } = req.body;
    try {
        console.log(type, typeId, percentage);
        
        if (percentage === undefined || percentage === null || percentage >= 100 || percentage <= 0) {
            return res.status(400).json({ message: 'Percentage must be between 0 and 100.' });
        }  
        
        if (type !== 'variant' && !typeId) {
            return res.status(400).json({ message: 'typeId is required when type is not "variant".' });
        }
        
        if (type === 'product') {
            const product = await Product.findById(typeId);
            const brand = await Brand.findOne({ name: product.brand });
            const productOffer = percentage || 0;
            const brandOffer = brand ? brand.offerPercentage || 0 : 0;
            const effectiveOffer = Math.max(productOffer, brandOffer);
            
            product.offerPercentage = productOffer;
            product.effectiveOffer = effectiveOffer;

            for (let item of product.variants) {
                item.salePrice = item.price * (1 - effectiveOffer / 100);
            }

            await product.save();
            return res.status(201).json({ message: 'Product Offer added successfully' });
        }
        
        if (type === 'brands') {
            const brand = await Brand.findById(typeId);
            if (!brand) {
                return res.status(404).json({ message: 'Brand not found' });
            }

            const brandOffer = percentage;

            brand.offerPercentage = brandOffer;
            brand.effectiveOffer = brandOffer;

            const products = await Product.find({ brand: brand.name });
            
            for (const product of products) {
                const productOffer = product.offerPercentage || 0;
                const effectiveOffer = Math.max(productOffer, brandOffer);

                product.effectiveOffer = effectiveOffer;

                for (let item of product.variants) {
                    item.salePrice = item.price * (1 - effectiveOffer / 100);
                }

                await product.save();
            }

            await brand.save();
            return res.status(201).json({ message: 'Brand Offer added successfully' });
        }
        
    } catch (error) {
        console.log("Error occurred in saveOffer", error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};


const deleteOffer = async(req, res) => {
    try {
        const { type, typeId } = req.body;
        console.log(type,typeId)
        if (type === 'product') {
            const product = await Product.findById(typeId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            product.offerPercentage = undefined;
            product.effectiveOffer = 0;

            for (let variant of product.variants) {
                variant.salePrice = variant.price;
            }

            await product.save();
            return res.status(200).json({ message: 'Product offer removed successfully' });
        }

        if (type === 'brand') {
            const brand = await Brand.findById(typeId);
            if (!brand) {
                return res.status(404).json({ message: 'Brand not found' });
            }

            const products = await Product.find({ brand: brand.name });
            
            for (let product of products) {
                product.offerPercentage = undefined;
                product.effectiveOffer = 0;

                for (let variant of product.variants) {
                    variant.salePrice = variant.price;
                }

                await product.save();
            }

            await Brand.updateOne(
                { _id: typeId },
                { $unset: { offerPercentage: "" } }
            );

            return res.status(200).json({ message: 'Brand offer removed successfully' });
        }

    } catch (error) {
        console.log("Error occurred in deleteOffer", error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};





module.exports = {
    loadOrders,
    orderDetails,
    changeStatus,
    loadCoupons,
    addCoupon,
    toggleCoupon,
    deleteCoupon,
    editCoupon,
    loadOffers,
    loadProductOffer,
    loadBrandOffer,
    saveOffer,
    deleteOffer
}