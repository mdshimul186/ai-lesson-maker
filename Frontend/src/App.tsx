// This will only work after installing react-router-dom with:
// npm install react-router-dom
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import LessonMakerPage from './pages/LessonMakerPage';
import DashboardPage from './pages/DashboardPage';
import CourseMakerPage from './pages/CourseMakerPage';
import CreateCoursePage from './pages/CreateCoursePage';
import CourseViewPage from './pages/CourseViewPage';
import LandingPage from './pages/LandingPage';
import TasksPage from './pages/TasksPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import AccountPage from './pages/AccountPage';
import ProfilePage from './pages/ProfilePage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentCancelPage from './pages/PaymentCancelPage';
import AppHeader from './components/AppHeader';
import './App.css';
import './locales/index';
import { Layout } from 'antd';
import { useAuthStore } from './stores';

const { Footer, Content } = Layout;

// Protected route component
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

function App() {
  const { token, fetchCurrentUser } = useAuthStore();
  
  useEffect(() => {
    // If user has a token, fetch their data
    if (token) {
      fetchCurrentUser();
    }
  }, [token, fetchCurrentUser]);
    return (
    <Router>
      <Layout style={{ minHeight: '100vh', width: "100vw" }}>
        <AppHeader />
        <Content style={{ padding: '0 50px', marginTop: 20 }}>
          <Routes>
            <Route path="/" element={
              useAuthStore().isAuthenticated ? <Navigate to="/dashboard" /> : <LandingPage />
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/lesson-maker" element={
              <ProtectedRoute>
                <LessonMakerPage />
              </ProtectedRoute>
            } />            <Route path="/course-maker" element={
              <ProtectedRoute>
                <CourseMakerPage />
              </ProtectedRoute>
            } />
            <Route path="/course-maker/create" element={
              <ProtectedRoute>
                <CreateCoursePage />
              </ProtectedRoute>
            } />
            <Route path="/course/:courseId" element={
              <ProtectedRoute>
                <CourseViewPage />
              </ProtectedRoute>
            } />
            <Route path="/tasks" element={
              <ProtectedRoute>
                <TasksPage />
              </ProtectedRoute>
            } />
            <Route path="/account" element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/login" element={
              useAuthStore().isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />
            } />
            <Route path="/register" element={
              useAuthStore().isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />            
            } />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/payment/success" element={
              <ProtectedRoute>
                <PaymentSuccessPage />
              </ProtectedRoute>
            } />
            <Route path="/payment/cancel" element={
              <ProtectedRoute>
                <PaymentCancelPage />
              </ProtectedRoute>
            } />
          </Routes>
        </Content>

        <Footer style={{ textAlign: 'center', background: '#f0f0f0' }}>
          AI Lesson Maker ©{new Date().getFullYear()} Created with BootcampsHub
        </Footer>
      </Layout>
    </Router>
  );
}

export default App;
