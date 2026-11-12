import { SecurityPolicy, RaffleBoardState } from '../models/types';

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
  // Autenticación y Registro
  login: (email: string, password: string) =>
    request<{ access_token: string; role: string; user_id: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (payload: { name: string; email: string; phone?: string; password: string; role?: string }) =>
    request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...payload, role: payload.role || 'CUSTOMER' }),
    }),

  // Políticas de Seguridad y Usuarios (Admin)
  getSecurityPolicies: () => request<SecurityPolicy>('/admin/security-policies'),

  updateSecurityPolicies: (policy: Partial<SecurityPolicy>) =>
    request<{ message: string; policy: SecurityPolicy }>('/admin/security-policies', {
      method: 'PUT',
      body: JSON.stringify(policy),
    }),

  getAllUsers: () => request<any[]>('/admin/users'),

  toggleUserStatus: (userId: string, isActive: boolean) =>
    request<any>(`/admin/users/${userId}/status?is_active=${isActive}`, { method: 'PATCH' }),

  createOrganizer: (data: any) =>
    request<any>('/admin/organizers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getOrganizersRaffles: () => request<any[]>('/admin/organizers-raffles'),

  // Organizador / Manager
  getMyRaffles: (organizerId: string) => request<any[]>(`/organizer/my-raffles/${organizerId}`),

  updateTicketDetails: (ticketId: string, data: any) =>
    request<any>(`/organizer/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getOrganizerNotifications: (organizerId: string) =>
    request<any[]>(`/organizer/notifications/${organizerId}`),

  markNotificationRead: (notificationId: string) =>
    request<any>(`/organizer/notifications/${notificationId}/read`, { method: 'PATCH' }),

  // Tablero, Rifas e IA
  getRaffleBoard: (raffleId: string) => request<RaffleBoardState>(`/raffles/${raffleId}/board`),

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

  // Portal Cliente
  getPublicRaffles: () => request<any[]>('/public/raffles'),

  reservePublicTicket: (data: {
    raffle_id: string;
    ticket_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  }) =>
    request<any>('/public/tickets/reserve', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  swapCustomerTicket: (data: { current_ticket_id: string; new_ticket_id: string; customer_id: string }) =>
    request<any>('/customer/tickets/swap', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCustomerTickets: (customerId: string) => request<any>(`/portal/my-tickets/${customerId}`),

  // Sistema
  getPaymentMethods: () => request<any[]>('/system/payment-methods'),
  getDailySummary: () => request<any>('/system/cron/daily-summary'),
  getAdminAnalytics: () => request<any>('/admin/analytics'),
  getOrganizerAnalytics: (organizerId: string) => request<any>(`/organizer/analytics/${organizerId}`),
};