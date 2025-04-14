// 引入mysql
const mysql2 = require("mysql2");

// 建立一个连接池
const db = mysql2.createPool({
    host: "127.0.0.1", // 数据库的IP地址
    user: "root",
    password: "123456",
    database: "youduoduo_db",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 将连接转换为promise
const promisePool = db.promise();

// 测试连接
promisePool.query('SELECT 1')
    .then(() => {
        console.log("数据库连接成功");
    })
    .catch(err => {
        console.error("数据库连接失败", err);
        process.exit(1);
    });

    
// 将文件暴露出去
module.exports = promisePool;