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
  distanciaEmTexto,
  emailConfigurado,
  enviarConvite,
  enviarLembrete,
  formatarData,
  formatarDataExtenso,
  formatarHora,
  formatarMes,
  lerConfigEmail,
  listaDeMeses,
  mesAtual,
  type Analista,
  type CheckpointCompleto,
  type Farol,
  type StatusCheckpoint,
  type Startup,
} from '../dados';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { EtiquetaFarol, EtiquetaStatus } from '../components/Etiquetas';
import {
  IcCalendario,
  IcCheck,
  IcCheckCirculo,
  IcEmail,
  IcEnviar,
  IcLapis,
  IcLixeira,
  IcMais,
  IcNota,
  IcRelampago,
  IcSino,
} from '../components/Icones';

const SELECT_COMPLETO =
  '*, startup:startups(id,nome,setor,contato_nome,contato_email), analista:analistas(id,nome,email,link_agendamento)';

export default function Checkpoints() {
  const { avisar } = useToast();

  const [lista, setLista] = useState<CheckpointCompleto[]>([]);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [analistas, setAnalistas] = useState<Analista[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [mes, setMes] = useState(mesAtual());
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroAnalista, setFiltroAnalista] = useState('');

  const [novoAberto, setNovoAberto] = useState(false);
  const [formNovo, setFormNovo] = useState({
    startup_id: '',
    analista_id: '',
    pauta: '',
  });

  const [confirmando, setConfirmando] = useState<CheckpointCompleto | null>(
    null
  );
  const [formData, setFormData] = useState({
    data: '',
    hora: '10:00',
    local: 'Online',
  });

  const [ataDe, setAtaDe] = useState<CheckpointCompleto | null>(null);
  const [formAta, setFormAta] = useState({
    ata: '',
    encaminhamentos: '',
    proximo_passo: '',
    farol: '' as Farol | '',
    status: 'realizado' as StatusCheckpoint,
  });

  const [paraExcluir, setParaExcluir] = useState<CheckpointCompleto | null>(
    null
  );
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);

  /* ---------------- Carregar ---------------- */

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [r1, r2, r3] = await Promise.all([
      supabase.from('checkpoints').select(SELECT_COMPLETO).order('criado_em'),
      supabase.from('startups').select('*').eq('ativa', true).order('nome'),
      supabase.from('analistas').select('*').order('nome'),
    ]);

    if (r1.error) avisar(traduzErro(r1.error.message), 'erro');
    else setLista((r1.data ?? []) as unknown as CheckpointCompleto[]);

    if (!r2.error) setStartups((r2.data ?? []) as Startup[]);
    if (!r3.error) setAnalistas((r3.data ?? []) as Analista[]);

    setCarregando(false);
  }, [avisar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  /* ---------------- Filtro e resumo ---------------- */

  const filtrada = useMemo(
    () =>
      lista
        .filter((c) => {
          if (mes && c.mes_referencia !== mes) return false;
          if (filtroStatus && c.status !== filtroStatus) return false;
          if (filtroAnalista && c.analista_id !== filtroAnalista) return false;
          return true;
        })
        .sort((a, b) =>
          (a.data_agendada ?? '9999').localeCompare(b.data_agendada ?? '9999')
        ),
    [lista, mes, filtroStatus, filtroAnalista]
  );

  const doMes = useMemo(
    () => lista.filter((c) => c.mes_referencia === mes),
    [lista, mes]
  );

  const resumo = useMemo(
    () => ({
      aConvidar: doMes.filter((c) => c.status === 'a_convidar').length,
      convidados: doMes.filter((c) => c.status === 'convite_enviado').length,
      confirmados: doMes.filter((c) => c.status === 'agendado').length,
      realizados: doMes.filter((c) => c.status === 'realizado').length,
    }),
    [doMes]
  );

  /* ---------------- Gerar o mês ---------------- */

  async function gerarMes() {
    setGerando(true);

    const jaTem = new Set(
      doMes.filter((c) => c.status !== 'cancelado').map((c) => c.startup_id)
    );

    const novos = startups
      .filter((s) => !jaTem.has(s.id))
      .map((s) => ({
        startup_id: s.id,
        analista_id: s.analista_id,
        mes_referencia: mes,
        status: 'a_convidar',
        local: 'Online',
      }));

    if (novos.length === 0) {
      setGerando(false);
      avisar('Todas as startups ativas já estão na lista deste mês.');
      return;
    }

    const { error } = await supabase.from('checkpoints').insert(novos);
    setGerando(false);

    if (error) avisar(traduzErro(error.message), 'erro');
    else {
      avisar(
        `${novos.length} checkpoint(s) criado(s) para ${formatarMes(mes)}.`
      );
      void carregar();
    }
  }

  /* ---------------- Novo avulso ---------------- */

  async function criarAvulso(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);

    const { error } = await supabase.from('checkpoints').insert({
      startup_id: formNovo.startup_id,
      analista_id: formNovo.analista_id || null,
      mes_referencia: mes,
      status: 'a_convidar',
      local: 'Online',
      pauta: formNovo.pauta.trim() || null,
    });

    setSalvando(false);

    if (error) {
      avisar(traduzErro(error.message), 'erro');
      return;
    }
    avisar('Checkpoint criado.');
    setNovoAberto(false);
    setFormNovo({ startup_id: '', analista_id: '', pauta: '' });
    void carregar();
  }

  /* ---------------- Enviar convite ---------------- */

  async function enviarConviteDe(c: CheckpointCompleto) {
    const cfg = lerConfigEmail();

    if (!emailConfigurado(cfg)) {
      avisar('Configure o EmailJS na tela de Configurações primeiro.', 'erro');
      return;
    }
    if (!c.startup?.contato_email) {
      avisar(
        `${c.startup?.nome ?? 'A startup'} não tem e-mail de contato.`,
        'erro'
      );
      return;
    }
    if (!c.analista?.link_agendamento) {
      avisar(
        `${
          c.analista?.nome ?? 'A analista'
        } ainda não cadastrou o link de agendamento (Configurações → Meu perfil).`,
        'erro'
      );
      return;
    }

    setOcupadoId(c.id);
    try {
      await enviarConvite(cfg, {
        paraEmail: c.startup.contato_email,
        paraNome: c.startup.contato_nome ?? c.startup.nome,
        startup: c.startup.nome,
        analista: c.analista.nome,
        link: c.analista.link_agendamento,
        mes: formatarMes(c.mes_referencia),
        copiaPara: cfg.copiaParaAnalista ? c.analista.email : '',
      });

      await supabase
        .from('checkpoints')
        .update({
          status: 'convite_enviado',
          convite_enviado_em: new Date().toISOString(),
        })
        .eq('id', c.id);

      avisar(`Convite enviado para ${c.startup.contato_email}.`);
      void carregar();
    } catch (err) {
      avisar(
        err instanceof Error ? err.message : 'Falha ao enviar o convite.',
        'erro'
      );
    } finally {
      setOcupadoId(null);
    }
  }

  /* ---------------- Confirmar agendamento ---------------- */

  function abrirConfirmacao(c: CheckpointCompleto) {
    setConfirmando(c);
    setFormData({
      data: c.data_agendada ?? '',
      hora: c.hora ? c.hora.slice(0, 5) : '10:00',
      local: c.local ?? 'Online',
    });
  }

  async function confirmarAgendamento(e: FormEvent) {
    e.preventDefault();
    if (!confirmando) return;
    setSalvando(true);

    const { error } = await supabase
      .from('checkpoints')
      .update({
        data_agendada: formData.data,
        hora: formData.hora || null,
        local: formData.local.trim() || 'Online',
        status: 'agendado',
      })
      .eq('id', confirmando.id);

    setSalvando(false);

    if (error) avisar(traduzErro(error.message), 'erro');
    else {
      avisar('Agendamento confirmado.');
      setConfirmando(null);
      void carregar();
    }
  }

  /* ---------------- Lembrete ---------------- */

  async function enviarLembreteDe(c: CheckpointCompleto) {
    const cfg = lerConfigEmail();

    if (!emailConfigurado(cfg)) {
      avisar('Configure o EmailJS na tela de Configurações primeiro.', 'erro');
      return;
    }
    if (!c.startup?.contato_email || !c.data_agendada) return;

    setOcupadoId(c.id);
    try {
      await enviarLembrete(cfg, {
        paraEmail: c.startup.contato_email,
        paraNome: c.startup.contato_nome ?? c.startup.nome,
        startup: c.startup.nome,
        analista: c.analista?.nome ?? 'Unifor Hub',
        data: formatarDataExtenso(c.data_agendada),
        hora: formatarHora(c.hora),
        local: c.local ?? 'Online',
        pauta: c.pauta ?? '',
        copiaPara: cfg.copiaParaAnalista ? c.analista?.email ?? '' : '',
      });

      await supabase
        .from('checkpoints')
        .update({ lembrete_enviado_em: new Date().toISOString() })
        .eq('id', c.id);

      avisar('Lembrete enviado.');
      void carregar();
    } catch (err) {
      avisar(err instanceof Error ? err.message : 'Falha ao enviar.', 'erro');
    } finally {
      setOcupadoId(null);
    }
  }

  /* ---------------- Ata ---------------- */

  function abrirAta(c: CheckpointCompleto) {
    setAtaDe(c);
    setFormAta({
      ata: c.ata ?? '',
      encaminhamentos: c.encaminhamentos ?? '',
      proximo_passo: c.proximo_passo ?? '',
      farol: (c.farol ?? '') as Farol | '',
      status: c.status === 'realizado' ? 'realizado' : 'realizado',
    });
  }

  async function salvarAta(e: FormEvent) {
    e.preventDefault();
    if (!ataDe) return;
    setSalvando(true);

    const { error } = await supabase
      .from('checkpoints')
      .update({
        ata: formAta.ata.trim() || null,
        encaminhamentos: formAta.encaminhamentos.trim() || null,
        proximo_passo: formAta.proximo_passo.trim() || null,
        farol: formAta.farol || null,
        status: formAta.status,
        realizado_em:
          formAta.status === 'realizado'
            ? ataDe.realizado_em ?? new Date().toISOString()
            : null,
      })
      .eq('id', ataDe.id);

    setSalvando(false);

    if (error) avisar(traduzErro(error.message), 'erro');
    else {
      avisar('Ata registrada.');
      setAtaDe(null);
      void carregar();
    }
  }

  /* ---------------- Excluir ---------------- */

  async function excluir() {
    if (!paraExcluir) return;
    const { error } = await supabase
      .from('checkpoints')
      .delete()
      .eq('id', paraExcluir.id);
    if (error) avisar(traduzErro(error.message), 'erro');
    else avisar('Checkpoint removido.');
    setParaExcluir(null);
    void carregar();
  }

  /* ---------------- Tela ---------------- */

  return (
    <>
      <div className="grade-indicadores">
        <div className="indicador">
          <div className="indicador-topo">
            <IcEmail /> A convidar
          </div>
          <div className="indicador-valor">{resumo.aConvidar}</div>
          <div className="indicador-rodape">ainda sem convite enviado</div>
        </div>
        <div className="indicador">
          <div className="indicador-topo">
            <IcEnviar /> Convite enviado
          </div>
          <div className="indicador-valor">{resumo.convidados}</div>
          <div className="indicador-rodape">aguardando a startup escolher</div>
        </div>
        <div className="indicador destaque">
          <div className="indicador-topo">
            <IcCalendario /> Confirmados
          </div>
          <div className="indicador-valor">{resumo.confirmados}</div>
          <div className="indicador-rodape">com data e hora definidas</div>
        </div>
        <div className="indicador">
          <div className="indicador-topo">
            <IcCheckCirculo /> Realizados
          </div>
          <div className="indicador-valor">{resumo.realizados}</div>
          <div className="indicador-rodape">com ata registrada</div>
        </div>
      </div>

      <div className="barra-filtros">
        <select
          className="selecao"
          style={{ width: 'auto', minWidth: 170 }}
          value={mes}
          onChange={(e) => setMes(e.target.value)}
        >
          {listaDeMeses().map((m) => (
            <option key={m} value={m}>
              {formatarMes(m)}
            </option>
          ))}
        </select>

        <select
          className="selecao"
          style={{ width: 'auto' }}
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          <option value="a_convidar">A convidar</option>
          <option value="convite_enviado">Convite enviado</option>
          <option value="agendado">Confirmado</option>
          <option value="realizado">Realizado</option>
          <option value="remarcado">Remarcado</option>
          <option value="cancelado">Cancelado</option>
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

        <div className="crescer" />

        <button
          className="btn btn-secundario"
          onClick={gerarMes}
          disabled={gerando}
        >
          {gerando ? <span className="giro escuro" /> : <IcRelampago />}
          Gerar mês
        </button>
        <button
          className="btn btn-primario"
          onClick={() => setNovoAberto(true)}
        >
          <IcMais />
          Novo
        </button>
      </div>

      <div className="cartao">
        <div className="cartao-cabecalho">
          <h3>{formatarMes(mes)}</h3>
          <span className="pequeno mudo">{filtrada.length} registro(s)</span>
        </div>

        {carregando ? (
          <div className="vazio">
            <span className="giro escuro" style={{ margin: '0 auto 12px' }} />
            <p>Carregando...</p>
          </div>
        ) : filtrada.length === 0 ? (
          <div className="vazio">
            <div className="vazio-icone">
              <IcCalendario />
            </div>
            <h4>Nenhum checkpoint em {formatarMes(mes)}</h4>
            <p>
              Clique em <b>Gerar mês</b> para criar a lista com todas as
              startups ativas. Depois é só disparar os convites — a data quem
              escolhe é a startup.
            </p>
            <button
              className="btn btn-primario"
              onClick={gerarMes}
              disabled={gerando}
            >
              <IcRelampago /> Gerar mês
            </button>
          </div>
        ) : (
          <div className="tabela-envolve">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Startup</th>
                  <th>Analista</th>
                  <th>Status</th>
                  <th>Data confirmada</th>
                  <th>Farol</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtrada.map((c) => {
                  const ocupado = ocupadoId === c.id;
                  const preAgenda =
                    c.status === 'a_convidar' || c.status === 'convite_enviado';

                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="celula-principal">
                          {c.startup?.nome ?? '—'}
                        </div>
                        {c.startup?.contato_email && (
                          <div className="pequeno mudo">
                            {c.startup.contato_email}
                          </div>
                        )}
                      </td>
                      <td className="pequeno">{c.analista?.nome ?? '—'}</td>
                      <td>
                        <EtiquetaStatus status={c.status} />
                        {c.convite_enviado_em &&
                          c.status === 'convite_enviado' && (
                            <div
                              className="pequeno mudo"
                              style={{ marginTop: 3 }}
                            >
                              {formatarData(c.convite_enviado_em.slice(0, 10))}
                            </div>
                          )}
                      </td>
                      <td>
                        {c.data_agendada ? (
                          <>
                            <div className="negrito nowrap">
                              {formatarData(c.data_agendada)} ·{' '}
                              {formatarHora(c.hora)}
                            </div>
                            <div className="pequeno mudo nowrap">
                              {c.local} · {distanciaEmTexto(c.data_agendada)}
                            </div>
                          </>
                        ) : (
                          <span className="mudo pequeno">aguardando</span>
                        )}
                      </td>
                      <td>
                        <EtiquetaFarol farol={c.farol} />
                      </td>
                      <td className="celula-acoes">
                        {preAgenda && (
                          <>
                            <button
                              className="btn btn-suave btn-pequeno"
                              disabled={ocupado}
                              onClick={() => enviarConviteDe(c)}
                              title="Enviar convite com o link de agendamento"
                            >
                              {ocupado ? (
                                <span className="giro escuro" />
                              ) : (
                                <IcEnviar />
                              )}
                              {c.status === 'a_convidar'
                                ? 'Convidar'
                                : 'Reenviar'}
                            </button>
                            <button
                              className="btn btn-fantasma btn-icone"
                              title="Confirmar agendamento"
                              onClick={() => abrirConfirmacao(c)}
                            >
                              <IcCalendario style={{ width: 15, height: 15 }} />
                            </button>
                          </>
                        )}

                        {c.status === 'agendado' && (
                          <>
                            <button
                              className="btn btn-fantasma btn-icone"
                              title="Enviar lembrete"
                              disabled={ocupado}
                              onClick={() => enviarLembreteDe(c)}
                            >
                              {ocupado ? (
                                <span className="giro escuro" />
                              ) : (
                                <IcSino style={{ width: 15, height: 15 }} />
                              )}
                            </button>
                            <button
                              className="btn btn-fantasma btn-icone"
                              title="Alterar data"
                              onClick={() => abrirConfirmacao(c)}
                            >
                              <IcLapis style={{ width: 15, height: 15 }} />
                            </button>
                          </>
                        )}

                        <button
                          className="btn btn-fantasma btn-icone"
                          title="Ata"
                          onClick={() => abrirAta(c)}
                        >
                          <IcNota style={{ width: 15, height: 15 }} />
                        </button>
                        <button
                          className="btn btn-fantasma btn-icone"
                          title="Excluir"
                          onClick={() => setParaExcluir(c)}
                        >
                          <IcLixeira style={{ width: 15, height: 15 }} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------- Novo ---------- */}
      <Modal
        aberto={novoAberto}
        titulo="Novo checkpoint"
        subtitulo={`Será criado em ${formatarMes(
          mes
        )}, sem data — a startup escolhe depois.`}
        aoFechar={() => setNovoAberto(false)}
        rodape={
          <>
            <button
              className="btn btn-secundario"
              onClick={() => setNovoAberto(false)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-novo"
              className="btn btn-primario"
              disabled={salvando}
            >
              {salvando && <span className="giro" />} Criar
            </button>
          </>
        }
      >
        <form id="form-novo" onSubmit={criarAvulso} className="grade-form">
          <div className="campo form-largo">
            <label>Startup *</label>
            <select
              className="selecao"
              value={formNovo.startup_id}
              onChange={(e) => {
                const s = startups.find((x) => x.id === e.target.value);
                setFormNovo({
                  ...formNovo,
                  startup_id: e.target.value,
                  analista_id: s?.analista_id ?? '',
                });
              }}
              required
            >
              <option value="">Selecione...</option>
              {startups.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="campo form-largo">
            <label>Analista</label>
            <select
              className="selecao"
              value={formNovo.analista_id}
              onChange={(e) =>
                setFormNovo({ ...formNovo, analista_id: e.target.value })
              }
            >
              <option value="">Sem responsável</option>
              {analistas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
            <span className="dica">
              O link de agendamento enviado será o dela.
            </span>
          </div>

          <div className="campo form-largo">
            <label>Pauta prevista</label>
            <textarea
              className="area"
              value={formNovo.pauta}
              onChange={(e) =>
                setFormNovo({ ...formNovo, pauta: e.target.value })
              }
              placeholder="O que será tratado..."
            />
          </div>
        </form>
      </Modal>

      {/* ---------- Confirmar agendamento ---------- */}
      <Modal
        aberto={confirmando !== null}
        titulo="Confirmar agendamento"
        subtitulo={`${
          confirmando?.startup?.nome ?? ''
        } — preencha o horário que a startup escolheu na sua agenda.`}
        aoFechar={() => setConfirmando(null)}
        rodape={
          <>
            <button
              className="btn btn-secundario"
              onClick={() => setConfirmando(null)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-conf"
              className="btn btn-primario"
              disabled={salvando}
            >
              {salvando ? <span className="giro" /> : <IcCheck />} Confirmar
            </button>
          </>
        }
      >
        <form
          id="form-conf"
          onSubmit={confirmarAgendamento}
          className="grade-form"
        >
          <div className="campo">
            <label>Data *</label>
            <input
              type="date"
              className="entrada"
              value={formData.data}
              onChange={(e) =>
                setFormData({ ...formData, data: e.target.value })
              }
              required
            />
          </div>
          <div className="campo">
            <label>Hora</label>
            <input
              type="time"
              className="entrada"
              value={formData.hora}
              onChange={(e) =>
                setFormData({ ...formData, hora: e.target.value })
              }
            />
          </div>
          <div className="campo form-largo">
            <label>Local / link da reunião</label>
            <input
              className="entrada"
              value={formData.local}
              onChange={(e) =>
                setFormData({ ...formData, local: e.target.value })
              }
              placeholder="Google Meet, Sala 3, ..."
            />
          </div>
        </form>
      </Modal>

      {/* ---------- Ata ---------- */}
      <Modal
        aberto={ataDe !== null}
        largo
        titulo={`Ata · ${ataDe?.startup?.nome ?? ''}`}
        subtitulo={
          ataDe?.data_agendada
            ? `${formatarDataExtenso(ataDe.data_agendada)} às ${formatarHora(
                ataDe.hora
              )}`
            : formatarMes(ataDe?.mes_referencia ?? mes)
        }
        aoFechar={() => setAtaDe(null)}
        rodape={
          <>
            <button
              className="btn btn-secundario"
              onClick={() => setAtaDe(null)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-ata"
              className="btn btn-primario"
              disabled={salvando}
            >
              {salvando ? <span className="giro" /> : <IcCheck />} Salvar ata
            </button>
          </>
        }
      >
        <form
          id="form-ata"
          onSubmit={salvarAta}
          className="coluna"
          style={{ gap: 16 }}
        >
          {ataDe?.pauta && (
            <div className="bloco-ata">
              <h5>Pauta prevista</h5>
              <p>{ataDe.pauta}</p>
            </div>
          )}

          <div className="campo">
            <label>Como foi o checkpoint?</label>
            <div className="escolha-farol">
              {(['verde', 'amarelo', 'vermelho'] as Farol[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`opcao-farol ${
                    formAta.farol === f ? `on-${f}` : ''
                  }`}
                  onClick={() => setFormAta({ ...formAta, farol: f })}
                >
                  {f === 'verde'
                    ? 'No ritmo'
                    : f === 'amarelo'
                    ? 'Atenção'
                    : 'Risco'}
                </button>
              ))}
            </div>
          </div>

          <div className="campo">
            <label>Ata da reunião</label>
            <textarea
              className="area"
              style={{ minHeight: 130 }}
              value={formAta.ata}
              onChange={(e) => setFormAta({ ...formAta, ata: e.target.value })}
              placeholder="O que foi discutido, decisões, contexto do mês..."
            />
          </div>

          <div className="campo">
            <label>Encaminhamentos</label>
            <textarea
              className="area"
              value={formAta.encaminhamentos}
              onChange={(e) =>
                setFormAta({ ...formAta, encaminhamentos: e.target.value })
              }
              placeholder="Quem faz o quê até quando..."
            />
          </div>

          <div className="grade-form">
            <div className="campo">
              <label>Próximo passo</label>
              <input
                className="entrada"
                value={formAta.proximo_passo}
                onChange={(e) =>
                  setFormAta({ ...formAta, proximo_passo: e.target.value })
                }
                placeholder="Ex.: Entregar MVP até dia 20"
              />
            </div>
            <div className="campo">
              <label>Status</label>
              <select
                className="selecao"
                value={formAta.status}
                onChange={(e) =>
                  setFormAta({
                    ...formAta,
                    status: e.target.value as StatusCheckpoint,
                  })
                }
              >
                <option value="realizado">Realizado</option>
                <option value="remarcado">Remarcado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* ---------- Excluir ---------- */}
      <Modal
        aberto={paraExcluir !== null}
        titulo="Excluir checkpoint"
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
              <IcLixeira /> Excluir
            </button>
          </>
        }
      >
        <p style={{ margin: 0 }}>
          Excluir o checkpoint de <b>{paraExcluir?.startup?.nome}</b> em{' '}
          <b>{formatarMes(paraExcluir?.mes_referencia ?? mes)}</b>? A ata também
          será perdida.
        </p>
      </Modal>
    </>
  );
}
