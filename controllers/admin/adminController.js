const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const moment = require('moment');


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
   try {
    const salesCount = await Order.countDocuments();

    const totalOrderAmount = await Order.aggregate([
        {
            $group: {
                _id: null,
                totalAmount: { $sum: '$totalAmount' },
            },
        },
    ]);

    const totalDiscount = await Order.aggregate([
        {
            $group: {
                _id: null,
                totalDiscount: { $sum: '$discount' },
            },
        },
    ]);
    const stats = {
        salesCount: salesCount,
        totalOrderAmount: totalOrderAmount[0] ? totalOrderAmount[0].totalAmount : 0,
        totalDiscount: totalDiscount[0] ? totalDiscount[0].totalDiscount : 0,
    };


    res.render('dashboard', { stats ,url:req.originalUrl});

   } catch (error) {
        console.log("Error occured in loadDashboard",error)
   }
}




const generateReport = async (req, res) => {
    const reportType = req.query.reportType;

    let startDate, endDate;
    const now = moment();
    
    switch (reportType) {
        case 'daily':
            startDate = now.startOf('day').toDate();
            endDate = now.endOf('day').toDate();
            break;
        case 'weekly':
            startDate = now.startOf('week').toDate();
            endDate = now.endOf('week').toDate();
            break;
        case 'monthly':
            startDate = now.startOf('month').toDate();
            endDate = now.endOf('month').toDate();
            break;
        case 'yearly':
            startDate = now.startOf('year').toDate();
            endDate = now.endOf('year').toDate();
            break;
        default:
            return res.status(400).json({ error: "Invalid report type" });
    }

    try {
        console.log(reportType)
        const orders = await Order.find({
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        }).populate('userId', 'name') 
          .select('orderId userId totalAmount discount finalAmount status paymentMethod createdAt');

        // Format the orders to include user name
        const formattedOrders = orders.map(order => ({
            orderId: order.orderId,
            userName: order.userId ? order.userId.name : 'Unknown',
            totalAmount: order.totalAmount,
            discount: order.discount,
            finalAmount: order.finalAmount,
            status: order.status,
            paymentMethod: order.paymentMethod,
            createdAt: order.createdAt
        }));

        res.json(formattedOrders);
    } catch (error) {
        console.error("Error generating report:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = {
    generateReport,
};

    

module.exports ={
    pageNotFound,
    loadLogin,
    loadDashboard,
    generateReport
}