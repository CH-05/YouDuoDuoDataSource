const pool = require('../db/index');
const moment = require('moment');

/**
 * 获取总体统计数据
 * @returns {Promise<Object>} 统计数据
 */
async function getDashboardStats() {
    try {
        // 获取总销售额
        const [salesResult] = await pool.query(`
            SELECT COALESCE(SUM(total_amount), 0) AS totalSales 
            FROM sales_order
        `);
        const totalSales = parseFloat(salesResult[0].totalSales) || 0;

        // 获取今日销售额
        const today = moment().format('YYYY-MM-DD');
        const [todaySalesResult] = await pool.query(`
            SELECT COALESCE(SUM(total_amount), 0) AS todaySales 
            FROM sales_order 
            WHERE DATE(sales_date) = ?
        `, [today]);
        const todaySales = parseFloat(todaySalesResult[0].todaySales) || 0;

        // 获取总进货额
        const [purchaseResult] = await pool.query(`
            SELECT COALESCE(SUM(total_amount), 0) AS totalPurchase 
            FROM purchase_order
        `);
        const totalPurchase = parseFloat(purchaseResult[0].totalPurchase) || 0;

        // 获取今日进货额
        const [todayPurchaseResult] = await pool.query(`
            SELECT COALESCE(SUM(total_amount), 0) AS todayPurchase 
            FROM purchase_order 
            WHERE DATE(purchase_date) = ?
        `, [today]);
        const todayPurchase = parseFloat(todayPurchaseResult[0].todayPurchase) || 0;

        // 获取总库存额（库存数量 * 进货价格）
        const [inventoryResult] = await pool.query(`
            SELECT COALESCE(SUM(stock * purchase_price), 0) AS totalInventory 
            FROM inventory
        `);
        const totalInventory = parseFloat(inventoryResult[0].totalInventory) || 0;

        // 计算总利润（总销售额 - 总进货成本）
        // 注意：这是一个简化的计算，实际上需要考虑更多因素
        const totalProfit = totalSales - totalPurchase;

        // 获取用户数量
        const [userResult] = await pool.query(`
            SELECT COUNT(*) AS userCount 
            FROM users
        `);
        const userCount = parseInt(userResult[0].userCount) || 0;

        // 获取SKU数量
        const [skuResult] = await pool.query(`
            SELECT COUNT(*) AS skuCount 
            FROM sku
        `);
        const orderCount = parseInt(skuResult[0].skuCount) || 0;

        return {
            totalSales,
            totalPurchase,
            totalInventory,
            totalProfit,
            todaySales,
            todayPurchase,
            userCount,
            orderCount
        };
    } catch (error) {
        console.error('获取统计数据失败:', error);
        // 返回默认数据而不是抛出错误，以确保前端不会崩溃
        return {
            totalSales: 0,
            totalPurchase: 0,
            totalInventory: 0,
            totalProfit: 0,
            todaySales: 0,
            todayPurchase: 0,
            userCount: 0,
            orderCount: 0
        };
    }
}

/**
 * 获取销售趋势数据
 * @param {number} days 天数
 * @returns {Promise<Object>} 趋势数据
 */
async function getSalesTrend(days = 30) {
    try {
        const dates = [];
        const sales = [];
        const profit = [];

        // 生成日期数组
        for (let i = days - 1; i >= 0; i--) {
            dates.push(moment().subtract(i, 'days').format('YYYY-MM-DD'));
        }

        // 获取所有日期的销售数据
        const [salesResults] = await pool.query(`
            SELECT 
                DATE(sales_date) AS date,
                COALESCE(SUM(total_amount), 0) AS dailySales
            FROM 
                sales_order
            WHERE 
                sales_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY 
                DATE(sales_date)
        `, [days]);

        // 获取所有日期的销售成本数据
        const [costResults] = await pool.query(`
            SELECT 
                DATE(so.sales_date) AS date,
                COALESCE(SUM(sod.quantity * i.purchase_price), 0) AS dailyCost
            FROM 
                sales_order_detail sod
            JOIN 
                sales_order so ON sod.sales_id = so.id
            JOIN 
                inventory i ON sod.inventory_id = i.id
            WHERE 
                so.sales_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY 
                DATE(so.sales_date)
        `, [days]);

        // 将查询结果转换为映射，方便查找
        const salesMap = {};
        salesResults.forEach(item => {
            salesMap[item.date] = parseFloat(item.dailySales);
        });

        const costMap = {};
        costResults.forEach(item => {
            costMap[item.date] = parseFloat(item.dailyCost);
        });

        // 填充数据数组
        dates.forEach(date => {
            const dailySales = salesMap[date] || 0;
            sales.push(dailySales);
            
            const dailyCost = costMap[date] || 0;
            const dailyProfit = dailySales - dailyCost;
            profit.push(dailyProfit > 0 ? dailyProfit : 0);
        });

        return { dates, sales, profit };
    } catch (error) {
        console.error('获取销售趋势数据失败:', error);
        // 返回默认数据
        const dates = [];
        const sales = [];
        const profit = [];
        
        for (let i = 0; i < days; i++) {
            dates.push(moment().subtract(days - i - 1, 'days').format('YYYY-MM-DD'));
            sales.push(0);
            profit.push(0);
        }
        
        return { dates, sales, profit };
    }
}

