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

        mysqlpool.getConnection(function (err, conn) {
            if (err) {
                console.log("Error in passport.js LocalStrategy with MYSQL-Connection");
                return cb(err);
            } else {
                
                var sql_statement = "SELECT * FROM user WHERE email = ?";
                
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
                        //Compare the password with the hash - stored on result[0].pwdhash
                        bcrypt.compare(password, result[0].pwdhash, function (err, res) {
                            if (err) {
                                console.log("Error in passport.js LocalStrategy: hashing error");
                                return cb(err);
                            } else {
                                if (res == true) {
                                    //User credentials are correct
                                    
                                    var authoriseduser = cleaner.userSqlCleaner(result);
                                    
                                    return cb(null, authoriseduser, {
                                        message: 'Logged In Successfully'
                                    });
                                } else {
                                    //console.log("Passport.js LocalStrategy: password incorrect");
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
                //Extract user information
                let myuser = jwtPayload.user;
                //Return the user information
                return cb(null, myuser, { message: 'Identified Successfully with Token' });
            } else {
                return cb(null, false, { message: 'Token expired' });
            }
        } catch (err) {
            return cb(err);
        }
    }
));