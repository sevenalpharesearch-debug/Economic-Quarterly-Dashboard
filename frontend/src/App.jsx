import { ThemeProvider } from './context/ThemeContext';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  return (
    <ThemeProvider>
      <DashboardPage />
    </ThemeProvider>
  );
}
