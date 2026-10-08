require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { OAuth2Client } = require('google-auth-library');

const CLIENT_ID = '976356891802-2hqn6dug38qsvogi4ebsr6dqfbimj8tk.apps.googleusercontent.com';
const googleClient = new OAuth2Client(CLIENT_ID);

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure imagenes directory exists
const uploadDir = path.join(__dirname, 'imagenes');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Setup multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Read filename from body or generate a default
        let customName = req.body.filename;
        if (customName) {
            // Prevent path traversal by keeping only the basename
            customName = path.basename(customName);
        }
        let finalName = customName ? customName : `recorte-${Date.now()}`;
        if (!finalName.endsWith('.png') && !finalName.endsWith('.jpg')) {
            finalName += '.png';
        }
        cb(null, finalName);
    }
});
const upload = multer({ storage: storage });

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(__dirname));

// Security: Helmet for HTTP Headers
// app.use(helmet({ 
//     contentSecurityPolicy: false, // CSP false by default to not break existing frontend inline scripts/styles
//     crossOriginOpenerPolicy: false, // Permitir popups de Google (OAuth)
//     crossOriginEmbedderPolicy: false, // Permitir iframes de Google (Botón)
//     crossOriginResourcePolicy: false, // Permitir recursos cruzados
//     referrerPolicy: false // Permitir enviar el Referer a Google para validar el origen
// }));

// Security: General Rate Limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Demasiadas peticiones desde esta IP, intente luego.' }
});
app.use('/api/', globalLimiter); // Apply to API routes only

// Security: Strict Rate Limiting for Auth
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Demasiados intentos, intente nuevamente en 15 minutos.' }
});

// Session Middleware
app.use(session({
    secret: 'visiontours-secret-key', // In prod, use environment variable
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // In production use true with HTTPS
        httpOnly: true, 
        sameSite: 'lax'
    }
}));

// Middleware to parse JSON in POST requests (moved up)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Pass session user to all views automatically
app.use((req, res, next) => {
    res.locals.usuario = req.session.usuario || null;
    next();
});

// Routes
app.get('/', (req, res) => {
    // Intentar cargar destinos de la base de datos
    db.query('SELECT * FROM destinos', (err, results) => {
        if (err) {
            console.error('Error al obtener destinos para la página principal:', err);
            // Renderizar con arreglo vacío si falla la BD para no romper la web
            return res.render('index', { destinos: [] });
        }
        res.render('index', { destinos: results });
    });
});

// Upload endpoint
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No image provided.');
    }
    res.json({ success: true, filename: req.file.filename, path: `/imagenes/${req.file.filename}` });
});

// Importar la base de datos MySQL
const db = require('./database');

// --- Rutas del Sistema de Reservas ---
app.get('/reservar', (req, res) => {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }
    res.render('reservar', { 
        origen: req.query.origen || 'Ayacucho', 
        destino: req.query.destino || 'Lima', 
        fecha: req.query.fecha || new Date().toISOString().split('T')[0] 
    });
});

app.get('/api/buses', (req, res) => {
    const { origen, destino } = req.query;
    
    let sql = 'SELECT * FROM viajes';
    const params = [];
    
    if (origen && destino) {
        sql += ' WHERE origen = ? AND destino = ?';
        params.push(origen, destino);
    }
    
    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error al obtener buses:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        res.json(results);
    });
});

