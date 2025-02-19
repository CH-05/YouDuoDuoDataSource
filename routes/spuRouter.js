const express = require('express');
const router = express.Router();
const spuService = require('../services/spuService');
const fileUpload = require('../config/storage');

// 获取SPU列表
router.get('/list/:page/:limit', spuService.getSpuList);

// 获取SPU详情
router.get('/:spuId', spuService.getSpuDetail);

// 添加SPU
router.post('/add', spuService.addSpu);

// 更新SPU
router.put('/:spuId', spuService.updateSpu);

// 删除SPU
router.delete('/:spuId', spuService.deleteSpu);

// 上传SPU图片
router.post('/image/upload', fileUpload.single('file'), spuService.uploadSpuImage);

// 获取销售属性列表
router.get('/saleAttr/:spuId', spuService.getSaleAttrList);

// 保存销售属性
router.post('/saleAttr/:spuId', spuService.saveSaleAttr);

module.exports = router; 