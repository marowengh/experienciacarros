const db = require('./database');

const alterQuery = "ALTER TABLE carros.reservas ADD COLUMN usuario_id INT, ADD FOREIGN KEY (usuario_id) REFERENCES carros.usuarios(id);";

db.query(alterQuery, (err, result) => {
    if (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
             console.log("Column already exists.");
        } else {
             console.error("Error altering table:", err);
        }
    } else {
        console.log("Table altered successfully.");
    }
    process.exit();
});
