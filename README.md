# Invitaciones 5.0

Aplicación generadora de invitaciones con React y Express - versión 5.0

## Descripción

Sistema completo para crear y gestionar invitaciones digitales con autenticación de usuarios, galería de imágenes, reproductor de música y vista pública de invitaciones.

## Tecnologías

### Backend
- **Node.js** con Express
- **MongoDB** con Mongoose
- **JWT** para autenticación
- **bcrypt** para hash de contraseñas
- **CORS** para peticiones cross-origin

### Frontend
- **React** con Vite
- **React Router** para navegación
- **Axios** para peticiones HTTP
- **Context API** para manejo de estado
- **CSS** con clases utility

## Funcionalidades

- ✅ Registro e inicio de sesión de usuarios
- ✅ Dashboard para gestionar invitaciones
- ✅ Creador de invitaciones con formulario completo
- ✅ Subida de imágenes (base64 para demo)
- ✅ Vista pública de invitaciones
- ✅ Contador de tiempo hasta el evento
- ✅ Reproductor de música
- ✅ Galería de imágenes
- ✅ Sistema de slugs para URLs amigables

## Instalación y Configuración

### Prerrequisitos
- Node.js (v14 o superior)
- MongoDB Community Server
- Git

### Backend

1. Crear carpeta server/ y pegar el server.js
2. Ejecutar comandos:
   ```bash
   npm init -y
   npm install express mongoose cors bcrypt jsonwebtoken
   ```
3. (Opcional) Crear archivo `.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/invitapp
   JWT_SECRET=tu_clave_secreta_aqui
   ```
4. Iniciar servidor:
   ```bash
   node server.js
   ```
   API disponible en http://localhost:4000

### Frontend

1. Crear proyecto Vite:
   ```bash
   npm create vite@latest frontend --template react
   cd frontend
   ```
2. Instalar dependencias:
   ```bash
   npm install axios react-router-dom
   ```
3. Pegar los archivos src/ del proyecto
4. Iniciar desarrollo:
   ```bash
   npm run dev
   ```
   Frontend disponible en http://localhost:5173

### MongoDB

Asegúrate de tener MongoDB ejecutándose:
```bash
mongod --dbpath="C:\data\db"
```

## Flujo de Prueba

1. **Registrarse** → Crear nueva cuenta
2. **Iniciar sesión** → Login con credenciales  
3. **Crear invitación** → Completar formulario con detalles
4. **Copiar enlace público** → Obtener URL de la invitación
5. **Abrir en pestaña privada** → Ver invitación sin autenticación

## Estructura del Proyecto

```
invitaciones-5.0/
├── server/                    # Backend Express
│   ├── package.json
│   └── server.js
├── frontend/                  # Frontend React
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── CreateInvite.jsx
│   │   │   └── InvitePage.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── api.js
│   │   ├── AuthContext.jsx
│   │   └── index.css
│   └── package.json
└── README.md
```

## API Endpoints

### Autenticación
- `POST /api/auth/signup` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión

### Invitaciones
- `GET /api/invitations` - Listar invitaciones del usuario (autenticado)
- `POST /api/invitations` - Crear nueva invitación (autenticado)
- `GET /api/invitations/:idOrSlug` - Obtener invitación por ID o slug (público)
- `PUT /api/invitations/:id` - Actualizar invitación (autenticado)
- `DELETE /api/invitations/:id` - Eliminar invitación (autenticado)

## Próximas Mejoras

- [ ] Almacenamiento en la nube para imágenes (S3/Firebase)
- [ ] Notificaciones por email
- [ ] Templates de invitaciones personalizables
- [ ] Integración con Google Maps
- [ ] Sistema de RSVP
- [ ] Dashboard de estadísticas
- [ ] Modo oscuro

## Licencia

MIT License - Ver archivo LICENSE para más detalles

## Contribución

Las contribuciones son bienvenidas. Por favor:

1. Fork del proyecto
2. Crear rama para feature (`git checkout -b feature/AmazingFeature`)
3. Commit de cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## Contacto

Proyecto creado con Claude Code - [GitHub](https://github.com/ArturoCruzArm/invitaciones-5.0)