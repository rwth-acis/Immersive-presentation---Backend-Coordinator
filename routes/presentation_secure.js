var express = require('express');
var router = express.Router();
const mysqlpool = require("../db");
const cleaner = require("../sql-cleaner");
const fs = require('fs');



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
    if(!req.body.idpresentation){
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


module.exports = router;