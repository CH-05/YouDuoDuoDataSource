const db = require("../db");
const bcrypt = require("bcrypt");
const moment = require("moment");
const aclService = {
    getUserList: (req, res) => {
        const {username} =req.query;
        const page = parseInt(req.params.page);
        const limit = parseInt(req.params.limit);
        const start = (page - 1) * limit;
        db.query("select count(*) from users",(err,result) => {
            const total = result[0]['count(*)']
            let sql;
            if (typeof username=== 'string' && username.length>0){
                sql = `select * from users where username = ?`;
                db.query(sql,[username], (err, result) => {
                    if (result.length > 0) {
                        res.send({
                            code: 200,
                            message: "查询成功",
                            data:{
                                result,total:1
                            }
                        })
                    }else{
                        res.send({
                            code:501,
                            message: "查询不到此用户"
                        })
                    }
                })
            }else{
                sql = "select user_id,username,role,created_at,updated_at from users limit ?,?";
                db.query(sql,[start,limit], (err, result) => {
                    if (err) {
                        console.log("查询失败");
                        throw err.message
                    }
                    if (result){
                        res.send({
                            code: 200,
                            message: '请求用户列表成功',
                            data: {
                                result,total
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
        const sql = "delete from users where user_id = ?";
        db.query(sql,[user_id],(err, result) => {
            if (err) throw err.message
            if (result){
                res.send({
                    code: 200,
                    message: "删除该用户成功"
                })
            }else{
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
            if (result){
                res.send({
                    code: 200,
                    message: '删除成功'
                })
            }
        })

    },
    //添加新用户
    addNewUser: (req, res) => {
        const {username, password} = req.body;
        //从数据库里中判断是否存在相同用户
        const sql = "select username from users where username = ?";
        db.query(sql,[username],async (err, result) => {
            if (result.length < 1) {//代表数据库中查找没得用户
                const created_at = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
                const updated_at = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
                //创建基本路由，让用户注册后就拥有页面的基本路由权限(默认为员工)
                const routes = ["Acl", "User", "Role", "Permission", "Product", "Trademark", "Attr", "Spu", "Sku"];
                let password = await bcrypt.hash(req.body.password, 12);
                const avatar = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png';
                db.query("insert into users(username,password,routes,avatar,created_at,updated_at) values(?,?,?,?,?,?)",
                    [username, password, routes.toString(), avatar, created_at, updated_at])
                res.send({
                    code:200,
                    message:'添加用户成功'
                })
            }else{
                res.send({
                    code: 501,
                    message:'该用户名已经存在，请换一个名字'
                })
            }
        })

    }
}
module.exports = aclService;