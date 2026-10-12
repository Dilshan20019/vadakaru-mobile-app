import type { Dispatch, ReactElement, ReactNode, SetStateAction } from 'react';

export interface AuthUser {
  _id: string;
  role: 'worker' | 'employer';
  onboardingComplete: boolean;
  [key: string]: unknown;
}

export interface AuthContextValue {
  user: AuthUser | null;
  setUser: Dispatch<SetStateAction<AuthUser | null>>;
  loading: boolean;
  login(phone: string, password: string): Promise<AuthUser>;
  register(payload: Record<string, unknown>): Promise<AuthUser>;
  logout(): Promise<void>;
  refresh(): Promise<AuthUser>;
}

export function AuthProvider(props: { children: ReactNode }): ReactElement;
export function useAuth(): AuthContextValue;
