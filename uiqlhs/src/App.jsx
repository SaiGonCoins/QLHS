import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import WelcomePage from './pages/WelcomePage'
import AdminPage from './pages/AdminPage'
import StudentProfilePage from './pages/StudentProfilePage'
import StudentManagement from './pages/StudentManagement'
import TeacherManagement from './pages/TeacherManagement'
import AccountManagement from './pages/AccountManagement'
import ClassManagement from './pages/ClassManagement'
import GradeManagement from './pages/GradeManagement'
import UnauthorizedPage from './pages/UnauthorizedPage'
import RoleGuard from './guards/RoleGuard'

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route 
        path="/dashboard" 
        element={
          <Layout>
            <RoleGuard allowedRoles={['Teacher', 'Admin']}>
              <HomePage />
            </RoleGuard>
          </Layout>
        } 
      />
<Route 
          path="/admin" 
          element={
            <Layout>
              <RoleGuard allowedRoles={['Admin']}>
                <AdminPage />
              </RoleGuard>
            </Layout>
          } 
        />
        <Route 
          path="/admin/students" 
          element={
            <Layout>
              <RoleGuard allowedRoles={['Admin']}>
                <StudentManagement />
              </RoleGuard>
            </Layout>
          } 
        />
<Route 
            path="/admin/teachers" 
            element={
              <Layout>
                <RoleGuard allowedRoles={['Admin']}>
                  <TeacherManagement />
                </RoleGuard>
              </Layout>
            } 
          />
          <Route 
            path="/admin/accounts" 
            element={
              <Layout>
                <RoleGuard allowedRoles={['Admin']}>
                  <AccountManagement />
                </RoleGuard>
              </Layout>
            } 
          />
          <Route 
            path="/admin/classes" 
            element={
              <Layout>
                <RoleGuard allowedRoles={['Admin']}>
                  <ClassManagement />
                </RoleGuard>
              </Layout>
            } 
          />
          <Route 
            path="/admin/grades" 
            element={
              <Layout>
                <RoleGuard allowedRoles={['Teacher', 'Admin']}>
                  <GradeManagement />
                </RoleGuard>
              </Layout>
            } 
          />
          <Route
        path="/student" 
        element={
          <Layout>
            <RoleGuard allowedRoles={['Student']}>
              <StudentProfilePage />
            </RoleGuard>
          </Layout>
        } 
      />
      <Route 
        path="/unauthorized" 
        element={
          <Layout>
            <UnauthorizedPage />
          </Layout>
        } 
      />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
}

export default App