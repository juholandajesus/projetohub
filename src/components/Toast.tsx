import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { IcAlerta, IcCheckCirculo } from './Icones';

type Tipo = 'ok' | 'erro';
interface Aviso {
  id: number;
  texto: string;
  tipo: Tipo;
}

interface Contexto {
  avisar: (texto: string, tipo?: Tipo) => void;
}

const Ctx = createContext<Contexto>({ avisar: () => {} });

export function useToast() {
  return useContext(Ctx);
}

export function ProvedorToast({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const avisar = useCallback((texto: string, tipo: Tipo = 'ok') => {
    const id = Date.now() + Math.random();
    setAvisos((atual) => [...atual, { id, texto, tipo }]);
    setTimeout(() => {
      setAvisos((atual) => atual.filter((a) => a.id !== id));
    }, 4200);
  }, []);

  const valor = useMemo(() => ({ avisar }), [avisar]);

  return (
    <Ctx.Provider value={valor}>
      {children}
      <div className="pilha-toast">
        {avisos.map((a) => (
          <div key={a.id} className={`toast ${a.tipo}`}>
            {a.tipo === 'ok' ? <IcCheckCirculo /> : <IcAlerta />}
            <span>{a.texto}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
