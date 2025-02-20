const db = require("../db");
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 配置文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'public/uploads/sku';
        // 确保上传目录存在
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('只允许上传图片文件!'));
        }
    },
    limits: {
        fileSize: 2 * 1024 * 1024 // 限制2MB
    }
}).single('file');

const skuService = {
    // 获取SKU列表
    getSkuList: async (req, res) => {
        try {
            const { page = 1, limit = 10, spu_id } = req.query;
            
            // 验证必须提供spu_id
            if (!spu_id) {
                return res.send({
                    code: 200,
                    message: '获取成功',
                    data: {
                        records: [],
                        total: 0,
                        size: parseInt(limit),
                        current: parseInt(page)
                    }
                });
            }

            const offset = (page - 1) * limit;

            // 获取总数
            const [totalResult] = await db.promise().query(
                'SELECT COUNT(*) as total FROM sku WHERE spu_id = ?',
                [spu_id]
            );

            // 获取SKU列表
            const [skus] = await db.promise().query(
                `SELECT 
                    s.*,
                    t.tmName as trademark_name,
                    GROUP_CONCAT(DISTINCT si.img_url) as images
                FROM sku s
                LEFT JOIN trademarks t ON s.product_id = t.product_id
                LEFT JOIN sku_image si ON s.sku_id = si.sku_id
                WHERE s.spu_id = ?
                GROUP BY s.sku_id
                ORDER BY s.created_at DESC
                LIMIT ? OFFSET ?`,
                [spu_id, parseInt(limit), offset]
            );

            // 处理图片数组
            const processedSkus = skus.map(sku => ({
                ...sku,
                images: sku.images ? sku.images.split(',') : []
            }));

            res.send({
                code: 200,
                message: '获取成功',
                data: {
                    records: processedSkus,
                    total: totalResult[0].total,
                    size: parseInt(limit),
                    current: parseInt(page)
                }
            });
        } catch (error) {
            console.error('获取SKU列表失败:', error);
            res.send({
                code: 201,
                message: '获取SKU列表失败',
                error: error.message
            });
        }
    },

    // 获取SKU详情
    getSkuDetail: async (req, res) => {
        try {
            const { skuId } = req.params;

            // 获取SKU基本信息
            const [skuInfo] = await db.promise().query(
                `SELECT 
                    s.*,
                    t.tmName as trademark_name
                FROM sku s
                LEFT JOIN trademarks t ON s.product_id = t.product_id
                WHERE s.sku_id = ?`,
                [skuId]
            );

            if (skuInfo.length === 0) {
                return res.send({
                    code: 201,
                    message: 'SKU不存在'
                });
            }

            // 获取SKU图片
            const [images] = await db.promise().query(
                'SELECT * FROM sku_image WHERE sku_id = ?',
                [skuId]
            );

            // 获取SKU销售属性值
            const [attrValues] = await db.promise().query(
                `SELECT 
                    sa.attr_id as spu_sale_attr_id,
                    sa.attr_name,
                    sav.value_id as spu_sale_attr_value_id,
                    sav.value_name
                FROM sku_attr_value skav
                JOIN spu_sale_attr sa ON skav.spu_sale_attr_id = sa.attr_id
                JOIN spu_sale_attr_value sav ON skav.spu_sale_attr_value_id = sav.value_id
                WHERE skav.sku_id = ?`,
                [skuId]
            );

            res.send({
                code: 200,
                message: '获取成功',
                data: {
                    ...skuInfo[0],
                    images,
                    attrValues
                }
            });
        } catch (error) {
            console.error('获取SKU详情失败:', error);
            res.send({
                code: 201,
                message: '获取SKU详情失败',
                error: error.message
            });
        }
    },

    // 保存SKU
    saveSku: async (req, res) => {
        const connection = await db.promise().getConnection();
        try {
            await connection.beginTransaction();

            const {
                sku_id,
                spu_id,
                sku_name,
                sku_desc,
                price,
                weight,
                stock,
                product_id,
                images,
                attrValues
            } = req.body;

            // 验证必要字段
            if (!spu_id || !sku_name || !price || !stock || !product_id) {
                return res.send({
                    code: 201,
                    message: '缺少必要参数'
                });
            }

            let skuId = sku_id;
            if (skuId) {
                // 更新SKU
                await connection.query(
                    `UPDATE sku SET 
                        spu_id = ?,
                        sku_name = ?,
                        sku_desc = ?,
                        price = ?,
                        weight = ?,
                        stock = ?,
                        product_id = ?
                    WHERE sku_id = ?`,
                    [spu_id, sku_name, sku_desc, price, weight, stock, product_id, skuId]
                );
            } else {
                // 添加SKU
                const [result] = await connection.query(
                    `INSERT INTO sku(
                        spu_id, sku_name, sku_desc, price, weight, stock,
                        product_id
                    ) VALUES(?, ?, ?, ?, ?, ?, ?)`,
                    [spu_id, sku_name, sku_desc, price, weight, stock, product_id]
                );
                skuId = result.insertId;
            }

            // 处理图片
            if (images && images.length > 0) {
                // 删除旧图片
                await connection.query('DELETE FROM sku_image WHERE sku_id = ?', [skuId]);

                // 添加新图片
                const imageValues = images.map(img => [
                    skuId,
                    img.img_name,
                    img.img_url,
                    img.is_default || 0
                ]);
                await connection.query(
                    'INSERT INTO sku_image(sku_id, img_name, img_url, is_default) VALUES ?',
                    [imageValues]
                );
            }

            // 处理销售属性值
            if (attrValues && attrValues.length > 0) {
                // 删除旧的属性值
                await connection.query('DELETE FROM sku_attr_value WHERE sku_id = ?', [skuId]);

                // 添加新的属性值
                const attrValueRecords = attrValues.map(attr => [
                    skuId,
                    attr.spu_sale_attr_id,
                    attr.spu_sale_attr_value_id
                ]);
                await connection.query(
                    'INSERT INTO sku_attr_value(sku_id, spu_sale_attr_id, spu_sale_attr_value_id) VALUES ?',
                    [attrValueRecords]
                );
            }

            await connection.commit();

            res.send({
                code: 200,
                message: skuId ? '更新成功' : '添加成功',
                data: { sku_id: skuId }
            });
        } catch (error) {
            await connection.rollback();
            console.error('保存SKU失败:', error);
            res.send({
                code: 201,
                message: '保存SKU失败',
                error: error.message
            });
        } finally {
            connection.release();
        }
    },

    // 删除SKU
    deleteSku: async (req, res) => {
        const connection = await db.promise().getConnection();
        try {
            await connection.beginTransaction();

            const { skuId } = req.params;

            // 删除相关数据
            await connection.query('DELETE FROM sku_image WHERE sku_id = ?', [skuId]);
            await connection.query('DELETE FROM sku_attr_value WHERE sku_id = ?', [skuId]);
            await connection.query('DELETE FROM sku WHERE sku_id = ?', [skuId]);

            await connection.commit();

            res.send({
                code: 200,
                message: '删除成功'
            });
        } catch (error) {
            await connection.rollback();
            console.error('删除SKU失败:', error);
            res.send({
                code: 201,
                message: '删除SKU失败',
                error: error.message
            });
        } finally {
            connection.release();
        }
    },

    // 获取SPU销售属性
    getSpuSaleAttr: async (req, res) => {
        try {
            const { spuId } = req.params;

            const [attrs] = await db.promise().query(
                `SELECT 
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
                GROUP BY sa.attr_id`,
                [spuId]
            );

            // 处理属性值
            const processedAttrs = attrs.map(attr => ({
                ...attr,
                attr_values: attr.attr_values
                    ? JSON.parse(`[${attr.attr_values}]`)
                    : []
            }));

            res.send({
                code: 200,
                message: '获取成功',
                data: processedAttrs
            });
        } catch (error) {
            console.error('获取SPU销售属性失败:', error);
            res.send({
                code: 201,
                message: '获取SPU销售属性失败',
                error: error.message
            });
        }
    },

    // 上传SKU图片
    uploadSkuImage: (req, res) => {
        upload(req, res, function (err) {
            if (err instanceof multer.MulterError) {
                console.error('文件上传错误(Multer):', err);
                return res.send({
                    code: 201,
                    message: err.code === 'LIMIT_FILE_SIZE' 
                        ? '文件大小不能超过2MB' 
                        : '文件上传失败'
                });
            } else if (err) {
                console.error('文件上传错误:', err);
                return res.send({
                    code: 201,
                    message: err.message || '文件上传失败'
                });
            }

            if (!req.file) {
                return res.send({
                    code: 201,
                    message: '请选择要上传的图片'
                });
            }

            const imageUrl = `/uploads/sku/${req.file.filename}`;
            res.send({
                code: 200,
                message: '上传成功',
                data: imageUrl
            });
        });
    }
};

module.exports = skuService;
