import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, Filter, Phone, User, Calendar, XCircle, CheckCircle2, LogIn, LogOut, UserCircle, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { Booking, BookingStatus, GuestProfile, RoomType } from '@/types';
import { BookingStatusLabels, BookingStatusColors, RepurchaseLevelLabels, RepurchaseLevelColors, RoomTypeLabels, normalizePhone } from '@/types';
import Badge from '@/components/Badge';
import ConfirmDialog from '@/components/ConfirmDialog';
import BookingForm from './BookingForm';
import Modal from '@/components/Modal';
import { formatDateDisplay, calculateNights, isSameDayStr } from '@/utils/date';

export default function BookingList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    bookings,
    rooms,
    addBooking,
    updateBooking,
    cancelBooking,
    getRoomById,
    updateBookingStatus,
    getGuestProfiles,
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState<RoomType | 'all'>('all');
  const [roomIdFilter, setRoomIdFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new') {
      setEditingBooking(null);
      setFormOpen(true);
      setSearchParams({});
    }
  }, [searchParams]);

  const getRoomNumber = (roomId: string) => {
    const room = getRoomById(roomId);
    return room ? `${room.roomNumber} ${room.name}` : '未知房间';
  };

  const guestProfileMap = useMemo(() => {
    const profiles = getGuestProfiles();
    const map = new Map<string, GuestProfile>();
    profiles.forEach((p) => map.set(p.guestPhone, p));
    return map;
  }, [getGuestProfiles, bookings]);

  const filteredRooms = useMemo(() => {
    if (roomTypeFilter === 'all') return rooms;
    return rooms.filter((r) => r.type === roomTypeFilter);
  }, [rooms, roomTypeFilter]);

  const filteredBookings = bookings
    .filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (roomTypeFilter !== 'all') {
        const room = getRoomById(b.roomId);
        if (!room || room.type !== roomTypeFilter) return false;
      }
      if (roomIdFilter !== 'all' && b.roomId !== roomIdFilter) return false;
      if (search) {
        const lower = search.toLowerCase();
        const normalizedSearch = normalizePhone(search);
        const room = getRoomById(b.roomId);
        return (
          b.guestName.toLowerCase().includes(lower) ||
          b.guestPhone.includes(search) ||
          (normalizedSearch && b.guestPhone.includes(normalizedSearch)) ||
          (room?.roomNumber.includes(search) ?? false) ||
          (room?.name.toLowerCase().includes(lower) ?? false)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());

  const handleRoomTypeChange = (value: RoomType | 'all') => {
    setRoomTypeFilter(value);
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
  };

  const handleCancelConfirm = () => {
    if (cancelTarget) {
      cancelBooking(cancelTarget.id, cancelReason || '客人取消');
    }
    setCancelTarget(null);
    setCancelReason('');
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

  const handleStatusUpdate = (booking: Booking, status: BookingStatus) => {
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
        <button onClick={handleAdd} className="btn-primary">
          <Plus className="w-4 h-4" />
          新增预订
        </button>
      </div>

      <div className="card-base p-4 mb-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-taupe" />
            <input
              type="text"
              className="input-base pl-10"
              placeholder="搜索客人姓名、电话、房间号..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-brand-taupe" />
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
            <p className="text-brand-taupe mb-6">点击上方按钮添加您的第一个预订</p>
            <button onClick={handleAdd} className="btn-primary">
              <Plus className="w-4 h-4" />
              新增预订
            </button>
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
                    房间
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
                  <th className="text-right text-sm font-medium text-brand-taupe px-5 py-3">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b, idx) => {
                  const room = getRoomById(b.roomId);
                  const nights = calculateNights(b.checkIn, b.checkOut);
                  const guestProfile = guestProfileMap.get(b.guestPhone);

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
                            {b.guestName}
                          </div>
                          <div className="text-sm text-brand-taupe flex items-center gap-2 mt-1">
                            <Phone className="w-3.5 h-3.5" />
                            {b.guestPhone}
                          </div>
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
                        <div className="font-medium text-brand-brown">
                          {room?.roomNumber} {room?.name}
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
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDetailBooking(b)}
                            className="p-2 rounded-lg text-brand-taupe hover:bg-brand-beige hover:text-brand-brown transition-colors"
                            title="查看详情"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                          {b.status !== 'cancelled' && b.status !== 'checked-out' && (
                            <>
                              <button
                                onClick={() => handleEdit(b)}
                                className="p-2 rounded-lg text-brand-taupe hover:bg-brand-beige hover:text-brand-brown transition-colors"
                                title="编辑"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleCancelClick(b)}
                                className="p-2 rounded-lg text-brand-taupe hover:bg-red-50 hover:text-red-500 transition-colors"
                                title="取消预订"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
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
        onClose={() => {
          setCancelTarget(null);
          setCancelReason('');
        }}
        title="取消预订"
        size="sm"
      >
        <div className="space-y-4">
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
              onClick={() => {
                setCancelTarget(null);
                setCancelReason('');
              }}
              className="btn-secondary"
            >
              返回
            </button>
            <button onClick={handleCancelConfirm} className="btn-danger">
              确认取消
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
                  {detailBooking.guestName}
                </div>
              </div>
              <div>
                <div className="text-xs text-brand-taupe mb-1">联系电话</div>
                <div className="font-medium text-brand-brown flex items-center gap-2">
                  <Phone className="w-4 h-4 text-brand-taupe" />
                  {detailBooking.guestPhone}
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
                  {getRoomNumber(detailBooking.roomId)}
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
                <div className="text-xs text-brand-taupe mb-1">总金额</div>
                <div className="font-display font-bold text-xl text-brand-orange">
                  ¥{detailBooking.totalPrice}
                </div>
              </div>
            </div>

            {detailBooking.guestIdCard && (
              <div>
                <div className="text-xs text-brand-taupe mb-1">身份证号</div>
                <div className="font-medium text-brand-brown">{detailBooking.guestIdCard}</div>
              </div>
            )}

            {detailBooking.notes && (
              <div>
                <div className="text-xs text-brand-taupe mb-1">备注</div>
                <div className="p-3 bg-brand-beige/60 rounded-lg text-sm text-brand-brown">
                  {detailBooking.notes}
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

            <div className="flex items-center justify-between pt-4 border-t border-brand-brown/10">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${BookingStatusColors[detailBooking.status]}`}
              >
                {BookingStatusLabels[detailBooking.status]}
              </span>
              <div className="flex gap-2">
                {detailBooking.status === 'confirmed' && (
                  <button
                    onClick={() => handleStatusUpdate(detailBooking, 'checked-in')}
                    className="btn-primary !py-1.5 !px-4 text-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    办理入住
                  </button>
                )}
                {detailBooking.status === 'checked-in' && (
                  <button
                    onClick={() => handleStatusUpdate(detailBooking, 'checked-out')}
                    className="btn-primary !py-1.5 !px-4 text-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    办理退房
                  </button>
                )}
                {detailBooking.status !== 'cancelled' &&
                  detailBooking.status !== 'checked-out' && (
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
    </div>
  );
}
