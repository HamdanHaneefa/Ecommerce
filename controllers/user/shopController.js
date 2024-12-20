const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Brand = require("../../models/brandSchema");
const Coupon = require("../../models/couponSchema");
const path = require('path');
const fs = require('fs');
const env = require("dotenv").config();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');


const loadShop = async (req, res) => {
  try {
    const query = req.query.query;
    const { sort, brandSort, cSort, tSort } = req.query;
    const page = parseInt(req.query.page) || 1;  // Current page
    const limit = 9;  // Products per page
    const skip = (page - 1) * limit;  // Calculate skip value
    
    let queryConditions = { isActive: true };
    let products;
    const brands = await Brand.find({ isActive: true }).lean();

    // BRAND SORTING
    if (brandSort) {
      let brand = await Brand.findById(brandSort);
      queryConditions = { ...queryConditions, brand: brand.name };
    }

    // CONNECTION SORTING
    if (cSort) {
      queryConditions = { ...queryConditions, connectionType: cSort };
    }

    // TYPE SORTING
    if (tSort) {
      queryConditions = { ...queryConditions, type: tSort };
    }

    // SEARCHING
    if (query) {
      const searchRegex = new RegExp(query, "i");
      queryConditions = {
        ...queryConditions,
        $or: [
          { productName: { $regex: searchRegex } },
          { "brand.name": { $regex: searchRegex } },
          { "variants.description": { $regex: searchRegex } },
        ],
      };
    }

    // Get total count for pagination
    const totalProducts = await Product.countDocuments(queryConditions);
    const totalPages = Math.ceil(totalProducts / limit);

    // Get products with pagination
    products = await Product.find(queryConditions)
      .populate("brand")
      .skip(skip)
      .limit(limit);

    // PRICE AND OTHERS SORTING
    if (sort === "priceHigh") {
      products.sort((a, b) => b.price - a.price);
    } else if (sort === "priceLow") {
      products.sort((a, b) => a.price - b.price);
    } else if (sort === "newArrivals") {
      products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sort === "aToZ") {
      products.sort((a, b) => a.productName.localeCompare(b.productName));
    } else if (sort === "zToA") {
      products.sort((a, b) => b.productName.localeCompare(a.productName));
    } else if (sort === "default") {
      return res.redirect("/shop");
    }

    let errorMessage = req.session.blockUser || null;
    let user = null;
    
    if (req.session.blockUser) {
        req.session.blockUser = null;
    }
    
    if (req.session.user) {
        user = await User.findById(req.session.user);
        if (user?.isBlocked) {
            req.session.blockUser = 'User account is blocked.';
            req.session.user = null;
            return res.redirect('/shop');
        }
    }

    res.render("shop", {
      products,
      user,
      brands,
      query,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      lastPage: totalPages,
      sort,
      brandSort,
      cSort,
      tSort,
      errorMessage
    });

  } catch (error) {
    console.error("Error occurred in loadShop:", error);
    res.redirect("/");
  }
};


const productInfo = async (req, res) => {
  try {
    const productId = req.params.id;
    const variantId = req.query.variant;
    const product = await Product.findById(productId);
    let variant = null;

    if (variantId) {
      variant = product.variants.find((v) => v._id.toString() === variantId);
    }

    const relatedproducts = await Product.find({
      isActive: true,
      brand: product.brand,
      _id: { $ne: productId },
    });

    let user = null;
    let isInWishlist = false;

    if (req.session.user) {
      const userId = req.session.user;
      user = await User.findById(userId);
      
      for (let item of user.wishlist) {
        if (
          item.product.toString() === productId.toString() && 
          item.variantId.toString() === (variantId || '').toString()
        ) {
          isInWishlist = true;
          break;
        }
      }
    }

    if (req.xhr) {
      let active;
      const effectiveOffer = product.effectiveOffer
      isInWishlist ? active = 'remove' : active = 'add';
      return res.json({ variant,isInWishlist ,active,user , effectiveOffer });
    }
   
    res.render("product-info", { user, product, variant, relatedproducts ,isInWishlist});
  } catch (error) {
    console.log("Error occurred in productInfo:", error);
    res.redirect("/");
  }
};

