const db = require("../db");
const moment = require("moment");

const menuService = {
    // 获取菜单列表
    getMenuList: async (req, res) => {
        try {
            console.log('开始获取菜单列表...');
            
            const sql = `
                SELECT 
                    id,
                    parent_id,
                    name,
                    label,
                    level,
                    status,
                    created_at,
                    updated_at
                FROM menus 
                ORDER BY id ASC
            `;
            
            console.log('执行SQL查询:', sql);
            const [menus] = await db.promise().query(sql);
            console.log('查询结果:', menus);
            
            // 构建菜单树
            const buildMenuTree = (menus, parentId = 0) => {
                const result = [];
                menus.forEach(menu => {
                    if (menu.parent_id === parentId) {
                        const children = buildMenuTree(menus, menu.id);
                        if (children.length) {
                            menu.children = children;
                        }
                        // 格式化日期
                        menu.created_at = moment(menu.created_at).format('YYYY-MM-DD HH:mm:ss');
                        menu.updated_at = moment(menu.updated_at).format('YYYY-MM-DD HH:mm:ss');
                        result.push(menu);
                    }
                });
                return result;
            };
            
            const menuTree = buildMenuTree(menus);
            console.log('构建的菜单树:', JSON.stringify(menuTree, null, 2));
            
            res.send({
                code: 200,
                message: '获取成功',
                data: menuTree
            });
        } catch (error) {
            console.error('获取菜单列表错误:', error);
            console.error('错误堆栈:', error.stack);
            res.send({
                code: 201,
                message: '获取菜单列表失败',
                error: error.message
            });
        }
    },

    // 添加菜单
    addMenu: async (req, res) => {
        const { name, label, level, parent_id, status = 1 } = req.body;
        
        try {
            // 参数验证
            if (!name || !label) {
                return res.send({
                    code: 201,
                    message: '菜单名称和标识不能为空'
                });
            }

            // 检查菜单名称和标识是否已存在
            const [existingMenus] = await db.promise().query(
                'SELECT id FROM menus WHERE name = ? OR label = ?',
                [name, label]
            );

            if (existingMenus.length > 0) {
                return res.send({
                    code: 201,
                    message: '菜单名称或标识已存在'
                });
            }

            // 插入新菜单
            const [result] = await db.promise().query(
                `INSERT INTO menus (
                    name, 
                    label, 
                    level,
                    parent_id,
                    status,
                    created_at,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
                [name, label, level, parent_id, status]
            );

            res.send({
                code: 200,
                message: '添加菜单成功',
                data: {
                    id: result.insertId
                }
            });
        } catch (error) {
            console.error('添加菜单失败:', error);
            res.send({
                code: 201,
                message: '添加菜单失败',
                error: error.message
            });
        }
    },

    // 更新菜单
    updateMenu: async (req, res) => {
        const { menuId } = req.params;
        const { name, label, level, parent_id, status } = req.body;
        
        try {
            // 检查菜单是否存在
            const [existingMenu] = await db.promise().query(
                'SELECT id FROM menus WHERE id = ?',
                [menuId]
            );
            
            if (existingMenu.length === 0) {
                return res.send({
                    code: 404,
                    message: '菜单不存在'
                });
            }
            
            // 检查新的菜单名称或标识是否与其他菜单冲突
            const [conflictingMenus] = await db.promise().query(
                'SELECT id FROM menus WHERE (name = ? OR label = ?) AND id != ?',
                [name, label, menuId]
            );
            
            if (conflictingMenus.length > 0) {
                return res.send({
                    code: 400,
                    message: '菜单名称或标识已被其他菜单使用'
                });
            }
            
            // 更新菜单
            await db.promise().query(
                `UPDATE menus SET 
                    name = ?, 
                    label = ?, 
                    level = ?,
                    parent_id = ?,
                    status = ?,
                    updated_at = NOW()
                WHERE id = ?`,
                [name, label, level, parent_id, status, menuId]
            );
            
            res.send({
                code: 200,
                message: '更新菜单成功'
            });
        } catch (error) {
            console.error('更新菜单失败:', error);
            res.send({
                code: 500,
                message: '更新菜单失败'
            });
        }
    },

    // 删除菜单
    deleteMenu: async (req, res) => {
        const { menuId } = req.params;
        
        try {
            // 检查菜单是否存在
            const [existingMenu] = await db.promise().query(
                'SELECT id FROM menus WHERE id = ?',
                [menuId]
            );
            
            if (existingMenu.length === 0) {
                return res.send({
                    code: 404,
                    message: '菜单不存在'
                });
            }
            
            // 检查是否有子菜单
            const [childMenus] = await db.promise().query(
                'SELECT id FROM menus WHERE parent_id = ?',
                [menuId]
            );
            
            if (childMenus.length > 0) {
                return res.send({
                    code: 400,
                    message: '该菜单下有子菜单，无法删除'
                });
            }
            
            // 删除菜单
            await db.promise().query('DELETE FROM menus WHERE id = ?', [menuId]);
            
            res.send({
                code: 200,
                message: '删除菜单成功'
            });
        } catch (error) {
            console.error('删除菜单失败:', error);
            res.send({
                code: 500,
                message: '删除菜单失败'
            });
        }
    },

    // 更新菜单状态
    updateMenuStatus: async (req, res) => {
        const { menuId } = req.params;
        const { status } = req.body;
        
        try {
            // 检查菜单是否存在
            const [existingMenu] = await db.promise().query(
                'SELECT id FROM menus WHERE id = ?',
                [menuId]
            );
            
            if (existingMenu.length === 0) {
                return res.send({
                    code: 404,
                    message: '菜单不存在'
                });
            }
            
            // 更新状态
            await db.promise().query(
                'UPDATE menus SET status = ?, updated_at = NOW() WHERE id = ?',
                [status, menuId]
            );
            
            res.send({
                code: 200,
                message: '状态更新成功'
            });
        } catch (error) {
            console.error('更新菜单状态失败:', error);
            res.send({
                code: 500,
                message: '更新菜单状态失败'
            });
        }
    },

    // 获取角色菜单
    getRoleMenus: async (req, res) => {
        const { roleId } = req.params;

        if (!roleId) {
            return res.send({
                code: 201,
                message: '参数错误'
            });
        }

        try {
            const [menus] = await db.promise().query(
                `SELECT menu_id FROM role_menu WHERE role_id = ?`,
                [roleId]
            );

            res.send({
                code: 200,
                data: menus.map(menu => menu.menu_id)
            });
        } catch (error) {
            console.error('获取角色菜单错误:', error);
            res.send({
                code: 201,
                message: '获取角色菜单失败'
            });
        }
    },

    // 更新角色菜单
    updateRoleMenus: async (req, res) => {
        const { roleId, menuIds } = req.body;

        if (!roleId || !Array.isArray(menuIds)) {
            return res.send({
                code: 201,
                message: '参数错误'
            });
        }

        try {
            await db.promise().beginTransaction();

            // 删除旧的关联
            await db.promise().query(
                'DELETE FROM role_menu WHERE role_id = ?',
                [roleId]
            );

            // 添加新的关联
            if (menuIds.length > 0) {
                const values = menuIds.map(menuId => [roleId, menuId]);
                await db.promise().query(
                    'INSERT INTO role_menu (role_id, menu_id) VALUES ?',
                    [values]
                );
            }

            await db.promise().commit();

            res.send({
                code: 200,
                message: '更新成功'
            });
        } catch (error) {
            await db.promise().rollback();
            console.error('更新角色菜单错误:', error);
            res.send({
                code: 201,
                message: '更新角色菜单失败'
            });
        }
    }
};

module.exports = menuService; 