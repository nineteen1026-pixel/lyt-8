import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, Filter, Phone, User, Calendar, XCircle, CheckCircle2, LogIn, LogOut, UserCircle, ChevronRight, Building2, Coffee, Car, Train, Bed, Sparkles, Ship, Sunrise, Waves, Mountain, Leaf, Soup, RotateCcw, StickyNote, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { Booking, BookingStatus, GuestProfile, RoomType, ExtraService, Deposit, DepositTransaction } from '@/types';
import { BookingStatusLabels, BookingStatusColors, RepurchaseLevelLabels, RepurchaseLevelColors, RoomTypeLabels, normalizePhone, ExtraServiceChargeTypeLabels, DepositStatusLabels, DepositStatusColors, DepositTransactionTypeLabels, DeductionCategoryLabels } from '@/types';
import Badge from '@/components/Badge';
import ConfirmDialog from '@/components/ConfirmDialog';
import BookingForm from './BookingForm';
import Modal from '@/components/Modal';
import CheckOutInspectionModal from '@/components/CheckOutInspectionModal';
import { formatDateDisplay, calculateNights, isSameDayStr } from '@/utils/date';
import { highlightText, containsKeyword } from '@/lib/utils';

function HighlightedText({ text, keyword }: { text: string; keyword: string }) {
  const parts = highlightText(text, keyword);
  return (
    <>
      {parts.map((part, i) =>
        typeof part === 'string' ? (
          <span key={i}>{part}</span>
        ) : (
          <mark
            key={i}
            className="bg-yellow-200 text-brand-brown rounded px-0.5 font-medium"
          >
            {part.highlighted}
          </mark>
        )
      )}
    </>
  );
}

