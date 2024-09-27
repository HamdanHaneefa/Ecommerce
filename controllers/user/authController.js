const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const User = require("../../models/userSchema");
const session = require("express-session");
const env = require("dotenv").config();

// Function to generate a 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Function to send OTP email
async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "OTP Verification",
      text: `Your OTP is ${otp}`,
      html: `<p>Your OTP is: <b>${otp}</b></p>`,
    });

    return info.accepted.length > 0; // Returns true if email was sent successfully
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

// Function to securely hash the password
async function securePassword(password) {
  try {
    return await bcrypt.hash(password, 10);
  } catch (error) {
    console.error("Error hashing password:", error);
    throw new Error("Password hashing failed");
  }
}

// Function to handle signup and OTP sending
const signup = async (req, res) => {
  try {
    const { name, email, phone, password, cpassword } = req.body;

    // Validation patterns
    const namePattern = /^[a-zA-Z\s]+$/;
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const phonePattern = /^[0-9]{10}$/;
    const passPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

    // Input validation
    if (!name || !email || !phone || !password || !cpassword) {
      req.flash("error_msg", "All fields are required");
      return res.redirect("/signup");
    }

    const findUser = await User.findOne({ email });
    if (findUser) {
      req.flash("error_msg", "User already exists");
      return res.redirect("/signup");
    }

    if (!namePattern.test(name)) {
      req.flash("error_msg", "Invalid name. Only letters and spaces are allowed.");
      return res.redirect("/signup");
    }
    if (!emailPattern.test(email)) {
      req.flash("error_msg", "Invalid Email Id");
      return res.redirect("/signup");
    }
    if (!phonePattern.test(phone)) {
      req.flash("error_msg", "Invalid phone number. Enter a 10-digit number.");
      return res.redirect("/signup");
    }
    if (!passPattern.test(password)) {
      req.flash("error_msg", "Password must be at least 8 characters long, including one letter and one number.");
      return res.redirect("/signup");
    }
    if (password !== cpassword) {
      req.flash("error_msg", "Passwords do not match");
      return res.redirect("/signup");
    }

    // Generate OTP
    const otp = generateOtp();
    console.log("Generated OTP:", otp);

    // Send OTP to user's email
    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      req.flash("error_msg", "Error sending OTP. Please try again.");
      return res.redirect("/signup");
    }

    // Store OTP and user data in session with expiration
    req.session.userOtp = otp;
    req.session.userData = { name, email, phone, password };

    // Render OTP verification page
    res.render("verify-otp", { email });
  } catch (error) {
    console.error("Signup error:", error);
    req.flash("error_msg", "An error occurred. Please try again later.");
    res.redirect("/signup");
  }
};

// Function to verify OTP
const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log("Received OTP:", otp);

    if (otp === req.session.userOtp) {
      const user = req.session.userData;
      const passwordHash = await securePassword(user.password); 

      const saveUserData = new User({
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: passwordHash
      });

      await saveUserData.save();
      req.session.user = saveUserData._id;
      res.json({ success: true, redirectUrl: "/" });
    } else {
      res.status(400).json({ success: false, message: "Invalid OTP, please try again" });
    }
  } catch (error) {
    console.error("Error verifying OTP", error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};

// Function to resend OTP
const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email not found in session" });
    }

    const otp = generateOtp();
    req.session.userOtp = otp;
    console.log("Resent OTP:", otp);

    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      res.status(200).json({ success: true, message: "OTP sent successfully" });
    } else {
      res.status(500).json({ success: false, message: "Failed to resend OTP, please try again" });
    }
  } catch (error) {
    console.error("Error resending OTP", error);
    res.status(500).json({ success: false, message: "Internal Server Error. Please try again" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const findUser = await User.findOne({ isAdmin: 0, email: email });
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const passPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

    if ( !email || !password ) {
      req.flash("error_msg", "All fields are required");
      return res.redirect("/login");
    }
    if (!emailPattern.test(email)) {
      req.flash("error_msg", "Invalid Email Id");
      return res.redirect("/login");
    }

    if (!passPattern.test(password)) {
      req.flash("error_msg", "Password must be at least 8 characters long, including one letter and one number.");
      return res.redirect("/login");
    }

     if (!findUser) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/login'); 
    }

    if (findUser.isBlocked) {
      req.flash('error_msg', 'User is blocked by admin');
      return res.redirect('/login');
    }
    const passwordMatch = await bcrypt.compare(password, findUser.password);

    if (!passwordMatch) {
      req.flash('error_msg', 'Incorrect Password');
      return res.redirect('/login'); 
    }

    req.session.user = findUser._id; 
    res.redirect('/');
  } catch (error) {
    console.error("Login error: ", error);
    req.flash('error_msg', 'Login failed. Please try again later.');
    res.redirect('/login');
  }
};
 

