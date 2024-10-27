const User = require("../../models/userSchema");
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema')
const Coupon = require('../../models/couponSchema');
const Cart = require('../../models/cartSchema');
const path = require('path')
const fs = require('fs')
const session = require("express-session");
const bcrypt = require("bcrypt");
const { overwriteMiddlewareResult } = require("mongoose");



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
        if (!name || !street || !city || !state || !country ) { 
            req.flash("err_msg", "All fields are required.");
            console.log("Error in all fields");
            return res.redirect("/address/add-address");
        }

        // Validate name format
        if (!namePattern.test(name)) {
            req.flash("err_msg", "Name can only contain letters and spaces.");
            console.log("Error in namePattern");
            return res.redirect("/address/add-address");
        }

        // Validate phone number format
        if (!phonePattern.test(phone)) {
            req.flash("err_msg", "Phone number must be exactly 10 digits.");
            console.log("Error in phonePattern");
            return res.redirect("/address/add-address");
        }

        // Validate zip code format
        if (!zipPattern.test(zip)) {
            req.flash("err_msg", "Zip code must be between 5 and 10 digits.");
            console.log("Error in zipPattern");
            return res.redirect("/address/add-address");
        }


        const newAddress = {
            name,
            phone,
            street,
            city,
            state,
            zipcode: zip, 
            country
        };

        let userAddress = await Address.findOne({ userId });

        if (!userAddress) {
            userAddress = new Address({
                userId,
                addresses: [newAddress] 
            });
        } else {
            userAddress.addresses.push(newAddress);
        }

        // Save the userAddress
        const savedAddress = await userAddress.save();
        return res.redirect('/address')
        
    } catch (error) {
        console.log("Error occurred in addAddress", error);
        res.redirect('/')
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
        const orders = await Order.find({})
        .populate({ path: 'orderedItems.product', model: 'Product' })     
        console.log(orders)

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
            
            const address = await Address.findOne({userId:order.userId})
            const addressDetail = address.addresses.id(order.address)

            
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

            console.log('ORDER DETAILS : ',orderDetails);

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

const returnOrder = async (req,res) =>{
    try {
        if(req.session.user){
            const {orderId} = req.body
            const order = await Order.findById(orderId)
            if(order.status === 'Returned'){
                return res.status(400).json({success:false , message:"Your order is currently in a return request. Status updates are not available at this stage."})
            }
            order.status = 'Return Request';
            order.save();
            return res.json({success:true});  
        }else{
            res.redirect('/')
        }
    } catch (error) {
        console.log("Error occured in cancelOrder",error)
        res.redirect('/orders')
    }
}

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
        const cart = await Cart.findOne({ userId });
        const user = await User.findById(userId);

       

        if (!cart) {
            return res.status(400).json({ message: 'Cart not found.' });
        }

        if (cart.cartTotal >= coupon.maximumPrice) {
            return res.status(400).json({ message: `Minimum purchase of ₹${coupon.maximumPrice} required to use this coupon.` });
        }

        if (cart.cartTotal <= coupon.minimumPrice) {
            return res.status(400).json({ message: `Minimum purchase of ₹${coupon.minimumPrice} required to use this coupon.` });
        }

        if (cart.couponRedeemed && cart.couponRedeemed.status) {
            if (cart.couponRedeemed.coupon === couponCode) {
                return res.status(400).json({ message: 'Coupon has already been redeemed for this cart.' });
            }
        }

        const discountAmount = (cart.cartTotal * coupon.discount) / 100;
        cart.finalAmount = cart.cartTotal - discountAmount;
        if (coupon.userId.includes(userId)) {
            return res.status(400).json({ message: 'Coupon has already been redeemed by this user.' });
        } 


        cart.couponRedeemed = {
            status: true,
            coupon: couponCode
        };

        cart.discount = discountAmount;
        await cart.save();
        return res.status(200).json({ message: 'Coupon applied successfully!' });

    } catch (error) {
        console.log("Error occurred in applyCoupon", error);
        res.redirect('/cart/checkout');
    }
};


const deleteCoupon = async (req,res) =>{
    try {
        const userId = req.session.user;
        const cart = await Cart.findOne({userId:userId})
        console.log(cart)   
        cart.couponRedeemed.status = 'false';
        cart.discount = 0;
        cart.finalAmount = cart.cartTotal
        cart.save();
        return res.status(200).json({success:true})
    } catch (error) {
        console.log("Error occured in deleteCoupon",error)
        res.redirect('/cart/checkout')
    }
}

const loadWallet = async(req,res) =>{
    try {
        if(req.session.user){
            const user = await User.findById(req.session.user)
            res.render('wallet',{user,url:req.originalUrl})


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