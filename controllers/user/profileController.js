const User = require("../../models/userSchema");
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema')
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
        const { name, email, phone } = req.body;
        const userId = req.session.user;

        // Validation Patterns
        const namePattern = /^[a-zA-Z\s]+$/;
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const phonePattern = /^[0-9]{10}$/;

        // Validate Name
        if (!namePattern.test(name)) {
            req.flash('err_msg', 'Invalid name. Only letters and spaces are allowed.');
            return res.redirect('/profile');
        }

        // Validate Email
        if (!emailPattern.test(email)) {
            req.flash('err_msg', 'Invalid email format.');
            return res.redirect('/profile');
        }

        // Validate Phone
        if (!phonePattern.test(phone)) {
            req.flash('err_msg', 'Invalid phone number. It must be 10 digits.');
            return res.redirect('/profile'); 
        }

        const user = await User.findById(userId);
        user.name = name;
        user.email = email;
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
            res.redirect('/address');
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.log("Error occurred in deleteAddressById", error);
        res.redirect('/address');
    }
}

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
        

        const orderDetails = orders.map(order => {
        return {
          items: order.orderedItems.map(item => {
           
            const variant = item.product.variants.id(item.variantId);
            
            return {
              productName: item.product.productName,
              color:variant.color,
              quantity: item.quantity,
              productPrice: variant.price,
              productImage : variant.images[0],
              createdOn: variant.createdAt,
              status: item.status
            };
          })
        };
      });

      console.log('ORDERED DETAILS:', orderDetails[0]);


        res.render('orders', { orderDetails, err_msg: null,user, url:req.originalUrl}); 
  
      }else{
        req.session.errorMessage = "Oops! It seems you need to log in again.";
        return res.redirect("/");
      }
    } catch (error) {
      console.log("Error occured in orders",error)
      res.redirect('/')
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
    orders
}