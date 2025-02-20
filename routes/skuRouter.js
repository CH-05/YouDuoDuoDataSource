const express = require('express');
const router = express.Router();
const skuService = require('../services/skuService');

// SKU列表
router.get('/list', skuService.getSkuList);

// SKU详情
router.get('/detail/:skuId', skuService.getSkuDetail);

// 添加/更新SKU
router.post('/save', skuService.saveSku);

// 删除SKU
router.delete('/delete/:skuId', skuService.deleteSku);

// 获取SPU销售属性
router.get('/saleAttr/:spuId', skuService.getSpuSaleAttr);

// 上传SKU图片
router.post('/image/upload', skuService.uploadSkuImage);

module.exports = router;

