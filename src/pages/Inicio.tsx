import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  supabase,
  traduzErro,
  MESES,
  distanciaEmTexto,
  diasAte,
  formatarHora,
  formatarMes,
  hojeISO,
  mesAtual,
  paraData,
  type CheckpointCompleto,
  type Startup,
} from '../dados';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { EtiquetaStatus } from '../components/Etiquetas';
import {
  IcCalendario,
  IcCheckCirculo,
  IcEmail,
  IcEnviar,
  IcFoguete,
  IcRelampago,
  IcSeta,
} from '../components/Icones';

const SELECT_COMPLETO =
  '*, startup:startups(id,nome,setor,contato_nome,contato_email), analista:analistas(id,nome,email,link_agendamento)';

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Bloquinho de data usado nas listas */
function BlocoData({ iso }: { iso: string }) {
  const d = paraData(iso);
  return (
    <div className="data-bloco">
      <div className="dia">{String(d.getDate()).padStart(2, '0')}</div>
      <div className="mes">{MESES[d.getMonth()].slice(0, 3)}</div>
    </div>
  );
}

export default function Inicio() {
  const { analista } = useAuth();
  const { avisar } = useToast();
  const navegar = useNavigate();

  const [lista, setLista] = useState<CheckpointCompleto[]>([]);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [carregando, setCarregando] = useState(true);

  const mes = mesAtual();

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [r1, r2] = await Promise.all([
      supabase.from('checkpoints').select(SELECT_COMPLETO),
      supabase.from('startups').select('*').eq('ativa', true).order('nome'),
    ]);

    if (r1.error) avisar(traduzErro(r1.error.message), 'erro');
    else setLista((r1.data ?? []) as unknown as CheckpointCompleto[]);

    if (!r2.error) setStartups((r2.data ?? []) as Startup[]);
    setCarregando(false);
  }, [avisar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const doMes = useMemo(
    () =>
      lista.filter((c) => c.mes_referencia === mes && c.status !== 'cancelado'),
    [lista, mes]
  );

  const indicadores = useMemo(
    () => ({
      aConvidar: doMes.filter((c) => c.status === 'a_convidar').length,
      convidados: doMes.filter((c) => c.status === 'convite_enviado').length,
      confirmados: doMes.filter((c) => c.status === 'agendado').length,
      realizados: doMes.filter((c) => c.status === 'realizado').length,
    }),
    [doMes]
  );

  /** Próximos confirmados, de hoje em diante */
  const proximos = useMemo(
    () =>
      lista
        .filter(
          (c) =>
            c.status === 'agendado' &&
            c.data_agendada !== null &&
            c.data_agendada >= hojeISO()
        )
        .sort((a, b) =>
          (a.data_agendada ?? '').localeCompare(b.data_agendada ?? '')
        )
        .slice(0, 6),
    [lista]
  );

  /** Convites enviados há mais de 5 dias sem confirmação */
  const semResposta = useMemo(
    () =>
      doMes.filter(
        (c) =>
          c.status === 'convite_enviado' &&
          c.convite_enviado_em !== null &&
          diasAte(c.convite_enviado_em.slice(0, 10)) <= -5
      ),
    [doMes]
  );

  /** Startups ativas que ainda não entraram no mês */
  const foraDoMes = useMemo(() => {
    const dentro = new Set(doMes.map((c) => c.startup_id));
    return startups.filter((s) => !dentro.has(s.id));
  }, [startups, doMes]);

  /** Confirmados que já passaram e não têm ata */
  const semAta = useMemo(
    () =>
      lista.filter(
        (c) =>
          c.status === 'agendado' &&
          c.data_agendada !== null &&
          c.data_agendada < hojeISO()
      ),
    [lista]
  );

  const primeiroNome = (analista?.nome ?? '').split(' ')[0];

  if (carregando) {
    return (
      <div className="cartao">
        <div className="vazio">
          <span className="giro escuro" style={{ margin: '0 auto 12px' }} />
          <p>Carregando o panorama...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22 }}>
          {saudacao()}
          {primeiroNome ? `, ${primeiroNome}` : ''} 👋
        </h2>
        <p className="mudo" style={{ margin: '4px 0 0' }}>
          Aqui está o andamento dos checkpoints de {formatarMes(mes)}.
        </p>
      </div>

      {/* ---------- Indicadores ---------- */}
      <div className="grade-indicadores">
        <div className="indicador">
          <div className="indicador-topo">
            <IcEmail /> A convidar
          </div>
          <div className="indicador-valor">{indicadores.aConvidar}</div>
          <div className="indicador-rodape">sem convite enviado</div>
        </div>
        <div className="indicador">
          <div className="indicador-topo">
            <IcEnviar /> Aguardando escolha
          </div>
          <div className="indicador-valor">{indicadores.convidados}</div>
          <div className="indicador-rodape">convite enviado, sem data</div>
        </div>
        <div className="indicador destaque">
          <div className="indicador-topo">
            <IcCalendario /> Confirmados
          </div>
          <div className="indicador-valor">{indicadores.confirmados}</div>
          <div className="indicador-rodape">com data e hora marcadas</div>
        </div>
        <div className="indicador">
          <div className="indicador-topo">
            <IcCheckCirculo /> Realizados
          </div>
          <div className="indicador-valor">{indicadores.realizados}</div>
          <div className="indicador-rodape">com ata registrada</div>
        </div>
      </div>

      {/* ---------- Próximos ---------- */}
      <div className="cartao" style={{ marginBottom: 20 }}>
        <div className="cartao-cabecalho">
          <h3>Próximos checkpoints</h3>
          <button
            className="btn btn-fantasma btn-pequeno"
            onClick={() => navegar('/checkpoints')}
          >
            Ver todos <IcSeta />
          </button>
        </div>

        {proximos.length === 0 ? (
          <div className="vazio" style={{ padding: '36px 24px' }}>
            <div className="vazio-icone">
              <IcCalendario />
            </div>
            <h4>Nenhum checkpoint confirmado ainda</h4>
            <p>
              Envie os convites e, conforme as startups escolherem o horário na
              sua agenda, registre as datas aqui.
            </p>
          </div>
        ) : (
          <div className="lista-limpa">
            {proximos.map((c) => (
              <div key={c.id} className="item-lista">
                <BlocoData iso={c.data_agendada!} />
                <div className="crescer" style={{ minWidth: 0 }}>
                  <div className="negrito">{c.startup?.nome}</div>
                  <div className="pequeno mudo">
                    {formatarHora(c.hora)} · {c.local} ·{' '}
                    {c.analista?.nome ?? 'sem analista'}
                  </div>
                </div>
                <span className="etiqueta etq-azul nowrap">
                  {distanciaEmTexto(c.data_agendada!)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Precisa de atenção ---------- */}
      <div className="cartao" style={{ marginBottom: 20 }}>
        <div className="cartao-cabecalho">
          <h3>Precisa da sua atenção</h3>
        </div>

        {indicadores.aConvidar === 0 &&
        semResposta.length === 0 &&
        semAta.length === 0 &&
        foraDoMes.length === 0 ? (
          <div className="vazio" style={{ padding: '36px 24px' }}>
            <div className="vazio-icone">
              <IcCheckCirculo />
            </div>
            <h4>Tudo em dia por aqui</h4>
            <p>Nenhuma pendência no mês. 🎉</p>
          </div>
        ) : (
          <div className="lista-limpa">
            {foraDoMes.length > 0 && (
              <div className="item-lista">
                <div className="crescer">
                  <div className="negrito">
                    {foraDoMes.length} startup(s) fora da agenda de{' '}
                    {formatarMes(mes)}
                  </div>
                  <div className="pequeno mudo">
                    {foraDoMes
                      .slice(0, 4)
                      .map((s) => s.nome)
                      .join(', ')}
                    {foraDoMes.length > 4
                      ? ` e mais ${foraDoMes.length - 4}`
                      : ''}
                  </div>
                </div>
                <button
                  className="btn btn-suave btn-pequeno"
                  onClick={() => navegar('/checkpoints')}
                >
                  <IcRelampago /> Gerar mês
                </button>
              </div>
            )}

            {indicadores.aConvidar > 0 && (
              <div className="item-lista">
                <div className="crescer">
                  <div className="negrito">
                    {indicadores.aConvidar} convite(s) ainda não enviado(s)
                  </div>
                  <div className="pequeno mudo">
                    A startup só consegue marcar depois de receber o link.
                  </div>
                </div>
                <button
                  className="btn btn-suave btn-pequeno"
                  onClick={() => navegar('/checkpoints')}
                >
                  <IcEnviar /> Enviar
                </button>
              </div>
            )}

            {semResposta.map((c) => (
              <div key={c.id} className="item-lista">
                <div className="crescer">
                  <div className="negrito">{c.startup?.nome}</div>
                  <div className="pequeno mudo">
                    Convite enviado{' '}
                    {distanciaEmTexto(c.convite_enviado_em!.slice(0, 10))} e
                    ainda sem horário escolhido.
                  </div>
                </div>
                <span className="etiqueta etq-ambar nowrap">Sem resposta</span>
              </div>
            ))}

            {semAta.map((c) => (
              <div key={c.id} className="item-lista">
                <BlocoData iso={c.data_agendada!} />
                <div className="crescer">
                  <div className="negrito">{c.startup?.nome}</div>
                  <div className="pequeno mudo">
                    Já aconteceu e ainda não tem ata registrada.
                  </div>
                </div>
                <button
                  className="btn btn-suave btn-pequeno"
                  onClick={() => navegar('/checkpoints')}
                >
                  Registrar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Atalhos ---------- */}
      <div className="cartao">
        <div className="cartao-cabecalho">
          <h3>Atalhos</h3>
        </div>
        <div className="cartao-corpo linha" style={{ flexWrap: 'wrap' }}>
          <button
            className="btn btn-secundario"
            onClick={() => navegar('/checkpoints')}
          >
            <IcCalendario /> Checkpoints do mês
          </button>
          <button
            className="btn btn-secundario"
            onClick={() => navegar('/startups')}
          >
            <IcFoguete /> Cadastrar startup
          </button>
          <button
            className="btn btn-secundario"
            onClick={() => navegar('/analistas')}
          >
            <IcEmail /> Ver o time
          </button>
        </div>
      </div>
    </>
  );
}
