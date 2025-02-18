const express = require('express');
const userService = require("../services/userService");
const userRouter = express.Router();

// 用户登录
userRouter.post('/login', userService.login);

// 用户注册
userRouter.post('/register', userService.register);

// 获取用户信息
userRouter.get('/getInfo', userService.getInfo);

// 退出登录
userRouter.post('/logout', userService.logout);

// 获取用户列表
userRouter.get('/list', userService.getUserList);

// 添加用户
userRouter.post('/add', userService.addUser);

// 更新用户
userRouter.put('/update', userService.updateUser);

// 删除用户
userRouter.delete('/delete/:userId', userService.deleteUser);

// 重置密码
userRouter.put('/reset-password/:userId', userService.resetPassword);

module.exports = userRouter;