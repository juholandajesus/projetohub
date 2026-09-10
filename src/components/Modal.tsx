import { useEffect, type ReactNode } from 'react';
import { IcX } from './Icones';

interface Props {
  aberto: boolean;
  titulo: string;
  subtitulo?: string;
  largo?: boolean;
  aoFechar: () => void;
  rodape?: ReactNode;
  children: ReactNode;
}

export default function Modal({
  aberto,
  titulo,
  subtitulo,
  largo,
  aoFechar,
  rodape,
  children,
}: Props) {
  // Fecha com a tecla ESC e trava o scroll do fundo
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = '';
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return (
    <div
      className="modal-veu"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
    >
      <div
        className={`modal ${largo ? 'largo' : ''}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-cabecalho">
          <div>
            <h3>{titulo}</h3>
            {subtitulo && <p>{subtitulo}</p>}
          </div>
          <button
            className="btn btn-fantasma btn-icone"
            onClick={aoFechar}
            aria-label="Fechar"
          >
            <IcX />
          </button>
        </div>

        <div className="modal-corpo">{children}</div>

        {rodape && <div className="modal-rodape">{rodape}</div>}
      </div>
    </div>
  );
}
