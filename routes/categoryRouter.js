const express = require('express');
const categoryService = require('../services/categoryService');
const categoryRouter = express.Router();

// 获取分类列表
categoryRouter.get('/list', categoryService.getCategoryList);

// 添加分类
categoryRouter.post('/add', categoryService.addCategory);

module.exports = categoryRouter; 