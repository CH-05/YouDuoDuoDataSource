// 引入模块依赖
const jwt = require('jsonwebtoken');
let secret = "fuThisMQQ2j1ESC0cbaQen1ZWmkMdvLx"

//生成token
const JWT = {
    generateToken(value, expires) {
        return jwt.sign(value, secret, {expiresIn: expires})
    },
    verifyToken(token) {
        try{
            return jwt.verify(token, secret)
        }catch (e) {
            return false;
        }
    }
}
module.exports = JWT;

