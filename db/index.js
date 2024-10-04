// 引入mysql
const mysql2 = require("mysql2");
// 建立一个连接池
const db = mysql2.createConnection({
    host: "127.0.0.1", // 数据库的IP地址(本地的或者是云服务器的都可以)
    user: "root",
    password: "123456",
    database: "youduoduo_db", //指定要操作哪个数据库
});
db.connect(err=>{
    if (err) throw err;
    console.log("数据库连接成功")
})

// 将文件暴露出去
module.exports = db