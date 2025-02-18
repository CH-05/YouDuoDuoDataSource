const db = require("../db");

const categoryService = {
    // 添加分类
    addCategory: (req, res) => {
        const { name, description } = req.body;
        
        if (!name) {
            return res.send({
                code: 201,
                message: '分类名称不能为空'
            });
        }

        const sql = "INSERT INTO categories (category_name, description) VALUES (?, ?)";
        
        db.query(sql, [name, description || ''], (err, result) => {
            if (err) {
                console.error('添加分类错误:', err);
                return res.send({
                    code: 201,
                    message: '添加分类失败'
                });
            }
            
            res.send({
                code: 200,
                message: '添加分类成功',
                data: {
                    id: result.insertId,
                    name,
                    description
                }
            });
        });
    },

    // 获取分类列表
    getCategoryList: (req, res) => {
        const sql = "SELECT category_id as id, category_name as name, description FROM categories";
        
        db.query(sql, (err, result) => {
            if (err) {
                console.error('获取分类列表错误:', err);
                return res.send({
                    code: 201,
                    message: '获取分类列表失败'
                });
            }
            
            res.send({
                code: 200,
                data: result
            });
        });
    }
};

module.exports = categoryService; 