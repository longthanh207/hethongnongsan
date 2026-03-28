const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  farmerId: { type: String, required: true }, // Sau này sẽ lưu tên thật của Nông dân
  name: { type: String, required: true }, 
  quantity: { type: Number, required: true },
  unit: { type: String, required: true }, 
  price: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['PENDING', 'APPROVED', 'REJECTED'], 
    default: 'PENDING' 
  },
  productImageUrl: { type: String, required: true },
  batchSerialNumber: { type: String, required: true, unique: true }, 
  qrCodeContent: { type: String, required: true },                   
  qrCodeImageUrl: { type: String, required: true },                  
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Product', ProductSchema);