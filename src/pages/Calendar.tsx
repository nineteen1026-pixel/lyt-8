import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, BedDouble } from 'lucide-react';
import { format, getMonth, getYear, isSameDay, isToday } from 'date-fns';
import { useAppStore } from '@/store/useAppStore';
import { getMonthMatrix, getWeekDays, formatMonth, todayStr, formatDateDisplay, calculateNights } from '@/utils/date';
import type { Booking } from '@/types';
import { BookingStatusColors, BookingStatusLabels, RoomTypeLabels } from '@/types';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';
import BookingForm from './BookingForm';

export default function CalendarView() {
  const { rooms, bookings, getActiveBookingsByDate, getRoomById, addBooking, updateBooking } = useAppStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [bookingFormOpen, setBookingFormOpen] = useState(false);
  const [prefillRoomId, setPrefillRoomId] = useState<string | undefined>();
  const [prefillCheckIn, setPrefillCheckIn] = useState<string | undefined>();

  const activeRooms = rooms.filter((r) => r.status === 'active');
  const year = getYear(currentDate);
  const month = getMonth(currentDate);
  const weeks = useMemo(() => getMonthMatrix(year, month), [year, month]);
  const weekDays = getWeekDays();

  const today = todayStr();

  const getDayBookings = (date: Date): Booking[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return getActiveBookingsByDate(dateStr);
  };

  const getDayStatus = (date: Date) => {
    const dateBookings = getDayBookings(date);
    const occupied = dateBookings.length;
    const total = activeRooms.length;
    if (total === 0) return { ratio: 0, label: '无数据' };
    const ratio = occupied / total;
    if (ratio === 0) return { ratio, label: '全部空闲' };
    if (ratio >= 1) return { ratio, label: '全部满房' };
    return { ratio, label: `已订${occupied}/${total}` };
  };

  const getDayColorClass = (date: Date) => {
    const isCurrentMonth = getMonth(date) === month;
    const { ratio } = getDayStatus(date);

    if (!isCurrentMonth) {
      return 'bg-white/30 text-gray-300';
    }
    if (ratio === 0) return 'bg-white hover:bg-brand-sage/30';
    if (ratio < 0.5) return 'bg-brand-sage/40 hover:bg-brand-sage/60';
    if (ratio < 1) return 'bg-brand-orange/30 hover:bg-brand-orange/40';
    return 'bg-brand-orange/60 hover:bg-brand-orange/70 text-white';
  };

  const handlePrevMonth = () => {
    setCurrentDate((d) => {
      const nd = new Date(d);
      nd.setMonth(nd.getMonth() - 1);
      return nd;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate((d) => {
      const nd = new Date(d);
      nd.setMonth(nd.getMonth() + 1);
      return nd;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
  };

  const handleNewBookingFromDate = (roomId?: string) => {
    if (selectedDate) {
      setPrefillRoomId(roomId);
      setPrefillCheckIn(selectedDate);
      setBookingFormOpen(true);
    }
  };

  const handleBookingSubmit = (
    data: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>,
    isEdit: boolean
  ): boolean => {
    if (isEdit) {
      return false;
    }
    return addBooking(data);
  };

  const selectedDateBookings = selectedDate ? getActiveBookingsByDate(selectedDate) : [];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-brown">日历视图</h1>
          <p className="text-brand-taupe mt-1">按月查看所有房间的占用情况</p>
        </div>
        <button
          onClick={() => {
            setPrefillRoomId(undefined);
            setPrefillCheckIn(undefined);
            setBookingFormOpen(true);
          }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          新增预订
        </button>
      </div>

      <div className="card-base p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-lg hover:bg-brand-beige text-brand-taupe hover:text-brand-brown transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="font-display text-xl font-semibold text-brand-brown min-w-[140px] text-center">
              {formatMonth(currentDate)}
            </h2>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-lg hover:bg-brand-beige text-brand-taupe hover:text-brand-brown transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-sm text-brand-taupe">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-white border border-brand-brown/20" />
                空闲
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-brand-sage/60" />
                部分预订
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-brand-orange/60" />
                满房
              </span>
            </div>
            <button onClick={handleToday} className="btn-secondary">
              今天
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((d) => (
            <div
              key={d}
              className="text-center text-sm font-medium text-brand-taupe py-2"
            >
              周{d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weeks.map((week, wi) =>
            week.map((date, di) => {
              const isCurrentMonth = getMonth(date) === month;
              const dateStr = format(date, 'yyyy-MM-dd');
              const dayStatus = getDayStatus(date);
              const isSelected = selectedDate === dateStr;
              const isTodayCell = isToday(date);

              return (
                <button
                  key={`${wi}-${di}`}
                  onClick={() => handleDateClick(date)}
                  className={`relative aspect-square min-h-[90px] p-2 rounded-xl text-left transition-all duration-200 ${getDayColorClass(
                    date
                  )} ${isSelected ? 'ring-2 ring-brand-brown ring-offset-2' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-sm font-medium ${
                        isTodayCell ? 'w-7 h-7 rounded-full bg-brand-brown text-white flex items-center justify-center' : ''
                      }`}
                    >
                      {format(date, 'd')}
                    </span>
                    {isCurrentMonth && (
                      <span
                        className={`text-xs ${
                          dayStatus.ratio >= 1 ? 'text-white/90' : 'text-brand-taupe'
                        }`}
                      >
                        {dayStatus.ratio > 0 && dayStatus.ratio < 1
                          ? `${Math.round(dayStatus.ratio * 100)}%`
                          : dayStatus.ratio >= 1
                          ? '满'
                          : ''}
                      </span>
                    )}
                  </div>
                  {isCurrentMonth && getDayBookings(date).length > 0 && (
                    <div className="space-y-1 mt-1">
                      {getDayBookings(date)
                        .slice(0, 2)
                        .map((b) => {
                          const room = getRoomById(b.roomId);
                          return (
                            <div
                              key={b.id}
                              className={`text-xs px-1.5 py-0.5 rounded truncate ${
                                dayStatus.ratio >= 1
                                  ? 'bg-white/20 text-white'
                                  : 'bg-brand-beige text-brand-brown'
                              }`}
                            >
                              {room?.roomNumber} {b.guestName}
                            </div>
                          );
                        })}
                      {getDayBookings(date).length > 2 && (
                        <div
                          className={`text-xs ${
                            dayStatus.ratio >= 1 ? 'text-white/80' : 'text-brand-taupe'
                          }`}
                        >
                          +{getDayBookings(date).length - 2} 更多
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      <Modal
        open={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        title={selectedDate ? formatDateDisplay(selectedDate) : ''}
        size="xl"
      >
        {selectedDate && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-brand-taupe">
                  共 {activeRooms.length} 间房，已预订 {selectedDateBookings.length} 间
                </p>
              </div>
              <button onClick={() => handleNewBookingFromDate()} className="btn-primary">
                <Plus className="w-4 h-4" />
                新增预订
              </button>
            </div>

            {activeRooms.length === 0 ? (
              <div className="text-center py-12">
                <BedDouble className="w-16 h-16 mx-auto text-brand-brown/30 mb-4" />
                <p className="text-brand-taupe">请先添加房间</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {activeRooms.map((room) => {
                  const roomBooking = selectedDateBookings.find((b) => b.roomId === room.id);
                  const isAvailable = !roomBooking;

                  return (
                    <div
                      key={room.id}
                      className={`p-4 rounded-xl border transition-colors ${
                        isAvailable
                          ? 'bg-brand-sage/10 border-brand-green/20'
                          : 'bg-brand-orange/5 border-brand-orange/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                            <span className="font-display text-lg font-bold text-brand-brown">
                              {room.roomNumber}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-brand-brown">{room.name}</div>
                            <div className="text-xs text-brand-taupe">
                              {RoomTypeLabels[room.type]} · ¥{room.price}/晚
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isAvailable ? (
                            <>
                              <Badge variant="green">空闲</Badge>
                              <button
                                onClick={() => handleNewBookingFromDate(room.id)}
                                className="btn-primary !py-1.5 !px-3 text-xs"
                              >
                                预订
                              </button>
                            </>
                          ) : (
                            roomBooking && (
                              <div className="text-right">
                                <div className="font-medium text-brand-brown text-sm">
                                  {roomBooking.guestName}
                                </div>
                                <div className="text-xs text-brand-taupe">
                                  {formatDateDisplay(roomBooking.checkIn)} →{' '}
                                  {formatDateDisplay(roomBooking.checkOut)} (
                                  {calculateNights(roomBooking.checkIn, roomBooking.checkOut)}晚)
                                </div>
                                <span
                                  className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${BookingStatusColors[roomBooking.status]}`}
                                >
                                  {BookingStatusLabels[roomBooking.status]}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>

      <BookingForm
        open={bookingFormOpen}
        onClose={() => setBookingFormOpen(false)}
        onSubmit={handleBookingSubmit}
        prefillRoomId={prefillRoomId}
        prefillCheckIn={prefillCheckIn}
      />
    </div>
  );
}
