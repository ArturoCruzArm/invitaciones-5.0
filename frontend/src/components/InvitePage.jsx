import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

const InvitePage = () => {
  const { slug } = useParams();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState({});

  useEffect(() => {
    fetchInvitation();
  }, [slug]);

  useEffect(() => {
    if (invitation?.date && invitation?.time) {
      const timer = setInterval(() => {
        const eventDateTime = new Date(`${invitation.date}T${invitation.time}`);
        const now = new Date();
        const difference = eventDateTime.getTime() - now.getTime();

        if (difference > 0) {
          setTimeLeft({
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((difference % (1000 * 60)) / 1000)
          });
        } else {
          setTimeLeft({ expired: true });
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [invitation]);

  const fetchInvitation = async () => {
    try {
      const response = await api.get(`/invitations/${slug}`);
      setInvitation(response.data);
    } catch (error) {
      setError('Invitación no encontrada');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Cargando invitación...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Invitación no encontrada
          </h1>
          <p className="text-gray-600">
            La invitación que buscas no existe o ha sido eliminada.
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeStr) => {
    return new Date(`1970-01-01T${timeStr}`).toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-2">
            {invitation.title}
          </h1>
          <p className="text-xl text-gray-600">
            Te invita: {invitation.host}
          </p>
        </div>

        {!timeLeft.expired && Object.keys(timeLeft).length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-4">
              Faltan:
            </h2>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-indigo-600">
                  {timeLeft.days || 0}
                </div>
                <div className="text-sm text-gray-600">Días</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-indigo-600">
                  {timeLeft.hours || 0}
                </div>
                <div className="text-sm text-gray-600">Horas</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-indigo-600">
                  {timeLeft.minutes || 0}
                </div>
                <div className="text-sm text-gray-600">Minutos</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-indigo-600">
                  {timeLeft.seconds || 0}
                </div>
                <div className="text-sm text-gray-600">Segundos</div>
              </div>
            </div>
          </div>
        )}

        {timeLeft.expired && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-8 max-w-2xl mx-auto">
            <p className="text-yellow-700 font-semibold">
              ¡El evento ya comenzó!
            </p>
          </div>
        )}

        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Detalles del Evento</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700">Fecha</h3>
                <p>{formatDate(invitation.date)}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700">Hora</h3>
                <p>{formatTime(invitation.time)}</p>
              </div>
              
              {invitation.address && (
                <div>
                  <h3 className="font-semibold text-gray-700">Ubicación</h3>
                  <p>{invitation.address}</p>
                </div>
              )}
              
              {invitation.description && (
                <div>
                  <h3 className="font-semibold text-gray-700">Descripción</h3>
                  <p className="text-gray-600">{invitation.description}</p>
                </div>
              )}
            </div>
          </div>

          {invitation.lat && invitation.lng && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Ubicación</h2>
              <div className="aspect-video bg-gray-200 rounded flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-600">
                    Mapa: {invitation.lat}, {invitation.lng}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    (Integrar Google Maps o similar)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {invitation.musicUrl && (
          <div className="max-w-2xl mx-auto mt-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-center">Música</h2>
              <audio controls className="w-full">
                <source src={invitation.musicUrl} type="audio/mpeg" />
                Tu navegador no soporta el elemento de audio.
              </audio>
            </div>
          </div>
        )}

        {invitation.gallery && invitation.gallery.length > 0 && (
          <div className="max-w-4xl mx-auto mt-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-center">Galería</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {invitation.gallery.map((image, index) => (
                  <img
                    key={index}
                    src={image.url}
                    alt={image.name}
                    className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      window.open(image.url, '_blank');
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="text-center mt-12 text-gray-500">
          <p>¡Esperamos verte pronto!</p>
        </div>
      </div>
    </div>
  );
};

export default InvitePage;