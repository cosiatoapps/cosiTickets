import { 
  SecurityPolicy, RaffleBoardState, CustomerPortalResponse, 
  OrganizerCreate, RaffleUpdate, PaymentRecordRequest 
} from '../types';

const API_BASE = '/api/v1';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('cositickets_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options?.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Error HTTP: ${res.status}`);
  }
  return res.json();
}

export const CosiAPI = {
  // Autenticación
  login: (email: string, password: string) => 
    request<{ access_token: string; role: string; user_id: string }>(
      '/auth/login', 
      { method: 'POST', body: JSON.stringify({ email, password }) }
    ),

  // Políticas de Seguridad (Admin)
  getSecurityPolicies: () => 
    request<SecurityPolicy>('/admin/security-policies'),

  updateSecurityPolicies: (policy: Partial<SecurityPolicy>) =>
    request<{ message: string; policy: SecurityPolicy }>('/admin/security-policies', {
      method: 'PUT',
      body: JSON.stringify(policy),
    }),

  createOrganizer: (data: any) =>
    request<any>('/admin/organizers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Tablero y Rifas
  getRaffleBoard: (raffleId: string) =>
    request<RaffleBoardState>(`/raffles/${raffleId}/board`),

  updateRaffleClosure: (raffleId: string, actorId: string, payload: { draw_date: string; reason: string }) =>
    request<any>(`/raffles/${raffleId}?actor_id=${actorId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  generateAIAssets: (raffleId: string, prompt: string, primaryColor: string, secondaryColor: string) =>
    request<any>(`/raffles/${raffleId}/generate-assets`, {
      method: 'POST',
      body: JSON.stringify({ prompt, primary_color: primaryColor, secondary_color: secondaryColor }),
    }),

  // Compras y Reservas
  reserveTicket: (ticketId: string, customerId: string) =>
    request<any>(`/tickets/${ticketId}/reserve`, {
      method: 'POST',
      body: JSON.stringify({ customer_id: customerId }),
    }),

  recordPayment: (purchaseId: string, data: any) =>
    request<any>(`/purchases/${purchaseId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Portal Cliente
  getCustomerTickets: (customerId: string) =>
    request<any>(`/portal/my-tickets/${customerId}`),

  // Cron / Alertas
  getDailySummary: () =>
    request<any>('/cron/daily-summary'),

  // Endpoints Administrativos
  getAllUsers: () => 
    request<any[]>('/admin/users'),
      toggleUserStatus: (userId: string, isActive: boolean) =>
    request<any>(`/admin/users/${userId}/status?is_active=${isActive}`, { method: 'PATCH' }),
  
  getOrganizersRaffles: () => 
    request<any[]>('/admin/organizers-raffles'),

  getMyRaffles: (organizerId: string) => 
    request<any[]>(`/organizer/my-raffles/${organizerId}`),

  getPaymentMethods: () => 
    request<any[]>('/payment-methods'),

  updateTicketDetails: (ticketId: string, data: any) =>
    request<any>(`/organizer/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
  
  // Notificaciones del Organizador
  getOrganizerNotifications: (organizerId: string) =>
    request<any[]>(`/organizer/notifications/${organizerId}`),

  markNotificationRead: (notificationId: string) =>
    request<any>(`/organizer/notifications/${notificationId}/read`, {
      method: 'PATCH'
    }),
};
