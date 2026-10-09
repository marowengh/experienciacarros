require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../database');

const query = `
ALTER TABLE reservas 
ADD COLUMN metodo_pago VARCHAR(50) DEFAULT 'Transferencia',
ADD COLUMN cupon_usado VARCHAR(50) DEFAULT NULL,
ADD COLUMN numero_operacion VARCHAR(100) DEFAULT NULL,
ADD COLUMN estado_pago VARCHAR(50) DEFAULT 'Pendiente'
`;

db.query(query, (err) => {
  if (err && err.code !== 'ER_DUP_FIELDNAME') {
    console.error("Error alterando tabla reservas:", err);
  } else {
    console.log("Columnas agregadas (o ya existían).");
  }
  process.exit(0);
});
