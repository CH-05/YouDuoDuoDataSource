const db = require("../db");
const bcrypt = require("bcrypt");
const moment = require("moment");
const aclService = {
    //获取用户列表
    getUserList: (req, res) => {
        const {username} = req.query;
        const page = parseInt(req.params.page);
        const limit = parseInt(req.params.limit);
        const start = (page - 1) * limit;
        db.query("select count(*) from users", (err, result) => {
            const total = result[0]['count(*)']
            let sql;
            if (typeof username === 'string' && username.length > 0) {
                sql = `select *
                       from users
                       where username = ?`;
                db.query(sql, [username], (err, result) => {
                    if (result.length > 0) {
                        res.send({
                            code: 200,
                            message: "查询成功",
                            data: {
                                result, total: 1
                            }
                        })
                    } else {
                        res.send({
                            code: 501,
                            message: "查询不到此用户"
                        })
                    }
                })
            } else {
                sql = "select user_id,username,role,created_at,updated_at from users limit ?,?";
                db.query(sql, [start, limit], (err, result) => {
                    if (err) {
                        console.log("查询失败");
                        throw err.message
                    }
                    if (result) {
                        res.send({
                            code: 200,
                            message: '请求用户列表成功',
                            data: {
                                result, total
                            }
                        })
                    }
                })
            }
        });

    },
    //单个删除用户
    removeUser: (req, res) => {
        const {user_id} = req.body;
        console.log(user_id);
        const sql = "delete from users where user_id = ?";
        db.query(sql, [user_id], (err, result) => {
            if (err) throw err.message
            if (result) {
                res.send({
                    code: 200,
                    message: "删除该用户成功"
                })
            } else {
                res.send({
                    code: 505,
                    message: "删除失败"
                })
            }
        })
    },
    //批量删除用户
    removeUsers: (req, res) => {
        const {users_id} = req.body;
        const sql = "delete from users where user_id in (?)";
        db.query(sql, [users_id], (err, result) => {
            if (err) throw err;
            if (result) {
                res.send({
                    code: 200,
                    message: '删除成功'
                })
            }
        })

    },
    //添加或更新用户
    addOrUpdateNewUser: (req, res) => {
        const {user_id, username, password} = req.body;
        //从数据库里中判断是否存在相同用户
        const sql = "select username from users where username = ?";
        db.query(sql, [username], async (err, result) => {
            if (result.length < 1) {//代表数据库中查找没得用户
                let updated_at;
                //根据前端是否传入user_id来判断用户是添加或更新用户
                if (Number(user_id)) {//代表用户传入了user_id：即属于更新用户
                    const sql = "update users set username = ? , updated_at = ? where user_id in (?);";
                    db.query(sql, [username, new Date(), user_id], (err, result) => {
                        if (result.changedRows === 1) {//代表更新成功
                            res.send({
                                code: 200,
                                message: '更新用户成功'
                            })
                        } else {
                            res.send({
                                code: 501,
                                message: '更新用户失败'
                            })
                        }
                    })
                } else {//添加新用户
                    //创建基本路由，让用户注册后就拥有页面的基本路由权限(默认为员工)
                    const routes = [{
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
                    let password = await bcrypt.hash(req.body.password, 12);
                    const avatar = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png';
                    const role = {id: 0, name: "客户"}
                    db.query("insert into users(username,password,routes,avatar,role,created_at,updated_at) values(?,?,?,?,?,?,?)",
                        [username, password, JSON.stringify(routes), avatar, JSON.stringify(role), new Date(), new Date()])
                    res.send({
                        code: 200,
                        message: '添加用户成功'
                    })
                }
            } else {
                res.send({
                    code: 501,
                    message: '该用户名已经存在，请换一个名字'
                })
            }
        })
    },
    //分配用户角色
    setUserRole: (req, res) => {
        const {user_id, role} = req.body;
        console.log("role", user_id, role);
        const sql = "update users set role = ? , updated_at = ? where user_id in (?);";
        db.query(sql, [JSON.stringify(role), new Date(), user_id], (err, result) => {
            console.log(result);
            if (result.changedRows === 1) {
                res.send({
                    code: 200,
                    message: "修改用户权限成功"
                })
            } else {
                res.send({
                    code: 0,
                    message: "修改用户权限失败"
                })
            }
        })
    },
    //获取所有用户角色
    getRoleList: (req, res) => {
        const {name} = req.query;
        const page = parseInt(req.params.page);
        const limit = parseInt(req.params.limit);
        const start = (page - 1) * limit;
        db.query("select count(*) from users", (err, result) => {
            const total = result[0]['count(*)']
            let sql;
            // SELECT *
            // FROM 用户表
            // WHERE JSON_UNQUOTE(JSON_EXTRACT(role, '$.name')) = '管理员';
            if (typeof name === 'string' && name.length > 0) {
                sql = `select *
                       from users
                       where json_unquote(json_extract(role, '$.name')) = ?`;
                db.query(sql, [name], (err, result) => {
                    if (result.length > 0) {
                        res.send({
                            code: 200,
                            message: "查询成功",
                            data: {
                                result, total: 1
                            }
                        })
                    } else {
                        res.send({
                            code: 501,
                            message: "查询不到该角色"
                        })
                    }
                })
            } else {
                sql = "select user_id,username,role,created_at,updated_at from users limit ?,?";
                db.query(sql, [start, limit], (err, result) => {
                    if (err) {
                        console.log("查询失败");
                        throw err.message
                    }
                    if (result) {
                        res.send({
                            code: 200,
                            message: '请求用户列表成功',
                            data: {
                                result, total
                            }
                        })
                    }
                })
            }
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
    }
}
module.exports = aclService;