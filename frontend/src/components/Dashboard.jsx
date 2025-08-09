import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';

const Dashboard = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const response = await api.get('/invitations');
      setInvitations(response.data);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteInvitation = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta invitación?')) {
      return;
    }

    try {
      await api.delete(`/invitations/${id}`);
      setInvitations(invitations.filter(inv => inv._id !== id));
    } catch (error) {
      console.error('Error deleting invitation:', error);
      alert('Error al eliminar la invitación');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Mis Invitaciones
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Hola, {user?.name}</span>
              <button
                onClick={logout}
                className="text-gray-600 hover:text-gray-900"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Tus Invitaciones ({invitations.length})
            </h2>
            <Link
              to="/create"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md"
            >
              + Nueva Invitación
            </Link>
          </div>

          {invitations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-4">
                No tienes invitaciones aún
              </div>
              <Link
                to="/create"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md"
              >
                Crear tu primera invitación
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {invitations.map((invitation) => (
                <div
                  key={invitation._id}
                  className="bg-white overflow-hidden shadow rounded-lg"
                >
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {invitation.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Anfitrión: {invitation.host}
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      {invitation.date} - {invitation.time}
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      {invitation.description?.substring(0, 100)}...
                    </p>
                    
                    <div className="flex justify-between items-center">
                      <a
                        href={`${window.location.origin}/invite/${invitation.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-900 text-sm"
                      >
                        Ver Invitación →
                      </a>
                      <button
                        onClick={() => deleteInvitation(invitation._id)}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="text-xs text-gray-500">
                        Enlace: {window.location.origin}/invite/{invitation.slug}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/invite/${invitation.slug}`
                          );
                          alert('Enlace copiado al portapapeles');
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-900 mt-1"
                      >
                        Copiar enlace
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;