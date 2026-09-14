const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Musanqenqa@2001',
  database: 'campus_swap_project'
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
  } else {
    console.log('Connected to MySQL Database: campus_swap_project');
  }
});

module.exports = db;