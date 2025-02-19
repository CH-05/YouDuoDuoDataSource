const express = require('express');
const router = express.Router();
const attrService = require('../services/attrService');

// 获取属性列表
router.get('/attr/list/:category_id/:page/:limit', attrService.getAttrList);

// 获取分类列表
router.get('/category/list', attrService.getCategory);

// 添加属性
router.post('/attr/add', attrService.addAttr);

// 更新属性
router.put('/attr/:attr_id', attrService.updateAttr);

// 删除属性
router.delete('/attr/:attr_id', attrService.deleteAttr);

// 获取属性值列表
router.get('/attr/values/:attr_id', attrService.getAttrValues);

// 更新属性值
router.put('/attr/values/:attr_id', attrService.updateAttrValues);

module.exports = router;
