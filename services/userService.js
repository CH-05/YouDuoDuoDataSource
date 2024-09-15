//引入bcrypt
const bcrypt = require('bcrypt')
//引入JWT
const JWT = require('../config/jwt')
const {verifyToken} = require("../config/jwt");
const db = require("../db");

const userService = {
    //用户登录
    login: async (req, res) => {
        const sql = "select * from users where username = ?";
        //比对数据库密码与用户输入密码是否匹配
        db.query(sql, req.body.username, async (err, data) => {
            let result = JSON.parse(JSON.stringify(data));
            if (err) throw err;
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
            if (err) throw err;
            if (result.length < 1) {//表示该用户没有注册
                let password = await bcrypt.hash(req.body.password, 12);
                db.query("insert into users(username,password) values(?,?)", [username, password])
                res.send({status: 200, message: "注册成功，请先登录"})
            } else {
                res.send({status: 400, message: "该用户已被注册"})
            }
        })
    },
    //用户基本信息
    getInfo: async (req, res) => {
        let payload = verifyToken(req.headers.token)
        console.log(payload);
        const sql = "select * from users where user_id=?";
        db.query(sql, payload.user_id, async (err, result) => {
            if (err) throw err;
            const userInfo = {...result[0]}
            res.send({
                code: 200,
                message: "获取用户基本信息成功",
                data: {
                    username: userInfo.username,
                    role: userInfo.role,
                    avatar: userInfo.avatar,
                    routes: userInfo.routes
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