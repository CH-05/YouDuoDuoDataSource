const permissionService = {
    getMenu: (req,res) => {
        console.log(req.body)
        res.send({code: 200, message: "ok"})
    }
}
/*
* 123*/

module.exports = permissionService