import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Search, Filter, Phone, User, Calendar, XCircle, Building2, FileText, CreditCard, RefreshCw, AlertTriangle, Clock, CheckCircle2, TrendingUp, DollarSign } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { LongTermContract, LongTermContractStatus, RoomType, PaymentRecord } from '@/types';
import { LongTermContractStatusLabels, LongTermContractStatusColors, RoomTypeLabels, PaymentStatusLabels, PaymentStatusColors, normalizePhone } from '@/types';
import Badge from '@/components/Badge';
import ConfirmDialog from '@/components/ConfirmDialog';
import LongTermContractForm from './LongTermContractForm';
import Modal from '@/components/Modal';
import { formatDateDisplay, addMonthsStr } from '@/utils/date';

export default function LongTermContractList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    stores,
    rooms,
    addLongTermContract,
    updateLongTermContract,
    cancelLongTermContract,
    renewLongTermContract,
    getRoomById,
    getRoomsByStore,
    getLongTermContractsByStore,
    getStoreById,
    hasPermission,
    updatePaymentRecord,
    getContractExpiryInfo,
    getExpiringContracts,
    getOverduePayments,
    updateLongTermContractStatuses,
    updatePaymentRecordStatuses,
  } = useAppStore();

  const canCreate = hasPermission('longterm:create');
  const canUpdate = hasPermission('longterm:update');
  const canCancel = hasPermission('longterm:cancel');
  const canRenew = hasPermission('longterm:renew');

  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<LongTermContractStatus | 'all'>('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState<RoomType | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<LongTermContract | null>(null);
  const [cancelTarget, setCancelTarget] = useState<LongTermContract | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [detailContract, setDetailContract] = useState<LongTermContract | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentRecord, setPaymentRecord] = useState<PaymentRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [renewContract, setRenewContract] = useState<LongTermContract | null>(null);
  const [renewMonths, setRenewMonths] = useState(12);
  const [renewRent, setRenewRent] = useState(0);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new') {
      setEditingContract(null);
      setFormOpen(true);
      setSearchParams({});
    }
  }, [searchParams]);

  useEffect(() => {
    updateLongTermContractStatuses();
    updatePaymentRecordStatuses();
  }, [updateLongTermContractStatuses, updatePaymentRecordStatuses]);

  const filteredRooms = useMemo(() => {
    let list = getRoomsByStore(storeFilter);
    if (roomTypeFilter !== 'all') {
      list = list.filter((r) => r.type === roomTypeFilter);
    }
    return list;
  }, [storeFilter, roomTypeFilter, getRoomsByStore, rooms]);

  const storeContracts = useMemo(() => getLongTermContractsByStore(storeFilter), [storeFilter, getLongTermContractsByStore]);
  const expiringContracts = useMemo(() => getExpiringContracts(30, storeFilter), [getExpiringContracts, storeFilter]);
  const overduePayments = useMemo(() => getOverduePayments(storeFilter), [getOverduePayments, storeFilter]);

  const stats = useMemo(() => {
    const active = storeContracts.filter((c) => c.status === 'active' || c.status === 'expiring' || c.status === 'renewed').length;
    const expiring = expiringContracts.length;
    const overdue = overduePayments.length;
    const totalRevenue = storeContracts.reduce((sum, c) => sum + c.paidAmount, 0);
    return { active, expiring, overdue, totalRevenue };
  }, [storeContracts, expiringContracts, overduePayments]);

  const getRoomNumber = (roomId: string) => {
    const room = getRoomById(roomId);
    return room ? `${room.roomNumber} ${room.name}` : '未知房间';
  };

  const filteredContracts = storeContracts
    .filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (roomTypeFilter !== 'all') {
        const room = getRoomById(c.roomId);
        if (!room || room.type !== roomTypeFilter) return false;
      }
      if (search) {
        const lower = search.toLowerCase();
        const normalizedSearch = normalizePhone(search);
        const room = getRoomById(c.roomId);
        return (
          c.guestName.toLowerCase().includes(lower) ||
          c.guestPhone.includes(search) ||
          (normalizedSearch && c.guestPhone.includes(normalizedSearch)) ||
          (room?.roomNumber.includes(search) ?? false) ||
          (room?.name.toLowerCase().includes(lower) ?? false)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const order: Record<string, number> = { expiring: 0, active: 1, renewed: 2, expired: 3, cancelled: 4 };
      const statusOrder = (order[a.status] ?? 99) - (order[b.status] ?? 99);
      if (statusOrder !== 0) return statusOrder;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });

  const handleAdd = () => {
    setEditingContract(null);
    setFormOpen(true);
  };

  const handleEdit = (contract: LongTermContract) => {
    setEditingContract(contract);
    setFormOpen(true);
  };

  const handleCancelClick = (contract: LongTermContract) => {
    setCancelTarget(contract);
    setCancelReason('');
  };

  const handleCancelConfirm = () => {
    if (cancelTarget) {
      cancelLongTermContract(cancelTarget.id, cancelReason || '双方协商');
    }
    setCancelTarget(null);
    setCancelReason('');
  };

  const handleSubmit = (
    data: Parameters<typeof addLongTermContract>[0],
    isEdit: boolean
  ): boolean => {
    if (isEdit && editingContract) {
      return updateLongTermContract(editingContract.id, data);
    }
    return addLongTermContract(data);
  };

  const handleOpenPayment = (contract: LongTermContract, record: PaymentRecord) => {
    setDetailContract(contract);
    setPaymentRecord(record);
    setPaymentAmount(record.amount - record.paidAmount);
    setPaymentMethod('');
    setPaymentNotes('');
    setPaymentModalOpen(true);
  };

  const handlePaymentSubmit = () => {
    if (detailContract && paymentRecord) {
      updatePaymentRecord(detailContract.id, paymentRecord.id, paymentAmount, paymentMethod || undefined, paymentNotes || undefined);
      setPaymentModalOpen(false);
      setDetailContract(null);
      setPaymentRecord(null);
    }
  };

  const handleOpenRenew = (contract: LongTermContract) => {
    setRenewContract(contract);
    setRenewMonths(12);
    setRenewRent(contract.monthlyRent);
    setRenewModalOpen(true);
  };

  const handleRenewConfirm = () => {
    if (renewContract && canRenew) {
      const result = renewLongTermContract(renewContract.id, renewMonths, renewRent);
      if (result) {
        setRenewModalOpen(false);
        setRenewContract(null);
      }
    }
  };

  const expiryBadge = (contract: LongTermContract) => {
    const info = getContractExpiryInfo(contract.id);
    if (!info || info.alertLevel === 'none') return null;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
        info.alertLevel === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
      }`}>
        <AlertTriangle className="w-3 h-3" />
        {info.message}
      </span>
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-brown">长租合同管理</h1>
          <p className="text-brand-taupe mt-1">管理长租合同、按月计费与续签提醒</p>
        </div>
        {canCreate && (
          <button onClick={handleAdd} className="btn-primary">
            <Plus className="w-4 h-4" />
            新建合同
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card-base p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-brand-taupe">履行中合同</p>
              <p className="font-display text-3xl font-bold text-brand-brown mt-2">{stats.active}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-brand-sage/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-brand-green" />
            </div>
          </div>
        </div>
        <div className="card-base p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-brand-taupe">即将到期（30天内）</p>
              <p className={`font-display text-3xl font-bold mt-2 ${stats.expiring > 0 ? 'text-amber-600' : 'text-brand-brown'}`}>{stats.expiring}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="card-base p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-brand-taupe">逾期租金</p>
              <p className={`font-display text-3xl font-bold mt-2 ${stats.overdue > 0 ? 'text-red-600' : 'text-brand-brown'}`}>{stats.overdue}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
        <div className="card-base p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-brand-taupe">累计收款</p>
              <p className="font-display text-3xl font-bold text-brand-orange mt-2">¥{stats.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-brand-orange/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-brand-orange" />
            </div>
          </div>
        </div>
      </div>

      {(expiringContracts.length > 0 || overduePayments.length > 0) && (
        <div className="card-base p-6 mb-5 border-l-4 border-amber-400">
          <h2 className="font-display text-lg font-semibold text-brand-brown mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            续签与收款提醒
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {expiringContracts.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-amber-700 mb-3 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  即将到期合同 ({expiringContracts.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {expiringContracts.slice(0, 10).map((c) => {
                    const info = getContractExpiryInfo(c.id);
                    const room = getRoomById(c.roomId);
                    const isUrgent = info?.alertLevel === 'urgent';
                    return (
                      <div
                        key={c.id}
                        className={`p-3 rounded-lg border flex items-center justify-between ${
                          isUrgent ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isUrgent ? 'bg-red-100' : 'bg-amber-100'
                          }`}>
                            <FileText className={`w-4 h-4 ${isUrgent ? 'text-red-600' : 'text-amber-600'}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-brand-brown text-sm truncate">
                              {room?.roomNumber} {c.guestName}
                            </div>
                            <div className="text-xs text-brand-taupe">
                              到期：{formatDateDisplay(c.endDate)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            isUrgent ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {info?.daysRemaining}天
                          </span>
                          {canRenew && isUrgent && (
                            <button
                              onClick={() => handleOpenRenew(c)}
                              className="text-xs px-2 py-1 rounded-lg bg-brand-green/20 text-brand-green hover:bg-brand-green/30 transition-colors flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" />
                              续签
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {overduePayments.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-red-700 mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  逾期待收租金 ({overduePayments.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {overduePayments.slice(0, 10).map((p) => {
                    const contract = storeContracts.find((c) => c.id === p.contractId);
                    if (!contract) return null;
                    const room = getRoomById(contract.roomId);
                    return (
                      <div
                        key={p.id}
                        className="p-3 rounded-lg border bg-red-50 border-red-200 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                            <CreditCard className="w-4 h-4 text-red-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-brand-brown text-sm truncate">
                              {room?.roomNumber} {contract.guestName}
                            </div>
                            <div className="text-xs text-brand-taupe">
                              {p.period} · 应收 ¥{p.amount} · 已收 ¥{p.paidAmount}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium flex-shrink-0">
                          逾期
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
              onChange={(e) => setStoreFilter(e.target.value)}
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
              onChange={(e) => setStatusFilter(e.target.value as LongTermContractStatus | 'all')}
            >
              <option value="all">全部状态</option>
              {(Object.keys(LongTermContractStatusLabels) as LongTermContractStatus[]).map((s) => (
                <option key={s} value={s}>
                  {LongTermContractStatusLabels[s]}
                </option>
              ))}
            </select>
            <select
              className="input-base !w-auto"
              value={roomTypeFilter}
              onChange={(e) => setRoomTypeFilter(e.target.value as RoomType | 'all')}
            >
              <option value="all">全部房型</option>
              {(Object.keys(RoomTypeLabels) as RoomType[]).map((t) => (
                <option key={t} value={t}>
                  {RoomTypeLabels[t]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card-base overflow-hidden">
        {filteredContracts.length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="w-16 h-16 mx-auto text-brand-brown/30 mb-4" />
            <h3 className="font-display text-lg text-brand-brown mb-2">暂无长租合同</h3>
            {canCreate && (
              <>
                <p className="text-brand-taupe mb-6">点击上方按钮创建您的第一份长租合同</p>
                <button onClick={handleAdd} className="btn-primary">
                  <Plus className="w-4 h-4" />
                  新建合同
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-brand-beige/60">
                <tr>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">客人信息</th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">门店 / 房间</th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">合同期限</th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">月租/总额</th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">收款进度</th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">状态</th>
                  <th className="text-right text-sm font-medium text-brand-taupe px-5 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((c, idx) => {
                  const room = getRoomById(c.roomId);
                  const store = room ? getStoreById(room.storeId) : null;
                  const expiry = getContractExpiryInfo(c.id);

                  return (
                    <tr
                      key={c.id}
                      className={`border-t border-brand-brown/5 hover:bg-brand-beige/30 transition-colors ${
                        idx % 2 === 1 ? 'bg-brand-cream/50' : ''
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="cursor-pointer" onClick={() => setDetailContract(c)}>
                          <div className="font-medium text-brand-brown flex items-center gap-2">
                            <User className="w-4 h-4 text-brand-taupe" />
                            {c.guestName}
                            {c.renewCount > 0 && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                续签{c.renewCount}次
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-brand-taupe flex items-center gap-2 mt-1">
                            <Phone className="w-3.5 h-3.5" />
                            {c.guestPhone}
                          </div>
                          {expiryBadge(c)}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {store && (
                          <div className="text-xs text-brand-taupe flex items-center gap-1 mb-0.5">
                            <Building2 className="w-3 h-3" />
                            {store.name}
                          </div>
                        )}
                        <div className="font-medium text-brand-brown">{room?.roomNumber} {room?.name}</div>
                        <div className="text-xs text-brand-taupe">{room && RoomTypeLabels[room.type]}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 text-sm text-brand-brown">
                          <Calendar className="w-3.5 h-3.5 text-brand-taupe" />
                          {formatDateDisplay(c.startDate)}
                        </div>
                        <div className="text-xs text-brand-taupe mt-0.5 ml-4.5">
                          至 {formatDateDisplay(c.endDate)}（{c.months}个月）
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-brand-brown">¥{c.monthlyRent.toLocaleString()}/月</div>
                        <div className="font-display font-bold text-brand-orange">¥{c.totalAmount.toLocaleString()}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-brand-brown">¥{c.paidAmount.toLocaleString()} / ¥{c.totalAmount.toLocaleString()}</div>
                        <div className="w-full bg-brand-beige rounded-full h-2 mt-1.5">
                          <div
                            className={`h-2 rounded-full ${
                              c.paidAmount >= c.totalAmount
                                ? 'bg-brand-green'
                                : c.paidAmount > 0
                                ? 'bg-brand-orange'
                                : 'bg-gray-300'
                            }`}
                            style={{ width: `${Math.min(100, (c.paidAmount / c.totalAmount) * 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-brand-taupe mt-1">
                          {Math.round((c.paidAmount / c.totalAmount) * 100)}% 已收
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${LongTermContractStatusColors[c.status]}`}
                        >
                          {LongTermContractStatusLabels[c.status]}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDetailContract(c)}
                            className="p-2 rounded-lg text-brand-taupe hover:bg-brand-beige hover:text-brand-brown transition-colors"
                            title="查看详情"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                          {c.status !== 'cancelled' && c.status !== 'expired' && (
                            <>
                              <button
                                onClick={() => handleOpenPayment(c, c.paymentRecords.find(p => p.status !== 'paid') || c.paymentRecords[c.paymentRecords.length - 1])}
                                className="p-2 rounded-lg text-brand-taupe hover:bg-brand-sage/20 hover:text-brand-green transition-colors"
                                title="收款管理"
                              >
                                <CreditCard className="w-4 h-4" />
                              </button>
                              {(c.status === 'active' || c.status === 'expiring') && canRenew && (
                                <button
                                  onClick={() => handleOpenRenew(c)}
                                  className="p-2 rounded-lg text-brand-taupe hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                  title="续签合同"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              )}
                              {canUpdate && (
                                <button
                                  onClick={() => handleEdit(c)}
                                  className="p-2 rounded-lg text-brand-taupe hover:bg-brand-beige hover:text-brand-brown transition-colors"
                                  title="编辑"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              {canCancel && (
                                <button
                                  onClick={() => handleCancelClick(c)}
                                  className="p-2 rounded-lg text-brand-taupe hover:bg-red-50 hover:text-red-500 transition-colors"
                                  title="取消合同"
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

      <LongTermContractForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        contract={editingContract}
      />

      <Modal
        open={!!detailContract && !paymentModalOpen}
        onClose={() => {
          setDetailContract(null);
        }}
        title="合同详情"
        size="lg"
      >
        {detailContract && (
          <div className="space-y-5">
            {(() => {
              const room = getRoomById(detailContract.roomId);
              const store = room ? getStoreById(room.storeId) : null;
              const expiry = getContractExpiryInfo(detailContract.id);
              return (
                <>
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-display text-xl font-semibold text-brand-brown">{detailContract.guestName}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${LongTermContractStatusColors[detailContract.status]}`}>
                          {LongTermContractStatusLabels[detailContract.status]}
                        </span>
                        {detailContract.renewCount > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                            已续签{detailContract.renewCount}次
                          </span>
                        )}
                      </div>
                      {expiry && expiry.alertLevel !== 'none' && (
                        <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${
                          expiry.alertLevel === 'urgent' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          <AlertTriangle className="w-4 h-4" />
                          {expiry.message}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {(detailContract.status === 'active' || detailContract.status === 'expiring') && canRenew && (
                        <button
                          onClick={() => {
                            handleOpenRenew(detailContract);
                            setDetailContract(null);
                          }}
                          className="btn-secondary !py-1.5 !px-3 text-sm"
                        >
                          <RefreshCw className="w-4 h-4" />
                          续签
                        </button>
                      )}
                      {detailContract.status !== 'cancelled' && detailContract.status !== 'expired' && canUpdate && (
                        <button
                          onClick={() => {
                            handleEdit(detailContract);
                            setDetailContract(null);
                          }}
                          className="btn-secondary !py-1.5 !px-3 text-sm"
                        >
                          <Pencil className="w-4 h-4" />
                          编辑
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-brand-brown/10">
                    <div>
                      <div className="text-xs text-brand-taupe mb-1">联系电话</div>
                      <div className="font-medium text-brand-brown flex items-center gap-2">
                        <Phone className="w-4 h-4 text-brand-taupe" />
                        {detailContract.guestPhone}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-brand-taupe mb-1">身份证号</div>
                      <div className="font-medium text-brand-brown">{detailContract.guestIdCard || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-brand-taupe mb-1">门店</div>
                      <div className="font-medium text-brand-brown">{store?.name || '未知'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-brand-taupe mb-1">房间</div>
                      <div className="font-medium text-brand-brown">{room?.roomNumber} {room?.name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-brand-taupe mb-1">合同起期</div>
                      <div className="font-medium text-brand-brown">{formatDateDisplay(detailContract.startDate)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-brand-taupe mb-1">合同止期</div>
                      <div className="font-medium text-brand-brown">{formatDateDisplay(detailContract.endDate)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-brand-taupe mb-1">月租金额</div>
                      <div className="font-display font-bold text-brand-orange text-lg">¥{detailContract.monthlyRent.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-brand-taupe mb-1">合同总额</div>
                      <div className="font-display font-bold text-brand-brown text-lg">¥{detailContract.totalAmount.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-brand-taupe mb-1">押金</div>
                      <div className="font-medium text-brand-brown">¥{detailContract.deposit.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-brand-taupe mb-1">已收金额</div>
                      <div className="font-medium text-brand-green">¥{detailContract.paidAmount.toLocaleString()}</div>
                    </div>
                  </div>

                  {detailContract.notes && (
                    <div className="p-3 bg-brand-beige/60 rounded-lg">
                      <div className="text-xs text-brand-taupe mb-1">备注</div>
                      <div className="text-sm text-brand-brown">{detailContract.notes}</div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-brand-brown/10">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-brand-brown">付款记录（按月）</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>已付</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>待付</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>逾期</span>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {detailContract.paymentRecords.map((p) => (
                        <div
                          key={p.id}
                          className={`p-3 rounded-lg border flex items-center justify-between ${
                            p.status === 'paid'
                              ? 'bg-green-50 border-green-200'
                              : p.status === 'overdue'
                              ? 'bg-red-50 border-red-200'
                              : p.status === 'partial'
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-amber-50 border-amber-200'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-brand-brown">{p.period}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${PaymentStatusColors[p.status]}`}>
                                {PaymentStatusLabels[p.status]}
                              </span>
                            </div>
                            <div className="text-xs text-brand-taupe mt-1">
                              应付日：{formatDateDisplay(p.dueDate)} · 金额：¥{p.amount.toLocaleString()}
                            </div>
                            {p.paidAmount > 0 && (
                              <div className="text-xs text-brand-taupe mt-0.5">
                                已付：¥{p.paidAmount.toLocaleString()}
                                {p.paymentMethod && ` · 方式：${p.paymentMethod}`}
                                {p.paidAt && ` · 时间：${formatDateDisplay(p.paidAt)}`}
                              </div>
                            )}
                            {p.notes && (
                              <div className="text-xs text-brand-taupe mt-0.5">备注：{p.notes}</div>
                            )}
                          </div>
                          {p.status !== 'paid' && detailContract.status !== 'cancelled' && detailContract.status !== 'expired' && canUpdate && (
                            <button
                              onClick={() => handleOpenPayment(detailContract, p)}
                              className="btn-primary !py-1 !px-3 text-xs ml-3"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              登记收款
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {detailContract.status === 'cancelled' && detailContract.cancelReason && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-xs text-red-700 font-medium mb-1">取消原因</div>
                      <div className="text-sm text-red-600">{detailContract.cancelReason}</div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </Modal>

      <Modal
        open={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setPaymentRecord(null);
        }}
        title="登记收款"
        size="sm"
      >
        <div className="space-y-4">
          {paymentRecord && detailContract && (
            <>
              <div className="p-4 bg-brand-beige/60 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-brand-taupe">租客</span>
                  <span className="font-medium text-brand-brown">{detailContract.guestName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-brand-taupe">账期</span>
                  <span className="font-medium text-brand-brown">{paymentRecord.period}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-brand-taupe">应付日期</span>
                  <span className="font-medium text-brand-brown">{formatDateDisplay(paymentRecord.dueDate)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-brand-brown/10">
                  <span className="text-brand-taupe">本期应付</span>
                  <span className="font-display font-bold text-brand-orange text-lg">¥{paymentRecord.amount.toLocaleString()}</span>
                </div>
                {paymentRecord.paidAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-taupe">已付</span>
                    <span className="font-medium text-brand-green">¥{paymentRecord.paidAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="label-base">
                  本次收款金额
                  {paymentRecord.paidAmount > 0 && `（剩余 ¥${(paymentRecord.amount - paymentRecord.paidAmount).toLocaleString()}）`}
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-taupe" />
                  <input
                    type="number"
                    min={0}
                    max={paymentRecord.amount - paymentRecord.paidAmount}
                    className="input-base pl-10"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Math.max(0, Math.min(paymentRecord.amount - paymentRecord.paidAmount, Number(e.target.value))))}
                  />
                </div>
                <div className="flex gap-2 mt-1">
                  {[0.25, 0.5, 1].map((ratio) => {
                    const amt = Math.round((paymentRecord.amount - paymentRecord.paidAmount) * ratio);
                    if (amt <= 0) return null;
                    return (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setPaymentAmount(amt)}
                        className="text-xs px-2 py-0.5 rounded bg-brand-beige text-brand-taupe hover:bg-brand-sage/30 transition-colors"
                      >
                        {ratio === 1 ? '全额' : `${ratio * 100}%`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="label-base">收款方式</label>
                <select
                  className="input-base"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="">请选择</option>
                  <option value="银行转账">银行转账</option>
                  <option value="微信支付">微信支付</option>
                  <option value="支付宝">支付宝</option>
                  <option value="现金">现金</option>
                  <option value="POS刷卡">POS刷卡</option>
                </select>
              </div>

              <div>
                <label className="label-base">备注</label>
                <textarea
                  className="input-base resize-none"
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="可选..."
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-brand-brown/10">
            <button
              onClick={() => {
                setPaymentModalOpen(false);
                setPaymentRecord(null);
              }}
              className="btn-secondary"
            >
              取消
            </button>
            <button
              onClick={handlePaymentSubmit}
              disabled={paymentAmount <= 0}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              确认收款
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={renewModalOpen}
        onClose={() => {
          setRenewModalOpen(false);
          setRenewContract(null);
        }}
        title="续签合同"
        size="sm"
      >
        <div className="space-y-4">
          {renewContract && (
            <>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700/70">租客</span>
                  <span className="font-medium text-brand-brown">{renewContract.guestName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700/70">当前合同到期</span>
                  <span className="font-medium text-brand-brown">{formatDateDisplay(renewContract.endDate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700/70">当前月租</span>
                  <span className="font-display font-bold text-brand-orange">¥{renewContract.monthlyRent.toLocaleString()}/月</span>
                </div>
              </div>

              <div>
                <label className="label-base">续签期限（月）</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    className="input-base flex-1"
                    value={renewMonths}
                    onChange={(e) => setRenewMonths(Math.max(1, Number(e.target.value)))}
                  />
                  <span className="text-brand-taupe">个月</span>
                </div>
                <div className="flex gap-2 mt-1">
                  {[3, 6, 12, 24].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setRenewMonths(m)}
                      className="text-xs px-2 py-0.5 rounded bg-brand-beige text-brand-taupe hover:bg-brand-sage/30 transition-colors"
                    >
                      {m}个月
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label-base">新月租金额（元）</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-taupe" />
                  <input
                    type="number"
                    min={0}
                    className="input-base pl-10"
                    value={renewRent}
                    onChange={(e) => setRenewRent(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="p-4 bg-brand-beige/60 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-brand-taupe">续签起期</span>
                  <span className="font-medium text-brand-brown">{formatDateDisplay(renewContract.endDate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-brand-taupe">续签止期</span>
                  <span className="font-medium text-brand-brown">{formatDateDisplay(addMonthsStr(renewContract.endDate, renewMonths))}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-brand-brown/10">
                  <span className="text-brand-taupe">续签合同总额</span>
                  <span className="font-display font-bold text-xl text-brand-orange">¥{(renewRent * renewMonths).toLocaleString()}</span>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-brand-brown/10">
            <button
              onClick={() => {
                setRenewModalOpen(false);
                setRenewContract(null);
              }}
              className="btn-secondary"
            >
              取消
            </button>
            <button
              onClick={handleRenewConfirm}
              disabled={renewMonths <= 0 || renewRent <= 0}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-4 h-4" />
              确认续签
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!cancelTarget}
        title="取消合同"
        message={`确认要取消 ${cancelTarget?.guestName} 的长租合同吗？\n房间：${cancelTarget && getRoomNumber(cancelTarget.roomId)}\n租期：${cancelTarget?.startDate} ~ ${cancelTarget?.endDate}`}
        confirmText="确认取消"
        variant="danger"
        showCancelReason={true}
        cancelReason={cancelReason}
        onCancelReasonChange={setCancelReason}
        onConfirm={handleCancelConfirm}
        onClose={() => {
          setCancelTarget(null);
          setCancelReason('');
        }}
      />
    </div>
  );
}
