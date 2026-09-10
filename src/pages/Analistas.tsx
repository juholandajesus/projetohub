import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { supabase, traduzErro, type Analista } from '../dados';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

export default function Analistas() {
  const { analista: eu, recarregarPerfil } = useAuth();
  const { avisar } = useToast();

  const [analistas, setAnalistas] = useState<Analista[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<Analista | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [link, setLink] = useState('');
  const [ativo, setAtivo] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const resp = await supabase.from('analistas').select('*').order('nome');
    if (resp.error) avisar(traduzErro(resp.error.message), 'erro');
    else setAnalistas((resp.data ?? []) as Analista[]);
    setCarregando(false);
  }, [avisar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function abrir(a: Analista) {
    setEditando(a);
    setNome(a.nome ?? '');
    setCargo(a.cargo ?? '');
    setTelefone(a.telefone ?? '');
    setLink(a.link_agendamento ?? '');
    setAtivo(a.ativo);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!editando) return;
    setSalvando(true);

    const resp = await supabase
      .from('analistas')
      .update({
        nome: nome.trim(),
        cargo: cargo.trim() || null,
        telefone: telefone.trim() || null,
        link_agendamento: link.trim() || null,
        ativo: ativo,
      })
      .eq('id', editando.id);

    setSalvando(false);

    if (resp.error) {
      avisar(traduzErro(resp.error.message), 'erro');
      return;
    }

    avisar('Analista atualizada.');
    if (editando.id === eu?.id) void recarregarPerfil();
    setEditando(null);
    void carregar();
  }

  return (
    <div className="coluna">
      <div className="aviso aviso-info">
        <span>
          Analistas nao sao cadastradas aqui. Cada pessoa cria a propria conta
          na tela de login e aparece nesta lista. Aqui voce ajusta os dados e o
          link de agenda.
        </span>
      </div>

      <div className="cartao">
        <div className="cartao-cabecalho">
          <h3>Time do Unifor Hub</h3>
          <span className="pequeno mudo">{analistas.length} pessoa(s)</span>
        </div>

        {carregando ? (
          <div className="vazio">
            <p>Carregando...</p>
          </div>
        ) : (
          <div className="tabela-envolve">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Cargo</th>
                  <th>Agenda</th>
                  <th>Situacao</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {analistas.map((a) => (
                  <tr key={a.id}>
                    <td className="celula-principal">{a.nome}</td>
                    <td className="pequeno mudo">{a.email}</td>
                    <td className="pequeno">{a.cargo ?? 'Analista'}</td>
                    <td className="pequeno">
                      {a.link_agendamento ? 'Cadastrada' : 'Sem link'}
                    </td>
                    <td className="pequeno">{a.ativo ? 'Ativa' : 'Inativa'}</td>
                    <td className="celula-acoes">
                      <button
                        className="btn btn-suave btn-pequeno"
                        onClick={() => abrir(a)}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        aberto={editando !== null}
        titulo="Editar analista"
        subtitulo={editando?.email}
        aoFechar={() => setEditando(null)}
        rodape={
          <>
            <button
              className="btn btn-secundario"
              onClick={() => setEditando(null)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-analista"
              className="btn btn-primario"
              disabled={salvando}
            >
              Salvar
            </button>
          </>
        }
      >
        <form id="form-analista" onSubmit={salvar} className="grade-form">
          <div className="campo form-largo">
            <label>Link de agendamento</label>
            <input
              className="entrada"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://calendar.app.google/..."
            />
          </div>

          <div className="campo">
            <label>Nome</label>
            <input
              className="entrada"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>

          <div className="campo">
            <label>Cargo</label>
            <input
              className="entrada"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
            />
          </div>

          <div className="campo">
            <label>Telefone</label>
            <input
              className="entrada"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>

          <div className="campo">
            <label>Situacao</label>
            <select
              className="selecao"
              value={ativo ? 'sim' : 'nao'}
              onChange={(e) => setAtivo(e.target.value === 'sim')}
            >
              <option value="sim">Ativa</option>
              <option value="nao">Inativa</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