export default function BookingList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    stores,
    rooms,
    addBooking,
    updateBooking,
    cancelBooking,
    restoreBooking,
    getRoomById,
    getRoomsByStore,
    getBookingsByStore,
    getGuestProfiles,
    getStoreById,
    updateBookingStatus,
    hasPermission,
    getExtraServiceById,
    calculateExtraServicesPrice,
    isRoomAvailable,
  } = useAppStore();

  const canCreateBooking = hasPermission('booking:create');
  const canUpdateBooking = hasPermission('booking:update');
  const canCancelBooking = hasPermission('booking:cancel');
  const canRestoreBooking = hasPermission('booking:restore');
  const canCheckIn = hasPermission('booking:checkin');
  const canCheckOut = hasPermission('booking:checkout');

  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState<RoomType | 'all'>('all');
  const [roomIdFilter, setRoomIdFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelledSuccess, setCancelledSuccess] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<Booking | null>(null);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
  const [checkOutBooking, setCheckOutBooking] = useState<Booking | null>(null);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new') {
      setEditingBooking(null);
      setFormOpen(true);
      setSearchParams({});
    }
  }, [searchParams]);

  const filteredRooms = useMemo(() => {
    let list = getRoomsByStore(storeFilter);
    if (roomTypeFilter !== 'all') {
      list = list.filter((r) => r.type === roomTypeFilter);
    }
    return list;
  }, [storeFilter, roomTypeFilter, getRoomsByStore, rooms]);

  const storeBookings = useMemo(() => getBookingsByStore(storeFilter), [storeFilter, getBookingsByStore]);

  const getRoomNumber = (roomId: string) => {
    const room = getRoomById(roomId);
    return room ? `${room.roomNumber} ${room.name}` : '未知房间';
  };

  const guestProfileMap = useMemo(() => {
    const profiles = getGuestProfiles(storeFilter);
    const map = new Map<string, GuestProfile>();
    profiles.forEach((p) => map.set(p.guestPhone, p));
    return map;
  }, [getGuestProfiles, storeBookings, storeFilter]);

  const { getDepositByBookingId } = useAppStore();

  const getDepositForBooking = (bookingId: string): Deposit | undefined => {
    return getDepositByBookingId(bookingId);
  };

  const filteredBookings = storeBookings
    .filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (roomTypeFilter !== 'all') {
        const room = getRoomById(b.roomId);
        if (!room || room.type !== roomTypeFilter) return false;
      }
      if (roomIdFilter !== 'all' && b.roomId !== roomIdFilter) return false;
      if (search) {
        const trimmedSearch = search.trim();
        const normalizedSearch = normalizePhone(search);
        const room = getRoomById(b.roomId);
        return (
          containsKeyword(b.guestName, trimmedSearch) ||
          b.guestPhone.includes(trimmedSearch) ||
          (normalizedSearch && b.guestPhone.includes(normalizedSearch)) ||
          (room?.roomNumber.includes(trimmedSearch) ?? false) ||
          containsKeyword(room?.name, trimmedSearch) ||
          containsKeyword(b.notes, trimmedSearch)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());

  const handleRoomTypeChange = (value: RoomType | 'all') => {
    setRoomTypeFilter(value);
    setRoomIdFilter('all');
  };

  const handleStoreChange = (value: string) => {
    setStoreFilter(value);
    setRoomIdFilter('all');
  };

  const handleJumpToCalendar = (date: string) => {
    navigate(`/calendar?date=${date}`);
  };

  const handleAdd = () => {
    setEditingBooking(null);
    setFormOpen(true);
  };

  const handleEdit = (booking: Booking) => {
    setEditingBooking(booking);
    setFormOpen(true);
  };

  const handleCancelClick = (booking: Booking) => {
    setCancelTarget(booking);
    setCancelReason('');
    setCancelledSuccess(false);
  };

  const handleCancelConfirm = () => {
    if (cancelTarget) {
      cancelBooking(cancelTarget.id, cancelReason || '客人取消');
      setCancelledSuccess(true);
    }
  };

  const handleRestoreClick = (booking: Booking) => {
    setRestoreTarget(booking);
    setCancelTarget(null);
    setCancelledSuccess(false);
  };

  const handleCancelClose = () => {
    setCancelTarget(null);
    setCancelReason('');
    setCancelledSuccess(false);
  };

  const handleRestoreConfirm = () => {
    if (restoreTarget) {
      const success = restoreBooking(restoreTarget.id);
      if (!success) {
        alert('恢复预订失败：目标日期房间已被占用或不可用');
      }
    }
    setRestoreTarget(null);
  };

  const handleSubmit = (
    data: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>,
    isEdit: boolean
  ): boolean => {
    if (isEdit && editingBooking) {
      return updateBooking(editingBooking.id, data);
    }
    return addBooking(data);
  };

  const handleCheckOutClick = (booking: Booking) => {
    setCheckOutBooking(booking);
    setDetailBooking(null);
    setCheckOutModalOpen(true);
  };

  const handleCheckOutComplete = () => {
    if (checkOutBooking) {
      updateBookingStatus(checkOutBooking.id, 'checked-out');
    }
    setCheckOutModalOpen(false);
    setCheckOutBooking(null);
  };

  const handleStatusUpdate = (booking: Booking, status: BookingStatus) => {
    if (status === 'checked-out') {
      handleCheckOutClick(booking);
      return;
    }
    updateBookingStatus(booking.id, status);
    setDetailBooking(null);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-brown">预订管理</h1>
          <p className="text-brand-taupe mt-1">查看和管理所有预订记录</p>
        </div>
        {canCreateBooking && (
          <button onClick={handleAdd} className="btn-primary">
            <Plus className="w-4 h-4" />
            新增预订
          </button>
        )}
      </div>

      <div className="card-base p-4 mb-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-taupe" />
            <input
              type="text"
              className="input-base pl-10"
              placeholder="搜索客人姓名、电话、房间号、备注关键词..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-brand-taupe" />
            <select
              className="input-base !w-auto"
              value={storeFilter}
              onChange={(e) => handleStoreChange(e.target.value)}
            >
              <option value="all">全部门店</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              className="input-base !w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BookingStatus | 'all')}
            >
              <option value="all">全部状态</option>
              {(Object.keys(BookingStatusLabels) as BookingStatus[]).map((s) => (
                <option key={s} value={s}>
                  {BookingStatusLabels[s]}
                </option>
              ))}
            </select>
            <select
              className="input-base !w-auto"
              value={roomTypeFilter}
              onChange={(e) => handleRoomTypeChange(e.target.value as RoomType | 'all')}
            >
              <option value="all">全部房型</option>
              {(Object.keys(RoomTypeLabels) as RoomType[]).map((t) => (
                <option key={t} value={t}>
                  {RoomTypeLabels[t]}
                </option>
              ))}
            </select>
            <select
              className="input-base !w-auto"
              value={roomIdFilter}
              onChange={(e) => setRoomIdFilter(e.target.value)}
            >
              <option value="all">全部房间</option>
              {filteredRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card-base overflow-hidden">
        {filteredBookings.length === 0 ? (
          <div className="p-16 text-center">
            <Calendar className="w-16 h-16 mx-auto text-brand-brown/30 mb-4" />
            <h3 className="font-display text-lg text-brand-brown mb-2">暂无预订记录</h3>
            {canCreateBooking && (
              <>
                <p className="text-brand-taupe mb-6">点击上方按钮添加您的第一个预订</p>
                <button onClick={handleAdd} className="btn-primary">
                  <Plus className="w-4 h-4" />
                  新增预订
                </button>
              </>
            )}
            {!canCreateBooking && (
              <p className="text-brand-taupe">暂无权限创建预订</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-brand-beige/60">
                <tr>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                    客人信息
                  </th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                    消费频次 / 复购提醒
                  </th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                    门店 / 房间
                  </th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                    入住日期
                  </th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                    退房日期
                  </th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                    晚数/金额
                  </th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                    状态
                  </th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                    押金
                  </th>
                  <th className="text-right text-sm font-medium text-brand-taupe px-5 py-3">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b, idx) => {
                  const room = getRoomById(b.roomId);
                  const store = room ? getStoreById(room.storeId) : null;
                  const nights = calculateNights(b.checkIn, b.checkOut);
                  const guestProfile = guestProfileMap.get(b.guestPhone);
                  const deposit = getDepositForBooking(b.id);

                  return (
                    <tr
                      key={b.id}
                      className={`border-t border-brand-brown/5 hover:bg-brand-beige/30 transition-colors ${
                        idx % 2 === 1 ? 'bg-brand-cream/50' : ''
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div
                          className="cursor-pointer"
                          onClick={() => setDetailBooking(b)}
                        >
                          <div className="font-medium text-brand-brown flex items-center gap-2">
                            <User className="w-4 h-4 text-brand-taupe" />
                            <HighlightedText text={b.guestName} keyword={search} />
                          </div>
                          <div className="text-sm text-brand-taupe flex items-center gap-2 mt-1">
                            <Phone className="w-3.5 h-3.5" />
                            <HighlightedText text={b.guestPhone} keyword={search} />
                          </div>
                          {b.notes && (
                            <div className="text-xs text-brand-taupe/80 flex items-center gap-1.5 mt-1.5 max-w-[240px]">
                              <StickyNote className="w-3 h-3 flex-shrink-0 text-brand-orange/60" />
                              <span className="truncate">
                                <HighlightedText text={b.notes} keyword={search} />
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {guestProfile ? (
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-brand-taupe">
                                {guestProfile.validBookingCount} 次预订
                              </span>
                              <span className="text-xs text-brand-taupe">
                                · ¥{guestProfile.totalSpending.toLocaleString()} 累计
                              </span>
                            </div>
                            {guestProfile.repurchaseReminder && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  RepurchaseLevelColors[
                                    guestProfile.repurchaseReminder.level
                                  ]
                                }`}
                              >
                                {
                                  RepurchaseLevelLabels[
                                    guestProfile.repurchaseReminder.level
                                  ]
                                }
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-brand-taupe">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {store && (
                          <div className="text-xs text-brand-taupe flex items-center gap-1 mb-0.5">
                            <Building2 className="w-3 h-3" />
                            {store.name}
                          </div>
                        )}
                        <div className="font-medium text-brand-brown">
                          <HighlightedText text={`${room?.roomNumber ?? ''} ${room?.name ?? ''}`} keyword={search} />
                        </div>
                        <div className="text-xs text-brand-taupe">{b.guests}人入住</div>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleJumpToCalendar(b.checkIn)}
                          className="text-sm text-brand-brown hover:text-brand-orange transition-colors flex items-center gap-1 group"
                          title="点击查看日历"
                        >
                          <Calendar className="w-3.5 h-3.5 text-brand-taupe group-hover:text-brand-orange transition-colors" />
                          {formatDateDisplay(b.checkIn)}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleJumpToCalendar(b.checkOut)}
                          className="text-sm text-brand-brown hover:text-brand-orange transition-colors flex items-center gap-1 group"
                          title="点击查看日历"
                        >
                          <Calendar className="w-3.5 h-3.5 text-brand-taupe group-hover:text-brand-orange transition-colors" />
                          {formatDateDisplay(b.checkOut)}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-brand-brown">{nights}晚</div>
                        <div className="font-display font-bold text-brand-orange">¥{b.totalPrice}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${BookingStatusColors[b.status]}`}
                        >
                          {BookingStatusLabels[b.status]}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {deposit ? (
                          <div>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${DepositStatusColors[deposit.status]}`}
                            >
                              {DepositStatusLabels[deposit.status]}
                            </span>
                            <div className="text-xs text-brand-taupe mt-1">
                              ¥{deposit.collectedAmount} / ¥{deposit.totalAmount}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-brand-taupe">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            未收押金
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDetailBooking(b)}
                            className="p-2 rounded-lg text-brand-taupe hover:bg-brand-beige hover:text-brand-brown transition-colors"
                            title="查看详情"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                          {b.status === 'cancelled' && canRestoreBooking && (
                            <button
                              onClick={() => handleRestoreClick(b)}
                              className="p-2 rounded-lg text-brand-taupe hover:bg-green-50 hover:text-green-600 transition-colors"
                              title="恢复预订"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                          {b.status !== 'cancelled' && b.status !== 'checked-out' && (
                            <>
                              {canUpdateBooking && (
                                <button
                                  onClick={() => handleEdit(b)}
                                  className="p-2 rounded-lg text-brand-taupe hover:bg-brand-beige hover:text-brand-brown transition-colors"
                                  title="编辑"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              {canCancelBooking && (
                                <button
                                  onClick={() => handleCancelClick(b)}
                                  className="p-2 rounded-lg text-brand-taupe hover:bg-red-50 hover:text-red-500 transition-colors"
                                  title="取消预订"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BookingForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        booking={editingBooking}
      />

      <Modal
        open={!!cancelTarget}
        onClose={handleCancelClose}
        title={cancelledSuccess ? '预订已取消' : '取消预订'}
        size="sm"
      >
        <div className="space-y-4">
          {!cancelledSuccess ? (
            <>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-sm text-red-600">
                  确认要取消 {cancelTarget?.guestName} 的预订吗？
                  <br />
                  房间：{cancelTarget && getRoomNumber(cancelTarget.roomId)}
                  <br />
                  日期：{cancelTarget && formatDateDisplay(cancelTarget.checkIn)} →{' '}
                  {cancelTarget && formatDateDisplay(cancelTarget.checkOut)}
                </div>
              </div>
              <div>
                <label className="label-base">取消原因</label>
                <textarea
                  className="input-base resize-none"
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="请输入取消原因..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCancelClose}
                  className="btn-secondary"
                >
                  返回
                </button>
                <button onClick={handleCancelConfirm} className="btn-danger">
                  确认取消
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-green-700">
                  ✓ 预订已成功取消
                  <br />
                  客人：{cancelTarget?.guestName}
                  <br />
                  房间：{cancelTarget && getRoomNumber(cancelTarget.roomId)}
                  <br />
                  日期：{cancelTarget && formatDateDisplay(cancelTarget.checkIn)} →{' '}
                  {cancelTarget && formatDateDisplay(cancelTarget.checkOut)}
                </div>
              </div>
              {cancelTarget && canRestoreBooking && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-700 mb-3">
                    需要恢复预订吗？
                  </div>
                  {(() => {
                    const available = isRoomAvailable(
                      cancelTarget.roomId,
                      cancelTarget.checkIn,
                      cancelTarget.checkOut,
                      cancelTarget.id
                    );
                    return (
                      <div
                        className={`p-3 rounded-lg text-sm mb-3 ${
                          available ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {available
                          ? '✓ 目标日期房间可用，可以恢复预订'
                          : '✗ 目标日期房间已被占用或不可用，无法恢复预订'}
                      </div>
                    );
                  })()}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={handleCancelClose}
                      className="btn-secondary"
                    >
                      关闭
                    </button>
                    <button
                      onClick={() => cancelTarget && handleRestoreClick(cancelTarget)}
                      className="btn-primary !bg-green-600 !hover:bg-green-700"
                      disabled={
                        cancelTarget
                          ? !isRoomAvailable(
                              cancelTarget.roomId,
                              cancelTarget.checkIn,
                              cancelTarget.checkOut,
                              cancelTarget.id
                            )
                          : true
                      }
                    >
                      <RotateCcw className="w-4 h-4" />
                      立即恢复
                    </button>
                  </div>
                </div>
              )}
              {(!canRestoreBooking) && (
                <div className="flex justify-end">
                  <button
                    onClick={handleCancelClose}
                    className="btn-secondary"
                  >
                    关闭
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      <Modal
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        title="恢复预订"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-green-700">
              确认要恢复 {restoreTarget?.guestName} 的预订吗？
              <br />
              房间：{restoreTarget && getRoomNumber(restoreTarget.roomId)}
              <br />
              日期：{restoreTarget && formatDateDisplay(restoreTarget.checkIn)} →{' '}
              {restoreTarget && formatDateDisplay(restoreTarget.checkOut)}
            </div>
          </div>
          {restoreTarget &&
            (() => {
              const available = isRoomAvailable(
                restoreTarget.roomId,
                restoreTarget.checkIn,
                restoreTarget.checkOut,
                restoreTarget.id
              );
              return (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    available ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                  }`}
                >
                  {available
                    ? '✓ 目标日期房间可用，可以恢复预订'
                    : '✗ 目标日期房间已被占用或不可用，无法恢复预订'}
                </div>
              );
            })()}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setRestoreTarget(null)}
              className="btn-secondary"
            >
              返回
            </button>
            <button
              onClick={handleRestoreConfirm}
              className="btn-primary !bg-green-600 !hover:bg-green-700"
              disabled={
                restoreTarget
                  ? !isRoomAvailable(
                      restoreTarget.roomId,
                      restoreTarget.checkIn,
                      restoreTarget.checkOut,
                      restoreTarget.id
                    )
                  : true
              }
            >
              确认恢复
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!detailBooking}
        onClose={() => setDetailBooking(null)}
        title="预订详情"
        size="md"
      >
        {detailBooking && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-brand-taupe mb-1">客人姓名</div>
                <div className="font-medium text-brand-brown flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-taupe" />
                  <HighlightedText text={detailBooking.guestName} keyword={search} />
                </div>
              </div>
              <div>
                <div className="text-xs text-brand-taupe mb-1">联系电话</div>
                <div className="font-medium text-brand-brown flex items-center gap-2">
                  <Phone className="w-4 h-4 text-brand-taupe" />
                  <HighlightedText text={detailBooking.guestPhone} keyword={search} />
                  <button
                    onClick={() => {
                      setDetailBooking(null);
                      navigate(`/guests/${encodeURIComponent(detailBooking.guestPhone)}`);
                    }}
                    className="ml-1 p-1 rounded text-brand-taupe hover:bg-brand-beige hover:text-brand-brown transition-colors"
                    title="查看客人档案"
                  >
                    <UserCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <div className="text-xs text-brand-taupe mb-1">房间</div>
                <div className="font-medium text-brand-brown">
                  <HighlightedText text={getRoomNumber(detailBooking.roomId)} keyword={search} />
                </div>
              </div>
              <div>
                <div className="text-xs text-brand-taupe mb-1">入住人数</div>
                <div className="font-medium text-brand-brown">{detailBooking.guests} 人</div>
              </div>
              <div>
                <div className="text-xs text-brand-taupe mb-1">入住日期</div>
                <div className="font-medium text-brand-brown flex items-center gap-2">
                  <LogIn className="w-4 h-4 text-brand-green" />
                  {formatDateDisplay(detailBooking.checkIn)}
                </div>
              </div>
              <div>
                <div className="text-xs text-brand-taupe mb-1">退房日期</div>
                <div className="font-medium text-brand-brown flex items-center gap-2">
                  <LogOut className="w-4 h-4 text-brand-orange" />
                  {formatDateDisplay(detailBooking.checkOut)}
                </div>
              </div>
              <div>
                <div className="text-xs text-brand-taupe mb-1">入住晚数</div>
                <div className="font-medium text-brand-brown">
                  {calculateNights(detailBooking.checkIn, detailBooking.checkOut)} 晚
                </div>
              </div>
              <div>
                <div className="text-xs text-brand-taupe mb-1">房费</div>
                <div className="font-medium text-brand-brown">
                  ¥{detailBooking.roomPrice ?? detailBooking.totalPrice}
                </div>
              </div>
              {(detailBooking.extraServicesPrice ?? 0) > 0 && (
                <div>
                  <div className="text-xs text-brand-taupe mb-1">附加服务费</div>
                  <div className="font-medium text-brand-brown">
                    ¥{detailBooking.extraServicesPrice}
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs text-brand-taupe mb-1">总金额</div>
                <div className="font-display font-bold text-xl text-brand-orange">
                  ¥{detailBooking.totalPrice}
                </div>
              </div>
            </div>

            {detailBooking.extraServices && detailBooking.extraServices.length > 0 && (
              <div className="p-4 bg-brand-beige/40 rounded-lg space-y-2">
                <div className="text-xs text-brand-taupe font-medium mb-2">已选附加服务</div>
                {detailBooking.extraServices.map((item, idx) => {
                  const service = getExtraServiceById(item.serviceId);
                  if (!service) {
                    return (
                      <div key={idx} className="text-sm text-brand-taupe">
                        未知服务（数据已更新）
                      </div>
                    );
                  }
                  const nights = calculateNights(detailBooking.checkIn, detailBooking.checkOut);
                  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
                    Coffee,
                    Croissant: Coffee,
                    Car,
                    Train,
                    Bed,
                    Sparkles,
                    Ship,
                    Sunrise,
                    Waves,
                    Mountain,
                    Leaf,
                    Soup,
                  };
                  const Icon = iconMap[service.icon] || Sparkles;
                  let unitLabel = '';
                  let subtotal = 0;
                  switch (service.chargeType) {
                    case 'per_night':
                      unitLabel = `× ${nights}晚 × ${item.quantity}份`;
                      subtotal = service.price * nights * item.quantity;
                      break;
                    case 'per_person_per_night': {
                      const people = Math.min(item.quantity, detailBooking.guests);
                      unitLabel = `× ${people}人 × ${nights}晚`;
                      subtotal = service.price * people * nights;
                      break;
                    }
                    case 'per_stay':
                    default:
                      unitLabel = `× ${item.quantity}次`;
                      subtotal = service.price * item.quantity;
                      break;
                  }
                  return (
                    <div
                      key={item.serviceId}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2 text-brand-brown">
                        <Icon className="w-4 h-4 text-brand-taupe" />
                        <span className="font-medium">{service.name}</span>
                        <span className="text-xs text-brand-taupe">{unitLabel}</span>
                      </div>
                      <span className="font-medium text-brand-brown">¥{subtotal}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {detailBooking.guestIdCard && (
              <div>
                <div className="text-xs text-brand-taupe mb-1">身份证号</div>
                <div className="font-medium text-brand-brown">
                  <HighlightedText text={detailBooking.guestIdCard} keyword={search} />
                </div>
              </div>
            )}

            {detailBooking.notes && (
              <div>
                <div className="text-xs text-brand-taupe mb-1">备注</div>
                <div className="p-3 bg-brand-beige/60 rounded-lg text-sm text-brand-brown whitespace-pre-wrap">
                  <HighlightedText text={detailBooking.notes} keyword={search} />
                </div>
              </div>
            )}

            {detailBooking.status === 'cancelled' && detailBooking.cancelReason && (
              <div>
                <div className="text-xs text-brand-taupe mb-1">取消原因</div>
                <div className="p-3 bg-red-50 rounded-lg text-sm text-red-600">
                  {detailBooking.cancelReason}
                </div>
              </div>
            )}

            {(() => {
              const deposit = getDepositForBooking(detailBooking.id);
              if (!deposit) return null;

              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-brand-taupe" />
                    <span className="font-medium text-brand-brown">押金信息</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${DepositStatusColors[deposit.status]}`}
                    >
                      {DepositStatusLabels[deposit.status]}
                    </span>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-brand-taupe mb-1">押金总额</div>
                        <div className="font-display font-bold text-lg text-brand-brown">¥{deposit.totalAmount}</div>
                      </div>
                      <div>
                        <div className="text-brand-taupe mb-1">已收取</div>
                        <div className="font-display font-bold text-lg text-green-600">¥{deposit.collectedAmount}</div>
                      </div>
                      <div>
                        <div className="text-brand-taupe mb-1">已退还</div>
                        <div className="font-display font-bold text-lg text-blue-600">¥{deposit.refundedAmount}</div>
                      </div>
                      <div>
                        <div className="text-brand-taupe mb-1">已扣款</div>
                        <div className="font-display font-bold text-lg text-red-600">¥{deposit.deductedAmount}</div>
                      </div>
                    </div>
                  </div>

                  {deposit.checkOutInspection?.completed && (
                    <div className="p-4 bg-green-50 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-800">退房核验已完成</span>
                      </div>
                      {deposit.checkOutInspection.notes && (
                        <div className="text-sm text-green-700">
                          核验备注：{deposit.checkOutInspection.notes}
                        </div>
                      )}
                      {deposit.checkOutInspection.completedByName && (
                        <div className="text-xs text-green-600">
                          核验人：{deposit.checkOutInspection.completedByName}
                        </div>
                      )}
                      {deposit.checkOutInspection.deductionItems && deposit.checkOutInspection.deductionItems.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-green-200 space-y-1">
                          <div className="text-xs text-green-700 font-medium mb-1">扣款明细：</div>
                          {deposit.checkOutInspection.deductionItems.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-green-700">{item.name}</span>
                                <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded">
                                  {DeductionCategoryLabels[item.category]}
                                </span>
                              </div>
                              <span className="font-medium text-red-600">-¥{item.amount}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {deposit.transactions && deposit.transactions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-brand-taupe" />
                        <span className="text-xs text-brand-taupe font-medium">交易流水</span>
                      </div>
                      <div className="space-y-2">
                        {deposit.transactions.map((tx: DepositTransaction) => (
                          <div key={tx.id} className="p-3 bg-brand-beige/30 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded font-medium ${
                                    tx.type === 'collect'
                                      ? 'bg-green-100 text-green-700'
                                      : tx.type === 'refund'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {DepositTransactionTypeLabels[tx.type]}
                                </span>
                                <span className="text-xs text-brand-taupe">{tx.operatorName}</span>
                              </div>
                              <span
                                className={`font-display font-bold ${
                                  tx.type === 'collect'
                                    ? 'text-green-600'
                                    : tx.type === 'refund'
                                    ? 'text-blue-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {tx.type === 'collect' ? '+' : tx.type === 'refund' ? '-' : '-' }¥{tx.amount}
                              </span>
                            </div>
                            <div className="text-xs text-brand-taupe flex items-center justify-between">
                              <span>{tx.createdAt ? new Date(tx.createdAt).toLocaleString('zh-CN') : ''}</span>
                              {tx.paymentMethod && <span>{tx.paymentMethod}</span>}
                            </div>
                            {tx.notes && (
                              <div className="text-xs text-brand-taupe mt-1">备注：{tx.notes}</div>
                            )}
                            {tx.deductionItems && tx.deductionItems.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-brand-brown/10 space-y-1">
                                {tx.deductionItems.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between text-xs">
                                    <span className="text-brand-taupe">{item.name}</span>
                                    <span className="text-red-600">-¥{item.amount}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex items-center justify-between pt-4 border-t border-brand-brown/10">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${BookingStatusColors[detailBooking.status]}`}
              >
                {BookingStatusLabels[detailBooking.status]}
              </span>
              <div className="flex gap-2">
                {detailBooking.status === 'cancelled' && canRestoreBooking && (
                  <button
                    onClick={() => {
                      handleRestoreClick(detailBooking);
                      setDetailBooking(null);
                    }}
                    className="btn-primary !py-1.5 !px-4 text-sm !bg-green-600 !hover:bg-green-700"
                  >
                    <RotateCcw className="w-4 h-4" />
                    恢复预订
                  </button>
                )}
                {detailBooking.status === 'confirmed' && canCheckIn && (
                  <button
                    onClick={() => handleStatusUpdate(detailBooking, 'checked-in')}
                    className="btn-primary !py-1.5 !px-4 text-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    办理入住
                  </button>
                )}
                {detailBooking.status === 'checked-in' && canCheckOut && (
                  <button
                    onClick={() => handleStatusUpdate(detailBooking, 'checked-out')}
                    className="btn-primary !py-1.5 !px-4 text-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    办理退房
                  </button>
                )}
                {detailBooking.status !== 'cancelled' &&
                  detailBooking.status !== 'checked-out' &&
                  canUpdateBooking && (
                    <button
                      onClick={() => {
                        handleEdit(detailBooking);
                        setDetailBooking(null);
                      }}
                      className="btn-secondary !py-1.5 !px-4 text-sm"
                    >
                      <Pencil className="w-4 h-4" />
                      编辑
                    </button>
                  )}
              </div>
            </div>
          </div>
        )}
      </Modal>

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
