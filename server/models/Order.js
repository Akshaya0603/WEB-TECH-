const { Schema, model } = require('mongoose');

const orderSchema = new Schema(
  {
    emailId: { type: String, required: true, index: true },
    items: [
      {
        _id: false,
        productId: String,
        productName: String,
        productPrice: Number,
        quantity: Number,
      },
    ],
    subtotal: Number,
    deliveryCharge: Number,
    discount: Number,
    total: Number,
    couponApplied: Boolean,
    paymentMethod: String,
    status: { type: String, enum: ['Placed', 'Shipped', 'Delivered', 'Cancelled'], default: 'Placed' },
  },
  { timestamps: true }
);

module.exports = model('Order', orderSchema);