const logout = async (req,res) =>{
    try {
      req.session.destroy((err)=>{
        if(err){
          console.log("Session desstruction error :",err.message)
          return res.redirect("/pageNotFound")
        }
        console.log("Destroy Success")
        return res.redirect("/")
       
      })
    } catch (error) {
      console.log("Logout Error ",error)
      res.redirect("/pageNotFound")
    }
}

const forget = async (req,res) =>{
  try {
      const {email} = req.body;
      if (!email) {
        req.flash("error_msg", "Field is required");
        return res.redirect("/forgot-Password");
      }
      const user = await User.findOne({email:email});
      if(!user){
        req.flash('error_msg','User not found');
        res.redirect('/forgot-password');
      }else{
      // Generate OTP
    const otp = generateOtp();
    console.log("Generated OTP:", otp);
    // Send OTP to user's email
    const emailSent = await sendVerificationEmail(email, otp);

    if (!emailSent) {
      req.flash("error_msg", "Error sending OTP. Please try again.");
      return res.redirect("/signup");
    }
    req.session.userOtp = otp;
    req.session.userData = {email};
    // Render OTP verification page
    res.redirect("/forgot-verify-otp");   
  }
     
  } catch (error) {
    req.flash('error_msg', 'An error occurred. Please try again.');
    res.redirect('/forgot-password');
  }
}

const forgotVerify = async (req,res)=>{
  try {
    const {otp} = req.body
    console.log("Recived Otp:",otp)
    if (otp === req.session.userOtp) {
      console.log("OTP VERIFIED SUCCESFULL")
      res.json({ success: true, redirectUrl: "/change-password" });
    }else{
      return res.status(400).json({ success: false, message: "OTP is Incorrect" });
    }

  } catch (error) {
    console.error("Error verifying OTP", error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
}

const changePassword = async (req,res) =>{
  try {
    const { password, cpassword } = req.body;
    const passPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

    // Check if fields are provided
    if (!password || !cpassword) {
      req.flash("error_msg", "All fields are required");
      return res.redirect("/change-password");
    }

    // Check if passwords match
    if (password !== cpassword) {
      req.flash("error_msg", "Passwords do not match");
      return res.redirect("/change-password");
    }

    // Check password pattern
    if (!passPattern.test(password)) {
      req.flash("error_msg", "Password must be at least 8 characters long, including one letter and one number.");
      return res.redirect("/change-password");
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Retrieve the user's email from session
    const email = req.session.userData?.email;
    if (!email) {
      req.flash("error_msg", "User email not found in session");
      return res.redirect("/change-password");
    }

    // Find the user and update the password
    const result = await User.updateOne(
      { email: email },
      { $set: { password: hashedPassword } }
    );

    if (result.nModified === 0) {
      req.flash("error_msg", "Failed to update password. User not found.");
      return res.redirect("/change-password");
    }

    req.flash("success_msg", "Password changed successfully");
    res.redirect("/login");
  } catch (error) {
    console.error("Error in changePassword", error);
    req.flash("error_msg", "An error occurred while changing the password");
    res.redirect("/change-password");
  }
}


module.exports = {
  signup,
  verifyOtp,
  resendOtp,
  login,
  logout,
  forget,
  forgotVerify,
  changePassword
};


