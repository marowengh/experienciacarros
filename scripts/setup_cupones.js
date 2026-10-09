require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../database');

const createTableQuery = `
CREATE TABLE IF NOT EXISTS cupones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE,
  descuento_porcentaje INT,
  limite_usos INT,
  usos_actuales INT DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE
)
`;

db.query(createTableQuery, (err) => {
  if (err) {
    console.error("Error al crear la tabla cupones:", err);
    process.exit(1);
  }
  console.log("Tabla 'cupones' creada exitosamente.");

  // Insertar cupón de prueba
  const insertQuery = `INSERT IGNORE INTO cupones (codigo, descuento_porcentaje, limite_usos) VALUES ('FAMILIA15', 15, 4)`;
  db.query(insertQuery, (err2) => {
    if (err2) {
        console.error("Error al insertar el cupón:", err2);
    } else {
        console.log("Cupón FAMILIA15 insertado con éxito.");
    }
    db.end();
  });
});
