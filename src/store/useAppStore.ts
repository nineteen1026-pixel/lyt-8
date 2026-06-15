import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Room,
  Booking,
  BookingStatus,
  RoomStatus,
  DailyReportItem,
  MonthlyReportItem,
} from '@/types';
import {
  generateId,
  isDateOverlap,
  todayStr,
  isSameDayStr,
  getDaysInRange,
  getMonthsInRange,
  getMonthKey,
  calculateNights,
  getDaysArray,
  startOfMonthStr,
  endOfMonthStr,
} from '@/utils/date';
import { getInitialRooms, getInitialBookings } from '@/utils/mockData';

interface AppState {
  rooms: Room[];
  bookings: Booking[];
  initialized: boolean;

  initializeData: () => void;

  addRoom: (room: Omit<Room, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRoom: (id: string, room: Partial<Room>) => void;
  deleteRoom: (id: string) => boolean;
  getRoomById: (id: string) => Room | undefined;

  addBooking: (booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) => boolean;
  updateBooking: (id: string, booking: Partial<Booking>) => boolean;
  cancelBooking: (id: string, reason: string) => void;
  updateBookingStatus: (id: string, status: BookingStatus) => void;
  getBookingById: (id: string) => Booking | undefined;

  getBookingsByRoom: (roomId: string) => Booking[];
  getBookingsByDate: (date: string) => Booking[];
  getActiveBookingsByDate: (date: string) => Booking[];

  isRoomAvailable: (
    roomId: string,
    checkIn: string,
    checkOut: string,
    excludeBookingId?: string
  ) => boolean;
  getAvailableRooms: (checkIn: string, checkOut: string) => Room[];

  getTodayStats: () => {
    totalRooms: number;
    occupiedToday: number;
    availableToday: number;
    checkInToday: number;
    checkOutToday: number;
  };

  getDailyReport: (startDate: string, endDate: string) => DailyReportItem[];
  getMonthlyReport: (startMonth: string, endMonth: string) => MonthlyReportItem[];
  getRevenueStats: () => {
    todayRevenue: number;
    monthRevenue: number;
    lastMonthRevenue: number;
    monthOccupancyRate: number;
    lastMonthOccupancyRate: number;
    totalBookings: number;
    monthBookings: number;
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      rooms: [],
      bookings: [],
      initialized: false,

      initializeData: () => {
        const { initialized, rooms, bookings } = get();
        if (initialized && rooms.length > 0) return;

        const initialRooms = getInitialRooms();
        const initialBookings = getInitialBookings(initialRooms);
        set({
          rooms: initialRooms,
          bookings: initialBookings,
          initialized: true,
        });
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

      addBooking: (booking) => {
        const { isRoomAvailable } = get();
        if (!isRoomAvailable(booking.roomId, booking.checkIn, booking.checkOut)) {
          return false;
        }

        const now = new Date().toISOString();
        const newBooking: Booking = {
          ...booking,
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
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === id ? { ...b, ...booking, updatedAt: now } : b
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
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === id ? { ...b, status, updatedAt: now } : b
          ),
        }));
      },

      getBookingById: (id) => {
        return get().bookings.find((b) => b.id === id);
      },

      getBookingsByRoom: (roomId) => {
        return get().bookings.filter((b) => b.roomId === roomId);
      },

      getBookingsByDate: (date) => {
        return get().bookings.filter(
          (b) =>
            b.status !== 'cancelled' &&
            isDateOverlap(b.checkIn, b.checkOut, date, date)
        );
      },

      getActiveBookingsByDate: (date) => {
        return get().bookings.filter(
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

      getAvailableRooms: (checkIn, checkOut) => {
        const { rooms, isRoomAvailable } = get();
        return rooms.filter(
          (r) => r.status === 'active' && isRoomAvailable(r.id, checkIn, checkOut)
        );
      },

      getTodayStats: () => {
        const { rooms, bookings } = get();
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

      getDailyReport: (startDate, endDate) => {
        const { rooms, bookings } = get();
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
            bookings: checkIns,
          };
        });
      },

      getMonthlyReport: (startMonth, endMonth) => {
        const { rooms, bookings } = get();
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

      getRevenueStats: () => {
        const { getDailyReport, getMonthlyReport, bookings } = get();
        const today = todayStr();
        const thisMonth = getMonthKey(today);
        const lastMonthDate = new Date();
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        const lastMonth = getMonthKey(lastMonthDate);

        const dailyReport = getDailyReport(today, today);
        const todayRevenue = dailyReport[0]?.revenue || 0;

        const monthlyReport = getMonthlyReport(thisMonth, thisMonth);
        const monthRevenue = monthlyReport[0]?.revenue || 0;
        const monthOccupancyRate = monthlyReport[0]?.avgOccupancyRate || 0;
        const monthBookings = monthlyReport[0]?.totalBookings || 0;

        const lastMonthReport = getMonthlyReport(lastMonth, lastMonth);
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
    }),
    {
      name: 'homestay-management-storage',
    }
  )
);
