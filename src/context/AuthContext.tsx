import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, traduzErro, type Analista } from '../dados';

interface ContextoAuth {
  sessao: Session | null;
  analista: Analista | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  cadastrar: (nome: string, email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  recarregarPerfil: () => Promise<void>;
}

const Ctx = createContext<ContextoAuth>({} as ContextoAuth);

export function useAuth() {
  return useContext(Ctx);
}

export function ProvedorAuth({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [analista, setAnalista] = useState<Analista | null>(null);
  const [carregando, setCarregando] = useState(true);

  /** Busca o perfil da analista; se não existir, cria (rede de segurança) */
  const buscarPerfil = useCallback(
    async (userId: string, email: string, nome?: string) => {
      const { data } = await supabase
        .from('analistas')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        setAnalista(data as Analista);
        return;
      }

      const { data: novo } = await supabase
        .from('analistas')
        .insert({ id: userId, email, nome: nome || email.split('@')[0] })
        .select()
        .maybeSingle();

      setAnalista((novo as Analista) ?? null);
    },
    []
  );

  useEffect(() => {
    let vivo = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!vivo) return;
        setSessao(data.session);
        if (data.session?.user) {
          await buscarPerfil(
            data.session.user.id,
            data.session.user.email ?? ''
          );
        }
        setCarregando(false);
      })
      .catch(() => vivo && setCarregando(false));

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSessao(s);
      if (s?.user) {
        void buscarPerfil(s.user.id, s.user.email ?? '');
      } else {
        setAnalista(null);
      }
    });

    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, [buscarPerfil]);

  const entrar = useCallback(async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    if (error) throw new Error(traduzErro(error.message));
  }, []);

  const cadastrar = useCallback(
    async (nome: string, email: string, senha: string) => {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
        options: { data: { nome: nome.trim() } },
      });
      if (error) throw new Error(traduzErro(error.message));
    },
    []
  );

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
    setAnalista(null);
    setSessao(null);
  }, []);

  const recarregarPerfil = useCallback(async () => {
    if (sessao?.user) {
      await buscarPerfil(sessao.user.id, sessao.user.email ?? '');
    }
  }, [sessao, buscarPerfil]);

  const valor = useMemo(
    () => ({
      sessao,
      analista,
      carregando,
      entrar,
      cadastrar,
      sair,
      recarregarPerfil,
    }),
    [sessao, analista, carregando, entrar, cadastrar, sair, recarregarPerfil]
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
