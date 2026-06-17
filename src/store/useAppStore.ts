import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Room,
  Booking,
  BookingStatus,
  DailyReportItem,
  MonthlyReportItem,
  GuestProfile,
  RepurchaseReminder,
  CleaningTask,
  CleaningTaskStatus,
  Store,
  ClosedDate,
  MinStayRule,
  User,
  UserRole,
  Permission,
  AuditLog,
  AuditAction,
  WaitlistEntry,
  WaitlistStatus,
  WaitlistNotification,
  ExtraService,
  SelectedExtraService,
  LongTermContract,
  LongTermContractStatus,
  PaymentRecord,
  PaymentStatus,
  ContractExpiryInfo,
  ExpiryAlertLevel,
} from '@/types';
import { normalizePhone, RolePermissions, ClosedDateReasonLabels, LongTermContractStatusLabels } from '@/types';
import { generateId, isDateOverlap, todayStr, isSameDayStr, getDaysInRange, getMonthsInRange, getMonthKey, calculateNights, getDaysArray, startOfMonthStr, endOfMonthStr, formatDate, calculateMonths, addMonthsStr, getContractPeriodLabel, getMonthDueDate } from '@/utils/date';
import { differenceInDays, differenceInCalendarDays, parseISO } from 'date-fns';
import { getInitialStores, getInitialRooms, getInitialBookings, getInitialClosedDates, getInitialMinStayRules, getInitialExtraServices, getInitialLongTermContracts } from '@/utils/mockData';

type StoreIdFilter = string | 'all';

const defaultUsers: User[] = [
  { id: 'owner-1', name: '民宿老板', role: 'owner' },
  { id: 'receptionist-1', name: '前台小王', role: 'receptionist' },
];

interface AppState {
  stores: Store[];
  rooms: Room[];
  bookings: Booking[];
  cleaningTasks: CleaningTask[];
  closedDates: ClosedDate[];
  minStayRules: MinStayRule[];
  extraServices: ExtraService[];
  waitlistEntries: WaitlistEntry[];
  waitlistNotifications: WaitlistNotification[];
  users: User[];
  currentUser: User;
  auditLogs: AuditLog[];
  initialized: boolean;

  initializeData: () => void;

  switchUser: (userId: string) => void;
  hasPermission: (permission: Permission) => boolean;
  getCurrentUserRole: () => UserRole;

  addAuditLog: (action: AuditAction, targetId?: string, targetName?: string, details?: string) => void;
  getAuditLogs: () => AuditLog[];

