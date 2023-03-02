var mysql = require('mysql');

var config = {
    mysql_pool : mysql.createPool({
        host     : '',
        port     : '',
        user     : '',
        password : '',
        database : '',
        multipleStatements: true
    })
};

module.exports = config;