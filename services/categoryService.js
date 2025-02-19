const db = require("../db");

const categoryService = {
    // 添加分类
    addCategory: (req, res) => {
        const { name } = req.body;
        console.log('接收到的添加分类请求参数:', req.body);
        
        if (!name) {
            return res.send({
                code: 201,
                message: '分类名称不能为空'
            });
        }

        // 首先检查分类名称是否已存在
        db.query(
            "SELECT category_id FROM categories WHERE category_name = ?",
            [name],
            (err, result) => {
                if (err) {
                    console.error('检查分类名称错误:', err);
                    return res.send({
                        code: 201,
                        message: '添加分类失败',
                        error: err.message
                    });
                }

                if (result.length > 0) {
                    return res.send({
                        code: 201,
                        message: '该分类名称已存在'
                    });
                }

                // 插入新分类
                const sql = `
                    INSERT INTO categories 
                    (category_name, level, parent_id, sort_order, status) 
                    VALUES (?, 1, NULL, 0, 1)
                `;
                
                db.query(sql, [name], (err, result) => {
                    if (err) {
                        console.error('添加分类错误:', err);
                        return res.send({
                            code: 201,
                            message: '添加分类失败',
                            error: err.message
                        });
                    }
                    
                    console.log('分类添加成功，结果:', result);
                    res.send({
                        code: 200,
                        message: '添加分类成功',
                        data: {
                            id: result.insertId,
                            name
                        }
                    });
                });
            }
        );
    },

    // 获取分类列表
    getCategoryList: (req, res) => {
        const sql = `
            SELECT 
                category_id as id, 
                category_name as name,
                level,
                parent_id,
                status
            FROM categories 
            ORDER BY sort_order, id
        `;
        
        db.query(sql, (err, result) => {
            if (err) {
                console.error('获取分类列表错误:', err);
                return res.send({
                    code: 201,
                    message: '获取分类列表失败',
                    error: err.message
                });
            }
            
            res.send({
                code: 200,
                message: '获取成功',
                data: result
            });
        });
    }
};

module.exports = categoryService; 