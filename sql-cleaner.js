//Cleaner

var cleaner = {
    doctorSqlCleaner: function (sqldoc) {
        //TODO: clean doctor data...
        var cleanDoc = {};

        if (sqldoc.length >= 1) {
            //Copy the relevant Data
            cleanDoc.role = "doctor";
            cleanDoc.doctors_id = sqldoc[0].doctors_id;
            cleanDoc.doctorgroups_id = sqldoc[0].doctorgroups_id;
            cleanDoc.email = sqldoc[0].email;
            cleanDoc.contactemail = sqldoc[0].contactemail;
            cleanDoc.name = sqldoc[0].name;
            cleanDoc.profilepic = sqldoc[0].profilepic;
            cleanDoc.logo = sqldoc[0].logo;
            cleanDoc.desheadline = sqldoc[0].desheadline;
            // if(sqldoc[0].images){
            //   cleanDoc.images = sqldoc[0].images.split(",");
            // }else{
            //   cleanDoc.images = null;
            // }
            //With pic1 - pic5 in database
            cleanDoc.images = [];
            if (sqldoc[0].pic1 != null) {
                cleanDoc.images.push(sqldoc[0].pic1);
            }
            if (sqldoc[0].pic2 != null) {
                cleanDoc.images.push(sqldoc[0].pic2);
            }
            if (sqldoc[0].pic3 != null) {
                cleanDoc.images.push(sqldoc[0].pic3);
            }
            if (sqldoc[0].pic4 != null) {
                cleanDoc.images.push(sqldoc[0].pic4);
            }
            if (sqldoc[0].pic5 != null) {
                cleanDoc.images.push(sqldoc[0].pic5);
            }
            //Wenn kein Bild vorhanden soll null da stehen
            if (cleanDoc.images.length == 0) {
                cleanDoc.images = null;
            }
            cleanDoc.fax = sqldoc[0].fax;
            cleanDoc.openinghours = sqldoc[0].openinghours;
            cleanDoc.subtitle = sqldoc[0].subtitle;
            cleanDoc.shortdes = sqldoc[0].shortdes;
            cleanDoc.longdes = sqldoc[0].longdes;
            cleanDoc.lat = sqldoc[0].lat;
            cleanDoc.lng = sqldoc[0].lng;
            cleanDoc.country = sqldoc[0].country;
            cleanDoc.city_id = sqldoc[0].mycity_id; //mycity in MYSQL
            cleanDoc.plz = sqldoc[0].plz;
            cleanDoc.street = sqldoc[0].street;
            cleanDoc.housenumber = sqldoc[0].housenumber;
            cleanDoc.phone = sqldoc[0].phone; //Maybe private
            cleanDoc.homepage = sqldoc[0].homepage;

            return cleanDoc;
        } else {
            return null;
        }
    },

    jwtDoctorSqlCleaner: function (sqldoc) {
        //TODO: clean doctor data...
        var cleanDoc = {};

        if (sqldoc.length >= 1) {
            //Copy the relevant Data
            cleanDoc.role = "doctor";
            cleanDoc.doctors_id = sqldoc[0].doctors_id;
            cleanDoc.doctorgroups_id = sqldoc[0].doctorgroups_id;
            cleanDoc.email = sqldoc[0].email;
            cleanDoc.name = sqldoc[0].name;
            return cleanDoc;
        } else {
            return null;
        }
    },

    patientSqlCleaner: function (sqlpatient) {
        var cleanPatient = {};

        if (sqlpatient.length >= 1) {
            //Copy the relevant Data
            cleanPatient.role = "patient";
            cleanPatient.patient_id = sqlpatient[0].patients_id;
            cleanPatient.email = sqlpatient[0].email;
            cleanPatient.firstname = sqlpatient[0].firstname;
            cleanPatient.lastname = sqlpatient[0].lastname;
            cleanPatient.city_id = sqlpatient[0].city; //mycity in MYSQL
            cleanPatient.plz = sqlpatient[0].plz;
            cleanPatient.street = sqlpatient[0].street;
            cleanPatient.housenumber = sqlpatient[0].housenumber;
            cleanPatient.phone = sqlpatient[0].phone; //Maybe private

            return cleanPatient;
        } else {
            return null;
        }
    },

    jwtPatientSqlCleaner: function (sqlpatient) {
        var cleanPatient = {};

        if (sqlpatient.length >= 1) {
            //Copy the relevant Data
            cleanPatient.role = "patient";
            cleanPatient.patient_id = sqlpatient[0].patients_id;
            cleanPatient.email = sqlpatient[0].email;
            cleanPatient.firstname = sqlpatient[0].firstname;
            cleanPatient.lastname = sqlpatient[0].lastname;
            return cleanPatient;
        } else {
            return null;
        }
    },

    userSqlCleaner: function (dbResult){
        var user = {};
        if(dbResult.length >= 1){
            //Copy only the relevant information
            user.iduser = dbResult[0].iduser;
            user.email = dbResult[0].email;

            return user;
        }else{
            return null;
        }
    }
};

module.exports = cleaner;
