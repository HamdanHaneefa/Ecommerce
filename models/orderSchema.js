const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');
const Product = require('./productSchema');

const orderSchema = new Schema({
    orderId: { 
        type: String,
        default: uuidv4, 
        unique: true,
        required: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true 
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Return Request', 'Returned' ,'Cancelled']
    },
    address: {
        type: Schema.Types.ObjectId,
        ref: 'Address',
        required: true
    },
    paymentMethod: {
        type: String,
        required: true  
    },  
    orderedItems: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",  
            required: true
        },
        variantId: {
            type: Schema.Types.ObjectId,
            ref: "Product.variants",
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true  
        },
        createdOn: {
            type: Date,
            default: Date.now,
            required: true
        },
        couponApplied: {
            type: Boolean,
            default: false
        }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
}, { timestamps: true }); 

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
