var express = require('express');
var router = express.Router();
const jwt = require("jsonwebtoken");
const mysqlpool = require('../db');
const jwtSecret = process.env.JWT_SECRET || "your_jwt_secret";
const fs = require('fs');

//in /

router.get("/presentation", (req, res)=>{
    //Validate Parameters
    if(!req.query.invitationtoken){
        res.status(400);
        res.send({code: "#D001", message: "Invitation token is missing."});
        return;
    }

    //Read token
    let invToken;
    try{
        invToken = jwt.decode(req.query.invitationtoken);
    }catch{
        res.status(400);
        res.send({code: "#A006", message: "Token not accepted."});
        return;
    }

    //Validate token
    if(!invToken.exp || (invToken.exp && invToken.exp < Date.now())){
        res.status(400);
        res.send({code: "#A007", message: "Token is expired."});
        return;
    }
    if(!invToken.iduser){
        res.status(400);
        res.send({code: "#A006", message: "Token not accepted."});
        return;
    }
    if(!invToken.idpresentation){
        res.status(400);
        res.send({code: "#A006", message: "Token not accepted."});
        return;
    }

    //Read presentation from db
    let sqlstatement = "SELECT * FROM presentation WHERE idpresentation = ?;";
    mysqlpool.getConnection((err, conn)=>{
        if(err){
            conn.release();
            res.status(500);
            res.send({code: "#I001", message: "MySQL-Connection-Failed"});
            console.log(err);
            throw err;
            return;
        }

        conn.query(sqlstatement, [invToken.idpresentation], (err, results)=>{
            if(err){
                conn.release();
                res.status(500);
                res.send({code: "#I001", message: "MySQL-Connection-Failed"});
                console.log(err);
                throw err;
                return;
            }

            conn.release();

            if(!results || results.length < 1){
                res.status(404);
                res.send({code: "#D002", message: "Presentation not found."});
                return;
            }

            let filePath = results[0].filepath;
            if(!fs.existsSync(filePath)){
                res.status(404);
                res.send({code: "#D002", message: "Presentation not found."});
                return;
            }

            //Send file as download
            res.download(filePath);
        });
    });
});

router.get("/presentation/photonroom", (req, res)=>{
    //Validate Parameters
    if(!req.query.invitationtoken){
        res.status(400);
        res.send({code: "#D001", message: "Invitation token is missing."});
        return;
    }

    //Read token
    let invToken;
    try{
        invToken = jwt.decode(req.query.invitationtoken);
    }catch{
        res.status(400);
        res.send({code: "#A006", message: "Token not accepted."});
        return;
    }

    //Validate token
    if(!invToken.exp || (invToken.exp && invToken.exp < Date.now())){
        res.status(400);
        res.send({code: "#A007", message: "Token is expired."});
        return;
    }
    if(!invToken.iduser){
        res.status(400);
        res.send({code: "#A006", message: "Token not accepted."});
        return;
    }
    if(!invToken.idpresentation){
        res.status(400);
        res.send({code: "#A006", message: "Token not accepted."});
        return;
    }

    //Read present from db
    let sqlstatement = "SELECT * FROM present WHERE iduser = ? AND idpresentation = ?;";
    mysqlpool.getConnection((err, conn)=>{
        if(err){
            conn.release();
            res.status(500);
            res.send({code: "#I001", message: "MySQL-Connection-Failed"});
            console.log(err);
            throw err;
            return;
        }

        conn.query(sqlstatement, [invToken.iduser, invToken.idpresentation], (err, results)=>{
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
                res.status(404);
                res.send({code: "#D002", message: "Presentation not found."});
                return;
            }

            if(!results[0].photonroomname || results[0].photonroomname == ""){
                conn.release();
                res.status(500);
                res.send({code: "'D003", message: "Photon Room not set."});
                return;
            }

            res.status(200);
            res.send({photonroomname: results[0].photonroomname, message: "Photon Room name found."});
        });
    });
    //Filter inactive presentations

    //Send photon room
});

router.get("/presentation/shortCode", (req, res)=>{
    //Validate Parameters
    if(!req.query.shortCode){
        res.status(400);
        res.send({code: "#D001", message: "shortCode is missing."});
        return;
    }

    //Read presentation id
    mysqlpool.getConnection((err, conn) =>{
        if(err){
            conn.release();
            res.status(500);
            res.send({code: "#I001", message: "MySQL-Connection-Failed"});
            console.log(err);
            throw err;
            return;
        }

        let sqlstatement = "SELECT * FROM present WHERE shortCode = ? AND status = 1;";
        conn.query(sqlstatement, [req.query.shortCode], (err, results)=>{
            if(err){
                conn.release();
                res.status(500);
                res.send({code: "#I001", message: "MySQL-Connection-Failed"});
                console.log(err);
                throw err;
                return;
            }

            if(!results || results.length < 1){
                res.status(404);
                res.send({code: "#D004", message: "No active Presentation found"});
                return;
            }

            let idPresentation = "";
            if(results[results.length - 1] && results[results.length - 1].idpresentation){
                idPresentation = results[results.length - 1].idpresentation;
            }else{
                res.status(404);
                res.send({code: "#D004", message: "No active Presentation found"});
                return;
            }

            //Read presentation from db
            let sqlstatement = "SELECT * FROM presentation WHERE idpresentation = ?;";

            conn.query(sqlstatement, [idPresentation], (err, results)=>{
                if(err){
                    conn.release();
                    res.status(500);
                    res.send({code: "#I001", message: "MySQL-Connection-Failed"});
                    console.log(err);
                    throw err;
                    return;
                }
    
                conn.release();
    
                if(!results || results.length < 1){
                    res.status(404);
                    res.send({code: "#D002", message: "Presentation not found."});
                    return;
                }
    
                let filePath = results[0].filepath;
                if(!fs.existsSync(filePath)){
                    res.status(404);
                    res.send({code: "#D002", message: "Presentation not found."});
                    return;
                }
    
                //Send file as download
                res.download(filePath);
            });
        });
    });
});

router.get("/presentation/connectioninfos/shortCode", (req, res)=>{
    //Validate Parameters
    if(!req.query.shortCode){
        res.status(400);
        res.send({code: "#D001", message: "shortCode is missing."});
        return;
    }

    //Read presentation id
    mysqlpool.getConnection((err, conn) =>{
        if(err){
            conn.release();
            res.status(500);
            res.send({code: "#I001", message: "MySQL-Connection-Failed"});
            console.log(err);
            throw err;
            return;
        }

        let sqlstatement = "SELECT * FROM present WHERE shortCode = ? AND status = 1;";
        conn.query(sqlstatement, [req.query.shortCode], (err, results)=>{
            if(err){
                conn.release();
                res.status(500);
                res.send({code: "#I001", message: "MySQL-Connection-Failed"});
                console.log(err);
                throw err;
                return;
            }

            if(!results || results.length < 1){
                res.status(404);
                res.send({code: "#D004", message: "No active Presentation found"});
                return;
            }

            conn.release();

            res.status(200);
            res.send(results[results.length - 1]);
        });
    });
});

module.exports = router;