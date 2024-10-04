const express = require('express');
const userRouter = require("./routes/userRouter");
const {verifyToken} = require("./config/jwt");
const aclRouter = require("./routes/aclRouter");
const app = express();

app.use(express.json());// 让我们能够通过 request.body 拿到请求体中 json 格式的数据。
app.use(express.urlencoded({extended: true}));//解析客户端发送的 URL 编码格式的请求体数据，将其转换为 JavaScript 对象，并将其赋值给 req.body。通常用于处理通过表单提交的请求。

//token验证
// app.use((req, res, next) => {
// // //定义不需要权限验证的路径
//     let noAuthorizationUrl = [
//         '/login',
//         '/register'
//     ]
//     for (const item of noAuthorizationUrl) {
//         if (req.url.includes(item)) {
//             next();
//             return;
//         }
//     }
//     //如果请求头中有token的话，验证当前token是否过期
//     let token = req.headers.authorization.split(' ')[1]
//     if (token) {
//         let payload = verifyToken(token);
//         if (payload) {
//             // const newToken = JWT.generateToken({
//             //     id: payload.id, username: payload.username
//             // }, "30s")//按秒计算，过30s不刷新，页面自动跳转到登录页
//             res.header("Authorization", token)
//             next()
//         } else {
//             res.status(401)
//                 .send({
//                     status: 401,
//                     message: 'Token过期'
//                 })
//         }
//     }else{
//         res.send({status: 501,message:"服务器出错了"})
//     }
// })

//注册路由
app.use(userRouter)
app.use(aclRouter)

app.listen(5177, () => {
    console.log("后端服务已开启")
});

module.exports = app;