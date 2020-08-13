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
                //console.log("Fehler in get Connection \n ");
                throw err;
            }
            //prepare for connection
            let sqlstatement = "SELECT * FROM doctors WHERE doctors_id = ?";
            conn.query(sqlstatement, [req.user.doctors_id], (err, result) => {
                //No conn.release() here because it is used later
                if (err) {
                    conn.release();
                    throw err;
                }
                //Check the password - stored on result[0].password
                if (result.length > 0) {
                    bcrypt.compare(
                        req.body.oldPwd,
                        result[0].password,
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
                                            "Hashing failed. Maybe try another password."
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
                                                        "Hashing failed. Maybe try another password."
                                                    );
                                                } else {
                                                    //Hashing sucessfull
                                                    //Prepare the Update sql statement
                                                    let sqlUpdatestatement =
                                                        "UPDATE doctors SET password = ? WHERE doctors_id = ?;";
                                                    conn.query(
                                                        sqlUpdatestatement,
                                                        [
                                                            encrypted,
                                                            req.user.doctors_id
                                                        ],
                                                        (err, result) => {
                                                            conn.release();
                                                            if (err) {
                                                                throw err;
                                                            } else {
                                                                res.send({
                                                                    msg:
                                                                        "Das Passwort wurde geändert."
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
                                res.send({ msg: "Falsches altes Passwort." });
                            }
                        }
                    );
                } else {
                    conn.release();
                    //logged in user can not be found in the DB -> big inconsistency
                    res.status(500);
                    res.send({
                        msg:
                            "User konnte nicht in der Datnebank gefunden werden. Bitte wenden Sie sich an den Support."
                    });
                }
            });
            //release the connection
            conn.release();
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