const addCart = async (req, res) => {
  try {
    if (req.session.user) {
      const { productId, variantId, quantity } = req.body;

      const quantityNum = parseInt(quantity, 10);

      const userId = req.session.user;

      //Quantity Check
      if (!quantityNum || quantityNum <= 0) {
        return res.status(400).json({ error: "Quantity must be greater than 0." })
      }

      //Variant Check
      if (!variantId || !productId) {
        if (!variantId) {
          return res.status(400).json({ error: "Please select a variant." });
        } else {
          return res.redirect("/shop");
        }
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found." });
      }

      //Variant 
      const variant = product.variants.id(variantId);
 

      let cart = await Cart.findOne({ userId });
      if (!cart) {
        cart = new Cart({ userId, items: [] });
      }

      const existingItemIndex = cart.items.findIndex(
        (item) =>
          item.productId.toString() === productId.toString() &&
          item.variantId.toString() === variantId.toString()
      );
       

      if (existingItemIndex > -1) {
        const currentQuantity = Number(cart.items[existingItemIndex].quantity);
        const newTotalQuantity = currentQuantity + quantityNum;
        if (newTotalQuantity > variant.stock) {
          return res.status(400).json({ error: "Quantity exceeds stock available." });
        }

        if (newTotalQuantity > 6) {
          return res.status(400).json({error: "You cannot add more than 6 units of this product." });
        }

        cart.items[existingItemIndex].quantity = newTotalQuantity;
        cart.items[existingItemIndex].totalPrice = variant.price * newTotalQuantity;
      } else {
        if (quantityNum > variant.stock) {
          return res.status(400).json({ error: "Quantity exceeds stock available." });
        }

        if (quantityNum > 6) {
          return res.status(400).json({error: "You cannot add more than 6 units of this product." });
        }

        //Cart push
        cart.items.push({
          productId,
          variantId,
          quantity: quantityNum,
        });
      }

      await cart.save();

      req.session.successMsg = "Product added to cart successfully";
      res.status(200).json({success: "Product added to cart successfully!",redirectUrl: "/cart"});
    } else {
      res.status(400).json({ error: "User must be logged in first." });
    }
  } catch (error) {
    console.log("Error occurred in addCart:", error);
    res.status(500).json({ error: "An error occurred while adding the product to the cart."});
  }
};

const loadCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    if (req.session.user) {
      let cart = await Cart.findOne({ userId })
      .populate("items.productId")
      .lean();

        if (user?.isBlocked) {
          req.session.user = null;
          req.session.blockUser = 'User account is blocked.';
          return res.redirect('/shop')
        }

      const successMsg = req.session.successMsg ? req.session.successMsg : null;
      req.session.successMsg = null;
      
      
      if (!cart) {
        return res.render("cart", {
          cartItems: [],  
          subtotal: 0,
          delivery: 0,
          discount: 0,
          finalAmount: 0,
          total: 0,
          user,
          successMsg,
        });
      }

      //To Find the Variant Details
      for (const item of cart.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
          if (variant) {
            item.variantId = variant;
            item.totalAmount = variant.salePrice * item.quantity
          }
        }
      }
      

      // Calculate totals
      let subtotal = cart.items.reduce( 
        (acc, item) => acc + item.variantId.salePrice * item.quantity,
        0
      );
      let discount = 0;
      let delivery = 0;
      let finalAmount = subtotal - discount + delivery;
    
      res.render("cart", {
        cartItems: cart.items,
        subtotal,
        delivery,
        discount,
        finalAmount,
        user,
        successMsg,
      });

    } else {
      req.session.errorMessage = "You need to log in to view your cart.";
      res.redirect("/");
    }
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).send("Internal Server Error");
  }
};

