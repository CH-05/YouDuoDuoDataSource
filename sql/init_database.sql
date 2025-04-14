-- 创建数据库
DROP DATABASE IF EXISTS youduoduo_db;
CREATE DATABASE youduoduo_db;
USE youduoduo_db;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password VARCHAR(255) NOT NULL COMMENT '密码',
    nickname VARCHAR(50) DEFAULT NULL COMMENT '昵称',
    avatar VARCHAR(255) DEFAULT 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png' COMMENT '头像',
    email VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
    phone VARCHAR(20) DEFAULT NULL COMMENT '手机号',
    status TINYINT(1) DEFAULT 1 COMMENT '状态：0-禁用 1-启用',
    routes TEXT COMMENT '路由权限',
    last_login DATETIME DEFAULT NULL COMMENT '最后登录时间',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 创建角色表
CREATE TABLE IF NOT EXISTS roles (
    role_id INT PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(50) NOT NULL UNIQUE COMMENT '角色名称',
    role_code VARCHAR(50) NOT NULL UNIQUE COMMENT '角色编码',
    description VARCHAR(200) DEFAULT NULL COMMENT '角色描述',
    status TINYINT(1) DEFAULT 1 COMMENT '状态：0-禁用 1-启用',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表';

-- 创建用户角色关联表
CREATE TABLE IF NOT EXISTS user_role (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT '用户ID',
    role_id INT NOT NULL COMMENT '角色ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
    UNIQUE KEY `uk_user_role` (user_id, role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户角色关联表';

-- 创建商品分类表
CREATE TABLE IF NOT EXISTS categories (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(50) NOT NULL COMMENT '分类名称',
    parent_id INT DEFAULT NULL COMMENT '父分类ID',
    level INT NOT NULL COMMENT '层级',
    sort_order INT DEFAULT 0 COMMENT '排序',
    status TINYINT(1) DEFAULT 1 COMMENT '状态：0-禁用 1-启用',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(category_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品分类表';

-- 创建品牌表
CREATE TABLE IF NOT EXISTS trademarks (
    product_id INT PRIMARY KEY AUTO_INCREMENT,
    tmName VARCHAR(100) NOT NULL COMMENT '品牌名称',
    logoUrl VARCHAR(255) DEFAULT NULL COMMENT '品牌Logo',
    status TINYINT(1) DEFAULT 1 COMMENT '状态：0-禁用 1-启用',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='品牌表';

-- 插入品牌测试数据
INSERT INTO trademarks (tmName, logoUrl, status) VALUES 
('金龙鱼', '/public/uploads/logo/jinlongyu.png', 1),
('福临门', '/public/uploads/logo/fulinmen.png', 1),
('鲁花', '/public/uploads/logo/luhua.png', 1),
('海天', '/public/uploads/logo/haitian.png', 1),
('李锦记', '/public/uploads/logo/lijinji.png', 1),
('太太乐', '/public/uploads/logo/taitaile.png', 1),
('老干妈', '/public/uploads/logo/laoganma.png', 1),
('王致和', '/public/uploads/logo/wangzhihe.png', 1),
('六必居', '/public/uploads/logo/liubiju.png', 1),
('恒顺', '/public/uploads/logo/hengshun.png', 1);

-- 创建品牌属性关联表       
CREATE TABLE IF NOT EXISTS `product_attr` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL COMMENT '品牌ID',
  `attr_id` INT NOT NULL COMMENT '属性ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY `unique_product_attr` (`product_id`, `attr_id`) COMMENT '确保同一个品牌不会重复关联同一个属性',
  INDEX `idx_product_id` (`product_id`),
  INDEX `idx_attr_id` (`attr_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='品牌属性关联表'; 

-- 创建属性表
CREATE TABLE IF NOT EXISTS attributes (
    attr_id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT NOT NULL,
    attr_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- 创建属性值表
CREATE TABLE IF NOT EXISTS attr_values (
    value_id INT PRIMARY KEY AUTO_INCREMENT,
    attr_id INT NOT NULL,
    value_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attr_id) REFERENCES attributes(attr_id)
);

-- 创建菜单表
CREATE TABLE IF NOT EXISTS `menus` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `parent_id` INT DEFAULT 0,
    `name` VARCHAR(50) NOT NULL COMMENT '菜单名称',
    `label` VARCHAR(50) NOT NULL COMMENT '菜单标识',
    `level` INT NOT NULL DEFAULT 1 COMMENT '菜单级别',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_name` (`name`),
    UNIQUE KEY `uk_label` (`label`),
    KEY `idx_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='菜单表';

-- 插入初始菜单数据
INSERT INTO `menus` (`parent_id`, `name`, `label`, `level`, `status`) VALUES
(0, '权限管理', 'Acl', 1, 1),
(1, '用户管理', 'User', 2, 1),
(1, '角色管理', 'Role', 2, 1),
(1, '菜单管理', 'Permission', 2, 1),
(0, '商品管理', 'Product', 1, 1),
(5, '品牌管理', 'Trademark', 2, 1),
(5, '属性管理', 'Attr', 2, 1),
(5, 'SPU管理', 'Spu', 2, 1),
(5, 'SKU管理', 'Sku', 2, 1),
(5, '进货管理', 'Purchase', 2, 1),
(5, '销售管理', 'Sales', 2, 1);

-- 修改菜单表中的数据
UPDATE `menus` SET parent_id = 5 WHERE name = '进货管理';

-- 插入初始角色数据
INSERT INTO roles (role_name, role_code, description) VALUES 
('超级管理员', 'SUPER_ADMIN', '系统超级管理员'),
('管理员', 'ADMIN', '系统管理员'),
('销售员', 'SALES', '销售人员'),
('采购员', 'PURCHASE', '采购人员'),
('仓管员', 'STOCK', '仓库管理人员');

-- 插入初始管理员用户（密码：123456）
INSERT INTO users (username, password, nickname, status, routes) VALUES 
('admin', '$2b$10$.Cc./EdWbqhvHasIuvgb0OFpzM2g9l7e16T11EKkt/oWw9Miart6i', '系统管理员', 1, '[{
                    "id": 0,
                    "name": "权限列表",
                    "level": 1,
                    "children": [{
                        "id": 1,
                        "name": "权限管理",
                        "label": "Acl",
                        "level": 2,
                        "children": [{
                            "id": 3,
                            "name": "用户管理",
                            "label": "User",
                            "level": 3,
                            "select": true
                        }, {"id": 4, "name": "角色管理", "label": "Role", "level": 3, "select": true}, {
                            "id": 5,
                            "name": "菜单管理",
                            "label": "Permission",
                            "level": 3,
                            "select": true
                        }],
                        "select": true
                    }, {
                        "id": 2,
                        "name": "粮油管理",
                        "label": "Product",
                        "level": 2,
                        "children": [{
                            "id": 6,
                            "name": "品牌管理",
                            "label": "Trademark",
                            "level": 3,
                            "select": true
                        }, {"id": 7, "name": "属性管理", "label": "Attr", "level": 3, "select": true}, {
                            "id": 8,
                            "name": "SPU管理",
                            "label": "Spu",
                            "level": 3,
                            "select": true
                        }, {"id": 9, "name": "SKU管理", "label": "Sku", "level": 3, "select": true}, {
                            "id": 10,
                            "name": "进货管理",
                            "label": "Purchase",
                            "level": 3,
                            "select": true
                        }, {
                            "id": 11,
                            "name": "销售管理",
                            "label": "Sales",
                            "level": 3,
                            "select": true
                        }],
                        "select": true
                    }],
                    "select": true
                }]');

-- 添加更多用户数据
INSERT INTO users (username, password, nickname, email, phone, status) VALUES 
('zhangsan', '$2b$10$.Cc./EdWbqhvHasIuvgb0OFpzM2g9l7e16T11EKkt/oWw9Miart6i', '张三', 'zhangsan@example.com', '13800138001', 1),
('lisi', '$2b$10$.Cc./EdWbqhvHasIuvgb0OFpzM2g9l7e16T11EKkt/oWw9Miart6i', '李四', 'lisi@example.com', '13800138002', 1),
('wangwu', '$2b$10$.Cc./EdWbqhvHasIuvgb0OFpzM2g9l7e16T11EKkt/oWw9Miart6i', '王五', 'wangwu@example.com', '13800138003', 1),
('zhaoliu', '$2b$10$.Cc./EdWbqhvHasIuvgb0OFpzM2g9l7e16T11EKkt/oWw9Miart6i', '赵六', 'zhaoliu@example.com', '13800138004', 1),
('qianqi', '$2b$10$.Cc./EdWbqhvHasIuvgb0OFpzM2g9l7e16T11EKkt/oWw9Miart6i', '钱七', 'qianqi@example.com', '13800138005', 1),
('sunba', '$2b$10$.Cc./EdWbqhvHasIuvgb0OFpzM2g9l7e16T11EKkt/oWw9Miart6i', '孙八', 'sunba@example.com', '13800138006', 1),
('zhoujiu', '$2b$10$.Cc./EdWbqhvHasIuvgb0OFpzM2g9l7e16T11EKkt/oWw9Miart6i', '周九', 'zhoujiu@example.com', '13800138007', 1),
('wushi', '$2b$10$.Cc./EdWbqhvHasIuvgb0OFpzM2g9l7e16T11EKkt/oWw9Miart6i', '吴十', 'wushi@example.com', '13800138008', 1),
('zhengshiyi', '$2b$10$.Cc./EdWbqhvHasIuvgb0OFpzM2g9l7e16T11EKkt/oWw9Miart6i', '郑十一', 'zhengshiyi@example.com', '13800138009', 1),
('fengshier', '$2b$10$.Cc./EdWbqhvHasIuvgb0OFpzM2g9l7e16T11EKkt/oWw9Miart6i', '冯十二', 'fengshier@example.com', '13800138010', 1);

-- 关联管理员用户和超级管理员角色
INSERT INTO user_role (user_id, role_id) VALUES (1, 1);

-- 为用户分配角色
INSERT INTO user_role (user_id, role_id) VALUES 
(2, 2), -- 张三 - 管理员
(3, 3), -- 李四 - 销售员
(4, 4), -- 王五 - 采购员
(5, 5), -- 赵六 - 仓管员
(6, 3), -- 钱七 - 销售员
(7, 4), -- 孙八 - 采购员
(8, 5), -- 周九 - 仓管员
(9, 3), -- 吴十 - 销售员
(10, 4), -- 郑十一 - 采购员
(11, 5); -- 冯十二 - 仓管员

-- 插入初始商品分类数据
INSERT INTO categories (category_name, parent_id, level, sort_order) VALUES 
('粮食', NULL, 1, 1),
('油类', NULL, 1, 2),
('调味品', NULL, 1, 3),
('大米', 1, 2, 1),
('面粉', 1, 2, 2),
('食用油', 2, 2, 1),
('调味料', 3, 2, 1);

-- 添加更多商品分类数据
INSERT INTO categories (category_name, parent_id, level, sort_order) VALUES 
('杂粮', 1, 2, 3),
('面条', 1, 2, 4),
('花生油', 6, 3, 1),
('大豆油', 6, 3, 2),
('菜籽油', 6, 3, 3),
('酱油', 7, 3, 1),
('醋', 7, 3, 2),
('酱料', 7, 3, 3),
('味精', 7, 3, 4),
('鸡精', 7, 3, 5);

-- 创建SPU表
CREATE TABLE IF NOT EXISTS spu (
    spu_id INT PRIMARY KEY AUTO_INCREMENT,
    spu_name VARCHAR(100) NOT NULL COMMENT 'SPU名称',
    description TEXT COMMENT '描述',
    category_id INT NOT NULL COMMENT '分类ID',
    product_id INT NOT NULL COMMENT '品牌ID',
    status TINYINT(1) DEFAULT 1 COMMENT '状态：0-下架 1-上架',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    FOREIGN KEY (product_id) REFERENCES trademarks(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SPU表';

-- 插入SPU数据
INSERT INTO spu (spu_name, description, category_id, product_id, status) VALUES 
('金龙鱼大米', '优质东北大米', 4, 1, 1),
('福临门面粉', '优质小麦面粉', 5, 2, 1),
('鲁花花生油', '5S压榨一级花生油', 9, 3, 1),
('海天酱油', '特级金标生抽', 12, 4, 1),
('李锦记蚝油', '特级蚝油', 14, 5, 1),
('太太乐鸡精', '特级鸡精', 16, 6, 1),
('老干妈辣酱', '风味豆豉油制辣椒', 14, 7, 1),
('王致和腐乳', '红方腐乳', 14, 8, 1),
('六必居酱菜', '八宝菜', 14, 9, 1),
('恒顺醋', '镇江香醋', 13, 10, 1),
('金龙鱼大豆油', '一级大豆油', 10, 1, 1),
('福临门菜籽油', '一级菜籽油', 11, 2, 1),
('鲁花面条', '鸡蛋挂面', 8, 3, 1),
('海天味精', '特级味精', 15, 4, 1),
('李锦记酱油', '特级生抽', 12, 5, 1);

-- 创建SPU图片表
CREATE TABLE IF NOT EXISTS spu_image (
    image_id INT PRIMARY KEY AUTO_INCREMENT,
    spu_id INT NOT NULL COMMENT 'SPU ID',
    image_url VARCHAR(255) NOT NULL COMMENT '图片URL',
    image_name VARCHAR(100) COMMENT '图片名称',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (spu_id) REFERENCES spu(spu_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SPU图片表';

-- 插入SPU图片数据
INSERT INTO spu_image (spu_id, image_url, image_name) VALUES 
(1, '/public/uploads/spu/jinlongyu_rice_1.jpg', '金龙鱼大米主图'),
(1, '/public/uploads/spu/jinlongyu_rice_2.jpg', '金龙鱼大米详情图'),
(2, '/public/uploads/spu/fulinmen_flour_1.jpg', '福临门面粉主图'),
(2, '/public/uploads/spu/fulinmen_flour_2.jpg', '福临门面粉详情图'),
(3, '/public/uploads/spu/luhua_oil_1.jpg', '鲁花花生油主图'),
(3, '/public/uploads/spu/luhua_oil_2.jpg', '鲁花花生油详情图'),
(4, '/public/uploads/spu/haitian_soy_1.jpg', '海天酱油主图'),
(4, '/public/uploads/spu/haitian_soy_2.jpg', '海天酱油详情图'),
(5, '/public/uploads/spu/lijinji_oyster_1.jpg', '李锦记蚝油主图'),
(5, '/public/uploads/spu/lijinji_oyster_2.jpg', '李锦记蚝油详情图'),
(6, '/public/uploads/spu/taitaile_chicken_1.jpg', '太太乐鸡精主图'),
(6, '/public/uploads/spu/taitaile_chicken_2.jpg', '太太乐鸡精详情图'),
(7, '/public/uploads/spu/laoganma_chili_1.jpg', '老干妈辣酱主图'),
(7, '/public/uploads/spu/laoganma_chili_2.jpg', '老干妈辣酱详情图'),
(8, '/public/uploads/spu/wangzhihe_fermented_1.jpg', '王致和腐乳主图'),
(8, '/public/uploads/spu/wangzhihe_fermented_2.jpg', '王致和腐乳详情图'),
(9, '/public/uploads/spu/liubiju_pickles_1.jpg', '六必居酱菜主图'),
(9, '/public/uploads/spu/liubiju_pickles_2.jpg', '六必居酱菜详情图'),
(10, '/public/uploads/spu/hengshun_vinegar_1.jpg', '恒顺醋主图'),
(10, '/public/uploads/spu/hengshun_vinegar_2.jpg', '恒顺醋详情图');

-- 创建SPU销售属性表
CREATE TABLE IF NOT EXISTS spu_sale_attr (
    attr_id INT PRIMARY KEY AUTO_INCREMENT,
    spu_id INT NOT NULL COMMENT 'SPU ID',
    attr_name VARCHAR(50) NOT NULL COMMENT '销售属性名称',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (spu_id) REFERENCES spu(spu_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SPU销售属性表';

-- 插入SPU销售属性数据
INSERT INTO spu_sale_attr (spu_id, attr_name) VALUES 
(1, '规格'),
(1, '包装'),
(2, '规格'),
(2, '包装'),
(3, '规格'),
(3, '包装'),
(4, '规格'),
(4, '包装'),
(5, '规格'),
(5, '包装'),
(6, '规格'),
(6, '包装'),
(7, '规格'),
(7, '包装'),
(8, '规格'),
(8, '包装'),
(9, '规格'),
(9, '包装'),
(10, '规格'),
(10, '包装');

-- 创建SPU销售属性值表
CREATE TABLE IF NOT EXISTS spu_sale_attr_value (
    value_id INT PRIMARY KEY AUTO_INCREMENT,
    attr_id INT NOT NULL COMMENT '属性ID',
    value_name VARCHAR(50) NOT NULL COMMENT '属性值名称',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attr_id) REFERENCES spu_sale_attr(attr_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SPU销售属性值表';

-- 插入SPU销售属性值数据
INSERT INTO spu_sale_attr_value (attr_id, value_name) VALUES 
(1, '5kg'),
(1, '10kg'),
(2, '袋装'),
(2, '盒装'),
(3, '2kg'),
(3, '5kg'),
(4, '袋装'),
(4, '盒装'),
(5, '1.8L'),
(5, '5L'),
(6, '瓶装'),
(6, '桶装'),
(7, '500ml'),
(7, '1L'),
(8, '瓶装'),
(8, '袋装'),
(9, '500g'),
(9, '1kg'),
(10, '瓶装'),
(10, '袋装'),
(11, '100g'),
(11, '200g'),
(12, '袋装'),
(12, '盒装'),
(13, '280g'),
(13, '500g'),
(14, '瓶装'),
(14, '袋装'),
(15, '300g'),
(15, '500g'),
(16, '瓶装'),
(16, '盒装'),
(17, '500g'),
(17, '1kg'),
(18, '袋装'),
(18, '盒装'),
(19, '500ml'),
(19, '1L'),
(20, '瓶装'),
(20, '桶装');

-- 创建SKU表
CREATE TABLE IF NOT EXISTS sku (
    sku_id INT PRIMARY KEY AUTO_INCREMENT,
    spu_id INT NOT NULL COMMENT 'SPU ID',
    sku_name VARCHAR(100) NOT NULL COMMENT 'SKU名称',
    sku_desc TEXT COMMENT 'SKU描述',
    price DECIMAL(10,2) NOT NULL COMMENT '价格',
    weight DECIMAL(10,2) NOT NULL COMMENT '重量(kg)',
    stock INT NOT NULL DEFAULT 0 COMMENT '库存',
    product_id INT NOT NULL COMMENT '品牌ID',
    status TINYINT(1) DEFAULT 1 COMMENT '状态：0-下架 1-上架',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (spu_id) REFERENCES spu(spu_id),
    FOREIGN KEY (product_id) REFERENCES trademarks(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SKU表';

-- 插入SKU数据
INSERT INTO sku (spu_id, sku_name, sku_desc, price, weight, stock, product_id, status) VALUES 
(1, '金龙鱼大米5kg袋装', '优质东北大米5kg袋装', 59.90, 5.0, 100, 1, 1),
(1, '金龙鱼大米10kg袋装', '优质东北大米10kg袋装', 109.90, 10.0, 50, 1, 1),
(2, '福临门面粉2kg袋装', '优质小麦面粉2kg袋装', 29.90, 2.0, 200, 2, 1),
(2, '福临门面粉5kg袋装', '优质小麦面粉5kg袋装', 69.90, 5.0, 100, 2, 1),
(3, '鲁花花生油1.8L瓶装', '5S压榨一级花生油1.8L瓶装', 89.90, 1.8, 150, 3, 1),
(3, '鲁花花生油5L桶装', '5S压榨一级花生油5L桶装', 229.90, 5.0, 80, 3, 1),
(4, '海天酱油500ml瓶装', '特级金标生抽500ml瓶装', 19.90, 0.5, 300, 4, 1),
(4, '海天酱油1L瓶装', '特级金标生抽1L瓶装', 35.90, 1.0, 200, 4, 1),
(5, '李锦记蚝油500g瓶装', '特级蚝油500g瓶装', 29.90, 0.5, 250, 5, 1),
(5, '李锦记蚝油1kg瓶装', '特级蚝油1kg瓶装', 55.90, 1.0, 150, 5, 1),
(6, '太太乐鸡精100g袋装', '特级鸡精100g袋装', 9.90, 0.1, 400, 6, 1),
(6, '太太乐鸡精200g袋装', '特级鸡精200g袋装', 18.90, 0.2, 300, 6, 1),
(7, '老干妈辣酱280g瓶装', '风味豆豉油制辣椒280g瓶装', 15.90, 0.28, 350, 7, 1),
(7, '老干妈辣酱500g瓶装', '风味豆豉油制辣椒500g瓶装', 28.90, 0.5, 200, 7, 1),
(8, '王致和腐乳300g瓶装', '红方腐乳300g瓶装', 12.90, 0.3, 300, 8, 1),
(8, '王致和腐乳500g瓶装', '红方腐乳500g瓶装', 22.90, 0.5, 200, 8, 1),
(9, '六必居酱菜500g袋装', '八宝菜500g袋装', 19.90, 0.5, 250, 9, 1),
(9, '六必居酱菜1kg袋装', '八宝菜1kg袋装', 35.90, 1.0, 150, 9, 1),
(10, '恒顺醋500ml瓶装', '镇江香醋500ml瓶装', 12.90, 0.5, 300, 10, 1),
(10, '恒顺醋1L桶装', '镇江香醋1L桶装', 22.90, 1.0, 200, 10, 1);

-- 创建SKU图片表
CREATE TABLE IF NOT EXISTS sku_image (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sku_id INT NOT NULL COMMENT 'SKU ID',
    img_name VARCHAR(100) NOT NULL COMMENT '图片名称',
    img_url VARCHAR(255) NOT NULL COMMENT '图片URL',
    is_default TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否默认图片',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sku_id) REFERENCES sku(sku_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SKU图片表';

-- 插入SKU图片数据
INSERT INTO sku_image (sku_id, img_name, img_url, is_default) VALUES 
(1, '金龙鱼大米5kg主图', '/public/uploads/sku/jinlongyu_rice_5kg_1.jpg', 1),
(1, '金龙鱼大米5kg详情图', '/public/uploads/sku/jinlongyu_rice_5kg_2.jpg', 0),
(2, '金龙鱼大米10kg主图', '/public/uploads/sku/jinlongyu_rice_10kg_1.jpg', 1),
(2, '金龙鱼大米10kg详情图', '/public/uploads/sku/jinlongyu_rice_10kg_2.jpg', 0),
(3, '福临门面粉2kg主图', '/public/uploads/sku/fulinmen_flour_2kg_1.jpg', 1),
(3, '福临门面粉2kg详情图', '/public/uploads/sku/fulinmen_flour_2kg_2.jpg', 0),
(4, '福临门面粉5kg主图', '/public/uploads/sku/fulinmen_flour_5kg_1.jpg', 1),
(4, '福临门面粉5kg详情图', '/public/uploads/sku/fulinmen_flour_5kg_2.jpg', 0),
(5, '鲁花花生油1.8L主图', '/public/uploads/sku/luhua_oil_1.8l_1.jpg', 1),
(5, '鲁花花生油1.8L详情图', '/public/uploads/sku/luhua_oil_1.8l_2.jpg', 0),
(6, '鲁花花生油5L主图', '/public/uploads/sku/luhua_oil_5l_1.jpg', 1),
(6, '鲁花花生油5L详情图', '/public/uploads/sku/luhua_oil_5l_2.jpg', 0),
(7, '海天酱油500ml主图', '/public/uploads/sku/haitian_soy_500ml_1.jpg', 1),
(7, '海天酱油500ml详情图', '/public/uploads/sku/haitian_soy_500ml_2.jpg', 0),
(8, '海天酱油1L主图', '/public/uploads/sku/haitian_soy_1l_1.jpg', 1),
(8, '海天酱油1L详情图', '/public/uploads/sku/haitian_soy_1l_2.jpg', 0),
(9, '李锦记蚝油500g主图', '/public/uploads/sku/lijinji_oyster_500g_1.jpg', 1),
(9, '李锦记蚝油500g详情图', '/public/uploads/sku/lijinji_oyster_500g_2.jpg', 0),
(10, '李锦记蚝油1kg主图', '/public/uploads/sku/lijinji_oyster_1kg_1.jpg', 1),
(10, '李锦记蚝油1kg详情图', '/public/uploads/sku/lijinji_oyster_1kg_2.jpg', 0);

-- 创建SKU销售属性关联表
CREATE TABLE IF NOT EXISTS sku_attr_value (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sku_id INT NOT NULL COMMENT 'SKU ID',
    spu_sale_attr_id INT NOT NULL COMMENT 'SPU销售属性ID',
    spu_sale_attr_value_id INT NOT NULL COMMENT 'SPU销售属性值ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sku_id) REFERENCES sku(sku_id) ON DELETE CASCADE,
    FOREIGN KEY (spu_sale_attr_id) REFERENCES spu_sale_attr(attr_id),
    FOREIGN KEY (spu_sale_attr_value_id) REFERENCES spu_sale_attr_value(value_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SKU销售属性关联表';

-- 插入SKU销售属性关联数据
INSERT INTO sku_attr_value (sku_id, spu_sale_attr_id, spu_sale_attr_value_id) VALUES 
(1, 1, 1),
(1, 2, 3),
(2, 1, 2),
(2, 2, 4),
(3, 1, 5),
(3, 2, 7),
(4, 1, 8),
(4, 2, 9),
(5, 1, 10),
(5, 2, 11),
(6, 1, 12),
(6, 2, 13),
(7, 1, 14),
(7, 2, 15),
(8, 1, 16),
(8, 2, 17),
(9, 1, 18),
(9, 2, 19),
(10, 1, 20),
(10, 2, 21);

-- 创建进货单表
CREATE TABLE IF NOT EXISTS purchase_order (
    id INT PRIMARY KEY AUTO_INCREMENT,
    purchase_no VARCHAR(50) NOT NULL COMMENT '进货单号',
    product_name VARCHAR(100) NOT NULL COMMENT '商品名称(主商品或概览)',
    quantity DECIMAL(10,2) NOT NULL COMMENT '总数量(汇总)',
    unit VARCHAR(20) NOT NULL COMMENT '主单位',
    price DECIMAL(10,2) NOT NULL COMMENT '平均单价(参考)',
    total_amount DECIMAL(10,2) NOT NULL COMMENT '总金额',
    supplier VARCHAR(100) NOT NULL COMMENT '供应商',
    purchase_date DATE NOT NULL COMMENT '进货日期',
    status TINYINT(1) DEFAULT 0 COMMENT '状态:0-待入库,1-已入库',
    created_by INT NOT NULL COMMENT '创建人ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='进货单表';

-- 创建进货单明细表
CREATE TABLE IF NOT EXISTS purchase_order_detail (
    id INT PRIMARY KEY AUTO_INCREMENT,
    purchase_id INT NOT NULL COMMENT '进货单ID',
    product_id INT NOT NULL COMMENT '实际应为sku_id, 受限于FK指向trademarks',
    sku_name VARCHAR(100) DEFAULT NULL COMMENT '商品SKU名称',
    quantity DECIMAL(10,2) NOT NULL COMMENT '数量',
    unit VARCHAR(20) NOT NULL COMMENT '单位',
    price DECIMAL(10,2) NOT NULL COMMENT '单价',
    amount DECIMAL(10,2) NOT NULL COMMENT '金额',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_id) REFERENCES purchase_order(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES trademarks(product_id) -- 设计约束, 实际应关联sku
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='进货单明细表';

-- 创建销售单表
CREATE TABLE IF NOT EXISTS sales_order (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sales_no VARCHAR(50) NOT NULL COMMENT '销售单号',
    product_name VARCHAR(100) NOT NULL COMMENT '商品名称(主商品或概览)',
    quantity DECIMAL(10,2) NOT NULL COMMENT '总数量(汇总)',
    unit VARCHAR(20) NOT NULL COMMENT '主单位',
    price DECIMAL(10,2) NOT NULL COMMENT '平均销售单价(参考)',
    total_amount DECIMAL(10,2) NOT NULL COMMENT '总金额',
    customer VARCHAR(100) NOT NULL COMMENT '客户名称',
    sales_date DATE NOT NULL COMMENT '销售日期',
    status TINYINT(1) DEFAULT 0 COMMENT '状态:0-待出库,1-已出库',
    created_by INT NOT NULL COMMENT '创建人ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售单表';

-- 创建销售单明细表
CREATE TABLE IF NOT EXISTS sales_order_detail (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sales_id INT NOT NULL COMMENT '销售单ID',
    inventory_id INT NOT NULL COMMENT '库存ID',
    product_id INT DEFAULT NULL COMMENT '商品ID (sku_id)',
    sku_name VARCHAR(100) DEFAULT NULL COMMENT '商品SKU名称',
    quantity DECIMAL(10,2) NOT NULL COMMENT '数量',
    unit VARCHAR(20) DEFAULT '千克' COMMENT '单位',
    price DECIMAL(10,2) NOT NULL COMMENT '销售单价',
    amount DECIMAL(10,2) NOT NULL COMMENT '金额',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_sales_id (sales_id),
    KEY idx_inventory_id (inventory_id),
    KEY idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售单明细表';

-- 创建库存表
CREATE TABLE IF NOT EXISTS inventory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL COMMENT '商品SKU ID',
    product_name VARCHAR(100) NOT NULL COMMENT '商品名称 (SKU Name)',
    sku_spec VARCHAR(50) DEFAULT NULL COMMENT '规格',
    tm_id INT NOT NULL COMMENT '品牌ID',
    tm_name VARCHAR(50) DEFAULT NULL COMMENT '品牌名称',
    purchase_id INT DEFAULT NULL COMMENT '来源进货单ID',
    purchase_price DECIMAL(10,2) DEFAULT 0.00 COMMENT '进货价格',
    purchase_date DATE DEFAULT NULL COMMENT '进货日期',
    stock DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '当前库存数量',
    locked_stock DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '锁定库存（销售未出库）',
    unit VARCHAR(10) DEFAULT '千克' COMMENT '单位',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY idx_product_id (product_id),
    KEY idx_tm_id (tm_id),
    KEY idx_purchase_id (purchase_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存表';

-- 创建库存记录表
CREATE TABLE IF NOT EXISTS inventory_record (
    id INT PRIMARY KEY AUTO_INCREMENT,
    inventory_id INT NOT NULL COMMENT '库存ID',
    product_id INT NOT NULL COMMENT '商品SKU ID',
    product_name VARCHAR(100) NOT NULL COMMENT '商品名称 (SKU Name)',
    before_stock DECIMAL(10,2) NOT NULL COMMENT '变动前库存',
    adjustment DECIMAL(10,2) NOT NULL COMMENT '变动数量（正数为入库，负数为出库）',
    after_stock DECIMAL(10,2) NOT NULL COMMENT '变动后库存',
    type ENUM('in','out','adjust') NOT NULL COMMENT '类型：in入库，out出库, adjust调整',
    source_type VARCHAR(20) DEFAULT NULL COMMENT '来源类型：purchase进货，sales销售，manual手动调整',
    source_id INT DEFAULT NULL COMMENT '来源ID：进货单ID或销售单ID',
    remark VARCHAR(255) DEFAULT NULL COMMENT '备注',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    KEY idx_inventory_id (inventory_id),
    KEY idx_product_id (product_id),
    KEY idx_type (type),
    KEY idx_source (source_type,source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存流水记录表';

-- 创建销售库存关联表 (此表可能冗余，销售明细已关联库存)
-- CREATE TABLE IF NOT EXISTS sales_inventory (
--     id INT PRIMARY KEY AUTO_INCREMENT,
--     sales_detail_id INT NOT NULL COMMENT '销售单明细ID',
--     inventory_id INT NOT NULL COMMENT '库存ID',
--     quantity DECIMAL(10,2) NOT NULL COMMENT '从该库存出的数量',
--     created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     KEY idx_sales_detail_id (sales_detail_id),
--     KEY idx_inventory_id (inventory_id),
--     UNIQUE KEY uk_sales_inventory (sales_detail_id, inventory_id)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售库存关联表 (可能冗余)';

-- ========================================= --
--          优化后的示例数据插入             --
-- ========================================= --

-- 插入进货单 (采购员: 王五 user_id=4, 孙八 user_id=7)
INSERT INTO purchase_order (id, purchase_no, product_name, quantity, unit, price, total_amount, supplier, purchase_date, status, created_by) VALUES 
(1, 'PO202406010001', '金龙鱼大米 (多种规格)', 150.00, 'kg', 8.33, 1248.00, '金龙鱼供应商', '2024-06-01', 1, 4), -- Status: 已入库
(2, 'PO202406010002', '福临门面粉 (5kg)', 50.00, 'kg', 13.98, 699.00, '福临门供应商', '2024-06-01', 1, 4), -- Status: 已入库
(3, 'PO202406020001', '鲁花花生油 (5L)', 80.00, 'L', 45.98, 3678.40, '鲁花供应商', '2024-06-02', 1, 7), -- Status: 已入库
(4, 'PO202406020002', '海天酱油 (多种规格)', 250.00, 'L', 12.78, 3195.00, '海天供应商', '2024-06-02', 1, 7), -- Status: 已入库
(5, 'PO202406030001', '李锦记蚝油 (1kg)', 150.00, 'kg', 27.95, 4192.50, '李锦记供应商', '2024-06-03', 1, 4), -- Status: 已入库
(6, 'PO202406030002', '太太乐鸡精 (200g)', 300.00, '袋', 9.45, 2835.00, '太太乐供应商', '2024-06-03', 0, 7), -- Status: 待入库
(7, 'PO202406040001', '老干妈辣酱 (500g)', 200.00, '瓶', 14.45, 2890.00, '老干妈供应商', '2024-06-04', 0, 4); -- Status: 待入库

-- 插入进货单明细 (关联进货单ID和SKU)
-- 注意: product_id 存的是 trademarks ID (设计约束), 但我们用它概念性地关联 SKU ID
-- purchase_order 1 (金龙鱼大米)
INSERT INTO purchase_order_detail (purchase_id, product_id, sku_name, quantity, unit, price, amount) VALUES 
(1, 1, '金龙鱼大米5kg袋装', 100.00, 'kg', 5.99, 599.00),  -- 关联 sku_id 1
(1, 1, '金龙鱼大米10kg袋装', 50.00, 'kg', 10.99, 549.50); -- 关联 sku_id 2
-- purchase_order 2 (福临门面粉)
INSERT INTO purchase_order_detail (purchase_id, product_id, sku_name, quantity, unit, price, amount) VALUES 
(2, 2, '福临门面粉5kg袋装', 50.00, 'kg', 13.98, 699.00);  -- 关联 sku_id 4
-- purchase_order 3 (鲁花花生油)
INSERT INTO purchase_order_detail (purchase_id, product_id, sku_name, quantity, unit, price, amount) VALUES 
(3, 3, '鲁花花生油5L桶装', 80.00, 'L', 45.98, 3678.40);   -- 关联 sku_id 6
-- purchase_order 4 (海天酱油)
INSERT INTO purchase_order_detail (purchase_id, product_id, sku_name, quantity, unit, price, amount) VALUES 
(4, 4, '海天酱油500ml瓶装', 150.00, 'L', 9.98, 1497.00),  -- 关联 sku_id 7
(4, 4, '海天酱油1L瓶装', 100.00, 'L', 16.98, 1698.00); -- 关联 sku_id 8
-- purchase_order 5 (李锦记蚝油)
INSERT INTO purchase_order_detail (purchase_id, product_id, sku_name, quantity, unit, price, amount) VALUES 
(5, 5, '李锦记蚝油1kg瓶装', 150.00, 'kg', 27.95, 4192.50); -- 关联 sku_id 10
-- purchase_order 6 (太太乐鸡精 - 待入库)
INSERT INTO purchase_order_detail (purchase_id, product_id, sku_name, quantity, unit, price, amount) VALUES 
(6, 6, '太太乐鸡精200g袋装', 300.00, '袋', 9.45, 2835.00); -- 关联 sku_id 12
-- purchase_order 7 (老干妈辣酱 - 待入库)
INSERT INTO purchase_order_detail (purchase_id, product_id, sku_name, quantity, unit, price, amount) VALUES 
(7, 7, '老干妈辣酱500g瓶装', 200.00, '瓶', 14.45, 2890.00); -- 关联 sku_id 14

-- 插入库存数据 (基于已入库的进货单)
-- 库存记录与进货单ID关联
-- product_id 对应 sku_id
INSERT INTO inventory (id, product_id, product_name, sku_spec, tm_id, tm_name, purchase_id, purchase_price, stock, locked_stock, unit, purchase_date) VALUES 
(1, 1, '金龙鱼大米5kg袋装', '5kg袋装', 1, '金龙鱼', 1, 5.99, 100.00, 0, 'kg', '2024-06-01'),
(2, 2, '金龙鱼大米10kg袋装', '10kg袋装', 1, '金龙鱼', 1, 10.99, 50.00, 0, 'kg', '2024-06-01'),
(3, 4, '福临门面粉5kg袋装', '5kg袋装', 2, '福临门', 2, 13.98, 50.00, 0, 'kg', '2024-06-01'),
(4, 6, '鲁花花生油5L桶装', '5L桶装', 3, '鲁花', 3, 45.98, 80.00, 0, 'L', '2024-06-02'),
(5, 7, '海天酱油500ml瓶装', '500ml瓶装', 4, '海天', 4, 9.98, 150.00, 0, 'L', '2024-06-02'),
(6, 8, '海天酱油1L瓶装', '1L瓶装', 4, '海天', 4, 16.98, 100.00, 0, 'L', '2024-06-02'),
(7, 10, '李锦记蚝油1kg瓶装', '1kg瓶装', 5, '李锦记', 5, 27.95, 150.00, 0, 'kg', '2024-06-03');

-- 插入库存流水记录 (基于已入库的进货单)
INSERT INTO inventory_record (inventory_id, product_id, product_name, before_stock, adjustment, after_stock, type, source_type, source_id, remark) VALUES
(1, 1, '金龙鱼大米5kg袋装', 0, 100.00, 100.00, 'in', 'purchase', 1, 'PO202406010001 入库'),
(2, 2, '金龙鱼大米10kg袋装', 0, 50.00, 50.00, 'in', 'purchase', 1, 'PO202406010001 入库'),
(3, 4, '福临门面粉5kg袋装', 0, 50.00, 50.00, 'in', 'purchase', 2, 'PO202406010002 入库'),
(4, 6, '鲁花花生油5L桶装', 0, 80.00, 80.00, 'in', 'purchase', 3, 'PO202406020001 入库'),
(5, 7, '海天酱油500ml瓶装', 0, 150.00, 150.00, 'in', 'purchase', 4, 'PO202406020002 入库'),
(6, 8, '海天酱油1L瓶装', 0, 100.00, 100.00, 'in', 'purchase', 4, 'PO202406020002 入库'),
(7, 10, '李锦记蚝油1kg瓶装', 0, 150.00, 150.00, 'in', 'purchase', 5, 'PO202406030001 入库');

-- 插入销售单 (销售员: 李四 user_id=3, 钱七 user_id=6)
INSERT INTO sales_order (id, sales_no, product_name, quantity, unit, price, total_amount, customer, sales_date, status, created_by) VALUES 
(1, 'SO202406040001', '金龙鱼大米 (5kg)', 50.00, 'kg', 7.99, 399.50, '超市A', '2024-06-04', 1, 3), -- Status: 已出库
(2, 'SO202406040002', '福临门面粉 & 鲁花油', 70.00, '件', 25.70, 1799.00, '超市B', '2024-06-04', 1, 6), -- Status: 已出库
(3, 'SO202406050001', '海天酱油 (1L)', 60.00, 'L', 19.98, 1198.80, '餐厅C', '2024-06-05', 1, 3), -- Status: 已出库
(4, 'SO202406050002', '李锦记蚝油 (1kg)', 80.00, 'kg', 34.95, 2796.00, '餐厅D', '2024-06-05', 0, 6); -- Status: 待出库

-- 插入销售单明细 (关联销售单ID, 库存ID, SKU ID)
-- sales_order 1
INSERT INTO sales_order_detail (id, sales_id, inventory_id, product_id, sku_name, quantity, unit, price, amount) VALUES 
(1, 1, 1, 1, '金龙鱼大米5kg袋装', 50.00, 'kg', 7.99, 399.50); -- 从 inventory 1 出库
-- sales_order 2
INSERT INTO sales_order_detail (id, sales_id, inventory_id, product_id, sku_name, quantity, unit, price, amount) VALUES 
(2, 2, 3, 4, '福临门面粉5kg袋装', 20.00, 'kg', 17.98, 359.60), -- 从 inventory 3 出库
(3, 2, 4, 6, '鲁花花生油5L桶装', 50.00, 'L', 49.98, 2499.00); -- 从 inventory 4 出库
-- sales_order 3
INSERT INTO sales_order_detail (id, sales_id, inventory_id, product_id, sku_name, quantity, unit, price, amount) VALUES 
(4, 3, 6, 8, '海天酱油1L瓶装', 60.00, 'L', 19.98, 1198.80); -- 从 inventory 6 出库
-- sales_order 4 (待出库)
INSERT INTO sales_order_detail (id, sales_id, inventory_id, product_id, sku_name, quantity, unit, price, amount) VALUES 
(5, 4, 7, 10, '李锦记蚝油1kg瓶装', 80.00, 'kg', 34.95, 2796.00); -- 预定从 inventory 7 出库

-- 插入库存流水记录 (基于已出库的销售单)
INSERT INTO inventory_record (inventory_id, product_id, product_name, before_stock, adjustment, after_stock, type, source_type, source_id, remark) VALUES
(1, 1, '金龙鱼大米5kg袋装', 100.00, -50.00, 50.00, 'out', 'sales', 1, 'SO202406040001 出库'),
(3, 4, '福临门面粉5kg袋装', 50.00, -20.00, 30.00, 'out', 'sales', 2, 'SO202406040002 出库'),
(4, 6, '鲁花花生油5L桶装', 80.00, -50.00, 30.00, 'out', 'sales', 2, 'SO202406040002 出库'),
(6, 8, '海天酱油1L瓶装', 100.00, -60.00, 40.00, 'out', 'sales', 3, 'SO202406050001 出库');

-- 更新实际库存数量 (基于已出库的销售单)
UPDATE inventory SET stock = 50.00 WHERE id = 1;
UPDATE inventory SET stock = 30.00 WHERE id = 3;
UPDATE inventory SET stock = 30.00 WHERE id = 4;
UPDATE inventory SET stock = 40.00 WHERE id = 6;

-- 更新待出库订单的锁定库存
UPDATE inventory SET locked_stock = 80.00 WHERE id = 7; -- 销售单4 锁定了库存7 数量80