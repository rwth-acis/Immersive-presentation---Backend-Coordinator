//Required modules
var express = require('express');
var router = express.Router();
const jwt = require("jsonwebtoken");
//Enviromentvariables
const jwtSecret = process.env.JWT_SECRET || "your_jwt_secret";

/* GET refresh your token before it expires */
router.get('/', function (req, res, next) {
    let user = req.user;
    let inOneDays = Date.now() + (1000 * 1 * 24 * 3600);
    const token = jwt.sign({ user, exp: inOneDays }, jwtSecret);
    return res.json({ user, token, inOneDays });
});

module.exports = router;