  addStore: (store: Omit<Store, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateStore: (id: string, store: Partial<Store>) => void;
  deleteStore: (id: string) => boolean;
  getStoreById: (id: string) => Store | undefined;

  addRoom: (room: Omit<Room, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRoom: (id: string, room: Partial<Room>) => void;
  deleteRoom: (id: string) => boolean;
  getRoomById: (id: string) => Room | undefined;
  getRoomsByStore: (storeId: StoreIdFilter) => Room[];

  addBooking: (booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) => boolean;
  updateBooking: (id: string, booking: Partial<Booking>) => boolean;
  cancelBooking: (id: string, reason: string) => void;
  updateBookingStatus: (id: string, status: BookingStatus) => void;
  getBookingById: (id: string) => Booking | undefined;
  getBookingsByStore: (storeId: StoreIdFilter) => Booking[];

  getBookingsByRoom: (roomId: string) => Booking[];
  getBookingsByDate: (date: string, storeId?: StoreIdFilter) => Booking[];
  getActiveBookingsByDate: (date: string, storeId?: StoreIdFilter) => Booking[];

  isRoomAvailable: (
    roomId: string,
    checkIn: string,
    checkOut: string,
    excludeBookingId?: string,
    excludeContractId?: string
  ) => boolean;
  getAvailableRooms: (checkIn: string, checkOut: string, storeId?: StoreIdFilter) => Room[];
  getMinStayForRoom: (roomId: string, checkIn: string, checkOut: string) => number;
  checkMinStayCompliance: (roomId: string, checkIn: string, checkOut: string) => boolean;

  addWaitlistEntry: (entry: Omit<WaitlistEntry, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'priority'>) => WaitlistEntry | null;
  updateWaitlistEntry: (id: string, entry: Partial<WaitlistEntry>) => boolean;
  cancelWaitlistEntry: (id: string, reason: string) => void;
  getWaitlistById: (id: string) => WaitlistEntry | undefined;
  getWaitlistByStore: (storeId: StoreIdFilter) => WaitlistEntry[];
  getWaitlistByRoom: (roomId: string) => WaitlistEntry[];
  getActiveWaitlistCount: (storeId?: StoreIdFilter) => number;
  matchWaitlistToAvailability: (roomId?: string, checkIn?: string, checkOut?: string) => WaitlistEntry[];
  confirmWaitlistBooking: (waitlistId: string) => Booking | null;
  expireOldWaitlistEntries: () => void;

  addWaitlistNotification: (notification: Omit<WaitlistNotification, 'id' | 'createdAt' | 'read' | 'confirmed'>) => void;
  markNotificationRead: (id: string) => void;
  getUnreadNotificationCount: () => number;

  addClosedDate: (closedDate: Omit<ClosedDate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateClosedDate: (id: string, closedDate: Partial<ClosedDate>) => void;
  deleteClosedDate: (id: string) => void;
  getClosedDatesByRoom: (roomId: string) => ClosedDate[];
  getClosedDatesByDate: (date: string, storeId?: StoreIdFilter) => ClosedDate[];
  isDateClosed: (roomId: string, date: string) => boolean;
  hasClosedDateInRange: (roomId: string, startDate: string, endDate: string) => boolean;

  addMinStayRule: (rule: Omit<MinStayRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMinStayRule: (id: string, rule: Partial<MinStayRule>) => void;
  deleteMinStayRule: (id: string) => void;
  getMinStayRulesByRoom: (roomId: string) => MinStayRule[];

  getExtraServicesByStore: (storeId: StoreIdFilter) => ExtraService[];
  getExtraServiceById: (id: string) => ExtraService | undefined;
  calculateExtraServicesPrice: (
    extraServices: SelectedExtraService[],
    nights: number,
    guests: number
  ) => number;

  getTodayStats: (storeId?: StoreIdFilter) => {
    totalRooms: number;
    occupiedToday: number;
    availableToday: number;
    checkInToday: number;
    checkOutToday: number;
  };

  getDailyReport: (startDate: string, endDate: string, storeId?: StoreIdFilter) => DailyReportItem[];
  getMonthlyReport: (startMonth: string, endMonth: string, storeId?: StoreIdFilter) => MonthlyReportItem[];
  getRevenueStats: (storeId?: StoreIdFilter) => {
    todayRevenue: number;
    monthRevenue: number;
    lastMonthRevenue: number;
    monthOccupancyRate: number;
    lastMonthOccupancyRate: number;
    totalBookings: number;
    monthBookings: number;
  };

  getGuestProfiles: (storeId?: StoreIdFilter) => GuestProfile[];
  getGuestProfileByPhone: (phone: string, storeId?: StoreIdFilter) => GuestProfile | undefined;
  getRepurchaseReminders: (storeId?: StoreIdFilter) => GuestProfile[];

  addCleaningTask: (task: Omit<CleaningTask, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCleaningTask: (id: string, task: Partial<CleaningTask>) => void;
  updateCleaningTaskStatus: (id: string, status: CleaningTaskStatus) => void;
  deleteCleaningTask: (id: string) => void;
  getCleaningTasksByRoom: (roomId: string) => CleaningTask[];
  getCleaningTasksByDate: (date: string, storeId?: StoreIdFilter) => CleaningTask[];
  getCleaningTasksByStore: (storeId: StoreIdFilter) => CleaningTask[];
  getPendingTasks: (storeId?: StoreIdFilter) => {
    pendingCleaning: number;
    todayCheckIns: number;
    todayCheckOuts: number;
    maintenanceRooms: number;
    total: number;
  };

  longTermContracts: LongTermContract[];
  addLongTermContract: (contract: Omit<LongTermContract, 'id' | 'createdAt' | 'updatedAt' | 'paymentRecords' | 'status' | 'paidAmount' | 'totalAmount' | 'months' | 'endDate' | 'renewCount'> & { endDate?: string; months?: number }) => boolean;
  updateLongTermContract: (id: string, contract: Partial<LongTermContract>) => boolean;
  cancelLongTermContract: (id: string, reason: string) => void;
  renewLongTermContract: (id: string, months: number, monthlyRent?: number) => LongTermContract | null;
  getLongTermContractById: (id: string) => LongTermContract | undefined;
  getLongTermContractsByStore: (storeId: StoreIdFilter) => LongTermContract[];
  getLongTermContractsByRoom: (roomId: string) => LongTermContract[];
  getActiveLongTermContractsByDate: (date: string, storeId?: StoreIdFilter) => LongTermContract[];
  isRoomOccupiedByLongTerm: (roomId: string, checkIn: string, checkOut: string, excludeContractId?: string) => boolean;
  updatePaymentRecord: (contractId: string, paymentId: string, paidAmount: number, paymentMethod?: string, notes?: string) => boolean;
  getContractExpiryInfo: (contractId: string) => ContractExpiryInfo | null;
  getExpiringContracts: (daysThreshold?: number, storeId?: StoreIdFilter) => LongTermContract[];
  getOverduePayments: (storeId?: StoreIdFilter) => PaymentRecord[];
  updateLongTermContractStatuses: () => void;
  updatePaymentRecordStatuses: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      stores: [],
      rooms: [],
      bookings: [],
      cleaningTasks: [],
      closedDates: [],
      minStayRules: [],
      extraServices: [],
      waitlistEntries: [],
      waitlistNotifications: [],
      longTermContracts: [],
      users: defaultUsers,
      currentUser: defaultUsers[0],
      auditLogs: [],
      initialized: false,

      initializeData: () => {
        const { initialized, rooms, bookings, expireOldWaitlistEntries, longTermContracts, updateLongTermContractStatuses, updatePaymentRecordStatuses } = get();
        if (initialized && rooms.length > 0) {
          const hasNonNormalized = bookings.some(
            (b) => b.guestPhone !== normalizePhone(b.guestPhone)
          );
          if (hasNonNormalized) {
            const normalizedBookings = bookings.map((b) => ({
              ...b,
              guestPhone: normalizePhone(b.guestPhone),
            }));
            set({ bookings: normalizedBookings });
          }
          const hasMissingFields = bookings.some(
            (b) => b.roomPrice === undefined || b.extraServices === undefined
          );
          if (hasMissingFields) {
            const updatedBookings = bookings.map((b) => ({
              ...b,
              roomPrice: b.roomPrice ?? b.totalPrice,
              extraServicesPrice: b.extraServicesPrice ?? 0,
              extraServices: b.extraServices ?? [],
            }));
            set({ bookings: updatedBookings });
          }
          const hasContractsNonNormalized = longTermContracts.some(
            (c) => c.guestPhone !== normalizePhone(c.guestPhone)
          );
          if (hasContractsNonNormalized) {
            const normalized = longTermContracts.map((c) => ({
              ...c,
              guestPhone: normalizePhone(c.guestPhone),
            }));
            set({ longTermContracts: normalized });
          }
          expireOldWaitlistEntries();
          updateLongTermContractStatuses();
          updatePaymentRecordStatuses();
          return;
        }

        const initialStores = getInitialStores();
        const initialRooms = getInitialRooms(initialStores);
        const initialBookings = getInitialBookings(initialRooms);
        const initialClosedDates = getInitialClosedDates(initialRooms);
        const initialMinStayRules = getInitialMinStayRules(initialRooms);
        const initialExtraServices = getInitialExtraServices(initialStores);
        const initialLongTermContracts = getInitialLongTermContracts(initialRooms);
        set({
          stores: initialStores,
          rooms: initialRooms,
          bookings: initialBookings,
          closedDates: initialClosedDates,
          minStayRules: initialMinStayRules,
          extraServices: initialExtraServices,
          longTermContracts: initialLongTermContracts,
          initialized: true,
        });
      },

      switchUser: (userId) => {
        if (!get().hasPermission('user:switch')) return;
        const user = get().users.find((u) => u.id === userId);
        if (user) {
          const prevUser = get().currentUser;
          set({ currentUser: user });
          get().addAuditLog(
            'user:switch',
            user.id,
            user.name,
            `从「${prevUser.name}(${prevUser.role === 'owner' ? '老板' : '前台'})」切换为「${user.name}(${user.role === 'owner' ? '老板' : '前台'})」`
          );
        }
      },

      hasPermission: (permission) => {
        const { currentUser } = get();
        return RolePermissions[currentUser.role].includes(permission);
      },

      getCurrentUserRole: () => {
        return get().currentUser.role;
      },

      addAuditLog: (action, targetId, targetName, details) => {
        const { currentUser } = get();
        const log: AuditLog = {
          id: generateId(),
          action,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          targetId,
          targetName,
          details,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          auditLogs: [log, ...state.auditLogs].slice(0, 500),
        }));
      },

      getAuditLogs: () => {
        return get().auditLogs;
      },

      addStore: (store) => {
        if (!get().hasPermission('store:create')) return;
        const now = new Date().toISOString();
        const newStore: Store = {
          ...store,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ stores: [...state.stores, newStore] }));
        get().addAuditLog('store:create', newStore.id, newStore.name, `创建门店「${newStore.name}」`);
      },

      updateStore: (id, store) => {
        if (!get().hasPermission('store:update')) return;
        const now = new Date().toISOString();
        const oldStore = get().getStoreById(id);
        set((state) => ({
          stores: state.stores.map((s) =>
            s.id === id ? { ...s, ...store, updatedAt: now } : s
          ),
        }));
        if (oldStore) {
          const changes: string[] = [];
          if (store.name && store.name !== oldStore.name) changes.push(`名称: ${oldStore.name} → ${store.name}`);
          if (store.address && store.address !== oldStore.address) changes.push(`地址变更`);
          if (store.phone && store.phone !== oldStore.phone) changes.push(`电话变更`);
          get().addAuditLog('store:update', id, oldStore.name, changes.length > 0 ? changes.join('; ') : `更新门店「${oldStore.name}」信息`);
        }
      },

      deleteStore: (id) => {
        if (!get().hasPermission('store:delete')) return false;
        const { rooms } = get();
        const hasRooms = rooms.some((r) => r.storeId === id);
        if (hasRooms) return false;

        const targetStore = get().getStoreById(id);
        set((state) => ({
          stores: state.stores.filter((s) => s.id !== id),
        }));
        if (targetStore) {
          get().addAuditLog('store:delete', id, targetStore.name, `删除门店「${targetStore.name}」`);
        }
        return true;
      },

      getStoreById: (id) => {
        return get().stores.find((s) => s.id === id);
      },

      addRoom: (room) => {
        if (!get().hasPermission('room:create')) return;
        const now = new Date().toISOString();
        const newRoom: Room = {
          ...room,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ rooms: [...state.rooms, newRoom] }));
        const store = get().getStoreById(room.storeId);
        get().addAuditLog('room:create', newRoom.id, newRoom.roomNumber, `创建房间「${newRoom.roomNumber} ${newRoom.name}」(门店: ${store?.name || '未知'})`);
      },

      updateRoom: (id, room) => {
        if (!get().hasPermission('room:update')) return;
        const now = new Date().toISOString();
        const oldRoom = get().getRoomById(id);
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === id ? { ...r, ...room, updatedAt: now } : r
          ),
        }));
        if (oldRoom) {
          const changes: string[] = [];
          if (room.roomNumber && room.roomNumber !== oldRoom.roomNumber) changes.push(`房号: ${oldRoom.roomNumber} → ${room.roomNumber}`);
          if (room.price !== undefined && room.price !== oldRoom.price) changes.push(`价格: ¥${oldRoom.price} → ¥${room.price}`);
          if (room.status && room.status !== oldRoom.status) changes.push(`状态变更`);
          get().addAuditLog('room:update', id, oldRoom.roomNumber, changes.length > 0 ? changes.join('; ') : `更新房间「${oldRoom.roomNumber} ${oldRoom.name}」`);
        }
      },

      deleteRoom: (id) => {
        if (!get().hasPermission('room:delete')) return false;
        const { bookings } = get();
        const hasActiveBooking = bookings.some(
          (b) =>
            b.roomId === id &&
            b.status !== 'cancelled' &&
            b.status !== 'checked-out'
        );
        if (hasActiveBooking) return false;

        const targetRoom = get().getRoomById(id);
        set((state) => ({
          rooms: state.rooms.filter((r) => r.id !== id),
        }));
        if (targetRoom) {
          get().addAuditLog('room:delete', id, targetRoom.roomNumber, `删除房间「${targetRoom.roomNumber} ${targetRoom.name}」`);
        }
        return true;
      },

      getRoomById: (id) => {
        return get().rooms.find((r) => r.id === id);
      },

      getRoomsByStore: (storeId) => {
        const { rooms } = get();
        if (storeId === 'all') return rooms;
        return rooms.filter((r) => r.storeId === storeId);
      },

      addBooking: (booking) => {
        if (!get().hasPermission('booking:create')) return false;
        const { isRoomAvailable } = get();
        if (!isRoomAvailable(booking.roomId, booking.checkIn, booking.checkOut)) {
          return false;
        }

        const now = new Date().toISOString();
        const newBooking: Booking = {
          ...booking,
          guestPhone: normalizePhone(booking.guestPhone),
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ bookings: [...state.bookings, newBooking] }));
        const room = get().getRoomById(booking.roomId);
        get().addAuditLog('booking:create', newBooking.id, booking.guestName, `创建预订: ${booking.guestName}(${booking.guestPhone}) 房间${room?.roomNumber || ''} ${booking.checkIn}~${booking.checkOut} ¥${booking.totalPrice}`);
        return true;
      },

      updateBooking: (id, booking) => {
        if (!get().hasPermission('booking:update')) return false;
        const state = get();
        const existing = state.bookings.find((b) => b.id === id);
        if (!existing) return false;

        const roomId = booking.roomId || existing.roomId;
        const checkIn = booking.checkIn || existing.checkIn;
        const checkOut = booking.checkOut || existing.checkOut;

        if (
          booking.checkIn ||
          booking.checkOut ||
          booking.roomId
        ) {
          if (!state.isRoomAvailable(roomId, checkIn, checkOut, id)) {
            return false;
          }
        }

        const now = new Date().toISOString();
        const updateData = { ...booking };
        if (updateData.guestPhone !== undefined) {
          updateData.guestPhone = normalizePhone(updateData.guestPhone);
        }
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === id ? { ...b, ...updateData, updatedAt: now } : b
          ),
        }));
        const changes: string[] = [];
        if (booking.guestName && booking.guestName !== existing.guestName) changes.push('客人姓名变更');
        if (booking.checkIn || booking.checkOut) changes.push(`日期: ${existing.checkIn}~${existing.checkOut} → ${checkIn}~${checkOut}`);
        if (booking.totalPrice !== undefined && booking.totalPrice !== existing.totalPrice) changes.push(`金额: ¥${existing.totalPrice} → ¥${booking.totalPrice}`);
        get().addAuditLog('booking:update', id, existing.guestName, changes.length > 0 ? changes.join('; ') : `更新预订: ${existing.guestName}`);
        return true;
      },

      cancelBooking: (id, reason) => {
        if (!get().hasPermission('booking:cancel')) return;
        const now = new Date().toISOString();
        const existing = get().getBookingById(id);
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === id
              ? { ...b, status: 'cancelled', cancelReason: reason, updatedAt: now }
              : b
          ),
        }));
        if (existing) {
          get().addAuditLog('booking:cancel', id, existing.guestName, `取消预订: ${existing.guestName} 原因: ${reason}`);
          get().matchWaitlistToAvailability(existing.roomId, existing.checkIn, existing.checkOut);
        }
      },

      updateBookingStatus: (id, status) => {
        if (status === 'checked-in' && !get().hasPermission('booking:checkin')) return;
        if (status === 'checked-out' && !get().hasPermission('booking:checkout')) return;
        const now = new Date().toISOString();
        const booking = get().bookings.find((b) => b.id === id);
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === id ? { ...b, status, updatedAt: now } : b
          ),
        }));

        if (booking) {
          if (status === 'checked-in') {
            get().addAuditLog('booking:checkin', id, booking.guestName, `办理入住: ${booking.guestName} 房间${get().getRoomById(booking.roomId)?.roomNumber || ''}`);
          } else if (status === 'checked-out') {
            get().addAuditLog('booking:checkout', id, booking.guestName, `办理退房: ${booking.guestName} 房间${get().getRoomById(booking.roomId)?.roomNumber || ''}`);
          }
        }

        if (status === 'checked-out' && booking) {
          const today = todayStr();
          const existingTask = get().cleaningTasks.find(
            (t) => t.bookingId === booking.id && t.status !== 'completed'
          );
          if (!existingTask) {
            const newTask: CleaningTask = {
              id: generateId(),
              roomId: booking.roomId,
              bookingId: booking.id,
              guestName: booking.guestName,
              scheduledDate: today,
              status: 'pending',
              notes: '退房自动生成保洁任务',
              createdAt: now,
              updatedAt: now,
            };
            set((state) => ({
              cleaningTasks: [...state.cleaningTasks, newTask],
            }));
          }
        }
      },

      getBookingById: (id) => {
        return get().bookings.find((b) => b.id === id);
      },

      getBookingsByStore: (storeId) => {
        const { bookings, getRoomsByStore } = get();
        const rooms = getRoomsByStore(storeId);
        const roomIds = new Set(rooms.map((r) => r.id));
        return bookings.filter((b) => roomIds.has(b.roomId));
      },

      getBookingsByRoom: (roomId) => {
        return get().bookings.filter((b) => b.roomId === roomId);
      },

      getBookingsByDate: (date, storeId = 'all') => {
        const { getBookingsByStore } = get();
        const bookings = getBookingsByStore(storeId);
        return bookings.filter(
          (b) =>
            b.status !== 'cancelled' &&
            isDateOverlap(b.checkIn, b.checkOut, date, date)
        );
      },

      getActiveBookingsByDate: (date, storeId = 'all') => {
        const { getBookingsByStore } = get();
        const bookings = getBookingsByStore(storeId);
        return bookings.filter(
          (b) =>
            (b.status === 'confirmed' || b.status === 'checked-in') &&
            isDateOverlap(b.checkIn, b.checkOut, date, date)
        );
      },

      isRoomAvailable: (roomId, checkIn, checkOut, excludeBookingId, excludeContractId) => {
        const { bookings, closedDates, longTermContracts } = get();
        const room = get().rooms.find((r) => r.id === roomId);
        if (!room || room.status !== 'active') return false;

        const hasBookingConflict = bookings.some(
          (b) =>
            b.id !== excludeBookingId &&
            b.roomId === roomId &&
            b.status !== 'cancelled' &&
            isDateOverlap(checkIn, checkOut, b.checkIn, b.checkOut)
        );
        if (hasBookingConflict) return false;

        const hasLongTermConflict = longTermContracts.some(
          (c) =>
            c.id !== excludeContractId &&
            c.roomId === roomId &&
            (c.status === 'active' || c.status === 'expiring' || c.status === 'renewed') &&
            isDateOverlap(checkIn, checkOut, c.startDate, c.endDate)
        );
        if (hasLongTermConflict) return false;

        const hasClosedDateConflict = closedDates.some(
          (cd) =>
            cd.roomId === roomId &&
            isDateOverlap(checkIn, checkOut, cd.startDate, cd.endDate)
        );
        if (hasClosedDateConflict) return false;

        return true;
      },

      getAvailableRooms: (checkIn, checkOut, storeId = 'all') => {
        const { getRoomsByStore, isRoomAvailable } = get();
        const rooms = getRoomsByStore(storeId);
        return rooms.filter(
          (r) => r.status === 'active' && isRoomAvailable(r.id, checkIn, checkOut)
        );
      },

      getMinStayForRoom: (roomId, checkIn, checkOut) => {
        const { minStayRules } = get();
        let maxMinNights = 1;

        minStayRules.forEach((rule) => {
          if (rule.roomId === roomId && isDateOverlap(checkIn, checkOut, rule.startDate, rule.endDate)) {
            if (rule.minNights > maxMinNights) {
              maxMinNights = rule.minNights;
            }
          }
        });

        return maxMinNights;
      },

      checkMinStayCompliance: (roomId, checkIn, checkOut) => {
        const nights = calculateNights(checkIn, checkOut);
        const minNights = get().getMinStayForRoom(roomId, checkIn, checkOut);
        return nights >= minNights;
      },

      addWaitlistEntry: (entry) => {
        if (!get().hasPermission('waitlist:create')) return null;
        const now = new Date().toISOString();
        const today = todayStr();

        if (entry.checkIn < today) {
          return null;
        }

        const state = get();
        const sameDateEntries = state.waitlistEntries.filter(
          (w) =>
            w.status === 'waiting' &&
            w.checkIn === entry.checkIn &&
            w.checkOut === entry.checkOut
        );
        const priority = sameDateEntries.length + 1;

        const newEntry: WaitlistEntry = {
          ...entry,
          guestPhone: normalizePhone(entry.guestPhone),
          id: generateId(),
          status: 'waiting',
          priority,
          createdAt: now,
          updatedAt: now,
        };

        set((s) => ({ waitlistEntries: [...s.waitlistEntries, newEntry] }));
        const room = get().getRoomById(entry.roomId);
        get().addAuditLog(
          'waitlist:create',
          newEntry.id,
          entry.guestName,
          `新增候补登记: ${entry.guestName}(${entry.guestPhone}) 房间${room?.roomNumber || ''} ${entry.checkIn}~${entry.checkOut} 优先级:${priority}`
        );
        return newEntry;
      },

      updateWaitlistEntry: (id, entry) => {
        if (!get().hasPermission('waitlist:update')) return false;
        const state = get();
        const existing = state.waitlistEntries.find((w) => w.id === id);
        if (!existing) return false;

        const now = new Date().toISOString();
        const updateData = { ...entry };
        if (updateData.guestPhone !== undefined) {
          updateData.guestPhone = normalizePhone(updateData.guestPhone);
        }

        set((s) => ({
          waitlistEntries: s.waitlistEntries.map((w) =>
            w.id === id ? { ...w, ...updateData, updatedAt: now } : w
          ),
        }));

        const changes: string[] = [];
        if (entry.checkIn || entry.checkOut) changes.push(`日期变更`);
        if (entry.guestName && entry.guestName !== existing.guestName) changes.push('客人姓名变更');
        get().addAuditLog(
          'waitlist:update',
          id,
          existing.guestName,
          changes.length > 0
            ? `更新候补登记: ${existing.guestName} ${changes.join('; ')}`
            : `更新候补登记: ${existing.guestName}`
        );
        return true;
      },

      cancelWaitlistEntry: (id, reason) => {
        if (!get().hasPermission('waitlist:cancel')) return;
        const now = new Date().toISOString();
        const existing = get().getWaitlistById(id);
        set((state) => ({
          waitlistEntries: state.waitlistEntries.map((w) =>
            w.id === id
              ? { ...w, status: 'cancelled', cancelReason: reason, updatedAt: now }
              : w
          ),
        }));
        if (existing) {
          get().addAuditLog(
            'waitlist:cancel',
            id,
            existing.guestName,
            `取消候补登记: ${existing.guestName} 原因: ${reason}`
          );
        }
      },

      getWaitlistById: (id) => {
        return get().waitlistEntries.find((w) => w.id === id);
      },

      getWaitlistByStore: (storeId) => {
        const { waitlistEntries, getRoomsByStore } = get();
        const rooms = getRoomsByStore(storeId);
        const roomIds = new Set(rooms.map((r) => r.id));
        return waitlistEntries.filter((w) => roomIds.has(w.roomId));
      },

      getWaitlistByRoom: (roomId) => {
        return get().waitlistEntries.filter((w) => w.roomId === roomId);
      },

      getActiveWaitlistCount: (storeId = 'all') => {
        const entries = get().getWaitlistByStore(storeId);
        return entries.filter((w) => w.status === 'waiting' || w.status === 'matched').length;
      },

      matchWaitlistToAvailability: (roomId, checkIn, checkOut) => {
        if (!get().hasPermission('waitlist:confirm')) return [];
        const state = get();
        const now = new Date().toISOString();
        const matchedEntries: WaitlistEntry[] = [];

        let candidateEntries = state.waitlistEntries.filter(
          (w) => w.status === 'waiting'
        );

        if (roomId) {
          candidateEntries = candidateEntries.filter((w) => w.roomId === roomId);
        }
        if (checkIn && checkOut) {
          candidateEntries = candidateEntries.filter(
            (w) => isDateOverlap(w.checkIn, w.checkOut, checkIn, checkOut)
          );
        }

        candidateEntries = candidateEntries.sort(
          (a, b) => a.priority - b.priority || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        for (const entry of candidateEntries) {
          const availableRooms = state.getAvailableRooms(entry.checkIn, entry.checkOut);
          const matchedRoom = availableRooms.find((r) => r.id === entry.roomId) || availableRooms[0];

          if (matchedRoom) {
            const room = state.getRoomById(entry.roomId);
            const nights = calculateNights(entry.checkIn, entry.checkOut);
            const totalPrice = matchedRoom.price * nights;

            set((s) => ({
              waitlistEntries: s.waitlistEntries.map((w) =>
                w.id === entry.id
                  ? {
                      ...w,
                      status: 'matched',
                      matchedRoomId: matchedRoom.id,
                      notifiedAt: now,
                      updatedAt: now,
                    }
                  : w
              ),
            }));

            get().addWaitlistNotification({
              waitlistId: entry.id,
              guestName: entry.guestName,
              guestPhone: entry.guestPhone,
              message: `尊敬的${entry.guestName}，您候补的${room?.roomNumber || ''}房间已有空房！${entry.checkIn}~${entry.checkOut}，共${nights}晚，总价¥${totalPrice}，请在24小时内确认预订。`,
              roomNumber: matchedRoom.roomNumber,
              checkIn: entry.checkIn,
              checkOut: entry.checkOut,
              totalPrice,
            });

            get().addAuditLog(
              'waitlist:match',
              entry.id,
              entry.guestName,
              `候补匹配成功: ${entry.guestName} 匹配房间${matchedRoom.roomNumber} ${entry.checkIn}~${entry.checkOut} ¥${totalPrice}`
            );

            const updatedEntry = get().getWaitlistById(entry.id);
            if (updatedEntry) matchedEntries.push(updatedEntry);
          }
        }

        return matchedEntries;
      },

      confirmWaitlistBooking: (waitlistId) => {
        if (!get().hasPermission('waitlist:confirm')) return null;
        const state = get();
        const entry = state.getWaitlistById(waitlistId);
        if (!entry || entry.status !== 'matched') return null;

        const roomId = entry.matchedRoomId || entry.roomId;
        const room = state.getRoomById(roomId);
        if (!room) return null;

        const nights = calculateNights(entry.checkIn, entry.checkOut);
        const totalPrice = room.price * nights;
        const now = new Date().toISOString();

        const bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
          roomId,
          guestName: entry.guestName,
          guestPhone: entry.guestPhone,
          guestIdCard: entry.guestIdCard,
          checkIn: entry.checkIn,
          checkOut: entry.checkOut,
          guests: entry.guests,
          totalPrice,
          roomPrice: totalPrice,
          extraServicesPrice: 0,
          extraServices: [],
          status: 'confirmed',
          notes: entry.notes ? `[候补转预订] ${entry.notes}` : '[候补转预订]',
        };

        const bookingId = generateId();
        const newBooking: Booking = {
          ...bookingData,
          id: bookingId,
          createdAt: now,
          updatedAt: now,
        };

        set((s) => ({
          bookings: [...s.bookings, newBooking],
          waitlistEntries: s.waitlistEntries.map((w) =>
            w.id === waitlistId
              ? {
                  ...w,
                  status: 'confirmed',
                  matchedBookingId: bookingId,
                  confirmedAt: now,
                  updatedAt: now,
                }
              : w
          ),
        }));

        get().addAuditLog(
          'waitlist:confirm',
          waitlistId,
          entry.guestName,
          `候补确认预订: ${entry.guestName} 房间${room.roomNumber} ${entry.checkIn}~${entry.checkOut} ¥${totalPrice}`
        );
        get().addAuditLog(
          'booking:create',
          bookingId,
          entry.guestName,
          `创建预订(候补转): ${entry.guestName}(${entry.guestPhone}) 房间${room.roomNumber} ${entry.checkIn}~${entry.checkOut} ¥${totalPrice}`
        );

        return newBooking;
      },

      expireOldWaitlistEntries: () => {
        const state = get();
        const now = new Date().toISOString();
        const today = todayStr();
        const expiredIds: string[] = [];

        state.waitlistEntries.forEach((w) => {
          if (w.status === 'waiting' && w.checkIn < today) {
            expiredIds.push(w.id);
          }
          if (w.status === 'matched' && w.notifiedAt) {
            const notifiedDate = new Date(w.notifiedAt);
            const hoursSince = (Date.now() - notifiedDate.getTime()) / (1000 * 60 * 60);
            if (hoursSince >= 24) {
              expiredIds.push(w.id);
            }
          }
        });

        if (expiredIds.length > 0) {
          set((s) => ({
            waitlistEntries: s.waitlistEntries.map((w) =>
              expiredIds.includes(w.id)
                ? { ...w, status: 'expired', expiredAt: now, updatedAt: now }
                : w
            ),
          }));
          expiredIds.forEach((id) => {
            const entry = state.getWaitlistById(id);
            if (entry) {
              get().addAuditLog(
                'waitlist:expire',
                id,
                entry.guestName,
                `候补登记过期: ${entry.guestName} ${entry.checkIn}~${entry.checkOut}`
              );
            }
          });
        }
      },

      addWaitlistNotification: (notification) => {
        const now = new Date().toISOString();
        const newNotification: WaitlistNotification = {
          ...notification,
          id: generateId(),
          createdAt: now,
          read: false,
          confirmed: false,
        };
        set((s) => ({
          waitlistNotifications: [newNotification, ...s.waitlistNotifications].slice(0, 200),
        }));
      },

      markNotificationRead: (id) => {
        set((s) => ({
          waitlistNotifications: s.waitlistNotifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
      },

      getUnreadNotificationCount: () => {
        return get().waitlistNotifications.filter((n) => !n.read).length;
      },

      getTodayStats: (storeId = 'all') => {
        const { getRoomsByStore, getBookingsByStore } = get();
        const rooms = getRoomsByStore(storeId);
        const bookings = getBookingsByStore(storeId);
        const today = todayStr();

        const totalRooms = rooms.filter((r) => r.status === 'active').length;

        const occupiedBookings = bookings.filter(
          (b) =>
            (b.status === 'confirmed' || b.status === 'checked-in') &&
            isDateOverlap(b.checkIn, b.checkOut, today, today)
        );
        const occupiedToday = occupiedBookings.length;
        const availableToday = Math.max(0, totalRooms - occupiedToday);

        const checkInToday = bookings.filter(
          (b) => b.status !== 'cancelled' && isSameDayStr(b.checkIn, today)
        ).length;
        const checkOutToday = bookings.filter(
          (b) => b.status !== 'cancelled' && isSameDayStr(b.checkOut, today)
        ).length;

        return {
          totalRooms,
          occupiedToday,
          availableToday,
          checkInToday,
          checkOutToday,
        };
      },

      getDailyReport: (startDate, endDate, storeId = 'all') => {
        const { getRoomsByStore, getBookingsByStore } = get();
        const rooms = getRoomsByStore(storeId);
        const bookings = getBookingsByStore(storeId);
        const days = getDaysInRange(startDate, endDate);
        const totalRooms = rooms.filter((r) => r.status === 'active').length;
        const validBookings = bookings.filter((b) => b.status !== 'cancelled');

        return days.map((date) => {
          const dayBookings = validBookings.filter((b) =>
            isDateOverlap(b.checkIn, b.checkOut, date, date)
          );

          let dayRevenue = 0;
          validBookings.forEach((b) => {
            const bookingDays = getDaysArray(b.checkIn, b.checkOut);
            if (bookingDays.includes(date)) {
              const nights = calculateNights(b.checkIn, b.checkOut);
              if (nights > 0) {
                dayRevenue += b.totalPrice / nights;
              }
            }
          });

          const checkIns = validBookings.filter((b) =>
            isSameDayStr(b.checkIn, date)
          ).length;
          const checkOuts = validBookings.filter((b) =>
            isSameDayStr(b.checkOut, date)
          ).length;
          const newBookings = bookings.filter((b) =>
            formatDate(b.createdAt) === date
          ).length;

          const occupiedRooms = dayBookings.length;
          const occupancyRate =
            totalRooms > 0 ? occupiedRooms / totalRooms : 0;

          return {
            date,
            revenue: Math.round(dayRevenue * 100) / 100,
            occupancyRate: Math.round(occupancyRate * 10000) / 100,
            occupiedRooms,
            totalRooms,
            checkIns,
            checkOuts,
            bookings: newBookings,
          };
        });
      },

      getMonthlyReport: (startMonth, endMonth, storeId = 'all') => {
        const { getRoomsByStore, getBookingsByStore } = get();
        const rooms = getRoomsByStore(storeId);
        const bookings = getBookingsByStore(storeId);
        const months = getMonthsInRange(
          startOfMonthStr(startMonth + '-01'),
          endOfMonthStr(endMonth + '-01')
        );
        const totalRooms = rooms.filter((r) => r.status === 'active').length;
        const validBookings = bookings.filter((b) => b.status !== 'cancelled');

        return months.map((month) => {
          const monthStart = startOfMonthStr(month + '-01');
          const monthEnd = endOfMonthStr(month + '-01');
          const daysInMonth = getDaysInRange(monthStart, monthEnd).length;

          let monthRevenue = 0;
          let totalOccupiedRoomNights = 0;
          let totalNights = 0;

          validBookings.forEach((b) => {
            const bookingDays = getDaysArray(b.checkIn, b.checkOut);
            const monthDays = getDaysArray(monthStart, monthEnd);
            const overlappingDays = bookingDays.filter((d) =>
              monthDays.includes(d)
            );

            if (overlappingDays.length > 0) {
              const nights = calculateNights(b.checkIn, b.checkOut);
              if (nights > 0) {
                monthRevenue += (b.totalPrice / nights) * overlappingDays.length;
              }
              totalNights += overlappingDays.length;
              totalOccupiedRoomNights += overlappingDays.length;
            }
          });

          const avgOccupancyRate =
            totalRooms > 0 && daysInMonth > 0
              ? totalOccupiedRoomNights / (totalRooms * daysInMonth)
              : 0;

          const monthBookings = validBookings.filter(
            (b) => getMonthKey(b.checkIn) === month
          ).length;

          const avgDailyRate = totalNights > 0 ? monthRevenue / totalNights : 0;

          return {
            month,
            revenue: Math.round(monthRevenue * 100) / 100,
            avgOccupancyRate: Math.round(avgOccupancyRate * 10000) / 100,
            totalBookings: monthBookings,
            totalNights,
            avgDailyRate: Math.round(avgDailyRate * 100) / 100,
          };
        });
      },

      getRevenueStats: (storeId = 'all') => {
        const { getDailyReport, getMonthlyReport, getBookingsByStore } = get();
        const bookings = getBookingsByStore(storeId);
        const today = todayStr();
        const thisMonth = getMonthKey(today);
        const lastMonthDate = new Date();
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        const lastMonth = getMonthKey(lastMonthDate);

        const dailyReport = getDailyReport(today, today, storeId);
        const todayRevenue = dailyReport[0]?.revenue || 0;

        const monthlyReport = getMonthlyReport(thisMonth, thisMonth, storeId);
        const monthRevenue = monthlyReport[0]?.revenue || 0;
        const monthOccupancyRate = monthlyReport[0]?.avgOccupancyRate || 0;
        const monthBookings = monthlyReport[0]?.totalBookings || 0;

        const lastMonthReport = getMonthlyReport(lastMonth, lastMonth, storeId);
        const lastMonthRevenue = lastMonthReport[0]?.revenue || 0;
        const lastMonthOccupancyRate =
          lastMonthReport[0]?.avgOccupancyRate || 0;

        const totalBookings = bookings.filter(
          (b) => b.status !== 'cancelled'
        ).length;

        return {
          todayRevenue,
          monthRevenue,
          lastMonthRevenue,
          monthOccupancyRate,
          lastMonthOccupancyRate,
          totalBookings,
          monthBookings,
        };
      },

      getGuestProfiles: (storeId = 'all') => {
        const { getBookingsByStore } = get();
        const bookings = getBookingsByStore(storeId);
        const today = todayStr();
        const phoneMap = new Map<string, Booking[]>();

        bookings.forEach((b) => {
          const phone = normalizePhone(b.guestPhone);
          if (!phone) return;
          const list = phoneMap.get(phone) || [];
          list.push(b);
          phoneMap.set(phone, list);
        });

        const profiles: GuestProfile[] = [];

        phoneMap.forEach((guestBookings, phone) => {
          const validBookings = guestBookings.filter(
            (b) => b.status !== 'cancelled'
          );
          const latestName =
            guestBookings
              .filter((b) => b.status !== 'cancelled')
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              )[0]?.guestName || guestBookings[0].guestName;

          const totalSpending = validBookings.reduce(
            (sum, b) => sum + b.totalPrice,
            0
          );
          const totalNights = validBookings.reduce(
            (sum, b) => sum + calculateNights(b.checkIn, b.checkOut),
            0
          );

          const sortedByCheckIn = [...validBookings].sort(
            (a, b) =>
              new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime()
          );
          const lastCheckIn = sortedByCheckIn[0]?.checkIn || '';
          const lastCheckOut = sortedByCheckIn[0]?.checkOut || '';
          const lastVisitDate = lastCheckOut;

          const upcomingBookings = validBookings.filter(
            (b) =>
              (b.status === 'confirmed' || b.status === 'checked-in') &&
              b.checkOut >= today
          ).length;

          let repurchaseReminder: RepurchaseReminder | null = null;
          if (validBookings.length > 0) {
            const lastCheckoutDate = lastCheckOut;
            const daysSince = differenceInDays(
              parseISO(today),
              parseISO(lastCheckoutDate)
            );

            if (upcomingBookings > 0) {
              repurchaseReminder = {
                level: 'recent',
                daysSinceLastVisit: Math.max(0, daysSince),
                message: '有即将到访的预订',
              };
            } else if (daysSince < 0) {
              repurchaseReminder = {
                level: 'recent',
                daysSinceLastVisit: 0,
                message: '当前在住中',
              };
            } else if (daysSince <= 30) {
              repurchaseReminder = {
                level: 'recent',
                daysSinceLastVisit: daysSince,
                message: `${daysSince}天前曾到访`,
              };
            } else if (daysSince <= 90) {
              repurchaseReminder = {
                level: 'suggest',
                daysSinceLastVisit: daysSince,
                message: `已${daysSince}天未到访，建议回访`,
              };
            } else {
              repurchaseReminder = {
                level: 'churn-risk',
                daysSinceLastVisit: daysSince,
                message: `已${daysSince}天未到访，存在流失风险`,
              };
            }
          }

          profiles.push({
            guestPhone: phone,
            guestName: latestName,
            bookingCount: guestBookings.length,
            validBookingCount: validBookings.length,
            totalSpending,
            totalNights,
            lastCheckIn,
            lastCheckOut,
            lastVisitDate,
            upcomingBookings,
            repurchaseReminder,
          });
        });

        return profiles.sort((a, b) => b.validBookingCount - a.validBookingCount);
      },

      getGuestProfileByPhone: (phone, storeId = 'all') => {
        const normalized = normalizePhone(phone);
        const profiles = get().getGuestProfiles(storeId);
        return profiles.find((p) => p.guestPhone === normalized);
      },

      getRepurchaseReminders: (storeId = 'all') => {
        const profiles = get().getGuestProfiles(storeId);
        return profiles.filter(
          (p) =>
            p.repurchaseReminder &&
            (p.repurchaseReminder.level === 'suggest' ||
              p.repurchaseReminder.level === 'churn-risk')
        );
      },

      addCleaningTask: (task) => {
        if (!get().hasPermission('cleaning:update')) return;
        const now = new Date().toISOString();
        const newTask: CleaningTask = {
          ...task,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ cleaningTasks: [...state.cleaningTasks, newTask] }));
      },

      updateCleaningTask: (id, task) => {
        if (!get().hasPermission('cleaning:update')) return;
        const now = new Date().toISOString();
        const oldTask = get().cleaningTasks.find((t) => t.id === id);
        set((state) => ({
          cleaningTasks: state.cleaningTasks.map((t) =>
            t.id === id ? { ...t, ...task, updatedAt: now } : t
          ),
        }));
        if (oldTask) {
          const room = get().getRoomById(oldTask.roomId);
          get().addAuditLog('cleaning:update', id, room?.roomNumber, `更新保洁任务 房间${room?.roomNumber || ''}`);
        }
      },

      updateCleaningTaskStatus: (id, status) => {
        if (!get().hasPermission('cleaning:update')) return;
        const now = new Date().toISOString();
        const completedAt = status === 'completed' ? now : undefined;
        const oldTask = get().cleaningTasks.find((t) => t.id === id);
        set((state) => ({
          cleaningTasks: state.cleaningTasks.map((t) =>
            t.id === id ? { ...t, status, updatedAt: now, completedAt } : t
          ),
        }));
        if (oldTask) {
          const room = get().getRoomById(oldTask.roomId);
          get().addAuditLog('cleaning:update', id, room?.roomNumber, `保洁任务状态变更: ${room?.roomNumber || ''} → ${status === 'completed' ? '已完成' : status === 'in-progress' ? '进行中' : '待处理'}`);
        }
      },

      deleteCleaningTask: (id) => {
        if (!get().hasPermission('cleaning:update')) return;
        set((state) => ({
          cleaningTasks: state.cleaningTasks.filter((t) => t.id !== id),
        }));
      },

      getCleaningTasksByRoom: (roomId) => {
        return get().cleaningTasks.filter((t) => t.roomId === roomId);
      },

      getCleaningTasksByDate: (date, storeId = 'all') => {
        const { getCleaningTasksByStore } = get();
        const tasks = getCleaningTasksByStore(storeId);
        return tasks.filter((t) => t.scheduledDate === date);
      },

      getCleaningTasksByStore: (storeId) => {
        const { cleaningTasks, getRoomsByStore } = get();
        const rooms = getRoomsByStore(storeId);
        const roomIds = new Set(rooms.map((r) => r.id));
        return cleaningTasks.filter((t) => roomIds.has(t.roomId));
      },

      getPendingTasks: (storeId = 'all') => {
        const { getRoomsByStore, getBookingsByStore, getCleaningTasksByStore } = get();
        const rooms = getRoomsByStore(storeId);
        const bookings = getBookingsByStore(storeId);
        const cleaningTasks = getCleaningTasksByStore(storeId);
        const today = todayStr();

        const pendingCleaning = cleaningTasks.filter(
          (t) => t.status === 'pending' || t.status === 'in-progress'
        ).length;

        const todayCheckIns = bookings.filter(
          (b) =>
            b.status !== 'cancelled' &&
            b.status !== 'checked-out' &&
            isSameDayStr(b.checkIn, today)
        ).length;

        const todayCheckOuts = bookings.filter(
          (b) =>
            b.status !== 'cancelled' &&
            b.status !== 'checked-out' &&
            isSameDayStr(b.checkOut, today)
        ).length;

        const maintenanceRooms = rooms.filter(
          (r) => r.status === 'maintenance'
        ).length;

        return {
          pendingCleaning,
          todayCheckIns,
          todayCheckOuts,
          maintenanceRooms,
          total: pendingCleaning + todayCheckIns + todayCheckOuts + maintenanceRooms,
        };
      },

      addClosedDate: (closedDate) => {
        if (!get().hasPermission('room:closeddate:create')) return;
        const now = new Date().toISOString();
        const newClosedDate: ClosedDate = {
          ...closedDate,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ closedDates: [...state.closedDates, newClosedDate] }));
        const room = get().getRoomById(closedDate.roomId);
        const reasonLabel = ClosedDateReasonLabels[closedDate.reason] || closedDate.reason;
        get().addAuditLog(
          'room:closeddate:create',
          newClosedDate.id,
          room?.roomNumber,
          `房间${room?.roomNumber || ''} 添加禁订日期 ${closedDate.startDate}~${closedDate.endDate} 原因:${reasonLabel}${closedDate.description ? ' 说明:' + closedDate.description : ''}`
        );
      },

      updateClosedDate: (id, closedDate) => {
        if (!get().hasPermission('room:closeddate:update')) return;
        const now = new Date().toISOString();
        const oldClosedDate = get().closedDates.find((cd) => cd.id === id);
        set((state) => ({
          closedDates: state.closedDates.map((cd) =>
            cd.id === id ? { ...cd, ...closedDate, updatedAt: now } : cd
          ),
        }));
        if (oldClosedDate) {
          const room = get().getRoomById(oldClosedDate.roomId);
          const changes: string[] = [];
          if (closedDate.startDate && closedDate.startDate !== oldClosedDate.startDate) changes.push(`开始日期: ${oldClosedDate.startDate} → ${closedDate.startDate}`);
          if (closedDate.endDate && closedDate.endDate !== oldClosedDate.endDate) changes.push(`结束日期: ${oldClosedDate.endDate} → ${closedDate.endDate}`);
          if (closedDate.reason && closedDate.reason !== oldClosedDate.reason) changes.push(`原因: ${ClosedDateReasonLabels[oldClosedDate.reason]} → ${ClosedDateReasonLabels[closedDate.reason]}`);
          if (closedDate.description !== undefined && closedDate.description !== oldClosedDate.description) changes.push(`说明变更`);
          get().addAuditLog(
            'room:closeddate:update',
            id,
            room?.roomNumber,
            changes.length > 0
              ? `房间${room?.roomNumber || ''} 更新禁订日期: ${changes.join('; ')}`
              : `房间${room?.roomNumber || ''} 更新禁订日期 ${oldClosedDate.startDate}~${oldClosedDate.endDate}`
          );
        }
      },

      deleteClosedDate: (id) => {
        if (!get().hasPermission('room:closeddate:delete')) return;
        const targetClosedDate = get().closedDates.find((cd) => cd.id === id);
        set((state) => ({
          closedDates: state.closedDates.filter((cd) => cd.id !== id),
        }));
        if (targetClosedDate) {
          const room = get().getRoomById(targetClosedDate.roomId);
          get().addAuditLog(
            'room:closeddate:delete',
            id,
            room?.roomNumber,
            `房间${room?.roomNumber || ''} 删除禁订日期 ${targetClosedDate.startDate}~${targetClosedDate.endDate}`
          );
        }
      },

      getClosedDatesByRoom: (roomId) => {
        return get().closedDates.filter((cd) => cd.roomId === roomId);
      },

      getClosedDatesByDate: (date, storeId = 'all') => {
        const { getRoomsByStore } = get();
        const rooms = getRoomsByStore(storeId);
        const roomIds = new Set(rooms.map((r) => r.id));
        return get().closedDates.filter(
          (cd) => roomIds.has(cd.roomId) && isDateOverlap(date, date, cd.startDate, cd.endDate)
        );
      },

      isDateClosed: (roomId, date) => {
        return get().closedDates.some(
          (cd) => cd.roomId === roomId && isDateOverlap(date, date, cd.startDate, cd.endDate)
        );
      },

      hasClosedDateInRange: (roomId, startDate, endDate) => {
        return get().closedDates.some(
          (cd) => cd.roomId === roomId && isDateOverlap(startDate, endDate, cd.startDate, cd.endDate)
        );
      },

      addMinStayRule: (rule) => {
        if (!get().hasPermission('room:minstay:create')) return;
        const now = new Date().toISOString();
        const newRule: MinStayRule = {
          ...rule,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ minStayRules: [...state.minStayRules, newRule] }));
        const room = get().getRoomById(rule.roomId);
        get().addAuditLog(
          'room:minstay:create',
          newRule.id,
          room?.roomNumber,
          `房间${room?.roomNumber || ''} 添加最短连住规则 ${rule.minNights}晚 ${rule.startDate}~${rule.endDate}${rule.description ? ' 说明:' + rule.description : ''}`
        );
      },

      updateMinStayRule: (id, rule) => {
        if (!get().hasPermission('room:minstay:update')) return;
        const now = new Date().toISOString();
        const oldRule = get().minStayRules.find((r) => r.id === id);
        set((state) => ({
          minStayRules: state.minStayRules.map((r) =>
            r.id === id ? { ...r, ...rule, updatedAt: now } : r
          ),
        }));
        if (oldRule) {
          const room = get().getRoomById(oldRule.roomId);
          const changes: string[] = [];
          if (rule.minNights !== undefined && rule.minNights !== oldRule.minNights) changes.push(`晚数: ${oldRule.minNights}晚 → ${rule.minNights}晚`);
          if (rule.startDate && rule.startDate !== oldRule.startDate) changes.push(`开始日期: ${oldRule.startDate} → ${rule.startDate}`);
          if (rule.endDate && rule.endDate !== oldRule.endDate) changes.push(`结束日期: ${oldRule.endDate} → ${rule.endDate}`);
          if (rule.description !== undefined && rule.description !== oldRule.description) changes.push(`说明变更`);
          get().addAuditLog(
            'room:minstay:update',
            id,
            room?.roomNumber,
            changes.length > 0
              ? `房间${room?.roomNumber || ''} 更新最短连住规则: ${changes.join('; ')}`
              : `房间${room?.roomNumber || ''} 更新最短连住规则 ${oldRule.minNights}晚 ${oldRule.startDate}~${oldRule.endDate}`
          );
        }
      },

      deleteMinStayRule: (id) => {
        if (!get().hasPermission('room:minstay:delete')) return;
        const targetRule = get().minStayRules.find((r) => r.id === id);
        set((state) => ({
          minStayRules: state.minStayRules.filter((r) => r.id !== id),
        }));
        if (targetRule) {
          const room = get().getRoomById(targetRule.roomId);
          get().addAuditLog(
            'room:minstay:delete',
            id,
            room?.roomNumber,
            `房间${room?.roomNumber || ''} 删除最短连住规则 ${targetRule.minNights}晚 ${targetRule.startDate}~${targetRule.endDate}`
          );
        }
      },

      getMinStayRulesByRoom: (roomId) => {
        return get().minStayRules.filter((r) => r.roomId === roomId);
      },

      getExtraServicesByStore: (storeId) => {
        const { extraServices } = get();
        if (storeId === 'all') return extraServices;
        return extraServices.filter((s) => s.storeId === storeId);
      },

      getExtraServiceById: (id) => {
        return get().extraServices.find((s) => s.id === id);
      },

      calculateExtraServicesPrice: (selected, nights, guests) => {
        const { getExtraServiceById } = get();
        let total = 0;
        selected.forEach((item) => {
          const service = getExtraServiceById(item.serviceId);
          if (!service) return;
          let multiplier = 1;
          switch (service.chargeType) {
            case 'per_night':
              multiplier = nights;
              break;
            case 'per_person_per_night':
              multiplier = nights * Math.min(item.quantity, guests);
              break;
            case 'per_stay':
            default:
              multiplier = 1;
              break;
          }
          total += service.price * multiplier * (service.chargeType === 'per_person_per_night' ? 1 : item.quantity);
        });
        return total;
      },

      addLongTermContract: (contract) => {
        if (!get().hasPermission('longterm:create')) return false;
        const { isRoomAvailable } = get();
        const now = new Date().toISOString();
        const months = contract.months || calculateMonths(contract.startDate, contract.endDate || contract.startDate);
        const endDate = contract.endDate || addMonthsStr(contract.startDate, months);
        const monthlyRent = contract.monthlyRent;
        const totalAmount = monthlyRent * months;

        if (!isRoomAvailable(contract.roomId, contract.startDate, endDate, undefined, undefined)) {
          return false;
        }

        const paymentRecords: PaymentRecord[] = [];
        for (let i = 0; i < months; i++) {
          paymentRecords.push({
            id: generateId(),
            contractId: '',
            period: getContractPeriodLabel(contract.startDate, i),
            monthIndex: i,
            dueDate: getMonthDueDate(contract.startDate, i),
            amount: monthlyRent,
            paidAmount: 0,
            status: 'pending',
            createdAt: now,
            updatedAt: now,
          });
        }

        const newContract: LongTermContract = {
          ...contract,
          id: generateId(),
          guestPhone: normalizePhone(contract.guestPhone),
          startDate: contract.startDate,
          endDate,
          months,
          monthlyRent,
          totalAmount,
          paidAmount: 0,
          status: 'active',
          paymentRecords,
          renewCount: 0,
          createdAt: now,
          updatedAt: now,
        };

        newContract.paymentRecords.forEach((pr) => {
          pr.contractId = newContract.id;
        });

        set((state) => ({ longTermContracts: [...state.longTermContracts, newContract] }));
        const room = get().getRoomById(contract.roomId);
        get().addAuditLog(
          'longterm:create',
          newContract.id,
          contract.guestName,
          `创建长租合同: ${contract.guestName}(${contract.guestPhone}) 房间${room?.roomNumber || ''} ${contract.startDate}~${endDate} ${months}个月 月租¥${monthlyRent} 总额¥${totalAmount}`
        );
        return true;
      },

      updateLongTermContract: (id, contractUpdate) => {
        if (!get().hasPermission('longterm:update')) return false;
        const existing = get().longTermContracts.find((c) => c.id === id);
        if (!existing) return false;

        const now = new Date().toISOString();
        const updateData: Partial<LongTermContract> = { ...contractUpdate };
        if (updateData.guestPhone !== undefined) {
          updateData.guestPhone = normalizePhone(updateData.guestPhone);
        }
        if (updateData.startDate && !updateData.endDate && !updateData.months) {
          updateData.months = calculateMonths(updateData.startDate, existing.endDate);
        }
        if (updateData.months && !updateData.endDate) {
          updateData.endDate = addMonthsStr(updateData.startDate || existing.startDate, updateData.months);
        }

        const newStartDate = updateData.startDate || existing.startDate;
        const newMonths = updateData.months || existing.months;
        const newEndDate = updateData.endDate || existing.endDate;
        const newMonthlyRent = updateData.monthlyRent ?? existing.monthlyRent;

        const needRecalcPayments =
          updateData.startDate !== undefined ||
          updateData.months !== undefined ||
          updateData.monthlyRent !== undefined;

        let newPaymentRecords = existing.paymentRecords;
        let newPaidAmount = existing.paidAmount;
        let newTotalAmount = newMonthlyRent * newMonths;

        if (needRecalcPayments) {
          const allPaidRecords = existing.paymentRecords.filter((p) => p.paidAmount > 0);
          newPaymentRecords = [];
          for (let i = 0; i < newMonths; i++) {
            const matchingPaid = allPaidRecords.find((p) => p.monthIndex === i);
            if (matchingPaid) {
              newPaymentRecords.push({
                ...matchingPaid,
                amount: newMonthlyRent,
                period: getContractPeriodLabel(newStartDate, i),
                dueDate: getMonthDueDate(newStartDate, i),
                updatedAt: now,
              });
            } else {
              newPaymentRecords.push({
                id: generateId(),
                contractId: id,
                period: getContractPeriodLabel(newStartDate, i),
                monthIndex: i,
                dueDate: getMonthDueDate(newStartDate, i),
                amount: newMonthlyRent,
                paidAmount: 0,
                status: 'pending',
                createdAt: now,
                updatedAt: now,
              });
            }
          }
          const extraPaid = allPaidRecords.filter((p) => p.monthIndex >= newMonths);
          if (extraPaid.length > 0) {
            extraPaid.forEach((p) => {
              newPaymentRecords.push({
                ...p,
                updatedAt: now,
              });
            });
          }
          newPaidAmount = newPaymentRecords.reduce((sum, p) => sum + p.paidAmount, 0);
        }

        updateData.endDate = newEndDate;
        updateData.months = newMonths;
        updateData.monthlyRent = newMonthlyRent;
        updateData.totalAmount = newTotalAmount;
        updateData.paidAmount = newPaidAmount;

        set((s) => ({
          longTermContracts: s.longTermContracts.map((c) =>
            c.id === id
              ? {
                  ...c,
                  ...updateData,
                  paymentRecords: needRecalcPayments ? newPaymentRecords : c.paymentRecords,
                  updatedAt: now,
                }
              : c
          ),
        }));
        const changes: string[] = [];
        if (contractUpdate.guestName && contractUpdate.guestName !== existing.guestName) changes.push('客人姓名变更');
        if (contractUpdate.startDate || contractUpdate.endDate) changes.push('日期变更');
        if (contractUpdate.monthlyRent !== undefined && contractUpdate.monthlyRent !== existing.monthlyRent) changes.push(`月租: ¥${existing.monthlyRent} → ¥${contractUpdate.monthlyRent}`);
        if (contractUpdate.deposit !== undefined && contractUpdate.deposit !== existing.deposit) changes.push('押金变更');
        get().addAuditLog(
          'longterm:update',
          id,
          existing.guestName,
          changes.length > 0
            ? `更新长租合同: ${existing.guestName} ${changes.join('; ')}`
            : `更新长租合同: ${existing.guestName}`
        );
        return true;
      },

      cancelLongTermContract: (id, reason) => {
        if (!get().hasPermission('longterm:cancel')) return;
        const now = new Date().toISOString();
        const existing = get().getLongTermContractById(id);
        set((state) => ({
          longTermContracts: state.longTermContracts.map((c) =>
            c.id === id
              ? { ...c, status: 'cancelled', cancelReason: reason, updatedAt: now }
              : c
          ),
        }));
        if (existing) {
          const room = get().getRoomById(existing.roomId);
          get().addAuditLog(
            'longterm:cancel',
            id,
            existing.guestName,
            `取消长租合同: ${existing.guestName} 房间${room?.roomNumber || ''} 原因: ${reason}`
          );
        }
      },

      renewLongTermContract: (id, renewMonths, newMonthlyRent) => {
        if (!get().hasPermission('longterm:renew')) return null;
        const existing = get().longTermContracts.find((c) => c.id === id);
        if (!existing) return null;
        const now = new Date().toISOString();
        const monthlyRent = newMonthlyRent || existing.monthlyRent;
        const startDate = existing.endDate;
        const endDate = addMonthsStr(startDate, renewMonths);
        const totalAmount = monthlyRent * renewMonths;
        const paymentRecords: PaymentRecord[] = [];
        for (let i = 0; i < renewMonths; i++) {
          paymentRecords.push({
            id: generateId(),
            contractId: '',
            period: getContractPeriodLabel(startDate, i),
            monthIndex: i,
            dueDate: getMonthDueDate(startDate, i),
            amount: monthlyRent,
            paidAmount: 0,
            status: 'pending',
            createdAt: now,
            updatedAt: now,
          });
        }
        const newContract: LongTermContract = {
          id: generateId(),
          roomId: existing.roomId,
          guestName: existing.guestName,
          guestPhone: existing.guestPhone,
          guestIdCard: existing.guestIdCard,
          startDate,
          endDate,
          months: renewMonths,
          monthlyRent,
          deposit: existing.deposit,
          totalAmount,
          paidAmount: 0,
          status: 'active',
          paymentRecords,
          renewCount: existing.renewCount + 1,
          originalContractId: existing.id,
          notes: existing.notes,
          createdAt: now,
          updatedAt: now,
        };
        newContract.paymentRecords.forEach((pr) => {
          pr.contractId = newContract.id;
        });
        set((state) => ({
          longTermContracts: [
            ...state.longTermContracts.map((c) =>
              c.id === id ? { ...c, status: 'renewed' as const, updatedAt: now } : c),
            newContract,
          ],
        }));
        const room = get().getRoomById(existing.roomId);
        get().addAuditLog(
          'longterm:renew',
          newContract.id,
          existing.guestName,
          `续签长租合同: ${existing.guestName} 房间${room?.roomNumber || ''} ${startDate}~${endDate} ${renewMonths}个月 月租¥${monthlyRent}`
        );
        return newContract;
      },

      getLongTermContractById: (id) => {
        return get().longTermContracts.find((c) => c.id === id);
      },

      getLongTermContractsByStore: (storeId) => {
        const { longTermContracts, getRoomsByStore } = get();
        const rooms = getRoomsByStore(storeId);
        const roomIds = new Set(rooms.map((r) => r.id));
        return longTermContracts.filter((c) => roomIds.has(c.roomId));
      },

      getLongTermContractsByRoom: (roomId) => {
        return get().longTermContracts.filter((c) => c.roomId === roomId);
      },

      getActiveLongTermContractsByDate: (date, storeId = 'all') => {
        const { getLongTermContractsByStore } = get();
        const contracts = getLongTermContractsByStore(storeId);
        return contracts.filter(
          (c) =>
            (c.status === 'active' || c.status === 'expiring' || c.status === 'renewed') &&
            isDateOverlap(c.startDate, c.endDate, date, date)
        );
      },

      isRoomOccupiedByLongTerm: (roomId, checkIn, checkOut, excludeContractId) => {
        const { longTermContracts } = get();
        return longTermContracts.some(
          (c) =>
            c.id !== excludeContractId &&
            c.roomId === roomId &&
            (c.status === 'active' || c.status === 'expiring' || c.status === 'renewed') &&
            isDateOverlap(checkIn, checkOut, c.startDate, c.endDate)
        );
      },

      updatePaymentRecord: (contractId, paymentId, paidAmount, paymentMethod, notes) => {
        if (!get().hasPermission('longterm:update')) return false;
        const state = get();
        const contract = state.longTermContracts.find((c) => c.id === contractId);
        if (!contract) return false;
        const payment = contract.paymentRecords.find((p) => p.id === paymentId);
        if (!payment) return false;
        const now = new Date().toISOString();
        let newStatus: PaymentStatus = 'pending';
        if (paidAmount >= payment.amount) {
          newStatus = 'paid';
        } else if (paidAmount > 0) {
          newStatus = 'partial';
        } else {
          const today = todayStr();
          if (payment.dueDate < today) {
            newStatus = 'overdue';
          }
        }
        const newPaidAmount = contract.paidAmount - payment.paidAmount + paidAmount;
        set((s) => ({
          longTermContracts: s.longTermContracts.map((c) => {
            if (c.id !== contractId) return c;
            return {
              ...c,
              paidAmount: newPaidAmount,
              updatedAt: now,
              paymentRecords: c.paymentRecords.map((p) =>
                p.id === paymentId
                  ? {
                      ...p,
                      paidAmount,
                      status: newStatus,
                      paidAt: now,
                      paymentMethod,
                      notes,
                      updatedAt: now,
                    }
                  : p
              ),
            };
          }),
        }));
        const room = get().getRoomById(contract.roomId);
        get().addAuditLog(
          'longterm:payment',
          contractId,
          contract.guestName,
          `长租租金支付: ${contract.guestName} 房间${room?.roomNumber || ''} ${payment.period} ¥${paidAmount}/${payment.amount} 方式:${paymentMethod || '未指定'}`
        );
        return true;
      },

      getContractExpiryInfo: (contractId) => {
        const contract = get().getLongTermContractById(contractId);
        if (!contract) return null;
        const today = parseISO(todayStr());
        const end = parseISO(contract.endDate);
        const daysRemaining = differenceInCalendarDays(end, today);
        let alertLevel: ExpiryAlertLevel = 'none';
        let message = '';
        if (contract.status === 'cancelled' || contract.status === 'expired') {
          return { contractId, daysRemaining, alertLevel: 'none', message: '合同已结束' };
        }
        if (daysRemaining <= 0) {
          alertLevel = 'urgent';
          message = '合同已到期';
        } else if (daysRemaining <= 7) {
          alertLevel = 'urgent';
          message = `还有${daysRemaining}天到期`;
        } else if (daysRemaining <= 30) {
          alertLevel = 'remind';
          message = `还有${daysRemaining}天到期，建议提醒续签`;
        } else {
          message = `还有${daysRemaining}天到期`;
        }
        return { contractId, daysRemaining, alertLevel, message };
      },

      getExpiringContracts: (daysThreshold = 30, storeId = 'all') => {
        const { getLongTermContractsByStore, getContractExpiryInfo } = get();
        const contracts = getLongTermContractsByStore(storeId);
        const today = todayStr();
        return contracts
          .filter((c) => {
            const expiry = getContractExpiryInfo(c.id);
            return (
              (c.status === 'active' || c.status === 'expiring' || c.status === 'renewed') &&
              expiry &&
              expiry.alertLevel !== 'none' &&
              c.endDate >= today &&
              (expiry.alertLevel === 'urgent' || expiry.daysRemaining <= daysThreshold)
            )
          })
          .sort((a, b) => {
            const ea = getContractExpiryInfo(a.id);
            const eb = getContractExpiryInfo(b.id);
            return (ea?.daysRemaining ?? 0) - (eb?.daysRemaining ?? 0);
          });
      },

      getOverduePayments: (storeId = 'all') => {
        const { getLongTermContractsByStore } = get();
        const contracts = getLongTermContractsByStore(storeId);
        const today = todayStr();
        const overdue: PaymentRecord[] = [];
        contracts.forEach((c) => {
          c.paymentRecords.forEach((p) => {
            if (p.status === 'overdue' || (p.status === 'pending' && p.dueDate < today)) {
              overdue.push(p);
            }
          });
        });
        return overdue.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      },

      updateLongTermContractStatuses: () => {
        const { longTermContracts, getContractExpiryInfo } = get();
        const today = todayStr();
        let changed = false;
        const updated = longTermContracts.map((c) => {
          if (c.status === 'cancelled' || c.status === 'renewed') return c;
          const expiry = getContractExpiryInfo(c.id);
          let newStatus: LongTermContractStatus = c.status;
          if (c.endDate < today && c.status !== 'expired') {
            newStatus = 'expired';
          } else if (expiry && expiry.alertLevel === 'urgent' && expiry.daysRemaining > 0 && c.status === 'active') {
            newStatus = 'expiring';
          } else if (expiry && expiry.alertLevel === 'none' && expiry.daysRemaining > 30 && c.status === 'expiring') {
            newStatus = 'active';
          }
          if (newStatus !== c.status) {
            changed = true;
            return { ...c, status: newStatus, updatedAt: new Date().toISOString() };
          }
          return c;
        });
        if (changed) {
          set({ longTermContracts: updated });
        }
      },

      updatePaymentRecordStatuses: () => {
        const { longTermContracts } = get();
        const today = todayStr();
        let changed = false;
        const updated = longTermContracts.map((c) => {
          if (c.status === 'cancelled') return c;
          let contractChanged = false;
          const newRecords = c.paymentRecords.map((p) => {
            if (p.status === 'pending' && p.dueDate < today) {
              contractChanged = true;
              return { ...p, status: 'overdue' as const, updatedAt: new Date().toISOString() };
            }
            return p;
          });
          if (contractChanged) {
            changed = true;
            return { ...c, paymentRecords: newRecords, updatedAt: new Date().toISOString() };
          }
          return c;
        });
        if (changed) {
          set({ longTermContracts: updated });
        }
      },
    }),
    {
      name: 'homestay-management-storage',
    }
  )
);
