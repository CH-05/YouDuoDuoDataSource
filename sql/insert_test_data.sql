USE youduoduo_db;

-- 插入测试用户数据
INSERT INTO users (username, password, nickname, status, routes) VALUES
('test1', '$2b$10$PH0h4GSZoIXUc.1yWBJvyOXtC5K3QMxH8OgRZL.L6X5YMQfGTDgGe', '测试用户1', 1, '[{"id":0,"name":"首页","level":1,"select":true}]'),
('test2', '$2b$10$PH0h4GSZoIXUc.1yWBJvyOXtC5K3QMxH8OgRZL.L6X5YMQfGTDgGe', '测试用户2', 1, '[{"id":0,"name":"首页","level":1,"select":true}]'),
('test3', '$2b$10$PH0h4GSZoIXUc.1yWBJvyOXtC5K3QMxH8OgRZL.L6X5YMQfGTDgGe', '测试用户3', 1, '[{"id":0,"name":"首页","level":1,"select":true}]'),
('test4', '$2b$10$PH0h4GSZoIXUc.1yWBJvyOXtC5K3QMxH8OgRZL.L6X5YMQfGTDgGe', '测试用户4', 1, '[{"id":0,"name":"首页","level":1,"select":true}]'),
('test5', '$2b$10$PH0h4GSZoIXUc.1yWBJvyOXtC5K3QMxH8OgRZL.L6X5YMQfGTDgGe', '测试用户5', 1, '[{"id":0,"name":"首页","level":1,"select":true}]'),
('test6', '$2b$10$PH0h4GSZoIXUc.1yWBJvyOXtC5K3QMxH8OgRZL.L6X5YMQfGTDgGe', '测试用户6', 1, '[{"id":0,"name":"首页","level":1,"select":true}]'),
('test7', '$2b$10$PH0h4GSZoIXUc.1yWBJvyOXtC5K3QMxH8OgRZL.L6X5YMQfGTDgGe', '测试用户7', 1, '[{"id":0,"name":"首页","level":1,"select":true}]'),
('test8', '$2b$10$PH0h4GSZoIXUc.1yWBJvyOXtC5K3QMxH8OgRZL.L6X5YMQfGTDgGe', '测试用户8', 1, '[{"id":0,"name":"首页","level":1,"select":true}]'),
('test9', '$2b$10$PH0h4GSZoIXUc.1yWBJvyOXtC5K3QMxH8OgRZL.L6X5YMQfGTDgGe', '测试用户9', 1, '[{"id":0,"name":"首页","level":1,"select":true}]'),
('test10', '$2b$10$PH0h4GSZoIXUc.1yWBJvyOXtC5K3QMxH8OgRZL.L6X5YMQfGTDgGe', '测试用户10', 1, '[{"id":0,"name":"首页","level":1,"select":true}]');

-- 为测试用户分配角色
INSERT INTO user_role (user_id, role_id) 
SELECT u.user_id, FLOOR(1 + RAND() * 5) 
FROM users u 
WHERE u.username LIKE 'test%';

-- 插入测试分类数据
INSERT INTO categories (category_name, parent_id, level, sort_order) VALUES
('五谷杂粮', NULL, 1, 4),
('食用油', NULL, 1, 5),
('调味品', NULL, 1, 6),
('小麦', 1, 2, 3),
('玉米', 1, 2, 4),
('花生油', 2, 2, 2),
('菜籽油', 2, 2, 3),
('酱油', 3, 2, 2),
('醋', 3, 2, 3),
('料酒', 3, 2, 4);

-- 插入测试SPU数据
INSERT INTO spu (spu_name, description, category_id, product_id) VALUES
('金龙鱼小麦粉', '优质小麦制作，适合面食', 4, 1),
('福临门玉米粒', '新鲜玉米制作，口感好', 5, 2),
('鲁花花生油', '物理压榨，更健康', 6, 3),
('海天生抽', '特级生抽，味道鲜美', 8, 4),
('李锦记老抽', '上等老抽，色泽好', 8, 5),
('太太乐鸡精', '鲜味调味料，提鲜增香', 8, 6),
('老干妈辣椒酱', '贵州特产，开胃下饭', 8, 7),
('王致和腐乳', '传统工艺，口感醇厚', 8, 8),
('六必居醋', '传统酿造，醇香可口', 9, 9),
('恒顺香醋', '镇江香醋，香醇可口', 9, 10);

