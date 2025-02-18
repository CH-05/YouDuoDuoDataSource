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

-- 创建供应商表
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_name VARCHAR(100) NOT NULL COMMENT '供应商名称',
    contact_name VARCHAR(50) DEFAULT NULL COMMENT '联系人',
    phone VARCHAR(20) DEFAULT NULL COMMENT '联系电话',
    email VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
    address TEXT DEFAULT NULL COMMENT '地址',
    status TINYINT(1) DEFAULT 1 COMMENT '状态：0-禁用 1-启用',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='供应商表';

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

-- 创建商品表
CREATE TABLE IF NOT EXISTS products (
    product_id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT NOT NULL COMMENT '分类ID',
    supplier_id INT DEFAULT NULL COMMENT '供应商ID',
    product_name VARCHAR(100) NOT NULL COMMENT '商品名称',
    product_code VARCHAR(50) UNIQUE COMMENT '商品编码',
    barcode VARCHAR(50) DEFAULT NULL COMMENT '条形码',
    unit VARCHAR(20) NOT NULL COMMENT '单位',
    spec VARCHAR(50) DEFAULT NULL COMMENT '规格',
    purchase_price DECIMAL(10,2) NOT NULL COMMENT '进货价',
    retail_price DECIMAL(10,2) NOT NULL COMMENT '零售价',
    wholesale_price DECIMAL(10,2) DEFAULT NULL COMMENT '批发价',
    stock INT NOT NULL DEFAULT 0 COMMENT '库存数量',
    min_stock INT DEFAULT 0 COMMENT '最低库存',
    max_stock INT DEFAULT 0 COMMENT '最高库存',
    status TINYINT(1) DEFAULT 1 COMMENT '状态：0-下架 1-上架',
    description TEXT DEFAULT NULL COMMENT '商品描述',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品表';

-- 创建采购单表
CREATE TABLE IF NOT EXISTS purchase_orders (
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_id INT NOT NULL COMMENT '供应商ID',
    user_id INT NOT NULL COMMENT '操作员ID',
    order_no VARCHAR(50) NOT NULL UNIQUE COMMENT '采购单号',
    order_date DATE NOT NULL COMMENT '采购日期',
    total_amount DECIMAL(10,2) NOT NULL COMMENT '总金额',
    status TINYINT(1) DEFAULT 0 COMMENT '状态：0-待入库 1-已入库 2-已取消',
    remark TEXT DEFAULT NULL COMMENT '备注',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购单表';

-- 创建采购单明细表
CREATE TABLE IF NOT EXISTS purchase_order_items (
    item_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL COMMENT '采购单ID',
    product_id INT NOT NULL COMMENT '商品ID',
    quantity INT NOT NULL COMMENT '数量',
    price DECIMAL(10,2) NOT NULL COMMENT '单价',
    amount DECIMAL(10,2) NOT NULL COMMENT '金额',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES purchase_orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购单明细表';

-- 创建销售单表
CREATE TABLE IF NOT EXISTS sales_orders (
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT '操作员ID',
    order_no VARCHAR(50) NOT NULL UNIQUE COMMENT '销售单号',
    order_date DATE NOT NULL COMMENT '销售日期',
    customer_name VARCHAR(100) DEFAULT NULL COMMENT '客户名称',
    customer_phone VARCHAR(20) DEFAULT NULL COMMENT '客户电话',
    total_amount DECIMAL(10,2) NOT NULL COMMENT '总金额',
    discount_amount DECIMAL(10,2) DEFAULT 0 COMMENT '优惠金额',
    actual_amount DECIMAL(10,2) NOT NULL COMMENT '实收金额',
    payment_method VARCHAR(20) DEFAULT 'CASH' COMMENT '支付方式：CASH-现金 CARD-刷卡 OTHER-其他',
    status TINYINT(1) DEFAULT 1 COMMENT '状态：0-已取消 1-已完成',
    remark TEXT DEFAULT NULL COMMENT '备注',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售单表';

-- 创建销售单明细表
CREATE TABLE IF NOT EXISTS sales_order_items (
    item_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL COMMENT '销售单ID',
    product_id INT NOT NULL COMMENT '商品ID',
    quantity INT NOT NULL COMMENT '数量',
    price DECIMAL(10,2) NOT NULL COMMENT '单价',
    amount DECIMAL(10,2) NOT NULL COMMENT '金额',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES sales_orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售单明细表';

-- 创建库存变动记录表
CREATE TABLE IF NOT EXISTS stock_records (
    record_id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL COMMENT '商品ID',
    change_type TINYINT(1) NOT NULL COMMENT '变动类型：1-入库 2-出库 3-盘点',
    change_quantity INT NOT NULL COMMENT '变动数量',
    before_quantity INT NOT NULL COMMENT '变动前数量',
    after_quantity INT NOT NULL COMMENT '变动后数量',
    reference_no VARCHAR(50) DEFAULT NULL COMMENT '关联单号',
    user_id INT NOT NULL COMMENT '操作员ID',
    remark TEXT DEFAULT NULL COMMENT '备注',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存变动记录表';

-- 创建盘点单表
CREATE TABLE IF NOT EXISTS inventory_check (
    check_id INT PRIMARY KEY AUTO_INCREMENT,
    check_no VARCHAR(50) NOT NULL UNIQUE COMMENT '盘点单号',
    check_date DATE NOT NULL COMMENT '盘点日期',
    user_id INT NOT NULL COMMENT '操作员ID',
    status TINYINT(1) DEFAULT 0 COMMENT '状态：0-进行中 1-已完成',
    remark TEXT DEFAULT NULL COMMENT '备注',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='盘点单表';

-- 创建盘点单明细表
CREATE TABLE IF NOT EXISTS inventory_check_items (
    item_id INT PRIMARY KEY AUTO_INCREMENT,
    check_id INT NOT NULL COMMENT '盘点单ID',
    product_id INT NOT NULL COMMENT '商品ID',
    system_quantity INT NOT NULL COMMENT '系统数量',
    actual_quantity INT NOT NULL COMMENT '实际数量',
    difference_quantity INT NOT NULL COMMENT '差异数量',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (check_id) REFERENCES inventory_check(check_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='盘点单明细表';

-- 插入初始角色数据
INSERT INTO roles (role_name, role_code, description) VALUES 
('超级管理员', 'SUPER_ADMIN', '系统超级管理员'),
('管理员', 'ADMIN', '系统管理员'),
('销售员', 'SALES', '销售人员'),
('采购员', 'PURCHASE', '采购人员'),
('仓管员', 'STOCK', '仓库管理人员');

-- 插入初始管理员用户（密码：123456）
INSERT INTO users (username, password, nickname, status, routes) VALUES 
('admin', '$2b$12$sZOUMqh/KlUB6aBrJV3zVeqR9f.j3N2Ap8GcE7bxZIpEHe5v.gEfm', '系统管理员', 1, '[{"id":0,"name":"权限列表","level":1,"children":[{"id":1,"name":"权限管理","label":"Acl","level":2,"children":[{"id":3,"name":"用户管理","label":"User","level":3,"select":true},{"id":4,"name":"角色管理","label":"Role","level":3,"select":true},{"id":5,"name":"菜单管理","label":"Permission","level":3,"select":true}],"select":true},{"id":2,"name":"粮油管理","label":"Product","level":2,"children":[{"id":6,"name":"品牌管理","label":"Trademark","level":3,"select":true},{"id":7,"name":"属性管理","label":"Attr","level":3,"select":true},{"id":8,"name":"SPU管理","label":"Spu","level":3,"select":true},{"id":9,"name":"SKU管理","label":"Sku","level":3,"select":true}],"select":true}],"select":true}]');

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