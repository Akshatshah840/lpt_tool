export type UserRole = 'APP_ADMINS' | 'PROJECT_ADMINS' | 'TRANSCRIBERS' | null;

export interface AuthState {
  role: UserRole;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  preferredLanguage: string | null;
  isLoading: boolean;
}
