var express = require('express');
var router = express.Router();
const mysqlpool = require("../db");
const cleaner = require("../sql-cleaner");
const fs = require('fs');
const jwt = require("jsonwebtoken");
const jwtSecret = process.env.JWT_SECRET || "your_jwt_secret";


//in /

/* POST new presentation */
router.post("/presentation", (req, res)=>{
    //vallidate body
    if(!req.body.name){
        res.status(400);
        res.send({code: "#D001", message: "Name is missing."});
        return;
    }

    //create new entry in table presentation
    mysqlpool.getConnection((err, conn) =>{
        if(err){
            conn.release();
            res.status(500);
            res.send({code: "#I001", message: "MySQL-Connection-Failed"});
            console.log(err);
            throw err;
            return;
        }

        let sqlstatement = "INSERT INTO presentation (name, timeofcreation) VALUES (?, ?);";
        let timeofcreation = Date.now();
        conn.query(sqlstatement, [req.body.name, timeofcreation], (err, results)=>{
            if(err){
                conn.release();
                res.status(500);
                res.send({code: "#I001", message: "MySQL-Connection-Failed"});
                console.log(err);
                throw err;
                return;
            }

            //save the presentation id
            idOfNewPresentation = results.insertId;
            
            //create new entry in table own
            let sqlstatement = "INSERT INTO own (iduser, idpresentation) VALUES (?, ?);";
            conn.query(sqlstatement, [req.user.iduser, idOfNewPresentation], (err, results)=>{
                if(err){
                    conn.release();
                    res.status(500);
                    res.send({code: "#I001", message: "MySQL-Connection-Failed"});
                    console.log(err);
                    throw err;
                    return;
                }

                conn.release();
                res.status(200);
                res.send({idpresentation: idOfNewPresentation, message: `Entry of the new presentation -${req.body.name}- was created successfully on the server.`});
            });
        });
    });

    

    
    
});

router.post("/presentation/upload", (req, res)=>{
    //validate body
    if(!req.body.idpresentation || (req.body.idpresentation && Number.isNaN(req.body.idpresentation))){
        res.status(400);
        res.send({code: "#D001", message: "Name is missing."});
        return;
    }

    //check whether the user is the owner of the presentation
    mysqlpool.getConnection((err, conn)=>{
        if(err){
            conn.release();
            res.status(500);
            res.send({code: "#I001", message: "MySQL-Connection-Failed"});
            console.log(err);
            throw err;
            return;
        }

        let sqlstatement = "SELECT * FROM own INNER JOIN presentation ON own.idpresentation = presentation.idpresentation WHERE own.idpresentation = ? AND iduser = ?;";
        conn.query(sqlstatement, [req.body.idpresentation, req.user.iduser], (err, results)=>{
            if(err){
                conn.release();
                res.status(500);
                res.send({code: "#I001", message: "MySQL-Connection-Failed"});
                console.log(err);
                throw err;
                return;
            }

            if(results.length < 1){
                conn.release();
                res.status(403);
                res.send({code: "#A005", message: "Permission denied. You are not the owner of the presentation."});
                return;
            }

            let oldsavingLocation = "";
            if(results[0].filepath){
                oldsavingLocation = results[0].filepath;
            }

            //validate fileupload
            if (req.files && Object.keys(req.files).length != 1 && req.files.presentation && (req.files.presentation.mimetype.split("/")[1] == "impres" || req.files.presentation.mimetype.split("/")[1] == "pres" || req.files.presentation.mimetype.split("/")[1] == "zip")) {
                conn.release();
                res.status(400); 
                res.send({code: "#D001", message: "The presentation file was not uploaded or is not type .impres .pres or .zip"});
                return;
            }

            //save uploaded file
            if(!process.env.PRES_DIR){
                conn.release();
                res.status(500);
                res.send({code: "#I003", message: "Internal Error when saving the file."});
                return;
            }
            let destination = "" + process.env.PRES_DIR + req.user.iduser + "_" + req.body.idpresentation + "_" + req.files.presentation.name;
            //remove old saving location of the location differs - to prevent dead files
            if(oldsavingLocation != "" && oldsavingLocation != destination){
                //check whether the file exist
                try {
                    if (fs.existsSync(oldsavingLocation)) {
                      //delte the file
                      fs.unlink(oldsavingLocation, function (err) {
                        if (err) console.log(err);
                    }); 
                    }
                } catch(err) {
                    //log the error and continue saving
                    console.error(err)
                }
            }
            req.files.presentation.mv(destination, (err)=>{
                if(err){
                    conn.release();
                    res.status(500);
                    res.send({code: "#I003", message: "Internal Error when moving the file to the destination on the server."});
                    return;
                }

                //store presentation location in the database
                let sqlstatement = "UPDATE presentation SET filepath = ?, lastchange = ? WHERE idpresentation = ?;";
                conn.query(sqlstatement, [destination, Date.now(), req.body.idpresentation], (err, results)=>{
                    if(err){
                        conn.release();
                        res.status(500);
                        res.send({code: "#I001", message: "MySQL-Connection-Failed"});
                        console.log(err);
                        throw err;
                        return;
                    }

                    conn.release();
                    res.status(200);
                    res.send({message: "Presentation uploaded successfully."});
                });
            });
        });
    });
});

