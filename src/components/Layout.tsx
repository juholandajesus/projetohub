import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MotorLembretes from './MotorLembretes';
import {
  IcAjustes,
  IcCalendario,
  IcEquipe,
  IcFoguete,
  IcMenu,
  IcPainel,
  IcSair,
} from './Icones';

const MENU = [
  { para: '/', rotulo: 'Início', Icone: IcPainel, exato: true },
  {
    para: '/checkpoints',
    rotulo: 'Checkpoints',
    Icone: IcCalendario,
    exato: false,
  },
  { para: '/startups', rotulo: 'Startups', Icone: IcFoguete, exato: false },
  { para: '/analistas', rotulo: 'Analistas', Icone: IcEquipe, exato: false },
];

const TITULOS: Record<string, { titulo: string; sub: string }> = {
  '/': { titulo: 'Início', sub: 'Panorama dos checkpoints do mês' },
  '/checkpoints': {
    titulo: 'Checkpoints',
    sub: 'Convites, agendamentos e atas',
  },
  '/startups': { titulo: 'Startups', sub: 'Base de startups acompanhadas' },
  '/analistas': { titulo: 'Analistas', sub: 'Time do Unifor Hub' },
  '/configuracoes': {
    titulo: 'Configurações',
    sub: 'Agenda, e-mails e perfil',
  },
};

function iniciais(nome: string) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default function Layout() {
  const { analista, sessao, sair } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const { pathname } = useLocation();

  const cabecalho = TITULOS[pathname] ?? { titulo: 'Checkpoints', sub: '' };
  const nome = analista?.nome ?? sessao?.user.email ?? 'Analista';

  return (
    <div className="app">
      <MotorLembretes />

      <div
        className={`veu ${menuAberto ? 'visivel' : ''}`}
        onClick={() => setMenuAberto(false)}
      />

      <aside className={`sidebar ${menuAberto ? 'aberta' : ''}`}>
        <div className="marca">
          <div className="marca-icone">UH</div>
          <div>
            <div className="marca-nome">Checkpoints</div>
            <div className="marca-sub">Unifor Hub</div>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-rotulo">Acompanhamento</div>
          {MENU.map(({ para, rotulo, Icone, exato }) => (
            <NavLink
              key={para}
              to={para}
              end={exato}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'ativo' : ''}`
              }
              onClick={() => setMenuAberto(false)}
            >
              <Icone />
              {rotulo}
            </NavLink>
          ))}

          <div className="nav-rotulo">Sistema</div>
          <NavLink
            to="/configuracoes"
            className={({ isActive }) => `nav-item ${isActive ? 'ativo' : ''}`}
            onClick={() => setMenuAberto(false)}
          >
            <IcAjustes />
            Configurações
          </NavLink>
        </nav>

        <div className="usuario-box">
          <div className="avatar">{iniciais(nome)}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="usuario-nome">{nome}</div>
            <div className="usuario-email">{sessao?.user.email}</div>
          </div>
          <button
            className="btn-sair"
            onClick={sair}
            title="Sair"
            aria-label="Sair"
          >
            <IcSair style={{ width: 17, height: 17 }} />
          </button>
        </div>
      </aside>

      <div className="conteudo">
        <header className="topbar">
          <div className="linha">
            <button
              className="btn-menu"
              onClick={() => setMenuAberto(true)}
              aria-label="Abrir menu"
            >
              <IcMenu style={{ width: 18, height: 18 }} />
            </button>
            <div>
              <h1>{cabecalho.titulo}</h1>
              <p>{cabecalho.sub}</p>
            </div>
          </div>
        </header>

        <div className="pagina">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
