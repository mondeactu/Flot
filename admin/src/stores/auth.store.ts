import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'driver';
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  adminExists: boolean | null;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAdminExists: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  error: null,
  adminExists: null,

  initialize: async () => {
    try {
      set({ loading: true });

      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('id', session.user.id)
          .single();

        set({ session, user: session.user, profile: profile as Profile | null });
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('id', session.user.id)
            .single();
          set({ session, user: session.user, profile: profile as Profile | null });
        } else {
          set({ session: null, user: null, profile: null });
        }
      });
    } catch (err) {
      console.error('Erreur initialisation auth :', err);
    } finally {
      set({ loading: false });
    }
  },

  login: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const message =
          error.message === 'Invalid login credentials'
            ? 'Email ou mot de passe incorrect'
            : `Erreur : ${error.message}`;
        throw new Error(message);
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('id', data.user.id)
          .single();

        if (profile?.role !== 'admin') {
          await supabase.auth.signOut();
          throw new Error('Accès réservé aux administrateurs');
        }

        set({ session: data.session, user: data.user, profile: profile as Profile });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion';
      set({ error: message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },

  checkAdminExists: async () => {
    try {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin');

      const exists = (count ?? 0) > 0;
      set({ adminExists: exists });
      return exists;
    } catch {
      return true; // Assume exists on error
    }
  },

  clearError: () => set({ error: null }),
}));
