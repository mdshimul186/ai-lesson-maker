// This will only work after installing react-router-dom with:
// npm install react-router-dom
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import TasksPage from './pages/TasksPage';
import './App.css';
import './locales/index';
import { Layout } from 'antd';

const { Header, Footer } = Layout;

function App() {
  return (
    <Router>
 
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tasks" element={<TasksPage />} />
        </Routes>

        <Footer style={{ textAlign: 'center', background: '#f0f0f0' }}>
          AI Lesson Maker ©{new Date().getFullYear()} Created with BootcampsHub
        </Footer>
   
    </Router>
  )
}

export default App
