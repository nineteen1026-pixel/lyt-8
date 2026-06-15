import { useState, useEffect } from 'react';
import type { Booking } from '@/types';
import { BookingStatusLabels, normalizePhone } from '@/types';
import Modal from '@/components/Modal';
import { useAppStore } from '@/store/useAppStore';
import { calculateNights, todayStr } from '@/utils/date';
import { addDays, format } from 'date-fns';

interface BookingFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    data: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>,
    isEdit: boolean
  ) => boolean;
  booking?: Booking | null;
  prefillRoomId?: string;
  prefillCheckIn?: string;
  prefillCheckOut?: string;
}

export default function BookingForm({
  open,
  onClose,
  onSubmit,
  booking,
  prefillRoomId,
  prefillCheckIn,
  prefillCheckOut,
}: BookingFormProps) {
  const { rooms, isRoomAvailable, getRoomById } = useAppStore();
  const activeRooms = rooms.filter((r) => r.status === 'active');

  const [formData, setFormData] = useState({
    roomId: '',
    guestName: '',
    guestPhone: '',
    guestIdCard: '',
    checkIn: todayStr(),
    checkOut: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    guests: 2,
    status: 'confirmed' as Booking['status'],
    notes: '',
    totalPrice: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (booking) {
      setFormData({
        roomId: booking.roomId,
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        guestIdCard: booking.guestIdCard || '',
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guests: booking.guests,
        status: booking.status,
        notes: booking.notes || '',
        totalPrice: booking.totalPrice,
      });
    } else {
      setFormData({
        roomId: prefillRoomId || (activeRooms[0]?.id || ''),
        guestName: '',
        guestPhone: '',
        guestIdCard: '',
        checkIn: prefillCheckIn || todayStr(),
        checkOut: prefillCheckOut || format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        guests: 2,
        status: 'confirmed',
        notes: '',
        totalPrice: 0,
      });
    }
    setErrors({});
    setSubmitError(null);
  }, [booking, prefillRoomId, prefillCheckIn, prefillCheckOut, open]);

  useEffect(() => {
    const room = getRoomById(formData.roomId);
    const nights = calculateNights(formData.checkIn, formData.checkOut);
    if (room && nights > 0) {
      setFormData((prev) => ({ ...prev, totalPrice: room.price * nights }));
    }
  }, [formData.roomId, formData.checkIn, formData.checkOut]);

  const nights = calculateNights(formData.checkIn, formData.checkOut);
  const selectedRoom = getRoomById(formData.roomId);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.roomId) newErrors.roomId = '请选择房间';
    if (!formData.guestName.trim()) newErrors.guestName = '请输入客人姓名';
    if (!formData.guestPhone.trim()) newErrors.guestPhone = '请输入联系电话';
    if (!formData.checkIn) newErrors.checkIn = '请选择入住日期';
    if (!formData.checkOut) newErrors.checkOut = '请选择退房日期';
    if (formData.checkIn && formData.checkOut && nights <= 0) {
      newErrors.checkOut = '退房日期必须晚于入住日期';
    }
    if (formData.guests <= 0) newErrors.guests = '请输入入住人数';

    if (formData.roomId && formData.checkIn && formData.checkOut && nights > 0) {
      if (!isRoomAvailable(formData.roomId, formData.checkIn, formData.checkOut, booking?.id)) {
        newErrors.roomId = '该房间在此时间段已被预订';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    const submitData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
      roomId: formData.roomId,
      guestName: formData.guestName.trim(),
      guestPhone: normalizePhone(formData.guestPhone),
      guestIdCard: formData.guestIdCard.trim() || undefined,
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
      guests: formData.guests,
      totalPrice: formData.totalPrice,
      status: formData.status,
      notes: formData.notes.trim() || undefined,
    };

    const success = onSubmit(submitData, !!booking);
    if (!success) {
      setSubmitError('预订保存失败，可能是房间在该时间段已被占用。');
    } else {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={booking ? '编辑预订' : '新增预订'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {submitError}
          </div>
        )}

        <div>
          <label className="label-base">选择房间 *</label>
          <select
            className={`input-base ${errors.roomId ? 'border-red-400' : ''}`}
            value={formData.roomId}
            onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
            disabled={!!booking}
          >
            <option value="">请选择房间</option>
            {activeRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.roomNumber} - {r.name} (¥{r.price}/晚)
              </option>
            ))}
          </select>
          {errors.roomId && <p className="text-red-500 text-xs mt-1">{errors.roomId}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-base">入住日期 *</label>
            <input
              type="date"
              className={`input-base ${errors.checkIn ? 'border-red-400' : ''}`}
              value={formData.checkIn}
              onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
            />
            {errors.checkIn && <p className="text-red-500 text-xs mt-1">{errors.checkIn}</p>}
          </div>
          <div>
            <label className="label-base">退房日期 *</label>
            <input
              type="date"
              className={`input-base ${errors.checkOut ? 'border-red-400' : ''}`}
              value={formData.checkOut}
              onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
            />
            {errors.checkOut && (
              <p className="text-red-500 text-xs mt-1">{errors.checkOut}</p>
            )}
          </div>
        </div>

        {selectedRoom && nights > 0 && (
          <div className="p-4 bg-brand-beige/60 rounded-lg">
            <div className="flex justify-between items-center text-sm">
              <span className="text-brand-taupe">
                {selectedRoom.roomNumber} {selectedRoom.name} × {nights}晚
              </span>
              <span className="font-display text-xl font-bold text-brand-orange">
                ¥{formData.totalPrice}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-base">客人姓名 *</label>
            <input
              type="text"
              className={`input-base ${errors.guestName ? 'border-red-400' : ''}`}
              value={formData.guestName}
              onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
              placeholder="请输入姓名"
            />
            {errors.guestName && (
              <p className="text-red-500 text-xs mt-1">{errors.guestName}</p>
            )}
          </div>
          <div>
            <label className="label-base">联系电话 *</label>
            <input
              type="tel"
              className={`input-base ${errors.guestPhone ? 'border-red-400' : ''}`}
              value={formData.guestPhone}
              onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
              placeholder="请输入手机号"
            />
            {errors.guestPhone && (
              <p className="text-red-500 text-xs mt-1">{errors.guestPhone}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
            <label className="label-base">入住人数 *</label>
            <input
              type="number"
              min={1}
              className={`input-base ${errors.guests ? 'border-red-400' : ''}`}
              value={formData.guests}
              onChange={(e) =>
                setFormData({ ...formData, guests: Number(e.target.value) })
              }
            />
            {errors.guests && <p className="text-red-500 text-xs mt-1">{errors.guests}</p>}
          </div>
        </div>

        {booking && (
          <div>
            <label className="label-base">预订状态</label>
            <select
              className="input-base"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as Booking['status'] })
              }
            >
              {(Object.keys(BookingStatusLabels) as Booking['status'][]).map((s) => (
                <option key={s} value={s}>
                  {BookingStatusLabels[s]}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label-base">备注</label>
          <textarea
            className="input-base resize-none"
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="特殊需求等..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-brand-brown/10">
          <button type="button" onClick={onClose} className="btn-secondary">
            取消
          </button>
          <button type="submit" className="btn-primary">
            {booking ? '保存修改' : '确认预订'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
