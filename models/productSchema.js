const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define the Variant Schema
const variantSchema = new Schema({
    color: {
        type: String,
        required: true
    },
    images: {
        type: [String], 
        required: true
    },
    stock: {
        type: Number,
        required: true,
        min: 0
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    description:{
        type: String,
        required:true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Main Product Schema
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
    price:{
        type:String,
        required:true
    },
    stock:{
        type:String,
        required:true
    },
    ProductImage: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    variants: [variantSchema] 
}, { timestamps: true });

// Create the Product model
const Product = mongoose.model("Product", productSchema);

module.exports = Product;
