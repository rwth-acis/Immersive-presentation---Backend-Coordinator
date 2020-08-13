var nodemailer = require("nodemailer");
const Email = require("email-templates");

var mailTransport = nodemailer.createTransport({
    host: "smtp.Mailer.de",
    secureConnection: true,
    port: 465,
    auth: {
        user: "email@Mailer.de",
        pass: "pass"
    }
});

let email = new Email({
    message: {
        from: "email@Mailer.de"
    },
    send: true,
    transport: mailTransport,
    views: {
        options: {
            extension: "hbs"
        }
    }
});

var emailTemplate = require("email-templates").EmailTemplate;

var mailer = {
    transport: mailTransport,
    sendDefault: (pMailto, pSubject, pMsg) => {
        let config = {
            from: '"ImPres" <email@Mailer.de>',
            to: pMailto,
            subject: pSubject,
            text: pMsg
        };
        mailTransport.sendMail(config, function (err) {
            console.log("Error sending mail: " + error);
        });
    },

    sendVerifyHtmlEmail: (pMailto, pName, pMsg, pLink) => {
        email
            .send({
                template: "verifybutton",
                message: {
                    to: pMailto
                },
                locals: {
                    name: pName,
                    text: pMsg,
                    link: pLink
                }
            })
            .catch(console.error);
    },

    sendVerifyAppointmentEmail: (
        pMailto,
        pName,
        pDate,
        pClock,
        pDocname,
        pVerifylink,
        pCancellink
    ) => {
        email
            .send({
                template: "verifytermin",
                message: {
                    to: pMailto
                },
                locals: {
                    name: pName,
                    date: pDate,
                    clock: pClock,
                    docname: pDocname,
                    verifylink: pVerifylink,
                    cancellink: pCancellink
                }
            })
            .catch(console.error);
    },

    sendCancelationEmail: (
        pMailto,
        pName,
        pDate,
        pClock,
        pDocname,
        pVerifylink
    ) => {
        email
            .send({
                template: "termincancelinfopatient",
                message: {
                    to: pMailto
                },
                locals: {
                    name: pName,
                    date: pDate,
                    clock: pClock,
                    docname: pDocname,
                    verifylink: pVerifylink
                }
            })
            .catch(console.error);
    },

    sendVerifyAppointmentEmailWithAnamnese: (
        pMailto,
        pName,
        pDate,
        pClock,
        pDocname,
        pVerifylink,
        pCancellink,
        anamnesePath
    ) => {
        email
            .send({
                template: "verifytermin",
                message: {
                    to: pMailto,
                    attachments: [
                        {
                            filename: "Anamnesebogen.pdf",
                            path: anamnesePath
                        }
                    ]
                },
                locals: {
                    name: pName,
                    date: pDate,
                    clock: pClock,
                    docname: pDocname,
                    verifylink: pVerifylink,
                    cancellink: pCancellink
                }
            })
            .catch(console.error);
    },

    sendVerifyEmailadress: (pMailto, pVerifylink) => {
        email
            .send({
                template: "verifyemailadress",
                message: {
                    to: pMailto
                },
                locals: {
                    link: pVerifylink
                }
            })
            .catch(console.error);
    },

    sendDoctorNotification: (
        pMailto,
        pDocname,
        pDate,
        pClock,
        pName,
        pPhone,
        pMail
    ) => {
        email
            .send({
                template: "notifydoc",
                message: {
                    to: pMailto
                },
                locals: {
                    docname: pDocname,
                    name: pName,
                    date: pDate,
                    clock: pClock,
                    mail: pMail,
                    phone: pPhone
                }
            })
            .catch(console.error);
    }
};

module.exports = mailer;
