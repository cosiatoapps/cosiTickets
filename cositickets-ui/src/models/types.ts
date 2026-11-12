export type UserRole = 'ADMIN' | 'ORGANIZER' | 'CUSTOMER';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  limits?: {
    max_total_raffles: number;
    max_monthly_raffles: number;
  };
}

export interface TicketMetrics {
  total: number;
  paid: number;
  reserved: number;
  available: number;
  percentage_sold: number;
}

export interface Raffle {
  id: string;
  title: string;
  prize_name: string;
  ticket_price: number;
  draw_date: string;
  status: string;
  numbers_per_ticket: number;
  metrics: TicketMetrics;
}

export interface OrganizerGroup {
  organizer_id: string;
  organizer_name: string;
  organizer_email: string;
  total_raffles: number;
  raffles: Raffle[];
}

export interface BoardItem {
  ticket_id: string;
  numbers: string[];
  status: 'AVAILABLE' | 'RESERVED' | 'PAID';
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  amount_paid?: number;
  notes?: string;
}

export interface RaffleBoardState {
  id?: string;
  raffle_id?: string;
  title: string;
  prize_name: string;
  ticket_price: number;
  stats: {
    available: number;
    reserved: number;
    sold: number;
  };
  board: BoardItem[];
}

export interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  description?: string;
}