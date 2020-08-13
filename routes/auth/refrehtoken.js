//Required modules
var express = require('express');
var router = express.Router();
const jwt = require("jsonwebtoken");
//Enviromentvariables
const jwtSecret = process.env.JWT_SECRET || "your_jwt_secret";

/* POST refresh your token before it expires */
router.get('/', function (req, res, next) {
    let user = req.user;
    let inSevenDays = Date.now() + (1000 * 7 * 24 * 3600);
    const token = jwt.sign({ user, exp: inSevenDays }, jwtSecret);
    return res.json({ user, token, inSevenDays });
});

module.exports = router;