app.get('/api/destinos', (req, res) => {
    db.query('SELECT * FROM destinos', (err, results) => {
        if (err) {
            console.error('Error al obtener destinos:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        res.json(results);
    });
});

// Middleware para parsear JSON en el POST
app.use(express.json());

app.post('/api/reserva', (req, res) => {
    const { viaje_id, nombre, documento, fecha, cantidad, cantidad_adultos, cantidad_ninos, ubicacion, totalPago } = req.body;
    
    if (typeof viaje_id !== 'string' && typeof viaje_id !== 'number' || typeof nombre !== 'string' || typeof documento !== 'string' || typeof fecha !== 'string') {
        return res.status(400).json({ error: 'Formato de datos inválido' });
    }

    if (!viaje_id || !nombre || !fecha) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const usuario_id = req.session.usuario ? req.session.usuario.id : null;
    const codigoBoleto = 'VT-' + Math.floor(100000 + Math.random() * 900000);
    const qty = cantidad ? parseInt(cantidad) : 1;
    const qtyAdultos = cantidad_adultos ? parseInt(cantidad_adultos) : qty;
    const qtyNinos = cantidad_ninos ? parseInt(cantidad_ninos) : 0;
    const ubi = ubicacion || 'Atrás';
    const tPago = totalPago ? parseFloat(totalPago) : 0;

    const sql = `
        INSERT INTO reservas (viaje_id, usuario_id, cliente_nombre, cliente_documento, cantidad_pasajeros, cantidad_adultos, cantidad_ninos, ubicacion, fecha_viaje, codigo_boleto, total_pagado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [viaje_id, usuario_id, nombre, documento, qty, qtyAdultos, qtyNinos, ubi, fecha, codigoBoleto, tPago], (err, result) => {
        if (err) {
            console.error('Error al registrar la reserva:', err);
            return res.status(500).json({ error: 'Error al procesar la reserva' });
        }
        console.log("Reserva insertada en BD con ID:", result.insertId);
        res.json({ success: true, codigoBoleto });
    });
});

app.get('/mis-reservas', (req, res) => {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }
    
    const sql = `
        SELECT r.*, v.origen, v.destino, v.hora_salida, v.hora_llegada, v.servicio 
        FROM reservas r
        JOIN viajes v ON r.viaje_id = v.id
        WHERE r.usuario_id = ?
        ORDER BY r.fecha_creacion DESC
    `;
    
    db.query(sql, [req.session.usuario.id], (err, results) => {
        if (err) {
            console.error('Error al obtener reservas:', err);
            return res.status(500).send('Error interno del servidor');
        }
        res.render('mis-reservas', { reservas: results });
    });
});

// --- Rutas del Panel de Administración ---
app.get('/admin', (req, res) => {
    // Protección simple: si no está logueado, redirigir a login
    if (!req.session.usuario) {
        return res.redirect('/login');
    }
    // Restringir por email específico (rol de admin)
    if (req.session.usuario.email !== 'marowengonzaleshl@gmail.com' && req.session.usuario.email !== 'admin@vision21.com' && req.session.usuario.email !== 'gerente@vision21.com') {
        return res.status(403).send('Acceso denegado. No eres administrador.');
    }
    res.render('admin');
});

// Obtener todos los viajes para el admin
app.get('/api/admin/viajes', (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ error: 'No autorizado' });
    db.query('SELECT * FROM viajes ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).json({ error: 'Error del servidor' });
        res.json(results);
    });
});

// Obtener todas las reservas para el admin
app.get('/api/admin/reservas', (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ error: 'No autorizado' });
    const sql = `
        SELECT r.*, v.origen, v.destino, v.hora_salida, v.hora_llegada, v.servicio, v.precio
        FROM reservas r
        JOIN viajes v ON r.viaje_id = v.id
        ORDER BY r.fecha_creacion DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: 'Error del servidor' });
        res.json(results);
    });
});

