const express = require("express");
const router = express.Router();
const expressValidator = require("express-validator");
const mysqlpool = require("../../db.js");
const cleaner = require("../../sql-cleaner.js");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const saltRounds = parseInt(process.env.SALTROUNDS) || 9;
const jwtSecret = process.env.JWT_SECRET || "your_jwt_secret";
const mailer = require("../../tools/mailer");
//
//
/* POST register user (doctor / patient) */
router.post("/register/", function (req, res, next) {
    //VALIDATION
    req.checkBody("role", "The role must be set to doctor or patient").matches(
        /doctor|patient/
    );
    req.checkBody(
        "email",
        "The email you entered is invalid, please try again."
    )
        .isEmail()
        .normalizeEmail();
    req.checkBody(
        "email",
        "Email address must be between 4-100 characters long, please try again."
    ).len(4, 100);
    req.checkBody(
        "password",
        "Password must be between 6-50 characters long."
    ).len(6, 50);
    //req.checkBody("password", "Password must include one lowercase character, one uppercase character, a number, and a special character.").matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!.* )(?=.*[^a-zA-Z0-9]).{8,}$/, "i");

    const errors = req.validationErrors();

    if (errors) {
        res.status(400);
        res.send(errors);
    } else {
        //Valid Data
        const role = req.body.role;
        const email = req.body.email;
        const password = req.body.password;

        // Store user in the databse
        mysqlpool.getConnection(function (err, conn) {
            if (err) {
                console.log(err);
                throw err;
            } else {
                //Check if the user already exists
                if (role == "doctor") {
                    var sql_statement =
                        "SELECT EXISTS(SELECT email FROM doctors WHERE email = ?) AS isexisting";
                } else if (role == "patient") {
                    var sql_statement =
                        "SELECT EXISTS(SELECT email FROM patients WHERE email = ?) AS isexisting";
                }
                conn.query(sql_statement, [email], function (err, result) {
                    //No conn.release() here because it is used later
                    if (err) {
                        conn.release();
                        res.status(500);
                        res.send("MySQL-Connection-Failed");
                        console.log(err);
                        throw err;
                        return;
                    } else {
                        if (result[0].isexisting == 0) {
                            //User does not exist
                            //Store new user in database
                            if (role == "doctor") {
                                //STORE DOCTOR
                                //Hash the password
                                bcrypt.genSalt(saltRounds, function (err, salt) {
                                    if (err) {
                                        conn.release();
                                        console.log(err);
                                        res.status(500);
                                        res.send(
                                            "Hashing failed. Maybe try another password."
                                        );
                                    } else {
                                        bcrypt.hash(password, salt, function (
                                            err,
                                            hash
                                        ) {
                                            if (err) {
                                                conn.release();
                                                console.log(err);
                                                res.status(500);
                                                res.send(
                                                    "Hashing failed. Maybe try another password."
                                                );
                                            } else {
                                                //Generate the Insert statement with hashed password
                                                sql_statement =
                                                    "INSERT INTO doctors (doc_status, email, password, timeofcreation) VALUES (?, ?, ?, NOW());";
                                                conn.query(
                                                    sql_statement,
                                                    [0, email, hash],
                                                    function (err, result) {
                                                        //No conn.release() here because it is used later
                                                        if (err) {
                                                            conn.release();
                                                            throw err;
                                                        }
                                                        //Get the user to return them
                                                        sql_statement =
                                                            "SELECT * FROM doctors WHERE email = ?";
                                                        conn.query(
                                                            sql_statement,
                                                            [email],
                                                            function (err, result) {
                                                                conn.release();
                                                                if (err) throw err;
                                                                var user = cleaner.jwtDoctorSqlCleaner(
                                                                    result
                                                                );
                                                                let exp =
                                                                    Date.now() +
                                                                    1000 * 7 * 24 * 3600;
                                                                const token = jwt.sign(
                                                                    { user, exp: exp },
                                                                    jwtSecret
                                                                );

                                                                //Send Email for Emailadress verification
                                                                //Eine zwei Wochen Frist
                                                                let expemail =
                                                                    Date.now() +
                                                                    1000 * 14 * 24 * 3600;
                                                                const mytoken = jwt.sign(
                                                                    {
                                                                        doctors_id:
                                                                            user.doctors_id,
                                                                        exp: expemail
                                                                    },
                                                                    jwtSecret
                                                                );
                                                                let link =
                                                                    "https://api.quickdoctor.de/auth/verifyemail/?token=" +
                                                                    mytoken;
                                                                mailer.sendVerifyEmailadress(
                                                                    email,
                                                                    link
                                                                );

                                                                //Return
                                                                return res.json({
                                                                    user,
                                                                    token,
                                                                    exp
                                                                });
                                                            }
                                                        );
                                                    }
                                                );
                                            }
                                        });
                                    }
                                });
                            } else if (role == "patient") {
                                //STORE PATIENT
                                //Hash password
                                bcrypt.genSalt(saltRounds, function (err, salt) {
                                    if (err) {
                                        console.log(err);
                                        res.status(500);
                                        res.send(
                                            "Hashing failed. Maybe try another password." +
                                            err
                                        );
                                    } else {
                                        bcrypt.hash(password, salt, function (
                                            err,
                                            hash
                                        ) {
                                            if (err) {
                                                console.log(err);
                                                res.status(500);
                                                res.send(
                                                    "Hashing failed. Maybe try another password." +
                                                    err
                                                );
                                            } else {
                                                //Use the hash to save the patient
                                                sql_statement =
                                                    "INSERT INTO patients (status, email, password, timeofcreation) VALUES (?, ?, ?, NOW());";
                                                conn.query(
                                                    sql_statement,
                                                    [1, email, hash],
                                                    function (err, result) {
                                                        //console.log(hash);
                                                        if (err) {
                                                            throw err;
                                                        }
                                                    }
                                                );
                                                //Get the user to return them
                                                sql_statement =
                                                    "SELECT * FROM patients WHERE email = ?";
                                                conn.query(
                                                    sql_statement,
                                                    [email],
                                                    function (err, result) {
                                                        if (err) throw err;
                                                        var user = cleaner.jwtPatientSqlCleaner(
                                                            result
                                                        );
                                                        let exp =
                                                            Date.now() +
                                                            1000 * 7 * 24 * 3600;
                                                        const token = jwt.sign(
                                                            { user, exp: exp },
                                                            jwtSecret
                                                        );
                                                        return res.json({
                                                            user,
                                                            token,
                                                            exp
                                                        });
                                                    }
                                                );
                                            }
                                        });
                                    }
                                });
                            }
                        } else {
                            conn.release();
                            //User already exist
                            res.status(400);
                            res.send("User already exists.");
                        }
                    }
                }); // ende der Connection
                //conn.release();
            }
        });
    }
});

