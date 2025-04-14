const express = require('express');
const router = express.Router();
const grainOilService = require('../services/grainOilService');

// 进货管理路由
router.get('/purchase', grainOilService.getPurchaseList);
router.post('/purchase', grainOilService.addPurchase);
router.get('/purchase/:id', grainOilService.getPurchaseDetail);
router.put('/purchase/:id', grainOilService.updatePurchase);
router.delete('/purchase/:id', grainOilService.deletePurchase);
router.put('/purchase/:id/status', grainOilService.updatePurchaseStatus);

// 销售管理路由
router.get('/sales', grainOilService.getSalesList);
router.post('/sales', grainOilService.addSales);
router.get('/sales/:id', grainOilService.getSalesDetail);
router.put('/sales/:id', grainOilService.updateSales);
router.delete('/sales/:id', grainOilService.deleteSales);
router.put('/sales/:id/status', grainOilService.updateSalesStatus);

// 库存管理路由
router.get('/inventory/records', grainOilService.getInventoryRecords);
router.get('/inventory', grainOilService.getInventoryList);
router.get('/inventory/:id', grainOilService.getInventoryDetail);
router.put('/inventory/:id', grainOilService.updateInventory);

module.exports = router; 