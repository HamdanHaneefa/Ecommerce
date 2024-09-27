const mongoose = require('mongoose');
const {Schema} = mongoose;
const {v4:uuidv4} = require('uuid');
const Product = require('./productSchema');

const orderSchema = new Schema({
    orderId:{
        type:String,
        default:()=>uuidv4(),
        unique:true
    },
    orderedItems:[{
        product:{
            required:true
        },
        quantity:{
            type:Number,
            required:true
        },
        price:{
            type:Number,
            default:0
        },
        address:{
            type:Schema.Types.ObjectId,
            ref:'User',
            required:true
        },
        status:{
            type:String,
            required:true,
            enum:['Pending','Processing','Shipped','Delivered','Return Request','Returned']
        },
        createdOn:{
            type:Date,
            default:Date.now,
            required:true
        },
        couponApplied:{
            type:Boolean,
            default:false
        }
    }]
})

const Order = mongoose.model("Order",orderSchema);
module.exports = Order