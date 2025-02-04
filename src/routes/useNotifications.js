import { useState, useEffect } from 'react';
import axios from 'axios';

export function useNotifications() {
  const [notificaciones, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await axios.get('/api/notifications');
        setNotifications(response.data);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    const intervalId = setInterval(fetchNotifications, 5000); // Verifica cada 5 segundos

    return () => clearInterval(intervalId); // Limpia el intervalo al desmontar el componente
  }, []);

  return { notificaciones };
}