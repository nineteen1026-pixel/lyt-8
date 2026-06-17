import { useState, useEffect, useRef } from 'react';
import type { Room, RoomType, BedType, RoomStatus, RoomImage } from '@/types';
import {
  RoomTypeLabels,
  BedTypeLabels,
  RoomStatusLabels,
  CommonFacilities,
} from '@/types';
import Modal from '@/components/Modal';
import { useAppStore } from '@/store/useAppStore';
import { generateId } from '@/utils/date';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface RoomFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Room, 'id' | 'createdAt' | 'updatedAt'>) => void;
  room?: Room | null;
}

export default function RoomForm({ open, onClose, onSubmit, room }: RoomFormProps) {
  const { stores } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    storeId: '',
    roomNumber: '',
    name: '',
    type: 'standard' as RoomType,
    price: 0,
    bedType: 'double' as BedType,
    capacity: 2,
    facilities: [] as string[],
    images: [] as RoomImage[],
    description: '',
    status: 'active' as RoomStatus,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (room) {
      setFormData({
        storeId: room.storeId,
        roomNumber: room.roomNumber,
        name: room.name,
        type: room.type,
        price: room.price,
        bedType: room.bedType,
        capacity: room.capacity,
        facilities: [...room.facilities],
        images: [...(room.images || [])],
        description: room.description,
        status: room.status,
      });
    } else {
      setFormData({
        storeId: stores[0]?.id || '',
        roomNumber: '',
        name: '',
        type: 'standard',
        price: 0,
        bedType: 'double',
        capacity: 2,
        facilities: [],
        images: [],
        description: '',
        status: 'active',
      });
    }
    setErrors({});
  }, [room, open, stores]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.storeId) newErrors.storeId = '请选择所属门店';
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        if (url) {
          const newImage: RoomImage = {
            id: generateId(),
            url,
            name: file.name,
          };
          setFormData((prev) => ({
            ...prev,
            images: [...prev.images, newImage],
          }));
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (imageId: string) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img.id !== imageId),
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
        <div>
          <label className="label-base">所属门店 *</label>
          <select
            className={`input-base ${errors.storeId ? 'border-red-400' : ''}`}
            value={formData.storeId}
            onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
          >
            <option value="">请选择门店</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {errors.storeId && <p className="text-red-500 text-xs mt-1">{errors.storeId}</p>}
        </div>

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
          <label className="label-base">房间图片</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
          {formData.images.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mb-3">
              {formData.images.map((img) => (
                <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border border-brand-brown/10">
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(img.id)}
                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-8 border-2 border-dashed border-brand-brown/20 rounded-xl text-brand-taupe hover:border-brand-brown/40 hover:bg-brand-beige/50 transition-all flex flex-col items-center justify-center gap-2"
          >
            <Upload className="w-6 h-6" />
            <span className="text-sm">
              {formData.images.length > 0 ? '继续添加图片' : '点击上传房间图片'}
            </span>
            {formData.images.length > 0 && (
              <span className="text-xs text-brand-taupe/70">已上传 {formData.images.length} 张图片</span>
            )}
          </button>
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
