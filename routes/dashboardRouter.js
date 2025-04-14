const express = require('express');
const router = express.Router();
const dashboardService = require('../services/dashboardService');
const { verifyToken } = require('../config/jwt');

// 获取总体统计数据
router.get('/stats', async (req, res) => {
    try {
        const stats = await dashboardService.getDashboardStats();
        res.json({ code: 200, message: '获取成功', data: stats });
    } catch (error) {
        res.status(500).json({ code: 500, message: '获取失败', error: error.message });
    }
});

// 获取销售趋势数据
router.get('/sales/trend', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const data = await dashboardService.getSalesTrend(parseInt(days));
        res.json({ code: 200, message: '获取成功', data });
    } catch (error) {
        res.status(500).json({ code: 500, message: '获取失败', error: error.message });
    }
});

// 获取库存统计数据
router.get('/inventory/stats', async (req, res) => {
    try {
        const data = await dashboardService.getInventoryStats();
        res.json({ code: 200, message: '获取成功', data });
    } catch (error) {
        res.status(500).json({ code: 500, message: '获取失败', error: error.message });
    }
});

// 获取销量排名数据
router.get('/sales/ranking', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const data = await dashboardService.getSalesRanking(parseInt(limit));
        res.json({ code: 200, message: '获取成功', data });
    } catch (error) {
        res.status(500).json({ code: 500, message: '获取失败', error: error.message });
    }
});

// 获取品牌销售占比
router.get('/brand/sales', async (req, res) => {
    try {
        const data = await dashboardService.getBrandSalesRatio();
        res.json({ code: 200, message: '获取成功', data });
    } catch (error) {
        res.status(500).json({ code: 500, message: '获取失败', error: error.message });
    }
});

// 获取分类销售占比
router.get('/category/sales', async (req, res) => {
    try {
        const data = await dashboardService.getCategorySalesRatio();
        res.json({ code: 200, message: '获取成功', data });
    } catch (error) {
        res.status(500).json({ code: 500, message: '获取失败', error: error.message });
    }
});

// 获取用户活跃度数据
router.get('/user/activity', async (req, res) => {
    try {
        const data = await dashboardService.getUserActivity();
        res.json({ code: 200, message: '获取成功', data });
    } catch (error) {
        res.status(500).json({ code: 500, message: '获取失败', error: error.message });
    }
});

// 获取最近销售订单
router.get('/recent/sales', async (req, res) => {
    try {
        const { limit = 5 } = req.query;
        const data = await dashboardService.getRecentSales(parseInt(limit));
        res.json({ code: 200, message: '获取成功', data });
    } catch (error) {
        res.status(500).json({ code: 500, message: '获取失败', error: error.message });
    }
});

// 获取最近进货订单
router.get('/recent/purchases', async (req, res) => {
    try {
        const { limit = 5 } = req.query;
        const data = await dashboardService.getRecentPurchases(parseInt(limit));
        res.json({ code: 200, message: '获取成功', data });
    } catch (error) {
        res.status(500).json({ code: 500, message: '获取失败', error: error.message });
    }
});

module.exports = router; 