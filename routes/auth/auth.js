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
const { Issuer } = require('openid-client');
var client;
Issuer.discover('https://api.learning-layers.eu/o/oauth2/').then(function (learningLayersIssuer){
      //console.log('Discovered issuer %s %O', learningLayersIssuer.issuer, learningLayersIssuer.metadata);
      client = new learningLayersIssuer.Client({
        client_id: process.env.OIDCCLIENTID,
        client_secret: process.env.OIDCCLIENTSECRET,
        redirect_uris: ['http://localhost:3000/cb'],
        response_types: ['code']
      });
    })

//
//
/* POST register user (doctor / patient) */
router.post("/register/", function (req, res, next) {
  //VALIDATION
  req
    .checkBody("email", "The email you entered is invalid, please try again.")
    .isEmail()
    .normalizeEmail();
  req
    .checkBody(
      "email",
      "Email address must be between 4-100 characters long, please try again."
    )
    .len(4, 100);
  req
    .checkBody("password", "Password must be between 6-50 characters long.")
    .len(6, 50);
  //req.checkBody("password", "Password must include one lowercase character, one uppercase character, a number, and a special character.").matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!.* )(?=.*[^a-zA-Z0-9]).{8,}$/, "i");

  const errors = req.validationErrors();

  if (errors) {
    res.status(400);
    res.send({ code: "#A001", message: "Validation Error", list: errors });
  } else {
    //Valid Data
    const email = req.body.email;
    const password = req.body.password;

    // Store user in the databse
    mysqlpool.getConnection(function (err, conn) {
      if (err) {
        console.log(err);
        throw err;
      } else {
        //Check if the user already exists
        var sql_statement =
          "SELECT EXISTS(SELECT email FROM user WHERE email = ?) AS isexisting";
        conn.query(sql_statement, [email], function (err, result) {
          //No conn.release() here because it is used later
          if (err) {
            conn.release();
            res.status(500);
            res.send({ code: "#I001", message: "MySQL-Connection-Failed" });
            console.log(err);
            throw err;
            return;
          } else {
            if (result[0].isexisting == 0) {
              //User does not exist
              //Store new user in database

              //Hash the password
              bcrypt.genSalt(saltRounds, function (err, salt) {
                if (err) {
                  conn.release();
                  console.log(err);
                  res.status(500);
                  res.send({
                    code: "#I002",
                    message: "Password lead to hashing error.",
                  });
                } else {
                  bcrypt.hash(password, salt, function (err, hash) {
                    if (err) {
                      conn.release();
                      console.log(err);
                      res.status(500);
                      res.send({
                        code: "#I002",
                        message: "Password lead to hashing error.",
                      });
                    } else {
                      //Generate the Insert statement with hashed password
                      sql_statement =
                        "INSERT INTO user (email, pwdhash) VALUES (?, ?);";
                      conn.query(
                        sql_statement,
                        [email, hash],
                        function (err, result) {
                          //No conn.release() here because it is used later
                          if (err) {
                            conn.release();
                            throw err;
                          }
                          //Get the user to return him
                          sql_statement = "SELECT * FROM user WHERE email = ?";
                          conn.query(
                            sql_statement,
                            [email],
                            function (err, result) {
                              conn.release();
                              if (err) throw err;
                              var user = cleaner.userSqlCleaner(result);
                              //expires in 1 day
                              let exp = Date.now() + 1000 * 1 * 24 * 3600;
                              const token = jwt.sign(
                                { user, exp: exp },
                                jwtSecret
                              );

                              //Return
                              return res.json({
                                user,
                                token,
                                exp,
                              });
                            }
                          );
                        }
                      );
                    }
                  });
                }
              });
            } else {
              conn.release();
              //User already exist
              res.status(400);
              res.send({ code: "#A002", message: "User already exists." });
            }
          }
        });
      }
    });
  }
});