// Crear nuevo viaje
app.post('/api/admin/viajes', (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ error: 'No autorizado' });
    const { origen, destino, hora_salida, hora_llegada, servicio, modelo_carro, precio, asientos_totales, asientos_disponibles } = req.body;
    
    const sql = `INSERT INTO viajes (origen, destino, hora_salida, hora_llegada, servicio, modelo_carro, precio, asientos_totales, asientos_disponibles) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(sql, [origen, destino, hora_salida, hora_llegada, servicio, modelo_carro, precio, asientos_totales, asientos_disponibles], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al crear el viaje' });
        }
        res.json({ success: true, id: result.insertId });
    });
});

// Editar viaje
app.put('/api/admin/viajes/:id', (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ error: 'No autorizado' });
    const { id } = req.params;
    const { origen, destino, hora_salida, hora_llegada, servicio, modelo_carro, precio, asientos_totales, asientos_disponibles } = req.body;
    
    const sql = `UPDATE viajes SET origen=?, destino=?, hora_salida=?, hora_llegada=?, servicio=?, modelo_carro=?, precio=?, asientos_totales=?, asientos_disponibles=? WHERE id=?`;
    db.query(sql, [origen, destino, hora_salida, hora_llegada, servicio, modelo_carro, precio, asientos_totales, asientos_disponibles, id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Error al actualizar el viaje' });
        res.json({ success: true, rol: usuario.rol || 'user' });
    });
});

// Eliminar viaje
app.delete('/api/admin/viajes/:id', (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ error: 'No autorizado' });
    const { id } = req.params;
    db.query('DELETE FROM viajes WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Error al eliminar el viaje' });
        res.json({ success: true });
    });
});

// --- CRUD DESTINOS ---
app.post('/api/admin/destinos', (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ error: 'No autorizado' });
    const { nombre, descripcion, tiempo_viaje, frecuencia_salidas, precio_base, clase_imagen } = req.body;
    const sql = `INSERT INTO destinos (nombre, descripcion, tiempo_viaje, frecuencia_salidas, precio_base, clase_imagen) VALUES (?, ?, ?, ?, ?, ?)`;
    db.query(sql, [nombre, descripcion, tiempo_viaje, frecuencia_salidas, precio_base, clase_imagen || 'default-photo'], (err, result) => {
        if (err) return res.status(500).json({ error: 'Error al crear el destino' });
        res.json({ success: true, id: result.insertId });
    });
});
app.put('/api/admin/destinos/:id', (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ error: 'No autorizado' });
    const { id } = req.params;
    const { nombre, descripcion, tiempo_viaje, frecuencia_salidas, precio_base, clase_imagen } = req.body;
    const sql = `UPDATE destinos SET nombre=?, descripcion=?, tiempo_viaje=?, frecuencia_salidas=?, precio_base=?, clase_imagen=? WHERE id=?`;
    db.query(sql, [nombre, descripcion, tiempo_viaje, frecuencia_salidas, precio_base, clase_imagen || 'default-photo', id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Error al actualizar el destino' });
        res.json({ success: true });
    });
});
app.delete('/api/admin/destinos/:id', (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ error: 'No autorizado' });
    db.query('DELETE FROM destinos WHERE id = ?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Error al eliminar el destino' });
        res.json({ success: true });
    });
});

// --- CRUD RESERVAS ---
app.put('/api/admin/reservas/:id', (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ error: 'No autorizado' });
    const { id } = req.params;
    const { cliente_nombre, cliente_documento, cantidad_pasajeros, ubicacion, fecha_viaje, precio_manual } = req.body;
    
    let sql = `UPDATE reservas SET cliente_nombre=?, cliente_documento=?, cantidad_pasajeros=?, ubicacion=?, fecha_viaje=?`;
    let params = [cliente_nombre, cliente_documento, cantidad_pasajeros, ubicacion, fecha_viaje];
    
    if (precio_manual !== undefined) {
        sql += `, precio_manual=?`;
        params.push(precio_manual === '' ? null : parseFloat(precio_manual));
    }
    
    sql += ` WHERE id=?`;
    params.push(id);

    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json({ error: 'Error al actualizar la reserva' });
        res.json({ success: true });
    });
});
app.delete('/api/admin/reservas/:id', (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ error: 'No autorizado' });
    db.query('DELETE FROM reservas WHERE id = ?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Error al eliminar la reserva' });
        res.json({ success: true });
    });
});

// --- CRUD USUARIOS ---
app.get('/api/admin/usuarios', (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ error: 'No autorizado' });
    db.query('SELECT id, nombre, apellidos, email, telefono, rol, fecha_registro FROM usuarios ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).json({ error: 'Error del servidor' });
        res.json(results);
    });
});
app.post('/api/admin/usuarios', async (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ error: 'No autorizado' });
    const { nombre, apellidos, email, telefono, rol, password } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hash = password ? await bcrypt.hash(password, salt) : 'admin_dummy_hash';
        const sql = `INSERT INTO usuarios (nombre, apellidos, email, telefono, rol, password_hash) VALUES (?, ?, ?, ?, ?, ?)`;
        db.query(sql, [nombre, apellidos, email, telefono, rol || 'user', hash], (err, result) => {
            if (err) return res.status(500).json({ error: 'Error al crear usuario' });
            res.json({ success: true, id: result.insertId });
        });
    } catch (e) {
        res.status(500).json({ error: 'Error' });
    }
});
app.put('/api/admin/usuarios/:id', async (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ error: 'No autorizado' });
    const { id } = req.params;
    const { nombre, apellidos, email, telefono, rol, password } = req.body;
    try {
        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);
            const sql = `UPDATE usuarios SET nombre=?, apellidos=?, email=?, telefono=?, rol=?, password_hash=? WHERE id=?`;
            db.query(sql, [nombre, apellidos, email, telefono, rol || 'user', hash, id], (err, result) => {
                if (err) return res.status(500).json({ error: 'Error al actualizar usuario' });
                res.json({ success: true });
            });
        } else {
            const sql = `UPDATE usuarios SET nombre=?, apellidos=?, email=?, telefono=?, rol=? WHERE id=?`;
            db.query(sql, [nombre, apellidos, email, telefono, rol || 'user', id], (err, result) => {
                if (err) return res.status(500).json({ error: 'Error al actualizar usuario' });
                res.json({ success: true });
            });
        }
    } catch (e) {
        res.status(500).json({ error: 'Error' });
    }
});
app.delete('/api/admin/usuarios/:id', (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ error: 'No autorizado' });
    db.query('DELETE FROM usuarios WHERE id = ?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Error al eliminar el usuario' });
        res.json({ success: true });
    });
});

// --- Rutas de Perfil ---
app.get('/perfil', (req, res) => {
    if (!req.session.usuario) return res.redirect('/login');
    res.render('perfil');
});

app.post('/api/perfil', async (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ error: 'No autorizado' });
    const { nombre, apellidos, telefono, password } = req.body;
    
    let sql = 'UPDATE usuarios SET nombre=?, apellidos=?, telefono=?';
    let params = [nombre, apellidos, telefono];
    
    if (password && password.trim() !== '') {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        sql += ', password_hash=?';
        params.push(passwordHash);
    }
    
    sql += ' WHERE id=?';
    params.push(req.session.usuario.id);
    
    db.query(sql, params, (err, result) => {
        if (err) {
            console.error('Error al actualizar perfil:', err);
            return res.status(500).json({ error: 'Error al actualizar perfil' });
        }
        
        req.session.usuario.nombre = nombre;
        req.session.usuario.apellidos = apellidos;
        req.session.usuario.telefono = telefono;
        if (password && password.trim() !== '') {
            req.session.usuario.needsPassword = false;
        }
        
        res.json({ success: true });
    });
});

// --- Rutas de Autenticación ---
app.get('/login', (req, res) => {
    if (req.session.usuario) {
        return res.redirect('/');
    }
    res.render('auth');
});

app.post('/api/registro', authLimiter, async (req, res) => {
    const { nombre, apellidos, email, telefono, password } = req.body;
    
    if (typeof nombre !== 'string' || typeof apellidos !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Formato de datos inválido' });
    }

    if (!nombre || !apellidos || !email || !password) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    try {
        // Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const sql = 'INSERT INTO usuarios (nombre, apellidos, email, telefono, password_hash) VALUES (?, ?, ?, ?, ?)';
        db.query(sql, [nombre, apellidos, email, telefono || null, passwordHash], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
                }
                console.error('Error al registrar usuario:', err);
                return res.status(500).json({ error: 'Error interno del servidor' });
            }
            res.json({ success: true, message: 'Usuario registrado exitosamente' });
        });
    } catch (error) {
        res.status(500).json({ error: 'Error procesando la solicitud' });
    }
});

app.post('/api/login', authLimiter, (req, res) => {
    const { email, password } = req.body;
    
    if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Formato de datos inválido' });
    }

    if (!email || !password) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    db.query('SELECT * FROM usuarios WHERE email = ?', [email], async (err, results) => {
        if (err) {
            console.error('Error al iniciar sesión:', err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const usuario = results[0];
        
        // Verificar contraseña
        const isMatch = await bcrypt.compare(password, usuario.password_hash);
        
        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Guardar en sesión
        req.session.usuario = {
            id: usuario.id,
            nombre: usuario.nombre,
            apellidos: usuario.apellidos,
            email: usuario.email,
            telefono: usuario.telefono,
            rol: usuario.rol || 'user',
            foto: usuario.foto,
            needsPassword: usuario.password_hash === 'google_sso_dummy_hash'
        };

        res.json({ success: true });
    });
});

app.post('/api/google-login', authLimiter, async (req, res) => {
    const { credential } = req.body;
    
    if (!credential) {
        return res.status(400).json({ error: 'Falta credencial de Google' });
    }

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();
        
        const email = payload['email'];
        const nombre = payload['given_name'] || '';
        const apellidos = payload['family_name'] || '';

        // Buscar si el usuario ya existe
        db.query('SELECT * FROM usuarios WHERE email = ?', [email], (err, results) => {
            if (err) {
                console.error('Error al iniciar sesión con Google:', err);
                return res.status(500).json({ error: 'Error interno del servidor' });
            }

            if (results.length > 0) {
                // Usuario existe, iniciar sesión
                const usuario = results[0];
                req.session.usuario = {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    apellidos: usuario.apellidos,
                    email: usuario.email,
                    telefono: usuario.telefono,
                    needsPassword: usuario.password_hash === 'google_sso_dummy_hash'
                };
                return res.json({ success: true });
            } else {
                // Registrar nuevo usuario con hash falso porque login tradicional fallará
                const sql = 'INSERT INTO usuarios (nombre, apellidos, email, password_hash) VALUES (?, ?, ?, ?)';
                db.query(sql, [nombre, apellidos, email, 'google_sso_dummy_hash'], (err, result) => {
                    if (err) {
                        console.error('Error al registrar usuario de Google:', err);
                        return res.status(500).json({ error: 'Error registrando usuario' });
                    }
                    
                    req.session.usuario = {
                        id: result.insertId,
                        nombre: nombre,
                        apellidos: apellidos,
                        email: email,
                        telefono: null,
                        needsPassword: true
                    };
                    return res.json({ success: true });
                });
            }
        });
    } catch (error) {
        console.error('Error validando token de Google:', error);
        res.status(401).json({ error: 'Token inválido' });
    }
});

app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});




// Middleware de autenticación
const requireAuth = (req, res, next) => {
    if (!req.session.usuario) {
        return res.status(401).json({ error: 'No autorizado. Debes iniciar sesión.' });
    }
    next();
};

// Actualizar perfil de usuario
app.put('/api/usuarios/perfil', requireAuth, (req, res) => {
  const { nombre, apellidos, telefono, foto } = req.body;
  const userId = req.session.usuario.id;
  
  const query = 'UPDATE usuarios SET nombre = ?, apellidos = ?, telefono = ?, foto = ? WHERE id = ?';
  connection.query(query, [nombre, apellidos, telefono, foto, userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: 'Error actualizando perfil' });
    }
    
    // Update session data
    req.session.usuario.nombre = nombre;
    req.session.usuario.apellidos = apellidos;
    req.session.usuario.telefono = telefono;
    req.session.usuario.foto = foto;
    
    res.json({ success: true });
  });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor local corriendo en http://localhost:${PORT}`);
    console.log(`Las imágenes se guardarán en: ${uploadDir}`);
});
