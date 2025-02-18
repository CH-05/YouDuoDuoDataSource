const db = require("../db");

const skuService = {
    // 获取SKU列表（分页）
    getSkuList: (req, res) => {
        const { page, limit, category_id, spu_id } = req.query;
        const offset = (page - 1) * limit;
        
        // 构建基础查询
        const baseSql = `
            SELECT 
                s.*,
                p.tmName as trademark_name,
                GROUP_CONCAT(DISTINCT si.img_url) as images
            FROM sku s
            LEFT JOIN products p ON s.product_id = p.product_id
            LEFT JOIN sku_image si ON s.sku_id = si.sku_id
            WHERE 1=1
        `;
        
        const countSql = `
            SELECT COUNT(DISTINCT s.sku_id) as total
            FROM sku s
            WHERE 1=1
        `;
        
        let conditions = [];
        let params = [];
        
        if (category_id) {
            conditions.push('s.category_id = ?');
            params.push(category_id);
        }
        
        if (spu_id) {
            conditions.push('s.spu_id = ?');
            params.push(spu_id);
        }
        
        const whereSql = conditions.length ? ` AND ${conditions.join(' AND ')}` : '';
        
        // 获取总数和分页数据
        db.query(countSql + whereSql, params, (err, countResult) => {
            if (err) {
                console.error('获取SKU总数错误:', err);
                return res.send({
                    code: 201,
                    message: '获取SKU列表失败'
                });
            }
            
            const total = countResult[0].total;
            
            // 获取分页数据
            db.query(
                baseSql + whereSql + ' GROUP BY s.sku_id ORDER BY s.created_at DESC LIMIT ? OFFSET ?',
                [...params, Number(limit), offset],
                (err, records) => {
                    if (err) {
                        console.error('获取SKU列表错误:', err);
                        return res.send({
                            code: 201,
                            message: '获取SKU列表失败'
                        });
                    }
                    
                    // 处理图片数组
                    const processedRecords = records.map(record => ({
                        ...record,
                        images: record.images ? record.images.split(',') : []
                    }));
                    
                    res.send({
                        code: 200,
                        message: '获取成功',
                        data: {
                            records: processedRecords,
                            total,
                            size: Number(limit),
                            current: Number(page),
                            pages: Math.ceil(total / limit)
                        }
                    });
                }
            );
        });
    },

    // 获取SKU详情
    getSkuDetail: (req, res) => {
        const { skuId } = req.params;
        
        if (!skuId) {
            return res.send({
                code: 201,
                message: '参数错误'
            });
        }

        // 获取SKU基本信息
        const skuSql = `
            SELECT 
                s.*,
                p.tmName as trademark_name
            FROM sku s
            LEFT JOIN products p ON s.product_id = p.product_id
            WHERE s.sku_id = ?
        `;
        
        // 获取SKU图片
        const imageSql = `
            SELECT * FROM sku_image
            WHERE sku_id = ?
        `;
        
        // 获取SKU销售属性值
        const attrValueSql = `
            SELECT 
                sa.attr_id as spu_sale_attr_id,
                sa.attr_name,
                sav.value_id as spu_sale_attr_value_id,
                sav.value_name
            FROM sku_attr_value skav
            JOIN spu_sale_attr sa ON skav.spu_sale_attr_id = sa.attr_id
            JOIN spu_sale_attr_value sav ON skav.spu_sale_attr_value_id = sav.value_id
            WHERE skav.sku_id = ?
        `;
        
        // 使用Promise处理多个查询
        Promise.all([
            db.promise().query(skuSql, [skuId]),
            db.promise().query(imageSql, [skuId]),
            db.promise().query(attrValueSql, [skuId])
        ])
        .then(([[skuResult], [imageResult], [attrValueResult]]) => {
            if (skuResult.length === 0) {
                return res.send({
                    code: 201,
                    message: 'SKU不存在'
                });
            }
            
            res.send({
                code: 200,
                data: {
                    ...skuResult[0],
                    images: imageResult,
                    attrValues: attrValueResult
                }
            });
        })
        .catch(err => {
            console.error('获取SKU详情错误:', err);
            res.send({
                code: 201,
                message: '获取SKU详情失败'
            });
        });
    },

    // 保存SKU
    saveSku: (req, res) => {
        const { 
            sku_id,
            spu_id,
            sku_name,
            sku_desc,
            price,
            weight,
            stock,
            category_id,
            product_id,
            images,
            attrValues
        } = req.body;
        
        if (!spu_id || !sku_name || !price || !stock || !category_id || !product_id) {
            return res.send({
                code: 201,
                message: '缺少必要参数'
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
                let skuId = sku_id;
                
                if (skuId) {
                    // 更新SKU
                    await db.promise().query(
                        `UPDATE sku SET 
                            spu_id = ?,
                            sku_name = ?,
                            sku_desc = ?,
                            price = ?,
                            weight = ?,
                            stock = ?,
                            category_id = ?,
                            product_id = ?,
                            updated_at = NOW()
                        WHERE sku_id = ?`,
                        [spu_id, sku_name, sku_desc, price, weight, stock, category_id, product_id, skuId]
                    );
                } else {
                    // 添加SKU
                    const [insertResult] = await db.promise().query(
                        `INSERT INTO sku(
                            spu_id, sku_name, sku_desc, price, weight, stock,
                            category_id, product_id, created_at, updated_at
                        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                        [spu_id, sku_name, sku_desc, price, weight, stock, category_id, product_id]
                    );
                    skuId = insertResult.insertId;
                }
                
                // 处理图片
                if (images && images.length > 0) {
                    // 删除旧图片
                    await db.promise().query('DELETE FROM sku_image WHERE sku_id = ?', [skuId]);
                    
                    // 添加新图片
                    const imageValues = images.map(img => [
                        skuId,
                        img.img_name,
                        img.img_url,
                        img.is_default || 0
                    ]);
                    await db.promise().query(
                        'INSERT INTO sku_image(sku_id, img_name, img_url, is_default) VALUES ?',
                        [imageValues]
                    );
                }
                
                // 处理销售属性值
                if (attrValues && attrValues.length > 0) {
                    // 删除旧的属性值关联
                    await db.promise().query('DELETE FROM sku_attr_value WHERE sku_id = ?', [skuId]);
                    
                    // 添加新的属性值关联
                    const attrValueRecords = attrValues.map(attr => [
                        skuId,
                        attr.spu_sale_attr_id,
                        attr.spu_sale_attr_value_id
                    ]);
                    await db.promise().query(
                        'INSERT INTO sku_attr_value(sku_id, spu_sale_attr_id, spu_sale_attr_value_id) VALUES ?',
                        [attrValueRecords]
                    );
                }
                
                // 提交事务
                await db.promise().commit();
                
                res.send({
                    code: 200,
                    message: skuId ? '更新成功' : '添加成功',
                    data: { sku_id: skuId }
                });
            } catch (error) {
                // 回滚事务
                await db.promise().rollback();
                console.error('保存SKU错误:', error);
                res.send({
                    code: 201,
                    message: error.message || '保存失败'
                });
            }
        });
    },

    // 删除SKU
    deleteSku: (req, res) => {
        const { skuId } = req.params;
        
        if (!skuId) {
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
                // 删除相关数据
                await db.promise().query('DELETE FROM sku_image WHERE sku_id = ?', [skuId]);
                await db.promise().query('DELETE FROM sku_attr_value WHERE sku_id = ?', [skuId]);
                
                // 删除SKU
                const [result] = await db.promise().query('DELETE FROM sku WHERE sku_id = ?', [skuId]);
                
                if (result.affectedRows === 0) {
                    throw new Error('SKU不存在');
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
                console.error('删除SKU错误:', error);
                res.send({
                    code: 201,
                    message: error.message || '删除失败'
                });
            }
        });
    },

    // 获取SPU的销售属性和值
    getSpuSaleAttr: (req, res) => {
        const { spuId } = req.params;
        
        if (!spuId) {
            return res.send({
                code: 201,
                message: '参数错误'
            });
        }

        const sql = `
            SELECT 
                sa.attr_id,
                sa.attr_name,
                GROUP_CONCAT(
                    JSON_OBJECT(
                        'value_id', sav.value_id,
                        'value_name', sav.value_name
                    )
                ) as attr_values
            FROM spu_sale_attr sa
            LEFT JOIN spu_sale_attr_value sav ON sa.attr_id = sav.attr_id
            WHERE sa.spu_id = ?
            GROUP BY sa.attr_id
        `;
        
        db.query(sql, [spuId], (err, result) => {
            if (err) {
                console.error('获取SPU销售属性错误:', err);
                return res.send({
                    code: 201,
                    message: '获取SPU销售属性失败'
                });
            }
            
            // 处理属性值
            const processedResult = result.map(item => ({
                ...item,
                attr_values: item.attr_values
                    ? JSON.parse(`[${item.attr_values}]`)
                    : []
            }));
            
            res.send({
                code: 200,
                data: processedResult
            });
        });
    }
};

module.exports = skuService; 