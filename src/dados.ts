import { createClient } from '@supabase/supabase-js';
import emailjs from '@emailjs/browser';

/* ============================================================
   1. CONFIGURAÇÃO
   ============================================================ */

export const SUPABASE_URL = 'https://dgmtiptgqzzhxinqfzzb.supabase.co';
export const SUPABASE_ANON_KEY =
  'sb_publishable_MidbR7ebi1kIqs8mzYdolQ_XyxKBtTa';

export const SUPABASE_CONFIGURADO =
  SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 30;

export const APP_NOME = 'Checkpoints';
export const APP_ORG = 'Unifor Hub';

/* ============================================================
   2. CLIENTE DO BANCO
   ============================================================ */

export const supabase = createClient(
  SUPABASE_CONFIGURADO ? SUPABASE_URL : 'https://placeholder.supabase.co',
  SUPABASE_CONFIGURADO
    ? SUPABASE_ANON_KEY
    : 'chave-placeholder-para-nao-quebrar-o-app',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export function traduzErro(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes('invalid login credentials'))
    return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed'))
    return 'Confirme seu e-mail antes de entrar.';
  if (m.includes('user already registered'))
    return 'Esse e-mail já tem cadastro.';
  if (m.includes('password should be at least'))
    return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('failed to fetch') || m.includes('networkerror'))
    return 'Não consegui falar com o Supabase. Confira a URL e a chave em src/dados.ts.';
  if (m.includes('uniq_cp_startup_mes'))
    return 'Essa startup já tem um checkpoint neste mês.';
  if (m.includes('duplicate key')) return 'Esse registro já existe.';
  return mensagem;
}

/* ============================================================
   3. TIPOS
   ============================================================ */

export type StatusCheckpoint =
  | 'a_convidar'
  | 'convite_enviado'
  | 'agendado'
  | 'realizado'
  | 'remarcado'
  | 'cancelado';

export type Farol = 'verde' | 'amarelo' | 'vermelho';

export interface Analista {
  id: string;
  nome: string;
  email: string;
  cargo: string | null;
  telefone: string | null;
  link_agendamento: string | null;
  ativo: boolean;
  criado_em: string;
}

export interface Startup {
  id: string;
  nome: string;
  setor: string | null;
  estagio: string | null;
  programa: string | null;
  contato_nome: string | null;
  contato_email: string | null;
  contato_fone: string | null;
  analista_id: string | null;
  dia_preferido: number | null;
  observacoes: string | null;
  ativa: boolean;
  criado_em: string;
}

