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

const loadDashboard = async (req, res) => {
    try {
        // Basic stats aggregation
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

        // Get top 10 selling products
        const topProducts = await Order.aggregate([
            { $unwind: '$orderedItems' },  // Unwind the orderedItems array
            {
                $group: {
                    _id: '$orderedItems.product',  // Group by the product ID
                    totalSales: { $sum: '$orderedItems.quantity' }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $project: {
                    _id: 1,
                    productName: '$productDetails.productName',
                    totalSales: 1,
                    ProductImage: '$productDetails.ProductImage'
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 }
        ]);

        // Identify best-selling product
        const bestSellingProduct = topProducts[0]; // The first item in the sorted array has the highest sales

        // Get top 10 selling brands
        const topBrands = await Order.aggregate([
            { $unwind: '$orderedItems' },  // Unwind the orderedItems array
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $group: {
                    _id: '$productDetails.brand',  // Group by the brand field in product details
                    totalSales: { $sum: '$orderedItems.quantity' }  // Sum the quantities sold
                }
            },
            {
                $lookup: {
                    from: 'brands',
                    let: { brandName: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$name', '$$brandName'] }  // Match brand names
                            }
                        }
                    ],
                    as: 'brandDetails'
                }
            },
            { $unwind: '$brandDetails' },  // Unwind brand details to access fields
            {
                $project: {
                    brandName: '$_id',  // The brand name is the grouped ID
                    totalSales: 1,
                    isActive: '$brandDetails.isActive'  // Get the active status from brand details
                }
            },
            { $match: { isActive: true } },  // Filter for active brands only
            { $sort: { totalSales: -1 } },   // Sort by total sales in descending order
            { $limit: 10 }                   // Limit to top 10 brands
        ]);

        // Identify best-selling brand
        const bestSellingBrand = topBrands[0]; // The first item in the sorted array has the highest sales

        const stats = {
            salesCount: salesCount,
            totalOrderAmount: totalOrderAmount[0] ? totalOrderAmount[0].totalAmount : 0,
            totalDiscount: totalDiscount[0] ? totalDiscount[0].totalDiscount : 0,
        };

        // Get the past 7 days labels
        const days = [];
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(today.getDate() - i);
            const options = { weekday: 'long', month: 'long', day: 'numeric' };
            days.push(date.toLocaleDateString('en-US', options));
        }
        days.reverse();

        // Set up date range for aggregation
        today.setHours(23, 59, 59, 999);
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);

        // Function to get counts for a specific status
        const getOrderCountsByStatus = async (status) => {
            const counts = await Order.aggregate([
                {
                    $match: {
                        status: status,
                        createdAt: {
                            $gte: startDate,
                            $lte: today
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$createdAt"
                            }
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { _id: 1 }
                }
            ]);

            const dates = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                dates.push(date.toISOString().split('T')[0]);
            }

            return dates.map(date => {
                const found = counts.find(item => item._id === date);
                return found ? found.count : 0;
            });
        };

        const pendingCountsArray = await getOrderCountsByStatus('Pending');
        const shippedCountsArray = await getOrderCountsByStatus('Shipped');
        const deliveredCountsArray = await getOrderCountsByStatus('Delivered');

        // Render the dashboard view with all data, including best-selling product and brand
        res.render('dashboard', {
            stats,
            url: req.originalUrl,
            days,
            pendingCountsArray,
            shippedCountsArray,
            deliveredCountsArray,
            topProducts,
            topBrands,
            bestSellingProduct, 
            bestSellingBrand 
        });

    } catch (error) {
        console.log("Error occurred in loadDashboard", error);
        res.status(500).send("Error loading dashboard");
    }
};


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




module.exports ={
    pageNotFound,
    loadLogin,
    loadDashboard,
    generateReport,
}