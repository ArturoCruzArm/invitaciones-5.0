const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // limit para subir imágenes en base64 (demo)

const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_super_segura';

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/invitapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(()=>console.log('MongoDB conectado')).catch(console.error);

// Esquemas
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String
});

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

// Middleware de autenticación
function auth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Token requerido' });
  const token = authHeader.replace('Bearer ', '');
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.userId = decoded.id;
    next();
  });
}

// Rutas
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

app.get('/api/invitations', auth, async (req, res) => {
  const invitations = await Invitation.find({ ownerId: req.userId }).sort({ createdAt: -1 });
  res.json(invitations);
});

app.post('/api/invitations', auth, async (req, res) => {
  const data = req.body;
  data.ownerId = req.userId;
  // Genera slug simple
  data.slug = (data.title || 'evento').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36).slice(-6);
  const invite = await Invitation.create(data);
  res.json(invite);
});

app.get('/api/invitations/:idOrSlug', async (req, res) => {
  const idOrSlug = req.params.idOrSlug;
  let invite = null;
  if (/^[0-9a-fA-F]{24}$/.test(idOrSlug)) invite = await Invitation.findById(idOrSlug);
  if (!invite) invite = await Invitation.findOne({ slug: idOrSlug });
  if (!invite) return res.status(404).json({ error: 'Invitación no encontrada' });
  res.json(invite);
});

app.put('/api/invitations/:id', auth, async (req, res) => {
  const invite = await Invitation.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.userId },
    req.body,
    { new: true }
  );
  res.json(invite);
});

app.delete('/api/invitations/:id', auth, async (req, res) => {
  await Invitation.findOneAndDelete({ _id: req.params.id, ownerId: req.userId });
  res.json({ success: true });
});

// Servir archivos estáticos (opcional) o healthcheck
app.get('/ping', (req, res) => res.send('pong'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Servidor escuchando en http://localhost:${PORT}`));