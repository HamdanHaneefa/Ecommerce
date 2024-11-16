const User = require("../../models/userSchema");
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema')
const Coupon = require('../../models/couponSchema');
const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');
const path = require('path')
const fs = require('fs')
const session = require("express-session");
const bcrypt = require("bcrypt");
const { overwriteMiddlewareResult } = require("mongoose");
const axios = require('axios');
const Razorpay = require('razorpay');



const loadProfile = async (req,res) =>{
    try {
        if(req.session.user){
            const userId =  req.session.user
            const users = await User.findById(userId);
            const err_msg = req.flash('err_msg');
            res.render('profile',{user:users ,err_msg,url:req.originalUrl})
        }else{
            res.redirect('/')
        }
      
    } catch (error) {
        console.log("Error occured in loadProfile",error),
        res.redirect('/')
    }
}

const updateProfile = async (req, res) => {
    try {
        const { name, phone } = req.body;
        const userId = req.session.user;

        // Validation Patterns
        const namePattern = /^[a-zA-Z\s]+$/;
        const phonePattern = /^[0-9]{10}$/;

        // Validate Name
        if (!namePattern.test(name)) {
            req.flash('err_msg', 'Invalid name. Only letters and spaces are allowed.');
            return res.redirect('/profile');
        }

        // Validate Phone
        if (!phonePattern.test(phone)) {
            req.flash('err_msg', 'Invalid phone number. It must be 10 digits.');
            return res.redirect('/profile'); 
        }

        const user = await User.findById(userId);
        user.name = name;
        user.phone = phone;

        if (req.file) {
            const file = req.file.originalname;
            const uploadDir = path.join(__dirname, '../../public/uploads/profile-Image');

            // To ensure the upload directory exists
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const filePath = path.join(uploadDir, file);
            console.log("Saving file to:", filePath);

            fs.writeFileSync(filePath, req.file.buffer);
            user.profileImage = file;
        }

        await user.save();
        return res.redirect('/profile');
    } catch (error) {
        console.log("Error occurred in updateProfile", error);
        req.flash('err_msg', 'An error occurred while updating the profile.');
        return res.redirect('/profile'); 
    }
};

const deleteImage = async (req,res) =>{
    try {
        const userId = req.session.user
        const user = await User.findById(userId);

        const uploadDir = path.join(__dirname, '../../public/uploads/profile-Image');
        const filePath = path.join(uploadDir, user.profileImage);

         // Delete the image file from the server
         if (user.profileImage && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("Deleted file:", filePath);
        }
        user.profileImage ='';
        await user.save();

        res.redirect('/profile')
        
    } catch (error) {
        console.error("Error deleting profile:", error);
        res.redirect('/profile')
    }
}

const LoadChangePassword = async (req,res) =>{
    try {
        if(req.session.user){
            const userId = req.session.user;
            const user = await User.findById(userId);
            const success_msg = req.flash('success_msg');
            const err_msg = req.flash('err_msg');
            res.render('reset-password', { success_msg, err_msg, user:userId });
        }else{
            res.redirect('/')
        }
       
    } catch (error) {
        console.log("Eroor occured in LoadChangePassword",error)
        res.redirect('/profile');
    }
}

const changePassword = async (req, res) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    
    const passPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

    try {
        if (req.session.user) {
            const userId = req.session.user;
            const user = await User.findById(userId);

            if (!currentPassword || !newPassword || !confirmNewPassword) {
                req.flash("err_msg", "All fields are required");
                return res.redirect("/profile/change-password");
            }

            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                req.flash("err_msg", "Current password is incorrect");
                return res.redirect("/profile/change-password");
            }

            if (!passPattern.test(newPassword)) {
                req.flash("err_msg", "Password must be at least 8 characters long, including one letter and one number.");
                return res.redirect("/profile/change-password");
            }

            if (newPassword !== confirmNewPassword) {
                req.flash("err_msg", "New password and confirm password do not match");
                return res.redirect("/profile/change-password");
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
            await user.save();

            req.flash("success_msg", "Password changed successfully");
            return res.redirect("/profile");

        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.log("Error occurred in changePassword", error);
        req.flash('err_msg', 'Unexpected Error');
        res.redirect('/profile/change-password');
    }
};



