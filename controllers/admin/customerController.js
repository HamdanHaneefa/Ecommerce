const User = require('../../models/userSchema');

const customerInfo = async (req, res) => {
    try {
        if(req.session.admin){
            const userData = await User.find({})
            res.render('customers', { data: userData, url:req.originalUrl});
        }else{
            res.redirect('/admin/login')
        }  
    } catch (error) {
        console.log("Error in customerInfo ", error);
        res.redirect('/admin/');
    }
};

const customerBlocked = async (req,res) =>{
    try {
        let id = req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect("/admin/users")
    } catch (error) {
        console.log("Error in customerBlocked ",error)
        res.redirect("/pageError")
    }
}

const customerUnblocked = async (req,res) =>{
    try {
        let id = req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/users')
    } catch (error) {
        console.log("Error in customerBlocked ",error)
        res.redirect("/pageError")
    }
}

module.exports = {
    customerInfo,
    customerUnblocked,
    customerBlocked
};
