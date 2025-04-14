//引入bcrypt
const bcrypt = require('bcrypt')
//引入JWT
const JWT = require('../config/jwt')
const {verifyToken} = require("../config/jwt");
const db = require("../db/index");
const moment = require("moment");

const SALT_ROUNDS = 10; // 统一使用10轮加密

const userService = {
    //用户登录
    login: async (req, res) => {
        try {
            const { username, password } = req.body;
            
            console.log('收到登录请求:', { username });
            
            if (!username || !password) {
                return res.send({
                    code: 201,
                    message: '用户名和密码不能为空'
                });
            }

            const [users] = await db.query(
                'SELECT * FROM users WHERE username = ? AND status = 1',
                [username]
            );

            console.log('数据库查询结果:', {
                found: users.length > 0,
                userInfo: users.length > 0 ? {
                    user_id: users[0].user_id,
                    username: users[0].username,
                    status: users[0].status,
                    passwordHash: users[0].password
                } : null
            });

            if (users.length === 0) {
                return res.send({
                    code: 201,
                    message: '用户名或密码错误'
                });
            }

            const user = users[0];
            
            try {
                console.log('开始验证密码');
                console.log('用户输入密码:', password);
                console.log('数据库密码哈希:', user.password);
                const isPasswordValid = await bcrypt.compare(password, user.password);
                console.log('密码验证结果:', isPasswordValid);
                
                if (!isPasswordValid) {
                    // 尝试记录登录失败日志
                    try {
                        await userService.recordLoginLog({
                            user_id: user.user_id,
                            username: user.username,
                            ip_address: req.ip,
                            device: req.headers['user-agent'],
                            login_status: 0,
                            remark: '密码错误'
                        });
                    } catch (logError) {
                        console.error('记录登录失败日志出错:', logError);
                    }
                    
                    return res.send({
                        code: 201,
                        message: '用户名或密码错误'
                    });
                }
            } catch (error) {
                console.error('密码验证出错:', error);
                return res.send({
                    code: 201,
                    message: '登录验证失败'
                });
            }

            // 更新最后登录时间
            await db.query(
                'UPDATE users SET last_login = NOW() WHERE user_id = ?',
                [user.user_id]
            );

            // 获取用户角色
            const [roles] = await db.query(
                'SELECT r.role_id, r.role_name FROM roles r JOIN user_role ur ON r.role_id = ur.role_id WHERE ur.user_id = ?',
                [user.user_id]
            );

            console.log('用户角色:', roles);

            const token = JWT.generateToken({
                user_id: user.user_id,
                username: user.username,
                roles: roles.map(r => r.role_id)
            }, '24h');
            
            // 尝试记录登录成功日志
            try {
                await userService.recordLoginLog({
                    user_id: user.user_id,
                    username: user.username,
                    ip_address: req.ip,
                    device: req.headers['user-agent'],
                    login_status: 1
                });
            } catch (logError) {
                console.error('记录登录成功日志出错:', logError);
            }

            res.send({
                code: 200,
                message: '登录成功',
                data: {
                    token,
                    user_id: user.user_id,
                    username: user.username,
                    roles: roles
                }
            });
        } catch (error) {
            console.error('登录错误:', error);
            res.send({
                code: 201,
                message: '登录失败',
                error: error.message
            });
        }
    },
    //用户注册
    register: async (req, res) => {
        try {
            const { username, password } = req.body;
            
            console.log('收到注册请求:', { username });
            
            if (!username || !password) {
                return res.send({
                    code: 201,
                    message: '用户名和密码不能为空'
                });
            }

            // 检查用户名是否已存在
            const [existingUsers] = await db.query(
                'SELECT user_id FROM users WHERE username = ?',
                [username]
            );

            if (existingUsers.length > 0) {
                return res.send({
                    code: 201,
                    message: '该用户名已被注册'
                });
            }

            // 密码加密 - 使用统一的加密轮数
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
            console.log('密码加密结果:', {
                originalPassword: password,
                hashedPassword: hashedPassword
            });

            // 初始化默认路由
            const defaultRoutes = JSON.stringify([{
                "id": 0,
                "name": "首页",
                "level": 1,
                "select": true
            }]);

            // 创建用户
            const [result] = await db.query(
                `INSERT INTO users (
                    username, 
                    password,
                    status,
                    routes
                ) VALUES (?, ?, ?, ?)`,
                [
                    username,
                    hashedPassword,
                    1,
                    defaultRoutes
                ]
            );

            console.log('用户创建结果:', {
                userId: result.insertId,
                username: username
            });

            // 分配默认角色（普通用户）
            await db.query(
                'INSERT INTO user_role (user_id, role_id) VALUES (?, ?)',
                [result.insertId, 3] // 假设角色ID 3 是普通用户角色
            );

            res.send({
                code: 200,
                message: '注册成功'
            });
        } catch (error) {
            console.error('注册错误:', error);
            res.send({
                code: 201,
                message: '注册失败',
                error: error.message
            });
        }
    },
    //用户基本信息
    getInfo: async (req, res) => {
        try {
            // 从 token 中获取用户信息
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.send({
                    code: 201,
                    message: '未登录'
                });
            }

            const decoded = verifyToken(token);
            
            // 查询用户信息
            const [users] = await db.query(
                `SELECT 
                    u.user_id,
                    u.username,
                    u.nickname,
                    u.avatar,
                    u.email,
                    u.phone,
                    u.status,
                    u.routes,
                    u.last_login,
                    GROUP_CONCAT(
                        JSON_OBJECT(
                            'role_id', r.role_id,
                            'role_name', r.role_name
                        )
                    ) as roles
                FROM users u
                LEFT JOIN user_role ur ON u.user_id = ur.user_id
                LEFT JOIN roles r ON ur.role_id = r.role_id
                WHERE u.user_id = ?
                GROUP BY u.user_id`,
                [decoded.user_id]
            );

            if (users.length === 0) {
                return res.send({
                    code: 201,
                    message: '用户不存在'
                });
            }

            const user = users[0];
            
            // 处理routes字段
            let parsedRoutes = [];
            try {
                // 如果routes为null或undefined，使用默认值
                if (!user.routes) {
                    parsedRoutes = [{
                        id: 0,
                        name: "首页",
                        level: 1,
                        select: true
                    }];
                } else {
                    parsedRoutes = JSON.parse(user.routes);
                }
            } catch (error) {
                console.error('解析routes失败:', error);
                parsedRoutes = [{
                    id: 0,
                    name: "首页",
                    level: 1,
                    select: true
                }];
            }
            
            // 处理roles字段
            let parsedRoles = [];
            try {
                if (user.roles) {
                    parsedRoles = user.roles.split(',').map(role => JSON.parse(role));
                }
            } catch (error) {
                console.error('解析roles失败:', error);
            }

            res.send({
                code: 200,
                message: '获取用户信息成功',
                data: {
                    user_id: user.user_id,
                    username: user.username,
                    nickname: user.nickname,
                    avatar: user.avatar,
                    email: user.email,
                    phone: user.phone,
                    status: user.status,
                    routes: parsedRoutes,
                    roles: parsedRoles,
                    last_login: user.last_login ? moment(user.last_login).format('YYYY-MM-DD HH:mm:ss') : null
                }
            });
        } catch (error) {
            console.error('获取用户信息失败:', error);
            res.send({
                code: 201,
                message: '获取用户信息失败',
                error: error.message
            });
        }
    },
    //退出登录
    logout: async (req, res) => {
        try {
            // 尝试获取用户ID
            let userId = null;
            const token = req.headers.authorization?.split(' ')[1];
            if (token) {
                const decoded = verifyToken(token);
                if (decoded && decoded.user_id) {
                    userId = decoded.user_id;
                    
                    // 尝试记录登出日志
                    try {
                        await userService.recordLogoutLog(userId);
                    } catch (logError) {
                        console.error('记录登出日志出错:', logError);
                    }
                }
            }
            
            res.send({
                code: 200,
                message: '退出成功'
            });
        } catch (error) {
            console.error('退出登录错误:', error);
            res.send({
                code: 200,
                message: '退出成功'
            });
        }
    },
    // 获取用户列表
    getUserList: async (req, res) => {
        try {
            const { page = 1, limit = 10, keyword = '' } = req.query;
            const offset = (page - 1) * limit;
            
            let whereClause = 'WHERE 1=1';
            const params = [];
            
            if (keyword) {
                whereClause += ' AND (u.username LIKE ? OR u.nickname LIKE ?)';
                params.push(`%${keyword}%`, `%${keyword}%`);
            }
            
            // 查询用户列表
            const [users] = await db.query(
                `SELECT 
                    u.user_id, 
                    u.username, 
                    u.nickname, 
                    u.status,
                    u.created_at, 
                    u.updated_at
                FROM users u
                ${whereClause}
                ORDER BY u.created_at DESC
                LIMIT ? OFFSET ?`,
                [...params, Number(limit), offset]
            );
            
            // 查询总数
            const [total] = await db.query(
                `SELECT COUNT(DISTINCT u.user_id) as total 
                FROM users u 
                ${whereClause}`,
                params
            );

            // 查询用户角色
            const processedUsers = await Promise.all(users.map(async (user) => {
                const [roles] = await db.query(
                    `SELECT r.role_id, r.role_name
                    FROM roles r
                    INNER JOIN user_role ur ON r.role_id = ur.role_id
                    WHERE ur.user_id = ?`,
                    [user.user_id]
                );
                return {
                    ...user,
                    roles
                };
            }));
            
            res.send({
                code: 200,
                message: '获取成功',
                data: {
                    records: processedUsers,
                    total: total[0].total,
                    page: parseInt(page),
                    limit: parseInt(limit)
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

    // 添加用户
    addUser: async (req, res) => {
        const { username, password, nickname, email, phone, status, roleIds } = req.body;

        if (!username || !password) {
            return res.send({
                code: 201,
                message: '用户名和密码不能为空'
            });
        }

        try {
            // 检查用户名是否存在
            const [existingUser] = await db.query(
                'SELECT user_id FROM users WHERE username = ?',
                [username]
            );

            if (existingUser.length > 0) {
                return res.send({
                    code: 201,
                    message: '用户名已存在'
                });
            }

            // 加密密码
            const hashedPassword = await bcrypt.hash(password, 12);

            // 插入用户
            const [result] = await db.query(
                `INSERT INTO users (username, password, nickname, email, phone, status)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [username, hashedPassword, nickname, email, phone, status]
            );

            // 分配角色
            if (roleIds && roleIds.length > 0) {
                const values = roleIds.map(roleId => [result.insertId, roleId]);
                await db.query(
                    'INSERT INTO user_role (user_id, role_id) VALUES ?',
                    [values]
                );
            }

            res.send({
                code: 200,
                message: '添加成功'
            });
        } catch (error) {
            console.error('添加用户错误:', error);
            res.send({
                code: 201,
                message: '添加用户失败',
                error: error.message
            });
        }
    },

    // 更新用户
    updateUser: async (req, res) => {
        const { user_id, nickname, email, phone, status, roleIds } = req.body;

        if (!user_id) {
            return res.send({
                code: 201,
                message: '参数错误'
            });
        }

        try {
            // 更新用户信息
            await db.query(
                `UPDATE users SET 
                    nickname = ?,
                    email = ?,
                    phone = ?,
                    status = ?
                WHERE user_id = ?`,
                [nickname, email, phone, status, user_id]
            );

            // 更新角色
            if (roleIds) {
                // 删除原有角色
                await db.query(
                    'DELETE FROM user_role WHERE user_id = ?',
                    [user_id]
                );

                // 添加新角色
                if (roleIds.length > 0) {
                    const values = roleIds.map(roleId => [user_id, roleId]);
                    await db.query(
                        'INSERT INTO user_role (user_id, role_id) VALUES ?',
                        [values]
                    );
                }
            }

            res.send({
                code: 200,
                message: '更新成功'
            });
        } catch (error) {
            console.error('更新用户错误:', error);
            res.send({
                code: 201,
                message: '更新用户失败',
                error: error.message
            });
        }
    },

    // 删除用户
    deleteUser: async (req, res) => {
        const { userId } = req.params;

        if (!userId) {
            return res.send({
                code: 201,
                message: '参数错误'
            });
        }

        try {
            // 删除用户（关联表会自动删除）
            const [result] = await db.query(
                'DELETE FROM users WHERE user_id = ?',
                [userId]
            );

            if (result.affectedRows === 0) {
                return res.send({
                    code: 201,
                    message: '用户不存在'
                });
            }

            res.send({
                code: 200,
                message: '删除成功'
            });
        } catch (error) {
            console.error('删除用户错误:', error);
            res.send({
                code: 201,
                message: '删除用户失败',
                error: error.message
            });
        }
    },

    // 重置密码
    resetPassword: async (req, res) => {
        const { userId } = req.params;
        const defaultPassword = '123456';

        if (!userId) {
            return res.send({
                code: 201,
                message: '参数错误'
            });
        }

        try {
            // 检查是否是管理员账号
            const [user] = await db.query(
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
            
            const [result] = await db.query(
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

    // 更新用户状态
    updateUserStatus: async (req, res) => {
        const { userId } = req.params;
        const { status } = req.body;

        if (!userId || status === undefined) {
            return res.send({
                code: 201,
                message: '参数错误'
            });
        }

        try {
            // 检查是否是管理员账号
            const [user] = await db.query(
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

            const [result] = await db.query(
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

    // 修改用户角色
    setUserRole: async (req, res) => {
        const { userId } = req.params;
        const { roleIds } = req.body;

        if (!userId || !roleIds || !Array.isArray(roleIds)) {
            return res.send({
                code: 201,
                message: '参数错误'
            });
        }

        try {
            // 检查是否是管理员账号
            const [user] = await db.query(
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
                    message: '不能修改管理员角色'
                });
            }

            // 开始事务
            const connection = await db.getConnection();
            await connection.beginTransaction();

            try {
                // 删除原有角色
                await connection.query(
                    'DELETE FROM user_role WHERE user_id = ?',
                    [userId]
                );

                // 添加新角色
                if (roleIds.length > 0) {
                    const values = roleIds.map(roleId => [userId, roleId]);
                    await connection.query(
                        'INSERT INTO user_role (user_id, role_id) VALUES ?',
                        [values]
                    );
                }

                await connection.commit();
                
                res.send({
                    code: 200,
                    message: '角色分配成功'
                });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('分配角色错误:', error);
            res.send({
                code: 201,
                message: '分配角色失败',
                error: error.message
            });
        }
    },

    async getUserInfo() {
        try {
            const result = await getInfo()
            console.log("获取用户信息结果:", result)
            
            if (result.code === 200) {
                this.userInfo = result.data
                this.username = result.data.username
                this.avatar = result.data.avatar || 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'
                
                // 解析角色信息
                let roles = []
                if (result.data.roles) {
                    try {
                        roles = typeof result.data.roles === 'string' 
                            ? JSON.parse(`[${result.data.roles}]`)
                            : result.data.roles
                    } catch (error) {
                        console.error('解析角色信息失败:', error)
                        roles = []
                    }
                }
                
                // 设置用户最高权限角色
                if (roles && roles.length > 0) {
                    const highestRole = roles.reduce((prev, curr) => 
                        parseInt(prev.role_id) < parseInt(curr.role_id) ? prev : curr
                    )
                    
                    this.role = {
                        id: parseInt(highestRole.role_id),
                        name: highestRole.role_name
                    }
                    console.log("设置的角色信息:", this.role)
                } else {
                    this.role = {
                        id: 999,
                        name: '普通用户'
                    }
                    console.log("未找到角色，设置为普通用户")   
                }
                
                return 'ok'
            } else {
                return Promise.reject(new Error(result.message))
            }
        } catch (error) {
            console.error('获取用户信息失败:', error)
            return Promise.reject(error)
        }
    },

    /**
     * 记录用户登录日志 - 这个方法将在login方法内部被调用
     * @param {Object} logData - 登录日志数据
     * @returns {Promise<boolean>} - 记录是否成功
     */
    async recordLoginLog(logData) {
        try {
            const { 
                user_id, 
                username, 
                ip_address = null, 
                device = null, 
                login_status = 1, 
                remark = null 
            } = logData;

            // 检查user_login_log表是否存在
            const [tables] = await db.query(
                `SHOW TABLES LIKE 'user_login_log'`
            );

            // 如果表不存在，就跳过记录
            if (tables.length === 0) {
                console.log('user_login_log表不存在，跳过日志记录');
                return false;
            }
            
            // 插入登录日志
            await db.query(
                `INSERT INTO user_login_log 
                (user_id, username, ip_address, device, login_time, login_status, remark) 
                VALUES (?, ?, ?, ?, NOW(), ?, ?)`,
                [user_id, username, ip_address, device, login_status, remark]
            );
            
            // 更新用户表的最后登录时间在login方法中已经处理
            
            return true;
        } catch (error) {
            console.error('记录登录日志失败:', error);
            return false;
        }
    },

    /**
     * 记录用户登出日志 - 这个方法将在logout方法内部被调用
     * @param {number} user_id - 用户ID
     * @returns {Promise<boolean>} - 记录是否成功
     */
    async recordLogoutLog(user_id) {
        try {
            // 检查user_login_log表是否存在
            const [tables] = await db.query(
                `SHOW TABLES LIKE 'user_login_log'`
            );

            // 如果表不存在，就跳过记录
            if (tables.length === 0) {
                console.log('user_login_log表不存在，跳过日志记录');
                return false;
            }
            
            // 获取最近一次的登录记录
            const [results] = await db.query(
                `SELECT id, login_time FROM user_login_log 
                 WHERE user_id = ? AND logout_time IS NULL AND login_status = 1 
                 ORDER BY login_time DESC LIMIT 1`,
                [user_id]
            );
            
            if (results.length === 0) {
                return false;
            }
            
            const logId = results[0].id;
            const loginTime = results[0].login_time;
            
            // 计算会话持续时间（秒）
            const now = new Date();
            const sessionDuration = Math.floor((now - loginTime) / 1000);
            
            // 更新登出时间和会话持续时间
            await db.query(
                `UPDATE user_login_log 
                 SET logout_time = NOW(), session_duration = ? 
                 WHERE id = ?`,
                [sessionDuration, logId]
            );
            
            return true;
        } catch (error) {
            console.error('记录登出日志失败:', error);
            return false;
        }
    }
}

module.exports = userService;