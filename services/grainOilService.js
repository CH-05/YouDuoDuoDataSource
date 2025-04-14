const db = require('../db/index');
const moment = require('moment');

// 粮油管理相关服务
module.exports = {
    // 获取进货列表
    getPurchaseList: async (req, res) => {
        try {
            const { page = 1, limit = 10, keyword = '', status } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            
            let whereClause = "WHERE 1=1";
            const params = [];
            
            // 处理关键字搜索 - 支持进货单号和商品名称
            if (keyword) {
                whereClause += " AND (purchase_no LIKE ? OR product_name LIKE ?)";
                params.push(`%${keyword}%`, `%${keyword}%`);
            }
            
            // 处理状态筛选
            if (status !== undefined && status !== '') {
                whereClause += " AND status = ?";
                params.push(status);
            }
            
            const [rows] = await db.query(
                `SELECT 
                    id, 
                    purchase_no as purchaseNo, 
                    product_name as productName, 
                    quantity, 
                    unit, 
                    price, 
                    total_amount as totalAmount, 
                    supplier, 
                    purchase_date as purchaseDate, 
                    status
                FROM purchase_order
                ${whereClause}
                ORDER BY purchase_date DESC, id DESC
                LIMIT ? OFFSET ?`,
                [...params, parseInt(limit), offset]
            );
            
            const [countResult] = await db.query(
                `SELECT COUNT(*) as total FROM purchase_order ${whereClause}`,
                params
            );
            
            res.json({
                code: 200,
                message: '获取进货列表成功',
                data: {
                    records: rows,
                    total: countResult[0].total,
                    page: parseInt(page),
                    limit: parseInt(limit)
                }
            });
        } catch (error) {
            console.error('获取进货列表失败:', error);
            res.status(500).json({
                code: 500,
                message: '获取进货列表失败',
                error: error.message
            });
        }
    },
    
    // 添加进货记录
    addPurchase: async (req, res) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            const { trademark, supplier, purchaseDate, details } = req.body;
            
            console.log('添加进货单 - 收到数据:', {
                trademark,
                supplier,
                purchaseDate,
                detailsCount: details?.length || 0
            });
            
            // 计算总数量和总金额
            let totalQuantity = 0;
            let totalAmount = 0;
            let productNames = [];
            
            details.forEach(detail => {
                totalQuantity += Number(detail.quantity || 0);
                totalAmount += Number(detail.totalAmount || 0);
                if (detail.skuName) {
                    productNames.push(detail.skuName);
                }
                console.log('进货明细项:', {
                    skuId: detail.skuId,
                    skuName: detail.skuName,
                    quantity: detail.quantity,
                    price: detail.price,
                    totalAmount: detail.totalAmount
                });
            });
            
            // 创建商品名称字符串（如果太长则截断）
            let productName = productNames.join('、');
            if (productName.length > 100) {
                productName = productName.substring(0, 97) + '...';
            }
            
            // 生成进货单号：PO + 当前日期 + 4位随机数
            const date = new Date();
            const dateStr = date.getFullYear() +
                ('0' + (date.getMonth() + 1)).slice(-2) +
                ('0' + date.getDate()).slice(-2);
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            const purchaseNo = `PO${dateStr}${randomNum}`;
            
            // 默认单位和单价（如果没有明细则使用默认值）
            const defaultUnit = details.length > 0 ? details[0].unit : 'kg';
            const defaultPrice = details.length > 0 ? details[0].price : 0;
            
            // 首先插入主表
            const [purchaseResult] = await connection.query(
                `INSERT INTO purchase_order (
                    purchase_no, product_name, quantity, unit, price, total_amount, 
                    supplier, purchase_date, status, created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                    purchaseNo,
                    productName,
                    totalQuantity,
                    defaultUnit,
                    defaultPrice,
                    totalAmount,
                    supplier,
                    purchaseDate,
                    0, // 默认状态：待入库
                    1  // 默认创建人ID为1，实际应从会话或令牌中获取
                ]
            );
            
            const purchaseId = purchaseResult.insertId;
            console.log(`进货单主表创建成功，ID: ${purchaseId}, 单号: ${purchaseNo}`);
            
            // 处理每个商品明细
            for (const detail of details) {
                // 验证必要字段
                if (!detail.skuId) {
                    throw new Error('商品SKU ID不能为空');
                }
                
                try {
                    // 使用品牌ID作为product_id
                    const productId = trademark;
                    console.log(`添加进货明细: 进货单ID=${purchaseId}, 品牌ID=${productId}, SKU ID=${detail.skuId}, 数量=${detail.quantity}`);
                    
                    // 插入订单明细
                await connection.query(
                    `INSERT INTO purchase_order_detail (
                            purchase_id, product_id, quantity, unit, price, amount
                        ) VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        purchaseId,
                            productId, // 使用品牌ID而不是skuId
                        detail.quantity,
                        detail.unit,
                        detail.price,
                        detail.totalAmount
                    ]
                );
                } catch (error) {
                    console.error(`插入进货明细失败: ${error.message}`);
                    throw error;
                }
            }
            
            await connection.commit();
            console.log(`进货单创建完成: ${purchaseNo}`);
            
            res.send({
                code: 200,
                message: '添加成功'
            });
        } catch (error) {
            await connection.rollback();
            console.error('添加进货单失败：', error);
            res.status(500).send({
                code: 500,
                message: error.message || '添加进货单失败'
            });
        } finally {
            connection.release();
        }
    },
    
    // 更新进货记录
    updatePurchase: async (req, res) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            const { id } = req.params;
            const { trademark, supplier, purchaseDate, details } = req.body;
            
            console.log('更新进货单 - 收到数据:', {
                id,
                trademark,
                supplier,
                purchaseDate,
                detailsCount: details?.length || 0
            });
            
            // 处理日期格式，确保是YYYY-MM-DD格式
            const formattedDate = typeof purchaseDate === 'string' ? purchaseDate.substring(0, 10) : purchaseDate;
            
            // 汇总数据
            let totalQuantity = 0;
            let totalAmount = 0;
            let productNames = [];
            
            if (details && details.length > 0) {
                details.forEach(item => {
                    totalQuantity += Number(item.quantity);
                    totalAmount += Number(item.totalAmount);
                    if (item.skuName) {
                        productNames.push(item.skuName);
                    }
                    console.log('更新进货明细项:', {
                        skuId: item.skuId,
                        skuName: item.skuName,
                        quantity: item.quantity,
                        price: item.price,
                        totalAmount: item.totalAmount
                    });
                });
            }
            
            // 创建商品名称字符串
            let productName = productNames.join('、');
                if (productName.length > 100) {
                    productName = productName.substring(0, 97) + '...';
            }
            
            // 更新进货单主表
            await connection.query(`
                UPDATE purchase_order
                SET product_name = ?,
                    quantity = ?,
                    total_amount = ?,
                    supplier = ?,
                    purchase_date = ?
                WHERE id = ?
            `, [productName, totalQuantity, totalAmount, supplier, formattedDate, id]);
            
            // 删除原有明细
            await connection.query('DELETE FROM purchase_order_detail WHERE purchase_id = ?', [id]);
            
            // 创建新的明细
            if (details && details.length > 0) {
                const detailSql = `
                    INSERT INTO purchase_order_detail
                    (purchase_id, product_id, quantity, unit, price, amount)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                
                for (const detail of details) {
                    // 使用品牌ID作为product_id
                    const productId = trademark;
                    console.log(`更新进货明细: 进货单ID=${id}, 品牌ID=${productId}, SKU ID=${detail.skuId}, 数量=${detail.quantity}`);
                    
                    await connection.query(detailSql, [
                        id,
                        productId, // 使用品牌ID而不是skuId
                        detail.quantity,
                        detail.unit,
                        detail.price,
                        detail.totalAmount
                    ]);
                }
            }
            
            await connection.commit();
            console.log(`进货单更新完成: ID=${id}`);
            
            res.json({
                code: 200,
                message: '更新进货记录成功'
            });
        } catch (error) {
            await connection.rollback();
            console.error('更新进货记录失败:', error);
            res.status(500).json({
                code: 500,
                message: '更新进货记录失败',
                error: error.message
            });
        } finally {
            connection.release();
        }
    },
    
    // 删除进货记录
    deletePurchase: async (req, res) => {
        try {
            const { id } = req.params;
            
            // 先删除明细记录
            await db.query('DELETE FROM purchase_order_detail WHERE purchase_id = ?', [id]);
            
            // 再删除主记录
            await db.query('DELETE FROM purchase_order WHERE id = ?', [id]);
            
            res.json({
                code: 200,
                message: '删除进货记录成功'
            });
        } catch (error) {
            console.error('删除进货记录失败:', error);
            res.status(500).json({
                code: 500,
                message: '删除进货记录失败',
                error: error.message
            });
        }
    },
    
    // 更新进货状态
    updatePurchaseStatus: async (req, res) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            const { id } = req.params;
            const { status } = req.body;
            
            // 获取进货单信息
            const [purchaseInfo] = await connection.query(
                'SELECT id, purchase_no, status, product_name FROM purchase_order WHERE id = ?',
                [id]
            );
            
            if (!purchaseInfo || purchaseInfo.length === 0) {
                return res.status(404).json({
                    code: 404,
                    message: '进货单不存在'
                });
            }
            
            // 如果已经是入库状态，则不能重复操作
            if (purchaseInfo[0].status === 1) {
                return res.status(400).json({
                    code: 400,
                    message: '该进货单已经入库，不能重复操作'
                });
            }
            
            // 只有状态为0(待入库)的进货单才能更新为1(已入库)
            if (status === 1) {
                // 获取进货单明细
                const [details] = await connection.query(
                    `SELECT 
                        id, 
                        product_id, 
                        quantity, 
                        unit, 
                        price,
                        amount
                    FROM purchase_order_detail 
                    WHERE purchase_id = ?`,
                    [id]
                );
                
                if (!details || details.length === 0) {
                    return res.status(400).json({
                        code: 400,
                        message: '进货单没有明细，无法入库'
                    });
                }
                
                // 创建库存表和库存记录表（如果不存在）
                await connection.query(`
                    CREATE TABLE IF NOT EXISTS inventory (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        product_id INT DEFAULT NULL COMMENT '商品ID',
                        product_name VARCHAR(100) NOT NULL COMMENT '商品名称',
                        sku_spec VARCHAR(50) DEFAULT NULL COMMENT '规格',    
                        tm_id INT DEFAULT NULL COMMENT '品牌ID',
                        tm_name VARCHAR(50) DEFAULT NULL COMMENT '品牌名称',
                        purchase_id INT DEFAULT NULL COMMENT '进货单ID',
                        purchase_price DECIMAL(10,2) DEFAULT 0.00 COMMENT '进货价格',
                        purchase_date DATE DEFAULT NULL COMMENT '进货日期',
                        stock DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '库存数量',
                        locked_stock DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '锁定库存（已下单未出库）',
                        unit VARCHAR(10) DEFAULT '千克' COMMENT '单位',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
                        KEY idx_product_id (product_id),
                        KEY idx_tm_id (tm_id),
                        KEY idx_purchase_id (purchase_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存表';
                `);
                
                await connection.query(`
                    CREATE TABLE IF NOT EXISTS inventory_record (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        inventory_id INT NOT NULL COMMENT '库存ID',
                        product_id INT NOT NULL COMMENT '商品ID',
                        product_name VARCHAR(100) NOT NULL COMMENT '商品名称',
                        before_stock DECIMAL(10,2) NOT NULL COMMENT '变动前库存',
                        adjustment DECIMAL(10,2) NOT NULL COMMENT '变动数量（正数为入库，负数为出库）',
                        after_stock DECIMAL(10,2) NOT NULL COMMENT '变动后库存',
                        type ENUM('in','out') NOT NULL COMMENT '类型：in入库，out出库',
                        source_type VARCHAR(20) DEFAULT NULL COMMENT '来源类型：purchase进货，sales销售，manual手动调整',
                        source_id INT DEFAULT NULL COMMENT '来源ID：进货单ID或销售单ID',
                        remark VARCHAR(255) DEFAULT NULL COMMENT '备注',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                        KEY idx_inventory_id (inventory_id),
                        KEY idx_product_id (product_id),
                        KEY idx_type (type),
                        KEY idx_source (source_type,source_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存流水记录表';
                `);
                
                // 获取进货日期
                const [purchaseDateResult] = await connection.query(
                    'SELECT purchase_date FROM purchase_order WHERE id = ?',
                    [id]
                );
                
                let purchaseDate = null;
                if (purchaseDateResult && purchaseDateResult.length > 0) {
                    purchaseDate = purchaseDateResult[0].purchase_date;
                }
                
                // 处理每个明细的入库
                for (const detail of details) {
                    // 获取品牌信息 (product_id字段实际存储的是品牌ID)
                    const [brandInfo] = await connection.query(
                        'SELECT product_id, tmName FROM trademarks WHERE product_id = ?',
                        [detail.product_id]
                    );
                    
                    let brandId = detail.product_id;
                    let brandName = '未知品牌';
                    
                    if (brandInfo && brandInfo.length > 0) {
                        brandId = brandInfo[0].product_id;
                        brandName = brandInfo[0].tmName;
                    }
                    
                    // 查询该明细对应的SKU ID
                    console.log(`查询进货明细商品信息: 进货单ID=${id}, 明细ID=${detail.id}, 品牌ID=${brandId}`);
                    
                    // 从前端传入的skuInfo中获取SKU ID，这个信息在进货表单中保存
                    const [purchaseDetail] = await connection.query(
                        `SELECT s.sku_id, s.sku_name, s.sku_desc, s.stock
                        FROM sku s
                        INNER JOIN trademarks t ON s.product_id = t.product_id
                        WHERE t.product_id = ?
                        LIMIT 1`,
                        [brandId]
                    );
                    
                    let skuId = null;
                    let skuName = brandName;
                    let skuSpec = '默认规格';
                    
                    if (purchaseDetail && purchaseDetail.length > 0) {
                        skuId = purchaseDetail[0].sku_id;
                        skuName = purchaseDetail[0].sku_name;
                        
                        // 从描述中提取规格信息
                        let skuDesc = purchaseDetail[0].sku_desc || '';
                        
                        // 尝试从描述中提取规格信息
                        let extractedSpec = '';
                        if (skuDesc.includes('规格：')) {
                            extractedSpec = skuDesc.match(/规格：([^,，;；]+)/)?.[1] || '';
                        } else if (skuDesc.match(/\d+[kgKG克千克斤吨ml毫升升L吨]/)) {
                            // 提取带有重量/容量单位的信息作为规格
                            extractedSpec = skuDesc.match(/\d+[kgKG克千克斤吨ml毫升升L吨][^,，;；]*/)?.[0] || '';
                        }
                        
                        // 如果成功提取到规格，使用提取的规格，否则使用简短的默认规格
                        skuSpec = extractedSpec || (detail.quantity > 0 ? `${detail.quantity}${detail.unit || '千克'}装` : '标准规格');
                        
                        console.log('进货入库处理 - SKU信息:', { 
                            skuId, 
                            skuName, 
                            skuSpec, // 显示规格信息
                            brandId,
                            brandName,
                            quantity: detail.quantity 
                        });
                    }
                    
                    // 检查是否有对应的SKU记录
                    const [skuInfo] = await connection.query(
                        `SELECT sku_id, sku_name, sku_desc, stock FROM sku WHERE sku_id = ?`,
                        [skuId]
                    );
                    
                    if (skuInfo && skuInfo.length > 0) {
                        // 更新SKU表中的库存
                        const oldStock = Number(skuInfo[0].stock || 0);
                        const quantityToAdd = Number(detail.quantity);
                        const newSkuStock = oldStock + quantityToAdd;
                        
                        await connection.query(
                            `UPDATE sku SET stock = ? WHERE sku_id = ?`,
                            [newSkuStock, skuId]
                        );
                        console.log(`更新SKU库存成功: sku_id=${skuId}, 旧库存=${oldStock}, 增加=${quantityToAdd}, 新库存=${newSkuStock}`);
                    } else {
                        console.log(`SKU未找到: sku_id=${skuId}, 使用品牌名称作为SKU名称`);
                    }

                    // 检查是否已存在相同商品和规格的库存记录
                    const [existingInventory] = await connection.query(
                        `SELECT id, stock FROM inventory 
                         WHERE product_id = ? AND tm_id = ? AND sku_spec = ? AND purchase_id = ?`,
                        [skuId || null, brandId, skuSpec, id]
                    );

                    if (existingInventory && existingInventory.length > 0) {
                        // 如果库存记录已存在，则更新库存数量
                        const currentStock = Number(existingInventory[0].stock || 0);
                        const newInventoryStock = currentStock + Number(detail.quantity);
                        
                        await connection.query(
                            `UPDATE inventory 
                             SET stock = ?, 
                                 updated_at = NOW() 
                             WHERE id = ?`,
                            [newInventoryStock, existingInventory[0].id]
                        );
                        
                        console.log(`更新已有库存记录: ID=${existingInventory[0].id}, 商品=${skuName}, 旧库存=${currentStock}, 新库存=${newInventoryStock}`);
                        
                        // 添加库存记录
                        await connection.query(
                            `INSERT INTO inventory_record 
                             (inventory_id, product_id, product_name, before_stock, adjustment, after_stock, 
                             type, source_type, source_id, remark, created_at)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                            [
                                existingInventory[0].id,
                                skuId || null,
                                skuName,
                                currentStock,
                                Number(detail.quantity),
                                newInventoryStock,
                                'in',
                                'purchase',
                                id,
                                `进货入库: ${purchaseInfo[0].purchase_no}`
                            ]
                        );
                    } else {
                        // 如果库存记录不存在，则创建新的库存记录
                        const [newInventory] = await connection.query(
                            `INSERT INTO inventory 
                             (product_id, product_name, sku_spec, tm_id, tm_name, purchase_id, purchase_price, 
                             purchase_date, stock, locked_stock, unit, created_at, updated_at) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                            [
                                skuId || null,
                                skuName,
                                skuSpec,
                                brandId,
                                brandName,
                                id,
                                detail.price,
                                purchaseDate,
                                Number(detail.quantity),
                                0, // 锁定库存初始为0
                                detail.unit || '千克'
                            ]
                        );
                        
                        const newInventoryId = newInventory.insertId;
                        console.log(`创建新库存记录成功: ID=${newInventoryId}, 商品=${skuName}, 库存=${detail.quantity}`);
                        
                        // 添加库存记录
                        await connection.query(
                            `INSERT INTO inventory_record 
                             (inventory_id, product_id, product_name, before_stock, adjustment, after_stock, 
                             type, source_type, source_id, remark, created_at)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                            [
                                newInventoryId,
                                skuId || null,
                                skuName,
                                0, // 之前库存为0
                                Number(detail.quantity),
                                Number(detail.quantity),
                                'in',
                                'purchase',
                                id,
                                `进货入库: ${purchaseInfo[0].purchase_no}`
                            ]
                        );
                    }
                }
            }
            
            // 更新进货单状态
            await connection.query(
                'UPDATE purchase_order SET status = ? WHERE id = ?',
                [status, id]
            );
            
            await connection.commit();
            
            res.json({
                code: 200,
                message: status === 1 ? '入库成功' : '更新状态成功'
            });
        } catch (error) {
            await connection.rollback();
            console.error('更新进货状态失败:', error);
            res.status(500).json({
                code: 500,
                message: '更新进货状态失败',
                error: error.message
            });
        } finally {
            connection.release();
        }
    },

    // 获取进货单详情
    getPurchaseDetail: async (req, res) => {
        try {
            const { id } = req.params;

            // 获取进货单主表信息
            const [purchaseResult] = await db.query(`
                SELECT 
                    id,
                    purchase_no as purchaseNo,
                    product_name as productName,
                    supplier,
                    purchase_date as purchaseDate,
                    status,
                    total_amount as totalAmount
                FROM purchase_order
                WHERE id = ?
            `, [id]);

            if (!purchaseResult || purchaseResult.length === 0) {
                return res.status(404).json({
                    code: 404,
                    message: '进货单不存在'
                });
            }

            // 获取进货单明细
            const [detailsResult] = await db.query(`
                SELECT 
                    id,
                    product_id as skuId,
                    quantity,
                    unit,
                    price,
                    amount as totalAmount
                FROM purchase_order_detail
                WHERE purchase_id = ?
            `, [id]);

            // 获取明细对应的商品信息
            if (detailsResult && detailsResult.length > 0) {
                for (const detail of detailsResult) {
                    try {
                        // 尝试获取商品名称
                        const [skuResult] = await db.query(
                            `SELECT sku_name FROM sku WHERE id = ?`, 
                            [detail.skuId]
                        );
                        if (skuResult && skuResult.length > 0) {
                            detail.skuName = skuResult[0].sku_name;
                        }
                    } catch (err) {
                        console.warn(`获取商品名称失败: ${err.message}`);
                    }
                }
            }

            // 组装返回数据
            const purchaseDetail = {
                ...purchaseResult[0],
                trademark: detailsResult[0]?.skuId || null, // 使用第一个商品的ID作为品牌ID
                details: detailsResult
            };

            res.json({
                code: 200,
                message: '获取进货单详情成功',
                data: purchaseDetail
            });
        } catch (error) {
            console.error('获取进货单详情失败:', error);
            res.status(500).json({
                code: 500,
                message: '获取进货单详情失败',
                error: error.message
            });
        }
    },

    // 获取销售列表
    getSalesList: async (req, res) => {
        try {
            console.log('收到获取销售列表请求:', req.query);
            
            // 确保sales_order表存在
            await db.query(`
                CREATE TABLE IF NOT EXISTS sales_order (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    sales_no VARCHAR(50) NOT NULL COMMENT '销售单号',
                    product_name VARCHAR(255) DEFAULT NULL COMMENT '商品名称(汇总)',
                    quantity DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '总数量',
                    unit VARCHAR(10) DEFAULT '千克' COMMENT '单位',
                    price DECIMAL(10,2) DEFAULT 0.00 COMMENT '单价',
                    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '总金额',
                    customer VARCHAR(100) NOT NULL COMMENT '客户名称',
                    sales_date DATE NOT NULL COMMENT '销售日期',
                    status TINYINT NOT NULL DEFAULT 0 COMMENT '状态：0待出库，1已出库',
                    created_by INT DEFAULT 1 COMMENT '创建人ID',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
                    KEY idx_sales_no (sales_no),
                    KEY idx_status (status),
                    KEY idx_sales_date (sales_date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售单';
            `);
            
            // 确保销售明细表存在
            await db.query(`
                CREATE TABLE IF NOT EXISTS sales_order_detail (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    sales_id INT NOT NULL COMMENT '销售单ID',
                    inventory_id INT DEFAULT NULL COMMENT '库存ID',
                    product_id INT DEFAULT NULL COMMENT '商品ID',
                    quantity DECIMAL(10,2) NOT NULL COMMENT '数量',
                    unit VARCHAR(10) DEFAULT '千克' COMMENT '单位',
                    price DECIMAL(10,2) NOT NULL COMMENT '单价',
                    amount DECIMAL(10,2) NOT NULL COMMENT '金额',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                    KEY idx_sales_id (sales_id),
                    KEY idx_inventory_id (inventory_id),
                    KEY idx_product_id (product_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售单明细';
            `);
            
            const { page = 1, limit = 10, keyword = '', status } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            
            let whereClause = "WHERE 1=1";
            const params = [];
            
            // 处理关键字搜索 - 支持销售单号和商品名称
            if (keyword) {
                whereClause += " AND (sales_no LIKE ? OR product_name LIKE ?)";
                params.push(`%${keyword}%`, `%${keyword}%`);
            }
            
            // 处理状态筛选
            if (status !== undefined && status !== '') {
                whereClause += " AND status = ?";
                params.push(status);
            }
            
            console.log('销售列表查询条件:', whereClause);
            console.log('销售列表查询参数:', params);
            
            const query = `SELECT 
                id, 
                sales_no as salesNo, 
                product_name as productName, 
                quantity, 
                unit, 
                price, 
                total_amount as totalAmount, 
                customer, 
                DATE_FORMAT(sales_date, '%Y-%m-%d') as salesDate, 
                status,
                created_at as createdAt
            FROM sales_order
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?`;
            
            console.log('执行销售列表查询SQL:', query);
            
            const [rows] = await db.query(
                query,
                [...params, parseInt(limit), offset]
            );
            
            console.log(`销售查询结果: 找到${rows.length}条记录`);
            
            const [countResult] = await db.query(
                `SELECT COUNT(*) as total FROM sales_order ${whereClause}`,
                params
            );
            
            const total = countResult[0].total || 0;
            console.log(`销售总数: ${total}`);
            
            return res.json({
                code: 200,
                message: '获取销售列表成功',
                data: {
                    records: rows,
                    total: total,
                    page: parseInt(page),
                    limit: parseInt(limit)
                }
            });
        } catch (error) {
            console.error('获取销售列表失败:', error);
            return res.json({
                code: 500,
                message: '获取销售列表失败: ' + error.message
            });
        }
    },

    // 添加销售记录
    addSales: async (req, res) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            // 确保销售表存在
            await connection.query(`
                CREATE TABLE IF NOT EXISTS sales_order (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    sales_no VARCHAR(50) NOT NULL COMMENT '销售单号',
                    product_name VARCHAR(255) DEFAULT NULL COMMENT '商品名称(汇总)',
                    quantity DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '总数量',
                    unit VARCHAR(10) DEFAULT '千克' COMMENT '单位',
                    price DECIMAL(10,2) DEFAULT 0.00 COMMENT '单价',
                    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '总金额',
                    customer VARCHAR(100) NOT NULL COMMENT '客户名称',
                    sales_date DATE NOT NULL COMMENT '销售日期',
                    status TINYINT NOT NULL DEFAULT 0 COMMENT '状态：0待出库，1已出库',
                    created_by INT DEFAULT 1 COMMENT '创建人ID',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
                    KEY idx_sales_no (sales_no),
                    KEY idx_status (status),
                    KEY idx_sales_date (sales_date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售单';
            `);
            
            // 确保销售明细表存在
            await connection.query(`
                CREATE TABLE IF NOT EXISTS sales_order_detail (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    sales_id INT NOT NULL COMMENT '销售单ID',
                    inventory_id INT DEFAULT NULL COMMENT '库存ID',
                    product_id INT DEFAULT NULL COMMENT '商品ID',
                    quantity DECIMAL(10,2) NOT NULL COMMENT '数量',
                    unit VARCHAR(10) DEFAULT '千克' COMMENT '单位',
                    price DECIMAL(10,2) NOT NULL COMMENT '单价',
                    amount DECIMAL(10,2) NOT NULL COMMENT '金额',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                    KEY idx_sales_id (sales_id),
                    KEY idx_inventory_id (inventory_id),
                    KEY idx_product_id (product_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售单明细';
            `);
            
            const { customer, salesDate, details } = req.body;
            
            console.log('添加销售单 - 收到数据:', {
                customer,
                salesDate,
                detailsCount: details?.length || 0
            });
            
            // 验证销售明细不为空
            if (!details || details.length === 0) {
                return res.json({
                    code: 400,
                    message: '销售明细不能为空'
                });
            }
            
            // 验证每个明细是否有对应的库存
            for (const detail of details) {
                if (!detail.inventoryId) {
                    return res.json({
                        code: 400,
                        message: '请选择库存商品'
                    });
                }
                
                console.log('处理销售明细:', {
                    inventoryId: detail.inventoryId,
                    quantity: detail.quantity,
                    price: detail.price,
                    amount: detail.amount
                });
                
                // 检查库存是否足够
                const [inventoryInfo] = await connection.query(
                    `SELECT id, product_id, product_name, stock, locked_stock, 
                    (stock - locked_stock) as available_stock 
                    FROM inventory WHERE id = ?`,
                    [detail.inventoryId]
                );
                
                if (!inventoryInfo || inventoryInfo.length === 0) {
                    return res.json({
                        code: 400,
                        message: `库存商品不存在: ID=${detail.inventoryId}`
                    });
                }
                
                const availableStock = Number(inventoryInfo[0].available_stock);
                const requestedQuantity = Number(detail.quantity);
                
                if (availableStock < requestedQuantity) {
                    return res.json({
                        code: 400,
                        message: `商品 ${inventoryInfo[0].product_name} 库存不足，仅剩 ${availableStock}，需要 ${requestedQuantity}`
                    });
                }
                
                // 锁定库存
                await connection.query(
                    `UPDATE inventory 
                    SET locked_stock = locked_stock + ? 
                    WHERE id = ?`,
                    [requestedQuantity, detail.inventoryId]
                );
                
                console.log(`已锁定库存: 商品=${inventoryInfo[0].product_name}, 库存ID=${detail.inventoryId}, 数量=${requestedQuantity}`);
            }
            
            // 生成销售单号
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hour = String(now.getHours()).padStart(2, '0');
            const minute = String(now.getMinutes()).padStart(2, '0');
            const second = String(now.getSeconds()).padStart(2, '0');
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const salesNo = `XS${year}${month}${day}${hour}${minute}${second}${random}`;
            
            // 汇总数据
            let totalQuantity = 0;
            let totalAmount = 0;
            let productNames = [];
            let defaultPrice = 0; // 添加默认价格变量
            
            for (const detail of details) {
                // 获取库存信息
                const [inventoryInfo] = await connection.query(
                    `SELECT id, product_id, product_name FROM inventory WHERE id = ?`,
                    [detail.inventoryId]
                );
                
                if (inventoryInfo && inventoryInfo.length > 0) {
                    totalQuantity += Number(detail.quantity);
                    totalAmount += Number(detail.amount);
                    productNames.push(inventoryInfo[0].product_name);
                    
                    // 如果是第一个明细，记录其价格作为默认价格
                    if (defaultPrice === 0 && detail.price) {
                        defaultPrice = Number(detail.price);
                    }
                }
            }
            
            // 创建商品名称字符串
            let productName = productNames.join('、');
            if (productName.length > 200) {
                productName = productName.substring(0, 197) + '...';
            }
            
            // 获取第一个明细的单位作为默认单位
            const defaultUnit = details[0]?.unit || '千克';
            
            // 插入销售单主表，包含unit字段和price字段
            const [result] = await connection.query(
                `INSERT INTO sales_order 
                (sales_no, product_name, quantity, unit, price, total_amount, customer, sales_date, status, created_by, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                    salesNo,
                    productName,
                    totalQuantity,
                    defaultUnit, // 添加单位字段
                    defaultPrice, // 添加价格字段
                    totalAmount,
                    customer,
                    salesDate,
                    0, // 初始状态为待出库，不会自动出库
                    1  // 默认创建者ID为1
                ]
            );
            
            const salesId = result.insertId;
            console.log(`创建销售单成功: ${salesNo}, ID=${salesId}`);
            
            // 插入销售单明细
            for (const detail of details) {
                console.log('处理销售明细详情:', detail);
                
                if (!detail.inventoryId) {
                    console.error('跳过无效明细: 缺少inventoryId');
                    continue; // 跳过无效明细
                }
                
                // 获取库存信息
                const [inventoryInfo] = await connection.query(
                    `SELECT id, product_id, product_name, unit FROM inventory WHERE id = ?`,
                    [detail.inventoryId]
                );
                
                if (!inventoryInfo || inventoryInfo.length === 0) {
                    console.error(`跳过明细: 库存ID ${detail.inventoryId} 未找到`);
                    continue; // 跳过找不到库存的明细
                }
                
                // 确保所有字段都有值
                const product_id = inventoryInfo[0].product_id || null;
                const quantity = Number(detail.quantity) || 0;
                const unit = detail.unit || inventoryInfo[0].unit || '千克';
                const price = Number(detail.price) || 0;
                const amount = Number(detail.amount) || (quantity * price) || 0;
                
                console.log('准备插入销售明细:', {
                    salesId,
                    inventoryId: detail.inventoryId,
                    product_id,
                    quantity,
                    unit,
                    price,
                    amount
                });
                
                await connection.query(
                    `INSERT INTO sales_order_detail
                    (sales_id, inventory_id, product_id, quantity, unit, price, amount)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        salesId,
                        detail.inventoryId,
                        product_id,
                        quantity,
                        unit,
                        price,
                        amount
                    ]
                );
                
                console.log(`已添加销售明细: 销售单ID=${salesId}, 库存ID=${detail.inventoryId}, 商品=${inventoryInfo[0].product_name}, 数量=${quantity}, 单位=${unit}`);
            }
            
            await connection.commit();
            console.log(`销售单创建完成: ${salesNo}`);
            
            return res.json({
                code: 200,
                message: '添加销售记录成功',
                data: {
                    id: salesId,
                    salesNo
                }
            });
        } catch (error) {
            await connection.rollback();
            console.error('添加销售记录失败:', error);
            return res.json({
                code: 500,
                message: '添加销售记录失败: ' + error.message
            });
        } finally {
            connection.release();
        }
    },

    // 更新销售记录
    updateSales: async (req, res) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            const { id } = req.params;
            const { customer, salesDate, details } = req.body;
            
            // 处理日期格式，确保是YYYY-MM-DD格式
            const formattedDate = typeof salesDate === 'string' ? salesDate.substring(0, 10) : salesDate;
            
            // 获取原销售单信息
            const [salesInfo] = await connection.query(
                'SELECT id, sales_no, status FROM sales_order WHERE id = ?',
                [id]
            );
            
            if (!salesInfo || salesInfo.length === 0) {
                return res.status(404).json({
                    code: 404,
                    message: '销售单不存在'
                });
            }
            
            // 检查销售单状态，只有待出库的才能编辑
            if (salesInfo[0].status === 1) {
                return res.status(400).json({
                    code: 400,
                    message: '已出库的销售单不能编辑'
                });
            }
            
            // 获取原销售单明细，用于解除原有库存锁定
            const [oldDetails] = await connection.query(
                `SELECT d.id, d.product_id, d.quantity, i.id as inventory_id 
                FROM sales_order_detail d
                LEFT JOIN inventory i ON i.product_id = d.product_id
                WHERE d.sales_id = ?`,
                [id]
            );
            
            // 解除原有库存锁定
            for (const oldDetail of oldDetails) {
                if (oldDetail.inventory_id) {
                    await connection.query(
                        `UPDATE inventory 
                        SET locked_stock = GREATEST(0, locked_stock - ?) 
                        WHERE id = ?`,
                        [oldDetail.quantity, oldDetail.inventory_id]
                    );
                }
            }
            
            // 汇总数据
            let totalQuantity = 0;
            let totalAmount = 0;
            let productNames = [];
            
            if (!details || details.length === 0) {
                return res.status(400).json({
                    code: 400,
                    message: '销售明细不能为空'
                });
            }
            
            // 验证每个明细是否有对应的库存
            for (const detail of details) {
                if (!detail.inventoryId) {
                    return res.status(400).json({
                        code: 400,
                        message: '请选择库存商品'
                    });
                }
                
                // 检查库存是否足够
                const [inventoryInfo] = await connection.query(
                    `SELECT sku_id, sku_name, stock, locked_stock, (stock - locked_stock) as available_stock 
                    FROM inventory WHERE id = ?`,
                    [detail.inventoryId]
                );
                
                if (!inventoryInfo || inventoryInfo.length === 0) {
                    return res.status(400).json({
                        code: 400,
                        message: `库存商品不存在: ${detail.inventoryId}`
                    });
                }
                
                if (inventoryInfo[0].available_stock < detail.quantity) {
                    return res.status(400).json({
                        code: 400,
                        message: `商品 ${inventoryInfo[0].sku_name} 库存不足，仅剩 ${inventoryInfo[0].available_stock}`
                    });
                }
                
                // 锁定库存
                await connection.query(
                    `UPDATE inventory 
                    SET locked_stock = locked_stock + ? 
                    WHERE id = ?`,
                    [detail.quantity, detail.inventoryId]
                );
                
                // 汇总信息
                totalQuantity += Number(detail.quantity);
                totalAmount += Number(detail.amount);
                productNames.push(inventoryInfo[0].sku_name);
            }
            
            // 创建商品名称字符串
            let productName = productNames.join('、');
            if (productName.length > 100) {
                productName = productName.substring(0, 97) + '...';
            }
            
            // 更新销售单主表
            await connection.query(`
                UPDATE sales_order
                SET product_name = ?,
                    quantity = ?,
                    total_amount = ?,
                    customer = ?,
                    sales_date = ?,
                    updated_at = NOW()
                WHERE id = ?
            `, [productName, totalQuantity, totalAmount, customer, formattedDate, id]);
            
            // 删除原有明细
            await connection.query('DELETE FROM sales_order_detail WHERE sales_id = ?', [id]);
            
            // 创建新的明细
            for (const detail of details) {
                // 获取库存信息
                const [inventoryInfo] = await connection.query(
                    `SELECT sku_id, sku_name FROM inventory WHERE id = ?`,
                    [detail.inventoryId]
                );
                
                if (inventoryInfo && inventoryInfo.length > 0) {
                    await connection.query(
                        `INSERT INTO sales_order_detail
                        (sales_id, product_id, quantity, unit, price, amount)
                        VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            id,
                            inventoryInfo[0].sku_id,
                            detail.quantity,
                            detail.unit,
                            detail.price,
                            detail.amount
                        ]
                    );
                }
            }
            
            await connection.commit();
            
            res.json({
                code: 200,
                message: '更新销售记录成功'
            });
        } catch (error) {
            await connection.rollback();
            console.error('更新销售记录失败:', error);
            res.status(500).json({
                code: 500,
                message: '更新销售记录失败',
                error: error.message
            });
        } finally {
            connection.release();
        }
    },

    // 删除销售记录
    deleteSales: async (req, res) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            const { id } = req.params;
            
            // 检查销售单状态
            const [statusResult] = await connection.query(
                'SELECT sales_no, status FROM sales_order WHERE id = ?',
                [id]
            );
            
            if (statusResult.length === 0) {
                return res.status(404).json({
                    code: 404,
                    message: '销售单不存在'
                });
            }
            
            if (statusResult[0].status === 1) {
                return res.status(400).json({
                    code: 400,
                    message: '已出库的销售单不能删除'
                });
            }
            
            // 获取销售单明细，用于解除库存锁定
            const [details] = await connection.query(
                `SELECT d.id, d.product_id, d.quantity, i.id as inventory_id 
                FROM sales_order_detail d
                LEFT JOIN inventory i ON i.product_id = d.product_id
                WHERE d.sales_id = ?`,
                [id]
            );
            
            // 解除库存锁定
            for (const detail of details) {
                if (detail.inventory_id) {
                    await connection.query(
                        `UPDATE inventory 
                        SET locked_stock = GREATEST(0, locked_stock - ?) 
                        WHERE id = ?`,
                        [detail.quantity, detail.inventory_id]
                    );
                }
            }
            
            // 删除销售单明细
            await connection.query('DELETE FROM sales_order_detail WHERE sales_id = ?', [id]);
            
            // 删除销售单主表
            await connection.query('DELETE FROM sales_order WHERE id = ?', [id]);
            
            await connection.commit();
            
            res.json({
                code: 200,
                message: '删除销售记录成功'
            });
        } catch (error) {
            await connection.rollback();
            console.error('删除销售记录失败:', error);
            res.status(500).json({
                code: 500,
                message: '删除销售记录失败',
                error: error.message
            });
        } finally {
            connection.release();
        }
    },

    // 更新销售状态
    updateSalesStatus: async (req, res) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            const { id } = req.params;
            const { status } = req.body;
            
            console.log(`更新销售单状态: ID=${id}, 新状态=${status}`);
            
            // 获取销售单信息
            const [salesInfo] = await connection.query(
                'SELECT id, sales_no, status FROM sales_order WHERE id = ?',
                [id]
            );
            
            if (!salesInfo || salesInfo.length === 0) {
                return res.json({
                    code: 404,
                    message: '销售单不存在'
                });
            }
            
            // 检查当前状态与请求状态是否相同
            if (Number(salesInfo[0].status) === Number(status)) {
                return res.json({
                    code: 400,
                    message: `销售单已经是${status === 1 ? '已出库' : '待出库'}状态`
                });
            }
            
            // 确保库存记录表存在
            await connection.query(`
                CREATE TABLE IF NOT EXISTS inventory_record (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    inventory_id INT NOT NULL COMMENT '库存ID',
                    product_id INT NOT NULL COMMENT '商品ID',
                    product_name VARCHAR(100) NOT NULL COMMENT '商品名称',
                    before_stock DECIMAL(10,2) NOT NULL COMMENT '变动前库存',
                    adjustment DECIMAL(10,2) NOT NULL COMMENT '变动数量（正数为入库，负数为出库）',
                    after_stock DECIMAL(10,2) NOT NULL COMMENT '变动后库存',
                    type ENUM('in','out') NOT NULL COMMENT '类型：in入库，out出库',
                    source_type VARCHAR(20) DEFAULT NULL COMMENT '来源类型：purchase进货，sales销售，manual手动调整',
                    source_id INT DEFAULT NULL COMMENT '来源ID：进货单ID或销售单ID',
                    remark VARCHAR(255) DEFAULT NULL COMMENT '备注',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                    KEY idx_inventory_id (inventory_id),
                    KEY idx_product_id (product_id),
                    KEY idx_type (type),
                    KEY idx_source (source_type,source_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存流水记录表';
            `);
            
            // 获取销售单明细
            const [details] = await connection.query(
                `SELECT 
                    id, 
                    inventory_id, 
                    quantity, 
                    unit
                FROM sales_order_detail 
                WHERE sales_id = ?`,
                [id]
            );
            
            if (!details || details.length === 0) {
                return res.json({
                    code: 400,
                    message: '销售单没有明细，无法更新状态'
                });
            }
            
            // 待出库 -> 已出库：减少库存
            if (Number(status) === 1) {
                for (const detail of details) {
                    // 查询库存
                    const [inventoryItem] = await connection.query(
                        `SELECT id, product_id, product_name, stock, locked_stock 
                        FROM inventory 
                        WHERE id = ?`,
                        [detail.inventory_id]
                    );
                    
                    if (!inventoryItem || inventoryItem.length === 0) {
                        await connection.rollback();
                        return res.json({
                            code: 400,
                            message: `库存ID ${detail.inventory_id} 不存在，无法出库`
                        });
                    }
                    
                    const currentStock = Number(inventoryItem[0].stock);
                    const lockedStock = Number(inventoryItem[0].locked_stock);
                    const deductQuantity = Number(detail.quantity);
                    
                    // 检查库存是否足够
                    if (currentStock < deductQuantity) {
                        await connection.rollback();
                        return res.json({
                            code: 400,
                            message: `商品 ${inventoryItem[0].product_name} 库存不足，当前库存: ${currentStock}，需要: ${deductQuantity}`
                        });
                    }
                    
                    // 更新库存 - 减少总库存和锁定库存
                    const newStock = currentStock - deductQuantity;
                    const newLockedStock = Math.max(0, lockedStock - deductQuantity);
                    
                    console.log('销售出库库存更新详情:', {
                        inventoryId: detail.inventory_id,
                        currentStock,
                        deductQuantity,
                        newStock,
                        oldLockedStock: lockedStock,
                        newLockedStock
                    });

                    // 更新库存表
                    const updateResult = await connection.query(
                        'UPDATE inventory SET stock = ?, locked_stock = ? WHERE id = ?',
                        [newStock, newLockedStock, detail.inventory_id]
                    );

                    // 验证更新结果
                    if (updateResult.affectedRows !== 1) {
                        console.warn('库存更新可能失败:', {
                            inventoryId: detail.inventory_id,
                            affectedRows: updateResult.affectedRows
                        });
                    }

                    // 验证更新后的库存
                    const updatedInventory = await connection.query(
                        'SELECT stock, locked_stock FROM inventory WHERE id = ?',
                        [detail.inventory_id]
                    );

                    console.log('更新后的库存状态:', {
                        inventoryId: detail.inventory_id,
                        newStock: updatedInventory[0].stock,
                        newLockedStock: updatedInventory[0].locked_stock
                    });
                    
                    // 同时更新SKU表中的库存
                    if (inventoryItem[0].product_id) {
                        // 查询SKU当前库存
                        const [skuInfo] = await connection.query(
                            'SELECT sku_id, stock FROM sku WHERE sku_id = ?',
                            [inventoryItem[0].product_id]
                        );
                        
                        if (skuInfo && skuInfo.length > 0) {
                            const oldSkuStock = Number(skuInfo[0].stock || 0);
                            const newSkuStock = Math.max(0, oldSkuStock - deductQuantity);
                            
                            // 更新SKU库存
                            const skuUpdateResult = await connection.query(
                                'UPDATE sku SET stock = ? WHERE sku_id = ?',
                                [newSkuStock, inventoryItem[0].product_id]
                            );
                            
                            console.log('更新SKU库存:', {
                                skuId: inventoryItem[0].product_id,
                                oldStock: oldSkuStock,
                                newStock: newSkuStock,
                                affectedRows: skuUpdateResult.affectedRows
                            });
                        } else {
                            console.warn(`未找到相应的SKU记录: ${inventoryItem[0].product_id}`);
                        }
                    }
                    
                    // 添加库存记录
                    await connection.query(
                        `INSERT INTO inventory_record 
                        (inventory_id, product_id, product_name, before_stock, adjustment, after_stock, 
                        type, source_type, source_id, remark, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                        [
                            detail.inventory_id,
                            inventoryItem[0].product_id,
                            inventoryItem[0].product_name,
                            currentStock,
                            -deductQuantity, // 负数表示出库
                            newStock,
                            'out',
                            'sales',
                            id,
                            `销售出库: ${salesInfo[0].sales_no}`,
                            new Date()
                        ]
                    );
                }
            }
            // 已出库 -> 待出库：恢复库存（撤销出库）
            else if (Number(status) === 0) {
                for (const detail of details) {
                    // 查询库存
                    const [inventoryItem] = await connection.query(
                        `SELECT id, product_id, product_name, stock, locked_stock 
                        FROM inventory 
                        WHERE id = ?`,
                        [detail.inventory_id]
                    );
                    
                    if (!inventoryItem || inventoryItem.length === 0) {
                        // 如果库存记录不存在，可以创建新记录
                        console.warn(`撤销出库: 库存ID ${detail.inventory_id} 不存在，将创建新记录`);
                        
                        // 获取商品信息
                        const [productInfo] = await connection.query(
                            `SELECT product_id, product_name FROM sales_order_detail 
                            WHERE id = ?`,
                            [detail.id]
                        );
                        
                        if (productInfo && productInfo.length > 0) {
                            // 创建新的库存记录
                            const [newInventory] = await connection.query(
                                `INSERT INTO inventory 
                                (product_id, product_name, stock, locked_stock, unit) 
                                VALUES (?, ?, ?, ?, ?)`,
                                [
                                    productInfo[0].product_id,
                                    productInfo[0].product_name,
                                    Number(detail.quantity),  // 恢复原数量
                                    0,                        // 锁定库存为0
                                    detail.unit || '千克'
                                ]
                            );
                            
                            const newInventoryId = newInventory.insertId;
                            
                            // 添加库存恢复记录
                            await connection.query(
                                `INSERT INTO inventory_record 
                                (inventory_id, product_id, product_name, before_stock, adjustment, after_stock, 
                                type, source_type, source_id, remark, created_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                                [
                                    newInventoryId,
                                    productInfo[0].product_id,
                                    productInfo[0].product_name,
                                    0,
                                    Number(detail.quantity),
                                    Number(detail.quantity),
                                    'in',
                                    'sales_cancel',
                                    id,
                                    `撤销销售出库(新建): ${salesInfo[0].sales_no}`,
                                    new Date()
                                ]
                            );
                            
                            // 更新销售单明细中的库存ID引用
                            await connection.query(
                                `UPDATE sales_order_detail SET inventory_id = ? WHERE id = ?`,
                                [newInventoryId, detail.id]
                            );
                        }
                        
                        continue;
                    }
                    
                    // 恢复库存数量和锁定库存
                    const currentStock = Number(inventoryItem[0].stock);
                    const currentLocked = Number(inventoryItem[0].locked_stock);
                    const addQuantity = Number(detail.quantity);
                    const newStock = currentStock + addQuantity;
                    const newLocked = currentLocked + addQuantity;  // 恢复为锁定状态
                    
                    await connection.query(
                        'UPDATE inventory SET stock = ?, locked_stock = ? WHERE id = ?',
                        [newStock, newLocked, detail.inventory_id]
                    );
                    
                    console.log(`已更新库存(撤销出库): 商品=${inventoryItem[0].product_name}, 旧库存=${currentStock}, 增加=${addQuantity}, 新库存=${newStock}, 锁定=${newLocked}`);
                    
                    // 同时更新SKU表中的库存
                    if (inventoryItem[0].product_id) {
                        // 查询SKU当前库存
                        const [skuInfo] = await connection.query(
                            'SELECT sku_id, stock FROM sku WHERE sku_id = ?',
                            [inventoryItem[0].product_id]
                        );
                        
                        if (skuInfo && skuInfo.length > 0) {
                            const oldSkuStock = Number(skuInfo[0].stock || 0);
                            const newSkuStock = oldSkuStock + addQuantity;
                            
                            // 更新SKU库存
                            const skuUpdateResult = await connection.query(
                                'UPDATE sku SET stock = ? WHERE sku_id = ?',
                                [newSkuStock, inventoryItem[0].product_id]
                            );
                            
                            console.log('更新SKU库存(撤销出库):', {
                                skuId: inventoryItem[0].product_id,
                                oldStock: oldSkuStock,
                                newStock: newSkuStock,
                                affectedRows: skuUpdateResult.affectedRows
                            });
                        } else {
                            console.warn(`未找到相应的SKU记录: ${inventoryItem[0].product_id}`);
                        }
                    }
                    
                    // 添加库存恢复记录
                    await connection.query(
                        `INSERT INTO inventory_record 
                        (inventory_id, product_id, product_name, before_stock, adjustment, after_stock, 
                        type, source_type, source_id, remark, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                        [
                            detail.inventory_id,
                            inventoryItem[0].product_id,
                            inventoryItem[0].product_name,
                            currentStock,
                            addQuantity, // 正数表示入库
                            newStock,
                            'in',
                            'sales_cancel',
                            id,
                            `撤销销售出库: ${salesInfo[0].sales_no}`,
                            new Date()
                        ]
                    );
                }
            }
            
            // 更新销售单状态
            await connection.query(
                'UPDATE sales_order SET status = ? WHERE id = ?',
                [status, id]
            );
            
            await connection.commit();
            console.log(`销售单状态更新完成: ID=${id}, 新状态=${status}`);
            
            return res.json({
                code: 200,
                message: Number(status) === 1 ? '出库成功' : '撤销出库成功'
            });
        } catch (error) {
            await connection.rollback();
            console.error('更新销售状态失败:', error);
            return res.json({
                code: 500,
                message: '更新销售状态失败: ' + error.message
            });
        } finally {
            connection.release();
        }
    },

    // 获取销售单详情
    getSalesDetail: async (req, res) => {
        try {
            const { id } = req.params;
            console.log(`获取销售单详情: ID=${id}`);

            // 获取销售单主表信息
            const [salesResult] = await db.query(`
                SELECT 
                    id,
                    sales_no as salesNo,
                    product_name as productName,
                    customer,
                    sales_date as salesDate,
                    status,
                    total_amount as totalAmount
                FROM sales_order
                WHERE id = ?
            `, [id]);

            if (!salesResult || salesResult.length === 0) {
                console.log(`销售单不存在: ID=${id}`);
                return res.json({
                    code: 404,
                    message: '销售单不存在'
                });
            }

            // 获取销售单明细
            const [detailsResult] = await db.query(`
                SELECT 
                    id,
                    inventory_id as inventoryId,
                    product_id as skuId,
                    quantity,
                    unit,
                    price,
                    amount as totalAmount
                FROM sales_order_detail
                WHERE sales_id = ?
            `, [id]);
            
            console.log(`找到销售单明细: ${detailsResult.length}条`);
            
            // 获取明细中商品的名称
            for (const detail of detailsResult) {
                try {
                    // 获取库存商品信息
                    if (detail.inventoryId) {
                        const [inventoryResult] = await db.query(
                            `SELECT product_name, sku_spec FROM inventory WHERE id = ?`, 
                            [detail.inventoryId]
                        );
                        if (inventoryResult && inventoryResult.length > 0) {
                            detail.skuName = inventoryResult[0].product_name;
                            detail.skuSpec = inventoryResult[0].sku_spec;
                        }
                    }
                } catch (err) {
                    console.warn(`获取明细商品信息失败: ${err.message}`);
                }
            }

            // 组装返回数据
            const salesDetail = {
                ...salesResult[0],
                details: detailsResult
            };
            
            console.log(`销售单详情查询成功: ID=${id}`);

            return res.json({
                code: 200,
                message: '获取销售单详情成功',
                data: salesDetail
            });
        } catch (error) {
            console.error('获取销售单详情失败:', error);
            return res.json({
                code: 500,
                message: '获取销售单详情失败: ' + error.message
            });
        }
    },

    // 获取库存列表
    getInventoryList: async (req, res) => {
        try {
            // 确保库存表存在
            await db.query(`
                CREATE TABLE IF NOT EXISTS inventory (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    product_id INT DEFAULT NULL COMMENT '商品ID',
                    product_name VARCHAR(100) NOT NULL COMMENT '商品名称',
                    sku_spec VARCHAR(50) DEFAULT NULL COMMENT '规格',    
                    tm_id INT DEFAULT NULL COMMENT '品牌ID',
                    tm_name VARCHAR(50) DEFAULT NULL COMMENT '品牌名称',
                    purchase_id INT DEFAULT NULL COMMENT '进货单ID',
                    purchase_price DECIMAL(10,2) DEFAULT 0.00 COMMENT '进货价格',
                    purchase_date DATE DEFAULT NULL COMMENT '进货日期',
                    stock DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '库存数量',
                    locked_stock DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '锁定库存（已下单未出库）',
                    unit VARCHAR(10) DEFAULT '千克' COMMENT '单位',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
                    KEY idx_product_id (product_id),
                    KEY idx_tm_id (tm_id),
                    KEY idx_purchase_id (purchase_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存表';
            `);
            
            const { page = 1, limit = 10, keyword = '', tmId } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            
            let whereClause = "WHERE 1=1";
            const params = [];
            
            // 处理关键字搜索 - 支持商品名称搜索
            if (keyword) {
                whereClause += " AND i.product_name LIKE ?";
                params.push(`%${keyword}%`);
            }
            
            // 按品牌筛选
            if (tmId) {
                whereClause += " AND i.tm_id = ?";
                params.push(tmId);
            }
            
            console.log('库存查询条件:', whereClause);
            console.log('库存查询参数:', params);
            
            // 查询库存记录，使用正确的字段名
            const query = `SELECT 
                i.id, 
                i.product_id as skuId,
                i.product_name as skuName,
                i.sku_spec as skuSpec,
                i.tm_id as tmId,
                COALESCE(t.tmName, '') as tmName,
                i.purchase_id as purchaseId,
                i.purchase_price as purchasePrice,
                i.purchase_date as purchaseDate,
                i.stock as totalStock,
                i.locked_stock as lockedStock,
                (i.stock - i.locked_stock) as availableStock,
                i.unit,
                i.created_at as createdAt,
                i.updated_at as updatedAt
            FROM inventory i
            LEFT JOIN trademarks t ON i.tm_id = t.product_id
            ${whereClause}
            ORDER BY i.purchase_date DESC, i.id DESC
            LIMIT ? OFFSET ?`;
            
            console.log('执行库存查询SQL:', query);
            
            const [rows] = await db.query(
                query,
                [...params, parseInt(limit), offset]
            );
            
            console.log(`库存查询结果: 找到${rows.length}条记录`);
            
            const [countResult] = await db.query(
                `SELECT COUNT(*) as total FROM inventory i ${whereClause}`,
                params
            );
            
            const total = countResult[0].total || 0;
            console.log(`库存总数: ${total}`);
            
            return res.json({
                code: 200,
                message: '获取库存列表成功',
                data: {
                    records: rows,
                    total: total,
                    page: parseInt(page),
                    limit: parseInt(limit)
                }
            });
        } catch (error) {
            console.error('获取库存列表失败:', error);
            return res.json({
                code: 500,
                message: '获取库存列表失败: ' + error.message
            });
        }
    },

    // 获取库存详情
    getInventoryDetail: async (req, res) => {
        try {
            const { id } = req.params;

            const [inventoryResult] = await db.query(
                `SELECT 
                    i.id, 
                    i.product_id as skuId,
                    i.product_name as skuName,
                    i.sku_spec as skuSpec,
                    i.tm_id as tmId,
                    t.tmName as tmName,
                    i.purchase_id as purchaseId,
                    p.purchase_no as purchaseNo,
                    i.purchase_price as purchasePrice,
                    i.purchase_date as purchaseDate,
                    i.stock as totalStock,
                    i.locked_stock as lockedStock,
                    (i.stock - i.locked_stock) as availableStock,
                    i.unit,
                    i.created_at as createdAt,
                    i.updated_at as updatedAt
                FROM inventory i
                LEFT JOIN trademarks t ON i.tm_id = t.product_id
                LEFT JOIN purchase_order p ON i.purchase_id = p.id
                WHERE i.id = ?`,
                [id]
            );

            if (!inventoryResult || inventoryResult.length === 0) {
                return res.status(404).json({
                    code: 404,
                    message: '库存记录不存在'
                });
            }

            res.json({
                code: 200,
                message: '获取库存详情成功',
                data: inventoryResult[0]
            });
        } catch (error) {
            console.error('获取库存详情失败:', error);
            res.status(500).json({
                code: 500,
                message: '获取库存详情失败',
                error: error.message
            });
        }
    },

    // 更新库存
    updateInventory: async (req, res) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            const { id } = req.params;
            const { adjustment, remark } = req.body;
            
            // 获取当前库存信息
            const [currentInventory] = await connection.query(
                'SELECT id, product_id, product_name, stock FROM inventory WHERE id = ?',
                [id]
            );
            
            if (!currentInventory || currentInventory.length === 0) {
                return res.status(404).json({
                    code: 404,
                    message: '库存记录不存在'
                });
            }
            
            // 计算新库存
            const currentStock = currentInventory[0].stock;
            const newStock = currentStock + Number(adjustment);
            
            if (newStock < 0) {
                return res.status(400).json({
                    code: 400,
                    message: '库存不足，无法完成调整'
                });
            }
            
            // 更新库存
            await connection.query(
                'UPDATE inventory SET stock = ?, updated_at = NOW() WHERE id = ?',
                [newStock, id]
            );
            
            // 记录库存变动明细
            await connection.query(
                `INSERT INTO inventory_record 
                (inventory_id, product_id, product_name, before_stock, adjustment, after_stock, type, remark, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                    id,
                    currentInventory[0].product_id,
                    currentInventory[0].product_name,
                    currentStock,
                    adjustment,
                    newStock,
                    adjustment > 0 ? 'in' : 'out',  // 正数为入库，负数为出库
                    remark || '手动调整'
                ]
            );
            
            await connection.commit();
            
            res.json({
                code: 200,
                message: '库存更新成功'
            });
        } catch (error) {
            await connection.rollback();
            console.error('更新库存失败:', error);
            res.status(500).json({
                code: 500,
                message: '更新库存失败',
                error: error.message
            });
        } finally {
            connection.release();
        }
    },

    // 获取库存记录
    getInventoryRecords: async (req, res) => {
        try {
            const { page = 1, limit = 10, inventoryId, skuId, type, startDate, endDate } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            
            let whereClause = "WHERE 1=1";
            const params = [];
            
            // 按库存ID筛选
            if (inventoryId) {
                whereClause += " AND inventory_id = ?";
                params.push(inventoryId);
            }
            
            // 按商品ID筛选
            if (skuId) {
                whereClause += " AND product_id = ?";
                params.push(skuId);
            }
            
            // 按类型筛选 (in/out)
            if (type) {
                whereClause += " AND type = ?";
                params.push(type);
            }
            
            // 按日期范围筛选
            if (startDate && endDate) {
                whereClause += " AND created_at BETWEEN ? AND ?";
                params.push(startDate, endDate + ' 23:59:59');
            } else if (startDate) {
                whereClause += " AND created_at >= ?";
                params.push(startDate);
            } else if (endDate) {
                whereClause += " AND created_at <= ?";
                params.push(endDate + ' 23:59:59');
            }
            
            // 查询库存记录
            const [rows] = await db.query(
                `SELECT 
                    id,
                    inventory_id as inventoryId,
                    product_id as skuId,
                    product_name as skuName,
                    before_stock as beforeStock,
                    adjustment,
                    after_stock as afterStock,
                    type,
                    source_type as sourceType,
                    source_id as sourceId,
                    remark,
                    created_at as createdAt
                FROM inventory_record
                ${whereClause}
                ORDER BY created_at DESC, id DESC
                LIMIT ? OFFSET ?`,
                [...params, parseInt(limit), offset]
            );
            
            const [countResult] = await db.query(
                `SELECT COUNT(*) as total FROM inventory_record ${whereClause}`,
                params
            );
            
            res.json({
                code: 200,
                message: '获取库存记录成功',
                data: {
                    records: rows,
                    total: countResult[0].total,
                    page: parseInt(page),
                    limit: parseInt(limit)
                }
            });
        } catch (error) {
            console.error('获取库存记录失败:', error);
            res.status(500).json({
                code: 500,
                message: '获取库存记录失败',
                error: error.message
            });
        }
    }
}; 