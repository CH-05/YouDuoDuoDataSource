const db = require("../db");

const spuService = {
    // 获取SPU列表
    getSpuList: async (req, res) => {
        try {
            const { page, limit } = req.params;
            const { category_id } = req.query;
            
            if (!category_id) {
                return res.send({
                    code: 201,
                    message: '分类ID不能为空'
                });
            }

            const offset = (parseInt(page) - 1) * parseInt(limit);
            
            // 获取总数
            const [totalResult] = await db.promise().query(
                'SELECT COUNT(*) as total FROM spu WHERE category_id = ?',
                [category_id]
            );
            
            // 获取SPU列表
            const [spus] = await db.promise().query(
                `SELECT 
                    s.spu_id,
                    s.spu_name,
                    s.description,
                    s.category_id,
                    s.product_id,
                    t.tmName as trademark_name,
                    t.logoUrl as trademark_logo,
                    DATE_FORMAT(s.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                    DATE_FORMAT(s.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
                FROM spu s
                LEFT JOIN trademarks t ON s.product_id = t.product_id
                WHERE s.category_id = ?
                ORDER BY s.created_at DESC
                LIMIT ? OFFSET ?`,
                [category_id, parseInt(limit), offset]
            );
            
            res.send({
                code: 200,
                message: '获取成功',
                data: {
                    records: spus,
                    total: totalResult[0].total,
                    size: parseInt(limit),
                    current: parseInt(page)
                }
            });
        } catch (error) {
            console.error('获取SPU列表失败:', error);
            res.send({
                code: 201,
                message: '获取SPU列表失败',
                error: error.message
            });
        }
    },

    // 获取SPU详情
    getSpuDetail: async (req, res) => {
        try {
            const { spuId } = req.params;
            
            // 获取SPU基本信息
            const [spuInfo] = await db.promise().query(
                `SELECT 
                    s.*,
                    t.tmName as trademark_name,
                    t.logoUrl as trademark_logo
                FROM spu s
                LEFT JOIN trademarks t ON s.product_id = t.product_id
                WHERE s.spu_id = ?`,
                [spuId]
            );
            
            if (spuInfo.length === 0) {
                return res.send({
                    code: 201,
                    message: 'SPU不存在'
                });
            }
            
            // 获取SPU图片
            const [spuImages] = await db.promise().query(
                `SELECT 
                    image_id,
                    image_url,
                    image_name
                FROM spu_image 
                WHERE spu_id = ?`,
                [spuId]
            );
            
            // 获取销售属性
            const [saleAttrs] = await db.promise().query(
                `SELECT 
                    sa.attr_id,
                    sa.attr_name
                FROM spu_sale_attr sa
                WHERE sa.spu_id = ?`,
                [spuId]
            );

            // 获取每个销售属性的属性值
            const processedSaleAttrs = await Promise.all(saleAttrs.map(async (attr) => {
                const [attrValues] = await db.promise().query(
                    `SELECT 
                        value_id,
                        value_name
                    FROM spu_sale_attr_value
                    WHERE attr_id = ?`,
                    [attr.attr_id]
                );
                
                return {
                    attr_id: attr.attr_id,
                    attr_name: attr.attr_name,
                    attr_values: attrValues
                };
            }));
            
            // 处理图片数据，确保字段名一致
            const processedImages = spuImages.map(img => ({
                image_id: img.image_id,
                image_url: img.image_url,
                image_name: img.image_name
            }));
            
            res.send({
                code: 200,
                message: '获取成功',
                data: {
                    ...spuInfo[0],
                    images: processedImages,
                    sale_attrs: processedSaleAttrs
                }
            });
        } catch (error) {
            console.error('获取SPU详情失败:', error);
            res.send({
                code: 201,
                message: '获取SPU详情失败',
                error: error.message
            });
        }
    },

    // 添加SPU
    addSpu: async (req, res) => {
        try {
            const { spu_name, description, category_id, product_id, images, sale_attrs } = req.body;
            console.log("添加SPU请求数据:", req.body);
            
            if (!spu_name || !category_id || !product_id) {
                return res.send({
                    code: 201,
                    message: '参数不完整'
                });
            }
            
            const connection = await db.promise().getConnection();
            await connection.beginTransaction();
            
            try {
                // 插入SPU基本信息
                const [spuResult] = await connection.query(
                    'INSERT INTO spu (spu_name, description, category_id, product_id) VALUES (?, ?, ?, ?)',
                    [spu_name, description, category_id, product_id]
                );
                
                const spuId = spuResult.insertId;
                
                // 插入SPU图片
                if (images && images.length > 0) {
                    const imageValues = images.map(img => [
                        spuId,
                        img.image_url,
                        img.image_name
                    ]);
                    await connection.query(
                        'INSERT INTO spu_image (spu_id, image_url, image_name) VALUES ?',
                        [imageValues]
                    );
                }
                
                // 插入销售属性和属性值
                if (sale_attrs && sale_attrs.length > 0) {
                    for (const attr of sale_attrs) {
                        // 插入销售属性
                        const [attrResult] = await connection.query(
                            'INSERT INTO spu_sale_attr (spu_id, attr_name) VALUES (?, ?)',
                            [spuId, attr.attr_name]
                        );
                        
                        const attrId = attrResult.insertId;
                        
                        // 处理属性值（按逗号分隔）
                        const attrValues = attr.attr_value.split(',').map(v => v.trim()).filter(v => v);
                        
                        if (attrValues.length > 0) {
                            const valueValues = attrValues.map(value => [
                                attrId,
                                value
                            ]);
                            await connection.query(
                                'INSERT INTO spu_sale_attr_value (attr_id, value_name) VALUES ?',
                                [valueValues]
                            );
                        }
                    }
                }
                
                await connection.commit();
                
                res.send({
                    code: 200,
                    message: '添加成功',
                    data: { spu_id: spuId }
                });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('添加SPU失败:', error);
            res.send({
                code: 201,
                message: '添加SPU失败',
                error: error.message
            });
        }
    },

    // 更新SPU
    updateSpu: async (req, res) => {
        try {
            const { spuId } = req.params;
            const { spu_name, description, category_id, product_id, images, sale_attrs } = req.body;
            
            if (!spu_name || !category_id || !product_id) {
                return res.send({
                    code: 201,
                    message: '参数不完整'
                });
            }
            
            const connection = await db.promise().getConnection();
            await connection.beginTransaction();
            
            try {
                // 更新SPU基本信息
                await connection.query(
                    'UPDATE spu SET spu_name = ?, description = ?, category_id = ?, product_id = ? WHERE spu_id = ?',
                    [spu_name, description, category_id, product_id, spuId]
                );
                
                // 更新SPU图片
                await connection.query('DELETE FROM spu_image WHERE spu_id = ?', [spuId]);
                if (images && images.length > 0) {
                    const imageValues = images.map(img => [
                        spuId,
                        img.image_url,
                        img.image_name
                    ]);
                    await connection.query(
                        'INSERT INTO spu_image (spu_id, image_url, image_name) VALUES ?',
                        [imageValues]
                    );
                }
                
                // 更新销售属性和属性值
                // 先删除旧的销售属性和属性值
                const [currentAttrs] = await connection.query(
                    'SELECT attr_id FROM spu_sale_attr WHERE spu_id = ?',
                    [spuId]
                );
                
                for (const attr of currentAttrs) {
                    await connection.query(
                        'DELETE FROM spu_sale_attr_value WHERE attr_id = ?',
                        [attr.attr_id]
                    );
                }
                
                await connection.query(
                    'DELETE FROM spu_sale_attr WHERE spu_id = ?',
                    [spuId]
                );
                
                // 插入新的销售属性和属性值
                if (sale_attrs && sale_attrs.length > 0) {
                    for (const attr of sale_attrs) {
                        // 插入销售属性
                        const [attrResult] = await connection.query(
                            'INSERT INTO spu_sale_attr (spu_id, attr_name) VALUES (?, ?)',
                            [spuId, attr.attr_name]
                        );
                        
                        const attrId = attrResult.insertId;
                        
                        // 处理属性值（按逗号分隔）
                        const attrValues = attr.attr_value.split(',').map(v => v.trim()).filter(v => v);
                        
                        if (attrValues.length > 0) {
                            const valueValues = attrValues.map(value => [
                                attrId,
                                value
                            ]);
                            await connection.query(
                                'INSERT INTO spu_sale_attr_value (attr_id, value_name) VALUES ?',
                                [valueValues]
                            );
                        }
                    }
                }
                
                await connection.commit();
                
                res.send({
                    code: 200,
                    message: '更新成功'
                });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('更新SPU失败:', error);
            res.send({
                code: 201,
                message: '更新SPU失败',
                error: error.message
            });
        }
    },

    // 删除SPU
    deleteSpu: async (req, res) => {
        try {
            const { spuId } = req.params;
            
            const connection = await db.promise().getConnection();
            await connection.beginTransaction();
            
            try {
                // 删除SPU相关的所有数据
                await connection.query('DELETE FROM spu_image WHERE spu_id = ?', [spuId]);
                await connection.query('DELETE FROM spu_sale_attr WHERE spu_id = ?', [spuId]);
                await connection.query('DELETE FROM spu WHERE spu_id = ?', [spuId]);
                
                await connection.commit();
                
                res.send({
                    code: 200,
                    message: '删除成功'
                });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('删除SPU失败:', error);
            res.send({
                code: 201,
                message: '删除SPU失败',
                error: error.message
            });
        }
    },

    // 上传SPU图片
    uploadSpuImage: (req, res) => {
        try {
            if (!req.file) {
                return res.send({
                    code: 201,
                    message: '请选择要上传的图片'
                });
            }

            const imageUrl = `/public/uploads/spu/${req.file.filename}`;
            res.send({
                code: 200,
                message: '图片上传成功',
                data: imageUrl
            });
        } catch (error) {
            console.error('图片上传错误:', error);
            res.send({
                code: 201,
                message: '图片上传失败'
            });
        }
    },

    // 获取销售属性列表
    getSaleAttrList: async (req, res) => {
        try {
            const { spuId } = req.params;
            
            // 获取销售属性和对应的属性值
            const [saleAttrs] = await db.promise().query(
                `SELECT 
                    sa.attr_id,
                    sa.attr_name,
                    sav.value_id,
                    sav.value_name
                FROM spu_sale_attr sa
                LEFT JOIN spu_sale_attr_value sav ON sa.attr_id = sav.attr_id
                WHERE sa.spu_id = ?`,
                [spuId]
            );

            // 处理数据结构
            const processedAttrs = saleAttrs.reduce((acc, curr) => {
                const existingAttr = acc.find(item => item.attr_id === curr.attr_id);
                if (existingAttr) {
                    existingAttr.attr_values.push({
                        value_id: curr.value_id,
                        value_name: curr.value_name
                    });
                } else {
                    acc.push({
                        attr_id: curr.attr_id,
                        attr_name: curr.attr_name,
                        attr_values: curr.value_id ? [{
                            value_id: curr.value_id,
                            value_name: curr.value_name
                        }] : []
                    });
                }
                return acc;
            }, []);
            
            res.send({
                code: 200,
                message: '获取成功',
                data: processedAttrs
            });
        } catch (error) {
            console.error('获取销售属性列表失败:', error);
            res.send({
                code: 201,
                message: '获取销售属性列表失败',
                error: error.message
            });
        }
    },

    // 保存销售属性
    saveSaleAttr: async (req, res) => {
        try {
            const { spuId } = req.params;
            const { attrs } = req.body;
            
            if (!Array.isArray(attrs)) {
                return res.send({
                    code: 201,
                    message: '参数格式错误'
                });
            }
            
            const connection = await db.promise().getConnection();
            await connection.beginTransaction();
            
            try {
                // 删除旧的销售属性
                await connection.query('DELETE FROM spu_sale_attr WHERE spu_id = ?', [spuId]);
                
                // 插入新的销售属性
                if (attrs.length > 0) {
                    const values = attrs.map(attr => [
                        spuId,
                        attr.sale_attr_name,
                        attr.sale_attr_value
                    ]);
                    await connection.query(
                        'INSERT INTO spu_sale_attr (spu_id, sale_attr_name, sale_attr_value) VALUES ?',
                        [values]
                    );
                }
                
                await connection.commit();
                
                res.send({
                    code: 200,
                    message: '保存成功'
                });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('保存销售属性失败:', error);
            res.send({
                code: 201,
                message: '保存销售属性失败',
                error: error.message
            });
        }
    }
};

module.exports = spuService; 