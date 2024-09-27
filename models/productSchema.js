const mongoose = require('mongoose');
const { Schema } = mongoose;

// // Schema for individual variants (embedded inside the productSchema)
// const variantSchema = new Schema({
//     color: {
//         type: String,
//         required: true
//     },
//     price: {
//         type: Number,
//         required: true
//     },
//     stock: {
//         type: Number,
//         required: true
//     },
//     images: {
//         type: [String],
//         required: true
//     }
// }, { _id: false }); 

// // Main product schema
const productSchema = new Schema({
    productName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    brand: {
        type: String,
        required: true
    },
    connectionType: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    ProductImage:{
        type:String,
        required:true
    },
    isActive:{
        type:Boolean,
        default:true
    }
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
