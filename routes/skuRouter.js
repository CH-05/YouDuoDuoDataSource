const express = require('express');
const router = express.Router();
const skuService = require('../services/skuService');
const { skuUpload } = require('../config/storage');

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

// 上传SKU图片 - 使用专门的SKU图片上传配置
router.post('/image/upload', skuUpload.single('file'), skuService.uploadSkuImage);

// 获取品牌下的SKU商品列表
router.get('/trademark/:trademark_id', skuService.getSkuListByTrademark);

module.exports = router;

