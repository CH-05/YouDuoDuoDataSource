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
aclRouter.post('/addOrUpdateNewUser',aclService.addOrUpdateNewUser)
//修改用户权限
aclRouter.post("/setUserRole",aclService.setUserRole)
//获取所有用户角色
aclRouter.get('/getRoleList/page=:page/limit=:limit', aclService.getRoleList)
//获取用户权限菜单
aclRouter.get('/getPermissionMenu', aclService.getPermissionMenu)
//添加用户权限
aclRouter.post('/addUserPermission', aclService.addUserPermission)
module.exports = aclRouter