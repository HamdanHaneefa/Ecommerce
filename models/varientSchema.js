const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define the Variant Schema
const variantSchema = new Schema({
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product', 
        required: true
    },
    color: {
        type: String,
        required: true
    },
    image: {type:Array},
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
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create the Variant model
const Variant = mongoose.model("Variant", variantSchema);

module.exports = Variant;