//ADDRESS
const loadAddress = async (req,res) =>{
    try {
        if(req.session.user){
            const userId = req.session.user;
            const user = await User.findById(userId);
            const address = await Address.findOne({ userId });
            const err_msg = req.flash('err_msg');
            const toastrMsg = req.session.toastrMsg;
            req.session.toastrMsg = null
            res.render('address',{user,address,err_msg,url:req.originalUrl,toastrMsg })
        }else{
            res.redirect('/')
        }
    } catch (error) {
        console.log("Error occured in loadAddress",error)
        res.redirect('/profile')
    }
}


const loadAddAddress = async (req,res) =>{
    try {
        if(req.session.user){
            const userId = req.session.user;
            const user = await User.findById(userId);
            const err_msg = req.flash('err_msg');
            res.render('Addaddress',{user:userId,url:req.originalUrl,err_msg})
        }else{
            res.redirect('/')
        }
    } catch (error) {
        console.log("Error occured in loadAddress",error)
        res.redirect('/')
    }
}

const addAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const { name, phone, street, city, state, zip, country } = req.body;

        const namePattern = /^[a-zA-Z\s]+$/;
        const phonePattern = /^[0-9]{10}$/;
        const zipPattern = /^[0-9]{5,10}$/;

        // Validate required fields
        if (!name || !street || !city || !state || !country) {
            req.flash("err_msg", "All fields are required.");
            console.log("Error: All fields are required.");
            return res.redirect("/address/add-address");
        }

        // Validate name format
        if (!namePattern.test(name)) {
            req.flash("err_msg", "Name can only contain letters and spaces.");
            console.log("Error: Invalid name format.");
            return res.redirect("/address/add-address");
        }

        // Validate phone number format
        if (!phonePattern.test(phone)) {
            req.flash("err_msg", "Phone number must be exactly 10 digits.");
            console.log("Error: Invalid phone number format.");
            return res.redirect("/address/add-address");
        }

        // Validate zip code format
        if (!zipPattern.test(zip)) {
            req.flash("err_msg", "Zip code must be between 5 and 10 digits.");
            console.log("Error: Invalid zip code format.");
            return res.redirect("/address/add-address");
        }

        let additionalAddress = [];
        if (zip) {
            // Adjust the URL for Nominatim API
            const url = `https://nominatim.openstreetmap.org/search?postalcode=${zip}&countrycodes=IN&format=json`;
            try {
                const response = await axios.get(url);
                const data = response.data;
        
                // Checking if API returned data
                if (data && data.length > 0) {
                    const { display_name: placeName, lon: longitude, lat: latitude } = data[0];
                    console.log(placeName, longitude, latitude);
                    additionalAddress.push({ placeName, longitude, latitude });
                } else {
                    req.flash("err_msg", "No places found for this ZIP code.");
                    return res.redirect("/address/add-address");
                }
            } catch (apiError) {
                console.log("Error fetching data from Nominatim API:", apiError.message);
                req.flash("err_msg", "Invalid ZIP code. Please try again.");
                return res.redirect("/address/add-address");
            }
        }
        
        const { placeName = '', longitude = '', latitude = '' } = additionalAddress[0] || {};

        // Create the new address object
        const newAddress = {
            name,
            phone,
            street,
            city,
            state,
            zipcode: zip,
            country,
            placeName,
            longitude,
            latitude
        };
        console.log(newAddress)
        let userAddress = await Address.findOne({ userId });

        if (!userAddress) {
            userAddress = new Address({
                userId,
                addresses: [newAddress]
            });
        } else {
            const addressExists = userAddress.addresses.some(
                addr => addr.name === newAddress.name
            );
            
            if (addressExists) {
                req.flash("err_msg", "This address name already exists.");
                return res.redirect("/address/add-address");
            }
            userAddress.addresses.push(newAddress);
        }

        // Save the updated user address
        await userAddress.save();
        console.log("Address saved succefully")
        req.flash("success_msg", "Address added successfully!");
        return res.redirect('/address');

    } catch (error) {
        console.log("Error occurred in addAddress:", error);
        req.flash("err_msg", "An unexpected error occurred. Please try again.");
        return res.redirect('/address/add-address');
    }
};




