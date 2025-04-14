const db = require("../db/index");


const trademarkService = {
    // 获取所有品牌（不分页）
    getAllTrademark: async (req, res) => {
        try {
            const sql = 'SELECT product_id as id, tmName, logoUrl FROM trademarks'
            const [rows] = await db.query(sql)
            res.send({
                code: 200,
                message: '获取品牌列表成功',
                data: rows
            })
        } catch (error) {
            console.error('获取品牌列表失败：', error)
            res.send({
                code: 500,
                message: '获取品牌列表失败'
            })
        }
    },

    // 获取品牌列表（分页）
    getAllProduct: async (req, res) => {
        try {
            console.log('接收到获取品牌列表请求:', req.params, req.query);
            const { page, limit } = req.params;
            const { keyword } = req.query;

            if (!page || !limit) {
                console.log('分页参数错误:', { page, limit });
                return res.send({
                    code: 201,
                    message: '分页参数错误'
                });
            }

            const offset = (page - 1) * limit;

            // 构建带有搜索条件的SQL语句
            const searchCondition = keyword ? `WHERE tmName LIKE ?` : '';
            const searchValue = keyword ? [`%${keyword}%`] : [];

            // 获取总条数
            const countSql = `SELECT COUNT(*) as total
                              FROM trademarks ${searchCondition}`;
            console.log('执行查询总数SQL:', countSql, searchValue);

            const [totalResult] = await db.query(countSql, searchValue);
            console.log('总数查询结果:', totalResult);

            // 获取分页数据
            const dataSql = `
                SELECT product_id,
                       tmName,
                       logoUrl,
                       DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                       DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
                FROM trademarks ${searchCondition}
                ORDER BY created_at DESC LIMIT ?
                OFFSET ?
            `;
            console.log('执行查询数据SQL:', dataSql, [...searchValue, Number(limit), offset]);

            const [records] = await db.query(
                dataSql,
                [...searchValue, Number(limit), offset]
            );
            console.log('数据查询结果:', records);

            const response = {
                code: 200,
                message: '获取成功',
                data: {
                    records,
                    total: totalResult[0].total,
                    size: Number(limit),
                    current: Number(page),
                    searchCount: true,
                    pages: Math.ceil(totalResult[0].total / limit)
                }
            };
            console.log('返回响应:', response);

            res.send(response);
        } catch (error) {
            console.error('查询品牌列表错误:', error);
            res.send({
                code: 201,
                message: '获取品牌列表失败',
                error: error.message
            });
        }
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
    addOrUpdateTrademark: async (req, res) => {
        try {
            const { product_id, tmName, logoUrl } = req.body;
            console.log("接收到的请求数据:", req.body);
            
            // 参数验证
            if (!tmName || !logoUrl) {
                return res.send({
                    code: 201,
                    message: '品牌名称和LOGO不能为空'
                });
            }

            // 检查品牌名是否已存在 (不包含当前编辑的品牌)
            let checkNameSql;
            let params;
            
            if (product_id) {
                // 更新时排除自身
                checkNameSql = "SELECT product_id FROM trademarks WHERE tmName = ? AND product_id != ?";
                params = [tmName, product_id];
            } else {
                // 新增时检查所有
                checkNameSql = "SELECT product_id FROM trademarks WHERE tmName = ?";
                params = [tmName];
            }
            
            console.log("执行品牌名查重:", checkNameSql, params);
            
            // 使用Promise处理查询
            const [result] = await db.query(checkNameSql, params);
            console.log("查重结果:", result);
            
            if (result.length > 0) {
                return res.send({
                    code: 201,
                    message: '该品牌名称已存在'
                });
            }

            // 执行添加或更新操作
            if (product_id) {
                // 更新品牌
                const updateSql = "UPDATE trademarks SET tmName = ?, logoUrl = ? WHERE product_id = ?";
                const [updateResult] = await db.query(updateSql, [tmName, logoUrl, product_id]);
                
                if (updateResult.affectedRows === 0) {
                    return res.send({
                        code: 201,
                        message: '更新品牌失败，找不到对应记录'
                    });
                }
                
                return res.send({
                    code: 200,
                    message: '更新品牌成功'
                });
            } else {
                // 新增品牌
                const insertSql = "INSERT INTO trademarks(tmName, logoUrl) VALUES(?, ?)";
                const [insertResult] = await db.query(insertSql, [tmName, logoUrl]);
                
                return res.send({
                    code: 200,
                    message: '添加品牌成功',
                    data: {
                        product_id: insertResult.insertId
                    }
                });
            }
        } catch (error) {
            console.error('品牌操作失败:', error);
            res.send({
                code: 201,
                message: '操作失败',
                error: error.message
            });
        }
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

        const sql = "DELETE FROM trademarks WHERE product_id = ?";

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
    console.log("Fetching attributes for product_id:", product_id);

    if (!product_id) {
        return res.send({
            code: 201,
            message: '参数错误'
        });
    }

    try {
        // 修改SQL查询，移除对c.name的引用
        const sql = `
        SELECT 
            a.attr_id,
            a.attr_name,
            a.category_id,
            GROUP_CONCAT(DISTINCT av.value_name) as attr_values,
            IF(pa.product_id IS NOT NULL, true, false) as isSelected
        FROM attributes a
        LEFT JOIN attr_values av ON a.attr_id = av.attr_id
        LEFT JOIN product_attr pa ON a.attr_id = pa.attr_id AND pa.product_id = ?
        GROUP BY a.attr_id, a.attr_name, a.category_id, pa.product_id
        ORDER BY a.category_id, a.attr_name
        `;

        const [results] = await db.query(sql, [product_id]);
        console.log('查询结果:', results);

        if (results.length === 0) {
            return res.send({
                code: 200,
                data: []
            });
        }

        // 转换数据格式
        const formattedResults = results.map(item => ({
            attr_id: item.attr_id,
            attr_name: item.attr_name,
            category_id: item.category_id,
            attr_values: item.attr_values ? item.attr_values.split(',') : [],
            isSelected: Boolean(item.isSelected)
        }));

        console.log('返回数据:', formattedResults);

        res.send({
            code: 200,
            data: formattedResults
        });
    } catch (error) {
        console.error('获取品牌属性失败:', error);
        res.send({
            code: 201,
            message: '获取品牌属性失败',
            error: error.message
        });
    }
},

    // 保存品牌属性关联
saveProductAttr: async (req, res) => {
    const { product_id } = req.params;
    const { category_id, attrIds } = req.body;
    console.log("保存属性关联:", { product_id, category_id, attrIds });

    if (!product_id || !category_id || !Array.isArray(attrIds)) {
        console.log('参数验证失败:', { product_id, category_id, attrIds });
        return res.send({
            code: 201,
            message: '参数错误'
        });
    }

    try {
        // 删除旧的关联
        const [deleteResult] = await db.query(
            'DELETE FROM product_attr WHERE product_id = ?',
            [product_id]
        );
        console.log('删除旧关联结果:', deleteResult);

        // 添加新的关联
        if (attrIds.length > 0) {
            const values = attrIds.map(attr_id => [product_id, attr_id]);
            const [insertResult] = await db.query(
                'INSERT INTO product_attr (product_id, attr_id) VALUES ?',
                [values]
            );
            console.log('插入新关联结果:', insertResult);
        }

        res.send({
            code: 200,
            message: '保存成功'
        });
    } catch (error) {
        console.error('保存品牌属性关联失败:', error);
        res.send({
            code: 201,
            message: '保存失败',
            error: error.message
        });
    }
},

    // 获取品牌的所有关联属性（包括属性值）
    getProductAttrDetail: async (req, res) => {
        const { product_id } = req.params;

        try {
            const sql = `
                SELECT a.attr_id,
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