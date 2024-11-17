const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const User = require("../../models/userSchema");
const session = require("express-session");
const env = require("dotenv").config();




const login = async (req,res) =>{
    try {
        const {name,password} = req.body;
        const admin = await User.findOne({name:name,isAdmin:true});
        if(admin){
            const passwordMatch = await bcrypt.compare(password,admin.password);
            if(passwordMatch){
                req.session.admin = admin._id;
                return res.redirect('/admin/login')
            }else{ 
                req.flash("error_msg", "Password doesnt Match");
                return res.redirect("/admin/login");
            }
        }else{
            req.flash("error_msg", "Admin with username doesn't exists");
            return res.redirect("/admin/login");
        }
    } catch (error) {
        console.log("Login error",error);
        return res.redirect("/pageError")
        
    }
}

const logout = async (req,res) =>{
    try {
        if (req.session && req.session.admin) {
            req.session.admin = null;    
        
            return res.redirect('/admin/login');
        } else { 
            return res.redirect('/admin/login');
        }
    } catch (error) {
        console.log("Error in Logout",error)
        res.redirect("/pageError")
    }
}




module.exports ={
    login,
    logout
}