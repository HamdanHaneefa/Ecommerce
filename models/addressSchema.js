const mongoose = require('mongoose');
const { Schema } = mongoose;

const addressSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    addresses : [{
        name: {
            type: String,
            required: true
        },
        street: { 
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        zipcode: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        },
        phone: {
            type: String, 
            required: true
        },
        placeName: {
            type: String,
            required: true
        },
        longitude: { 
            type: String,
            required: true
        },
        latitude: { 
            type: String,
            required: true
        }
    }],
}, { timestamps: true });

const Address = mongoose.model("Address", addressSchema);
module.exports = Address;
