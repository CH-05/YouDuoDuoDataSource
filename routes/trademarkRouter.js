//产品相关的请求
const express = require('express');
const fileUpload = require("../config/storage");
const trademarkService = require("../services/trademarkService");
const trademarkRouter = express.Router();
//获取所有商品
trademarkRouter.get('/getAllProduct/page=:page/limit=:limit', trademarkService.getAllProduct)
//图片logo上传
trademarkRouter.post('/fileUpload', fileUpload.single('file'), trademarkService.fileUpload)
//添加或更新商品
trademarkRouter.post('/baseTrademark/save', trademarkService.addOrUpdateTrademark)
trademarkRouter.post('/baseTrademark/update', trademarkService.addOrUpdateTrademark)
//删除品牌
trademarkRouter.delete('/deleteTrademark/:product_id', trademarkService.deleteTrademark)
// 获取品牌关联的属性
trademarkRouter.get('/:product_id/attrs', trademarkService.getProductAttr);
// 保存品牌属性关联
trademarkRouter.post('/attr', trademarkService.saveProductAttr);
// 获取品牌的属性详情
trademarkRouter.get('/:product_id/attr/detail', trademarkService.getProductAttrDetail);

module.exports = trademarkRouter;
