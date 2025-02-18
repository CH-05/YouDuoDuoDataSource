//用户相关请求
const express = require('express');
const aclService = require("../services/aclService");
const router = express.Router();

// 用户管理路由
router.get('/user/list/:page/:limit', aclService.getUserList);
router.post('/user/add', aclService.addOrUpdateNewUser);
router.put('/user/:userId', aclService.addOrUpdateNewUser);
router.delete('/user/:userId', aclService.removeUser);
router.delete('/users', aclService.removeUsers);
router.put('/user/:userId/status', aclService.updateUserStatus);
router.post('/user/:userId/reset-password', aclService.resetPassword);

// 角色管理路由
router.get('/role/list/:page/:limit', aclService.getRoleList);
router.get('/role/all', aclService.getAllRoles);
router.post('/role/add', aclService.addRole);
router.put('/role/:roleId', aclService.updateRole);
router.delete('/role/:roleId', aclService.deleteRole);
router.put('/role/:roleId/status', aclService.updateRoleStatus);

// 用户角色关联路由
router.get('/user/:userId/roles', aclService.getUserRoles);
router.post('/user/role', aclService.setUserRole);

// 权限管理路由
router.get('/user/:userId/menu', aclService.getPermissionMenu);
router.post('/user/permission', aclService.addUserPermission);

module.exports = router;
