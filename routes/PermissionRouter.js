//用户权限相关请求
const express = require('express');
const {getMenu} = require("../services/PermissionService");

const permissionRouter = express.Router();
//获取用户菜单
permissionRouter.get('/getMenu',getMenu)

module.exports = permissionRouter;
