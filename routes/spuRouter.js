const express = require('express');
const spuService = require('../services/spuService');
const fileUpload = require('../config/storage');
const spuRouter = express.Router();

// 获取SPU列表
spuRouter.get('/list', spuService.getSpuList);

// 获取SPU详情
spuRouter.get('/:spuId', spuService.getSpuDetail);

// 保存SPU
spuRouter.post('/save', spuService.saveSpu);

// 删除SPU
spuRouter.delete('/:spuId', spuService.deleteSpu);

// 上传SPU图片
spuRouter.post('/image/upload', fileUpload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.send({
                code: 201,
                message: '请选择要上传的图片'
            });
        }

        const imageUrl = `/public/uploads/spu/${req.file.filename}`;
        res.send({
            code: 200,
            message: '图片上传成功',
            data: imageUrl
        });
    } catch (error) {
        console.error('图片上传错误:', error);
        res.send({
            code: 201,
            message: '图片上传失败'
        });
    }
});

module.exports = spuRouter; 