export interface Checkpoint {
  id: string;
  startup_id: string;
  analista_id: string | null;
  data_agendada: string | null;
  hora: string | null;
  local: string | null;
  mes_referencia: string;
  status: StatusCheckpoint;
  farol: Farol | null;
  pauta: string | null;
  ata: string | null;
  encaminhamentos: string | null;
  proximo_passo: string | null;
  realizado_em: string | null;
  convite_enviado_em: string | null;
  lembrete_enviado_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface CheckpointCompleto extends Checkpoint {
  startup: Pick<
    Startup,
    'id' | 'nome' | 'setor' | 'contato_nome' | 'contato_email'
  > | null;
  analista: Pick<Analista, 'id' | 'nome' | 'email' | 'link_agendamento'> | null;
}

export const ESTAGIOS = ['Ideação', 'Validação', 'Tração', 'Escala'] as const;

export const PROGRAMAS = [
  'Pré-incubação',
  'Incubação',
  'Residência',
  'Aceleração',
  'Graduada',
] as const;

export const STATUS_LABEL: Record<StatusCheckpoint, string> = {
  a_convidar: 'A convidar',
  convite_enviado: 'Convite enviado',
  agendado: 'Confirmado',
  realizado: 'Realizado',
  remarcado: 'Remarcado',
  cancelado: 'Cancelado',
};

export const FAROL_LABEL: Record<Farol, string> = {
  verde: 'No ritmo',
  amarelo: 'Atenção',
  vermelho: 'Risco',
};

/* ============================================================
   4. DATAS
   ============================================================ */

export const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function paraData(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function paraISO(data: Date): string {
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  return data.getFullYear() + '-' + m + '-' + d;
}

export function formatarData(iso: string | null): string {
  if (!iso) return '—';
  return paraData(iso).toLocaleDateString('pt-BR');
}

export function formatarDataExtenso(iso: string | null): string {
  if (!iso) return '—';
  return paraData(iso).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

export function formatarHora(hora: string | null): string {
  if (!hora) return '—';
  return hora.slice(0, 5);
}

export function formatarMes(ref: string): string {
  const [a, m] = ref.split('-').map(Number);
  return MESES[m - 1] + ' de ' + a;
}

export function hojeISO(): string {
  return paraISO(new Date());
}

export function mesAtual(): string {
  const h = new Date();
  return h.getFullYear() + '-' + String(h.getMonth() + 1).padStart(2, '0');
}

export function listaDeMeses(): string[] {
  const out: string[] = [];
  const h = new Date();
  for (let i = -6; i <= 6; i++) {
    const d = new Date(h.getFullYear(), h.getMonth() + i, 1);
    out.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
  }
  return out;
}

export function diasAte(iso: string): number {
  const alvo = paraData(iso).getTime();
  const h = new Date();
  const hoje = new Date(h.getFullYear(), h.getMonth(), h.getDate()).getTime();
  return Math.round((alvo - hoje) / 86400000);
}

export function distanciaEmTexto(iso: string): string {
  const d = diasAte(iso);
  if (d === 0) return 'hoje';
  if (d === 1) return 'amanhã';
  if (d === -1) return 'ontem';
  if (d > 1) return 'em ' + d + ' dias';
  return 'há ' + Math.abs(d) + ' dias';
}

export function dataDoMes(mesRef: string, diaPreferido: number | null): string {
  const [a, m] = mesRef.split('-').map(Number);
  const ultimoDia = new Date(a, m, 0).getDate();
  const dia = Math.min(Math.max(diaPreferido ?? 15, 1), ultimoDia);
  return (
    a + '-' + String(m).padStart(2, '0') + '-' + String(dia).padStart(2, '0')
  );
}

/* ============================================================
   5. E-MAILS (EmailJS)
   Dois templates: convite (com link) e lembrete (com data).
   ============================================================ */

export interface ConfigEmail {
  serviceId: string;
  templateConviteId: string;
  templateId: string;
  publicKey: string;
  remetenteNome: string;
  diasAntecedencia: number;
  copiaParaAnalista: boolean;
  envioAutomatico: boolean;
}

export const CONFIG_EMAIL_PADRAO: ConfigEmail = {
  serviceId: '',
  templateConviteId: '',
  templateId: '',
  publicKey: '',
  remetenteNome: 'Unifor Hub',
  diasAntecedencia: 3,
  copiaParaAnalista: true,
  envioAutomatico: true,
};

const CHAVE_LOCAL = 'unifor-hub-checkpoints:email';

export function lerConfigEmail(): ConfigEmail {
  try {
    const bruto = localStorage.getItem(CHAVE_LOCAL);
    if (!bruto) return { ...CONFIG_EMAIL_PADRAO };
    return { ...CONFIG_EMAIL_PADRAO, ...JSON.parse(bruto) };
  } catch {
    return { ...CONFIG_EMAIL_PADRAO };
  }
}

export function salvarConfigEmail(config: ConfigEmail): void {
  try {
    localStorage.setItem(CHAVE_LOCAL, JSON.stringify(config));
  } catch {
    /* ignora */
  }
}

export function emailConfigurado(config: ConfigEmail): boolean {
  return Boolean(
    config.serviceId &&
      config.publicKey &&
      (config.templateId || config.templateConviteId)
  );
}

/* ---------- Convite: startup escolhe o horário ---------- */

export interface DadosConvite {
  paraEmail: string;
  paraNome: string;
  startup: string;
  analista: string;
  link: string;
  mes: string;
  copiaPara?: string;
}

export async function enviarConvite(
  config: ConfigEmail,
  dados: DadosConvite
): Promise<void> {
  const template = config.templateConviteId || config.templateId;

  if (!config.serviceId || !template || !config.publicKey) {
    throw new Error(
      'Configure o EmailJS na tela de Configurações antes de enviar convites.'
    );
  }

  await emailjs.send(
    config.serviceId,
    template,
    {
      to_email: dados.paraEmail,
      to_nome: dados.paraNome,
      startup: dados.startup,
      analista: dados.analista,
      link: dados.link,
      mes: dados.mes,
      remetente: config.remetenteNome,
      cc: dados.copiaPara || '',
    },
    { publicKey: config.publicKey }
  );
}

/* ---------- Lembrete: data já confirmada ---------- */

export interface DadosLembrete {
  paraEmail: string;
  paraNome: string;
  startup: string;
  analista: string;
  data: string;
  hora: string;
  local: string;
  pauta: string;
  copiaPara?: string;
}

export async function enviarLembrete(
  config: ConfigEmail,
  dados: DadosLembrete
): Promise<void> {
  const template = config.templateId || config.templateConviteId;

  if (!config.serviceId || !template || !config.publicKey) {
    throw new Error(
      'Configure o EmailJS na tela de Configurações antes de enviar lembretes.'
    );
  }

  await emailjs.send(
    config.serviceId,
    template,
    {
      to_email: dados.paraEmail,
      to_nome: dados.paraNome,
      startup: dados.startup,
      analista: dados.analista,
      data: dados.data,
      hora: dados.hora,
      local: dados.local,
      pauta: dados.pauta || 'A definir',
      remetente: config.remetenteNome,
      cc: dados.copiaPara || '',
    },
    { publicKey: config.publicKey }
  );
}
