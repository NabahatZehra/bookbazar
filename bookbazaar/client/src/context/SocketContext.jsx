import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useSocketContext = () => {
  return useContext(SocketContext);
};

// eslint-disable-next-line react/prop-types
export const SocketContextProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    // In a real application, this token would come from your AuthContext or LocalStorage
    const token = localStorage.getItem('token');
    // Using import.meta.env for Vite environment variables
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

    if (token) {
      const socketInstance = io(serverUrl, {
        auth: { token },
      });

      setSocket(socketInstance);

      // Listen for the online_users event from the backend
      socketInstance.on('online_users', (users) => {
        setOnlineUsers(users);
      });

      // Cleanup on unmount or when token changes
      return () => {
        socketInstance.close();
      };
    } else {
      // If there's a socket but no token (e.g., user logged out), close it
      if (socket) {
        socket.close();
        setSocket(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Note: typically you'd add token or auth state to this dependency array if using real AuthContext

  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId);
  };

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, isUserOnline }}>
      {children}
    </SocketContext.Provider>
  );
};
