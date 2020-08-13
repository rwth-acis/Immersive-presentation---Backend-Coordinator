const passport = require('passport');
const passportJWT = require("passport-jwt");
const mysqlpool = require("./db.js");
const cleaner = require("./sql-cleaner.js");
const bcrypt = require("bcryptjs");

const ExtractJWT = passportJWT.ExtractJwt;
const jwtSecret = process.env.JWT_SECRET || "your_jwt_secret";
const LocalStrategy = require('passport-local').Strategy;
const JWTStrategy = passportJWT.Strategy;

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
},
    function (req, email, password, cb) {
        //Called when there is a User to check the credentials for

        if (!req.body.role) {
            console.log("Error in passport.js LocalStrategy No role set: " + req.body.role);
            var roleerr = {
                message: "Error - no role set. Are you a doctor or a patient"
            };
            return cb(roleerr);
        }

        mysqlpool.getConnection(function (err, conn) {
            if (err) {
                console.log("Error in passport.js LocalStrategy with MYSQL-Connection");
                return cb(err);
            } else {
                if (req.body.role == 'doctor') {
                    var sql_statement = "SELECT * FROM doctors WHERE email = ?";
                } else {
                    //Annahme: es ist patient
                    var sql_statement = "SELECT * FROM patients WHERE email = ?";
                }
                conn.query(sql_statement, [email], function (err, result) {
                    conn.release();
                    if (err) {
                        console.log("Error in passport.js LocalStrategy with MYSQL-Query");
                        return cb(err);
                    } else {
                        if (result.length <= 0) {
                            console.log("Passport.js LocalStrategy: email incorrect");
                            return cb(null, false, { message: 'Incorrect email' });
                        }
                        //Check the password - stored on result[0].password
                        bcrypt.compare(password, result[0].password, function (err, res) {
                            if (err) {
                                console.log("Error in passport.js LocalStrategy: hashing error");
                                return cb(err);
                            } else {
                                if (res == true) {
                                    //User existiert und password stimmt!
                                    //Clean den user um ihn zurueckzugeben
                                    if (req.body.role == 'doctor') {
                                        var authoriseduser = cleaner.jwtDoctorSqlCleaner(result);
                                    } else {
                                        var authoriseduser = cleaner.jwtPatientSqlCleaner(result);
                                    }
                                    return cb(null, authoriseduser, {
                                        message: 'Logged In Successfully'
                                    });
                                } else {
                                    console.log("Passport.js LocalStrategy: password incorrect");
                                    return cb(null, false, { message: 'Incorrect password' });
                                }
                            }
                        });
                    }
                });
            }
        });
    }
));

passport.use(new JWTStrategy({
    jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
    secretOrKey: jwtSecret
},
    function (jwtPayload, cb) {
        try {
            if (jwtPayload.exp >= Date.now()) {
                //Extract the Information
                let myuser = jwtPayload.user;
                //Responde the userinformation
                return cb(null, myuser, { message: 'Identified Successfully with Token' });
            } else {
                return cb(null, null, { message: 'Token expired' })
            }
        } catch (err) {
            return cb(err);
        }
    }
));