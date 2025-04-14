const db = require("../db/index");


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
            const [totalResult] = await db.query(
                'SELECT COUNT(*) as total FROM spu WHERE category_id = ?',
                [category_id]
            );
            
            // 获取SPU列表
            const [spus] = await db.query(
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
            const [spuInfo] = await db.query(
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
            const [spuImages] = await db.query(
                `SELECT 
                    image_id,
                    image_url,
                    image_name
                FROM spu_image 
                WHERE spu_id = ?`,
                [spuId]
            );
            
            // 获取销售属性
            const [saleAttrs] = await db.query(
                `SELECT 
                    sa.attr_id,
                    sa.attr_name
                FROM spu_sale_attr sa
                WHERE sa.spu_id = ?`,
                [spuId]
            );

            // 获取每个销售属性的属性值
            const processedSaleAttrs = await Promise.all(saleAttrs.map(async (attr) => {
                const [attrValues] = await db.query(
                    `SELECT 
                        value_id,
                        value_name
                    FROM spu_sale_attr_value
                    WHERE attr_id = ?`,
                    [attr.attr_id]
                );
                
                // 将属性值数组转换为逗号分隔的字符串
                const attrValueStr = attrValues.map(val => val.value_name).join(',');
                
                return {
                    attr_id: attr.attr_id,
                    attr_name: attr.attr_name,
                    attr_values: attrValues,
                    attr_value: attrValueStr
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
            
            const connection = await db.getConnection();
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
            
            const connection = await db.getConnection();
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
                
                // 1. 获取数据库中当前的销售属性及其值
                const [dbAttrs] = await connection.query(
                    `SELECT sa.attr_id, sa.attr_name, sav.value_id, sav.value_name 
                     FROM spu_sale_attr sa 
                     LEFT JOIN spu_sale_attr_value sav ON sa.attr_id = sav.attr_id 
                     WHERE sa.spu_id = ?`,
                    [spuId]
                );

                // 将数据库数据处理成 Map 方便查找: { attr_name: { attr_id, values: [{ value_id, value_name }] } }
                const dbAttrsMap = dbAttrs.reduce((acc, row) => {
                    if (!acc[row.attr_name]) {
                        acc[row.attr_name] = { attr_id: row.attr_id, values: [] };
                    }
                    if (row.value_id) {
                        acc[row.attr_name].values.push({ value_id: row.value_id, value_name: row.value_name });
                    }
                    return acc;
                }, {});

                // 2. 处理提交的销售属性 (sale_attrs)
                const submittedAttrsMap = {}; // 用于跟踪已处理的提交属性
                if (sale_attrs && sale_attrs.length > 0) {
                    for (const submittedAttr of sale_attrs) {
                        const attrName = submittedAttr.attr_name.trim();
                        if (!attrName) continue; // 跳过空属性名
                        submittedAttrsMap[attrName] = true; // 标记已处理

                        const submittedValues = submittedAttr.attr_value.split(',')
                                                          .map(v => v.trim())
                                                          .filter(v => v); // 获取提交的属性值

                        // 检查数据库中是否存在同名属性
                        if (dbAttrsMap[attrName]) { // --- 更新现有属性 ---
                            const dbAttr = dbAttrsMap[attrName];
                            const dbValuesMap = dbAttr.values.reduce((acc, v) => { acc[v.value_name] = v; return acc; }, {});
                            const submittedValuesMap = {}; // 跟踪已处理的提交值

                            // 2a. 处理提交的属性值
                            for (const submittedValueName of submittedValues) {
                                submittedValuesMap[submittedValueName] = true;
                                if (!dbValuesMap[submittedValueName]) { // 如果数据库中不存在，则新增属性值
                                    await connection.query(
                                        'INSERT INTO spu_sale_attr_value (attr_id, value_name) VALUES (?, ?)',
                                        [dbAttr.attr_id, submittedValueName]
                                    );
                                }
                                // 如果存在，则无需操作
                            }

                            // 2b. 查找需要删除的属性值
                            for (const dbValue of dbAttr.values) {
                                if (!submittedValuesMap[dbValue.value_name]) { // 如果提交的数据中没有这个值，尝试删除
                                    // !!! 依赖检查 !!!
                                    const [skuCount] = await connection.query(
                                        'SELECT COUNT(*) as count FROM sku_attr_value WHERE spu_sale_attr_value_id = ?',
                                        [dbValue.value_id]
                                    );
                                    if (skuCount[0].count > 0) {
                                        // 如果有 SKU 依赖，则不能删除，抛出错误
                                        throw new Error(`无法删除属性值 "${dbValue.value_name}"，因为它正被 ${skuCount[0].count} 个 SKU 使用。`);
                                    } else {
                                        // 没有依赖，可以删除
                                        await connection.query(
                                            'DELETE FROM spu_sale_attr_value WHERE value_id = ?',
                                            [dbValue.value_id]
                                        );
                                    }
                                }
                            }
                        } else { // --- 新增属性及其值 ---
                            // 插入销售属性
                            const [attrResult] = await connection.query(
                                'INSERT INTO spu_sale_attr (spu_id, attr_name) VALUES (?, ?)',
                                [spuId, attrName]
                            );
                            const newAttrId = attrResult.insertId;

                            // 插入属性值
                            if (submittedValues.length > 0) {
                                const valueValues = submittedValues.map(value => [newAttrId, value]);
                                await connection.query(
                                    'INSERT INTO spu_sale_attr_value (attr_id, value_name) VALUES ?',
                                    [valueValues]
                                );
                            }
                        }
                    }
                }

                // 3. 删除数据库中存在但提交数据中没有的属性（及其值）
                for (const dbAttrName in dbAttrsMap) {
                    if (!submittedAttrsMap[dbAttrName]) { // 如果提交的数据里没有这个属性名，尝试删除
                        const dbAttr = dbAttrsMap[dbAttrName];
                        // !!! 依赖检查 !!!
                        let canDeleteAttr = true;
                        for (const dbValue of dbAttr.values) {
                            const [skuCount] = await connection.query(
                                'SELECT COUNT(*) as count FROM sku_attr_value WHERE spu_sale_attr_value_id = ?',
                                [dbValue.value_id]
                            );
                            if (skuCount[0].count > 0) {
                                canDeleteAttr = false;
                                // 如果其下的某个值被引用，整个属性就不能删（除非业务允许级联删除SKU）
                                 throw new Error(`无法删除属性 "${dbAttrName}"，因为其属性值 "${dbValue.value_name}" 正被 ${skuCount[0].count} 个 SKU 使用。`);
                            }
                        }

                        if (canDeleteAttr) {
                             // 先删除该属性下的所有值
                            await connection.query(
                                'DELETE FROM spu_sale_attr_value WHERE attr_id = ?',
                                [dbAttr.attr_id]
                            );
                             // 再删除属性本身
                            await connection.query(
                                'DELETE FROM spu_sale_attr WHERE attr_id = ?',
                                [dbAttr.attr_id]
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
                // 特别处理我们抛出的业务错误
                if (error.message.includes("无法删除属性")) {
                     console.error('更新SPU业务逻辑错误:', error.message);
                     res.send({
                         code: 201, // 使用不同的错误码或状态码区分业务错误
                         message: error.message // 将业务错误信息返回给前端
                     });
                } else {
                    // 其他数据库或代码错误
                    throw error; // 重新抛出，由外层 catch 处理
                }
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
            
            const connection = await db.getConnection();
            await connection.beginTransaction();
            
            try {
                console.log(`开始删除SPU，ID: ${spuId}`);
                
                // 1. 首先检查该SPU是否有关联的SKU
                const [skus] = await connection.query('SELECT sku_id FROM sku WHERE spu_id = ?', [spuId]);
                
                // 2. 如果有关联的SKU，需要先删除SKU相关数据
                if (skus.length > 0) {
                    console.log(`SPU(${spuId})有${skus.length}个关联的SKU，开始删除`);
                    
                    for (const sku of skus) {
                        // 删除SKU图片
                        await connection.query('DELETE FROM sku_image WHERE sku_id = ?', [sku.sku_id]);
                        console.log(`已删除SKU(${sku.sku_id})图片`);
                        
                        // 删除SKU销售属性值关联
                        await connection.query('DELETE FROM sku_attr_value WHERE sku_id = ?', [sku.sku_id]);
                        console.log(`已删除SKU(${sku.sku_id})属性值关联`);
                    }
                    
                    // 删除所有关联的SKU
                    await connection.query('DELETE FROM sku WHERE spu_id = ?', [spuId]);
                    console.log(`已删除SPU(${spuId})关联的所有SKU`);
                }
                
                // 3. 查询所有销售属性，以便删除其关联的销售属性值
                const [saleAttrs] = await connection.query('SELECT attr_id FROM spu_sale_attr WHERE spu_id = ?', [spuId]);
                
                // 4. 删除销售属性值（由于外键约束，需要先删除销售属性值，再删除销售属性）
                for (const attr of saleAttrs) {
                    await connection.query('DELETE FROM spu_sale_attr_value WHERE attr_id = ?', [attr.attr_id]);
                    console.log(`已删除销售属性(${attr.attr_id})的属性值`);
                }
                
                // 5. 删除SPU相关的其他数据
                await connection.query('DELETE FROM spu_sale_attr WHERE spu_id = ?', [spuId]);
                console.log(`已删除SPU(${spuId})的销售属性`);
                
                await connection.query('DELETE FROM spu_image WHERE spu_id = ?', [spuId]);
                console.log(`已删除SPU(${spuId})的图片`);
                
                // 6. 最后删除SPU本身
                await connection.query('DELETE FROM spu WHERE spu_id = ?', [spuId]);
                console.log(`已成功删除SPU(${spuId})`);
                
                await connection.commit();
                
                res.send({
                    code: 200,
                    message: '删除成功'
                });
            } catch (error) {
                await connection.rollback();
                console.error('删除过程中出错:', error);
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
            const [saleAttrs] = await db.query(
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
            
            const connection = await db.getConnection();
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