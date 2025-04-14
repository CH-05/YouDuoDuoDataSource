//图片上传封装
const multer = require('multer')
const path = require('path')
const fs = require('fs')

// 确保目录存在
const ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// 商标图片存储
const logoStorage = multer.diskStorage({
    //文件保存路径
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../public/uploads/logo');
        ensureDir(uploadDir);
        //保存的商标图片路径
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
});

// SPU图片存储
const spuStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../public/uploads/spu');
        ensureDir(uploadDir);
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
});

// SKU图片存储
const skuStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../public/uploads/sku');
        ensureDir(uploadDir);
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
});

// 通用文件过滤器配置
const fileFilter = function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
        cb(new Error('只允许上传 JPG/PNG/GIF 格式的图片!'), false);
        return;
    }
    cb(null, true);
};

// 通用大小限制配置
const limits = {
    fileSize: 2 * 1024 * 1024 // 限制2MB
};

// 默认的商标图片上传（向后兼容）
const fileUpload = multer({
    storage: logoStorage,
    limits: limits,
    fileFilter: fileFilter
});

// SPU图片上传
const spuUpload = multer({
    storage: spuStorage,
    limits: limits,
    fileFilter: fileFilter
});

// SKU图片上传
const skuUpload = multer({
    storage: skuStorage,
    limits: limits,
    fileFilter: fileFilter
});

module.exports = {
    fileUpload: fileUpload,
    spuUpload: spuUpload, 
    skuUpload: skuUpload,
    // 为了向后兼容
    single: fileUpload.single
}