router.get("/verifyemail/", function (req, res, next) {
    //Check the needed infos
    if (req.query.token) {
        let token = jwt.decode(req.query.token);
        //confirm the appointment
        if (token.exp >= Date.now()) {
            mysqlpool.getConnection((err, conn) => {
                let sql_statement =
                    "UPDATE doctors SET doc_status = 1 WHERE doctors_id = ?";
                conn.query(sql_statement, [token.doctors_id], (err, result) => {
                    conn.release();
                    if (err) {
                        throw err;
                    }
                    //Notify Support to inspect the doctor
                    mailer.sendDefault(
                        "support@quickdoctor.de",
                        "Neuer Doctor - Bitte Verifizieren",
                        " Der Doctor mit der Id=" +
                        token.doctors_id +
                        " hat sich registriert und muss verifiziert werden."
                    );

                    //Redirect to the site where they can login and
                    res.redirect("https://quickdoctor.de/emailverified/");
                });
                //conn.release();
            });
        } else {
            //EXP in token is in the past
            // Maybe look if the wonted appointment is still free dann book and confirm it directly
            res.status(422);
            res.send(
                "Your registration has expired please contact the support or register again."
            );
        }
    } else {
        res.status(422);
        res.send("There is a token missing.");
    }
});

/* POST login. */
router.post("/login/", function (req, res, next) {
    passport.authenticate("local", { session: false }, (err, user, info) => {
        if (err || !user) {
            console.log(err);
            return res.status(400).json({
                message: info ? info.message : "Login failed",
                user: user
            });
        }

        req.login(user, { session: false }, err => {
            if (err) {
                console.log(err);
                res.send(err);
            }

            let exp = Date.now() + 1000 * 7 * 24 * 3600;
            const token = jwt.sign({ user, exp: exp }, jwtSecret);
            return res.json({ user, token, exp: exp });
        });
    })(req, res);
});

module.exports = router;
