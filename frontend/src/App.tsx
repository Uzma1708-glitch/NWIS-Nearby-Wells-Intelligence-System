import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, NwisProvider } from './context/NwisContext';
import { LandingPage } from './pages/LandingPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { FoundationCheck } from './pages/FoundationCheck';

function App() {
  return (
    <ThemeProvider>
      <NwisProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/foundation" element={<FoundationCheck />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </NwisProvider>
    </ThemeProvider>
  );
}

export default App;
