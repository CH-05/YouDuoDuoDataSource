const express = require('express');
const menuService = require('../services/menuService');
const menuRouter = express.Router();

// 获取菜单树
menuRouter.get('/tree', menuService.getMenuTree);

// 添加菜单
menuRouter.post('/add', menuService.addMenu);

// 更新菜单
menuRouter.put('/update', menuService.updateMenu);

// 删除菜单
menuRouter.delete('/:menuId', menuService.deleteMenu);

// 获取角色菜单
menuRouter.get('/role/:roleId', menuService.getRoleMenus);

// 更新角色菜单
menuRouter.post('/role', menuService.updateRoleMenus);

module.exports = menuRouter; 