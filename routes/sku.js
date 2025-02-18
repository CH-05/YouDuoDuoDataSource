const express = require('express');
const router = express.Router();
const skuService = require('../services/skuService');

// 获取SKU列表
router.get('/list', skuService.getSkuList);

// 获取SKU详情
router.get('/detail/:skuId', skuService.getSkuDetail);

// 保存SKU（新增/更新）
router.post('/save', skuService.saveSku);

// 删除SKU
router.delete('/delete/:skuId', skuService.deleteSku);

// 获取SPU的销售属性
router.get('/spuSaleAttr/:spuId', skuService.getSpuSaleAttr);

module.exports = router; 