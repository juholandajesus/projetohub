import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { SUPABASE_CONFIGURADO } from '../dados';
import { IcAlerta, IcCheckCirculo } from '../components/Icones';

export default function Login() {
  const { entrar, cadastrar } = useAuth();
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar');

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setEnviando(true);
    try {
      if (modo === 'entrar') {
        await entrar(email, senha);
      } else {
        await cadastrar(nome, email, senha);
        setSucesso('Conta criada! Já pode entrar.');
        setModo('entrar');
        setSenha('');
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Algo deu errado.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-tela">
      {/* ---------- Lado esquerdo: apresentação ---------- */}
      <aside className="login-arte">
        <div className="marca">
          <div className="marca-icone">UH</div>
          <div>
            <div className="marca-nome">Checkpoints</div>
            <div className="marca-sub">Unifor Hub</div>
          </div>
        </div>

        <div>
          <h2>Todos os checkpoints das startups em um só lugar.</h2>
          <p>
            Agenda mensal organizada, ata de cada reunião registrada e lembretes
            saindo automaticamente por e-mail — sem planilha, sem esquecimento.
          </p>

          <ul className="login-lista">
            <li>
              <IcCheckCirculo /> Agenda mensal por analista e por startup
            </li>
            <li>
              <IcCheckCirculo /> Ata, encaminhamentos e farol de cada checkpoint
            </li>
            <li>
              <IcCheckCirculo /> Lembretes por e-mail antes de cada reunião
            </li>
            <li>
              <IcCheckCirculo /> Histórico completo de acompanhamento
            </li>
          </ul>
        </div>

        <p className="pequeno" style={{ color: '#7e97bd' }}>
          Unifor Hub · Plataforma interna de acompanhamento
        </p>
      </aside>

      {/* ---------- Lado direito: formulário ---------- */}
      <main className="login-form-lado">
        <div className="login-caixa">
          <h1>
            {modo === 'entrar' ? 'Bem-vinda de volta' : 'Criar sua conta'}
          </h1>
          <p>
            {modo === 'entrar'
              ? 'Entre para ver seus checkpoints.'
              : 'Cadastre-se com o seu e-mail institucional.'}
          </p>

          {!SUPABASE_CONFIGURADO && (
            <div className="aviso aviso-atencao" style={{ marginBottom: 18 }}>
              <IcAlerta />
              <span>
                Falta conectar o banco. Abra <b>src/lib/config.ts</b> e cole a
                URL e a chave <i>anon</i> do seu projeto no Supabase.
              </span>
            </div>
          )}

          <div className="abas">
            <button
              type="button"
              className={`aba ${modo === 'entrar' ? 'ativa' : ''}`}
              onClick={() => {
                setModo('entrar');
                setErro('');
              }}
            >
              Entrar
            </button>
            <button
              type="button"
              className={`aba ${modo === 'criar' ? 'ativa' : ''}`}
              onClick={() => {
                setModo('criar');
                setErro('');
              }}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={aoEnviar} className="coluna" style={{ gap: 14 }}>
            {modo === 'criar' && (
              <div className="campo">
                <label htmlFor="nome">Nome completo</label>
                <input
                  id="nome"
                  className="entrada"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Julia Holanda"
                  required
                />
              </div>
            )}

            <div className="campo">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                className="entrada"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@unifor.br"
                required
              />
            </div>

            <div className="campo">
              <label htmlFor="senha">Senha</label>
              <input
                id="senha"
                type="password"
                className="entrada"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                minLength={6}
                required
              />
            </div>

            {erro && (
              <div className="aviso aviso-erro">
                <IcAlerta />
                <span>{erro}</span>
              </div>
            )}
            {sucesso && (
              <div className="aviso aviso-ok">
                <IcCheckCirculo />
                <span>{sucesso}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primario btn-bloco"
              disabled={enviando}
              style={{ marginTop: 4, padding: '11px 15px' }}
            >
              {enviando ? <span className="giro" /> : null}
              {enviando
                ? 'Aguarde...'
                : modo === 'entrar'
                ? 'Entrar na plataforma'
                : 'Criar minha conta'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
