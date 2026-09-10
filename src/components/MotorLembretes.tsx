import { useEffect, useRef } from 'react';
import {
  supabase,
  emailConfigurado,
  enviarLembrete,
  formatarDataExtenso,
  formatarHora,
  hojeISO,
  lerConfigEmail,
  paraISO,
  type CheckpointCompleto,
} from '../dados';
import { useToast } from './Toast';

const SELECT_COMPLETO =
  '*, startup:startups(id,nome,setor,contato_nome,contato_email), analista:analistas(id,nome,email,link_agendamento)';

/** Envia os lembretes dos checkpoints já confirmados que estão chegando. */
export default function MotorLembretes() {
  const { avisar } = useToast();
  const jaRodou = useRef(false);

  useEffect(() => {
    if (jaRodou.current) return;
    jaRodou.current = true;

    async function rodar() {
      const cfg = lerConfigEmail();
      if (!cfg.envioAutomatico || !emailConfigurado(cfg)) return;

      const h = new Date();
      const limite = new Date(
        h.getFullYear(),
        h.getMonth(),
        h.getDate() + cfg.diasAntecedencia
      );

      const { data, error } = await supabase
        .from('checkpoints')
        .select(SELECT_COMPLETO)
        .eq('status', 'agendado')
        .is('lembrete_enviado_em', null)
        .not('data_agendada', 'is', null)
        .gte('data_agendada', hojeISO())
        .lte('data_agendada', paraISO(limite));

      if (error || !data || data.length === 0) return;

      let enviados = 0;

      for (const c of data as unknown as CheckpointCompleto[]) {
        if (!c.startup?.contato_email || !c.data_agendada) continue;

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

          enviados++;
        } catch {
          /* se um falhar, segue para o próximo */
        }
      }

      if (enviados > 0) {
        avisar(`${enviados} lembrete(s) enviado(s) automaticamente.`);
      }
    }

    void rodar();
  }, [avisar]);

  return null;
}
