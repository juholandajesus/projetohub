import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import {
  supabase,
  traduzErro,
  ESTAGIOS,
  PROGRAMAS,
  type Analista,
  type Startup,
} from '../dados';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { EtiquetaSimples } from '../components/Etiquetas';
import {
  IcBusca,
  IcFoguete,
  IcLapis,
  IcLixeira,
  IcMais,
} from '../components/Icones';

const FORM_VAZIO = {
  nome: '',
  setor: '',
  estagio: 'Ideação',
  programa: 'Incubação',
  contato_nome: '',
  contato_email: '',
  contato_fone: '',
  analista_id: '',
  dia_preferido: '15',
  observacoes: '',
  ativa: true,
};

export default function Startups() {
  const { avisar } = useToast();

  const [startups, setStartups] = useState<Startup[]>([]);
  const [analistas, setAnalistas] = useState<Analista[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [busca, setBusca] = useState('');
  const [filtroEstagio, setFiltroEstagio] = useState('');
  const [filtroAnalista, setFiltroAnalista] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Startup | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  const [paraExcluir, setParaExcluir] = useState<Startup | null>(null);

  /* ---------------- Carregar dados ---------------- */

  const carregar = useCallback(async () => {
    setCarregando(true);

    const [r1, r2] = await Promise.all([
      supabase.from('startups').select('*').order('nome'),
      supabase.from('analistas').select('*').order('nome'),
    ]);

    if (r1.error) avisar(traduzErro(r1.error.message), 'erro');
    else setStartups((r1.data ?? []) as Startup[]);

    if (!r2.error) setAnalistas((r2.data ?? []) as Analista[]);

    setCarregando(false);
  }, [avisar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  /* ---------------- Filtro ---------------- */

  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return startups.filter((s) => {
      if (filtroEstagio && s.estagio !== filtroEstagio) return false;
      if (filtroAnalista && s.analista_id !== filtroAnalista) return false;
      if (!termo) return true;
      return (
        s.nome.toLowerCase().includes(termo) ||
        (s.setor ?? '').toLowerCase().includes(termo) ||
        (s.contato_nome ?? '').toLowerCase().includes(termo)
      );
    });
  }, [startups, busca, filtroEstagio, filtroAnalista]);

  const nomeAnalista = useCallback(
    (id: string | null) => analistas.find((a) => a.id === id)?.nome ?? null,
    [analistas]
  );

  /* ---------------- Abrir modal ---------------- */

  function abrirNova() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setModalAberto(true);
  }

  function abrirEdicao(s: Startup) {
    setEditando(s);
    setForm({
      nome: s.nome,
      setor: s.setor ?? '',
      estagio: s.estagio ?? 'Ideação',
      programa: s.programa ?? 'Incubação',
      contato_nome: s.contato_nome ?? '',
      contato_email: s.contato_email ?? '',
      contato_fone: s.contato_fone ?? '',
      analista_id: s.analista_id ?? '',
      dia_preferido: s.dia_preferido ? String(s.dia_preferido) : '',
      observacoes: s.observacoes ?? '',
      ativa: s.ativa,
    });
    setModalAberto(true);
  }

  /* ---------------- Salvar ---------------- */

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);

    const dados = {
      nome: form.nome.trim(),
      setor: form.setor.trim() || null,
      estagio: form.estagio,
      programa: form.programa,
      contato_nome: form.contato_nome.trim() || null,
      contato_email: form.contato_email.trim() || null,
      contato_fone: form.contato_fone.trim() || null,
      analista_id: form.analista_id || null,
      dia_preferido: form.dia_preferido ? Number(form.dia_preferido) : null,
      observacoes: form.observacoes.trim() || null,
      ativa: form.ativa,
    };

    const { error } = editando
      ? await supabase.from('startups').update(dados).eq('id', editando.id)
      : await supabase.from('startups').insert(dados);

    setSalvando(false);

    if (error) {
      avisar(traduzErro(error.message), 'erro');
      return;
    }

    avisar(editando ? 'Startup atualizada.' : 'Startup cadastrada.');
    setModalAberto(false);
    void carregar();
  }

  /* ---------------- Excluir ---------------- */

  async function excluir() {
    if (!paraExcluir) return;
    const { error } = await supabase
      .from('startups')
      .delete()
      .eq('id', paraExcluir.id);

    if (error) avisar(traduzErro(error.message), 'erro');
    else avisar('Startup removida.');

    setParaExcluir(null);
    void carregar();
  }

  /* ---------------- Tela ---------------- */

  return (
    <>
      <div className="barra-filtros">
        <div className="busca">
          <IcBusca />
          <input
            className="entrada"
            placeholder="Buscar por nome, setor ou contato..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <select
          className="selecao"
          style={{ width: 'auto' }}
          value={filtroEstagio}
          onChange={(e) => setFiltroEstagio(e.target.value)}
        >
          <option value="">Todos os estágios</option>
          {ESTAGIOS.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>

        <select
          className="selecao"
          style={{ width: 'auto' }}
          value={filtroAnalista}
          onChange={(e) => setFiltroAnalista(e.target.value)}
        >
          <option value="">Todas as analistas</option>
          {analistas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>

        <button className="btn btn-primario" onClick={abrirNova}>
          <IcMais />
          Nova startup
        </button>
      </div>

      <div className="cartao">
        <div className="cartao-cabecalho">
          <h3>
            {listaFiltrada.length}{' '}
            {listaFiltrada.length === 1 ? 'startup' : 'startups'}
          </h3>
          <span className="pequeno mudo">
            {startups.filter((s) => s.ativa).length} ativas no total
          </span>
        </div>

        {carregando ? (
          <div className="vazio">
            <span className="giro escuro" style={{ margin: '0 auto 12px' }} />
            <p>Carregando...</p>
          </div>
        ) : listaFiltrada.length === 0 ? (
          <div className="vazio">
            <div className="vazio-icone">
              <IcFoguete />
            </div>
            <h4>
              {startups.length === 0
                ? 'Nenhuma startup cadastrada ainda'
                : 'Nada encontrado com esses filtros'}
            </h4>
            <p>
              {startups.length === 0
                ? 'Cadastre a primeira startup para começar a agendar os checkpoints mensais.'
                : 'Tente limpar a busca ou trocar os filtros.'}
            </p>
            {startups.length === 0 && (
              <button className="btn btn-primario" onClick={abrirNova}>
                <IcMais />
                Cadastrar startup
              </button>
            )}
          </div>
        ) : (
          <div className="tabela-envolve">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Startup</th>
                  <th>Estágio</th>
                  <th>Programa</th>
                  <th>Analista</th>
                  <th>Contato</th>
                  <th>Dia</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="celula-principal">
                        {s.nome}
                        {!s.ativa && (
                          <span
                            className="etiqueta etq-cinza"
                            style={{ marginLeft: 8 }}
                          >
                            Inativa
                          </span>
                        )}
                      </div>
                      {s.setor && <div className="pequeno mudo">{s.setor}</div>}
                    </td>
                    <td>
                      <EtiquetaSimples texto={s.estagio} tom="azul" />
                    </td>
                    <td className="pequeno">{s.programa ?? '—'}</td>
                    <td className="pequeno">
                      {nomeAnalista(s.analista_id) ?? '—'}
                    </td>
                    <td>
                      {s.contato_nome ? (
                        <>
                          <div className="pequeno negrito">
                            {s.contato_nome}
                          </div>
                          {s.contato_email && (
                            <div className="pequeno mudo">
                              {s.contato_email}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="mudo pequeno">—</span>
                      )}
                    </td>
                    <td className="pequeno">
                      {s.dia_preferido ? `dia ${s.dia_preferido}` : '—'}
                    </td>
                    <td className="celula-acoes">
                      <button
                        className="btn btn-fantasma btn-icone"
                        title="Editar"
                        onClick={() => abrirEdicao(s)}
                      >
                        <IcLapis style={{ width: 15, height: 15 }} />
                      </button>
                      <button
                        className="btn btn-fantasma btn-icone"
                        title="Excluir"
                        onClick={() => setParaExcluir(s)}
                      >
                        <IcLixeira style={{ width: 15, height: 15 }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------- Modal de cadastro ---------------- */}
      <Modal
        aberto={modalAberto}
        largo
        titulo={editando ? 'Editar startup' : 'Nova startup'}
        subtitulo={
          editando
            ? 'Atualize os dados da startup.'
            : 'Cadastre a startup para poder agendar os checkpoints.'
        }
        aoFechar={() => setModalAberto(false)}
        rodape={
          <>
            <button
              type="button"
              className="btn btn-secundario"
              onClick={() => setModalAberto(false)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-startup"
              className="btn btn-primario"
              disabled={salvando}
            >
              {salvando && <span className="giro" />}
              {salvando
                ? 'Salvando...'
                : editando
                ? 'Salvar alterações'
                : 'Cadastrar'}
            </button>
          </>
        }
      >
        <form id="form-startup" onSubmit={salvar} className="grade-form">
          <div className="campo form-largo">
            <label>Nome da startup *</label>
            <input
              className="entrada"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex.: AgroTech Nordeste"
              required
            />
          </div>

          <div className="campo">
            <label>Setor</label>
            <input
              className="entrada"
              value={form.setor}
              onChange={(e) => setForm({ ...form, setor: e.target.value })}
              placeholder="Ex.: Agronegócio, Saúde, Educação"
            />
          </div>

          <div className="campo">
            <label>Estágio</label>
            <select
              className="selecao"
              value={form.estagio}
              onChange={(e) => setForm({ ...form, estagio: e.target.value })}
            >
              {ESTAGIOS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label>Programa</label>
            <select
              className="selecao"
              value={form.programa}
              onChange={(e) => setForm({ ...form, programa: e.target.value })}
            >
              {PROGRAMAS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label>Analista responsável</label>
            <select
              className="selecao"
              value={form.analista_id}
              onChange={(e) =>
                setForm({ ...form, analista_id: e.target.value })
              }
            >
              <option value="">Sem responsável</option>
              {analistas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label>Nome do contato</label>
            <input
              className="entrada"
              value={form.contato_nome}
              onChange={(e) =>
                setForm({ ...form, contato_nome: e.target.value })
              }
              placeholder="Ex.: Marina Souza"
            />
          </div>

          <div className="campo">
            <label>E-mail do contato</label>
            <input
              type="email"
              className="entrada"
              value={form.contato_email}
              onChange={(e) =>
                setForm({ ...form, contato_email: e.target.value })
              }
              placeholder="contato@startup.com"
            />
            <span className="dica">
              É para cá que vai o lembrete do checkpoint.
            </span>
          </div>

          <div className="campo">
            <label>Telefone</label>
            <input
              className="entrada"
              value={form.contato_fone}
              onChange={(e) =>
                setForm({ ...form, contato_fone: e.target.value })
              }
              placeholder="(85) 90000-0000"
            />
          </div>

          <div className="campo">
            <label>Dia preferido do mês</label>
            <input
              type="number"
              min={1}
              max={28}
              className="entrada"
              value={form.dia_preferido}
              onChange={(e) =>
                setForm({ ...form, dia_preferido: e.target.value })
              }
              placeholder="15"
            />
            <span className="dica">
              Usado ao gerar a agenda mensal automaticamente.
            </span>
          </div>

          <div className="campo">
            <label>Situação</label>
            <select
              className="selecao"
              value={form.ativa ? 'sim' : 'nao'}
              onChange={(e) =>
                setForm({ ...form, ativa: e.target.value === 'sim' })
              }
            >
              <option value="sim">Ativa</option>
              <option value="nao">Inativa</option>
            </select>
          </div>

          <div className="campo form-largo">
            <label>Observações</label>
            <textarea
              className="area"
              value={form.observacoes}
              onChange={(e) =>
                setForm({ ...form, observacoes: e.target.value })
              }
              placeholder="Contexto, histórico, pontos de atenção..."
            />
          </div>
        </form>
      </Modal>

      {/* ---------------- Confirmação de exclusão ---------------- */}
      <Modal
        aberto={paraExcluir !== null}
        titulo="Excluir startup"
        aoFechar={() => setParaExcluir(null)}
        rodape={
          <>
            <button
              className="btn btn-secundario"
              onClick={() => setParaExcluir(null)}
            >
              Cancelar
            </button>
            <button className="btn btn-perigo" onClick={excluir}>
              <IcLixeira />
              Excluir mesmo assim
            </button>
          </>
        }
      >
        <p style={{ margin: 0 }}>
          Tem certeza que quer excluir <b>{paraExcluir?.nome}</b>?
        </p>
        <div className="aviso aviso-atencao" style={{ marginTop: 14 }}>
          <span>
            Todos os checkpoints e atas dessa startup também serão apagados. Se
            ela só saiu do programa, prefira marcar como <b>Inativa</b> na
            edição.
          </span>
        </div>
      </Modal>
    </>
  );
}
