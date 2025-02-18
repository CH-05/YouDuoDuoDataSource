const express = require('express');
const router = express.Router();
const attrService = require('../services/attrService');

// 获取分类列表
router.get('/getCategory', attrService.getCategory);

// 获取属性列表
router.get('/attrList/:categoryId', attrService.getAttrList);

// 添加或更新属性
router.post('/saveAttr', attrService.saveAttr);

// 删除属性
router.delete('/deleteAttr/:attrId', attrService.deleteAttr);

module.exports = router;