const removeAddress = async (req, res) => {
    try {
        if (req.session.user) {
            const addressId = req.params.id;
            const userId = req.session.user;

            const result = await Address.updateOne(
                { userId: userId },
                { $pull: { addresses: { _id: addressId } } }
            );

            if (result.modifiedCount === 0) {
                return res.status(404).send("Address not found or already removed");
            }

            res.status(200).json({ message: 'Address removed successfully' });
        } else {
            res.status(401).json({ message: 'Unauthorized' });
        }
    } catch (error) {
        console.log("Error occurred in deleteAddressById", error);
        res.status(500).json({ message: 'Server error' });
    }
};


const editAddress = async (req, res) => {
    try {
        if (req.session.user) {
            const userId = req.session.user;
            const addressId = req.params.id;
            const { name, phone, street, city, state, zipcode, country } = req.body;

            const namePattern = /^[a-zA-Z\s]+$/;
            const phonePattern = /^[0-9]{10}$/;
            const zipPattern = /^[0-9]{5,10}$/;
            
            // Validation for address fields
            if (!name || !zipcode || !city || !state || !country) {
                console.log("Validation Error: All fields are required.");
                req.session.toastrMsg = "All fields are required."; 
                return res.redirect("/address");
            }

            if (!namePattern.test(name)) {
                console.log("Validation Error: Name should not contain Numbers.");
                req.session.toastrMsg = "Name should only contain letters and spaces."; 
                return res.redirect('/address');
            }

            if (!phonePattern.test(phone)) {
                console.log("Validation Error: Phone number must be exactly 10 digits.");
                req.session.toastrMsg = "Phone number must be exactly 10 digits."; 
                return res.redirect("/address");
            }

            if (!zipPattern.test(zipcode)) {
                console.log("Validation Error: Zip code must be between 5 and 10 digits.");
                req.session.toastrMsg = "Zip code must be between 5 and 10 digits."; 
                return res.redirect("/address");
            }

            const result = await Address.updateOne(
                { userId: userId, 'addresses._id': addressId },
                { 
                    $set: {
                        'addresses.$.name': name,
                        'addresses.$.phone': phone,
                        'addresses.$.street': street,
                        'addresses.$.city': city,
                        'addresses.$.state': state,
                        'addresses.$.zip': zipcode,
                        'addresses.$.country': country,
                    } 
                }
            );

            if (result.modifiedCount === 0) {
                return res.status(404).send("Address not found or no changes made");
            }
            
            res.redirect('/address');
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.log("Error occurred in editAddress", error);
        res.redirect('/address');
    }
}

const orders = async (req,res) =>{
    try {
      if(req.session.user){
        
        const userId = req.session.user; 
        const user = await User.findById(userId)
        const orders = await Order.find({}).sort({ createdAt: -1 })
        .populate({ path: 'orderedItems.product', model: 'Product' })

        res.render('orders', { orders, err_msg: null,user, url:req.originalUrl}); 
  
      }else{
        req.session.errorMessage = "Oops! It seems you need to log in again.";
        return res.redirect("/");
      }
    } catch (error) {
      console.log("Error occured in orders",error)
      res.redirect('/')
    }
  }


  const orderDetails = async (req, res) => {
    try {
        if (req.session.user) {
            const user = await User.findById(req.session.user);
            const orderId = req.params.id;

            const order = await Order.findById(orderId)
            .populate({ path: 'orderedItems.product', model: 'Product' })
            console.log("ORDER :",order)
            const addressDetail = order.address
            console.log('ADDRESS DETAIL :',addressDetail)
            
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
                    productId:item._id
                };
            });

            // console.log('ORDER DETAILS : ',orderDetails);

            res.render('order-details', {    
                user, 
                orderDetails,
                addressDetail,
                order,
                orderId,
                url: req.originalUrl
            });

        } else {
            req.session.errorMessage = "Oops! It seems you need to log in again.";
            res.redirect('/');
        }
    } catch (error) {
        console.log("Error occurred in orderDetails", error);
        res.redirect('/orders');
    }
};
// Razorpay instance 
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID, 
    key_secret: process.env.RAZORPAY_SECRET_KEY, 
})

