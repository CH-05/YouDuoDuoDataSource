//图片上传封装
const multer = require('multer')
const path = require('path')
const storage = multer.diskStorage({
    //文件保存路径
    destination: (req, file, cb) => {
        //保存的商标图片路径
        cb(null, path.join(__dirname, '../public/uploads/logo'))
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
    
})

const fileUpload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 限制2MB
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.mimetype)) {
            cb(new Error('只允许上传 JPG/PNG/GIF 格式的图片!'), false);
            return;
        }
        cb(null, true);
    }
});

module.exports = fileUpload