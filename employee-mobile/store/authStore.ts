import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../utils/api';

function normalizePhone(phone: string): string {
  let p = phone.replace(/\s+/g, '').replace(/-/g, '');
  if (p.startsWith('+251')) p = `0${p.slice(4)}`;
  if (p.length === 9 && p.startsWith('9')) p = `0${p}`;
  return p;
}

interface AuthState {
  token: string | null;
  phoneNumber: string | null;
  biometricsEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  employeeDetails: {
    id: string;
    name: string;
    department: string;
    idNumber: string;
    branchId?: string | null;
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

      // Real API handshake with NestJS /api/v1/auth/employee-login
      const normalizedPhone = normalizePhone(phoneNumber);
      const response = await apiClient.post('/api/v1/auth/employee-login', {
        phoneNumber: normalizedPhone,
        pin,
      });

      const { accessToken, refreshToken, employee } = response.data;

      // Secure storage sync
      await SecureStore.setItemAsync('user_token', accessToken);
      await SecureStore.setItemAsync('refresh_token', refreshToken);
      await SecureStore.setItemAsync('user_phone', phoneNumber);
      await SecureStore.setItemAsync('bio_enabled', enableBio ? 'true' : 'false');

      // Save complete details in SecureStore so they persist on cold restart
      const employeeDetailsObj = {
        id: employee.id,
        name: employee.name,
        department: employee.department || 'Operations',
        idNumber: employee.employeeIdNumber || employee.id || 'N/A',
        branchId: employee.branchId ?? null,
      };
      await SecureStore.setItemAsync('employee_details', JSON.stringify(employeeDetailsObj));

      set({
        token: accessToken,
        phoneNumber: normalizedPhone,
        biometricsEnabled: enableBio,
        employeeDetails: employeeDetailsObj,
        isLoading: false
      });

      return { success: true, message: "Authentication approved!" };
    } catch (err: any) {
      let errMsg = err.response?.data?.message || err.message || "Failed to authenticate.";
      if (err.response?.status === 429) {
        errMsg = "Too many attempts. Please wait 60 seconds before trying again.";
      }
      set({ isLoading: false, error: errMsg });
      return { success: false, message: errMsg };
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await SecureStore.deleteItemAsync('user_token');
      await SecureStore.deleteItemAsync('refresh_token');
      await SecureStore.deleteItemAsync('user_phone');
      await SecureStore.deleteItemAsync('employee_details');
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
      const savedDetailsStr = await SecureStore.getItemAsync('employee_details');

      if (savedToken && savedPhone && savedDetailsStr) {
        const employeeDetails = JSON.parse(savedDetailsStr);
        set({
          token: savedToken,
          phoneNumber: savedPhone,
          biometricsEnabled: savedBio === 'true',
          employeeDetails,
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
