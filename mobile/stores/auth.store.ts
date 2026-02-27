import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'driver';
  phone: string | null;
  expo_push_token: string | null;
}

interface Vehicle {
  id: string;
  plate: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  vehicle: Vehicle | null;
  loading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginByPlate: (plate: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  fetchDriverVehicle: (driverId: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  vehicle: null,
  loading: true,
  error: null,

  initialize: async () => {
    try {
      set({ loading: true, error: null });

      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        set({ session, user: session.user });
        await get().fetchProfile(session.user.id);
      }

      // Listen to auth changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        set({ session, user: session?.user ?? null });
        if (session?.user) {
          await get().fetchProfile(session.user.id);
        } else {
          set({ profile: null, vehicle: null });
        }
      });
    } catch (err) {
      console.error('Erreur d\'initialisation auth :', err);
      set({ error: 'Erreur lors de l\'initialisation' });
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
            : error.message === 'Email not confirmed'
              ? 'Veuillez confirmer votre email'
              : `Erreur de connexion : ${error.message}`;
        throw new Error(message);
      }

      if (data.session && data.user) {
        set({ session: data.session, user: data.user });
        await get().fetchProfile(data.user.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion';
      set({ error: message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  loginByPlate: async (plate: string) => {
    try {
      set({ loading: true, error: null });

      // Call RPC to get driver email from plate number
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('login_by_plate', { plate_number: plate.toUpperCase().trim() });

      if (rpcError) {
        throw new Error('Erreur de connexion par plaque');
      }

      if (rpcResult?.error) {
        throw new Error(rpcResult.error);
      }

      if (!rpcResult?.email) {
        throw new Error('Plaque non trouvée ou aucun conducteur assigné');
      }

      // Sign in with the driver's email and plate as password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: rpcResult.email,
        password: plate.toUpperCase().trim(),
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          throw new Error('Plaque non reconnue. Vérifiez le format XX-XXX-XX');
        }
        throw new Error(`Erreur de connexion : ${error.message}`);
      }

      if (data.session && data.user) {
        set({ session: data.session, user: data.user });
        await get().fetchProfile(data.user.id);
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
    try {
      set({ loading: true });
      await supabase.auth.signOut();
      set({ session: null, user: null, profile: null, vehicle: null });
    } catch (err) {
      console.error('Erreur de déconnexion :', err);
    } finally {
      set({ loading: false });
    }
  },

  fetchProfile: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, phone, expo_push_token')
        .eq('id', userId)
        .single();

      if (error) throw error;

      set({ profile: data as Profile });

      // If driver, fetch assigned vehicle
      if (data.role === 'driver') {
        await get().fetchDriverVehicle(userId);
      }
    } catch (err) {
      console.error('Erreur lors du chargement du profil :', err);
      set({ error: 'Impossible de charger le profil' });
    }
  },

  fetchDriverVehicle: async (driverId: string) => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, plate')
        .eq('driver_id', driverId)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      set({ vehicle: data as Vehicle | null });
    } catch (err) {
      console.error('Erreur lors du chargement du véhicule :', err);
    }
  },

  clearError: () => set({ error: null }),
}));