router.post("/presentation/start", (req, res)=>{
    //Validate body
    if(!req.body.idpresentation || (req.body.idpresentation && Number.isNaN(req.body.idpresentation))){
        res.status(400);
        res.send({code: "#D001", message: "idpresentation is missing or not a number."});
        return;
    }
    //Optinal body
    let exp;
    if(!req.body.expoffsetmillsek || (req.body.expoffsetmillsek && Number.isNaN(req.body.expoffsetmillsek))){
        //default
        exp = Date.now() + 1000 * 365 * 24 * 3600;
    }else{
        exp = Date.now() + parseInt(req.body.expoffsetmillsek);
    }

    //Check ownership
    mysqlpool.getConnection((err, conn)=>{
        if(err){
            conn.release();
            res.status(500);
            res.send({code: "#I001", message: "MySQL-Connection-Failed"});
            console.log(err);
            throw err;
            return;
        }

        let sqlstatement = "SELECT * FROM own INNER JOIN presentation ON own.idpresentation = presentation.idpresentation WHERE own.idpresentation = ? AND iduser = ?;";
        conn.query(sqlstatement, [req.body.idpresentation, req.user.iduser], (err, results)=>{
            if(err){
                conn.release();
                res.status(500);
                res.send({code: "#I001", message: "MySQL-Connection-Failed"});
                console.log(err);
                throw err;
                return;
            }

            if(results.length < 1){
                conn.release();
                res.status(403);
                res.send({code: "#A005", message: "Permission denied. You are not the owner of the presentation."});
                return;
            }

            //Create a Photon Room Name
            //ToDo
            let photonRoomName = "R_" + req.user.iduser + "_" + req.body.idpresentation;

            //Create jwt for guest invitation
            let invitationToken = jwt.sign({idpresentation: req.body.idpresentation, iduser: req.user.iduser, exp: exp}, jwtSecret);

            //Update presentation status
            let sqlstatement = "UPDATE present SET status = 1, photonroomname = ? WHERE iduser = ? AND idpresentation = ?;";
            conn.query(sqlstatement, [photonRoomName, req.user.iduser, req.body.idpresentation], (err, results)=>{
                if(err){
                    conn.release();
                    res.status(500);
                    res.send({code: "#I001", message: "MySQL-Connection-Failed"});
                    console.log(err);
                    throw err;
                    return;
                }

                //Check affected rows
                if(results.affectedRows >= 1){
                    //all done
                    conn.release();
                    res.status(200);
                    res.send({photonRoomName: photonRoomName, invitationToken: invitationToken, exp: exp, message: "The presentation started successfully."});
                    return;
                }

                //Insert new presentation relation in case no row was affected
                let sqlstatement = "INSERT INTO present (iduser, idpresentation, status, photonroomname) VALUES (?, ?, 1, ?);"
                conn.query(sqlstatement, [req.user.iduser, req.body.idpresentation, photonRoomName], (err, resulst)=>{
                    if(err){
                        conn.release();
                        res.status(500);
                        res.send({code: "#I001", message: "MySQL-Connection-Failed"});
                        console.log(err);
                        throw err;
                        return;
                    }

                    conn.release();
                    res.status(200);
                    res.send({photonRoomName: photonRoomName, invitationToken: invitationToken, exp: exp, message: "The presentation started successfully."});
                });
            });

        });
    });
});

