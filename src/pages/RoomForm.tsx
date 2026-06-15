import { useState, useEffect } from 'react';
import type { Room, RoomType, BedType, RoomStatus } from '@/types';
import {
  RoomTypeLabels,
  BedTypeLabels,
  RoomStatusLabels,
  CommonFacilities,
} from '@/types';
import Modal from '@/components/Modal';

interface RoomFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Room, 'id' | 'createdAt' | 'updatedAt'>) => void;
  room?: Room | null;
}

export default function RoomForm({ open, onClose, onSubmit, room }: RoomFormProps) {
  const [formData, setFormData] = useState({
    roomNumber: '',
    name: '',
    type: 'standard' as RoomType,
    price: 0,
    bedType: 'double' as BedType,
    capacity: 2,
    facilities: [] as string[],
    description: '',
    status: 'active' as RoomStatus,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (room) {
      setFormData({
        roomNumber: room.roomNumber,
        name: room.name,
        type: room.type,
        price: room.price,
        bedType: room.bedType,
        capacity: room.capacity,
        facilities: [...room.facilities],
        description: room.description,
        status: room.status,
      });
    } else {
      setFormData({
        roomNumber: '',
        name: '',
        type: 'standard',
        price: 0,
        bedType: 'double',
        capacity: 2,
        facilities: [],
        description: '',
        status: 'active',
      });
    }
    setErrors({});
  }, [room, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.roomNumber.trim()) newErrors.roomNumber = '请输入房间号';
    if (!formData.name.trim()) newErrors.name = '请输入房间名称';
    if (formData.price <= 0) newErrors.price = '请输入有效价格';
    if (formData.capacity <= 0) newErrors.capacity = '请输入容纳人数';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
    onClose();
  };

  const toggleFacility = (facility: string) => {
    setFormData((prev) => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter((f) => f !== facility)
        : [...prev.facilities, facility],
    }));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={room ? '编辑房间' : '新增房间'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-base">房间号 *</label>
            <input
              type="text"
              className={`input-base ${errors.roomNumber ? 'border-red-400' : ''}`}
              value={formData.roomNumber}
              onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
              placeholder="如：101"
            />
            {errors.roomNumber && (
              <p className="text-red-500 text-xs mt-1">{errors.roomNumber}</p>
            )}
          </div>
          <div>
            <label className="label-base">房间名称 *</label>
            <input
              type="text"
              className={`input-base ${errors.name ? 'border-red-400' : ''}`}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="如：听雨阁"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-base">房间类型</label>
            <select
              className="input-base"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as RoomType })}
            >
              {(Object.keys(RoomTypeLabels) as RoomType[]).map((t) => (
                <option key={t} value={t}>
                  {RoomTypeLabels[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-base">床型</label>
            <select
              className="input-base"
              value={formData.bedType}
              onChange={(e) => setFormData({ ...formData, bedType: e.target.value as BedType })}
            >
              {(Object.keys(BedTypeLabels) as BedType[]).map((t) => (
                <option key={t} value={t}>
                  {BedTypeLabels[t]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-base">价格 (元/晚) *</label>
            <input
              type="number"
              min={0}
              className={`input-base ${errors.price ? 'border-red-400' : ''}`}
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: Number(e.target.value) })
              }
              placeholder="288"
            />
            {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
          </div>
          <div>
            <label className="label-base">容纳人数 *</label>
            <input
              type="number"
              min={1}
              className={`input-base ${errors.capacity ? 'border-red-400' : ''}`}
              value={formData.capacity}
              onChange={(e) =>
                setFormData({ ...formData, capacity: Number(e.target.value) })
              }
              placeholder="2"
            />
            {errors.capacity && (
              <p className="text-red-500 text-xs mt-1">{errors.capacity}</p>
            )}
          </div>
        </div>

        <div>
          <label className="label-base">房间状态</label>
          <select
            className="input-base"
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value as RoomStatus })
            }
          >
            {(Object.keys(RoomStatusLabels) as RoomStatus[]).map((t) => (
              <option key={t} value={t}>
                {RoomStatusLabels[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label-base">设施配备</label>
          <div className="flex flex-wrap gap-2">
            {CommonFacilities.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => toggleFacility(f)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  formData.facilities.includes(f)
                    ? 'bg-brand-brown text-white'
                    : 'bg-brand-beige text-brand-taupe hover:bg-brand-brown/10'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label-base">房间描述</label>
          <textarea
            className="input-base resize-none"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="请输入房间描述..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-brand-brown/10">
          <button type="button" onClick={onClose} className="btn-secondary">
            取消
          </button>
          <button type="submit" className="btn-primary">
            {room ? '保存修改' : '创建房间'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
