const db = require("../db/index");


const attrService = {
    // 获取分类列表
    getCategory: async (req, res) => {
        try {
            const sql = "SELECT category_id as id, category_name as name FROM categories ORDER BY category_id";
            const [result] = await db.query(sql);
            
            res.send({
                code: 200,
                message: '获取成功',
                data: result
            });
        } catch (error) {
            console.error('获取分类列表错误:', error);
            res.send({
                code: 201,
                message: '获取分类列表失败',
                error: error.message
            });
        }
    },

    // 获取属性列表
    getAttrList: async (req, res) => {
        try {
            const { category_id, page, limit } = req.params;
            console.log('获取属性列表参数:', { category_id, page, limit });
            
            if (!category_id) {
                return res.send({
                    code: 201,
                    message: '分类ID不能为空'
                });
            }

            const offset = (parseInt(page) - 1) * parseInt(limit);
            
            // 获取总数
            const [totalResult] = await db.query(
                'SELECT COUNT(*) as total FROM attributes WHERE category_id = ?',
                [category_id]
            );
            
            // 获取属性列表
            const [attrs] = await db.query(
                `SELECT 
                    a.attr_id,
                    a.category_id,
                    a.attr_name,
                    GROUP_CONCAT(av.value_name) as attr_values,
                    DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                    DATE_FORMAT(a.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
                FROM attributes a
                LEFT JOIN attr_values av ON a.attr_id = av.attr_id
                WHERE a.category_id = ?
                GROUP BY a.attr_id
                ORDER BY a.created_at DESC
                LIMIT ? OFFSET ?`,
                [category_id, parseInt(limit), offset]
            );
            
            console.log('查询结果:', { total: totalResult[0].total, records: attrs });
            
            res.send({
                code: 200,
                message: '获取成功',
                data: {
                    records: attrs.map(attr => ({
                        ...attr,
                        attr_values: attr.attr_values ? attr.attr_values.split(',') : []
                    })),
                    total: totalResult[0].total,
                    size: parseInt(limit),
                    current: parseInt(page)
                }
            });
        } catch (error) {
            console.error('获取属性列表失败:', error);
            res.send({
                code: 201,
                message: '获取属性列表失败',
                error: error.message
            });
        }
    },

    // 添加属性
    addAttr: async (req, res) => {
        try {
            const { category_id, attr_name, attr_values } = req.body;
            console.log('添加属性参数:', req.body);
            
            if (!category_id || !attr_name || !Array.isArray(attr_values)) {
                return res.send({
                    code: 201,
                    message: '参数错误'
                });
            }

            // 检查属性名是否已存在
            const [existing] = await db.query(
                'SELECT attr_id FROM attributes WHERE category_id = ? AND attr_name = ?',
                [category_id, attr_name]
            );

            if (existing.length > 0) {
                return res.send({
                    code: 201,
                    message: '该分类下已存在相同属性名'
                });
            }

            const connection = await db.getConnection();
            
            try {
                await connection.beginTransaction();

                // 插入属性
                const [result] = await connection.query(
                    'INSERT INTO attributes (category_id, attr_name) VALUES (?, ?)',
                    [category_id, attr_name]
                );

                const attr_id = result.insertId;

                // 如果有属性值，插入属性值
                if (attr_values.length > 0) {
                    const valueInserts = attr_values.map(value => [attr_id, value]);
                    await connection.query(
                        'INSERT INTO attr_values (attr_id, value_name) VALUES ?',
                        [valueInserts]
                    );
                }

                await connection.commit();
                connection.release();

                res.send({
                    code: 200,
                    message: '添加成功',
                    data: {
                        attr_id,
                        category_id,
                        attr_name,
                        attr_values
                    }
                });
            } catch (error) {
                await connection.rollback();
                connection.release();
                throw error;
            }
        } catch (error) {
            console.error('添加属性失败:', error);
            res.send({
                code: 201,
                message: '添加属性失败',
                error: error.message
            });
        }
    },

    // 更新属性
    updateAttr: async (req, res) => {
        try {
            const { attr_id } = req.params;
            const { attr_name, attr_values } = req.body;
            console.log('更新属性参数:', { attr_id, attr_name, attr_values });
            
            if (!attr_id || !attr_name || !Array.isArray(attr_values)) {
                return res.send({
                    code: 201,
                    message: '参数错误'
                });
            }

            // 检查属性是否存在
            const [existing] = await db.query(
                'SELECT category_id FROM attributes WHERE attr_id = ?',
                [attr_id]
            );

            if (existing.length === 0) {
                return res.send({
                    code: 201,
                    message: '属性不存在'
                });
            }

            // 检查属性名是否重复
            const [nameConflict] = await db.query(
                'SELECT attr_id FROM attributes WHERE category_id = ? AND attr_name = ? AND attr_id != ?',
                [existing[0].category_id, attr_name, attr_id]
            );

            if (nameConflict.length > 0) {
                return res.send({
                    code: 201,
                    message: '该分类下已存在相同属性名'
                });
            }

            const connection = await db.getConnection();
            
            try {
                await connection.beginTransaction();

                // 更新属性名
                await connection.query(
                    'UPDATE attributes SET attr_name = ? WHERE attr_id = ?',
                    [attr_name, attr_id]
                );

                // 删除旧的属性值
                await connection.query(
                    'DELETE FROM attr_values WHERE attr_id = ?',
                    [attr_id]
                );

                // 插入新的属性值
                if (attr_values.length > 0) {
                    const valueInserts = attr_values.map(value => [attr_id, value]);
                    await connection.query(
                        'INSERT INTO attr_values (attr_id, value_name) VALUES ?',
                        [valueInserts]
                    );
                }

                await connection.commit();
                connection.release();

                res.send({
                    code: 200,
                    message: '更新成功',
                    data: {
                        attr_id,
                        attr_name,
                        attr_values
                    }
                });
            } catch (error) {
                await connection.rollback();
                connection.release();
                throw error;
            }
        } catch (error) {
            console.error('更新属性失败:', error);
            res.send({
                code: 201,
                message: '更新属性失败',
                error: error.message
            });
        }
    },

    // 删除属性
    deleteAttr: async (req, res) => {
        try {
            const { attr_id } = req.params;
            console.log('删除属性参数:', { attr_id });

            if (!attr_id) {
                return res.send({
                    code: 201,
                    message: '参数错误'
                });
            }

            const connection = await db.getConnection();
            
            try {
                await connection.beginTransaction();

                // 删除属性值
                await connection.query(
                    'DELETE FROM attr_values WHERE attr_id = ?',
                    [attr_id]
                );

                // 删除属性
                const [result] = await connection.query(
                    'DELETE FROM attributes WHERE attr_id = ?',
                    [attr_id]
                );

                if (result.affectedRows === 0) {
                    await connection.rollback();
                    connection.release();
                    return res.send({
                        code: 201,
                        message: '属性不存在'
                    });
                }

                await connection.commit();
                connection.release();

                res.send({
                    code: 200,
                    message: '删除成功'
                });
            } catch (error) {
                await connection.rollback();
                connection.release();
                throw error;
            }
        } catch (error) {
            console.error('删除属性失败:', error);
            res.send({
                code: 201,
                message: '删除属性失败',
                error: error.message
            });
        }
    },

    // 获取属性值列表
    getAttrValues: async (req, res) => {
        try {
            const { attr_id } = req.params;

            if (!attr_id) {
                return res.send({
                    code: 201,
                    message: '参数错误'
                });
            }

            const [values] = await db.query(
                'SELECT value_id, value_name FROM attr_values WHERE attr_id = ? ORDER BY value_id',
                [attr_id]
            );

            res.send({
                code: 200,
                message: '获取成功',
                data: values
            });
        } catch (error) {
            console.error('获取属性值列表失败:', error);
            res.send({
                code: 201,
                message: '获取属性值列表失败'
            });
        }
    },

    // 更新属性值
    updateAttrValues: async (req, res) => {
        try {
            const { attr_id } = req.params;
            const { values } = req.body;

            if (!attr_id || !Array.isArray(values)) {
                return res.send({
                    code: 201,
                    message: '参数错误'
                });
            }

            // 开始事务
            await db.beginTransaction();

            try {
                // 删除旧的属性值
                await db.query(
                    'DELETE FROM attr_values WHERE attr_id = ?',
                    [attr_id]
                );

                // 插入新的属性值
                if (values.length > 0) {
                    const valueInserts = values.map(value => [attr_id, value]);
                    await db.query(
                        'INSERT INTO attr_values (attr_id, value_name) VALUES ?',
                        [valueInserts]
                    );
                }

                await db.commit();

                res.send({
                    code: 200,
                    message: '更新成功'
                });
            } catch (error) {
                await db.rollback();
                throw error;
            }
        } catch (error) {
            console.error('更新属性值失败:', error);
            res.send({
                code: 201,
                message: '更新属性值失败'
            });
        }
    }
};

module.exports = attrService;
