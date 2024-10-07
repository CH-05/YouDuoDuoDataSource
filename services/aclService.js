const db = require("../db");
const bcrypt = require("bcrypt");
const moment = require("moment");
const {verifyToken} = require("../config/jwt");
const aclService = {
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
                    updated_at = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
                    const sql = "update users set username = ? , updated_at = ? where user_id in (?);";
                    db.query(sql, [username,updated_at,user_id], (err, result) => {
                        if (result.changedRows === 1) {//代表更新成功
                            res.send({
                                code: 200,
                                message: '更新用户成功'
                            })
                        }else{
                            res.send({
                                code: 501,
                                message: '更新用户失败'
                            })
                        }
                    })
                } else {//添加新用户
                    const created_at = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
                    updated_at = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
                    //创建基本路由，让用户注册后就拥有页面的基本路由权限(默认为员工)
                    const routes = ["Acl", "User", "Role", "Permission", "Product", "Trademark", "Attr", "Spu", "Sku"];
                    let password = await bcrypt.hash(req.body.password, 12);
                    const avatar = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png';
                    db.query("insert into users(username,password,routes,avatar,role,created_at,updated_at) values(?,?,?,?,?,?,?)",
                        [username, password, routes.toString(), avatar, "员工", created_at, updated_at])
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
    //修改用户权限
    setUserRole: (req, res) => {
        const {user_id,role} = req.body;
        console.log(user_id, role);
        const sql = "update users set role = ? , updated_at = ? where user_id in (?);";
        db.query(sql,[role,new Date(),user_id], (err, result) => {
            console.log(result);
            if (result.changedRows === 1) {
                res.send({
                    code: 200,
                    message: "修改用户权限成功"
                })
            }else{
                res.send({
                    code: 0,
                    message: "修改用户权限失败"
                })
            }
        })

    }
}
module.exports = aclService;