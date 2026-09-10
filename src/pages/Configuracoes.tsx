import { useEffect, useState, type FormEvent } from 'react';
import {
  supabase,
  traduzErro,
  CONFIG_EMAIL_PADRAO,
  emailConfigurado,
  enviarConvite,
  enviarLembrete,
  lerConfigEmail,
  salvarConfigEmail,
  type ConfigEmail,
} from '../dados';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  IcAlerta,
  IcCalendario,
  IcCheckCirculo,
  IcEmail,
  IcEnviar,
  IcInfo,
} from '../components/Icones';

export default function Configuracoes() {
  const { analista, sessao, recarregarPerfil } = useAuth();
  const { avisar } = useToast();

  const [cfg, setCfg] = useState<ConfigEmail>(CONFIG_EMAIL_PADRAO);
  const [testando, setTestando] = useState<'convite' | 'lembrete' | null>(null);

  const [perfil, setPerfil] = useState({
    nome: '',
    cargo: '',
    telefone: '',
    link_agendamento: '',
  });
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  useEffect(() => {
    setCfg(lerConfigEmail());
  }, []);

  useEffect(() => {
    if (analista) {
      setPerfil({
        nome: analista.nome ?? '',
        cargo: analista.cargo ?? '',
        telefone: analista.telefone ?? '',
        link_agendamento: analista.link_agendamento ?? '',
      });
    }
  }, [analista]);

  function salvarEmail(e: FormEvent) {
    e.preventDefault();
    salvarConfigEmail(cfg);
    avisar('Configurações de e-mail salvas.');
  }

  async function testar(tipo: 'convite' | 'lembrete') {
    const email = sessao?.user.email;
    if (!email) return;

    if (!emailConfigurado(cfg)) {
      avisar(
        'Preencha Service ID, Public Key e ao menos um Template ID.',
        'erro'
      );
      return;
    }

    salvarConfigEmail(cfg);
    setTestando(tipo);

    try {
      if (tipo === 'convite') {
        await enviarConvite(cfg, {
          paraEmail: email,
          paraNome: analista?.nome ?? 'Analista',
          startup: 'Startup de Teste',
          analista: analista?.nome ?? 'Unifor Hub',
          link:
            perfil.link_agendamento || 'https://calendar.app.google/exemplo',
          mes: 'Dezembro de 2026',
        });
      } else {
        await enviarLembrete(cfg, {
          paraEmail: email,
          paraNome: analista?.nome ?? 'Analista',
          startup: 'Startup de Teste',
          analista: analista?.nome ?? 'Unifor Hub',
          data: 'segunda-feira, 15 de dezembro',
          hora: '10:00',
          local: 'Google Meet',
          pauta: 'E-mail de teste da plataforma de Checkpoints.',
        });
      }
      avisar(`E-mail de teste enviado para ${email}.`);
    } catch (err) {
      avisar(err instanceof Error ? err.message : 'Falha no envio.', 'erro');
    } finally {
      setTestando(null);
    }
  }

  async function salvarPerfil(e: FormEvent) {
    e.preventDefault();
    if (!analista) return;
    setSalvandoPerfil(true);

    const { error } = await supabase
      .from('analistas')
      .update({
        nome: perfil.nome.trim(),
        cargo: perfil.cargo.trim() || null,
        telefone: perfil.telefone.trim() || null,
        link_agendamento: perfil.link_agendamento.trim() || null,
      })
      .eq('id', analista.id);

    setSalvandoPerfil(false);

    if (error) avisar(traduzErro(error.message), 'erro');
    else {
      avisar('Perfil atualizado.');
      void recarregarPerfil();
    }
  }

  const pronto = emailConfigurado(cfg);
  const temLink = Boolean(perfil.link_agendamento.trim());

  return (
    <div className="coluna" style={{ gap: 20, maxWidth: 840 }}>
      {/* ---------- Perfil e agenda ---------- */}
      <div className="cartao">
        <div className="cartao-cabecalho">
          <div className="linha">
            <IcCalendario
              style={{ width: 18, height: 18, color: 'var(--azul-500)' }}
            />
            <h3>Meu perfil e agenda</h3>
          </div>
          <span className={`etiqueta ${temLink ? 'etq-verde' : 'etq-ambar'}`}>
            <span className="ponto" />
            {temLink ? 'Link cadastrado' : 'Sem link de agendamento'}
          </span>
        </div>

        <div className="cartao-corpo">
          <form onSubmit={salvarPerfil} className="grade-form">
            <div className="campo form-largo">
              <label>Link de agendamento *</label>
              <input
                className="entrada"
                value={perfil.link_agendamento}
                onChange={(e) =>
                  setPerfil({ ...perfil, link_agendamento: e.target.value })
                }
                placeholder="https://calendar.app.google/..."
              />
              <span className="dica">
                É este link que vai no convite para a startup escolher o
                horário. Pegue no Google Calendar em{' '}
                <b>
                  Criar → Horário de atendimento → Abrir página de agendamentos
                </b>
                .
              </span>
            </div>

            <div className="campo">
              <label>Nome</label>
              <input
                className="entrada"
                value={perfil.nome}
                onChange={(e) => setPerfil({ ...perfil, nome: e.target.value })}
                required
              />
            </div>

            <div className="campo">
              <label>Cargo</label>
              <input
                className="entrada"
                value={perfil.cargo}
                onChange={(e) =>
                  setPerfil({ ...perfil, cargo: e.target.value })
                }
                placeholder="Analista de Inovação"
              />
            </div>

            <div className="campo">
              <label>Telefone</label>
              <input
                className="entrada"
                value={perfil.telefone}
                onChange={(e) =>
                  setPerfil({ ...perfil, telefone: e.target.value })
                }
                placeholder="(85) 90000-0000"
              />
            </div>

            <div className="campo">
              <label>E-mail de acesso</label>
              <input
                className="entrada"
                value={sessao?.user.email ?? ''}
                disabled
              />
            </div>

            <div className="form-largo">
              <button className="btn btn-primario" disabled={salvandoPerfil}>
                {salvandoPerfil && <span className="giro" />}
                Salvar perfil
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ---------- E-mails ---------- */}
      <div className="cartao">
        <div className="cartao-cabecalho">
          <div className="linha">
            <IcEmail
              style={{ width: 18, height: 18, color: 'var(--azul-500)' }}
            />
            <h3>Envio de e-mails</h3>
          </div>
          <span className={`etiqueta ${pronto ? 'etq-verde' : 'etq-ambar'}`}>
            <span className="ponto" />
            {pronto ? 'Configurado' : 'Falta configurar'}
          </span>
        </div>

        <div className="cartao-corpo">
          <div className="aviso aviso-info" style={{ marginBottom: 18 }}>
            <IcInfo />
            <span>
              As chaves ficam salvas <b>neste navegador</b>, não no banco. Ao
              usar a plataforma em outro computador, preencha novamente lá.
            </span>
          </div>

          <form onSubmit={salvarEmail} className="grade-form">
            <div className="campo">
              <label>Service ID</label>
              <input
                className="entrada"
                value={cfg.serviceId}
                onChange={(e) => setCfg({ ...cfg, serviceId: e.target.value })}
                placeholder="service_xxxxxxx"
              />
            </div>

            <div className="campo">
              <label>Public Key</label>
              <input
                className="entrada"
                value={cfg.publicKey}
                onChange={(e) => setCfg({ ...cfg, publicKey: e.target.value })}
                placeholder="Account → General"
              />
            </div>

            <div className="campo">
              <label>Template do convite</label>
              <input
                className="entrada"
                value={cfg.templateConviteId}
                onChange={(e) =>
                  setCfg({ ...cfg, templateConviteId: e.target.value })
                }
                placeholder="template_xxxxxxx"
              />
              <span className="dica">
                Usa {'{{link}}'} e {'{{mes}}'}
              </span>
            </div>

            <div className="campo">
              <label>Template do lembrete</label>
              <input
                className="entrada"
                value={cfg.templateId}
                onChange={(e) => setCfg({ ...cfg, templateId: e.target.value })}
                placeholder="template_yyyyyyy"
              />
              <span className="dica">
                Usa {'{{data}}'}, {'{{hora}}'} e {'{{local}}'}
              </span>
            </div>

            <div className="campo">
              <label>Nome do remetente</label>
              <input
                className="entrada"
                value={cfg.remetenteNome}
                onChange={(e) =>
                  setCfg({ ...cfg, remetenteNome: e.target.value })
                }
              />
            </div>

            <div className="campo">
              <label>Antecedência do lembrete</label>
              <select
                className="selecao"
                value={cfg.diasAntecedencia}
                onChange={(e) =>
                  setCfg({ ...cfg, diasAntecedencia: Number(e.target.value) })
                }
              >
                <option value={1}>1 dia antes</option>
                <option value={2}>2 dias antes</option>
                <option value={3}>3 dias antes</option>
                <option value={5}>5 dias antes</option>
                <option value={7}>1 semana antes</option>
              </select>
            </div>

            <div className="campo">
              <label>Envio automático do lembrete</label>
              <select
                className="selecao"
                value={cfg.envioAutomatico ? 'sim' : 'nao'}
                onChange={(e) =>
                  setCfg({ ...cfg, envioAutomatico: e.target.value === 'sim' })
                }
              >
                <option value="sim">Ligado</option>
                <option value="nao">Desligado</option>
              </select>
              <span className="dica">Dispara ao abrir a plataforma.</span>
            </div>

            <div className="campo">
              <label>Cópia para a analista</label>
              <select
                className="selecao"
                value={cfg.copiaParaAnalista ? 'sim' : 'nao'}
                onChange={(e) =>
                  setCfg({
                    ...cfg,
                    copiaParaAnalista: e.target.value === 'sim',
                  })
                }
              >
                <option value="sim">Sim, em cópia</option>
                <option value="nao">Não</option>
              </select>
            </div>

            <div
              className="form-largo linha"
              style={{ marginTop: 6, flexWrap: 'wrap' }}
            >
              <button type="submit" className="btn btn-primario">
                <IcCheckCirculo />
                Salvar
              </button>
              <button
                type="button"
                className="btn btn-secundario"
                onClick={() => testar('convite')}
                disabled={testando !== null}
              >
                {testando === 'convite' ? (
                  <span className="giro escuro" />
                ) : (
                  <IcEnviar />
                )}
                Testar convite
              </button>
              <button
                type="button"
                className="btn btn-secundario"
                onClick={() => testar('lembrete')}
                disabled={testando !== null}
              >
                {testando === 'lembrete' ? (
                  <span className="giro escuro" />
                ) : (
                  <IcEnviar />
                )}
                Testar lembrete
              </button>
            </div>
          </form>

          {!pronto && (
            <div className="aviso aviso-atencao" style={{ marginTop: 18 }}>
              <IcAlerta />
              <span>
                Crie a conta grátis em <b>emailjs.com</b>, conecte seu Gmail em{' '}
                <b>Email Services</b> e crie os dois templates em{' '}
                <b>Email Templates</b>.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
