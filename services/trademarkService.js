const db = require("../db");

const trademarkService = {
    // 获取品牌列表（分页）
    getAllProduct: (req, res) => {
        const { page, limit } = req.params;
        const { keyword } = req.query;
        const offset = (page - 1) * limit;
        
        // 构建带有搜索条件的SQL语句
        const searchCondition = keyword ? `WHERE tmName LIKE ?` : '';
        const searchValue = keyword ? [`%${keyword}%`] : [];
        
        // 获取总条数和分页数据（使用Promise处理异步）
        const getTrademarks = new Promise((resolve, reject) => {
            // 修改总数SQL，添加搜索条件
            const totalSql = `SELECT COUNT(*) as total FROM products ${searchCondition}`;
            // 修改查询SQL，使用 DATE_FORMAT 格式化日期
            const sql = `
                SELECT 
                    product_id, 
                    tmName, 
                    logoUrl,
                    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                    DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
                FROM products 
                ${searchCondition} 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            `;
            
            // 先查询总数
            db.query(totalSql, searchValue, (err, totalResult) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // 查询分页数据
                db.query(sql, [...searchValue, Number(limit), offset], (err, records) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    resolve({
                        records,
                        total: totalResult[0].total
                    });
                });
            });
        });

        getTrademarks
            .then(data => {
                res.send({
                    code: 200,
                    message: '获取成功',
                    data: {
                        records: data.records,
                        total: data.total,
                        size: Number(limit),
                        current: Number(page),
                        searchCount: true,
                        pages: Math.ceil(data.total / limit)
                    }
                });
            })
            .catch(err => {
                console.error('查询品牌列表错误:', err);
                res.send({
                    code: 201,
                    message: '获取品牌列表失败'
                });
            });
    },

    // 上传品牌图片
    fileUpload: (req, res) => {
        try {
            if (!req.file) {
                return res.send({
                    code: 201,
                    message: '请选择要上传的图片'
                });
            }

            const product_logo = `/public/uploads/logo/${req.file.filename}`;
            console.log("product_logo", product_logo);
            res.send({
                code: 200,
                message: '图片上传成功',
                data: product_logo
            });
        } catch (error) {
            console.error('图片上传错误:', error);
            res.send({
                code: 201,
                message: '图片上传失败'
            });
        }
    },

    // 添加或更新品牌
    addOrUpdateTrademark: (req, res) => {
        const { product_id, tmName, logoUrl } = req.body;
        console.log("req.body", req.body);
        // 参数验证
        if (!tmName || !logoUrl) {
            return res.send({
                code: 201,
                message: '品牌名称和LOGO不能为空'
            });
        }
        
        // 检查品牌名是否已存在
        const checkNameSql = "SELECT product_id FROM products WHERE tmName = ? AND product_id != IFNULL(?, 0)";
        db.query(checkNameSql, [tmName, product_id], (err, result) => {
            if (err) {
                console.error('查询品牌名称错误:', err);
                return res.send({
                    code: 201,
                    message: '系统错误'
                });
            }

            if (result.length > 0) {
                return res.send({
                    code: 201,
                    message: '该品牌名称已存在'
                });
            }

            // 执行添加或更新操作
            if (product_id) {
                // 更新品牌
                const updateSql = "UPDATE products SET tmName = ?, logoUrl = ? WHERE product_id = ?";
                db.query(updateSql, [tmName, logoUrl, product_id], (err, result) => {
                    if (err || result.affectedRows === 0) {
                        console.error('更新品牌错误:', err);
                        return res.send({
                            code: 201,
                            message: '更新品牌失败'
                        });
                    }
                    
                    res.send({
                        code: 200,
                        message: '更新品牌成功'
                    });
                });
            } else {
                // 新增品牌
                const insertSql = "INSERT INTO products(tmName, logoUrl) VALUES(?, ?)";
                db.query(insertSql, [tmName, logoUrl], (err, result) => {
                    if (err) {
                        console.error('添加品牌错误:', err);
                        return res.send({
                            code: 201,
                            message: '添加品牌失败'
                        });
                    }
                    
                    res.send({
                        code: 200,
                        message: '添加品牌成功'
                    });
                });
            }
        });
    },

    // 删除品牌
    deleteTrademark: (req, res) => {
        const { product_id } = req.params;
        
        if (!product_id) {
            return res.send({
                code: 201,
                message: '参数错误'
            });
        }

        const sql = "DELETE FROM products WHERE product_id = ?";
        
        db.query(sql, [product_id], (err, result) => {
            if (err) {
                console.error('删除品牌错误:', err);
                return res.send({
                    code: 201,
                    message: '删除品牌失败'
                });
            }

            if (result.affectedRows === 0) {
                return res.send({
                    code: 201,
                    message: '品牌不存在'
                });
            }
            
            res.send({
                code: 200,
                message: '删除品牌成功'
            });
        });
    },

    // 获取品牌关联的属性
    getProductAttr: async (req, res) => {
        const { product_id } = req.params;
        
        try {
            const sql = `
                SELECT 
                    a.attr_id, 
                    a.attr_name, 
                    a.category_id,
                    GROUP_CONCAT(av.value_name) as attr_values,
                    CASE WHEN pa.product_id IS NOT NULL THEN 1 ELSE 0 END as is_selected
                FROM attributes a
                LEFT JOIN attr_values av ON a.attr_id = av.attr_id
                LEFT JOIN product_attr pa ON a.attr_id = pa.attr_id AND pa.product_id = ?
                GROUP BY a.attr_id
            `;
            
            db.query(sql, [product_id], (err, result) => {
                if (err) {
                    console.error('获取品牌属性失败:', err);
                    return res.send({
                        code: 201,
                        message: '获取品牌属性失败'
                    });
                }

                res.send({
                    code: 200,
                    data: result.map(item => ({
                        ...item,
                        attrValues: item.attr_values ? item.attr_values.split(',') : [],
                        isSelected: item.is_selected === 1
                    }))
                });
            });
        } catch (error) {
            console.error('获取品牌属性失败:', error);
            res.send({
                code: 201,
                message: '获取品牌属性失败'
            });
        }
    },

    // 保存品牌属性关联
    saveProductAttr: async (req, res) => {
        const { product_id, attrIds } = req.body;
        
        if (!product_id || !Array.isArray(attrIds)) {
            return res.send({
                code: 201,
                message: '参数错误'
            });
        }

        db.beginTransaction(async (err) => {
            if (err) {
                console.error('开始事务错误:', err);
                return res.send({
                    code: 201,
                    message: '系统错误'
                });
            }

            try {
                // 删除旧的关联
                await db.promise().query('DELETE FROM product_attr WHERE product_id = ?', [product_id]);
                
                // 添加新的关联
                if (attrIds.length > 0) {
                    const values = attrIds.map(attrId => [product_id, attrId]);
                    await db.promise().query(
                        'INSERT INTO product_attr (product_id, attr_id) VALUES ?',
                        [values]
                    );
                }
                
                await db.promise().commit();
                
                res.send({
                    code: 200,
                    message: '保存成功'
                });
            } catch (error) {
                await db.promise().rollback();
                console.error('保存品牌属性关联失败:', error);
                res.send({
                    code: 201,
                    message: '保存失败'
                });
            }
        });
    },

    // 获取品牌的所有关联属性（包括属性值）
    getProductAttrDetail: async (req, res) => {
        const { product_id } = req.params;
        
        try {
            const sql = `
                SELECT 
                    a.attr_id,
                    a.attr_name,
                    a.category_id,
                    c.category_name,
                    GROUP_CONCAT(av.value_name) as attr_values
                FROM product_attr pa
                JOIN attributes a ON pa.attr_id = a.attr_id
                JOIN categories c ON a.category_id = c.category_id
                LEFT JOIN attr_values av ON a.attr_id = av.attr_id
                WHERE pa.product_id = ?
                GROUP BY a.attr_id
            `;
            
            db.query(sql, [product_id], (err, result) => {
                if (err) {
                    console.error('获取品牌属性详情失败:', err);
                    return res.send({
                        code: 201,
                        message: '获取品牌属性详情失败'
                    });
                }

                res.send({
                    code: 200,
                    data: result.map(item => ({
                        ...item,
                        attrValues: item.attr_values ? item.attr_values.split(',') : []
                    }))
                });
            });
        } catch (error) {
            console.error('获取品牌属性详情失败:', error);
            res.send({
                code: 201,
                message: '获取品牌属性详情失败'
            });
        }
    }
};

module.exports = trademarkService;