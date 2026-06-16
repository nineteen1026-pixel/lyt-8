import { useState, useEffect } from 'react';
import type { Store } from '@/types';
import Modal from '@/components/Modal';

interface StoreFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Store, 'id' | 'createdAt' | 'updatedAt'>) => void;
  store?: Store | null;
}

export default function StoreForm({ open, onClose, onSubmit, store }: StoreFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name,
        address: store.address,
        phone: store.phone,
        description: store.description,
      });
    } else {
      setFormData({
        name: '',
        address: '',
        phone: '',
        description: '',
      });
    }
    setErrors({});
  }, [store, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = '请输入门店名称';
    if (!formData.address.trim()) newErrors.address = '请输入门店地址';
    if (!formData.phone.trim()) newErrors.phone = '请输入联系电话';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={store ? '编辑门店' : '新增门店'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label-base">门店名称 *</label>
          <input
            type="text"
            className={`input-base ${errors.name ? 'border-red-400' : ''}`}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="如：云栖山居·总店"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="label-base">门店地址 *</label>
          <input
            type="text"
            className={`input-base ${errors.address ? 'border-red-400' : ''}`}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="详细地址"
          />
          {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
        </div>

        <div>
          <label className="label-base">联系电话 *</label>
          <input
            type="tel"
            className={`input-base ${errors.phone ? 'border-red-400' : ''}`}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="如：0571-88888888"
          />
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label className="label-base">门店简介</label>
          <textarea
            className="input-base resize-none"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="可选：描述门店特色、位置等信息"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-brand-brown/10">
          <button type="button" onClick={onClose} className="btn-secondary">
            取消
          </button>
          <button type="submit" className="btn-primary">
            {store ? '保存修改' : '创建门店'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
