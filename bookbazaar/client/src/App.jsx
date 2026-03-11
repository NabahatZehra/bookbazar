import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketContextProvider } from './context/SocketContext';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <SocketContextProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <header className="bg-white shadow p-4">
              <h1 className="text-2xl font-bold text-blue-600">BookBazaar</h1>
            </header>

            <main className="flex-grow container mx-auto p-4">
              <Routes>
                <Route path="/" element={<div className="text-xl">Welcome to BookBazaar</div>} />
                <Route path="*" element={<div className="text-xl text-red-500">404 Not Found</div>} />
              </Routes>
            </main>
            
            <footer className="bg-gray-800 text-white p-4 text-center mt-auto">
              &copy; {new Date().getFullYear()} BookBazaar
            </footer>
          </div>
        </Router>
      </SocketContextProvider>
    </AuthProvider>
  );
}

export default App;
