export type UserRole = 'ADMIN' | 'ORGANIZER' | 'CUSTOMER';
export type RaffleStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
export type TicketStatus = 'AVAILABLE' | 'RESERVED' | 'PAID';
export type PaymentStatus = 'PENDING' | 'PARTIAL_PAYMENT' | 'PAID' | 'UNPAID';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

// --- USUARIO Y SESIÓN ---
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

// --- GESTIÓN DE ORGANIZADORES (ADMIN) ---
export interface OrganizerLimit {
  id: string;
  organizerId: string;
  maxTotalRaffles: number;
  maxMonthlyRaffles: number;
  isActive: boolean;
}

export interface OrganizerWithStats extends User {
  limits: OrganizerLimit;
  activeRafflesCount: number;
  totalSalesSum: number;
}

// --- POLÍTICAS DE SEGURIDAD (ADMIN) ---
export interface SecurityPolicy {
  id: string;
  policyScope: string;
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  minSpecialChars: number;
  passwordExpirationDays: number;
  passwordHistoryLimit: number;
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  mfaRequired: boolean;
  updatedAt: string;
}

// --- DISEÑO Y TEMAS DE RIFA (AGENTE IA) ---
export interface RaffleDesign {
  id?: string;
  raffleId: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundImageUrl?: string | null;
  ticketTemplateUrl?: string | null;
  aiPromptUsed?: string | null;
  boardModelUsed?: string | null;
  ticketModelUsed?: string | null;
}

// --- RIFAS Y TABLERO ---
export interface Raffle {
  id: string;
  organizerId: string;
  title: string;
  description?: string | null;
  prizeName: string;
  prizeImages: string[];
  numberRangeStart: number;
  numberRangeEnd: number;
  numbersPerTicket: 1 | 2 | 3;
  ticketPrice: number;
  drawDate: string;
  status: RaffleStatus;
  winningNumber?: string | null;
  design?: RaffleDesign;
}

export interface TicketBoardItem {
  id: string;
  ticketCode: string;
  numbers: string[];
  status: TicketStatus;
  buyerName?: string | null;
  buyerPhone?: string | null;
  paymentStatus?: PaymentStatus;
}

export interface RaffleBoardState {
  raffle: Raffle;
  stats: {
    totalTickets: number;
    soldTickets: number;
    reservedTickets: number;
    availableTickets: number;
    percentageSold: number;
    totalRevenueEstimated: number;
    totalRevenueCollected: number;
  };
  tickets: TicketBoardItem[];
}

// --- COMPRAS Y PAGOS (ORGANIZADOR & CLIENTE) ---
export interface PaymentTransaction {
  id: string;
  purchaseId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string | null;
  proofFileUrl?: string | null;
  recordedBy: string;
  createdAt: string;
}

export interface CustomerPurchaseRecord {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail: string;
  raffleId: string;
  raffleTitle: string;
  ticketId: string;
  ticketCode: string;
  numbers: string[];
  paymentStatus: PaymentStatus;
  totalAmount: number;
  balancePaid: number;
  balancePending: number;
  drawDate: string;
  winningNumber?: string | null;
  payments: PaymentTransaction[];
}

// --- AUDITORÍA INMUTABLE ---
export interface AuditLogEntry {
  id: string;
  entityName: string;
  entityId: string;
  actorId: string;
  actorName?: string;
  action: AuditAction;
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

// --- REPORTES Y ALERTAS DIARIAS ---
export interface DailySummaryAlert {
  raffleId: string;
  raffleTitle: string;
  organizerEmail: string;
  daysLeft: number;
  soldPercentage: number;
  soldCount: number;
  totalCount: number;
  message: string;
}