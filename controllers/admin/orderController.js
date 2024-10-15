const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Address = require('../../models/addressSchema')


const loadOrders = async(req, res) =>{
    try {
        const orders = await Order.find().populate('userId')
        res.render('orderinfo', { orders ,url: req.originalUrl });
    } catch (error) {
        console.log("Error occured in loadOrders",error)
        res.redirect('/admin/')
    }
}

const orderDetails = async (req,res) =>{
    try {
        const orderId = req.params.id
        const order = await Order.findById(orderId).populate('orderedItems.product')
        const user = await User.findById(order.userId);
        const address = await Address.findOne({userId:order.userId})
        const addressDetail = address.addresses.id(order.address)

        if(!orderId || !order || !user || !address || !addressDetail){
            console.log("Required all things , somthing missing!")
            res.redirect('/admin/orders')
        }
        let errorMessage = null;
        if(order.status === 'Cancelled'){
            errorMessage = "You can't update the status once it is Returned ."
            console.log(errorMessage)
        }

        const orderDetails = order.orderedItems.map(item => {
            const variant = item.product.variants.id(item.variantId); 
            return {
                orderId: order._id,
                productName: item.product.productName,
                price: variant.price,
                color: variant.color,
                quantity: item.quantity,
                productPrice: variant.price*item.quantity,
                productImage: variant.images[0], 
                createdOn: variant.createdAt,
                status: order.status,
            };
        });
        console.log(orderDetails)
        res.render('orderDetails',{order, orderDetails, addressDetail, errorMessage, user, url: req.originalUrl })
    } catch (error) {
        console.log("Error occured in orderDetails ",error)
        res.redirect('/admin/')
    }
}

const changeStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        console.log(orderId, status);
        const order = await Order.findById(orderId);

        const Status = status === 'pending' ? 'Pending' : status === 'shipped' ? 'Shipped' : status === 'delivered' ? 'Delivered' : null;

        if (!Status) {
            return res.status(400).json({ success: false, message: 'Invalid status provided.' });
        }
        console.log(Status)
        if( order.status === 'Cancelled'){
            return res.status(400).json({success:false , message:"You can't update the status once it is Returned ."})
        }
        order.status = Status; 
        await order.save();

        console.log(Status);
        res.json({ success: true, status: Status });
    } catch (error) {
        console.error("Error occurred in changeStatus", error);
        res.status(500).json({ success: false, message: 'An error occurred while updating the order status.' });
    }
}



module.exports = {
    loadOrders,
    orderDetails,
    changeStatus
}