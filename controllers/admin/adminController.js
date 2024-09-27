const User = require('../../models/userSchema');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');



const pageNotFound = async (req, res) => {
    try {
      res.render("page-404");
    } catch (error) {
      res.redirect("/pageError");
    }
  };


const loadLogin = (req,res) =>{
    if(req.session.admin){
        return res.redirect("/admin")
    }
    res.render("admin-login",{message:null})
}

const loadDashboard = async (req,res) =>{
    if(req.session.admin){
        try {
            res.render('dashboard',{url:req.originalUrl});
        } catch (error) {
            res.redirect('/pageError')
        }
    }else{
        res.redirect('/admin/login')
    }
}



module.exports ={
    pageNotFound,
    loadLogin,
    loadDashboard
}