const mongoose = require('mongoose');

const plantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    image: { type: String, required: true },
    shortDescription: { type: String, required: true },
    description: { type: String, required: true },
    medicinalProperties: [String],
    usage: { type: String, required: true }
});

module.exports = mongoose.model('Plant', plantSchema); 