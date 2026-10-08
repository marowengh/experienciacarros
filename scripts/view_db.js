const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'mysql-247236df-marowengonzaleshl-b3c7.d.aivencloud.com',
  user: 'avnadmin',
  password: 'AVNS_hzDZiw_5MLx-CR6dppr',
  database: 'defaultdb',
  port: 18521,
  ssl: { rejectUnauthorized: false }
});

connection.connect((err) => {
  if (err) {
    console.error('Error conectando a la BD:', err);
    return;
  }
  
  console.log('--- DATOS EN LA NUBE (AIVEN) ---');
  
  connection.query('SELECT id, nombre, apellidos, email, telefono FROM usuarios', (err, usuarios) => {
    if (err) throw err;
    console.log('\n👤 USUARIOS REGISTRADOS:');
    console.table(usuarios);

    connection.query('SELECT id, origen, destino, precio FROM viajes', (err, viajes) => {
      if (err) throw err;
      console.log('\n🚌 VIAJES REGISTRADOS:');
      console.table(viajes);
      
      connection.end();
    });
  });
});
