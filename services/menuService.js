const db = require("../db");

const menuService = {
    // 获取菜单树
    getMenuTree: async (req, res) => {
        try {
            console.log('开始获取菜单树...');
            const sql = `
                SELECT 
                    menu_id,
                    parent_id,
                    menu_name,
                    menu_code,
                    menu_level,
                    menu_type,
                    path,
                    component,
                    redirect,
                    icon,
                    sort_order,
                    hidden,
                    disabled
                FROM menus 
                ORDER BY sort_order ASC
            `;
            
            console.log('执行SQL查询:', sql);
            const [menus] = await db.promise().query(sql);
            console.log('查询结果:', menus);
            
            // 处理布尔值
            const processedMenus = menus.map(menu => ({
                ...menu,
                hidden: Boolean(menu.hidden),
                disabled: Boolean(menu.disabled)
            }));
            
            // 构建菜单树
            const buildTree = (parentId = null) => {
                return processedMenus
                    .filter(menu => menu.parent_id === parentId)
                    .map(menu => ({
                        ...menu,
                        children: buildTree(menu.menu_id)
                    }))
                    .sort((a, b) => a.sort_order - b.sort_order);
            };
            
            const menuTree = buildTree();
            console.log('构建的菜单树:', JSON.stringify(menuTree, null, 2));
            
            res.send({
                code: 200,
                data: menuTree
            });
        } catch (error) {
            console.error('获取菜单树错误:', error);
            console.error('错误堆栈:', error.stack);
            res.send({
                code: 201,
                message: '获取菜单树失败',
                error: error.message
            });
        }
    },

    // 添加菜单
    addMenu: async (req, res) => {
        const {
            parent_id,
            menu_name,
            menu_code,
            menu_level,
            menu_type,
            path,
            component,
            redirect,
            icon,
            sort_order,
            hidden,
            disabled
        } = req.body;

        if (!menu_name || !menu_code || !menu_level || !menu_type) {
            return res.send({
                code: 201,
                message: '缺少必要参数'
            });
        }

        try {
            // 检查菜单编码是否重复
            const [existingMenu] = await db.promise().query(
                'SELECT menu_id FROM menus WHERE menu_code = ?',
                [menu_code]
            );

            if (existingMenu.length > 0) {
                return res.send({
                    code: 201,
                    message: '菜单编码已存在'
                });
            }

            const [result] = await db.promise().query(
                `INSERT INTO menus(
                    parent_id, menu_name, menu_code, menu_level, menu_type,
                    path, component, redirect, icon, sort_order, hidden, disabled
                ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [parent_id, menu_name, menu_code, menu_level, menu_type,
                 path, component, redirect, icon, sort_order || 0, hidden || 0, disabled || 0]
            );

            res.send({
                code: 200,
                message: '添加成功',
                data: { menu_id: result.insertId }
            });
        } catch (error) {
            console.error('添加菜单错误:', error);
            res.send({
                code: 201,
                message: '添加菜单失败'
            });
        }
    },

    // 更新菜单
    updateMenu: async (req, res) => {
        const {
            menu_id,
            parent_id,
            menu_name,
            menu_code,
            menu_level,
            menu_type,
            path,
            component,
            redirect,
            icon,
            sort_order,
            hidden,
            disabled
        } = req.body;

        if (!menu_id || !menu_name || !menu_code || !menu_level || !menu_type) {
            return res.send({
                code: 201,
                message: '缺少必要参数'
            });
        }

        try {
            console.log('更新菜单，接收的数据:', req.body);
            
            // 检查菜单编码是否重复
            const [existingMenu] = await db.promise().query(
                'SELECT menu_id FROM menus WHERE menu_code = ? AND menu_id != ?',
                [menu_code, menu_id]
            );

            if (existingMenu.length > 0) {
                return res.send({
                    code: 201,
                    message: '菜单编码已存在'
                });
            }

            // 转换布尔值为数字
            const hiddenValue = hidden ? 1 : 0;
            const disabledValue = disabled ? 1 : 0;

            const [result] = await db.promise().query(
                `UPDATE menus SET
                    parent_id = ?,
                    menu_name = ?,
                    menu_code = ?,
                    menu_level = ?,
                    menu_type = ?,
                    path = ?,
                    component = ?,
                    redirect = ?,
                    icon = ?,
                    sort_order = ?,
                    hidden = ?,
                    disabled = ?
                WHERE menu_id = ?`,
                [parent_id, menu_name, menu_code, menu_level, menu_type,
                 path, component, redirect, icon, sort_order, hiddenValue, disabledValue, menu_id]
            );

            console.log('更新结果:', result);

            if (result.affectedRows === 0) {
                return res.send({
                    code: 201,
                    message: '菜单不存在'
                });
            }

            res.send({
                code: 200,
                message: '更新成功'
            });
        } catch (error) {
            console.error('更新菜单错误:', error);
            res.send({
                code: 201,
                message: '更新菜单失败',
                error: error.message
            });
        }
    },

    // 删除菜单
    deleteMenu: async (req, res) => {
        const { menuId } = req.params;

        if (!menuId) {
            return res.send({
                code: 201,
                message: '参数错误'
            });
        }

        try {
            // 检查是否有子菜单
            const [children] = await db.promise().query(
                'SELECT menu_id FROM menus WHERE parent_id = ?',
                [menuId]
            );

            if (children.length > 0) {
                return res.send({
                    code: 201,
                    message: '请先删除子菜单'
                });
            }

            // 删除菜单
            const [result] = await db.promise().query(
                'DELETE FROM menus WHERE menu_id = ?',
                [menuId]
            );

            if (result.affectedRows === 0) {
                return res.send({
                    code: 201,
                    message: '菜单不存在'
                });
            }

            res.send({
                code: 200,
                message: '删除成功'
            });
        } catch (error) {
            console.error('删除菜单错误:', error);
            res.send({
                code: 201,
                message: '删除菜单失败'
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