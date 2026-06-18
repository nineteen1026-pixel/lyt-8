import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, BedDouble, Building2, Filter, Ban, LogIn, LogOut, FileSignature, AlertTriangle, Clock } from 'lucide-react';
import { format, getMonth, getYear, isToday, parseISO } from 'date-fns';
import { useAppStore } from '@/store/useAppStore';
import { getMonthMatrix, getWeekDays, formatMonth, formatDateDisplay, calculateNights } from '@/utils/date';
import type { Booking, ClosedDate, LongTermContract } from '@/types';
import { BookingStatusColors, BookingStatusLabels, RoomTypeLabels, RoomStatusLabels, ClosedDateReasonLabels, ClosedDateReasonColors, LongTermContractStatusLabels, LongTermContractStatusColors } from '@/types';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';
import BookingForm from './BookingForm';
import CheckOutInspectionModal from '@/components/CheckOutInspectionModal';

export default function CalendarView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    stores,
    getRoomsByStore,
    getActiveBookingsByDate,
    getRoomById,
    addBooking,
    updateBookingStatus,
    getStoreById,
    getClosedDatesByDate,
    getClosedDatesByRoom,
    getActiveLongTermContractsByDate,
    getContractExpiryInfo,
    longTermContracts,
  } = useAppStore();
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [bookingFormOpen, setBookingFormOpen] = useState(false);
  const [prefillRoomId, setPrefillRoomId] = useState<string | undefined>();
  const [prefillCheckIn, setPrefillCheckIn] = useState<string | undefined>();
  const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
  const [checkOutBooking, setCheckOutBooking] = useState<Booking | null>(null);

  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      try {
        const date = parseISO(dateParam);
        if (!isNaN(date.getTime())) {
          setCurrentDate(date);
          setSelectedDate(dateParam);
        }
      } catch {
        // ignore invalid date
      }
    }
  }, [searchParams]);

  const handleDateClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
    setSearchParams({ date: dateStr });
  };

  const handleCloseModal = () => {
    setSelectedDate(null);
    setSearchParams({});
  };

  const handleCheckOutClick = (booking: Booking) => {
    setCheckOutBooking(booking);
    setCheckOutModalOpen(true);
  };

  const handleCheckOutComplete = () => {
    if (checkOutBooking) {
      updateBookingStatus(checkOutBooking.id, 'checked-out');
    }
    setCheckOutModalOpen(false);
    setCheckOutBooking(null);
  };

  const activeRooms = useMemo(() => getRoomsByStore(storeFilter).filter((r) => r.status === 'active'), [storeFilter, getRoomsByStore]);
  const maintenanceRooms = useMemo(() => getRoomsByStore(storeFilter).filter((r) => r.status === 'maintenance'), [storeFilter, getRoomsByStore]);
  const year = getYear(currentDate);
  const month = getMonth(currentDate);
  const weeks = useMemo(() => getMonthMatrix(year, month), [year, month]);
  const weekDays = getWeekDays();

  const getDayBookings = (date: Date): Booking[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return getActiveBookingsByDate(dateStr, storeFilter);
  };

  const getDayClosedDates = (date: Date): ClosedDate[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return getClosedDatesByDate(dateStr, storeFilter);
  };

  const getDayLongTermContracts = (date: Date): LongTermContract[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return getActiveLongTermContractsByDate(dateStr, storeFilter);
  };

  const getDayStatus = (date: Date) => {
    const dateBookings = getDayBookings(date);
    const closedDates = getDayClosedDates(date);
    const longTerms = getDayLongTermContracts(date);
    const occupied = dateBookings.length + longTerms.length;
    const closedRooms = closedDates.length;
    const longTermCount = longTerms.length;
    const total = activeRooms.length;
    if (total === 0) return { ratio: 0, closedRatio: 0, longTermRatio: 0, label: '无数据' };
    const ratio = occupied / total;
    const closedRatio = closedRooms / total;
    const longTermRatio = longTermCount / total;
    if (closedRatio > 0 && ratio === 0) return { ratio, closedRatio, longTermRatio, label: `${closedRooms}间禁订` };
    if (ratio === 0) return { ratio, closedRatio, longTermRatio, label: '全部空闲' };
    if (ratio >= 1) return { ratio, closedRatio, longTermRatio, label: '全部满房' };
    return { ratio, closedRatio, longTermRatio, label: `已订${occupied}/${total}${longTermCount > 0 ? `(长租${longTermCount})` : ''}` };
  };

  const getDayColorClass = (date: Date) => {
    const isCurrentMonth = getMonth(date) === month;
    const { ratio, closedRatio, longTermRatio } = getDayStatus(date);
    const hasMaintenance = maintenanceRooms.length > 0;

    if (!isCurrentMonth) {
      return 'bg-white/30 text-gray-300';
    }
    if (closedRatio > 0 && ratio === 0) return 'bg-rose-100 hover:bg-rose-200 text-rose-700';
    if (hasMaintenance && ratio === 0) return 'bg-rose-50 hover:bg-rose-100';
    if (ratio === 0) return 'bg-white hover:bg-brand-sage/30';
    if (longTermRatio > 0 && ratio < 0.5) return 'bg-indigo-100 hover:bg-indigo-200 text-indigo-800';
    if (longTermRatio > 0 && ratio < 1) return 'bg-indigo-200 hover:bg-indigo-300 text-indigo-900';
    if (longTermRatio > 0 && ratio >= 1) return 'bg-indigo-500 hover:bg-indigo-600 text-white';
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
    setSearchParams({});
    setSelectedDate(null);
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

  const selectedDateBookings = selectedDate ? getActiveBookingsByDate(selectedDate, storeFilter) : [];
  const selectedDateClosedDates = selectedDate ? getClosedDatesByDate(selectedDate, storeFilter) : [];
  const selectedDateLongTerm = selectedDate ? getActiveLongTermContractsByDate(selectedDate, storeFilter) : [];

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

      <div className="card-base p-4 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-brand-taupe" />
          <select
            className="input-base !w-auto"
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
          >
            <option value="all">全部门店</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {storeFilter !== 'all' && (
            <span className="text-sm text-brand-taupe flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              当前查看单门店
            </span>
          )}
        </div>
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
            <div className="flex items-center gap-3 text-sm text-brand-taupe flex-wrap">
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
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-200 border border-indigo-400" />
                有长租
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-500" />
                长租满房
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-100 border border-rose-300" />
                有维护中房间
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-200 border border-rose-400" />
                有禁订房间
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
                      <div className="flex items-center gap-1">
                        {dayStatus.closedRatio > 0 && (
                          <span className="w-2 h-2 rounded-full bg-rose-500" title={`${Math.round(dayStatus.closedRatio * activeRooms.length)}间禁订`} />
                        )}
                        {maintenanceRooms.length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-rose-400" title={`${maintenanceRooms.length}间维护中`} />
                        )}
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
                      </div>
                    )}
                  </div>
                  {isCurrentMonth && (getDayBookings(date).length > 0 || getDayLongTermContracts(date).length > 0) && (
                    <div className="space-y-1 mt-1">
                      {getDayLongTermContracts(date)
                        .slice(0, 1)
                        .map((c) => {
                          const room = getRoomById(c.roomId);
                          const expiryInfo = getContractExpiryInfo(c.id);
                          const isUrgent = expiryInfo?.alertLevel === 'urgent';
                          const isRemind = expiryInfo?.alertLevel === 'remind';
                          return (
                            <div
                              key={`lt-${c.id}`}
                              className={`text-xs px-1.5 py-0.5 rounded truncate flex items-center gap-1 ${
                                dayStatus.longTermRatio > 0 && dayStatus.ratio >= 1
                                  ? 'bg-white/20 text-white'
                                  : isUrgent
                                  ? 'bg-red-100 text-red-700 border border-red-300'
                                  : isRemind
                                  ? 'bg-amber-100 text-amber-700 border border-amber-300'
                                  : 'bg-indigo-100 text-indigo-700'
                              }`}
                              title={isUrgent ? `紧急：${expiryInfo?.daysRemaining}天后到期` : isRemind ? `提醒：${expiryInfo?.daysRemaining}天后到期` : `长租至${formatDateDisplay(c.endDate)}`}
                            >
                              <FileSignature className="w-3 h-3 flex-shrink-0" />
                              {room?.roomNumber} {c.guestName}
                              {isUrgent && <AlertTriangle className="w-3 h-3 flex-shrink-0" />}
                              {!isUrgent && isRemind && <Clock className="w-3 h-3 flex-shrink-0" />}
                            </div>
                          );
                        })}
                      {getDayBookings(date)
                        .slice(0, getDayLongTermContracts(date).length > 0 ? 1 : 2)
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
                      {(getDayBookings(date).length + getDayLongTermContracts(date).length) > 2 && (
                        <div
                          className={`text-xs ${
                            dayStatus.ratio >= 1 ? 'text-white/80' : 'text-brand-taupe'
                          }`}
                        >
                          +{getDayBookings(date).length + getDayLongTermContracts(date).length - 2} 更多
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
        onClose={handleCloseModal}
        title={selectedDate ? formatDateDisplay(selectedDate) : ''}
        size="xl"
      >
        {selectedDate && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-brand-taupe">
                  共 {activeRooms.length} 间正常房，已预订 {selectedDateBookings.length} 间
                  {selectedDateLongTerm.length > 0 && (
                    <span className="ml-2 text-indigo-600">
                      · 长租 {selectedDateLongTerm.length} 间
                    </span>
                  )}
                  {maintenanceRooms.length > 0 && (
                    <span className="ml-2 text-rose-600">
                      · {maintenanceRooms.length} 间维护中
                    </span>
                  )}
                  {selectedDateClosedDates.length > 0 && (
                    <span className="ml-2 text-rose-700">
                      · {selectedDateClosedDates.length} 间禁订
                    </span>
                  )}
                </p>
              </div>
              <button onClick={() => handleNewBookingFromDate()} className="btn-primary">
                <Plus className="w-4 h-4" />
                新增预订
              </button>
            </div>

            {maintenanceRooms.length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-medium text-rose-600 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  维护中房间 ({maintenanceRooms.length})
                </h3>
                <div className="space-y-2">
                  {maintenanceRooms.map((room) => (
                    <div
                      key={room.id}
                      className="p-3 rounded-xl bg-rose-50 border border-rose-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                            <span className="font-display text-base font-bold text-rose-600">
                              {room.roomNumber}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-brand-brown">{room.name}</div>
                            <div className="text-xs text-brand-taupe flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {getStoreById(room.storeId)?.name || '未知门店'} · {RoomTypeLabels[room.type]}
                            </div>
                          </div>
                        </div>
                        <Badge variant="warning">{RoomStatusLabels[room.status]}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedDate && selectedDateLongTerm.length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-medium text-indigo-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  长租合同 ({selectedDateLongTerm.length})
                </h3>
                <div className="space-y-2">
                  {selectedDateLongTerm.map((c) => {
                    const room = getRoomById(c.roomId);
                    if (!room) return null;
                    const expiryInfo = getContractExpiryInfo(c.id);
                    const isUrgent = expiryInfo?.alertLevel === 'urgent';
                    const isRemind = expiryInfo?.alertLevel === 'remind';
                    return (
                      <div
                        key={c.id}
                        className={`p-3 rounded-xl border ${
                          isUrgent
                            ? 'bg-red-50 border-red-200'
                            : isRemind
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-indigo-50 border-indigo-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isUrgent ? 'bg-red-100' : isRemind ? 'bg-amber-100' : 'bg-indigo-100'
                            }`}>
                              <FileSignature className={`w-5 h-5 ${
                                isUrgent ? 'text-red-600' : isRemind ? 'text-amber-600' : 'text-indigo-600'
                              }`} />
                            </div>
                            <div>
                              <div className="font-medium text-brand-brown">
                                {room.roomNumber} {room.name} · {c.guestName}
                              </div>
                              <div className="text-xs text-brand-taupe flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {getStoreById(room.storeId)?.name || '未知门店'}
                              </div>
                              <div className="text-xs text-brand-taupe mt-0.5">
                                {formatDateDisplay(c.startDate)} → {formatDateDisplay(c.endDate)} ({c.months}个月)
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${LongTermContractStatusColors[c.status]}`}>
                              {LongTermContractStatusLabels[c.status]}
                            </span>
                            {isUrgent && (
                              <div className="text-xs text-red-600 mt-1 flex items-center justify-end gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {expiryInfo?.daysRemaining}天后到期
                              </div>
                            )}
                            {!isUrgent && isRemind && (
                              <div className="text-xs text-amber-600 mt-1 flex items-center justify-end gap-1">
                                <Clock className="w-3 h-3" />
                                {expiryInfo?.daysRemaining}天后到期
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedDate && selectedDateClosedDates.length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-medium text-rose-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  禁订房间 ({selectedDateClosedDates.length})
                </h3>
                <div className="space-y-2">
                  {selectedDateClosedDates.map((cd) => {
                    const room = getRoomById(cd.roomId);
                    if (!room) return null;
                    return (
                      <div
                        key={cd.id}
                        className="p-3 rounded-xl bg-rose-100 border border-rose-300"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-rose-200 flex items-center justify-center">
                              <Ban className="w-5 h-5 text-rose-600" />
                            </div>
                            <div>
                              <div className="font-medium text-brand-brown">
                                {room.roomNumber} {room.name}
                              </div>
                              <div className="text-xs text-brand-taupe flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {getStoreById(room.storeId)?.name || '未知门店'}
                              </div>
                              {cd.description && (
                                <div className="text-xs text-rose-600 mt-0.5">
                                  {cd.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${ClosedDateReasonColors[cd.reason]}`}>
                            {ClosedDateReasonLabels[cd.reason]}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeRooms.length === 0 ? (
              <div className="text-center py-12">
                <BedDouble className="w-16 h-16 mx-auto text-brand-brown/30 mb-4" />
                <p className="text-brand-taupe">请先添加房间</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {activeRooms.map((room) => {
                  const roomBooking = selectedDateBookings.find((b) => b.roomId === room.id);
                  const roomClosedDate = selectedDateClosedDates.find((cd) => cd.roomId === room.id);
                  const roomLongTerm = selectedDateLongTerm.find((c) => c.roomId === room.id);
                  const isAvailable = !roomBooking && !roomClosedDate && !roomLongTerm;
                  const isClosed = !!roomClosedDate;
                  const isLongTerm = !!roomLongTerm;

                  return (
                    <div
                      key={room.id}
                      className={`p-4 rounded-xl border transition-colors ${
                        isClosed
                          ? 'bg-rose-100/50 border-rose-300'
                          : isLongTerm
                          ? 'bg-indigo-50 border-indigo-200'
                          : isAvailable
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
                            <div className="text-xs text-brand-taupe flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {getStoreById(room.storeId)?.name} · {RoomTypeLabels[room.type]} · ¥{room.price}/晚
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
                          ) : isClosed ? (
                            <div className="text-right">
                              <Badge variant="danger">禁订</Badge>
                              {roomClosedDate && (
                                <div className="text-xs text-rose-600 mt-1">
                                  {ClosedDateReasonLabels[roomClosedDate.reason]}
                                  {roomClosedDate.description && ` · ${roomClosedDate.description}`}
                                </div>
                              )}
                            </div>
                          ) : isLongTerm && roomLongTerm ? (
                            (() => {
                              const expiryInfo = getContractExpiryInfo(roomLongTerm.id);
                              const isUrgent = expiryInfo?.alertLevel === 'urgent';
                              const isRemind = expiryInfo?.alertLevel === 'remind';
                              return (
                                <div className="text-right">
                                  <div className="font-medium text-indigo-700 text-sm flex items-center justify-end gap-1">
                                    <FileSignature className="w-3 h-3" />
                                    {roomLongTerm.guestName}
                                  </div>
                                  <div className="text-xs text-brand-taupe">
                                    {formatDateDisplay(roomLongTerm.startDate)} →{' '}
                                    {formatDateDisplay(roomLongTerm.endDate)} ({roomLongTerm.months}个月)
                                  </div>
                                  <div className="flex items-center justify-end gap-1.5 mt-1.5">
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded-full ${LongTermContractStatusColors[roomLongTerm.status]}`}
                                    >
                                      {LongTermContractStatusLabels[roomLongTerm.status]}
                                    </span>
                                    {isUrgent && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                                        <AlertTriangle className="w-3 h-3" />
                                        {expiryInfo?.daysRemaining}天
                                      </span>
                                    )}
                                    {!isUrgent && isRemind && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
                                        <Clock className="w-3 h-3" />
                                        {expiryInfo?.daysRemaining}天
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })()
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
                                <div className="flex items-center justify-end gap-1.5 mt-1.5">
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full ${BookingStatusColors[roomBooking.status]}`}
                                  >
                                    {BookingStatusLabels[roomBooking.status]}
                                  </span>
                                  {roomBooking.status === 'confirmed' && (
                                    <button
                                      onClick={() => updateBookingStatus(roomBooking.id, 'checked-in')}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-brand-green/20 text-brand-green hover:bg-brand-green/30 transition-colors"
                                    >
                                      <LogIn className="w-3 h-3" />
                                      入住
                                    </button>
                                  )}
                                  {roomBooking.status === 'checked-in' && (
                                    <button
                                      onClick={() => handleCheckOutClick(roomBooking)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-brand-orange/20 text-brand-orange hover:bg-brand-orange/30 transition-colors"
                                    >
                                      <LogOut className="w-3 h-3" />
                                      退房
                                    </button>
                                  )}
                                </div>
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

      {checkOutBooking && (
        <CheckOutInspectionModal
          open={checkOutModalOpen}
          onClose={() => {
            setCheckOutModalOpen(false);
            setCheckOutBooking(null);
          }}
          booking={checkOutBooking}
          onComplete={handleCheckOutComplete}
        />
      )}
    </div>
  );
}
