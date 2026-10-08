const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const connection = mysql.createConnection({
  host: 'mysql-247236df-marowengonzaleshl-b3c7.d.aivencloud.com',
  user: 'avnadmin',
  password: 'AVNS_hzDZiw_5MLx-CR6dppr',
  database: 'defaultdb',
  port: 18521,
  ssl: { rejectUnauthorized: false } // Para Aiven
});

connection.connect(async (err) => {
  if (err) {
    console.error('Error conectando:', err);
    return;
  }
  console.log('Conectado a la base de datos.');

  const email = 'admin@vision21.com';
  const password = 'admin'; // NUEVA CONTRASEÑA

  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    connection.query('SELECT * FROM usuarios WHERE email = ?', [email], (err, results) => {
      if (err) throw err;
      
      if (results.length > 0) {
        // Actualizar contraseña si ya existe
        connection.query('UPDATE usuarios SET password_hash = ? WHERE email = ?', [hash, email], (err) => {
          if (err) throw err;
          console.log(`Contraseña de ${email} actualizada a: ${password}`);
          connection.end();
        });
      } else {
        // Insertar si no existe
        connection.query('INSERT INTO usuarios (nombre, apellidos, email, password_hash) VALUES (?, ?, ?, ?)', 
          ['Admin', 'Principal', email, hash], (err) => {
          if (err) throw err;
          console.log(`Usuario ${email} creado con contraseña: ${password}`);
          connection.end();
        });
      }
    });
  } catch (error) {
    console.error(error);
    connection.end();
  }
});