/**
 * 获取库存统计数据
 * @returns {Promise<Object>} 库存统计
 */
async function getInventoryStats() {
    try {
        // 定义库存状态阈值
        const SUFFICIENT_THRESHOLD = 100; // 库存充足的阈值
        const WARNING_THRESHOLD = 50;     // 库存预警的阈值

        // 根据阈值查询不同状态的库存数量
        const [result] = await pool.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN stock >= ? THEN 1 ELSE 0 END), 0) AS sufficient,
                COALESCE(SUM(CASE WHEN stock >= ? AND stock < ? THEN 1 ELSE 0 END), 0) AS warning,
                COALESCE(SUM(CASE WHEN stock < ? THEN 1 ELSE 0 END), 0) AS insufficient
            FROM 
                inventory
        `, [SUFFICIENT_THRESHOLD, WARNING_THRESHOLD, SUFFICIENT_THRESHOLD, WARNING_THRESHOLD]);

        return {
            sufficient: parseInt(result[0].sufficient) || 0,
            warning: parseInt(result[0].warning) || 0,
            insufficient: parseInt(result[0].insufficient) || 0
        };
    } catch (error) {
        console.error('获取库存统计数据失败:', error);
        // 返回默认数据
        return {
            sufficient: 0,
            warning: 0,
            insufficient: 0
        };
    }
}

/**
 * 获取销量排名数据
 * @param {number} limit 数量限制
 * @returns {Promise<Array>} 排名数据
 */
async function getSalesRanking(limit = 10) {
    try {
        // 查询销量最高的商品
        const [results] = await pool.query(`
            SELECT 
                product_name AS name,
                COALESCE(SUM(quantity), 0) AS value
            FROM 
                sales_order
            GROUP BY 
                product_name
            ORDER BY 
                value DESC
            LIMIT ?
        `, [limit]);

        // 如果没有数据，返回一个默认数据
        if (results.length === 0) {
            return generateDefaultRankingData();
        }

        return results;
    } catch (error) {
        console.error('获取销量排名数据失败:', error);
        return generateDefaultRankingData();
    }
}

// 生成默认排名数据
function generateDefaultRankingData() {
    return [
        { name: '小麦粉', value: 0 },
        { name: '大米', value: 0 },
        { name: '玉米粉', value: 0 }
    ];
}

/**
 * 获取品牌销售占比
 * @returns {Promise<Array>} 品牌销售占比数据
 */
async function getBrandSalesRatio() {
    try {
        // 执行正确的 SQL 查询
        const [results] = await pool.query(`
            SELECT 
                COALESCE(tm.tmName, '未知品牌') AS name, 
                COALESCE(SUM(sod.amount), 0) AS value 
            FROM 
                sales_order_detail sod
            JOIN 
                sku ON sod.product_id = sku.sku_id -- 使用 sod.product_id (即 sku_id) 关联 sku 表
            LEFT JOIN 
                trademarks tm ON sku.product_id = tm.product_id -- 使用 sku.product_id (即品牌ID) 关联 trademarks 表
            GROUP BY 
                COALESCE(tm.tmName, '未知品牌')
            ORDER BY 
                value DESC
        `);

        // 如果没有数据，返回包含默认结构的空数组或带有特定消息的对象
        if (results.length === 0) {
            // 可以选择返回空数组或默认结构
            return [
                 { name: '暂无品牌销售数据', value: 0 }
            ];
            // 或者返回空数组:
            // return []; 
        }

        // 确保 value 是数字类型
        const formattedResults = results.map(item => ({
            name: item.name,
            value: parseFloat(item.value) || 0
        }));

        return formattedResults;

    } catch (error) {
        console.error('获取品牌销售占比数据失败:', error);
        // 在出错时返回默认结构，防止前端崩溃
        return [
            { name: '数据加载失败', value: 0 }
            // { name: '品牌A', value: 0 },
            // { name: '品牌B', value: 0 },
            // { name: '其他', value: 0 }
        ];
    }
}

/**
 * 获取分类销售占比
 * @returns {Promise<Array>} 分类销售占比数据
 */
async function getCategorySalesRatio() {
    try {
        // 执行正确的 SQL 查询以获取分类销售额
        const [results] = await pool.query(`
            SELECT 
                COALESCE(c.category_name, '未分类') AS name, 
                COALESCE(SUM(sod.amount), 0) AS value 
            FROM 
                sales_order_detail sod
            JOIN 
                sku ON sod.product_id = sku.sku_id -- Link detail to SKU
            JOIN 
                spu ON sku.spu_id = spu.spu_id -- Link SKU to SPU
            LEFT JOIN 
                categories c ON spu.category_id = c.category_id -- Link SPU to category
            GROUP BY 
                COALESCE(c.category_name, '未分类')
            ORDER BY 
                value DESC
        `);

        // 如果没有数据，返回包含默认结构的空数组或带有特定消息的对象
        if (results.length === 0) {
            return [
                { name: '暂无分类销售数据', value: 0 }
            ];
            // return []; // 或者返回空数组
        }

        // 确保 value 是数字类型
        const formattedResults = results.map(item => ({
            name: item.name,
            value: parseFloat(item.value) || 0
        }));

        return formattedResults;

    } catch (error) {
        console.error('获取分类销售占比数据失败:', error);
        // 在出错时返回默认结构
        return [
            { name: '数据加载失败', value: 0 }
            // { name: '分类1', value: 0 },
            // { name: '分类2', value: 0 },
            // { name: '分类3', value: 0 }
        ];
    }
}

/**
 * 获取用户活跃度数据
 * @returns {Promise<Object>} 活跃度数据
 */
async function getUserActivity() {
    try {
        const dates = [];
        const counts = [];

        // 生成日期数组（从30天前到今天）
        for (let i = 29; i >= 0; i--) {
            dates.push(moment().subtract(i, 'days').format('YYYY-MM-DD'));
        }

        // 获取所有日期的活跃用户数据（只统计登录成功的用户）
        const [results] = await pool.query(`
            SELECT 
                DATE(login_time) AS date,
                COUNT(DISTINCT user_id) AS activeUsers
            FROM 
                user_login_log
            WHERE 
                login_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                AND login_status = 1
            GROUP BY 
                DATE(login_time)
            ORDER BY
                date ASC
        `);

        // 将查询结果转换为映射，方便查找
        const userMap = {};
        results.forEach(item => {
            userMap[item.date] = parseInt(item.activeUsers) || 0;
        });

        // 填充数据数组
        dates.forEach(date => {
            counts.push(userMap[date] || 0);
        });

        return { dates, counts };
    } catch (error) {
        console.error('获取用户活跃度数据失败:', error);
        // 返回默认数据
        const dates = [];
        const counts = [];
        
        // 确保默认数据也是从30天前到今天
        for (let i = 29; i >= 0; i--) {
            dates.push(moment().subtract(i, 'days').format('YYYY-MM-DD'));
            counts.push(0);
        }
        
        return { dates, counts };
    }
}

/**
 * 获取最近销售订单
 * @param {number} limit 数量限制
 * @returns {Promise<Array>} 销售订单数据
 */
async function getRecentSales(limit = 5) {
    try {
        // 查询最近的销售订单
        const [results] = await pool.query(`
            SELECT 
                id AS sales_no,
                product_name,
                customer,
                total_amount,
                sales_date,
                status
            FROM 
                sales_order
            ORDER BY 
                sales_date DESC
            LIMIT ?
        `, [limit]);

        if (results.length === 0) {
            return generateDefaultOrderData('sales', limit);
        }

        // 格式化日期
        results.forEach(order => {
            if (order.sales_date) {
                order.sales_date = moment(order.sales_date).format('YYYY-MM-DD');
            }
        });

        return results;
    } catch (error) {
        console.error('获取最近销售订单失败:', error);
        return generateDefaultOrderData('sales', limit);
    }
}

/**
 * 获取最近进货订单
 * @param {number} limit 数量限制
 * @returns {Promise<Array>} 进货订单数据
 */
async function getRecentPurchases(limit = 5) {
    try {
        // 查询最近的进货订单
        const [results] = await pool.query(`
            SELECT 
                id AS purchase_no,
                product_name,
                supplier,
                total_amount,
                purchase_date,
                status
            FROM 
                purchase_order
            ORDER BY 
                purchase_date DESC
            LIMIT ?
        `, [limit]);

        if (results.length === 0) {
            return generateDefaultOrderData('purchase', limit);
        }

        // 格式化日期
        results.forEach(order => {
            if (order.purchase_date) {
                order.purchase_date = moment(order.purchase_date).format('YYYY-MM-DD');
            }
        });

        return results;
    } catch (error) {
        console.error('获取最近进货订单失败:', error);
        return generateDefaultOrderData('purchase', limit);
    }
}

// 生成默认订单数据
function generateDefaultOrderData(type, limit) {
    const orders = [];
    const today = moment().format('YYYY-MM-DD');
    
    for (let i = 0; i < limit; i++) {
        if (type === 'sales') {
            orders.push({
                sales_no: `SO-${i + 1}`,
                product_name: '示例商品',
                customer: '示例客户',
                total_amount: 0,
                sales_date: today,
                status: 1
            });
        } else {
            orders.push({
                purchase_no: `PO-${i + 1}`,
                product_name: '示例商品',
                supplier: '示例供应商',
                total_amount: 0,
                purchase_date: today,
                status: 1
            });
        }
    }
    
    return orders;
}

module.exports = {
    getDashboardStats,
    getSalesTrend,
    getInventoryStats,
    getSalesRanking,
    getBrandSalesRatio,
    getCategorySalesRatio,
    getUserActivity,
    getRecentSales,
    getRecentPurchases
}; 