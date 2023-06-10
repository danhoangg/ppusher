var mysql = require('mysql');
const nodemailer = require('nodemailer');

var config = {
    mysql_pool: mysql.createPool({
        host: '',
        port: '',
        user: '',
        password: '',
        database: '',
        multipleStatements: true
    }),
    
    transporter: nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: 'ppusherwebsite@gmail.com', 
            pass: ''  
        },
        tls: {
            rejectUnauthorized: false
        }
    })

};

module.exports = config;