router.post("/presentation/stop", (req, res)=>{
    //Validate body
    if(!req.body.idpresentation || (req.body.idpresentation && Number.isNaN(req.body.idpresentation))){
        res.status(400);
        res.send({code: "#D001", message: "idpresentation is missing or not a number."});
        return;
    }

    //Check ownership
    mysqlpool.getConnection((err, conn)=>{
        if(err){
            conn.release();
            res.status(500);
            res.send({code: "#I001", message: "MySQL-Connection-Failed"});
            console.log(err);
            throw err;
            return;
        }

        let sqlstatement = "SELECT * FROM own INNER JOIN presentation ON own.idpresentation = presentation.idpresentation WHERE own.idpresentation = ? AND iduser = ?;";
        conn.query(sqlstatement, [req.body.idpresentation, req.user.iduser], (err, results)=>{
            if(err){
                conn.release();
                res.status(500);
                res.send({code: "#I001", message: "MySQL-Connection-Failed"});
                console.log(err);
                throw err;
                return;
            }

            if(results.length < 1){
                conn.release();
                res.status(403);
                res.send({code: "#A005", message: "Permission denied. You are not the owner of the presentation."});
                return;
            }

            //Get the Photon Room
            let sqlstatement = "SELECT * FROM present WHERE iduser = ? AND idpresentation = ?;";
            conn.query(sqlstatement, [req.user.iduser, req.body.idpresentation], (err, results)=>{
                if(err){
                    conn.release();
                    res.status(500);
                    res.send({code: "#I001", message: "MySQL-Connection-Failed"});
                    console.log(err);
                    throw err;
                    return;
                }

                if(!results[0].photonroomname){
                    conn.release();
                    res.status(500);
                    res.send({code: "#I004", message: "No Photon Room associated."});
                    return;
                }

                let photonRoomName = results[0].photonroomname;

                //Update presentation status
                let sqlstatement = "UPDATE present SET status = 2, photonroomname = ? WHERE iduser = ? AND idpresentation = ?;";
                conn.query(sqlstatement, [photonRoomName, req.user.iduser, req.body.idpresentation], (err, results)=>{
                    if(err){
                        conn.release();
                        res.status(500);
                        res.send({code: "#I001", message: "MySQL-Connection-Failed"});
                        console.log(err);
                        throw err;
                        return;
                    }

                    //Check affected rows
                    if(results.affectedRows >= 1){
                        //all done
                        conn.release();
                        res.status(200);
                        res.send({photonroomname: photonRoomName, message: "The presentation stopped successfully."});
                        return;
                    }

                    //Insert new presentation relation in case no row was affected
                    let sqlstatement = "INSERT INTO present (iduser, idpresentation, status, photonroomname) VALUES (?, ?, 2, ?);"
                    conn.query(sqlstatement, [req.user.iduser, req.body.idpresentation, photonRoomName], (err, resulst)=>{
                        if(err){
                            conn.release();
                            res.status(500);
                            res.send({code: "#I001", message: "MySQL-Connection-Failed"});
                            console.log(err);
                            throw err;
                            return;
                        }

                        conn.release();
                        res.status(200);
                        res.send({photonroomname: photonRoomName, message: "The presentation stopped successfully."});
                    });
                });
            });
        });
    });
});

router.get("/presentation/invitationlink", (req, res)=>{
    //Validate body
    if(!req.body.idpresentation || (req.body.idpresentation && Number.isNaN(req.body.idpresentation))){
        res.status(400);
        res.send({code: "#D001", message: "idpresentation is missing or not a number."});
        return;
    }

    //Optional body
    let exp;
    if(!req.body.expoffsetmillsek || (req.body.expoffsetmillsek && Number.isNaN(req.body.expoffsetmillsek))){
        //default
        exp = Date.now() + 1000 * 365 * 24 * 3600;
    }else{
        exp = Date.now() + parseInt(req.body.expoffsetmillsek);
    }

    //Check ownership
    let sqlstatement = "SELECT * FROM own INNER JOIN presentation ON own.idpresentation = presentation.idpresentation WHERE own.idpresentation = ? AND iduser = ?;";
    mysqlpool.getConnection((err, conn)=>{
        if(err){
            conn.release();
            res.status(500);
            res.send({code: "#I001", message: "MySQL-Connection-Failed"});
            console.log(err);
            throw err;
            return;
        }

        conn.query(sqlstatement, [req.body.idpresentation, req.user.iduser], (err, results)=>{
            if(err){
                conn.release();
                res.status(500);
                res.send({code: "#I001", message: "MySQL-Connection-Failed"});
                console.log(err);
                throw err;
                return;
            }

            if(!results || results.length < 1){
                conn.release();
                res.status(403);
                res.send({code: "#A005", message: "Permission denied. You are not the owner of the presentation."});
                return;
            }

            //Check whether present relation already initialized
            let sqlstatement = "SELECT * FROM present WHERE iduser = ? AND idpresentation = ?;"
            conn.query(sqlstatement, [req.user.iduser, req.body.idpresentation], (err, results)=>{
                if(err){
                    conn.release();
                    res.status(500);
                    res.send({code: "#I001", message: "MySQL-Connection-Failed"});
                    console.log(err);
                    throw err;
                    return;
                }

                if(results && results.length > 0){
                    //The present relation exists and can be left as it is
                    //Create jwt for guest invitation
                    let invitationToken = jwt.sign({idpresentation: req.body.idpresentation, iduser: req.user.iduser, exp: exp}, jwtSecret);
                    conn.release();
                    res.status(200);
                    res.send({invitationToken: invitationToken, message: "Invitation token successfully created."});
                    return;
                }

                //Initialize a new present relation
                let sqlstatement = "INSERT INTO present (iduser, idpresentation, status) VALUES (?, ?, 2);";
                conn.query(sqlstatement, [req.user.iduser, req.body.idpresentation], (err, results)=>{
                    if(err){
                        conn.release();
                        res.status(500);
                        res.send({code: "#I001", message: "MySQL-Connection-Failed"});
                        console.log(err);
                        throw err;
                        return;
                    }

                    //Create jwt for guest invitation
                    let invitationToken = jwt.sign({idpresentation: req.body.idpresentation, iduser: req.user.iduser, exp: exp}, jwtSecret);
                    conn.release();
                    res.status(200);
                    res.send({invitationToken: invitationToken, message: "Invitation token successfully created."});
                    return;
                });
            });
        });
    });
});

module.exports = router;