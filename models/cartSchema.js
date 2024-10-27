const mongoose = require('mongoose');
const Product = require('./productSchema');
const {Schema} = mongoose;


const cartSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    items:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        variantId: { 
            type: Schema.Types.ObjectId,
            ref: "Variant", 
            required: true
        },
        quantity:{
            type:Number,
            default:1      
        },
        price:{
            type:Number,
            required:true
        },
        stock:{
            type:Number,
            required:true
        },
        totalPrice:{
            type:Number,
            required:true
        },
        variantImage: {
            type: String,
            required: false
        },
        status:{
            type:String,
            default:'placed'
        }
    }],
    cartTotal:{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        required:true
    },
    finalAmount:{
        type:Number,
        required:true
    },
    couponRedeemed: {
        status: {
            type: Boolean,
            default: false
        },
        coupon: {
            type: String,
            default: null
        }
    }
})


const Cart = mongoose.model("Cart",cartSchema);
module.exports = Cart