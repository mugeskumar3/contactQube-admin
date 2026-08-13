import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import UserAccounts from './pages/UserAccounts';
import Members from './pages/Members';
import UserRoles from './pages/UserRoles';
import Plans from './pages/Plans';
import Activities from './pages/Activities';
import Banners from './pages/Banners';
import Interactions from './pages/Interactions';
import Reports from './pages/Reports';
import Login from './pages/Login';
import PageNotFound from './pages/PageNotFound';
import ProtectedRoute from './components/ProtectedRoute';
import { getFirstAccessibleRoute } from './utils/permission';

const BRAND_TOKEN = {
  colorPrimary: '#b70805',
  colorPrimaryHover: '#e03131',
  colorPrimaryActive: '#c92a2a',
  colorPrimaryBg: '#fff5f5',
  colorPrimaryBgHover: '#ffe3e3',
  borderRadius: 10,
  fontFamily: "'Outfit', 'Inter', sans-serif",
};

function RootRedirect() {
  const firstRoute = getFirstAccessibleRoute();
  return <Navigate to={firstRoute} replace />;
}

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      const saved = localStorage.getItem('networth_admin_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (user) => {
    localStorage.setItem('networth_admin_session', JSON.stringify(user));
    setSession(user);
    const firstRoute = getFirstAccessibleRoute();
    window.location.href = firstRoute;
  };

  if (!session) {
    return (
      <ConfigProvider theme={{ token: BRAND_TOKEN }}>
        <Login onLoginSuccess={handleLoginSuccess} />
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={{ token: BRAND_TOKEN }}>
      <Layout>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/dashboard" element={
            <ProtectedRoute moduleName="Dashboard">
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/admins" element={
            <ProtectedRoute anyOf={["Admin User", "User Roles"]}>
              <UserAccounts />
            </ProtectedRoute>
          } />
          <Route path="/members" element={
            <ProtectedRoute moduleName="Members">
              <Members />
            </ProtectedRoute>
          } />
          <Route path="/roles" element={
            <ProtectedRoute moduleName="User Roles">
              <UserRoles />
            </ProtectedRoute>
          } />
          <Route path="/plans" element={
            <ProtectedRoute moduleName="Plans">
              <Plans />
            </ProtectedRoute>
          } />
          <Route path="/activities" element={
            <ProtectedRoute anyOf={["Activities", "Banners"]}>
              <Activities />
            </ProtectedRoute>
          } />
          <Route path="/banners" element={
            <ProtectedRoute moduleName="Banners">
              <Banners />
            </ProtectedRoute>
          } />
          <Route path="/interactions" element={
            <ProtectedRoute moduleName="Interactions">
              <Interactions />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute moduleName="Reports">
              <Reports />
            </ProtectedRoute>
          } />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Layout>
    </ConfigProvider>
  );
}
