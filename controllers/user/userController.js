const User = require("../../models/userSchema");
const Product = require('../../models/productSchema');

const pageNotFound = async (req, res) => {
  try {
    res.render("page-404");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};


const loadHomepage = async (req, res) => {
  try {
    const userData = req.session.user ? await User.findById(req.session.user) : null;
    const products = await Product.find({ isActive: true });
    let errorMessage = req.session.blockUser || req.session.errorMessage || null;
    req.session.errorMessage = null;
    
    // If user is blocked
    if (userData && userData.isBlocked) {
      req.session.blockUser = 'User is blocked by admin';
      req.session.user = null;
      errorMessage = req.session.blockUser;
      req.session.blockUser = null;
      return res.render('home', { user: null, products, errorMessage });
    }

    return res.render('home', { user: userData, products, errorMessage });

  } catch (error) {
    res.status(500).send("Server error");
  }
};



const loadSignup = async (req, res) => {
  try {
    if(!req.session.user){
      res.render('signup')
    }else{
      res.redirect('/')
    }
  } catch (error) {
    console.log("Home page not loading", error);
    res.status(500).send("Server Error");
  }
};

const loadLogin = async (req,res) =>{
  try {
    if(!req.session.user){
      res.render('login')
    }else{
      res.redirect('/')
    }
  } catch (error) {
    res.redirect("pageNotFound")
  }
}

const loadforget = async (req,res)=>{
  try {
    res.render("forgot-password")
  } catch (error) {
    console.log("Error in forgotten password :",error)
    res.redirect("pageNotFound")
  }
}

const loadforgotVerify = async (req,res)=>{
  try {
    res.render('forgot-otp')
  } catch (error) {
    console.log('error LoadVerify ',error)
  }
}

const LoadChangePassword = async (req,res)=>{
  try {
    res.render('change-password')
  } catch (error) {
    
  }
}
module.exports = {
  loadHomepage,
  pageNotFound,
  loadSignup,
  loadLogin,
  loadforget,
  loadforgotVerify,
  LoadChangePassword
};