-- 插入SPU图片数据
INSERT INTO spu_image (spu_id, image_url, image_name) VALUES
(1, '/public/uploads/spu/xiaomaifen1.jpg', '小麦粉图片1'),
(1, '/public/uploads/spu/xiaomaifen2.jpg', '小麦粉图片2'),
(2, '/public/uploads/spu/yumili1.jpg', '玉米粒图片1'),
(3, '/public/uploads/spu/huashengyou1.jpg', '花生油图片1'),
(4, '/public/uploads/spu/shengchou1.jpg', '生抽图片1'),
(5, '/public/uploads/spu/laochou1.jpg', '老抽图片1'),
(6, '/public/uploads/spu/jijing1.jpg', '鸡精图片1'),
(7, '/public/uploads/spu/lajiao1.jpg', '辣椒酱图片1'),
(8, '/public/uploads/spu/furu1.jpg', '腐乳图片1'),
(9, '/public/uploads/spu/cu1.jpg', '醋图片1');

-- 插入SPU销售属性数据
INSERT INTO spu_sale_attr (spu_id, attr_name) VALUES
(1, '规格'),
(1, '包装'),
(2, '规格'),
(3, '容量'),
(4, '容量'),
(5, '容量'),
(6, '规格'),
(7, '规格'),
(8, '规格'),
(9, '容量');

-- 插入SPU销售属性值数据
INSERT INTO spu_sale_attr_value (attr_id, value_name) VALUES
(1, '1kg'),
(1, '5kg'),
(1, '10kg'),
(2, '袋装'),
(2, '盒装'),
(3, '500g'),
(3, '1kg'),
(4, '1.8L'),
(4, '5L'),
(5, '500ml');

-- 插入SKU数据
INSERT INTO sku (spu_id, sku_name, sku_desc, price, weight, stock, product_id) VALUES
(1, '金龙鱼小麦粉1kg装', '日常家用装', 15.99, 1.00, 1000, 1),
(1, '金龙鱼小麦粉5kg装', '家庭实惠装', 69.99, 5.00, 500, 1),
(2, '福临门玉米粒500g装', '新鲜玉米粒', 9.99, 0.50, 800, 2),
(3, '鲁花花生油1.8L装', '家用装', 59.99, 1.80, 600, 3),
(4, '海天生抽500ml装', '日常装', 12.99, 0.50, 1000, 4),
(5, '李锦记老抽500ml装', '日常装', 13.99, 0.50, 800, 5),
(6, '太太乐鸡精100g装', '小包装', 5.99, 0.10, 2000, 6),
(7, '老干妈辣椒酱280g装', '经典装', 8.99, 0.28, 1500, 7),
(8, '王致和腐乳300g装', '传统装', 11.99, 0.30, 1000, 8),
(9, '六必居醋500ml装', '传统装', 9.99, 0.50, 1200, 9);

-- 插入SKU图片数据
INSERT INTO sku_image (sku_id, img_name, img_url, is_default) VALUES
(1, '小麦粉1kg图片', '/public/uploads/sku/xiaomaifen_1kg.jpg', 1),
(2, '小麦粉5kg图片', '/public/uploads/sku/xiaomaifen_5kg.jpg', 1),
(3, '玉米粒图片', '/public/uploads/sku/yumili_500g.jpg', 1),
(4, '花生油图片', '/public/uploads/sku/huashengyou_1.8l.jpg', 1),
(5, '生抽图片', '/public/uploads/sku/shengchou_500ml.jpg', 1),
(6, '老抽图片', '/public/uploads/sku/laochou_500ml.jpg', 1),
(7, '鸡精图片', '/public/uploads/sku/jijing_100g.jpg', 1),
(8, '辣椒酱图片', '/public/uploads/sku/lajiao_280g.jpg', 1),
(9, '腐乳图片', '/public/uploads/sku/furu_300g.jpg', 1),
(10, '醋图片', '/public/uploads/sku/cu_500ml.jpg', 1);

-- 插入SKU销售属性关联数据
INSERT INTO sku_attr_value (sku_id, spu_sale_attr_id, spu_sale_attr_value_id) VALUES
(1, 1, 1), -- 小麦粉1kg
(2, 1, 2), -- 小麦粉5kg
(3, 3, 6), -- 玉米粒500g
(4, 4, 8), -- 花生油1.8L
(5, 5, 10), -- 生抽500ml
(6, 5, 10), -- 老抽500ml
(7, 6, 1), -- 鸡精100g
(8, 7, 1), -- 辣椒酱280g
(9, 8, 1), -- 腐乳300g
(10, 9, 10); -- 醋500ml 