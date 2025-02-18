const express = require('express');
const router = express.Router();
const menuService = require('../services/menuService');

// 获取菜单列表
router.get('/list', menuService.getMenuList);

// 添加菜单
router.post('/add', menuService.addMenu);

// 更新菜单
router.put('/:menuId', menuService.updateMenu);

// 删除菜单
router.delete('/:menuId', menuService.deleteMenu);

// 更新菜单状态
router.put('/:menuId/status', menuService.updateMenuStatus);

// 获取角色菜单
router.get('/role/:roleId', menuService.getRoleMenus);

// 更新角色菜单
router.post('/role', menuService.updateRoleMenus);

module.exports = router; 