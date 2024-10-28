const { StreamDescription } = require('mongodb');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: false,
        unique: true,
        sparse: true,
        default: null
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    password: {
        type: String,
        required: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    profileImage: {
        type: String,
        default: ''
    },
    cart: [{
        type: Schema.Types.ObjectId,
        ref: "Cart"
    }],
    wallet: {
        type: Number,
        default: 0
    },
    transaction: [{
        type: {
            type: String
        },
        amount: {
            type: Number
        },
        status: {
            type: Boolean
        },
        orderId:{
            type: Schema.Types.ObjectId,
        },
        createOn: {
            type: Date,
            default: Date.now
        }
    }],
    createdOn: {
        type: Date,
        default: Date.now
    },
    referalCode: {
        type: String
    },
    wishlist: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product', 
            required: true
        },
        variantId: {
            type: Schema.Types.ObjectId,
            required: true
        },
        addedOn: {
            type: Date,
            default: Date.now
        }
    }]
});

const User = mongoose.model('User', userSchema);
module.exports = User;
