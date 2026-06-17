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
} from '@/types';
import { normalizePhone, RolePermissions } from '@/types';
import { generateId, isDateOverlap, todayStr, isSameDayStr, getDaysInRange, getMonthsInRange, getMonthKey, calculateNights, getDaysArray, startOfMonthStr, endOfMonthStr, formatDate } from '@/utils/date';
import { differenceInDays, parseISO } from 'date-fns';
import { getInitialStores, getInitialRooms, getInitialBookings, getInitialClosedDates, getInitialMinStayRules } from '@/utils/mockData';

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
    excludeBookingId?: string
  ) => boolean;
  getAvailableRooms: (checkIn: string, checkOut: string, storeId?: StoreIdFilter) => Room[];
  getMinStayForRoom: (roomId: string, checkIn: string, checkOut: string) => number;
  checkMinStayCompliance: (roomId: string, checkIn: string, checkOut: string) => boolean;

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
      users: defaultUsers,
      currentUser: defaultUsers[0],
      auditLogs: [],
      initialized: false,

      initializeData: () => {
        const { initialized, rooms, bookings } = get();
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
          return;
        }

        const initialStores = getInitialStores();
        const initialRooms = getInitialRooms(initialStores);
        const initialBookings = getInitialBookings(initialRooms);
        const initialClosedDates = getInitialClosedDates(initialRooms);
        const initialMinStayRules = getInitialMinStayRules(initialRooms);
        set({
          stores: initialStores,
          rooms: initialRooms,
          bookings: initialBookings,
          closedDates: initialClosedDates,
          minStayRules: initialMinStayRules,
          initialized: true,
        });
      },

      switchUser: (userId) => {
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
        }
      },

      updateBookingStatus: (id, status) => {
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

      isRoomAvailable: (roomId, checkIn, checkOut, excludeBookingId) => {
        const { bookings, closedDates } = get();
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
        const now = new Date().toISOString();
        const newClosedDate: ClosedDate = {
          ...closedDate,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ closedDates: [...state.closedDates, newClosedDate] }));
      },

      updateClosedDate: (id, closedDate) => {
        const now = new Date().toISOString();
        set((state) => ({
          closedDates: state.closedDates.map((cd) =>
            cd.id === id ? { ...cd, ...closedDate, updatedAt: now } : cd
          ),
        }));
      },

      deleteClosedDate: (id) => {
        set((state) => ({
          closedDates: state.closedDates.filter((cd) => cd.id !== id),
        }));
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
        const now = new Date().toISOString();
        const newRule: MinStayRule = {
          ...rule,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ minStayRules: [...state.minStayRules, newRule] }));
      },

      updateMinStayRule: (id, rule) => {
        const now = new Date().toISOString();
        set((state) => ({
          minStayRules: state.minStayRules.map((r) =>
            r.id === id ? { ...r, ...rule, updatedAt: now } : r
          ),
        }));
      },

      deleteMinStayRule: (id) => {
        set((state) => ({
          minStayRules: state.minStayRules.filter((r) => r.id !== id),
        }));
      },

      getMinStayRulesByRoom: (roomId) => {
        return get().minStayRules.filter((r) => r.roomId === roomId);
      },
    }),
    {
      name: 'homestay-management-storage',
    }
  )
);
