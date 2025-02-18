const permissionService = {
    getMenu: (req,res) => {
        console.log(req.body)
        res.send({code: 200, message: "ok"})
    }
}

module.exports = permissionService