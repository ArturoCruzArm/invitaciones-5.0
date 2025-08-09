const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_super_segura';
const S3_BUCKET = process.env.S3_BUCKET; // nombre del bucket
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

if (!S3_BUCKET){
  console.warn('WARNING: S3_BUCKET no está configurado. Usa almacenamiento local (uploads) para demo.');
}

const s3 = new S3Client({ region: AWS_REGION });

// Carpeta uploads (fallback/demo local storage si no hay S3)
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
app.use('/uploads', express.static(UPLOAD_DIR)); // servir archivos estáticos (demo)

// Multer para endpoints que reciban archivos en servidor (opcional)
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, UPLOAD_DIR); },
  filename: function (req, file, cb) {
    const unique = Date.now().toString(36) + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  }
});
const upload = multer({ storage });

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/invitapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(()=>console.log('MongoDB conectado')).catch(console.error);

// Esquemas
const UserSchema = new mongoose.Schema({ name: String, email: { type: String, unique: true }, password: String });
const InvitationSchema = new mongoose.Schema({
  ownerId: mongoose.Schema.Types.ObjectId,
  title: String,
  host: String,
  description: String,
  date: String,
  time: String,
  address: String,
  lat: String,
  lng: String,
  musicUrl: String,
  gallery: [{ name: String, url: String }],
  slug: String,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);
const Invitation = mongoose.model('Invitation', InvitationSchema);

// Middleware auth
function auth(req, res, next){
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Token requerido' });
  const token = authHeader.replace('Bearer ', '');
  jwt.verify(token, JWT_SECRET, (err, decoded) => { if (err) return res.status(403).json({ error: 'Token inválido' }); req.userId = decoded.id; next(); });
}

// Auth routes (signup/login)
app.post('/api/auth/signup', async (req, res) => { 
  const { name, email, password } = req.body; 
  const hashed = await bcrypt.hash(password, 10); 
  try { 
    const user = await User.create({ name, email, password: hashed }); 
    res.json({ id: user._id, name: user.name, email: user.email }); 
  } catch (err) { 
    res.status(400).json({ error: 'Error creando usuario', details: err.message }); 
  } 
});

app.post('/api/auth/login', async (req, res) => { 
  const { email, password } = req.body; 
  const user = await User.findOne({ email }); 
  if (!user) return res.status(400).json({ error: 'Usuario no encontrado' }); 
  const match = await bcrypt.compare(password, user.password); 
  if (!match) return res.status(400).json({ error: 'Contraseña incorrecta' }); 
  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' }); 
  res.json({ token, user: { id: user._id, name: user.name, email: user.email } }); 
});

// ======================
// S3: Endpoint para generar URL prefirmada (PUT) para subir un archivo
// FRONTEND: llamará a este endpoint, obtendrá { url, key, publicUrl } y luego hará fetch PUT al url con el file.
// ======================
app.post('/api/s3/presign', auth, async (req, res) => {
  try {
    if (!S3_BUCKET) return res.status(400).json({ error: 'S3 no configurado en el servidor' });
    const { filename, contentType } = req.body;
    if (!filename || !contentType) return res.status(400).json({ error: 'filename y contentType requeridos' });

    // generar key único
    const key = `invitations/${Date.now().toString(36)}-${Math.round(Math.random()*1e9)}-${filename.replace(/[^a-zA-Z0-9.\-]/g,'')}`;

    const command = new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: contentType });
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1h

    // public URL (asumiendo bucket público o CloudFront). Para S3 pública:
    const publicUrl = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;

    res.json({ url, key, publicUrl });
  } catch (err){
    console.error(err);
    res.status(500).json({ error: 'No se pudo generar presign', details: err.message });
  }
});

