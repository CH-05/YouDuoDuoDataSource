//用户相关请求
const express = require('express');
const aclService = require("../services/aclService");
const aclRouter = express.Router();
//获取用户列表
aclRouter.get('/getUserList/page=:page/limit=:limit', aclService.getUserList)
//单个删除用户
aclRouter.delete('/removeUser',aclService.removeUser)
//批量删除用户
aclRouter.delete('/removeUsers',aclService.removeUsers)
//添加新用户
aclRouter.post('/addNewUser',aclService.addNewUser)

module.exports = aclRouter