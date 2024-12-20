const mongoose = require('mongoose')
const {Schema} = mongoose;


const brandSchema = new Schema({
    name:{
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    offerPercentage:{
        type:Number,
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

const Brand = mongoose.model("Brand",brandSchema);
module.exports = Brand;