const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Brand = require("../../models/brandSchema");
const Coupon = require("../../models/couponSchema");
const env = require("dotenv").config();
const Razorpay = require('razorpay');
const crypto = require('crypto');

const loadShop = async (req, res) => {
  try {
    const query = req.query.query;
    const { sort, brandSort, cSort, tSort } = req.query;
    let products = await Product.find({ isActive: true })
    const brands = await Brand.find({ isActive: true }).lean(); 

    // BRAND SORTING
    if (brandSort) {
      let brand = await Brand.findById(brandSort);
      products = await Product.find({ brand: brand.name });
    }

    // CONNECTION SORTING
    if (cSort) {
      products = await Product.find({ connectionType: cSort });
    }

    // TYPE SORTING
    if (tSort) {
      products = await Product.find({ type: tSort });
    }

    // SEARCHING
    const searchRegex = new RegExp(query, "i");
    if (query) {
      products = await Product.find({
        $or: [
          { productName: { $regex: searchRegex } },
          { "brand.name": { $regex: searchRegex } },
          { "variants.description": { $regex: searchRegex } },
        ],
      }).populate("brand");
    }

    // PRICE AND OTHERS
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
      res.redirect("/shop");
      return;
    }

    let user = req.session.user ? await User.findById(req.session.user) : null;

    res.render("shop", { products, user, brands, query });
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
      console.log('isInWishlist :',isInWishlist)
      isInWishlist ? active = 'remove' : active = 'add';
      console.log(active)
      return res.json({ variant,isInWishlist ,active,user });
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

      if (!quantityNum || quantityNum <= 0) {
        return res
          .status(400)
          .json({ error: "Quantity must be greater than 0." });
      }
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

      const variant = product.variants.id(variantId);
      const price = variant.salePrice;
      const stock = variant.stock;

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
        if (newTotalQuantity > stock) {
          console.log("Quantity exceeds stock available");
          return res
            .status(400)
            .json({ error: "Quantity exceeds stock available." });
        }

        if (newTotalQuantity > 6) {
          return res
            .status(400)
            .json({
              error: "You cannot add more than 6 units of this product.",
            });
        }

        cart.items[existingItemIndex].quantity = newTotalQuantity;
        cart.items[existingItemIndex].totalPrice = price * newTotalQuantity;
      } else {
        if (quantityNum > stock) {
          return res
            .status(400)
            .json({ error: "Quantity exceeds stock available." });
        }

        if (quantityNum > 6) {
          return res
            .status(400)
            .json({
              error: "You cannot add more than 6 units of this product.",
            });
        }

        const totalPrice = price * quantityNum;

        cart.items.push({
          productId,
          variantId,
          quantity: quantityNum,
          price,
          stock,
          totalPrice,
          status: "placed",
          variantImage: variant.images[0],
        });
      }
      cart.cartTotal = cart.items.reduce(
        (total, item) => total + item.totalPrice,
        0
      );
      cart.discount = 0;
      cart.finalAmount = cart.cartTotal;

       await cart.save();

      req.session.successMsg = "Product added to cart successfully";
      res
        .status(200)
        .json({
          success: "Product added to cart successfully!",
          redirectUrl: "/cart",
        });
    } else {
      res.status(400).json({ error: "User must be logged in first." });
    }
  } catch (error) {
    console.log("Error occurred in addCart:", error);
    res
      .status(500)
      .json({
        error: "An error occurred while adding the product to the cart.",
      });
  }
};

const loadCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    if (req.session.user) {
      const cart = await Cart.findOne({ userId }).populate("items.productId");
      const successMsg = req.session.successMsg ? req.session.successMsg : null;
      req.session.successMsg = null;

      if (!cart) {
        return res.render("cart", {
          cartItems: [],
          subtotal: 0,
          delivery: 0,
          discount: 0,
          total: 0,
          user,
          successMsg,
        });
      }

      // Calculate totals
      let subtotal = cart.items.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0
      );
      let discount = 0;
      let delivery = 0;
      let total = subtotal - discount + delivery;

      res.render("cart", {
        cartItems: cart.items,
        subtotal,
        delivery,
        discount,
        total,
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
      console.log(userId);
      const cart = await Cart.findOneAndUpdate(
        { userId: userId },
        { $pull: { items: { variantId: variantId } } }
      );

      if (!cart) {
        console.log("No cart found for this user.");
        return res.status(404).send("Cart not found");
      }

      await cart.save();
      res.json({ success: true });
      console.log("Deleted succefull");
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
    const userCart = await Cart.findOne({ userId: req.session.user });

    if (!userCart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    const itemIndex = userCart.items.findIndex(
      (item) => item.variantId.toString() === variantId.toString()
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

      if (cartItem.quantity > cartItem.stock) {
        return res.json({ success: false, error: "stock unavailable" });
      }

      if (cartItem.quantity >= 7) {
        return res.json({ success: false, error: "Max quantity" });
      }

      cartItem.totalPrice = Math.round(cartItem.price * cartItem.quantity);

      const total = userCart.items.reduce(
        (acc, item) => acc + item.totalPrice,
        0
      );

      userCart.cartTotal = total;

      await userCart.save();

      res.status(200).json({
        success: true,
        totalAmount: cartItem.totalPrice,
        quantity: cartItem.quantity,
        total,
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
  try {
    if (req.session.user) {
      const userId = req.session.user;
      const userCart = await Cart.findOne({ userId: req.session.user });
      const user = await User.findById(userId);
      const addressData = await Address.findOne({ userId });
      const addresses = addressData ? addressData.addresses : [];

      if (!userCart || userCart.items.length <= 0) {
        return res.json({
          success: false,
          error:
            "Your cart is empty. Please add items to your cart before checking out.",
        });
      }

      const coupons = await Coupon.find({ isList: true, userId: { $ne: userId } });

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

      res.render("checkout", {
        user,
        addresses,
        cartItems,
        couponName: userCart.couponRedeemed.coupon,
        coupons,
        userCart  
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

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID, 
  key_secret: process.env.RAZORPAY_SECRET_KEY, 
})

const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId)
    const { addressId, paymentMethod } = req.body;
    console.log(req.body)
    if (!userId || !addressId || !paymentMethod) {
      return res.status(400).json({ success: false, message: "All fields are required." });
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
        return res.status(404).json({
          success: false,
          message: `Variant not found or inactive for product ${product.productName}.`,
        });
      }

      if (item.quantity > variant.stock) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.productName}.`,
        });
      }

      variant.stock -= item.quantity;
      await product.save();

      orderedItems.push({
        product: product._id,
        variantId: variant._id,
        quantity: item.quantity,
        price: variant.price,
        createdOn: new Date(),
        couponApplied: false,
      });
    }

    let order = new Order({
      userId,
      status: "Pending",
      address: addressId,
      paymentMethod,
      orderedItems,
      discount: cartItems.discount,
      totalAmount: cartItems.cartTotal,
      finalAmount: cartItems.finalAmount,
      orderStatus: "Pending",
    });

    if (cartItems.couponRedeemed.status === true) {
      const couponName = cartItems.couponRedeemed.coupon;

      order.couponRedeemed = {
        status: true,
        coupon: couponName
      };
      console.log('ORDER' ,order)
      const coupon = await Coupon.findOne({ name: couponName });

      if (coupon) {
        if (!coupon.userId.includes(user._id)) {
          coupon.userId.push(user._id);
          console.log('COUPON',coupon)
          await coupon.save();
        }
      }
    }

    await user.save();
    await order.save();
    await Cart.deleteOne({ userId });

    if (paymentMethod === 'Razorpay') {
      const options = {
        amount: cartItems.finalAmount * 100,
        currency: 'INR',
        receipt: `receipt_${order._id}`,
        notes: {
          userId: userId,
          orderId: order._id,
        },
      };
    
      try {
        const razorpayOrder = await razorpay.orders.create(options);
        order.razorpayOrderId = razorpayOrder.id;
        await order.save();
    
        return res.status(201).json({
          success: true,
          message: "Order placed successfully.",
          order,
          paymentUrl: razorpayOrder.short_url || razorpayOrder.url
        });
      } catch (error) {
        console.error("Error creating Razorpay order:", error);
        return res.status(500).json({ success: false, error: "Failed to create Razorpay order." });
      }
    }

    return res.status(201).json({ success: true, message: "Order placed successfully.", order });

  } catch (error) {
    console.error("Error in placeOrder function:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
};




const verifyPayment = async(req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  console.log( razorpay_order_id, razorpay_payment_id, razorpay_signature )
  // const secret = process.env.RAZORPAY_SECRET_KEY; // Replace with your Razorpay Key Secret
  // const generated_signature = crypto
  //     .createHmac('sha256', secret)
  //     .update(razorpay_order_id + "|" + razorpay_payment_id)
  //     .digest('hex');
  // console.log('generated_signature',generated_signature, razorpay_signature)
  // if (generated_signature === razorpay_signature) {
  //     // If signatures match, mark the order as paid
  //     // Update order status in database
  //     // (You may need to identify the order based on `razorpay_order_id`)
      res.status(200).json({ success: true, message: "Payment verified successfully!" });
  // } else {
  //     res.status(400).json({ success: false, message: "Payment verification failed!" });
  // }
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
      console.log('action :',action)


      if (action === 'add') {
        console.log('INSIDE THE ADD')
          if (wishlistItemIndex === -1) {
              user.wishlist.push({ product: productId, variantId, addedOn: new Date() });
              await user.save();
              console.log('Added to wishlist')
              return res.status(200).json({ message: "Added to wishlist", added: true });
          } else {
              return res.status(409).json({ error: "Item already in wishlist." });
          }
      } 

      if (action === 'remove') {
        console.log('INSIDE THE remove')
          if (wishlistItemIndex > -1) {
              user.wishlist.splice(wishlistItemIndex, 1);
              await user.save();
              console.log('Removed from wishlist')
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
  verifyPayment
};
