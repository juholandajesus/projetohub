import {
  FAROL_LABEL,
  STATUS_LABEL,
  type Farol,
  type StatusCheckpoint,
} from '../dados';

const CLASSE_STATUS: Record<StatusCheckpoint, string> = {
  agendado: 'etq-azul',
  realizado: 'etq-verde',
  remarcado: 'etq-ambar',
  cancelado: 'etq-cinza',
};

export function EtiquetaStatus({ status }: { status: StatusCheckpoint }) {
  return (
    <span className={`etiqueta ${CLASSE_STATUS[status]}`}>
      <span className="ponto" />
      {STATUS_LABEL[status]}
    </span>
  );
}

const CLASSE_FAROL: Record<Farol, string> = {
  verde: 'etq-verde',
  amarelo: 'etq-ambar',
  vermelho: 'etq-vermelho',
};

export function EtiquetaFarol({ farol }: { farol: Farol | null }) {
  if (!farol) return <span className="mudo pequeno">—</span>;
  return (
    <span className={`etiqueta ${CLASSE_FAROL[farol]}`}>
      <span className="ponto" />
      {FAROL_LABEL[farol]}
    </span>
  );
}

export function EtiquetaSimples({
  texto,
  tom = 'cinza',
}: {
  texto: string | null;
  tom?: 'azul' | 'cinza' | 'verde' | 'ambar' | 'vermelho';
}) {
  if (!texto) return <span className="mudo pequeno">—</span>;
  return <span className={`etiqueta etq-${tom}`}>{texto}</span>;
}
