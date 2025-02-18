const db = require("../db");

const spuService = {
    // 获取SPU列表（分页）
    getSpuList: (req, res) => {
        const { page, limit, category3Id } = req.query;
        const offset = (page - 1) * limit;
        
        // 构建基础查询
        const baseSql = `
            SELECT 
                s.spu_id,
                s.spu_name,
                s.description,
                s.category_id,
                s.product_id,
                p.tmName as trademark_name,
                DATE_FORMAT(s.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                DATE_FORMAT(s.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
            FROM spu s
            LEFT JOIN products p ON s.product_id = p.product_id
            WHERE 1=1
        `;
        
        const countSql = `
            SELECT COUNT(*) as total
            FROM spu s
            WHERE 1=1
        `;
        
        let conditions = [];
        let params = [];
        
        if (category3Id) {
            conditions.push('s.category_id = ?');
            params.push(category3Id);
        }
        
        const whereSql = conditions.length ? ` AND ${conditions.join(' AND ')}` : '';
        
        // 获取总数和分页数据
        db.query(countSql + whereSql, params, (err, countResult) => {
            if (err) {
                console.error('获取SPU总数错误:', err);
                return res.send({
                    code: 201,
                    message: '获取SPU列表失败'
                });
            }
            
            const total = countResult[0].total;
            
            // 获取分页数据
            db.query(
                baseSql + whereSql + ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?',
                [...params, Number(limit), offset],
                (err, records) => {
                    if (err) {
                        console.error('获取SPU列表错误:', err);
                        return res.send({
                            code: 201,
                            message: '获取SPU列表失败'
                        });
                    }
                    
                    res.send({
                        code: 200,
                        message: '获取成功',
                        data: {
                            records,
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

    // 获取SPU详情
    getSpuDetail: (req, res) => {
        const { spuId } = req.params;
        
        if (!spuId) {
            return res.send({
                code: 201,
                message: '参数错误'
            });
        }

        // 获取SPU基本信息
        const spuSql = `
            SELECT 
                s.*,
                p.tmName as trademark_name
            FROM spu s
            LEFT JOIN products p ON s.product_id = p.product_id
            WHERE s.spu_id = ?
        `;
        
        // 获取SPU图片
        const imageSql = `
            SELECT * FROM spu_image
            WHERE spu_id = ?
        `;
        
        // 获取SPU销售属性
        const saleAttrSql = `
            SELECT 
                sa.*,
                GROUP_CONCAT(sav.value_name) as attr_values
            FROM spu_sale_attr sa
            LEFT JOIN spu_sale_attr_value sav ON sa.attr_id = sav.attr_id
            WHERE sa.spu_id = ?
            GROUP BY sa.attr_id
        `;
        
        // 使用Promise处理多个查询
        Promise.all([
            db.promise().query(spuSql, [spuId]),
            db.promise().query(imageSql, [spuId]),
            db.promise().query(saleAttrSql, [spuId])
        ])
        .then(([[spuResult], [imageResult], [saleAttrResult]]) => {
            if (spuResult.length === 0) {
                return res.send({
                    code: 201,
                    message: 'SPU不存在'
                });
            }
            
            // 处理销售属性值
            const saleAttrs = saleAttrResult.map(attr => ({
                ...attr,
                attrValues: attr.attr_values ? attr.attr_values.split(',') : []
            }));
            
            res.send({
                code: 200,
                data: {
                    ...spuResult[0],
                    images: imageResult,
                    saleAttrs
                }
            });
        })
        .catch(err => {
            console.error('获取SPU详情错误:', err);
            res.send({
                code: 201,
                message: '获取SPU详情失败'
            });
        });
    },

    // 保存SPU
    saveSpu: (req, res) => {
        const { 
            spu_id,
            spu_name,
            description,
            category_id,
            product_id,
            images,
            saleAttrs
        } = req.body;
        
        if (!spu_name || !category_id || !product_id) {
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
                let spuId = spu_id;
                
                if (spuId) {
                    // 更新SPU
                    await db.promise().query(
                        `UPDATE spu SET 
                            spu_name = ?,
                            description = ?,
                            category_id = ?,
                            product_id = ?,
                            updated_at = NOW()
                        WHERE spu_id = ?`,
                        [spu_name, description, category_id, product_id, spuId]
                    );
                } else {
                    // 添加SPU
                    const [insertResult] = await db.promise().query(
                        `INSERT INTO spu(
                            spu_name, description, category_id, product_id, created_at, updated_at
                        ) VALUES(?, ?, ?, ?, NOW(), NOW())`,
                        [spu_name, description, category_id, product_id]
                    );
                    spuId = insertResult.insertId;
                }
                
                // 处理图片
                if (images && images.length > 0) {
                    // 删除旧图片
                    await db.promise().query('DELETE FROM spu_image WHERE spu_id = ?', [spuId]);
                    
                    // 添加新图片
                    const imageValues = images.map(img => [
                        spuId,
                        img.img_name,
                        img.img_url
                    ]);
                    await db.promise().query(
                        'INSERT INTO spu_image(spu_id, img_name, img_url) VALUES ?',
                        [imageValues]
                    );
                }
                
                // 处理销售属性
                if (saleAttrs && saleAttrs.length > 0) {
                    // 删除旧的销售属性和值
                    await db.promise().query('DELETE FROM spu_sale_attr WHERE spu_id = ?', [spuId]);
                    await db.promise().query('DELETE FROM spu_sale_attr_value WHERE spu_id = ?', [spuId]);
                    
                    // 添加新的销售属性和值
                    for (const attr of saleAttrs) {
                        // 添加销售属性
                        const [attrResult] = await db.promise().query(
                            'INSERT INTO spu_sale_attr(spu_id, attr_name) VALUES(?, ?)',
                            [spuId, attr.attr_name]
                        );
                        
                        // 添加销售属性值
                        if (attr.attrValues && attr.attrValues.length > 0) {
                            const valueValues = attr.attrValues.map(value => [
                                spuId,
                                attrResult.insertId,
                                value
                            ]);
                            await db.promise().query(
                                'INSERT INTO spu_sale_attr_value(spu_id, attr_id, value_name) VALUES ?',
                                [valueValues]
                            );
                        }
                    }
                }
                
                // 提交事务
                await db.promise().commit();
                
                res.send({
                    code: 200,
                    message: spuId ? '更新成功' : '添加成功',
                    data: { spu_id: spuId }
                });
            } catch (error) {
                // 回滚事务
                await db.promise().rollback();
                console.error('保存SPU错误:', error);
                res.send({
                    code: 201,
                    message: error.message || '保存失败'
                });
            }
        });
    },

    // 删除SPU
    deleteSpu: (req, res) => {
        const { spuId } = req.params;
        
        if (!spuId) {
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
                await db.promise().query('DELETE FROM spu_image WHERE spu_id = ?', [spuId]);
                await db.promise().query('DELETE FROM spu_sale_attr_value WHERE spu_id = ?', [spuId]);
                await db.promise().query('DELETE FROM spu_sale_attr WHERE spu_id = ?', [spuId]);
                
                // 删除SPU
                const [result] = await db.promise().query('DELETE FROM spu WHERE spu_id = ?', [spuId]);
                
                if (result.affectedRows === 0) {
                    throw new Error('SPU不存在');
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
                console.error('删除SPU错误:', error);
                res.send({
                    code: 201,
                    message: error.message || '删除失败'
                });
            }
        });
    }
};

module.exports = spuService; 