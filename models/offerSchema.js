const mongoose = require('mongoose');
const {Schema} = mongoose;


const offerSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['product', 'brand', 'referral'],
        required: true
    },
    typeId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    percentage: {
        type: Number,
        required: false
    }
}, {
    timestamps: true
});

const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;