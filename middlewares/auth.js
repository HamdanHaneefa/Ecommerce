const User = require('../models/userSchema')


const userAuth = (req, res, next) => {
    if (req.session.user) {
        User.findById(req.session.user)
            .then(user => {
                if (user) {
                    if (user.isBlocked) {
                        return res.redirect("/login");
                    } else {
                        return next(); 
                    }
                } else {
                    return res.redirect('/signup'); 
                }
            })
            .catch(error => {
                console.log("Error in user auth middleware", error);
                return res.status(500).send("Internal Server error");
            });
    } else {
        return res.redirect('/login');
    }
};


const adminAuth = (req, res, next) => {
    if (!req.session || !req.session.admin) {
        return res.redirect("/admin/login");
    }

    User.findOne({ isAdmin: true })
        .then(data => {
            if (data) {
                return next();
            }
            res.redirect("/admin/login");
        })
        .catch(error => {
            console.log("Error in adminAuth middleware", error);
            res.status(500).send("Internal Server Error");
        });
};





module.exports = {
    userAuth,
    adminAuth
}