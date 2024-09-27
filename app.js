const express = require('express');
const app = express();
const path = require('path')
const env = require("dotenv").config();
const db = require('./config/db');
const exp = require('constants');
const session = require('express-session');
const passport = require('./config/passport')
const userRouter = require('./routes/userRouter');
const adminRouter = require('./routes/adminRouter');
const flash = require('connect-flash');
const morgan = require('morgan')
db() 
  

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(flash());
// app.use(morgan('dev'))
app.use(session({
   secret:process.env.SESSION_KEY,
   resave:false,
   saveUninitialized:true,
   cookie:{
    secure:false,
    httpOnly:true,
    maxAge:72*60*60*1000
   } 
}))
// Make flash messages accessible in all views
app.use((req, res, next) => {
   res.locals.success_msg = req.flash('success_msg');
   res.locals.error_msg = req.flash('error_msg');
   next();
 });

app.use(passport.initialize());
app.use(passport.session());



app.set("view engine","ejs")
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
app.use(express.static(path.join(__dirname,"public")))


app.use("/",userRouter)
app.use("/admin",adminRouter)



app.listen(process.env.PORT,()=>console.log("Server Running"))

module.exports = app;





