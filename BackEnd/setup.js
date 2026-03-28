// File: backend/setup.js
const mongoose = require('mongoose');
const User = require('./models/User');

// Kết nối vào đúng Database nongsan_v2
mongoose.connect('mongodb://127.0.0.1:27017/nongsan_v2')
  .then(async () => {
    console.log('⏳ Đang kết nối Database...');
    
    // 1. Xóa tài khoản admin cũ (nếu có bị lỗi) để làm lại từ đầu
    await User.deleteOne({ email: 'admin@gmail.com' });
    
    // 2. Đúc tài khoản Admin mới chuẩn 100%
    const adminUser = new User({
      fullName: 'Quản trị viên Cấp cao',
      email: 'admin@gmail.com',
      password: 'admintest',
      role: 'ADMIN' // <--- Chìa khóa quyền lực ở đây
    });
    
    await adminUser.save();
    console.log('✅ THÀNH CÔNG! Đã tạo tài khoản Admin.');
    console.log('📧 Email: admin@gmail.com');
    console.log('🔑 Mật khẩu: admintest');
    console.log('👉 Bây giờ bạn có thể bật server và đăng nhập!');
    
    process.exit(); // Tự động tắt tool sau khi làm xong
  })
  .catch(err => {
    console.error('❌ Lỗi:', err);
    process.exit();
  });