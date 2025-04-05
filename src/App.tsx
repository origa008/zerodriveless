import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Welcome from './pages/Welcome';
import Home from './pages/Home';
import Loader from './components/Loader'; // Create this loader if not present

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader />; // Show loader until session check is done
  }

  return (
    <Routes>
      {!user ? (
        <>
          <Route path="/" element={<Welcome />} />
          <Route path="*" element={<Navigate to="/" />} />
        </>
      ) : (
        <>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Navigate to="/" />} />
        </>
      )}
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;