const deleteProduct = async (req, res) => {
  try {
    if (req.session.user) {
      const variantId = req.params.id;
      const userId = req.session.user;
      const cart = await Cart.findOneAndUpdate(
        { userId: userId },
        { $pull: { items: { variantId: variantId } } }
      );

      if (!cart) {
        return res.status(404).send("Cart not found");
      }

      await cart.save();
      res.json({ success: true });
    } else {
      res.redirect("/");
    }
  } catch (error) {
    console.log("Error occured in deleteProduct", error);
    res.redirect("/shop");
  }
};

const updateQuantity = async (req, res) => {
  try {
    const { variantId, action } = req.body;
    const userCart = await Cart.findOne({ userId: req.session.user }).lean();

    //To Find the Variant Details
    for (const item of userCart.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
        if (variant) {
          item.variantId = variant;
        }
      }
    }
    
    //Validations
    if (!userCart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    const itemIndex = userCart.items.findIndex(
      (item) => item.variantId._id.toString() === variantId.toString()
    );
    if (itemIndex > -1) {
      const cartItem = userCart.items[itemIndex];

      if (action === "increment") {
        cartItem.quantity += 1;
      } else if (action === "decrement") {
        cartItem.quantity -= 1;
      }

      if (cartItem.quantity <= 0) {
        return res.json({ success: false, error: "quantity can't be 0" });
      } 

      if (cartItem.quantity > cartItem.variantId.stock) {
        return res.json({ success: false, error: "stock unavailable" });
      }

      if (cartItem.quantity >= 7) {
        return res.json({ success: false, error: "Max quantity" });
      } 

      // Calculate item total price
      const pricePerUnit = cartItem.variantId.salePrice; 
      cartItem.totalPrice = cartItem.quantity * pricePerUnit;
        

      const finalAmount = userCart.items.reduce(
        (acc, item) => acc + (item.variantId.salePrice * item.quantity),
        0
      );


      // Update only the quantity in the database
      await Cart.updateOne(
        { _id: userCart._id, "items._id": cartItem._id },
        { $set: { "items.$.quantity": cartItem.quantity } }
      );  

      res.status(200).json({
        success: true,
        totalAmount: cartItem.totalPrice,
        quantity: cartItem.quantity,
        finalAmount,
        message: "Quantity updated",
      });
      
    } else {
      res
        .status(404)
        .json({ success: true, message: "Item not found in cart" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: true, message: "Error updating quantity" });
  }
};

const checkout = async (req, res) => {
  req.session.user = '66ecfa1dc080eac4c2e3aece'
  try {
    if (req.session.user) {
      const userId = req.session.user;
      const userCart = await Cart.findOne({ userId: req.session.user }).lean();
      const user = await User.findById(userId);
      const addressData = await Address.findOne({ userId : userId });
      const addresses = addressData ? addressData.addresses : []; 
    
      if (!userCart || userCart.items.length <= 0) {
        return res.redirect('/cart')
      }

      if (user?.isBlocked) {
        req.session.blockUser = 'User account is blocked.';
        req.session.user = null;
        return res.redirect('/shop');
      }

      //Varaint details
      for(let item of userCart.items){
        const product = await Product.findById(item.productId)
        const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
        if (variant) {
          item.variantId = variant;
          item.totalPrice = variant.salePrice * item.quantity
        }
      }

      const currentDate = new Date();
      const coupons = await Coupon.find({
        isList: true,
        expireOn: { $gte: currentDate },
        userId: { $ne: userId }
       });

      const cartItems = await Promise.all(
        userCart.items.map(async (item) => {
          const product = await Product.findById(item.productId);
          return {
            productId: item.productId,
            variantId: item.variantId,
            productName: product.productName,
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.totalPrice,
            variantImage: item.variantImage,
          };
        })
      );

      // Calculate totals
      const subtotal = userCart.items.reduce((acc, item) => acc + item.totalPrice, 0);
      let discount = 0;
   
      //Coupon totals
      if (req.session.couponRedeemed) {
        discount = req.session.couponRedeemed.discountAmount;
        const coupon = await Coupon.findById(req.session.couponRedeemed.couponId);

        if (!coupon || coupon.isList === false) {
            req.session.couponRedeemed = null;
            discount = 0;
        } else {
            if (subtotal < coupon.minimumPrice || subtotal > coupon.maximumPrice) {
                req.session.couponRedeemed = null;
                discount = 0;
            }
        }
    }

      userCart.couponRedeemed = req.session.couponRedeemed ? req.session.couponRedeemed : {
        status: false,
        coupon: null,
    };
      
      let delivery = 0 
      let total = subtotal - discount + delivery;

      //DELIVERY CHARGE
      const selectedAddressId = req.query.id;
      if (selectedAddressId) {
          const addresses = await Address.findOne({ userId: userId });
          const address = addresses?.addresses?.id(selectedAddressId); 
          if (!address) {
              return;
          }
      
          const adminLat = 10.998304046031746; // FROM  Kottakkal, Malappuram
          const adminLon = 76.01255696507937;  // FROM  Kottakkal, Malappuram
          const userLat = parseFloat(address.latitude);
          const userLon = parseFloat(address.longitude);
      
          function calculateDistance(adminLat, adminLon, userLat, userLon) {
              const R = 6371; // Radius of the Earth in kilometers
              const dLat = (userLat - adminLat) * (Math.PI / 180);
              const dLon = (userLon - adminLon) * (Math.PI / 180);
              const a =
                  Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(adminLat * (Math.PI / 180)) * Math.cos(userLat * (Math.PI / 180)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const distance = R * c; // Distance in kilometers
              return distance;
          }
      
          const distance = calculateDistance(adminLat, adminLon, userLat, userLon);
      
          let deliveryCharge;
          if (distance <= 5) {
              deliveryCharge = 0;
          } else if (distance > 5 && distance <= 10) {
              deliveryCharge = 50;
          } else if (distance > 10 && distance <= 20) {
              deliveryCharge = 100;
          } else {
              deliveryCharge = 120;
          }

          delivery = deliveryCharge;
          total += deliveryCharge;
          req.session.cartDetail = {
            delivery: delivery,
            total: total
          };
          return res.json({ delivery, total});
      }

      res.render("checkout", {
        user,
        addresses,
        cartItems,
        couponName: userCart.couponRedeemed.coupon,
        coupons,
        userCart,
        subtotal,
        discount,
        total
      });

      
    } else {
      req.session.errorMessage = "Oops! It seems you need to log in again.";
      return res.redirect("/");
    }
  } catch (error) {
    console.log("Error occurred in checkout", error);
    req.session.errorMessage =
      "An error occurred while processing your request.";
    return res.redirect("/");
  }
};

const addCartAddress = async (req, res) => {
  try {
    const { name, phone, street, city, state, zip, country } = req.body;
    const userId = req.session.user;

    if (!name || !street || !city || !state || !country) {
      return res.json({ success: false, error: "All fields are required." });
    }

    if (phone.length !== 10) {
      return res.json({
        success: false,
        error: "Phone number must be exactly 10 digits.",
      });
    }

    if (zip.length < 5 || zip.length > 10) {
      return res.json({
        success: false,
        error: "Zip code must be between 5 and 10 digits.",
      });
    }
    

    const newAddress = {
      name,
      phone,
      street,
      city,
      state,
      zipcode: zip,
      country,
    };

    let userAddress = await Address.findOne({ userId });

    if (!userAddress) {
      userAddress = new Address({
        userId,
        addresses: [newAddress],
      });
    } else {
      userAddress.addresses.push(newAddress);
    }

    await userAddress.save();

    return res.json({ success: true, message: "Address added successfully!" });
  } catch (error) {
    console.log("Error occurred in addCartAddress:", error);
    return res.json({
      success: false,
      error: "An error occurred while adding the address.",
    });
  }
};

// Razorpay instance 
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID, 
  key_secret: process.env.RAZORPAY_SECRET_KEY, 
})


