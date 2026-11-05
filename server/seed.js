require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const P = (productId, productName, productPrice, category, quantity, description, brand, colour, sizes, gender) => ({
  productId, productName, productPrice, category, quantity, description, brand, colour, sizes, gender,
});
const SHOE = ['6', '7', '8', '9', '10'];
const CLOTH = ['S', 'M', 'L', 'XL'];

const products = [
  P('P001', 'Running Shoes', 1499, 'Footwear', 12, 'Lightweight mesh running shoes with cushioned sole.', 'Nike', 'Black', SHOE, 'Men'),
  P('P002', 'Sports Sneakers', 1899, 'Footwear', 2, 'Breathable everyday sneakers with grippy outsole.', 'Adidas', 'White', SHOE, 'Women'),
  P('P003', 'Casual Slip-ons', 899, 'Footwear', 20, 'Comfortable canvas slip-ons for daily wear.', 'Puma', 'Blue', SHOE, 'Unisex'),
  P('P004', 'Ankle Socks (Pack of 3)', 149, 'Footwear', 40, 'Soft cotton ankle socks.', 'Puma', 'White', ['Free'], 'Unisex'),
  P('P005', 'Cotton T-Shirt', 499, 'Clothing', 30, 'Regular fit round-neck cotton t-shirt.', 'H&M', 'Red', CLOTH, 'Men'),
  P('P006', 'Slim Fit Jeans', 1299, 'Clothing', 15, 'Stretch denim slim fit jeans.', "Levi's", 'Blue', CLOTH, 'Men'),
  P('P007', 'Floral Summer Dress', 1099, 'Clothing', 1, 'Knee-length floral print dress.', 'H&M', 'Pink', CLOTH, 'Women'),
  P('P008', 'Hooded Sweatshirt', 1199, 'Clothing', 9, 'Warm fleece hoodie with front pocket.', 'Nike', 'Black', CLOTH, 'Unisex'),
  P('P009', 'Baseball Cap', 199, 'Accessories', 25, 'Adjustable cotton cap.', 'Adidas', 'Black', ['Free'], 'Unisex'),
  P('P010', 'Leather Wallet', 349, 'Accessories', 18, 'Slim bi-fold genuine leather wallet.', "Levi's", 'Brown', ['Free'], 'Men'),
  P('P011', 'Aviator Sunglasses', 2499, 'Accessories', 6, 'UV-protected metal-frame sunglasses.', 'Ray-Ban', 'Gold', ['Free'], 'Unisex'),
  P('P012', 'Silk Scarf', 299, 'Accessories', 2, 'Printed lightweight silk scarf.', 'H&M', 'Red', ['Free'], 'Women'),
  P('P013', 'Trekking Backpack 40L', 1799, 'Bags', 8, 'Water-resistant backpack with padded straps.', 'Wildcraft', 'Green', ['Free'], 'Unisex'),
  P('P014', 'Laptop Sleeve 15"', 599, 'Bags', 14, 'Shock-absorbing laptop sleeve.', 'Wildcraft', 'Grey', ['Free'], 'Unisex'),
  P('P015', 'Ladies Handbag', 1399, 'Bags', 0, 'Faux-leather handbag with zip closure.', 'H&M', 'Pink', ['Free'], 'Women'),
  P('P016', 'Analog Watch', 2199, 'Watches', 5, 'Stainless-steel analog watch, 5 ATM water resistant.', 'Titan', 'Silver', ['Free'], 'Men'),
  P('P017', 'Digital Sports Watch', 1299, 'Watches', 3, 'Digital watch with stopwatch and backlight.', 'Fastrack', 'Black', ['Free'], 'Unisex'),
  P('P018', 'Women\'s Rose Gold Watch', 2599, 'Watches', 2, 'Elegant rose-gold strap watch.', 'Titan', 'Gold', ['Free'], 'Women'),
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shoppingdb');
  await Product.deleteMany({});
  await Product.insertMany(products);
  console.log(`Seeded ${products.length} products`);
  await mongoose.disconnect();
})();
