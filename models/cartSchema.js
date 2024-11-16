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
            type:Schema.Types.ObjectId, 
            ref: "Variant",
            required: true
        },
        quantity:{
            type:Number,
            default:1      
        },
    }],
    // cartTotal:{
    //     type:Number,
    //     required:false
    // },
    // deliveryCharge:{
    //     type:Number,
    //     default:0,
    //     required:false
    // },
    // discount:{
    //     type:Number,
    //     required:false
    // },
    // finalAmount:{
    //     type:Number,
    //     required:false
    // },
    // couponRedeemed: {
    //     status: {
    //         type: Boolean,
    //         default: false
    //     },
    //     coupon: {
    //         type: String,
    //         default: null
    //     }
    // }
})


const Cart = mongoose.model("Cart",cartSchema);
module.exports = Cart