// ======================
// Crear invitación: ahora el frontend enviará las URLs públicas (publicUrl) de S3 en los campos gallery y musicUrl
// Este endpoint sólo guarda la metadata en MongoDB.
// ======================
app.post('/api/invitations', auth, async (req, res) => {
  try {
    const body = req.body;
    const data = {
      ownerId: req.userId,
      title: body.title,
      host: body.host,
      description: body.description,
      date: body.date,
      time: body.time,
      address: body.address,
      lat: body.lat,
      lng: body.lng,
      gallery: body.gallery || [], // esperar [{name,url}]
      musicUrl: body.musicUrl || '',
    };
    data.slug = (data.title || 'evento').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36).slice(-6);
    const invite = await Invitation.create(data);
    res.json(invite);
  } catch (err){ 
    console.error(err); 
    res.status(500).json({ error: 'Error creando invitación', details: err.message }); 
  }
});

// Ruta para crear invitación con subida directa a S3 desde el backend
app.post('/api/invitations/upload', auth, upload.fields([{ name: 'gallery' }, { name: 'music', maxCount: 1 }]), async (req, res) => {
  try {
    if (!S3_BUCKET) return res.status(400).json({ error: 'S3 no configurado en el servidor' });

    const body = req.body;
    const galleryFiles = req.files['gallery'] || [];
    const musicFiles = req.files['music'] || [];

    // Función para subir archivo a S3 y devolver la URL pública
    async function uploadFileToS3(file) {
      const key = `invitations/${Date.now().toString(36)}-${Math.round(Math.random() * 1e9)}-${file.originalname.replace(/[^a-zA-Z0-9.\\-]/g, '')}`;
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: fs.createReadStream(file.path),
        ContentType: file.mimetype,
        ACL: 'public-read' // para que el archivo sea accesible públicamente
      });
      await s3.send(command);
      return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
    }

    // Subir archivos galería
    const gallery = [];
    for (const file of galleryFiles) {
      const url = await uploadFileToS3(file);
      gallery.push({ name: file.originalname, url });
      // borrar archivo temporal local
      fs.unlinkSync(file.path);
    }

    // Subir archivo música (opcional)
    let musicUrl = '';
    if (musicFiles.length > 0) {
      musicUrl = await uploadFileToS3(musicFiles[0]);
      fs.unlinkSync(musicFiles[0].path);
    }

    // Crear invitación
    const data = {
      ownerId: req.userId,
      title: body.title,
      host: body.host,
      description: body.description,
      date: body.date,
      time: body.time,
      address: body.address,
      lat: body.lat,
      lng: body.lng,
      gallery,
      musicUrl,
      slug: (body.title || 'evento').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36).slice(-6),
    };

    const invite = await Invitation.create(data);
    res.json(invite);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando invitación con subida a S3', details: err.message });
  }
});

// Obtener invitación pública (igual que antes)
app.get('/api/invitations/:idOrSlug', async (req, res) => { 
  const idOrSlug = req.params.idOrSlug; 
  let invite = null; 
  if (/^[0-9a-fA-F]{24}$/.test(idOrSlug)) invite = await Invitation.findById(idOrSlug); 
  if (!invite) invite = await Invitation.findOne({ slug: idOrSlug }); 
  if (!invite) return res.status(404).json({ error: 'Invitación no encontrada' }); 
  res.json(invite); 
});

// Listar invitaciones del usuario
app.get('/api/invitations', auth, async (req, res) => { 
  const invitations = await Invitation.find({ ownerId: req.userId }).sort({ createdAt: -1 }); 
  res.json(invitations); 
});

// Rutas para edición/eliminación (igual)
app.put('/api/invitations/:id', auth, async (req, res) => { 
  const invite = await Invitation.findOneAndUpdate({ _id: req.params.id, ownerId: req.userId }, req.body, { new: true }); 
  res.json(invite); 
});

app.delete('/api/invitations/:id', auth, async (req, res) => { 
  await Invitation.findOneAndDelete({ _id: req.params.id, ownerId: req.userId }); 
  res.json({ success: true }); 
});

app.get('/ping', (req, res) => res.send('pong'));
const PORT = process.env.PORT || 4000; 
app.listen(PORT, () => console.log(`Servidor escuchando en http://localhost:${PORT}`));