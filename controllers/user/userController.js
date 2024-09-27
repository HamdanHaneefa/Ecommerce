const User = require("../../models/userSchema");


const pageNotFound = async (req, res) => {
  try {
    res.render("page-404");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const loadHomepage = async (req, res) => {
  try {
    const user = req.session.user;
    if (user) {
      const userData = await User.findById(user);
      res.render("home", { user: userData });
    } else {
      res.render("home", { user: null });
    }
  } catch (error) {
    console.log("Error loading homepage:", error);
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
    console.log("Error in forgotten password :",err)
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
