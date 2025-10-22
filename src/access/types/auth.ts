import { ReactElement } from 'react';

// ==============================|| AUTH TYPES ||============================== //

export type GuardProps = {
  children: ReactElement | null;
};

export type UserProfile = {
  id?: string;
  username?: string;
  email?: string;
  role?: string;
  phone_number?: string;
  redirectTo?: string;
  showroomId?: string; // Added this field
  name?: string; // Added for display purposes
};

export interface AuthProps {
  isLoggedIn: boolean;
  isInitialized?: boolean;
  user?: UserProfile | null;
  token?: string | null;
}

export interface AuthActionProps {
  type: string;
  payload?: AuthProps;
}

export interface InitialLoginContextProps {
  isLoggedIn: boolean;
  isInitialized?: boolean;
  user?: UserProfile | null | undefined;
}

export interface JWTDataProps {
  userId: string;
}

export type JWTContextType = {
  isLoggedIn: boolean;
  isInitialized?: boolean;
  user?: UserProfile | null | undefined;
  logout: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: VoidFunction;
};