/* POST authenticateOIDC register or logins users that use open id connect */
router.post("/openid/", function (req, res, next) {
  //VALIDATION
  req
    .checkBody("email", "The email you entered is invalid, please try again.")
    .isEmail()
    .normalizeEmail();
  req
    .checkBody(
      "email",
      "Email address must be between 4-100 characters long, please try again."
    )
    .len(4, 100);

  const errors = req.validationErrors();

  if (errors) {
    res.status(400);
    res.send({ code: "#A001", message: "Validation Error", list: errors });
  } else {
    //Valid Data
    const email = req.body.email;
    if(!req.body.accesstoken){
      res.status(400);
      res.send({ code: "#A001", message: "Validation Error", list: errors });
      return;
    }
    let accessToken = req.body.accesstoken;
    //load User data from authenticator
    client.userinfo(accessToken)
    .then(function (userinfo) {
      //console.log('userinfo %j', userinfo);
      //Guard
      if(!userinfo.email || (userinfo.email && userinfo.email != email)){
        res.status(400);
        res.send({ code: "#A001", message: "Validation Error", list: errors });
        return;
      }

      //User is authenticated
      // Store user in the databse
    mysqlpool.getConnection(function (err, conn) {
      if (err) {
        console.log(err);
        throw err;
      } else {
        //Check if the user already exists
        var sql_statement =
          "SELECT EXISTS(SELECT email FROM user WHERE email = ?) AS isexisting";
        conn.query(sql_statement, [email], function (err, result) {
          //No conn.release() here because it is used later
          if (err) {
            conn.release();
            res.status(500);
            res.send({ code: "#I001", message: "MySQL-Connection-Failed" });
            console.log(err);
            throw err;
            return;
          } else {
            if (result[0].isexisting == 0) {
              //User does not exist
              //Store new user in database
              //Generate the Insert statement with hashed password
              sql_statement =
                "INSERT INTO user (email) VALUES (?);";
              conn.query(sql_statement, [email], function (err, result) {
                //No conn.release() here because it is used later
                if (err) {
                  conn.release();
                  throw err;
                }
                //Get the user to return him
                sql_statement = "SELECT * FROM user WHERE email = ?";
                conn.query(sql_statement, [email], function (err, result) {
                  conn.release();
                  if (err) throw err;
                  var user = cleaner.userSqlCleaner(result);
                  //expires in 1 day
                  let exp = Date.now() + 1000 * 1 * 24 * 3600;
                  const token = jwt.sign({ user, exp: exp }, jwtSecret);

                  //Return
                  return res.json({
                    user,
                    token,
                    exp,
                  });
                });
              });
            } else {
              //User already exist
              //Get the user to return him
              sql_statement = "SELECT * FROM user WHERE email = ?";
              conn.query(sql_statement, [email], function (err, result) {
                conn.release();
                if (err) throw err;
                var user = cleaner.userSqlCleaner(result);
                //expires in 1 day
                let exp = Date.now() + 1000 * 1 * 24 * 3600;
                const token = jwt.sign({ user, exp: exp }, jwtSecret);

                //Return
                return res.json({
                  user,
                  token,
                  exp,
                });
              });
            }
          }
        });
      }
    });

    })
    .catch(function (error){
      res.status(400);
      res.send({ code: "#A001", message: "Validation Error - AccessToken incorrect"});
      return;
    });
  }
});

/* POST login. */
router.post("/login/", function (req, res, next) {
  passport.authenticate("local", { session: false }, (err, user, info) => {
    if (err || !user) {
      //console.log(err);
      return res.status(400).json({
        code: "#A003",
        message: "Invalid Login",
      });
    }

    req.login(user, { session: false }, (err) => {
      if (err) {
        //console.log(err);
        res.send({ code: "A003", message: err.message });
      }
      //expires in a day
      let exp = Date.now() + 1000 * 1 * 24 * 3600;
      const token = jwt.sign({ user, exp: exp }, jwtSecret);
      return res.json({ user, token, exp: exp });
    });
  })(req, res);
});

module.exports = router;
