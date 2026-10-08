const mysql = require('mysql2');

const connection = mysql.createPool({
  host: process.env.DB_HOST || 'mysql-247236df-marowengonzaleshl-b3c7.d.aivencloud.com',
  user: process.env.DB_USER || 'avnadmin',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 18521,
  database: process.env.DB_NAME || 'defaultdb',
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

connection.getConnection((err, conn) => {
  if (err) {
    console.error('Error conectando a MySQL:', err);
    return;
  }
  console.log('Conectado a MySQL exitosamente.');
  conn.release();

  // La base de datos (defaultdb) ya está especificada en la conexión,
  // así que inicializamos las tablas directamente.
  inicializarTablas();
});

function inicializarTablas() {
  const createViajesTable = `
    CREATE TABLE IF NOT EXISTS viajes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      origen VARCHAR(255) NOT NULL,
      destino VARCHAR(255) NOT NULL,
      hora_salida VARCHAR(50) NOT NULL,
      hora_llegada VARCHAR(50) NOT NULL,
      servicio VARCHAR(255) NOT NULL,
      modelo_carro VARCHAR(100) DEFAULT 'Mercedes-Benz Sprinter',
      precio DECIMAL(10,2) NOT NULL,
      asientos_totales INT NOT NULL,
      asientos_disponibles INT NOT NULL
    )
  `;

  const createReservasTable = `
    CREATE TABLE IF NOT EXISTS reservas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      viaje_id INT NOT NULL,
      usuario_id INT,
      cliente_nombre VARCHAR(255) NOT NULL,
      cliente_documento VARCHAR(100),
      cantidad_pasajeros INT DEFAULT 1,
      cantidad_adultos INT DEFAULT 1,
      cantidad_ninos INT DEFAULT 0,
      ubicacion VARCHAR(50),
      fecha_viaje DATE NOT NULL,
      codigo_boleto VARCHAR(50) NOT NULL,
      precio_manual DECIMAL(10,2) DEFAULT NULL,
      total_pagado DECIMAL(10,2) DEFAULT 0.00,
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (viaje_id) REFERENCES viajes(id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `;

  const createDestinosTable = `
    CREATE TABLE IF NOT EXISTS destinos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      descripcion TEXT NOT NULL,
      tiempo_viaje VARCHAR(100) NOT NULL,
      frecuencia_salidas VARCHAR(100) NOT NULL,
      precio_base DECIMAL(10,2),
      clase_imagen VARCHAR(100) NOT NULL
    )
  `;

  const createUsuariosTable = `
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      apellidos VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      telefono VARCHAR(50),
      password_hash VARCHAR(255) NOT NULL,
      rol VARCHAR(20) DEFAULT 'user',
      foto VARCHAR(255),
      fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  connection.query(createViajesTable, (err) => {
    if (err) console.error('Error creando tabla viajes:', err);
    else {
      connection.query(createReservasTable, (err) => {
        if (err) console.error('Error creando tabla reservas:', err);
        else {
          connection.query(createDestinosTable, (err) => {
            if (err) console.error('Error creando tabla destinos:', err);
            else {
              connection.query(createUsuariosTable, (err) => {
                if (err) console.error('Error creando tabla usuarios:', err);
                else {
                  insertarDatosPrueba();
                  insertarDestinos();
                }
              });
            }
          });
        }
      });
    }
  });
}

function insertarDatosPrueba() {
  connection.query('SELECT COUNT(*) AS count FROM viajes', (err, results) => {
    if (err) {
      console.error('Error verificando datos de viajes:', err);
      return;
    }
    if (results[0].count > 0) {
      console.log('Los viajes ya están inicializados, saltando inserción de prueba.');
      return;
    }
    
    const clearQuery = `
      SET FOREIGN_KEY_CHECKS = 0;
      TRUNCATE TABLE reservas;
      TRUNCATE TABLE viajes;
      SET FOREIGN_KEY_CHECKS = 1;
    `;
    
    // Como connection.query no soporta multiples statements por defecto, usamos un workaround o los ejecutamos uno a uno
    connection.query('SET FOREIGN_KEY_CHECKS = 0', (err) => {
      connection.query('TRUNCATE TABLE reservas', (err) => {
        connection.query('TRUNCATE TABLE viajes', (err) => {
          connection.query('SET FOREIGN_KEY_CHECKS = 1', (err) => {
            
            console.log('Insertando datos masivos de viajes (horarios y servicios)...');
            
            // Generamos viajes para cada destino desde Ayacucho
            const destinosList = ['Lima', 'Huanta', 'Abancay', 'Cusco', 'Ica', 'Arequipa', 'San Miguel', 'La Mar', 'VRAE', 'Cangallo', 'Vinchos'];
            
            const valores = [];
            
            destinosList.forEach(dest => {
              // Mañana
              valores.push(`('Ayacucho', '${dest}', '06:00 AM', '02:00 PM', 'Económico', 'Mercedes-Benz Sprinter', 40.00, 45, 12)`);
              valores.push(`('Ayacucho', '${dest}', '08:30 AM', '04:30 PM', 'Cama 160°', 'Volvo 9800 2 Pisos', 60.00, 30, 8)`);
              
              // Tarde
              valores.push(`('Ayacucho', '${dest}', '01:00 PM', '09:00 PM', 'Servicio VIP', 'Scania Marcopolo G7', 90.00, 30, 2)`);
              valores.push(`('Ayacucho', '${dest}', '04:30 PM', '12:30 AM', 'Económico', 'Mercedes-Benz Sprinter', 40.00, 45, 45)`);
              
              // Noche
              valores.push(`('Ayacucho', '${dest}', '08:00 PM', '04:00 AM', 'Cama 160°', 'Volvo 9800 2 Pisos', 60.00, 30, 5)`);
              valores.push(`('Ayacucho', '${dest}', '10:30 PM', '06:30 AM', 'Servicio VIP', 'Scania Marcopolo G7', 90.00, 30, 20)`);
            });
            
            const insertData = `
              INSERT INTO viajes (origen, destino, hora_salida, hora_llegada, servicio, modelo_carro, precio, asientos_totales, asientos_disponibles)
              VALUES ${valores.join(',\n')}
            `;
            
            connection.query(insertData, (err) => {
              if (err) console.error('Error insertando datos masivos:', err);
              else console.log('✅ Base de datos de carros actualizada con éxito.');
            });
            
          });
        });
      });
    });
  });
}

function insertarDestinos() {
  connection.query('SELECT COUNT(*) AS count FROM destinos', (err, results) => {
    if (err) {
      console.error('Error verificando datos de destinos:', err);
      return;
    }
    if (results[0].count === 0) {
      console.log('Insertando datos iniciales en destinos...');
      const insertData = `
        INSERT INTO destinos (nombre, descripcion, tiempo_viaje, frecuencia_salidas, precio_base, clase_imagen)
        VALUES 
        ('Lima', 'La ciudad de los reyes. Gastronomía, modernidad y cultura en la capital.', '10h 30m', 'Diario · 6 salidas', 45.00, 'lima-photo'),
        ('Huanta', 'La esmeralda de los Andes. Clima cálido y paisajes inolvidables.', '1h 15m', 'Diario · cada hora', 8.00, 'huanta-photo'),
        ('Abancay', 'El cálido valle primaveral. Naturaleza e historia te esperan.', '8h 00m', 'Diario · 3 salidas', 35.00, 'abancay-photo'),
        ('Cusco', 'El ombligo del mundo. Conecta con la magia del imperio inca.', '12h 00m', 'Diario · 2 salidas', 55.00, 'cusco-photo'),
        ('Ica', 'Sol eterno, dunas misteriosas y buen vino. Un oasis de diversión.', '7h 00m', 'Diario · 4 salidas', 40.00, 'ica-photo'),
        ('Arequipa', 'La majestuosa ciudad blanca, arquitectura volcánica y sabor inigualable.', '14h 00m', 'Diario · 2 salidas', 60.00, 'arequipa-photo'),
        ('San Miguel', 'Cuna de artistas y hermosos paisajes en las alturas ayacuchanas.', '3h 00m', 'Diario · 3 salidas', 35.00, 'san-miguel-photo'),
        ('La Mar', 'Selva y sierra en un solo lugar. Belleza natural en su estado más puro.', '~4h', 'Consultar salidas', NULL, 'la-mar-photo'),
        ('VRAE', 'El corazón tropical del sur. Asombrosa biodiversidad y clima cálido.', '5h 00m', 'Diario · 2 salidas', 60.00, 'vrae-photo'),
        ('Cangallo', 'Tierra de héroes, cataratas impresionantes y caballos andinos.', '2h 00m', 'Diario · 3 salidas', 35.00, 'cangallo-photo'),
        ('Vinchos', 'Tradición ancestral, artesanía y paisajes andinos de ensueño.', '1h 30m', 'Diario · 3 salidas', 35.00, 'vinchos-photo')
      `;
      connection.query(insertData, (err) => {
        if (err) console.error('Error insertando destinos:', err);
      });
    }
  });
}

module.exports = connection;
