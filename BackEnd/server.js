const express = require('express');
const cors = require('cors');
app.use(cors()); // Cho phép mọi nguồn truy cập vào API
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const fs = require('fs');

const Product = require('./models/Product'); 
const User = require('./models/User');

const app = express();
app.use(cors());
app.use(express.json());

// Thư mục chứa ảnh
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static(uploadDir));

// Cấu hình lưu ảnh
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// Kết nối Database (Tạo database mới tên là nongsan_v2)
// Thay chuỗi dưới đây bằng chuỗi bạn vừa Copy
const URI = "mongodb+srv://longthanh:Longthanh2007@nongsan.lhrq7cm.mongodb.net/?appName=Nongsan";

mongoose.connect(URI)
  .then(() => console.log("✅ Đã thông nòng! Kết nối MongoDB Atlas thành công."))
  .catch(err => console.log("❌ Lỗi kết nối: ", err));

// ==========================================
//                 CÁC API
// ==========================================

// 1. ĐĂNG KÝ TÀI KHOẢN
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email đã tồn tại!' });

    const newUser = new User({ fullName, email, password, role: 'FARMER' });
    await newUser.save();
    res.status(201).json({ status: 'success', message: 'Đăng ký thành công!' });
  } catch (error) { res.status(500).json({ message: 'Lỗi server.' }); }
});

// 2. ĐĂNG NHẬP (MỚI)
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password }); // Kiểm tra khớp cả email & pass
    if (!user) return res.status(400).json({ message: 'Sai email hoặc mật khẩu!' });
    
    // Trả về thông tin user (để Frontend biết ai đang đăng nhập)
    res.status(200).json({ 
      status: 'success', 
      data: { id: user._id, fullName: user.fullName, role: user.role } 
    });
  } catch (error) { res.status(500).json({ message: 'Lỗi server.' }); }
});

// 3. NÔNG DÂN TẠO LÔ HÀNG (Chờ duyệt)
app.post('/api/v1/farmer/products', upload.single('productImage'), async (req, res) => {
  try {
    const farmerName = req.body.farmerName || "Nông dân ẩn danh"; 
    const { name, quantity, unit, price } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Thiếu ảnh sản phẩm!' });

    const batchSerialNumber = `BAT-${uuidv4().substring(0, 6).toUpperCase()}`; 
    const qrCodeContent = `http://127.0.0.1:5500/track.html?id=${batchSerialNumber}`;
    
    const qrOutputFileName = `qr-${batchSerialNumber}.png`;
    await QRCode.toFile(path.join(uploadDir, qrOutputFileName), qrCodeContent);

    const newProduct = new Product({
      farmerId: farmerName,
      name, quantity, unit, price,
      productImageUrl: '/uploads/' + req.file.filename,
      batchSerialNumber, qrCodeContent,
      qrCodeImageUrl: `/uploads/${qrOutputFileName}`,
      status: 'PENDING' // <--- ĐÃ SỬA THÀNH PENDING (CHỜ DUYỆT)
    });

    await newProduct.save();
    res.status(201).json({ status: 'success', data: newProduct });
  } catch (error) { res.status(500).json({ message: 'Lỗi tạo sản phẩm.' }); }
});

// 4. LẤY DANH SÁCH SẢN PHẨM (MỚI NHẤT LÊN ĐẦU)
app.get('/api/v1/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', data: products });
  } catch (error) { res.status(500).json({ message: 'Lỗi server.' }); }
});

// 5. NGƯỜI TIÊU DÙNG TRA CỨU 1 SẢN PHẨM
app.get('/api/v1/consume/track/:batchSerial', async (req, res) => {
  try {
    const product = await Product.findOne({ batchSerialNumber: req.params.batchSerial });
    if (!product) return res.status(404).json({ message: 'Không tìm thấy lô hàng này!' });
    res.status(200).json({ status: 'success', data: product });
  } catch (error) { res.status(500).json({ message: 'Lỗi server.' }); }
});
// ==========================================
// API DÀNH RIÊNG CHO ADMIN
// ==========================================

// 6. ADMIN LẤY DANH SÁCH LÔ HÀNG CHỜ DUYỆT
app.get('/api/v1/admin/products/pending', async (req, res) => {
  try {
    // Tìm chính xác những sản phẩm có chữ PENDING (viết hoa)
    const products = await Product.find({ status: 'PENDING' }).sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', data: products });
  } catch (error) { 
    res.status(500).json({ message: 'Lỗi server.' }); 
  }
});

// 7. ADMIN CẬP NHẬT TRẠNG THÁI (DUYỆT/TỪ CHỐI)
app.put('/api/v1/admin/products/:id/status', async (req, res) => {
  try {
    const { status } = req.body; // 'APPROVED' hoặc 'REJECTED'
    const product = await Product.findByIdAndUpdate(
      req.params.id, 
      { status: status }, 
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Không tìm thấy lô hàng' });
    res.json({ status: 'success', data: product });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật' });
  }
});
// 8. ADMIN LẤY DANH SÁCH TÀI KHOẢN NÔNG DÂN
app.get('/api/v1/admin/users', async (req, res) => {
  try {
    // Chỉ lấy những người có role là FARMER
    const users = await User.find({ role: 'FARMER' }).select('-password'); 
    res.status(200).json({ status: 'success', data: users });
  } catch (error) { res.status(500).json({ message: 'Lỗi server.' }); }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại cổng ${PORT}`);
});
