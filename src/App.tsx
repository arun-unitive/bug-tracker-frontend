import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import Login from './pages/Login';
import Layout from './components/Layout';
import AdminDashboard from './pages/AdminDashboard';
import TesterDashboard from './pages/TesterDashboard';
import DeveloperDashboard from './pages/DeveloperDashboard';
import Projects from './pages/Projects';
import NewProject from './pages/NewProject';
import EditProject from './pages/EditProject';
import Employees from './pages/Employees';
import EmployeeDetails from './pages/EmployeeDetails';
import ProjectDetails from './pages/ProjectDetails';
import ReportBug from './pages/ReportBug';
import BugDetails from './pages/BugDetails';
import EditBug from './pages/EditBug';
import Bugs from './pages/Bugs';
import AdminBugReport from './pages/AdminBugReport';

// Protected Route Component
const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { user } = useAuthStore();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  const { user } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          {/* Default dashboard redirect based on role */}
          <Route index element={
            user?.role === 'Admin' ? <Navigate to="/admin" replace /> :
            user?.role === 'Tester' ? <Navigate to="/tester" replace /> :
            <Navigate to="/developer" replace />
          } />

          {/* Role-specific routes */}
          <Route path="admin" element={
            <ProtectedRoute roles={['Admin']}><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="tester" element={
            <ProtectedRoute roles={['Tester']}><TesterDashboard /></ProtectedRoute>
          } />
          <Route path="developer" element={
            <ProtectedRoute roles={['Developer']}><DeveloperDashboard /></ProtectedRoute>
          } />

          {/* Common routes */}
          <Route path="projects" element={<Projects />} />
          <Route path="projects/new" element={
            <ProtectedRoute roles={['Admin']}><NewProject /></ProtectedRoute>
          } />
          <Route path="projects/:id/edit" element={
            <ProtectedRoute roles={['Admin']}><EditProject /></ProtectedRoute>
          } />
          <Route path="projects/:id" element={<ProjectDetails />} />
          <Route path="employees" element={
            <ProtectedRoute roles={['Admin']}><Employees /></ProtectedRoute>
          } />
          <Route path="employees/:id" element={
            <ProtectedRoute roles={['Admin']}><EmployeeDetails /></ProtectedRoute>
          } />
          <Route path="bugs" element={
            <ProtectedRoute roles={['Developer', 'Tester']}><Bugs /></ProtectedRoute>
          } />
          <Route path="bugs/new" element={
            <ProtectedRoute roles={['Tester', 'Admin']}><ReportBug /></ProtectedRoute>
          } />
          <Route path="bugs/:id/edit" element={
            <ProtectedRoute roles={['Tester', 'Admin']}><EditBug /></ProtectedRoute>
          } />
          <Route path="bugs/:id" element={<BugDetails />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
