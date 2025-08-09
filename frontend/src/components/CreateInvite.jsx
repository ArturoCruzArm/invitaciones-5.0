import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

const CreateInvite = () => {
  const [formData, setFormData] = useState({
    title: '',
    host: '',
    description: '',
    date: '',
    time: '',
    address: '',
    lat: '',
    lng: '',
  });
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [musicFile, setMusicFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setGalleryFiles(prev => [...prev, ...files]);
  };

  const handleMusicUpload = (e) => {
    const file = e.target.files[0];
    setMusicFile(file);
  };

  const removeImage = (index) => {
    setGalleryFiles(galleryFiles.filter((_, i) => i !== index));
  };

  // Función para obtener URL prefirmada de S3
  const getPresignedUrl = async (filename, contentType) => {
    try {
      const response = await api.post('/s3/presign', { filename, contentType });
      return response.data; // { url, key, publicUrl }
    } catch (error) {
      throw new Error('Error obteniendo URL prefirmada: ' + error.message);
    }
  };

  // Función para subir archivo a S3 usando URL prefirmada
  const uploadFileToS3 = async (file) => {
    try {
      const presign = await getPresignedUrl(file.name, file.type);
      
      // Subir archivo directamente a S3
      const response = await fetch(presign.url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file
      });

      if (!response.ok) {
        throw new Error(`Error subiendo a S3: ${response.statusText}`);
      }

      return presign.publicUrl; // URL pública del archivo en S3
    } catch (error) {
      throw new Error('Error subiendo archivo: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setUploadProgress('Iniciando subida...');

    try {
      // Subir archivos de galería
      const gallery = [];
      for (let i = 0; i < galleryFiles.length; i++) {
        const file = galleryFiles[i];
        setUploadProgress(`Subiendo imagen ${i + 1} de ${galleryFiles.length}...`);
        const url = await uploadFileToS3(file);
        gallery.push({ name: file.name, url });
      }

      // Subir archivo de música (opcional)
      let musicUrl = '';
      if (musicFile) {
        setUploadProgress('Subiendo archivo de música...');
        musicUrl = await uploadFileToS3(musicFile);
      }

      // Crear invitación con metadata
      setUploadProgress('Creando invitación...');
      const invitationData = {
        ...formData,
        gallery,
        musicUrl
      };
      
      const response = await api.post('/invitations', invitationData);
      
      setUploadProgress('¡Invitación creada exitosamente!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
      
    } catch (error) {
      setError(error.message || 'Error al crear la invitación');
      setUploadProgress('');
    } finally {
      setLoading(false);
    }
  };

  // Fallback: usar FormData si S3 no está disponible
  const handleSubmitFallback = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setUploadProgress('Subiendo archivos al servidor...');

    try {
      const formDataToSend = new FormData();
      
      // Agregar campos de texto
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      // Agregar archivos de galería
      galleryFiles.forEach((file) => {
        formDataToSend.append('gallery', file);
      });
      
      // Agregar archivo de música
      if (musicFile) {
        formDataToSend.append('music', musicFile);
      }
      
      // Usar endpoint con subida directa desde backend a S3
      const response = await api.post('/invitations/upload', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.error || 'Error al crear la invitación');
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Nueva Invitación
              </h1>
              <Link
                to="/dashboard"
                className="text-gray-600 hover:text-gray-900"
              >
                ← Volver
              </Link>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Título del Evento *
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Anfitrión *
              </label>
              <input
                type="text"
                name="host"
                required
                value={formData.host}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Descripción
              </label>
              <textarea
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Fecha *
                </label>
                <input
                  type="date"
                  name="date"
                  required
                  value={formData.date}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Hora *
                </label>
                <input
                  type="time"
                  name="time"
                  required
                  value={formData.time}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Dirección
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Latitud (opcional)
                </label>
                <input
                  type="number"
                  step="any"
                  name="lat"
                  value={formData.lat}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Longitud (opcional)
                </label>
                <input
                  type="number"
                  step="any"
                  name="lng"
                  value={formData.lng}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Archivo de Música (opcional)
              </label>
              <input
                type="file"
                accept="audio/*"
                onChange={handleMusicUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              {musicFile && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    Archivo seleccionado: {musicFile.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => setMusicFile(null)}
                    className="text-xs text-red-600 hover:text-red-900 mt-1"
                  >
                    Quitar archivo
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Galería de Imágenes
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              
              {galleryFiles.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Imágenes seleccionadas:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {galleryFiles.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-20 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {uploadProgress && (
              <div className="text-indigo-600 text-sm font-medium">
                {uploadProgress}
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <div className="flex justify-end space-x-4">
              <Link
                to="/dashboard"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </Link>
              <button
                type="button"
                onClick={handleSubmitFallback}
                disabled={loading}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 mr-2"
              >
                {loading ? 'Subiendo...' : 'Subir vía Servidor'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Subiendo...' : 'Subir a S3'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateInvite;