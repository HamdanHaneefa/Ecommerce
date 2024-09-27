const User = require("../../models/userSchema");


const loadShop = async (req,res) =>{
    try {
        res.render('shop',{user:null})
    } catch (error) {
        console.log("Error occured in loadShop ",error)
        res.redirect('/')
    }
}


module.exports ={
    loadShop
} 