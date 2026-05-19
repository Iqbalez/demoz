import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  token: string | null;
  phoneNumber: string | null;
  biometricsEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  employeeDetails: {
    name: string;
    department: string;
    idNumber: string;
  } | null;
  login: (phoneNumber: string, pin: string, enableBio: boolean) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  checkSavedAuth: () => Promise<void>;
  setBiometrics: (enabled: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  phoneNumber: null,
  biometricsEnabled: false,
  isLoading: true,
  error: null,
  employeeDetails: null,

  login: async (phoneNumber: string, pin: string, enableBio: boolean) => {
    set({ isLoading: true, error: null });
    try {
      // Input Validation
      if (!phoneNumber || phoneNumber.length < 9 || pin.length !== 4) {
        throw new Error("Invalid credentials format. PIN must be 4 digits.");
      }

      // Simulated API handshake with NestJS /api/v1/auth/employee-login
      // Returns employee details matching standard tenant registry
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockToken = `jwt-token-emp-${Math.floor(100000 + Math.random() * 900000)}`;
      const mockEmployee = {
        name: phoneNumber === "0911000004" ? "Yosef Girma" : "Abebe Kebede",
        department: phoneNumber === "0911000004" ? "Operations" : "Tech / Engineering",
        idNumber: phoneNumber === "0911000004" ? "EMP-3942" : "EMP-4820"
      };

      // Secure storage sync
      await SecureStore.setItemAsync('user_token', mockToken);
      await SecureStore.setItemAsync('user_phone', phoneNumber);
      await SecureStore.setItemAsync('bio_enabled', enableBio ? 'true' : 'false');

      set({
        token: mockToken,
        phoneNumber,
        biometricsEnabled: enableBio,
        employeeDetails: mockEmployee,
        isLoading: false
      });

      return { success: true, message: "Authentication approved!" };
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
      return { success: false, message: err.message };
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await SecureStore.deleteItemAsync('user_token');
      await SecureStore.deleteItemAsync('user_phone');
      set({
        token: null,
        phoneNumber: null,
        employeeDetails: null,
        isLoading: false
      });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  checkSavedAuth: async () => {
    set({ isLoading: true });
    try {
      const savedToken = await SecureStore.getItemAsync('user_token');
      const savedPhone = await SecureStore.getItemAsync('user_phone');
      const savedBio = await SecureStore.getItemAsync('bio_enabled');

      if (savedToken && savedPhone) {
        const mockEmployee = {
          name: savedPhone === "0911000004" ? "Yosef Girma" : "Abebe Kebede",
          department: savedPhone === "0911000004" ? "Operations" : "Tech / Engineering",
          idNumber: savedPhone === "0911000004" ? "EMP-3942" : "EMP-4820"
        };

        set({
          token: savedToken,
          phoneNumber: savedPhone,
          biometricsEnabled: savedBio === 'true',
          employeeDetails: mockEmployee,
          isLoading: false
        });
      } else {
        set({ token: null, isLoading: false });
      }
    } catch (err) {
      set({ token: null, isLoading: false });
    }
  },

  setBiometrics: (enabled: boolean) => {
    SecureStore.setItemAsync('bio_enabled', enabled ? 'true' : 'false');
    set({ biometricsEnabled: enabled });
  }
}));
