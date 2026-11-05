const { Schema, model } = require('mongoose');

const productSchema = new Schema({
  productId: { type: String, required: true, unique: true },
  productName: { type: String, required: true },
  productPrice: { type: Number, required: true, min: 0 },
  category: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  description: { type: String, default: '' },
  // extra fields for filtering
  brand: String,
  colour: String,
  sizes: [String],
  gender: String,
});

module.exports = model('Product', productSchema);