const returnOrder = async (req, res) => {
    try {
        if (req.session.user) {
            const { orderId } = req.body;
            const order = await Order.findById(orderId).populate('orderedItems.product');

            if (!order) {
                return res.status(404).json({ success: false, message: "Order not found." });
            }

            const user = await User.findById(req.session.user);

            // Cancel order
            if (order.status === 'Pending') {
                for (let item of order.orderedItems) {
                    const product = item.product;
                    const variant = product.variants.id(item.variantId);
                    variant.stock += item.quantity;

                    // Update order status
                    order.status = 'Cancelled';

                    const transaction = {
                        type: order.paymentMethod,
                        amount: order.finalAmount,
                        orderId: order._id,
                        status: true
                    };

                    user.wallet += (order.paymentMethod === 'Cash On Delivery') ? 0 : order.finalAmount;
                    user.transaction = user.transaction || [];
                    user.transaction.push(transaction);

                    // Save changes
                    await product.save();
                    await order.save();
                    await user.save();
                    return res.status(200).json({ success: true, message: "Your order has been cancelled. Status updates are not available at this stage." });
                }

            }

            // Return order
            if (order.status === 'Delivered') {
                order.status = 'Return Request';

                const transaction = {
                    type: order.paymentMethod,
                    amount: order.finalAmount,
                    status: false,
                    orderId: order._id
                };
                user.transaction = user.transaction || [];
                user.transaction.push(transaction);

                // Save changes
                await order.save();
                await user.save();

                return res.status(200).json({ success: true, message: 'Return request initiated successfully.' });
            }

            if (order.status === 'Returned') {
                return res.status(400).json({ success: false, message: "Your order is currently in a return request. Status updates are not available at this stage." });
            }

            if (order.status === 'Failed') {
                // Check the quantity exists
                for (const item of order.orderedItems) {
                    const product = await Product.findById(item.product);
                    const variant = product.variants.id(item.variantId); 
                    console.log( variant.stock , item.quantity)

                    if (variant && variant.stock < item.quantity || !variant.isActive ) {
                        order.status = 'Cancelled';
                        order.save();
                        return res.status(400).json({ success: false,   message: "Sorry, this product is currently unavailable or has been deactivated." });
                    }

                    if(variant.price !== item.price){
                        order.status = 'Cancelled';
                        order.save();
                        return res.status(400).json({ success: false, message: "We're sorry, but this product is no longer available and the price has been changed. Your order has been canceled."
                        });                        
                    }
                   
                  }
                const options = {
                    amount: Math.round(order.finalAmount * 100), 
                    currency: 'INR',
                    receipt: `receipt_${order._id}`,
                    notes: {
                        userId: req.session.user, 
                        orderId: order._id, 
                    },
                }
                // Create Razorpay order
                try {
                    const razorpayOrder = await razorpay.orders.create(options);
                    order.paymentMethod = 'Razorpay';
                    order.paymentStatus = false;
                    order.orderId = razorpayOrder.id;
                    // Save order
                    await order.save();
                    return res.status(200).json({
                        success: true,
                        message: "Order placed successfully.",
                        order,
                        razorpayOrder,
                        razorpayOrderId: razorpayOrder.id
                    });
                } catch (error) {
                    console.error("Error creating Razorpay order:", error);
                    return res.status(500).json({ success: false, error: "Failed to create Razorpay order." });
                }
            }

        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.log("Error occurred in returnOrder:", error);
        res.redirect('/orders');
    }
};


const loadCoupon = async (req,res) =>{
    try {
        if(req.session.user){
            const userId = req.session.user
            const user = User.findById(userId)
            const coupons = await Coupon.find({ isList: true, userId: { $ne: userId } });
            res.render('coupon',{user,url:req.originalUrl,coupons});
        }else{
            req.session.errorMessage = "Oops! It seems you need to log in again.";
            res.redirect('/');
        }
    } catch (error) {
        console.log("Error occured in loadCoupon",error)
        res.redirect('/profile')
    }
}



const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        console.log('HEHEHE')
        if (!couponCode || typeof couponCode !== 'string' || couponCode.length < 3) {
            return res.status(400).json({ message: 'Invalid coupon code format.' });
        }

        const coupon = await Coupon.findOne({ name: couponCode });
        if (!coupon) {
            return res.status(400).json({ message: 'Coupon code does not exist.' });
        }

        const currentDate = new Date();
        if (coupon.expireOn < currentDate) {
            return res.status(400).json({ message: 'Coupon has expired.' });
        }

        if (!coupon.isList) {
            return res.status(400).json({ message: 'Coupon is not valid.' });
        }

        const userId = req.session.user;
        const cart = await Cart.findOne({ userId }).lean();
        const user = await User.findById(userId);

        //Varaint details
        for(let item of cart.items){
            const product = await Product.findById(item.productId)
            const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
            if (variant) {
            item.variantId = variant;
            item.totalPrice = variant.salePrice * item.quantity
            }
        }

        const cartTotal = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);
        console.log('CartTotal :',cartTotal)

        if (!cart) {
            return res.status(400).json({ message: 'Cart not found.' });
        }

        if (cartTotal >= coupon.maximumPrice) {
            return res.status(400).json({ message: `Minimum purchase of ₹${coupon.maximumPrice} required to use this coupon.` });
        }

        if (cartTotal <= coupon.minimumPrice) {
            return res.status(400).json({ message: `Minimum purchase of ₹${coupon.minimumPrice} required to use this coupon.` });
        }

        if (cart.couponRedeemed && cart.couponRedeemed.status) {
            if (cart.couponRedeemed.coupon === couponCode) {
                return res.status(400).json({ message: 'Coupon has already been redeemed for this cart.' });
            }
        }
        

        //Varaint details
        for (let item of cart.items) {
            const product = await Product.findById(item.productId)
            const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
            if (variant) {
                item.variantId = variant;
                item.totalPrice = variant.salePrice * item.quantity
            }
        }

        // Calculate totals
        const subtotal = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);
        const discountAmount = Math.floor((subtotal * coupon.discount) / 100);

        console.log('Discount amount :',discountAmount)

        if (coupon.userId.includes(userId)) {
            return res.status(400).json({ message: 'Coupon has already been redeemed by this user.'});
        } 

        // Save coupon data to session
        req.session.couponRedeemed = {
            status: true,
            coupon: couponCode,
            discountAmount
        };

        return res.status(200).json({ message: 'Coupon applied successfully!' });

    } catch (error) {
        console.log("Error occurred in applyCoupon", error);
        res.redirect('/cart/checkout');
    }
};


const deleteCoupon = async (req,res) =>{
    try {
        if(req.session.user){
            req.session.couponRedeemed = null
            return res.status(200).json({success:true})
        }else{
            req.session.errorMessage = "Oops! It seems you need to log in again.";
            res.redirect('/');
        }  
    } catch (error) {
        console.log("Error occured in deleteCoupon",error)
        res.redirect('/cart/checkout')
    }
}

const loadWallet = async(req,res) =>{
    try {
        if(req.session.user){
            const user = await User.findById(req.session.user)
            res.render('wallet', {
                walletBalance: user.wallet,
                transactions: user.transaction,
                user,
                url:req.originalUrl
            });

        }else{
            req.session.errorMessage = "Oops! It seems you need to log in again.";
            res.redirect('/');
        }
    } catch (error) {
        console.log("Error occured in loadWallet",error)
        res.redirect('/profile')
    }
}

module.exports ={
    loadProfile,
    updateProfile, 
    LoadChangePassword,
    changePassword,
    loadAddress,
    addAddress,
    loadAddAddress,
    removeAddress,
    editAddress,
    deleteImage,
    orders,
    orderDetails,
    returnOrder,
    applyCoupon,
    deleteCoupon,
    loadCoupon,
    loadWallet
}