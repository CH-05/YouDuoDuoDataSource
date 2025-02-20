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
(5, 'SKU管理', 'Sku', 2, 1);

-- 插入初始角色数据
INSERT INTO roles (role_name, role_code, description) VALUES 
('超级管理员', 'SUPER_ADMIN', '系统超级管理员'),
('管理员', 'ADMIN', '系统管理员'),
('销售员', 'SALES', '销售人员'),
('采购员', 'PURCHASE', '采购人员'),
('仓管员', 'STOCK', '仓库管理人员');

-- 插入初始管理员用户（密码：123456）
INSERT INTO users (username, password, nickname, status, routes) VALUES 
('admin', '$2b$10$PH0h4GSZoIXUc.1yWBJvyOXtC5K3QMxH8OgRZL.L6X5YMQfGTDgGe', '系统管理员', 1, '[{"id":0,"name":"权限列表","level":1,"children":[{"id":1,"name":"权限管理","label":"Acl","level":2,"children":[{"id":3,"name":"用户管理","label":"User","level":3,"select":true},{"id":4,"name":"角色管理","label":"Role","level":3,"select":true},{"id":5,"name":"菜单管理","label":"Permission","level":3,"select":true}],"select":true},{"id":2,"name":"粮油管理","label":"Product","level":2,"children":[{"id":6,"name":"品牌管理","label":"Trademark","level":3,"select":true},{"id":7,"name":"属性管理","label":"Attr","level":3,"select":true},{"id":8,"name":"SPU管理","label":"Spu","level":3,"select":true},{"id":9,"name":"SKU管理","label":"Sku","level":3,"select":true}],"select":true}],"select":true}]');

-- 关联管理员用户和超级管理员角色
INSERT INTO user_role (user_id, role_id) VALUES (1, 1);

-- 插入初始商品分类数据
INSERT INTO categories (category_name, parent_id, level, sort_order) VALUES 
('粮食', NULL, 1, 1),
('油类', NULL, 1, 2),
('调味品', NULL, 1, 3),
('大米', 1, 2, 1),
('面粉', 1, 2, 2),
('食用油', 2, 2, 1),
('调味料', 3, 2, 1);

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

-- 创建SPU图片表
CREATE TABLE IF NOT EXISTS spu_image (
    image_id INT PRIMARY KEY AUTO_INCREMENT,
    spu_id INT NOT NULL COMMENT 'SPU ID',
    image_url VARCHAR(255) NOT NULL COMMENT '图片URL',
    image_name VARCHAR(100) COMMENT '图片名称',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (spu_id) REFERENCES spu(spu_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SPU图片表';

-- 创建SPU销售属性表
CREATE TABLE IF NOT EXISTS spu_sale_attr (
    attr_id INT PRIMARY KEY AUTO_INCREMENT,
    spu_id INT NOT NULL COMMENT 'SPU ID',
    attr_name VARCHAR(50) NOT NULL COMMENT '销售属性名称',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (spu_id) REFERENCES spu(spu_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SPU销售属性表';

-- 创建SPU销售属性值表
CREATE TABLE IF NOT EXISTS spu_sale_attr_value (
    value_id INT PRIMARY KEY AUTO_INCREMENT,
    attr_id INT NOT NULL COMMENT '属性ID',
    value_name VARCHAR(50) NOT NULL COMMENT '属性值名称',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attr_id) REFERENCES spu_sale_attr(attr_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SPU销售属性值表';

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