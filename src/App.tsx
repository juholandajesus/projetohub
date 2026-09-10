import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProvedorAuth, useAuth } from './context/AuthContext';
import { ProvedorToast } from './components/Toast';
import Layout from './components/Layout';

import Login from './pages/Login';
import Inicio from './pages/Inicio';
import Checkpoints from './pages/Checkpoints';
import Startups from './pages/Startups';
import Analistas from './pages/Analistas';
import Configuracoes from './pages/Configuracoes';

/** Decide entre a tela de login e a aplicação */
function Portao() {
  const { sessao, carregando } = useAuth();

  if (carregando) {
    return (
      <div className="tela-carregando">
        <span className="giro escuro" />
        <p className="mudo">Carregando a plataforma...</p>
      </div>
    );
  }

  if (!sessao) return <Login />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Inicio />} />
        <Route path="/checkpoints" element={<Checkpoints />} />
        <Route path="/startups" element={<Startups />} />
        <Route path="/analistas" element={<Analistas />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ProvedorToast>
        <ProvedorAuth>
          <Portao />
        </ProvedorAuth>
      </ProvedorToast>
    </BrowserRouter>
  );
}
