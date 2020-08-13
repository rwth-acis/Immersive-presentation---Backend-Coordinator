var express = require("express");
var router = express.Router();
const mysqlpool = require("../../db.js");
const cleaner = require("../../sql-cleaner.js");
const jwt = require("jsonwebtoken");
const jwtSecret = process.env.JWT_SECRET || "your_jwt_secret";
const bcrypt = require("bcryptjs");
const saltRounds = parseInt(process.env.SALTROUNDS) || 9;

// in /auth/user
/* GET user from the token. */
router.get("/", function (req, res, next) {
    res.send(req.user);
});

/* POST reset password. */
router.post("/resetpassword/", function (req, res, next) {
    //check required params in the body
    if (req.body.oldPwd && req.body.newPwd) {
        //check if the params are valid
        req.checkBody(
            "newPwd",
            "Password must be between 6-50 characters long."
        ).len(6, 50);

        //check wheather the oldPwd matched the stored one
        mysqlpool.getConnection((err, conn) => {
            if (err) {
                res.status(500);
                res.send({code: "#I001", message: "MySQL-Connection-Failed"});
                throw err;
            }
            //prepare for connection
            let sqlstatement = "SELECT * FROM user WHERE iduser = ?";
            conn.query(sqlstatement, [req.user.iduser], (err, result) => {
                //No conn.release() here because it is used later
                if (err) {
                    conn.release();
                    res.status(500);
                    res.send({code: "#I001", message: "MySQL-Connection-Failed"});
                    throw err;
                }
                //Check the password - stored on result[0].password
                if (result.length > 0) {
                    bcrypt.compare(
                        req.body.oldPwd,
                        result[0].pwdhash,
                        (err, same) => {
                            if (same == true) {
                                //oldPwd matches
                                //store the new pwd encrypted to the db
                                bcrypt.genSalt(saltRounds, (err, salt) => {
                                    //Salt is generated
                                    if (err) {
                                        conn.release();
                                        res.status(500);
                                        res.send(
                                            {code: "#I002", message: "Password lead to hashing error."}
                                        );
                                    } else {
                                        bcrypt.hash(
                                            req.body.newPwd,
                                            salt,
                                            (err, encrypted) => {
                                                //Hashing is done
                                                if (err) {
                                                    conn.release();
                                                    res.status(500);
                                                    res.send(
                                                        {code: "#I002", message: "Password lead to hashing error."}
                                                    );
                                                } else {
                                                    //Hashing sucessfull
                                                    //Prepare the Update sql statement
                                                    let sqlUpdatestatement =
                                                        "UPDATE user SET pwdhash = ? WHERE iduser = ?;";
                                                    conn.query(
                                                        sqlUpdatestatement,
                                                        [
                                                            encrypted,
                                                            req.user.iduser
                                                        ],
                                                        (err, result) => {
                                                            conn.release();
                                                            if (err) {
                                                                throw err;
                                                            } else {
                                                                res.send({
                                                                    message:
                                                                        "Passwort changed successfully"
                                                                });
                                                            }
                                                        }
                                                    );
                                                }
                                            }
                                        );
                                    }
                                });
                            } else {
                                conn.release();
                                //wrong oldPwd
                                res.status(400);
                                res.send({
                                    code: "#A004",
                                    message: "Old password incorrect."
                                });
                            }
                        }
                    );
                } else {
                    conn.release();
                    //logged in user can not be found in the DB -> big inconsistency
                    res.status(500);
                    res.send({
                        code: "#A004",
                        message: "Old password incorrect."
                    });
                }
            });
        });
    } else {
        //required params missing
        res.status(400);
        res.send({
            msg:
                "Bitte sende dein altes und dein neues Passwort. - (oldPwd & newPwd)"
        });
    }
});

module.exports = router;
