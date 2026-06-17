import { useState, useEffect, useMemo } from 'react';
import type { Booking, SelectedExtraService, ExtraService } from '@/types';
import { BookingStatusLabels, normalizePhone, ExtraServiceChargeTypeLabels } from '@/types';
import Modal from '@/components/Modal';
import { useAppStore } from '@/store/useAppStore';
import { calculateNights, todayStr } from '@/utils/date';
import { addDays, format } from 'date-fns';
import {
  Building2,
  Clock,
  Ban,
  ListTodo,
  AlertCircle,
  Coffee,
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
  Plus,
  Minus,
  Check,
} from 'lucide-react';

interface BookingFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    data: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>,
    isEdit: boolean
  ) => boolean;
  onWaitlistSubmit?: (
    data: Omit<import('@/types').WaitlistEntry, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'priority'>
  ) => void;
  booking?: Booking | null;
  prefillRoomId?: string;
  prefillCheckIn?: string;
  prefillCheckOut?: string;
}

export default function BookingForm({
  open,
  onClose,
  onSubmit,
  onWaitlistSubmit,
  booking,
  prefillRoomId,
  prefillCheckIn,
  prefillCheckOut,
}: BookingFormProps) {
  const { rooms, stores, isRoomAvailable, getRoomById, getStoreById, getMinStayForRoom, checkMinStayCompliance, hasClosedDateInRange, hasPermission, addWaitlistEntry, getExtraServicesByStore, getExtraServiceById, calculateExtraServicesPrice } = useAppStore();
  const activeRooms = rooms.filter((r) => r.status === 'active');
  const canCreateWaitlist = hasPermission('waitlist:create');

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
    roomPrice: 0,
    extraServicesPrice: 0,
    extraServices: [] as SelectedExtraService[],
  });

  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isWaitlistMode, setIsWaitlistMode] = useState(false);

  const roomsByStore = useMemo(() => {
    if (storeFilter === 'all') return activeRooms;
    return activeRooms.filter((r) => r.storeId === storeFilter);
  }, [activeRooms, storeFilter]);

  useEffect(() => {
    if (booking) {
      const room = getRoomById(booking.roomId);
      if (room) setStoreFilter(room.storeId);
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
        roomPrice: booking.roomPrice ?? booking.totalPrice,
        extraServicesPrice: booking.extraServicesPrice ?? 0,
        extraServices: booking.extraServices ?? [],
      });
    } else {
      const defaultRoomId = prefillRoomId || (roomsByStore[0]?.id || activeRooms[0]?.id || '');
      if (prefillRoomId) {
        const room = getRoomById(prefillRoomId);
        if (room) setStoreFilter(room.storeId);
      }
      setFormData({
        roomId: defaultRoomId,
        guestName: '',
        guestPhone: '',
        guestIdCard: '',
        checkIn: prefillCheckIn || todayStr(),
        checkOut: prefillCheckOut || format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        guests: 2,
        status: 'confirmed',
        notes: '',
        totalPrice: 0,
        roomPrice: 0,
        extraServicesPrice: 0,
        extraServices: [],
      });
    }
    setErrors({});
    setSubmitError(null);
    setIsWaitlistMode(false);
  }, [booking, prefillRoomId, prefillCheckIn, prefillCheckOut, open]);

  useEffect(() => {
    if (!booking && !prefillRoomId && roomsByStore.length > 0 && storeFilter !== 'all') {
      setFormData((prev) => ({
        ...prev,
        roomId: prev.roomId && activeRooms.find(r => r.id === prev.roomId && r.storeId === storeFilter)
          ? prev.roomId
          : roomsByStore[0]?.id || '',
      }));
    }
  }, [storeFilter, roomsByStore, booking, prefillRoomId, activeRooms]);

  useEffect(() => {
    const room = getRoomById(formData.roomId);
    const nights = calculateNights(formData.checkIn, formData.checkOut);
    if (room && nights > 0) {
      const roomPrice = room.price * nights;
      const extraServicesPrice = calculateExtraServicesPrice(
        formData.extraServices,
        nights,
        formData.guests
      );
      setFormData((prev) => ({
        ...prev,
        roomPrice,
        extraServicesPrice,
        totalPrice: roomPrice + extraServicesPrice,
      }));
    }
  }, [formData.roomId, formData.checkIn, formData.checkOut, formData.extraServices, formData.guests]);

  const nights = calculateNights(formData.checkIn, formData.checkOut);
  const selectedRoom = getRoomById(formData.roomId);
  const selectedStore = selectedRoom ? getStoreById(selectedRoom.storeId) : null;

  const availableExtraServices = useMemo(() => {
    if (!selectedStore) return [];
    return getExtraServicesByStore(selectedStore.id);
  }, [selectedStore, getExtraServicesByStore]);

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

  const getServiceIcon = (iconName: string) => {
    const Icon = iconMap[iconName] || Sparkles;
    return <Icon className="w-5 h-5" />;
  };

  const toggleExtraService = (serviceId: string) => {
    setFormData((prev) => {
      const exists = prev.extraServices.find((s) => s.serviceId === serviceId);
      let newExtraServices: SelectedExtraService[];
      if (exists) {
        newExtraServices = prev.extraServices.filter((s) => s.serviceId !== serviceId);
      } else {
        newExtraServices = [...prev.extraServices, { serviceId, quantity: 1 }];
      }
      const nightsVal = calculateNights(prev.checkIn, prev.checkOut);
      const newExtraServicesPrice = calculateExtraServicesPrice(
        newExtraServices,
        nightsVal,
        prev.guests
      );
      return {
        ...prev,
        extraServices: newExtraServices,
        extraServicesPrice: newExtraServicesPrice,
        totalPrice: prev.roomPrice + newExtraServicesPrice,
      };
    });
  };

  const updateServiceQuantity = (serviceId: string, delta: number) => {
    setFormData((prev) => {
      const newExtraServices = prev.extraServices.map((s) => {
        if (s.serviceId !== serviceId) return s;
        const newQty = Math.max(1, s.quantity + delta);
        return { ...s, quantity: newQty };
      });
      const nightsVal = calculateNights(prev.checkIn, prev.checkOut);
      const newExtraServicesPrice = calculateExtraServicesPrice(
        newExtraServices,
        nightsVal,
        prev.guests
      );
      return {
        ...prev,
        extraServices: newExtraServices,
        extraServicesPrice: newExtraServicesPrice,
        totalPrice: prev.roomPrice + newExtraServicesPrice,
      };
    });
  };

  const isServiceSelected = (serviceId: string) => {
    return formData.extraServices.some((s) => s.serviceId === serviceId);
  };

  const getServiceQuantity = (serviceId: string) => {
    return formData.extraServices.find((s) => s.serviceId === serviceId)?.quantity || 1;
  };

  const getServiceDisplayPrice = (service: ExtraService) => {
    const qty = getServiceQuantity(service.id);
    const nightsVal = calculateNights(formData.checkIn, formData.checkOut);
    switch (service.chargeType) {
      case 'per_night':
        return {
          unitPrice: service.price,
          unitLabel: `× ${nightsVal}晚 × ${qty}份`,
          total: service.price * nightsVal * qty,
        };
      case 'per_person_per_night':
        const people = Math.min(qty, formData.guests);
        return {
          unitPrice: service.price,
          unitLabel: `× ${people}人 × ${nightsVal}晚`,
          total: service.price * people * nightsVal,
        };
      case 'per_stay':
      default:
        return {
          unitPrice: service.price,
          unitLabel: `× ${qty}次`,
          total: service.price * qty,
        };
    }
  };

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
      if (!isWaitlistMode && !isRoomAvailable(formData.roomId, formData.checkIn, formData.checkOut, booking?.id)) {
        if (hasClosedDateInRange(formData.roomId, formData.checkIn, formData.checkOut)) {
          newErrors.roomId = '该房间在此时间段内存在禁订日期，无法预订';
        } else {
          if (canCreateWaitlist && !booking) {
            newErrors.roomId = '该房间在此时间段已被预订，可选择加入候补队列';
          } else {
            newErrors.roomId = '该房间在此时间段已被预订';
          }
        }
      }

      if (!newErrors.roomId && !checkMinStayCompliance(formData.roomId, formData.checkIn, formData.checkOut)) {
        const minNights = getMinStayForRoom(formData.roomId, formData.checkIn, formData.checkOut);
        newErrors.checkOut = `该时间段内最短连住 ${minNights} 晚，当前预订 ${nights} 晚`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isRoomUnavailable = useMemo(() => {
    if (booking) return false;
    if (!formData.roomId || !formData.checkIn || !formData.checkOut) return false;
    if (nights <= 0) return false;
    if (hasClosedDateInRange(formData.roomId, formData.checkIn, formData.checkOut)) return false;
    return !isRoomAvailable(formData.roomId, formData.checkIn, formData.checkOut);
  }, [formData.roomId, formData.checkIn, formData.checkOut, booking, nights, isRoomAvailable, hasClosedDateInRange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (isWaitlistMode) {
      const basicErrors: Record<string, string> = {};
      if (!formData.roomId) basicErrors.roomId = '请选择房间';
      if (!formData.guestName.trim()) basicErrors.guestName = '请输入客人姓名';
      if (!formData.guestPhone.trim()) basicErrors.guestPhone = '请输入联系电话';
      if (!formData.checkIn) basicErrors.checkIn = '请选择入住日期';
      if (!formData.checkOut) basicErrors.checkOut = '请选择退房日期';
      if (formData.checkIn && formData.checkOut && nights <= 0) {
        basicErrors.checkOut = '退房日期必须晚于入住日期';
      }
      if (formData.guests <= 0) basicErrors.guests = '请输入入住人数';
      if (formData.checkIn < todayStr()) {
        basicErrors.checkIn = '入住日期不能早于今天';
      }
      setErrors(basicErrors);
      if (Object.keys(basicErrors).length > 0) return;

      const waitlistData = {
        roomId: formData.roomId,
        guestName: formData.guestName.trim(),
        guestPhone: normalizePhone(formData.guestPhone),
        guestIdCard: formData.guestIdCard.trim() || undefined,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        guests: formData.guests,
        notes: formData.notes.trim() || undefined,
      };

      const result = addWaitlistEntry(waitlistData);
      if (result) {
        if (onWaitlistSubmit) {
          onWaitlistSubmit(waitlistData);
        }
        onClose();
      } else {
        setSubmitError('候补登记失败，请检查信息后重试。');
      }
      return;
    }

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
      roomPrice: formData.roomPrice,
      extraServicesPrice: formData.extraServicesPrice,
      extraServices: formData.extraServices,
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

        {!booking && isRoomUnavailable && canCreateWaitlist && (
          <div className={`p-4 rounded-lg border ${isWaitlistMode ? 'bg-amber-50 border-amber-200' : 'bg-amber-50/50 border-amber-200/50'}`}>
            <div className="flex items-start gap-3">
              <AlertCircle className={`w-5 h-5 ${isWaitlistMode ? 'text-amber-600' : 'text-amber-500'} flex-shrink-0 mt-0.5`} />
              <div className="flex-1">
                <div className={`font-medium ${isWaitlistMode ? 'text-amber-800' : 'text-amber-700'}`}>
                  {isWaitlistMode ? '候补登记模式' : '该时段房间已满'}
                </div>
                <div className={`text-sm mt-1 ${isWaitlistMode ? 'text-amber-700' : 'text-amber-600'}`}>
                  {isWaitlistMode
                    ? '正在为客人登记候补意向，有空房时将自动匹配并通知确认。'
                    : '您可以选择将客人加入候补队列，当有空房时系统会自动匹配并通知客人确认预订。'}
                </div>
                {!isWaitlistMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsWaitlistMode(true);
                      setErrors({});
                    }}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    <ListTodo className="w-4 h-4" />
                    加入候补队列
                  </button>
                )}
                {isWaitlistMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsWaitlistMode(false);
                      setErrors({});
                    }}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-white border border-amber-300 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-50 transition-colors"
                  >
                    返回正常预订
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {!booking && (
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
            disabled={!!booking}
          >
            <option value="">请选择房间</option>
            {roomsByStore.map((r) => {
              const s = getStoreById(r.storeId);
              return (
                <option key={r.id} value={r.id}>
                  {s ? `[${s.name}] ` : ''}{r.roomNumber} - {r.name} (¥{r.price}/晚)
                </option>
              );
            })}
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
          <div className="p-4 bg-brand-beige/60 rounded-lg space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-brand-taupe">
                {selectedRoom.roomNumber} {selectedRoom.name} × {nights}晚
              </span>
              <span className="font-medium text-brand-brown">¥{formData.roomPrice}</span>
            </div>

            {formData.extraServices.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-brand-brown/10">
                {formData.extraServices.map((item) => {
                  const service = getExtraServiceById(item.serviceId);
                  if (!service) return null;
                  const priceInfo = getServiceDisplayPrice(service);
                  return (
                    <div key={item.serviceId} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-1.5 text-brand-taupe">
                        {getServiceIcon(service.icon)}
                        <span>{service.name}</span>
                        <span className="text-xs text-brand-taupe/70">{priceInfo.unitLabel}</span>
                      </div>
                      <span className="font-medium text-brand-brown">¥{priceInfo.total}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-brand-brown/15">
              <span className="font-medium text-brand-brown">合计总价</span>
              <span className="font-display text-2xl font-bold text-brand-orange">
                ¥{formData.totalPrice}
              </span>
            </div>

            {formData.roomId && formData.checkIn && formData.checkOut && (
              <div className="space-y-1 pt-1">
                {(() => {
                  const minNights = getMinStayForRoom(formData.roomId, formData.checkIn, formData.checkOut);
                  const meetsMinStay = checkMinStayCompliance(formData.roomId, formData.checkIn, formData.checkOut);
                  if (minNights > 1) {
                    return (
                      <div className={`text-xs flex items-center gap-1 ${meetsMinStay ? 'text-brand-green' : 'text-rose-500'}`}>
                        <Clock className="w-3.5 h-3.5" />
                        该时段最短连住 {minNights} 晚{meetsMinStay ? ' ✓' : `，当前 ${nights} 晚`}
                      </div>
                    );
                  }
                  return null;
                })()}
                {(() => {
                  const hasClosed = hasClosedDateInRange(formData.roomId, formData.checkIn, formData.checkOut);
                  if (hasClosed) {
                    return (
                      <div className="text-xs text-rose-500 flex items-center gap-1">
                        <Ban className="w-3.5 h-3.5" />
                        该时段内存在禁订日期
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
        )}

        {!isWaitlistMode && availableExtraServices.length > 0 && (
          <div>
            <label className="label-base mb-3">附加服务（可选）</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableExtraServices.map((service) => {
                const selected = isServiceSelected(service.id);
                const qty = getServiceQuantity(service.id);
                const priceInfo = getServiceDisplayPrice(service);
                return (
                  <div
                    key={service.id}
                    onClick={() => toggleExtraService(service.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selected
                        ? 'border-brand-orange bg-brand-orange/5'
                        : 'border-brand-brown/15 bg-white hover:border-brand-orange/40 hover:bg-brand-beige/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          selected ? 'bg-brand-orange text-white' : 'bg-brand-beige text-brand-taupe'
                        }`}
                      >
                        {selected ? <Check className="w-5 h-5" /> : getServiceIcon(service.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium text-brand-brown text-sm">{service.name}</div>
                            <div className="text-xs text-brand-taupe mt-0.5 line-clamp-2">
                              {service.description}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-brand-orange text-sm">
                              ¥{service.price}
                            </div>
                            <div className="text-xs text-brand-taupe">
                              {ExtraServiceChargeTypeLabels[service.chargeType]}
                            </div>
                          </div>
                        </div>
                        {selected && (
                          <div className="mt-2 pt-2 border-t border-brand-brown/10 flex items-center justify-between">
                            <div className="text-xs text-brand-taupe">
                              小计：<span className="font-medium text-brand-brown">¥{priceInfo.total}</span>
                            </div>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => updateServiceQuantity(service.id, -1)}
                                className="w-6 h-6 rounded-full bg-white border border-brand-brown/20 flex items-center justify-center text-brand-taupe hover:bg-brand-beige transition-colors disabled:opacity-40"
                                disabled={service.chargeType === 'per_person_per_night' ? qty <= 1 : qty <= 1}
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-sm font-medium text-brand-brown w-6 text-center">
                                {service.chargeType === 'per_person_per_night' ? `${qty}人` : `${qty}份`}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateServiceQuantity(service.id, 1)}
                                className="w-6 h-6 rounded-full bg-white border border-brand-brown/20 flex items-center justify-center text-brand-taupe hover:bg-brand-beige transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
          <button type="submit" className={isWaitlistMode ? 'btn-primary !bg-amber-500 hover:!bg-amber-600' : 'btn-primary'}>
            {booking ? '保存修改' : isWaitlistMode ? (
              <>
                <ListTodo className="w-4 h-4" />
                确认候补登记
              </>
            ) : '确认预订'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
