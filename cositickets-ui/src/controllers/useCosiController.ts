import { useState, useEffect } from 'react';
import { User, RaffleBoardState, PaymentMethod, BoardItem } from '../models/types';
import { CosiAPI } from '../services/api';

export function useCosiController() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('cosi_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'raffles_inspect' | 'customer_portal'>('overview');
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [rafflesList, setRafflesList] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedRaffleBoard, setSelectedRaffleBoard] = useState<RaffleBoardState | null>(null);
  const [editingRaffle, setEditingRaffle] = useState<any | null>(null);
  const [managingTicket, setManagingTicket] = useState<BoardItem | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'ORGANIZER' | 'CUSTOMER'>('ALL');
  const [searchUser, setSearchUser] = useState('');

  const showAlert = (text: string, type: 'success' | 'error' = 'success') => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 5000);
  };

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      if (currentUser.role === 'ADMIN') {
        if (activeTab === 'users') {
          const users = await CosiAPI.getAllUsers();
          setAllUsers(users);
        } else {
          const orgRaffles = await CosiAPI.getOrganizersRaffles();
          setRafflesList(orgRaffles);
        }
      } else if (currentUser.role === 'ORGANIZER') {
        const [myRaffles, notifs] = await Promise.all([
          CosiAPI.getMyRaffles(currentUser.id),
          CosiAPI.getOrganizerNotifications(currentUser.id),
        ]);
        setRafflesList(myRaffles);
        setNotifications(notifs || []);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const methods = await CosiAPI.getPaymentMethods();
      setPaymentMethods(methods || []);
    } catch (e) {
      console.warn('No se cargaron métodos de pago:', e);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
      loadPaymentMethods();
    }
  }, [currentUser, activeTab]);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await CosiAPI.login(email, pass);
      localStorage.setItem('cositickets_token', res.access_token);
      const role = (res.role as any) || 'CUSTOMER';
      const userObj: User = {
        id: res.user_id,
        name: email.split('@')[0],
        email,
        role,
        is_active: true,
      };
      localStorage.setItem('cosi_user', JSON.stringify(userObj));
      setCurrentUser(userObj);
      setActiveTab(role === 'CUSTOMER' ? 'customer_portal' : 'overview');
      showAlert('Bienvenido a CosiTickets.');
    } catch (err: any) {
      showAlert(err.message || 'Error al autenticar credenciales', 'error');
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload: { name: string; email: string; phone?: string; password: string }) => {
    setLoading(true);
    try {
      await CosiAPI.register(payload);
      showAlert('Registro completado en CosiTickets. Inicia sesión con tus credenciales.');
      return true;
    } catch (err: any) {
      showAlert(err.message || 'Error al registrar usuario', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('cositickets_token');
    localStorage.removeItem('cosi_user');
    setCurrentUser(null);
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await CosiAPI.toggleUserStatus(userId, !currentStatus);
      showAlert('Estado de usuario actualizado correctamente.');
      loadData();
    } catch (err: any) {
      showAlert(err.message, 'error');
    }
  };

  const createOrganizer = async (data: any) => {
    setLoading(true);
    try {
      await CosiAPI.createOrganizer(data);
      showAlert(`Responsable ${data.name} creado exitosamente.`);
      loadData();
    } catch (err: any) {
      showAlert(err.message || 'Error al crear responsable', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openBoardPreview = async (raffleId: string) => {
    setLoading(true);
    try {
      const data = await CosiAPI.getRaffleBoard(raffleId);
      setSelectedRaffleBoard(data);
    } catch (err: any) {
      showAlert('No se pudo cargar el tablero: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveRaffleEdit = async (raffleId: string, drawDate: string, reason: string) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      await CosiAPI.updateRaffleClosure(raffleId, currentUser.id, {
        draw_date: new Date(drawDate).toISOString(),
        reason,
      });
      showAlert('Rifa modificada y evento registrado en auditoría.');
      setEditingRaffle(null);
      loadData();
    } catch (err: any) {
      showAlert(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveTicketDetails = async (ticketId: string, payload: any) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      await CosiAPI.updateTicketDetails(ticketId, {
        ...payload,
        organizer_id: currentUser.id,
      });
      showAlert('Boleto, cliente y estado de pago actualizados con éxito.');
      setManagingTicket(null);
      if (selectedRaffleBoard) {
        openBoardPreview(selectedRaffleBoard.id || selectedRaffleBoard.raffle_id!);
      }
      loadData();
    } catch (err: any) {
      showAlert(err.message || 'Error al actualizar boleto', 'error');
    } finally {
      setLoading(false);
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    try {
      await CosiAPI.markNotificationRead(notificationId);
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const [publicRaffles, setPublicRaffles] = useState<any[]>([]);
  const [customerTickets, setCustomerTickets] = useState<any[]>([]);

  const loadCustomerPortalData = async () => {
    setLoading(true);
    try {
      const raffles = await CosiAPI.getPublicRaffles();
      setPublicRaffles(raffles || []);
      if (currentUser?.id) {
        const res = await CosiAPI.getCustomerTickets(currentUser.id);
        setCustomerTickets(res.tickets || []);
      }
    } catch (err: any) {
      showAlert(err.message || 'Error cargando catálogo de rifas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const reserveCustomerTicket = async (payload: {
    raffle_id: string;
    ticket_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  }) => {
    setLoading(true);
    try {
      await CosiAPI.reservePublicTicket(payload);
      showAlert('Boleto apartado con éxito. El responsable de la rifa fue notificado.');
      await openBoardPreview(payload.raffle_id);
      await loadCustomerPortalData();
      return true;
    } catch (err: any) {
      showAlert(err.message || 'No se pudo apartar el boleto', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const swapCustomerTicket = async (currentTicketId: string, newTicketId: string) => {
    if (!currentUser) return false;
    setLoading(true);
    try {
      await CosiAPI.swapCustomerTicket({
        current_ticket_id: currentTicketId,
        new_ticket_id: newTicketId,
        customer_id: currentUser.id,
      });
      showAlert('Cambio de número realizado y notificado al responsable.');
      await loadCustomerPortalData();
      return true;
    } catch (err: any) {
      showAlert(err.message || 'No se pudo cambiar el número', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    currentUser,
    activeTab,
    setActiveTab,
    loading,
    alertMsg,
    setAlertMsg,
    allUsers,
    rafflesList,
    notifications,
    markNotificationRead,
    selectedRaffleBoard,
    setSelectedRaffleBoard,
    editingRaffle,
    setEditingRaffle,
    managingTicket,
    setManagingTicket,
    paymentMethods,
    roleFilter,
    setRoleFilter,
    searchUser,
    setSearchUser,
    login,
    register,
    logout,
    toggleUserStatus,
    createOrganizer,
    openBoardPreview,
    saveRaffleEdit,
    saveTicketDetails,
    showAlert,
    loadCustomerPortalData, 
    reserveCustomerTicket, 
    swapCustomerTicket, 
  };
}