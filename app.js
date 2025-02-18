const express = require('express');
const cors = require('cors');
const userRouter = require("./routes/userRouter");
const aclRouter = require("./routes/aclRouter");
const permissionRouter = require("./routes/PermissionRouter");
const trademarkRouter = require("./routes/trademarkRouter");
const categoryRouter = require('./routes/categoryRouter');
const spuRouter = require('./routes/spuRouter');
const skuRouter = require('./routes/sku');
const menuRouter = require('./routes/menuRouter');
const {verifyToken} = require("./config/jwt");
const path = require('path');
const attrRouter = require('./routes/attrRouter');
const app = express();


// 中间件
app.use(cors());
app.use(express.json());// 让我们能够通过 request.body 拿到请求体中 json 格式的数据。
app.use(express.urlencoded({extended: true}));//解析客户端发送的 URL 编码格式的请求体数据，将其转换为 JavaScript 对象，并将其赋值给 req.body。通常用于处理通过表单提交的请求。

// 添加调试中间件
app.use((req, res, next) => {
  console.log('收到请求:', {
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query
  });
  next();
});

// 添加静态文件服务中间件
// 假设你的图片存储在项目根目录的 public/uploads/logo 文件夹下
app.use('/public/uploads/logo', express.static(path.join(__dirname, 'public/uploads/logo')));
app.use('/public/uploads/spu', express.static(path.join(__dirname, 'public/uploads/spu')));
app.use('/public/uploads/sku', express.static(path.join(__dirname, 'public/uploads/sku')));

//注册路由
app.use('/user', userRouter)
app.use('/acl', aclRouter)
app.use(permissionRouter)
app.use('/product', trademarkRouter)
app.use('/product', attrRouter)
app.use('/product/category', categoryRouter)
app.use('/product/spu', spuRouter)
app.use('/product/sku', skuRouter)
app.use('/acl/menu', menuRouter)

// 添加错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({
    code: 500,
    message: '服务器内部错误',
    error: err.message
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


module.exports = app;