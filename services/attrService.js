const db = require("../db");

const attrService = {
    // 获取分类列表
    getCategory: (req, res) => {
        const sql = "SELECT category_id as id, category_name as name FROM categories ORDER BY category_id";
        
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
                message: '获取成功',
                data: result
            });
        });
    },

    // 获取属性列表
    getAttrList: (req, res) => {
        const { categoryId } = req.params;
        
        if (!categoryId) {
            return res.send({
                code: 201,
                message: '参数错误'
            });
        }

        const sql = `
            SELECT 
                a.attr_id as id,
                a.attr_name as attrName,
                a.category_id as categoryId,
                GROUP_CONCAT(av.value_name) as attrValues
            FROM attributes a
            LEFT JOIN attr_values av ON a.attr_id = av.attr_id
            WHERE a.category_id = ?
            GROUP BY a.attr_id
        `;
        
        db.query(sql, [categoryId], (err, result) => {
            if (err) {
                console.error('获取属性列表错误:', err);
                return res.send({
                    code: 201,
                    message: '获取属性列表失败'
                });
            }
            
            // 处理属性值数组
            const records = result.map(item => ({
                ...item,
                attrValues: item.attrValues ? item.attrValues.split(',') : []
            }));
            
            res.send({
                code: 200,
                message: '获取成功',
                data: records
            });
        });
    },

    // 添加或更新属性
    saveAttr: (req, res) => {
        let { id, attrName, categoryId, attrValues } = req.body;
        
        // 参数验证
        if (!attrName || !categoryId || !Array.isArray(attrValues) || attrValues.length === 0) {
            return res.send({
                code: 201,
                message: '参数错误'
            });
        }

        // 开始事务
        db.beginTransaction(async (err) => {
            if (err) {
                console.error('开始事务错误:', err);
                return res.send({
                    code: 201,
                    message: '系统错误'
                });
            }

            try {
                // 检查属性名是否重复
                const checkNameSql = "SELECT attr_id FROM attributes WHERE attr_name = ? AND category_id = ? AND attr_id != IFNULL(?, 0)";
                const [nameResult] = await db.promise().query(checkNameSql, [attrName, categoryId, id]);
                
                if (nameResult.length > 0) {
                    throw new Error('该属性名称已存在');
                }

                if (id) {
                    // 更新属性
                    await db.promise().query(
                        "UPDATE attributes SET attr_name = ?, category_id = ? WHERE attr_id = ?",
                        [attrName, categoryId, id]
                    );
                    
                    // 删除旧的属性值
                    await db.promise().query("DELETE FROM attr_values WHERE attr_id = ?", [id]);
                } else {
                    // 添加属性
                    const [insertResult] = await db.promise().query(
                        "INSERT INTO attributes(attr_name, category_id) VALUES(?, ?)",
                        [attrName, categoryId]
                    );
                    console.log("insertResult",insertResult.insertId);
                    id = insertResult.insertId;
                }

                // 添加新的属性值
                const valuesSql = "INSERT INTO attr_values(attr_id, value_name) VALUES ?";
                const values = attrValues.map(value => [id, value]);
                await db.promise().query(valuesSql, [values]);

                // 提交事务
                await db.promise().commit();
                
                res.send({
                    code: 200,
                    message: id ? '更新成功' : '添加成功'
                });
            } catch (error) {
                // 回滚事务
                await db.promise().rollback();
                console.error('保存属性错误:', error);
                res.send({
                    code: 201,
                    message: error.message || '操作失败'
                });
            }
        });
    },

    // 删除属性
    deleteAttr: (req, res) => {
        const { attrId } = req.params;
        
        if (!attrId) {
            return res.send({
                code: 201,
                message: '参数错误'
            });
        }

        // 开始事务
        db.beginTransaction(async (err) => {
            if (err) {
                console.error('开始事务错误:', err);
                return res.send({
                    code: 201,
                    message: '系统错误'
                });
            }

            try {
                // 删除属性值
                await db.promise().query("DELETE FROM attr_values WHERE attr_id = ?", [attrId]);
                
                // 删除属性
                const [result] = await db.promise().query("DELETE FROM attributes WHERE attr_id = ?", [attrId]);
                
                if (result.affectedRows === 0) {
                    throw new Error('属性不存在');
                }

                // 提交事务
                await db.promise().commit();
                
                res.send({
                    code: 200,
                    message: '删除成功'
                });
            } catch (error) {
                // 回滚事务
                await db.promise().rollback();
                console.error('删除属性错误:', error);
                res.send({
                    code: 201,
                    message: error.message || '删除失败'
                });
            }
        });
    }
};

module.exports = attrService;
