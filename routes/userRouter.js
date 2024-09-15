const express = require('express');
const userService = require("../services/userService");
const userRouter = express.Router();
//登录
userRouter.post('/login', userService.login)
//注册
userRouter.post('/register',userService.register)
//获取用户基本信息
userRouter.get('/getInfo',userService.getInfo)
//退出登录
userRouter.post('/logout',userService.logout)
module.exports = userRouter;