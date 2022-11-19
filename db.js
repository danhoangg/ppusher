var mysql = require('mysql');

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "password",
  database: "sys"
});

function sql(sql, con) {
  con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log("sql successfully executed");
  });
});
}

sql("INSERT INTO UserTable (Username, Password, Email) VALUES ('Ravioli', 'password', 'oofolplex@gmail.com')", con)
