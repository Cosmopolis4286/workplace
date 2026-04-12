export interface RefreshRequest {
  user: {
    userId: string;
    refreshToken: string;
  };
  securityContext?: any;
}
