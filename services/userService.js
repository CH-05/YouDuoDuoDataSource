//引入bcrypt
const bcrypt = require('bcrypt')
//引入JWT
const JWT = require('../config/jwt')
const {verifyToken} = require("../config/jwt");
const db = require("../db");
const moment = require("moment");

const userService = {
    //用户登录
    login: async (req, res) => {
        const sql = "select * from users where username = ?";
        //比对数据库密码与用户输入密码是否匹配
        db.query(sql, req.body.username, async (err, data) => {
            let result = JSON.parse(JSON.stringify(data));
            if (result.length > 0) {//代表数据库有用户
                const {user_id, username, password} = result[0];
                let isCorrect = await bcrypt.compare(req.body.password, password)
                if (isCorrect) {
                    //生成一个token，交给前端
                    const token = JWT.generateToken({user_id, username}, "24h")
                    res.header("Authorization", token);
                    res.send({code: 200, message: '登录成功', data: {user_id, username, token}})
                } else {
                    res.send({code: 400, message: '用户名密码输入有误'})
                }
            } else {
                res.send({code: 400, message: '用户名输入有误'})
            }
        });
    },
    //用户注册
    register: async (req, res) => {
        const {username} = req.body;
        const sql = "select * from users where username=?";
        db.query(sql, username, async (err, result) => {
            console.log(result);
            if (err) throw err;
            if (result.length < 1) {//表示该用户没有注册
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
                    [username, password, routes.toString(), avatar, JSON.stringify(role), new Date(), new Date()])
                res.send({code: 200, message: "注册成功，请先登录"})
            } else {
                res.send({code: 400, message: "该用户已被注册"})
            }
        })
    },
    //用户基本信息
    getInfo: async (req, res) => {
        let payload = verifyToken(req.headers.token)
        const sql = "select * from users where user_id=?";
        db.query(sql, payload.user_id, async (err, result) => {
            if (err) {
                res.send({
                    code: 404,
                    message: "用户查询失败"
                })
                return;
            }
            const userInfo = {...result[0]}
            res.send({
                code: 200,
                message: "获取用户基本信息成功",
                data: {
                    username: userInfo.username,
                    role: JSON.parse(userInfo.role),
                    avatar: userInfo.avatar,
                    routes: userInfo.routes.split(',')
                }
            })
        })

    },
    //退出登录
    logout: async (req, res) => {
        res.send({
            code: 200,
            message: "用户退出登录"
        })
    }
}

module.exports = userService;