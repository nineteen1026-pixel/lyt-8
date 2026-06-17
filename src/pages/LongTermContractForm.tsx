import { useState, useEffect, useMemo } from 'react';
import type { LongTermContract } from '@/types';
import Modal from '@/components/Modal';
import { useAppStore } from '@/store/useAppStore';
import { todayStr, calculateMonths, addMonthsStr } from '@/utils/date';
import { Building2, AlertCircle, User, Phone, CreditCard, FileText, Calendar } from 'lucide-react';

interface LongTermContractFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    data: Omit<LongTermContract, 'id' | 'createdAt' | 'updatedAt' | 'paymentRecords' | 'status' | 'paidAmount' | 'totalAmount' | 'months' | 'endDate' | 'renewCount'> & { endDate?: string; months?: number },
    isEdit: boolean
  ) => boolean;
  contract?: LongTermContract | null;
  prefillRoomId?: string;
  prefillStartDate?: string;
}

export default function LongTermContractForm({
  open,
  onClose,
  onSubmit,
  contract,
  prefillRoomId,
  prefillStartDate,
}: LongTermContractFormProps) {
  const { rooms, stores, isRoomAvailable, getRoomById, getStoreById, getLongTermContractById } = useAppStore();
  const activeRooms = rooms.filter((r) => r.status === 'active');

  const [formData, setFormData] = useState({
    roomId: '',
    guestName: '',
    guestPhone: '',
    guestIdCard: '',
    startDate: todayStr(),
    months: 12,
    monthlyRent: 0,
    deposit: 0,
    notes: '',
  });

  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const roomsByStore = useMemo(() => {
    if (storeFilter === 'all') return activeRooms;
    return activeRooms.filter((r) => r.storeId === storeFilter);
  }, [activeRooms, storeFilter]);

  useEffect(() => {
    if (contract) {
      const room = getRoomById(contract.roomId);
      if (room) setStoreFilter(room.storeId);
      setFormData({
        roomId: contract.roomId,
        guestName: contract.guestName,
        guestPhone: contract.guestPhone,
        guestIdCard: contract.guestIdCard || '',
        startDate: contract.startDate,
        months: contract.months,
        monthlyRent: contract.monthlyRent,
        deposit: contract.deposit,
        notes: contract.notes || '',
      });
    } else {
      const defaultRoomId = prefillRoomId || (roomsByStore[0]?.id || activeRooms[0]?.id || '');
      if (prefillRoomId) {
        const room = getRoomById(prefillRoomId);
        if (room) setStoreFilter(room.storeId);
      }
      const defaultRoom = defaultRoomId ? getRoomById(defaultRoomId) : undefined;
      const suggestedRent = defaultRoom ? Math.round(defaultRoom.price * 30 * 0.7) : 0;
      setFormData({
        roomId: defaultRoomId,
        guestName: '',
        guestPhone: '',
        guestIdCard: '',
        startDate: prefillStartDate || todayStr(),
        months: 12,
        monthlyRent: suggestedRent,
        deposit: suggestedRent,
        notes: '',
      });
    }
    setErrors({});
    setSubmitError(null);
  }, [contract, prefillRoomId, prefillStartDate, open]);

  useEffect(() => {
    if (!contract && !prefillRoomId && roomsByStore.length > 0 && storeFilter !== 'all') {
      setFormData((prev) => ({
        ...prev,
        roomId: prev.roomId && activeRooms.find(r => r.id === prev.roomId && r.storeId === storeFilter)
          ? prev.roomId
          : roomsByStore[0]?.id || '',
      }));
    }
  }, [storeFilter, roomsByStore, contract, prefillRoomId, activeRooms]);

  const selectedRoom = getRoomById(formData.roomId);
  const selectedStore = selectedRoom ? getStoreById(selectedRoom.storeId) : null;
  const endDate = formData.startDate && formData.months > 0 ? addMonthsStr(formData.startDate, formData.months) : '';
  const totalAmount = formData.monthlyRent * formData.months;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.roomId) newErrors.roomId = '请选择房间';
    if (!formData.guestName.trim()) newErrors.guestName = '请输入客人姓名';
    if (!formData.guestPhone.trim()) newErrors.guestPhone = '请输入联系电话';
    if (!formData.startDate) newErrors.startDate = '请选择开始日期';
    if (formData.months <= 0) newErrors.months = '租期必须大于0个月';
    if (formData.monthlyRent <= 0) newErrors.monthlyRent = '请输入月租金额';
    if (formData.deposit < 0) newErrors.deposit = '押金不能为负数';

    if (formData.roomId && formData.startDate && formData.months > 0 && endDate) {
      if (!isRoomAvailable(formData.roomId, formData.startDate, endDate, undefined, contract?.id)) {
        newErrors.roomId = '该房间在此时间段已被预订或长租占用';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    const submitData = {
      roomId: formData.roomId,
      guestName: formData.guestName.trim(),
      guestPhone: formData.guestPhone,
      guestIdCard: formData.guestIdCard.trim() || undefined,
      startDate: formData.startDate,
      endDate,
      months: formData.months,
      monthlyRent: formData.monthlyRent,
      deposit: formData.deposit,
      notes: formData.notes.trim() || undefined,
    };

    const success = onSubmit(submitData, !!contract);
    if (!success) {
      setSubmitError('合同保存失败，可能是房间在该时间段已被占用。');
    } else {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={contract ? '编辑长租合同' : '新增长租合同'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {submitError}
          </div>
        )}

        {!contract && (
          <div>
            <label className="label-base">筛选门店</label>
            <select
              className="input-base"
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
          </div>
        )}

        <div>
          <label className="label-base">选择房间 *</label>
          {selectedStore && (
            <div className="text-xs text-brand-taupe mb-1.5 flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {selectedStore.name}
            </div>
          )}
          <select
            className={`input-base ${errors.roomId ? 'border-red-400' : ''}`}
            value={formData.roomId}
            onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
            disabled={!!contract}
          >
            <option value="">请选择房间</option>
            {roomsByStore.map((r) => {
              const s = getStoreById(r.storeId);
              return (
                <option key={r.id} value={r.id}>
                  {s ? `[${s.name}] ` : ''}{r.roomNumber} - {r.name} (日租¥{r.price}/晚)
                </option>
              );
            })}
          </select>
          {errors.roomId && <p className="text-red-500 text-xs mt-1">{errors.roomId}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-base">合同开始日期 *</label>
            <input
              type="date"
              className={`input-base ${errors.startDate ? 'border-red-400' : ''}`}
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
          </div>
          <div>
            <label className="label-base">租期（月）*</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={120}
                className={`input-base flex-1 ${errors.months ? 'border-red-400' : ''}`}
                value={formData.months}
                onChange={(e) => setFormData({ ...formData, months: Math.max(1, Number(e.target.value)) })}
              />
              <span className="text-brand-taupe">个月</span>
            </div>
            {errors.months && <p className="text-red-500 text-xs mt-1">{errors.months}</p>}
          </div>
        </div>

        {formData.startDate && formData.months > 0 && (
          <div className="p-4 bg-brand-beige/60 rounded-lg space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-brand-taupe flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                合同期限
              </span>
              <span className="font-medium text-brand-brown">
                {formData.startDate} ~ {endDate}（共{formData.months}个月）
              </span>
            </div>
            <div className="pt-2 border-t border-brand-brown/10 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-brand-taupe">月租金额</span>
                <div className="font-display font-bold text-lg text-brand-orange">¥{formData.monthlyRent.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-brand-taupe">合同总额</span>
                <div className="font-display font-bold text-lg text-brand-brown">¥{totalAmount.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-base">月租金额（元）*</label>
            <div className="relative">
              <CreditCard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-taupe" />
              <input
                type="number"
                min={0}
                className={`input-base pl-10 ${errors.monthlyRent ? 'border-red-400' : ''}`}
                value={formData.monthlyRent}
                onChange={(e) => setFormData({ ...formData, monthlyRent: Number(e.target.value) })}
              />
            </div>
            {errors.monthlyRent && <p className="text-red-500 text-xs mt-1">{errors.monthlyRent}</p>}
            {selectedRoom && (
              <p className="text-xs text-brand-taupe mt-1">
                参考日租价：¥{selectedRoom.price}/晚，约¥{Math.round(selectedRoom.price * 30).toLocaleString()}/月
              </p>
            )}
          </div>
          <div>
            <label className="label-base">押金（元）</label>
            <div className="relative">
              <CreditCard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-taupe" />
              <input
                type="number"
                min={0}
                className={`input-base pl-10 ${errors.deposit ? 'border-red-400' : ''}`}
                value={formData.deposit}
                onChange={(e) => setFormData({ ...formData, deposit: Number(e.target.value) })}
              />
            </div>
            {errors.deposit && <p className="text-red-500 text-xs mt-1">{errors.deposit}</p>}
            <div className="flex gap-2 mt-1">
              {[1, 2, 3].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFormData({ ...formData, deposit: formData.monthlyRent * m })}
                  className="text-xs px-2 py-0.5 rounded bg-brand-beige text-brand-taupe hover:bg-brand-sage/30 transition-colors"
                >
                  {m}个月租金
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-base">客人姓名 *</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-taupe" />
              <input
                type="text"
                className={`input-base pl-10 ${errors.guestName ? 'border-red-400' : ''}`}
                value={formData.guestName}
                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                placeholder="请输入姓名"
              />
            </div>
            {errors.guestName && <p className="text-red-500 text-xs mt-1">{errors.guestName}</p>}
          </div>
          <div>
            <label className="label-base">联系电话 *</label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-taupe" />
              <input
                type="tel"
                className={`input-base pl-10 ${errors.guestPhone ? 'border-red-400' : ''}`}
                value={formData.guestPhone}
                onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                placeholder="请输入手机号"
              />
            </div>
            {errors.guestPhone && <p className="text-red-500 text-xs mt-1">{errors.guestPhone}</p>}
          </div>
        </div>

        <div>
          <label className="label-base">身份证号</label>
          <input
            type="text"
            className="input-base"
            value={formData.guestIdCard}
            onChange={(e) => setFormData({ ...formData, guestIdCard: e.target.value })}
            placeholder="可选"
          />
        </div>

        <div>
          <label className="label-base">备注</label>
          <div className="relative">
            <FileText className="w-4 h-4 absolute left-3 top-3 text-brand-taupe" />
            <textarea
              className="input-base resize-none pl-10"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="特殊需求、付款方式等..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-brand-brown/10">
          <button type="button" onClick={onClose} className="btn-secondary">
            取消
          </button>
          <button type="submit" className="btn-primary">
            {contract ? '保存修改' : '确认创建'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