const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    const { addressId, paymentMethod } = req.body;
    const address = await Address.findOne({ userId: userId });
    const selectedAddress = address.addresses.find(addr => addr._id.toString() === addressId);

    if (!userId || !addressId || !paymentMethod) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    if (user.isBlocked) {
      req.session.blockUser = 'User account is blocked.';
      req.session.user = null;
      return res.redirect('/');
    }

    const cartItems = await Cart.findOne({ userId }).populate("items.productId");

    if (!cartItems || !cartItems.items.length) {
      return res.status(404).json({ success: false, message: "No items in the cart." });
    }

    const orderedItems = [];

    for (const item of cartItems.items) {
      const product = item.productId;

      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found." });
      }

      const variant = product.variants.id(item.variantId);
     
      if (!variant || !variant.isActive) { 
        return res.status(404).json({ success: false, message: `Variant not found or inactive for product ${product.productName}.` });
      }

      if (item.quantity > variant.stock) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.productName}.` });
      }

      if (cartItems.cartTotal > 5000 && paymentMethod === 'Cash On Delivery') {
        return res.status(400).json({ success: false, message: "Order above Rs 5000 is not allowed for COD." });
      }


      orderedItems.push({
        product: product._id,
        variantId: variant._id,
        quantity: item.quantity,
        price: variant.price,
        createdOn: new Date(),
        couponApplied: false,
      });
    }

     //Calculations
     const discount = req.session.couponRedeemed?.discountAmount || 0;
     cartItems.discount = discount
     cartItems.cartTotal = req.session.cartDetail?.total || 0;
     cartItems.deliveryCharge = req.session.cartDetail?.delivery || 0;
     let total = cartItems.cartTotal - discount;
     cartItems.finalAmount = total;

    let order = new Order({
      userId,
      status: "Pending",
      address: {
        ...selectedAddress,
        addressId: selectedAddress._id
      },
      paymentMethod,
      orderedItems,
      discount: cartItems.discount,
      totalAmount: cartItems.cartTotal,
      finalAmount: cartItems.finalAmount,
      deliveryCharge: cartItems.deliveryCharge,
      orderStatus: "Pending"
    });

    const couponRedeemed = req.session.couponRedeemed || null;
    if (couponRedeemed && couponRedeemed.status === true) {
      const couponName = couponRedeemed.coupon;

      order.couponRedeemed = {
        status: true,
        coupon: couponName
      };
      req.session.couponRedeemed = null;
      const coupon = await Coupon.findOne({ name: couponName });

      if (coupon) {
        if (!coupon.userId.includes(user._id)) {
          coupon.userId.push(user._id);
          await coupon.save();
        }
      }
    }

    if (paymentMethod === 'Razorpay') {
      const options = {
        amount: Math.round(cartItems.finalAmount * 100),
        currency: 'INR',
        receipt: `receipt_${order._id}`,
        notes: {
          userId: userId,
          orderId: order._id,
        },
      };

      try {
        const razorpayOrder = await razorpay.orders.create(options);
        order.paymentMethod = 'Razorpay';
        order.paymentStatus = false;
        order.orderId = razorpayOrder.id;
        await order.save();

        return res.status(201).json({
          success: true,
          message: "Order placed successfully.",
          order,
          razorpayOrderId: razorpayOrder.id
        });
      } catch (error) {
        console.error("Error creating Razorpay order:", error);
        return res.status(500).json({ success: false, error: "Failed to create Razorpay order." });
      }
    }

    if (paymentMethod === 'wallet') {
      if (user.wallet < cartItems.finalAmount) {
        return res.status(400).json({ success: false, message: "Insufficient wallet balance. Please recharge to continue." });
      }

      user.wallet -= cartItems.finalAmount;
      user.paymentMethod = 'wallet';
    }

    // Update stock if payment method is NOT Razorpay
    for (const item of cartItems.items) {
      const product = item.productId;
      const variant = product.variants.id(item.variantId);
      if (variant) {
        variant.stock -= item.quantity;
        await product.save();
      }
    }

    await user.save();
    await order.save(); 
    await Cart.deleteOne({ userId });
    return res.status(200).json({ success: true, message: "Order placed successfully.", order });

  } catch (error) {
    console.error("Error in placeOrder :", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};




const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const order = await Order.findOne({ orderId: razorpay_order_id });
  const userId = req.session.user;
  
  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  // Delete Cart
  await Cart.deleteOne({ userId });

  // Your Razorpay secret key
  const secret = process.env.RAZORPAY_SECRET_KEY;

  // Generate signature
  const generated_signature = crypto
    .createHmac('sha256', secret)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest('hex');

  if (generated_signature === razorpay_signature) {
    // Signatures match, payment is verified
    order.paymentStatus = true;
    order.status = 'Pending';
    await order.save();

    // Update stock for ordered items
    for (const item of order.orderedItems) {
      const product = await Product.findById(item.product);
      const variant = product.variants.id(item.variantId); 

      if (variant) {
        // Deduct stock
        variant.stock -= item.quantity;
        await product.save(); 
      }
    }

    // Return success response
    res.status(200).json({ success: true, message: "Payment verified successfully!" });
  } else {
    // Signatures don't match, verification failed
    order.status = 'Failed';
    order.paymentStatus = false;
    await order.save();
    res.status(400).json({ success: false, message: "Payment verification failed!" });
  }
};



const loadWishlist = async(req,res) =>{
  try {
      if(req.session.user){
        const product = await Product.find({ "variants._id": "6717c337b3946bd4874e4749" });
        const user = await User.findById(req.session.user)
        .populate('wishlist.product');
  
      const wishlist = user.wishlist.map(item => {
        const product = item.product;
        const variant = product?.variants?.find(v => v._id.toString() === item.variantId.toString()) || null;
  
        return { product, variant, addedOn: item.addedOn };
      });

        res.render('wishlist',{user,wishlist});

      }else{
        req.session.errorMessage = "Oops! It seems you need to log in again.";
        return res.redirect("/");
      }
  } catch (error) {
    console.log("Error occured in loadWishlist",error)
    res.redirect('/')
  }
}

const toggleWishlist = async (req, res) => {
  const { productId, variantId, action } = req.body;
  try {
      if (!req.session.user) {
          return res.status(401).json({ error: "Please log in to manage your wishlist." });
      }

      if (!variantId) {
          return res.status(404).json({ error: "To add an item to your wishlist, please select a variant first." });
      }

      const user = await User.findById(req.session.user);
      
      const wishlistItemIndex = user.wishlist.findIndex(item => 
          item.product.toString() === productId && item.variantId.toString() === variantId
      );


      if (action === 'add') {
          if (wishlistItemIndex === -1) {
              user.wishlist.push({ product: productId, variantId, addedOn: new Date() });
              await user.save();
              return res.status(200).json({ message: "Added to wishlist", added: true });
          } else {
              return res.status(409).json({ error: "Item already in wishlist." });
          }
      } 

      if (action === 'remove') {
          if (wishlistItemIndex > -1) {
              user.wishlist.splice(wishlistItemIndex, 1);
              await user.save();
              return res.status(200).json({ message: "Removed from wishlist", removed: true });
          } else {
              return res.status(404).json({ error: "Item not found in wishlist." });
          }
      }

      return res.status(400).json({ error: "Invalid action specified." });

  } catch (error) {
      console.error("Error occurred in toggleWishlist:", error);
      return res.status(500).json({ error: "An error occurred while updating the wishlist." });
  }
};

const deleteWishlist = async (req, res) => {
  try {
    const productId = req.params.id; 
    const variantId = req.body.variantId; 

    const userId = req.session.user; 

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.wishlist = user.wishlist.filter(item => 
      !(item.product.toString() === productId && item.variantId.toString() === variantId)
    );

    await user.save();

    res.json({ success: true, message: 'Item removed from wishlist successfully' }); 
  } catch (error) {
    console.error("Error occurred in deleteWishlist", error);
    res.status(500).json({ success: false, message: 'An error occurred. Please try again.' }); 
  }
};

const generateInvoicePDF = async (req, res) => {
  const { orderId } = req.params;
  try {
      // Fetch order details
      const order = await Order.findById(orderId)
      .populate('userId') 
      .populate({
          path: 'orderedItems.product', 
      })
      .exec();
      order.orderedItems.forEach(item => {
        const variant = item.product.variants.id(item.variantId); 
        item.variant = variant;
    });
      if (!order) {
          return res.status(404).json({ message: 'Order not found' });
      }
      const validStatuses = ['Pending', 'Processing', 'Shipped', 'Return Request', 'Returned', 'Return Cancelled', 'Cancelled', 'Failed'];

      // Check if the order status is in the validStatuses array
      if (validStatuses.includes(order.status)) {
          return res.status(404).json({ message: 'Order not found' });
      }
      // Define font paths
      const fontPath = path.resolve(__dirname, '..', '..', 'public', 'fonts');
      const logoPath = path.resolve(__dirname, '..', '..', 'public', 'admin', 'img', 'logo.png');

      // Create a new PDF document with custom margin
      const doc = new PDFDocument({ margin: 50 });

      // Set headers for the PDF file
      res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);
      res.setHeader('Content-Type', 'application/pdf');

      // Pipe the document to the response
      doc.pipe(res);

      // Register fonts
      doc.registerFont('NotoSans', path.join(fontPath, 'NotoSans-Regular.ttf'));
      doc.registerFont('NotoSans-Bold', path.join(fontPath, 'NotoSans-Bold.ttf'));
      doc.registerFont('NotoSans-Italic', path.join(fontPath, 'NotoSans-Italic.ttf'));

      // Add company logo and header information
      doc.image(logoPath, 50, 45, { width: 80 })
      .font('NotoSans-Bold')
      .text('VocalGear Pvt. Ltd.', 200, 50, { align: 'right', fontSize: 10 }) 
      .font('NotoSans')
      .text('Kinfra, Calicut, India', 200, 65, { align: 'right', fontSize: 8 }) 
      .text('Email: vocalgear@gmail.com', 200, 80, { align: 'right', fontSize: 8 })
      .text('Phone: +91 7306827008', 200, 95, { align: 'right', fontSize: 8 })
      .moveDown();
   
      doc.moveTo(50, 120)
          .lineTo(563, 120)
          .stroke();

      // Add Invoice Title
      doc.fontSize(25).font('NotoSans-Bold').text('INVOICE', 250, 123).moveDown()

      doc.moveTo(50, 160)
          .lineTo(563, 160)
          .stroke();

      // Add Invoice, Order, and Customer Details
      doc.fontSize(11).font('NotoSans-Italic')
          .text(`Order ID: ${order._id}`, 50, 170)
          .text(`Invoice Date: ${new Date().toDateString()}`, 50, 185)
          .text(`Customer Name: ${order.userId.name}`, 50, 200)
          .text(`Contact Number: ${order.address.phone}`, 50, 215)
          .text(`Shipping Address: ${order.address.street}, ${order.address.city}, ${order.address.state}, ${order.address.country}, ${order.address.zip}`, 50, 230)
          .moveDown();

      doc.moveTo(50, 255)
          .lineTo(563, 255)
          .stroke();

          // Add Product Table Headers
      doc.fontSize(12).font('NotoSans-Bold')
      .text('Product', 50, 260)
      .text('Qty', 280, 260)
      .text('Unit (₹)', 350, 260)
      .text('Price (₹)', 420, 260)
      .text('Total (₹)', 490, 260, { align: 'right' })
      .moveDown();

      // Add header underline
      doc.moveTo(50, 280)
      .lineTo(563, 280)
      .stroke();

      let yPosition = 290; // Starting y position for items

      order.orderedItems.forEach(item => {
      // Save initial y position for aligned columns
      const initialYPosition = yPosition;

      // Display Product Name
      doc.font('NotoSans').fontSize(11);
      const productName = item.product.productName || '';
      doc.text(productName, 50, yPosition, { 
        width: 200,
        lineGap: 2
      });

      // Calculate the height of product name for proper spacing
      const productNameHeight = doc.heightOfString(productName, { 
        width: 200,
        lineGap: 2
      });

      // Display Color on the next line (with null check)
      doc.fontSize(9)
        .font('NotoSans')
        .text(item.variant?.color || '', 50, yPosition + productNameHeight + 2, { 
          width: 200,
          lineGap: 2
        });

      // Safely get price values with null checks and defaults
      const quantity = item.quantity || 0;
      const price = parseFloat(item.variant?.price || 0);
      const mrp = parseFloat(item.variant?.MRP || item.variant?.mrp || price || 0);
      const total = quantity * price;

      // Display Quantity, Price, MRP, and Total aligned with first line of product
      doc.fontSize(11)
        .text(quantity.toString(), 280, initialYPosition)
        .text(`₹${price.toFixed(2)}`, 350, initialYPosition)
        .text(`₹${mrp.toFixed(2)}`, 420, initialYPosition)
        .text(`₹${total.toFixed(2)}`, 490, initialYPosition, { 
          align: 'right' 
        });

      // Calculate space needed for this item including product name and color
      const totalItemHeight = productNameHeight + 20; 
      yPosition += totalItemHeight;
      });

      // Add spacing after the last item
      yPosition += 10;

      // Draw line after ordered items
      doc.moveTo(50, yPosition)
      .lineTo(563, yPosition)
      .stroke();

          // Calculate Subtotal Amount with safety check
      const totalAmount = parseFloat(order.totalAmount || 0);
      const deliveryChargeAmount = parseFloat(order.deliveryCharge || 0);
      const subTotalAmount = totalAmount;

      // Add Order Summary
      yPosition += 20;
      doc.font('NotoSans-Bold')
        .fontSize(12)
        .text(`Subtotal: ₹${subTotalAmount.toFixed(2)}`, 50, yPosition, { 
          align: 'right' 
        });

      // Increment yPosition after subtotal
      yPosition += 20;

      // Handle coupon display with safety checks
      if (order.couponRedeemed?.status) {
          const finalAmount = parseFloat(order.finalAmount || 0);
          const discountAmount = Math.max(0, totalAmount - finalAmount);
          doc.fontSize(11)
            .text(
              `Coupon Reduction (${order.couponRedeemed.coupon || 'DISCOUNT'}): -₹${discountAmount.toFixed(2)}`,
              50,
              yPosition,
              { align: 'right' }
            );
      } else {
          doc.font('NotoSans-Italic')
            .fontSize(10)
            .text('No coupons applied!', 50, yPosition, { 
              align: 'right' 
            });
      }

      // Increment yPosition after coupon
      yPosition += 20;

      // Handle delivery charge display with safety check
      if (order.deliveryCharge && order.deliveryCharge !== 0) {
          doc.fontSize(11)
            .text(`Delivery Charge: ₹${deliveryChargeAmount.toFixed(2)}`, 50, yPosition, { 
              align: 'right' 
            });
      }

      // Increment yPosition after delivery charge
      yPosition += 25;

      // Calculate and display grand total
      const finalAmount = parseFloat(order.finalAmount || 0);
      const lastAmount = finalAmount; 

      // Display grand total
      doc.fontSize(17)
        .font('NotoSans-Bold')
        .text(`Grand Total: ₹${lastAmount.toFixed(2)}`, 50, yPosition, { 
          align: 'right' 
        });

      // Draw final line (adjusted based on new yPosition)
      yPosition += 30;
      doc.moveTo(50, yPosition)
        .lineTo(563, yPosition)
        .stroke();

      // Add thank you note and invoice generation text (with proper spacing)
      doc.fontSize(12)
        .font('NotoSans')
        .text('Thank you for your business!', 50, yPosition + 15);

      doc.fontSize(7)
        .font('NotoSans-Italic')
        .text('*This is a computer generated Invoice', 50, yPosition + 40, { 
          align: 'center' 
        });

      // Finalize the PDF and end the stream
      doc.end();

  } catch (err) {
      console.error("Error generating invoice PDF:", err);
      res.status(500).send('Internal Server Error');
  }
};


module.exports = {
  loadShop,
  productInfo,
  addCart,
  loadCart,
  deleteProduct,
  updateQuantity,
  checkout,
  addCartAddress,
  placeOrder,
  loadWishlist,
  toggleWishlist,
  deleteWishlist,
  verifyPayment,
  generateInvoicePDF
};
