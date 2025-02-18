const db = require("../db");
const bcrypt = require("bcrypt");
const moment = require("moment");
const aclService = {
    //获取用户列表
    getUserList: async (req, res) => {
        const { keyword } = req.query;
        const page = parseInt(req.params.page);
        const limit = parseInt(req.params.limit);
        const offset = (page - 1) * limit;

        try {
            // 获取总数的查询
            let countSql = "SELECT COUNT(*) as total FROM users";
            let countParams = [];
            
            if (keyword) {
                countSql += " WHERE username LIKE ? OR nickname LIKE ?";
                countParams.push(`%${keyword}%`, `%${keyword}%`);
            }

            const [countResult] = await db.promise().query(countSql, countParams);
            const total = countResult[0].total;

            // 查询用户数据
            let sql = `
                SELECT u.user_id, u.username, u.nickname, u.email, u.phone, 
                       u.status, u.created_at, u.updated_at,
                       GROUP_CONCAT(r.role_name) as role_names,
                       GROUP_CONCAT(r.role_id) as role_ids
                FROM users u
                LEFT JOIN user_role ur ON u.user_id = ur.user_id
                LEFT JOIN roles r ON ur.role_id = r.role_id
            `;
            
            let params = [];
            if (keyword) {
                sql += " WHERE u.username LIKE ? OR u.nickname LIKE ?";
                params.push(`%${keyword}%`, `%${keyword}%`);
            }
            
            sql += " GROUP BY u.user_id ORDER BY u.created_at DESC LIMIT ? OFFSET ?";
            params.push(limit, offset);

            const [users] = await db.promise().query(sql, params);

            // 处理每个用户的角色信息
            const processedUsers = users.map(user => ({
                ...user,
                roles: user.role_names ? 
                    user.role_names.split(',').map((name, index) => ({
                        role_name: name,
                        role_id: user.role_ids.split(',')[index]
                    })) : [],
                created_at: moment(user.created_at).format('YYYY-MM-DD HH:mm:ss'),
                updated_at: moment(user.updated_at).format('YYYY-MM-DD HH:mm:ss')
            }));

            res.send({
                code: 200,
                message: '获取成功',
                data: {
                    records: processedUsers,
                    total,
                    size: limit,
                    current: page,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('获取用户列表错误:', error);
            res.send({
                code: 201,
                message: '获取用户列表失败',
                error: error.message
            });
        }
    },
    //单个删除用户
    removeUser: async (req, res) => {
        const userId = req.params.userId;

        try {
            // 检查是否是管理员账号
            const [user] = await db.promise().query(
                `SELECT r.role_id 
                FROM users u 
                LEFT JOIN user_role ur ON u.user_id = ur.user_id 
                LEFT JOIN roles r ON ur.role_id = r.role_id 
                WHERE u.user_id = ?`,
                [userId]
            );

            if (user.some(u => u.role_id === 1)) {
                return res.send({
                    code: 201,
                    message: '不能删除管理员账号'
                });
            }

            // 开始事务
            const connection = await db.promise().getConnection();
            await connection.beginTransaction();

            try {
                // 删除用户角色关联
                await connection.query('DELETE FROM user_role WHERE user_id = ?', [userId]);
                
                // 删除用户
                const [result] = await connection.query('DELETE FROM users WHERE user_id = ?', [userId]);

                if (result.affectedRows === 0) {
                    await connection.rollback();
                    return res.send({
                        code: 201,
                        message: '用户不存在'
                    });
                }

                await connection.commit();
                res.send({
                    code: 200,
                    message: '删除成功'
                });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('删除用户错误:', error);
            res.send({
                code: 201,
                message: '删除失败',
                error: error.message
            });
        }
    },
    //批量删除用户
    removeUsers: async (req, res) => {
        const { users_id } = req.body;

        try {
            // 检查是否包含管理员账号
            const [users] = await db.promise().query(
                `SELECT r.role_id 
                FROM users u 
                LEFT JOIN user_role ur ON u.user_id = ur.user_id 
                LEFT JOIN roles r ON ur.role_id = r.role_id 
                WHERE u.user_id IN (?)`,
                [users_id]
            );

            if (users.some(u => u.role_id === 1)) {
                return res.send({
                    code: 201,
                    message: '选中的用户中包含管理员账号，无法删除'
                });
            }

            // 开始事务
            const connection = await db.promise().getConnection();
            await connection.beginTransaction();

            try {
                // 删除用户角色关联
                await connection.query('DELETE FROM user_role WHERE user_id IN (?)', [users_id]);
                
                // 删除用户
                await connection.query('DELETE FROM users WHERE user_id IN (?)', [users_id]);

                await connection.commit();
                res.send({
                    code: 200,
                    message: '批量删除成功'
                });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('批量删除用户错误:', error);
            res.send({
                code: 201,
                message: '批量删除失败',
                error: error.message
            });
        }
    },
    //添加或更新用户
    addOrUpdateNewUser: async (req, res) => {
        const { user_id, username, password, nickname, email, phone, status, role_ids } = req.body;
        
        try {
            // 更新用户
            if (user_id) {
                // 检查用户是否存在
                const [existingUser] = await db.promise().query(
                    'SELECT user_id FROM users WHERE user_id = ?',
                    [user_id]
                );

                if (existingUser.length === 0) {
                    return res.send({
                        code: 201,
                        message: '用户不存在'
                    });
                }

                // 检查用户名是否被其他用户使用
                const [nameConflict] = await db.promise().query(
                    'SELECT user_id FROM users WHERE username = ? AND user_id != ?',
                    [username, user_id]
                );

                if (nameConflict.length > 0) {
                    return res.send({
                        code: 201,
                        message: '该用户名已被使用'
                    });
                }

                // 开始事务
                const connection = await db.promise().getConnection();
                await connection.beginTransaction();

                try {
                    // 更新用户基本信息
                    await connection.query(
                        `UPDATE users SET 
                            username = ?,
                            nickname = ?,
                            email = ?,
                            phone = ?,
                            status = ?,
                            updated_at = NOW()
                        WHERE user_id = ?`,
                        [username, nickname, email, phone, status, user_id]
                    );

                    // 如果提供了角色ID，更新用户角色
                    if (role_ids) {
                        // 删除原有角色
                        await connection.query(
                            'DELETE FROM user_role WHERE user_id = ?',
                            [user_id]
                        );

                        // 添加新角色
                        if (role_ids.length > 0) {
                            const roleValues = role_ids.map(roleId => [user_id, roleId]);
                            await connection.query(
                                'INSERT INTO user_role (user_id, role_id) VALUES ?',
                                [roleValues]
                            );
                        }
                    }

                    await connection.commit();
                    res.send({
                        code: 200,
                        message: '更新用户成功'
                    });
                } catch (error) {
                    await connection.rollback();
                    throw error;
                } finally {
                    connection.release();
                }
            } 
            // 添加新用户
            else {
                if (!username || !password) {
                    return res.send({
                        code: 201,
                        message: '用户名和密码不能为空'
                    });
                }

                // 检查用户名是否已存在
                const [existingUser] = await db.promise().query(
                    'SELECT user_id FROM users WHERE username = ?',
                    [username]
                );

                if (existingUser.length > 0) {
                    return res.send({
                        code: 201,
                        message: '该用户名已存在'
                    });
                }

                // 加密密码
                const hashedPassword = await bcrypt.hash(password, 12);

                // 开始事务
                const connection = await db.promise().getConnection();
                await connection.beginTransaction();

                try {
                    // 插入用户基本信息
                    const [insertResult] = await connection.query(
                        `INSERT INTO users (
                            username,
                            password,
                            nickname,
                            email,
                            phone,
                            status,
                            created_at,
                            updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                        [username, hashedPassword, nickname, email, phone, status]
                    );

                    const userId = insertResult.insertId;

                    // 如果提供了角色ID，添加用户角色关联
                    if (role_ids && role_ids.length > 0) {
                        const roleValues = role_ids.map(roleId => [userId, roleId]);
                        await connection.query(
                            'INSERT INTO user_role (user_id, role_id) VALUES ?',
                            [roleValues]
                        );
                    }

                    await connection.commit();
                    res.send({
                        code: 200,
                        message: '添加用户成功',
                        data: { user_id: userId }
                    });
                } catch (error) {
                    await connection.rollback();
                    throw error;
                } finally {
                    connection.release();
                }
            }
        } catch (error) {
            console.error('操作用户失败:', error);
            res.send({
                code: 201,
                message: user_id ? '更新用户失败' : '添加用户失败',
                error: error.message
            });
        }
    },
    //设置用户角色
    setUserRole: async (req, res) => {
        const { user_id, role_ids } = req.body;

        try {
            // 检查用户是否存在
            const [user] = await db.promise().query(
                'SELECT user_id FROM users WHERE user_id = ?',
                [user_id]
            );

            if (user.length === 0) {
                return res.send({
                    code: 201,
                    message: '用户不存在'
                });
            }

            // 检查是否是管理员账号
            const [userRoles] = await db.promise().query(
                `SELECT role_id FROM user_role WHERE user_id = ?`,
                [user_id]
            );

            if (userRoles.some(r => r.role_id === 1)) {
                return res.send({
                    code: 201,
                    message: '不能修改管理员角色'
                });
            }

            // 开始事务
            const connection = await db.promise().getConnection();
            await connection.beginTransaction();

            try {
                // 删除原有角色
                await connection.query('DELETE FROM user_role WHERE user_id = ?', [user_id]);

                // 添加新角色
                if (role_ids && role_ids.length > 0) {
                    const roleValues = role_ids.map(roleId => [user_id, roleId]);
                    await connection.query(
                        'INSERT INTO user_role (user_id, role_id) VALUES ?',
                        [roleValues]
                    );
                }

                await connection.commit();
                res.send({
                    code: 200,
                    message: '角色设置成功'
                });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('设置用户角色错误:', error);
            res.send({
                code: 201,
                message: '角色设置失败',
                error: error.message
            });
        }
    },
    //获取所有用户角色
    getRoleList: (req, res) => {
        const {name} = req.query;
        const page = parseInt(req.params.page);
        const limit = parseInt(req.params.limit);
        const start = (page - 1) * limit;

        // 获取总数的查询
        db.query("SELECT COUNT(*) as total FROM roles", (err, countResult) => {
            if (err) {
                console.error('获取角色总数错误:', err);
                return res.send({
                    code: 201,
                    message: '获取角色列表失败'
                });
            }

            const total = countResult[0].total;
            let sql;
            let params = [];

            if (name) {
                sql = `SELECT * FROM roles WHERE role_name LIKE ? LIMIT ? OFFSET ?`;
                params = [`%${name}%`, limit, start];
            } else {
                sql = `SELECT * FROM roles LIMIT ? OFFSET ?`;
                params = [limit, start];
            }

            db.query(sql, params, (err, result) => {
                if (err) {
                    console.error('获取角色列表错误:', err);
                    return res.send({
                        code: 201,
                        message: '获取角色列表失败'
                    });
                }

                res.send({
                    code: 200,
                    message: "查询成功",
                    data: {
                        records: result,
                        total,
                        size: limit,
                        current: page,
                        pages: Math.ceil(total / limit)
                    }
                });
            });
        });
    },
    //获取用户权限菜单
    getPermissionMenu: (req, res) => {
        const {user_id} = req.query;
        const sql = `select user_id, routes
                     from users
                     where user_id = ?;`;
        db.query(sql, [user_id], (err, result) => {
            if (result.length > 0) {
                console.log(...result);
                res.send({
                    code: 200,
                    message: "获取用户菜单权限成功",
                    data: result[0]
                })
            } else {
                res.send({
                    code: 500,
                    message: "获取用户菜单权限失败"
                })
            }
        })

    },
    //修改用户权限
    addUserPermission: (req, res) => {
        const {user_id, permissionId} = req.body;
        console.log(user_id, permissionId);
        //查询该用户的routes字段
        const sql = `select routes
                     from users
                     where user_id = ?;`;
        db.query(sql, [user_id], (err, result) => {
            if (result.length > 0) {
                //定义一个新的routes数组
                const newRoutes = [{
                    id: 0,
                    name: "权限列表",
                    level: 1,
                    children: [
                        {
                            id: 1,
                            name: "权限管理",
                            label: "Acl",
                            level: 2,
                            children: [
                                {
                                    id: 3,
                                    name: "用户管理",
                                    label: "User",
                                    level: 3,
                                    select: false
                                }, {
                                    id: 4,
                                    name: "角色管理",
                                    label: "Role",
                                    level: 3,
                                    select: false
                                }, {
                                    id: 5,
                                    name: "菜单管理",
                                    label: "Permission",
                                    level: 3,
                                    select: false
                                }
                            ],
                            select: false
                        }, {
                            id: 2,
                            name: "粮油管理",
                            label: "Product",
                            level: 2,
                            children: [
                                {
                                    id: 6,
                                    name: "品牌管理",
                                    label: "Trademark",
                                    level: 3,
                                    select: false
                                }, {
                                    id: 7,
                                    name: "属性管理",
                                    label: "Attr",
                                    level: 3,
                                    select: false
                                }, {
                                    id: 8,
                                    name: "SPU管理",
                                    label: "Spu",
                                    level: 3,
                                    select: false
                                }, {
                                    id: 9,
                                    name: "SKU管理",
                                    label: "Sku",
                                    level: 3,
                                    select: false
                                }
                            ],
                            select: false
                        }
                    ],
                    select: false
                }]
                const findAndModify = (newRoutes, permissionId, value) => {
                    for (let i = 0; i < newRoutes.length; i++) {
                        if (permissionId.includes(newRoutes[i].id)) {
                            newRoutes[i].select = value;
                        }
                        if (newRoutes[i].children) {
                            findAndModify(newRoutes[i].children, permissionId, value);
                        }
                    }
                }
                findAndModify(newRoutes, permissionId, true);
                const modifiedRoutes = JSON.stringify(newRoutes);
                console.log(modifiedRoutes);
                const updateSql = `update users
                                   set routes = ?
                                   where user_id = ?;`;
                db.query(updateSql, [modifiedRoutes, user_id], err => {
                    if (err) throw err;
                    res.send({code: 200, message: "修改用户权限成功"})
                })
            }else{
                res.send({code: 400, message: "用户不存在"})
            }
        })
    },
    //获取用户角色
    getUserRoles: async (req, res) => {
        const userId = req.params.userId;
        
        try {
            const sql = `
                SELECT r.role_id, r.role_name, r.role_code, r.description
                FROM roles r
                INNER JOIN user_role ur ON r.role_id = ur.role_id
                WHERE ur.user_id = ?
            `;
            
            const [roles] = await db.query(sql, [userId]);
            
            res.send({
                code: 200,
                message: "获取用户角色成功",
                data: roles
            });
        } catch (error) {
            console.error("获取用户角色失败:", error);
            res.send({
                code: 500,
                message: "获取用户角色失败"
            });
        }
    },
    //添加角色
    addRole: async (req, res) => {
        const { role_name, role_code, description, status } = req.body;
        
        try {
            // 检查角色名称是否已存在
            const [existingRoles] = await db.query(
                'SELECT role_id FROM roles WHERE role_name = ? OR role_code = ?',
                [role_name, role_code]
            );
            
            if (existingRoles.length > 0) {
                return res.send({
                    code: 400,
                    message: '角色名称或编码已存在'
                });
            }
            
            // 插入新角色
            const [result] = await db.query(
                'INSERT INTO roles (role_name, role_code, description, status) VALUES (?, ?, ?, ?)',
                [role_name, role_code, description, status]
            );
            
            res.send({
                code: 200,
                message: '添加角色成功',
                data: {
                    role_id: result.insertId
                }
            });
        } catch (error) {
            console.error('添加角色失败:', error);
            res.send({
                code: 500,
                message: '添加角色失败'
            });
        }
    },
    //更新角色
    updateRole: async (req, res) => {
        const roleId = req.params.roleId;
        const { role_name, role_code, description, status } = req.body;
        
        try {
            // 检查角色是否存在
            const [existingRole] = await db.query(
                'SELECT role_id FROM roles WHERE role_id = ?',
                [roleId]
            );
            
            if (existingRole.length === 0) {
                return res.send({
                    code: 404,
                    message: '角色不存在'
                });
            }
            
            // 检查新的角色名称或编码是否与其他角色冲突
            const [conflictingRoles] = await db.query(
                'SELECT role_id FROM roles WHERE (role_name = ? OR role_code = ?) AND role_id != ?',
                [role_name, role_code, roleId]
            );
            
            if (conflictingRoles.length > 0) {
                return res.send({
                    code: 400,
                    message: '角色名称或编码已被其他角色使用'
                });
            }
            
            // 更新角色
            await db.query(
                'UPDATE roles SET role_name = ?, role_code = ?, description = ?, status = ? WHERE role_id = ?',
                [role_name, role_code, description, status, roleId]
            );
            
            res.send({
                code: 200,
                message: '更新角色成功'
            });
        } catch (error) {
            console.error('更新角色失败:', error);
            res.send({
                code: 500,
                message: '更新角色失败'
            });
        }
    },
    //删除角色
    deleteRole: async (req, res) => {
        const roleId = req.params.roleId;
        
        try {
            // 检查角色是否存在
            const [existingRole] = await db.query(
                'SELECT role_id FROM roles WHERE role_id = ?',
                [roleId]
            );
            
            if (existingRole.length === 0) {
                return res.send({
                    code: 404,
                    message: '角色不存在'
                });
            }
            
            // 检查是否有用户正在使用该角色
            const [usersWithRole] = await db.query(
                'SELECT user_id FROM user_role WHERE role_id = ?',
                [roleId]
            );
            
            if (usersWithRole.length > 0) {
                return res.send({
                    code: 400,
                    message: '该角色正在被用户使用，无法删除'
                });
            }
            
            // 删除角色
            await db.query('DELETE FROM roles WHERE role_id = ?', [roleId]);
            
            res.send({
                code: 200,
                message: '删除角色成功'
            });
        } catch (error) {
            console.error('删除角色失败:', error);
            res.send({
                code: 500,
                message: '删除角色失败'
            });
        }
    },
    // 更新用户状态
    updateUserStatus: async (req, res) => {
        const { userId } = req.params;
        const { status } = req.body;

        try {
            // 检查是否是管理员账号
            const [user] = await db.promise().query(
                `SELECT u.user_id, r.role_id 
                FROM users u 
                LEFT JOIN user_role ur ON u.user_id = ur.user_id 
                LEFT JOIN roles r ON ur.role_id = r.role_id 
                WHERE u.user_id = ?`,
                [userId]
            );

            if (user.some(u => u.role_id === 1)) {
                return res.send({
                    code: 201,
                    message: '不能修改管理员状态'
                });
            }

            const [result] = await db.promise().query(
                'UPDATE users SET status = ? WHERE user_id = ?',
                [status, userId]
            );

            if (result.affectedRows === 0) {
                return res.send({
                    code: 201,
                    message: '用户不存在'
                });
            }

            res.send({
                code: 200,
                message: '状态更新成功'
            });
        } catch (error) {
            console.error('更新用户状态错误:', error);
            res.send({
                code: 201,
                message: '更新用户状态失败',
                error: error.message
            });
        }
    },
    // 重置用户密码
    resetPassword: async (req, res) => {
        const { userId } = req.params;
        const defaultPassword = '123456';

        try {
            // 检查是否是管理员账号
            const [user] = await db.promise().query(
                `SELECT u.user_id, r.role_id 
                FROM users u 
                LEFT JOIN user_role ur ON u.user_id = ur.user_id 
                LEFT JOIN roles r ON ur.role_id = r.role_id 
                WHERE u.user_id = ?`,
                [userId]
            );

            if (user.some(u => u.role_id === 1)) {
                return res.send({
                    code: 201,
                    message: '不能重置管理员密码'
                });
            }

            const hashedPassword = await bcrypt.hash(defaultPassword, 12);
            
            const [result] = await db.promise().query(
                'UPDATE users SET password = ? WHERE user_id = ?',
                [hashedPassword, userId]
            );

            if (result.affectedRows === 0) {
                return res.send({
                    code: 201,
                    message: '用户不存在'
                });
            }

            res.send({
                code: 200,
                message: '密码重置成功'
            });
        } catch (error) {
            console.error('重置密码错误:', error);
            res.send({
                code: 201,
                message: '重置密码失败',
                error: error.message
            });
        }
    },
    // 更新角色状态
    updateRoleStatus: async (req, res) => {
        const { roleId } = req.params;
        const { status } = req.body;

        try {
            const [result] = await db.promise().query(
                'UPDATE roles SET status = ?, updated_at = NOW() WHERE role_id = ?',
                [status, roleId]
            );

            if (result.affectedRows === 0) {
                return res.send({
                    code: 201,
                    message: '角色不存在'
                });
            }

            res.send({
                code: 200,
                message: '状态更新成功'
            });
        } catch (error) {
            console.error('更新角色状态失败:', error);
            res.send({
                code: 201,
                message: '更新角色状态失败',
                error: error.message
            });
        }
    },
    // 获取所有角色
    getAllRoles: async (req, res) => {
        try {
            const [roles] = await db.promise().query(
                'SELECT role_id, role_name, role_code, description, status FROM roles ORDER BY role_id ASC'
            );
            
            res.send({
                code: 200,
                message: '获取成功',
                data: roles
            });
        } catch (error) {
            console.error('获取所有角色失败:', error);
            res.send({
                code: 201,
                message: '获取所有角色失败',
                error: error.message
            });
        }
    }
}
module.exports = aclService;