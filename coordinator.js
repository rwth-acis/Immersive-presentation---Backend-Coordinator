// ImPres Coordinator 0.1
const version = 0.1;
require("dotenv").load();
const express = require("express");
require("./passport");
const path = require("path");
const mysqlpool = require("./db.js");
const cleaner = require("./sql-cleaner.js");
var bodyParser = require("body-parser");
var expressValidator = require("express-validator");
const passport = require("passport");
const mailer = require("./tools/mailer");
const cors = require("cors");
var hbs = require("express-handlebars");
const fileUpload = require("express-fileupload");
const jwt = require("jsonwebtoken");
const jwtSecret = process.env.JWT_SECRET || "your_jwt_secret";
const port = process.env.PORT || 8080;

var production = true;
if (process.env.PRODUCTION && process.env.PRODUCTION == "0") {
    production = false;
}

var maxFilesize = 1 * 1024 * 1024 * 1024 //1GB is default max file upload
if (process.env.MAXFILESIZE) {
    maxFilesize = process.env.MAXFILESIZE;
}

const app = express();
app.engine("hbs", hbs({ extname: "hbs" }));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(expressValidator());
app.use(cors());
app.use(
    fileUpload({
        limits: { fileSize: maxFilesize }
    })
);

const user = require("./routes/auth/user");
const auth = require("./routes/auth/auth");
const refrehtoke = require("./routes/auth/refrehtoken");
const presentation_secure = require("./routes/presentation_secure");
const presentation = require("./routes/presentation");


//Allow Origin setzen bevor rest passiert
app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Request methods you wish to allow
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS, PUT, PATCH, DELETE"
    );

    // Request headers you wish to allow
    res.setHeader(
        "Access-Control-Allow-Headers",
        "X-Requested-With,content-type"
    );

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader("Access-Control-Allow-Credentials", true);

    // Pass to next layer of middleware
    next();
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "info.html"));
});

app.use("/auth", auth);
app.use("/auth/user", passport.authenticate("jwt", { session: false }), user);
app.use(
    "/auth/refreshtoken",
    passport.authenticate("jwt", { session: false }),
    refrehtoke
);

app.use("/", presentation);

app.use("/", passport.authenticate("jwt", { session: false }), presentation_secure);


app.post("/contact/", (req, res) => {
    if (req.body.name && req.body.email && req.body.message) {
        mailer.sendDefault(
            "lukas.liss@rwth-aachen.de",
            "Contactform - " + req.body.name,
            " Antworten an " + req.body.email + " \n \n" + req.body.message
        );
        res.send("Done. We will answer soon.");
    } else {
        res.send("Please send name, email and a message.");
    }
});

app.get("/version/", (req, res) => {
    res.status(200);
    res.send(version.toString());
});


app.listen(port, () => {
    console.log(
        "Coordinator V." +
        version +
        " listens on port " +
        port +
        " in  mode production = " +
        production
    );
});


