import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  Phone,
  User,
  Calendar,
  XCircle,
  CheckCircle2,
  ListTodo,
  Clock,
  Building2,
  Zap,
  Bell,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { WaitlistEntry, WaitlistStatus, RoomType } from '@/types';
import {
  WaitlistStatusLabels,
  WaitlistStatusColors,
  RoomTypeLabels,
  normalizePhone,
} from '@/types';
import Badge from '@/components/Badge';
import ConfirmDialog from '@/components/ConfirmDialog';
import Modal from '@/components/Modal';
import { formatDateDisplay, calculateNights } from '@/utils/date';

export default function WaitlistList() {
  const navigate = useNavigate();
  const {
    stores,
    rooms,
    getRoomById,
    getRoomsByStore,
    getWaitlistByStore,
    getStoreById,
    cancelWaitlistEntry,
    confirmWaitlistBooking,
    matchWaitlistToAvailability,
    updateWaitlistEntry,
    hasPermission,
    expireOldWaitlistEntries,
    waitlistNotifications,
    markNotificationRead,
  } = useAppStore();

  const canCreateWaitlist = hasPermission('waitlist:create');
  const canUpdateWaitlist = hasPermission('waitlist:update');
  const canCancelWaitlist = hasPermission('waitlist:cancel');
  const canConfirmWaitlist = hasPermission('waitlist:confirm');

  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<WaitlistStatus | 'all'>('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState<RoomType | 'all'>('all');
  const [roomIdFilter, setRoomIdFilter] = useState<string>('all');
  const [cancelTarget, setCancelTarget] = useState<WaitlistEntry | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [detailEntry, setDetailEntry] = useState<WaitlistEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<WaitlistEntry | null>(null);
  const [editForm, setEditForm] = useState({
    checkIn: '',
    checkOut: '',
    guests: 2,
    notes: '',
  });
  const [notifOpen, setNotifOpen] = useState(false);
  const [matchResult, setMatchResult] = useState<WaitlistEntry[] | null>(null);

  const filteredRooms = useMemo(() => {
    let list = getRoomsByStore(storeFilter);
    if (roomTypeFilter !== 'all') {
      list = list.filter((r) => r.type === roomTypeFilter);
    }
    return list;
  }, [storeFilter, roomTypeFilter, getRoomsByStore, rooms]);

  const storeWaitlist = useMemo(() => {
    expireOldWaitlistEntries();
    return getWaitlistByStore(storeFilter);
  }, [storeFilter, getWaitlistByStore, expireOldWaitlistEntries]);

  const getRoomNumber = (roomId: string) => {
    const room = getRoomById(roomId);
    return room ? `${room.roomNumber} ${room.name}` : '未知房间';
  };

  const filteredEntries = storeWaitlist
    .filter((w) => {
      if (statusFilter !== 'all' && w.status !== statusFilter) return false;
      if (roomTypeFilter !== 'all') {
        const room = getRoomById(w.roomId);
        if (!room || room.type !== roomTypeFilter) return false;
      }
      if (roomIdFilter !== 'all' && w.roomId !== roomIdFilter) return false;
      if (search) {
        const lower = search.toLowerCase();
        const normalizedSearch = normalizePhone(search);
        const room = getRoomById(w.roomId);
        return (
          w.guestName.toLowerCase().includes(lower) ||
          w.guestPhone.includes(search) ||
          (normalizedSearch && w.guestPhone.includes(normalizedSearch)) ||
          (room?.roomNumber.includes(search) ?? false) ||
          (room?.name.toLowerCase().includes(lower) ?? false)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (a.status !== b.status) {
        const order = { matched: 0, waiting: 1, confirmed: 2, cancelled: 3, expired: 4 };
        return order[a.status] - order[b.status];
      }
      return a.priority - b.priority || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  const handleStoreChange = (value: string) => {
    setStoreFilter(value);
    setRoomIdFilter('all');
  };

  const handleRoomTypeChange = (value: RoomType | 'all') => {
    setRoomTypeFilter(value);
    setRoomIdFilter('all');
  };

  const handleEdit = (entry: WaitlistEntry) => {
    setEditingEntry(entry);
    setEditForm({
      checkIn: entry.checkIn,
      checkOut: entry.checkOut,
      guests: entry.guests,
      notes: entry.notes || '',
    });
  };

  const handleEditSubmit = () => {
    if (!editingEntry) return;
    updateWaitlistEntry(editingEntry.id, editForm);
    setEditingEntry(null);
  };

  const handleCancelClick = (entry: WaitlistEntry) => {
    setCancelTarget(entry);
    setCancelReason('');
  };

  const handleCancelConfirm = () => {
    if (cancelTarget) {
      cancelWaitlistEntry(cancelTarget.id, cancelReason || '客人取消');
    }
    setCancelTarget(null);
    setCancelReason('');
  };

  const handleConfirm = (entry: WaitlistEntry) => {
    const booking = confirmWaitlistBooking(entry.id);
    if (booking) {
      setDetailEntry(null);
      navigate(`/bookings?search=${booking.guestPhone}`);
    }
  };

  const handleRunMatch = () => {
    const matched = matchWaitlistToAvailability();
    setMatchResult(matched);
  };

  const stats = useMemo(() => {
    const waiting = storeWaitlist.filter((w) => w.status === 'waiting').length;
    const matched = storeWaitlist.filter((w) => w.status === 'matched').length;
    const confirmed = storeWaitlist.filter((w) => w.status === 'confirmed').length;
    return { waiting, matched, confirmed, total: storeWaitlist.length };
  }, [storeWaitlist]);

  const unreadNotifs = waitlistNotifications.filter((n) => !n.read);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-brown">候补队列管理</h1>
          <p className="text-brand-taupe mt-1">管理满房候补登记，自动匹配空房通知客人</p>
        </div>
        <div className="flex items-center gap-3">
          {canConfirmWaitlist && (
            <button
              onClick={handleRunMatch}
              className="btn-secondary"
              title="扫描候补队列，匹配当前可用空房"
            >
              <Zap className="w-4 h-4" />
              执行匹配
            </button>
          )}
          <button
            onClick={() => setNotifOpen(true)}
            className="relative btn-secondary"
            title="查看匹配通知"
          >
            <Bell className="w-4 h-4" />
            通知
            {unreadNotifs.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                {unreadNotifs.length > 9 ? '9+' : unreadNotifs.length}
              </span>
            )}
          </button>
          {canCreateWaitlist && (
            <button onClick={() => navigate('/bookings?action=new')} className="btn-primary">
              <Plus className="w-4 h-4" />
              新增候补
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card-base p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-brand-taupe">等待中</div>
              <div className="font-display text-2xl font-bold text-amber-600 mt-1">{stats.waiting}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="card-base p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-brand-taupe">已匹配待确认</div>
              <div className="font-display text-2xl font-bold text-blue-600 mt-1">{stats.matched}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="card-base p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-brand-taupe">已确认预订</div>
              <div className="font-display text-2xl font-bold text-green-600 mt-1">{stats.confirmed}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="card-base p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-brand-taupe">候补总数</div>
              <div className="font-display text-2xl font-bold text-brand-brown mt-1">{stats.total}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-brand-beige flex items-center justify-center">
              <ListTodo className="w-5 h-5 text-brand-brown" />
            </div>
          </div>
        </div>
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
              onChange={(e) => setStatusFilter(e.target.value as WaitlistStatus | 'all')}
            >
              <option value="all">全部状态</option>
              {(Object.keys(WaitlistStatusLabels) as WaitlistStatus[]).map((s) => (
                <option key={s} value={s}>
                  {WaitlistStatusLabels[s]}
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
        {filteredEntries.length === 0 ? (
          <div className="p-16 text-center">
            <ListTodo className="w-16 h-16 mx-auto text-brand-brown/30 mb-4" />
            <h3 className="font-display text-lg text-brand-brown mb-2">暂无候补登记</h3>
            {canCreateWaitlist && (
              <>
                <p className="text-brand-taupe mb-6">当房间满房时，可将客人加入候补队列</p>
                <button onClick={() => navigate('/bookings?action=new')} className="btn-primary">
                  <Plus className="w-4 h-4" />
                  前往新增
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-brand-beige/60">
                <tr>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                    优先级 / 状态
                  </th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                    客人信息
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
                    晚数 / 人数
                  </th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                    匹配信息
                  </th>
                  <th className="text-right text-sm font-medium text-brand-taupe px-5 py-3">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((w, idx) => {
                  const room = getRoomById(w.roomId);
                  const store = room ? getStoreById(room.storeId) : null;
                  const matchedRoom = w.matchedRoomId ? getRoomById(w.matchedRoomId) : null;
                  const nights = calculateNights(w.checkIn, w.checkOut);

                  return (
                    <tr
                      key={w.id}
                      className={`border-t border-brand-brown/5 hover:bg-brand-beige/30 transition-colors ${
                        idx % 2 === 1 ? 'bg-brand-cream/50' : ''
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-brown/10 text-brand-brown text-sm font-bold">
                            #{w.priority}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${WaitlistStatusColors[w.status]}`}
                        >
                          {WaitlistStatusLabels[w.status]}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div
                          className="cursor-pointer"
                          onClick={() => setDetailEntry(w)}
                        >
                          <div className="font-medium text-brand-brown flex items-center gap-2">
                            <User className="w-4 h-4 text-brand-taupe" />
                            {w.guestName}
                          </div>
                          <div className="text-sm text-brand-taupe flex items-center gap-2 mt-1">
                            <Phone className="w-3.5 h-3.5" />
                            {w.guestPhone}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {store && (
                          <div className="text-xs text-brand-taupe flex items-center gap-1 mb-0.5">
                            <Building2 className="w-3 h-3" />
                            {store.name}
                          </div>
                        )}
                        <div className="font-medium text-brand-brown">
                          {room?.roomNumber} {room?.name}
                        </div>
                        <div className="text-xs text-brand-taupe">
                          {room && RoomTypeLabels[room.type]}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-brand-brown flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-brand-taupe" />
                          {formatDateDisplay(w.checkIn)}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-brand-brown flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-brand-taupe" />
                          {formatDateDisplay(w.checkOut)}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-brand-brown">{nights}晚</div>
                        <div className="text-xs text-brand-taupe">{w.guests}人</div>
                      </td>
                      <td className="px-5 py-4">
                        {matchedRoom ? (
                          <div>
                            <div className="text-sm font-medium text-blue-600">
                              已匹配: {matchedRoom.roomNumber}
                            </div>
                            {w.notifiedAt && (
                              <div className="text-xs text-brand-taupe mt-0.5">
                                通知于 {new Date(w.notifiedAt).toLocaleString('zh-CN')}
                              </div>
                            )}
                          </div>
                        ) : w.status === 'waiting' ? (
                          <span className="text-xs text-brand-taupe">等待空房...</span>
                        ) : w.status === 'confirmed' ? (
                          <span className="text-xs text-green-600">已转为预订</span>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDetailEntry(w)}
                            className="p-2 rounded-lg text-brand-taupe hover:bg-brand-beige hover:text-brand-brown transition-colors"
                            title="查看详情"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                          {w.status === 'waiting' && (
                            <>
                              {canUpdateWaitlist && (
                                <button
                                  onClick={() => handleEdit(w)}
                                  className="p-2 rounded-lg text-brand-taupe hover:bg-brand-beige hover:text-brand-brown transition-colors"
                                  title="编辑"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              {canCancelWaitlist && (
                                <button
                                  onClick={() => handleCancelClick(w)}
                                  className="p-2 rounded-lg text-brand-taupe hover:bg-red-50 hover:text-red-500 transition-colors"
                                  title="取消候补"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                          {w.status === 'matched' && canConfirmWaitlist && (
                            <button
                              onClick={() => handleConfirm(w)}
                              className="p-2 rounded-lg text-brand-taupe hover:bg-green-50 hover:text-green-600 transition-colors"
                              title="确认预订"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
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

      <Modal
        open={!!cancelTarget}
        onClose={() => {
          setCancelTarget(null);
          setCancelReason('');
        }}
        title="取消候补登记"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="text-sm text-red-600">
              确认要取消 {cancelTarget?.guestName} 的候补登记吗？
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
        open={!!detailEntry}
        onClose={() => setDetailEntry(null)}
        title="候补详情"
        size="md"
      >
        {detailEntry && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-brown/10 text-brand-brown font-bold">
                #{detailEntry.priority}
              </span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${WaitlistStatusColors[detailEntry.status]}`}
              >
                {WaitlistStatusLabels[detailEntry.status]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-brand-taupe mb-1">客人姓名</div>
                <div className="font-medium text-brand-brown flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-taupe" />
                  {detailEntry.guestName}
                </div>
              </div>
              <div>
                <div className="text-xs text-brand-taupe mb-1">联系电话</div>
                <div className="font-medium text-brand-brown flex items-center gap-2">
                  <Phone className="w-4 h-4 text-brand-taupe" />
                  {detailEntry.guestPhone}
                </div>
              </div>
              <div>
                <div className="text-xs text-brand-taupe mb-1">意向房间</div>
                <div className="font-medium text-brand-brown">
                  {getRoomNumber(detailEntry.roomId)}
                </div>
              </div>
              <div>
                <div className="text-xs text-brand-taupe mb-1">入住人数</div>
                <div className="font-medium text-brand-brown">{detailEntry.guests} 人</div>
              </div>
              <div>
                <div className="text-xs text-brand-taupe mb-1">入住日期</div>
                <div className="font-medium text-brand-brown flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-green" />
                  {formatDateDisplay(detailEntry.checkIn)}
                </div>
              </div>
              <div>
                <div className="text-xs text-brand-taupe mb-1">退房日期</div>
                <div className="font-medium text-brand-brown flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-orange" />
                  {formatDateDisplay(detailEntry.checkOut)}
                </div>
              </div>
              <div>
                <div className="text-xs text-brand-taupe mb-1">入住晚数</div>
                <div className="font-medium text-brand-brown">
                  {calculateNights(detailEntry.checkIn, detailEntry.checkOut)} 晚
                </div>
              </div>
              <div>
                <div className="text-xs text-brand-taupe mb-1">登记时间</div>
                <div className="font-medium text-brand-brown text-sm">
                  {new Date(detailEntry.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>

            {detailEntry.guestIdCard && (
              <div>
                <div className="text-xs text-brand-taupe mb-1">身份证号</div>
                <div className="font-medium text-brand-brown">{detailEntry.guestIdCard}</div>
              </div>
            )}

            {detailEntry.matchedRoomId && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  匹配信息
                </div>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>匹配房间：{getRoomNumber(detailEntry.matchedRoomId)}</div>
                  {detailEntry.notifiedAt && (
                    <div>通知时间：{new Date(detailEntry.notifiedAt).toLocaleString('zh-CN')}</div>
                  )}
                </div>
              </div>
            )}

            {detailEntry.notes && (
              <div>
                <div className="text-xs text-brand-taupe mb-1">备注</div>
                <div className="p-3 bg-brand-beige/60 rounded-lg text-sm text-brand-brown">
                  {detailEntry.notes}
                </div>
              </div>
            )}

            {detailEntry.status === 'cancelled' && detailEntry.cancelReason && (
              <div>
                <div className="text-xs text-brand-taupe mb-1">取消原因</div>
                <div className="p-3 bg-red-50 rounded-lg text-sm text-red-600">
                  {detailEntry.cancelReason}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-brand-brown/10">
              {detailEntry.status === 'matched' && canConfirmWaitlist && (
                <button
                  onClick={() => handleConfirm(detailEntry)}
                  className="btn-primary !py-1.5 !px-4 text-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  确认预订
                </button>
              )}
              {detailEntry.status === 'waiting' && canUpdateWaitlist && (
                <button
                  onClick={() => {
                    handleEdit(detailEntry);
                    setDetailEntry(null);
                  }}
                  className="btn-secondary !py-1.5 !px-4 text-sm"
                >
                  <Pencil className="w-4 h-4" />
                  编辑
                </button>
              )}
              {detailEntry.status === 'waiting' && canCancelWaitlist && (
                <button
                  onClick={() => {
                    handleCancelClick(detailEntry);
                    setDetailEntry(null);
                  }}
                  className="btn-danger !py-1.5 !px-4 text-sm"
                >
                  <XCircle className="w-4 h-4" />
                  取消候补
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        title="编辑候补登记"
        size="md"
      >
        {editingEntry && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-base">入住日期</label>
                <input
                  type="date"
                  className="input-base"
                  value={editForm.checkIn}
                  onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })}
                />
              </div>
              <div>
                <label className="label-base">退房日期</label>
                <input
                  type="date"
                  className="input-base"
                  value={editForm.checkOut}
                  onChange={(e) => setEditForm({ ...editForm, checkOut: e.target.value })}
                />
              </div>
              <div>
                <label className="label-base">入住人数</label>
                <input
                  type="number"
                  min={1}
                  className="input-base"
                  value={editForm.guests}
                  onChange={(e) => setEditForm({ ...editForm, guests: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="label-base">备注</label>
              <textarea
                className="input-base resize-none"
                rows={3}
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="特殊需求等..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-brand-brown/10">
              <button onClick={() => setEditingEntry(null)} className="btn-secondary">
                取消
              </button>
              <button onClick={handleEditSubmit} className="btn-primary">
                保存修改
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!matchResult}
        onClose={() => setMatchResult(null)}
        title="匹配结果"
        size="md"
      >
        <div className="space-y-4">
          {matchResult && matchResult.length > 0 ? (
            <>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-sm font-medium text-green-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  成功匹配 {matchResult.length} 条候补登记
                </div>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {matchResult.map((w) => {
                  const matchedRoom = w.matchedRoomId ? getRoomById(w.matchedRoomId) : null;
                  return (
                    <div
                      key={w.id}
                      className="p-3 bg-brand-beige/40 rounded-lg border border-brand-brown/10"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-brand-brown">{w.guestName}</div>
                          <div className="text-xs text-brand-taupe mt-0.5">
                            {formatDateDisplay(w.checkIn)} ~ {formatDateDisplay(w.checkOut)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-blue-600">
                            {matchedRoom?.roomNumber || '-'}
                          </div>
                          <div className="text-xs text-brand-taupe mt-0.5">
                            优先级 #{w.priority}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="p-8 text-center">
              <ListTodo className="w-12 h-12 mx-auto text-brand-brown/30 mb-3" />
              <div className="text-brand-brown font-medium">暂无匹配结果</div>
              <div className="text-sm text-brand-taupe mt-1">
                当前没有可匹配的候补登记或没有可用空房
              </div>
            </div>
          )}
          <div className="flex justify-end pt-2 border-t border-brand-brown/10">
            <button onClick={() => setMatchResult(null)} className="btn-primary">
              确定
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        title="候补匹配通知"
        size="lg"
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {waitlistNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-12 h-12 mx-auto text-brand-brown/30 mb-3" />
              <div className="text-brand-taupe">暂无通知消息</div>
            </div>
          ) : (
            waitlistNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  n.read
                    ? 'bg-white border-brand-brown/10'
                    : 'bg-blue-50 border-blue-200 hover:bg-blue-100/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      )}
                      <span className="font-medium text-brand-brown">{n.guestName}</span>
                      <span className="text-xs text-brand-taupe">{n.guestPhone}</span>
                    </div>
                    <p className="text-sm text-brand-taupe leading-relaxed">{n.message}</p>
                    {n.totalPrice !== undefined && n.roomNumber && (
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <span className="text-brand-brown">
                          房间：<span className="font-medium">{n.roomNumber}</span>
                        </span>
                        <span className="text-brand-orange font-display font-bold">
                          ¥{n.totalPrice}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-brand-taupe whitespace-nowrap">
                    {new Date(n.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
