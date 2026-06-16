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
} from '@/types';
import { normalizePhone } from '@/types';
import { generateId, isDateOverlap, todayStr, isSameDayStr, getDaysInRange, getMonthsInRange, getMonthKey, calculateNights, getDaysArray, startOfMonthStr, endOfMonthStr, formatDate } from '@/utils/date';
import { differenceInDays, parseISO } from 'date-fns';
import { getInitialStores, getInitialRooms, getInitialBookings } from '@/utils/mockData';

type StoreIdFilter = string | 'all';

interface AppState {
  stores: Store[];
  rooms: Room[];
  bookings: Booking[];
  cleaningTasks: CleaningTask[];
  initialized: boolean;

  initializeData: () => void;

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
        set({
          stores: initialStores,
          rooms: initialRooms,
          bookings: initialBookings,
          initialized: true,
        });
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
      },

      updateStore: (id, store) => {
        const now = new Date().toISOString();
        set((state) => ({
          stores: state.stores.map((s) =>
            s.id === id ? { ...s, ...store, updatedAt: now } : s
          ),
        }));
      },

      deleteStore: (id) => {
        const { rooms } = get();
        const hasRooms = rooms.some((r) => r.storeId === id);
        if (hasRooms) return false;

        set((state) => ({
          stores: state.stores.filter((s) => s.id !== id),
        }));
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
      },

      updateRoom: (id, room) => {
        const now = new Date().toISOString();
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === id ? { ...r, ...room, updatedAt: now } : r
          ),
        }));
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

        set((state) => ({
          rooms: state.rooms.filter((r) => r.id !== id),
        }));
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
        return true;
      },

      cancelBooking: (id, reason) => {
        const now = new Date().toISOString();
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === id
              ? { ...b, status: 'cancelled', cancelReason: reason, updatedAt: now }
              : b
          ),
        }));
      },

      updateBookingStatus: (id, status) => {
        const now = new Date().toISOString();
        const booking = get().bookings.find((b) => b.id === id);
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === id ? { ...b, status, updatedAt: now } : b
          ),
        }));

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
        const { bookings } = get();
        const room = get().rooms.find((r) => r.id === roomId);
        if (!room || room.status !== 'active') return false;

        return !bookings.some(
          (b) =>
            b.id !== excludeBookingId &&
            b.roomId === roomId &&
            b.status !== 'cancelled' &&
            isDateOverlap(checkIn, checkOut, b.checkIn, b.checkOut)
        );
      },

      getAvailableRooms: (checkIn, checkOut, storeId = 'all') => {
        const { getRoomsByStore, isRoomAvailable } = get();
        const rooms = getRoomsByStore(storeId);
        return rooms.filter(
          (r) => r.status === 'active' && isRoomAvailable(r.id, checkIn, checkOut)
        );
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
        set((state) => ({
          cleaningTasks: state.cleaningTasks.map((t) =>
            t.id === id ? { ...t, ...task, updatedAt: now } : t
          ),
        }));
      },

      updateCleaningTaskStatus: (id, status) => {
        const now = new Date().toISOString();
        const completedAt = status === 'completed' ? now : undefined;
        set((state) => ({
          cleaningTasks: state.cleaningTasks.map((t) =>
            t.id === id ? { ...t, status, updatedAt: now, completedAt } : t
          ),
        }));
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
    }),
    {
      name: 'homestay-management-storage',
    }
  )
);
