import { useState } from 'react';
import { Plus, Pencil, Trash2, MapPin, Phone, Building2, BedDouble } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { Store } from '@/types';
import ConfirmDialog from '@/components/ConfirmDialog';
import StoreForm from './StoreForm';

export default function StoreList() {
  const { stores, addStore, updateStore, deleteStore, getRoomsByStore, getRevenueStats, hasPermission } = useAppStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Store | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingStore(null);
    setFormOpen(true);
  };

  const handleEdit = (store: Store) => {
    setEditingStore(store);
    setFormOpen(true);
  };

  const handleDeleteClick = (store: Store) => {
    const rooms = getRoomsByStore(store.id);
    if (rooms.length > 0) {
      setDeleteError(`该门店下还有 ${rooms.length} 间房间，无法删除。请先删除或转移相关房间。`);
      setDeleteTarget(store);
    } else {
      setDeleteError(null);
      setDeleteTarget(store);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget && !deleteError) {
      deleteStore(deleteTarget.id);
    }
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const handleSubmit = (data: Omit<Store, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingStore) {
      updateStore(editingStore.id, data);
    } else {
      addStore(data);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-brown">门店管理</h1>
          <p className="text-brand-taupe mt-1">管理所有门店的基础信息</p>
        </div>
        {hasPermission('store:create') && (
          <button onClick={handleAdd} className="btn-primary">
            <Plus className="w-4 h-4" />
            新增门店
          </button>
        )}
      </div>

      {stores.length === 0 ? (
        <div className="card-base p-12 text-center">
          <Building2 className="w-16 h-16 mx-auto text-brand-brown/30 mb-4" />
          <h3 className="font-display text-lg text-brand-brown mb-2">暂无门店</h3>
          {hasPermission('store:create') ? (
            <>
              <p className="text-brand-taupe mb-6">点击上方按钮添加您的第一个门店</p>
              <button onClick={handleAdd} className="btn-primary">
                <Plus className="w-4 h-4" />
                新增门店
              </button>
            </>
          ) : (
            <p className="text-brand-taupe">暂无权限创建门店</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {stores.map((store, idx) => {
            const rooms = getRoomsByStore(store.id);
            const activeRooms = rooms.filter((r) => r.status === 'active').length;
            const revenue = getRevenueStats(store.id);

            return (
              <div
                key={store.id}
                className="card-base p-5 hover:shadow-card transition-all duration-300 hover:-translate-y-0.5 animate-slide-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-brown to-brand-brownLight flex items-center justify-center shadow-soft">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-brand-brown">{store.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-brand-taupe mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[180px]">{store.address}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {hasPermission('store:update') && (
                      <button
                        onClick={() => handleEdit(store)}
                        className="p-2 rounded-lg text-brand-taupe hover:bg-brand-beige hover:text-brand-brown transition-colors"
                        title="编辑"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {hasPermission('store:delete') && (
                      <button
                        onClick={() => handleDeleteClick(store)}
                        className="p-2 rounded-lg text-brand-taupe hover:bg-red-50 hover:text-red-500 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-brand-taupe">
                    <Phone className="w-4 h-4" />
                    {store.phone}
                  </div>
                </div>

                {store.description && (
                  <p className="text-sm text-brand-taupe/80 line-clamp-2 mb-4">
                    {store.description}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-brand-brown/10">
                  <div className="text-center p-2 bg-brand-beige/50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <BedDouble className="w-3.5 h-3.5 text-brand-brown" />
                    </div>
                    <div className="font-display text-lg font-bold text-brand-brown">
                      {activeRooms}
                    </div>
                    <div className="text-xs text-brand-taupe">可用房间</div>
                  </div>
                  <div className="text-center p-2 bg-brand-beige/50 rounded-lg">
                    <div className="font-display text-lg font-bold text-brand-orange">
                      ¥{Math.round(revenue.todayRevenue).toLocaleString()}
                    </div>
                    <div className="text-xs text-brand-taupe">今日营收</div>
                  </div>
                  <div className="text-center p-2 bg-brand-beige/50 rounded-lg">
                    <div className="font-display text-lg font-bold text-brand-green">
                      ¥{Math.round(revenue.monthRevenue).toLocaleString()}
                    </div>
                    <div className="text-xs text-brand-taupe">本月营收</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <StoreForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        store={editingStore}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={deleteError ? '无法删除' : '确认删除门店'}
        message={
          deleteError ||
          `确定要删除门店「${deleteTarget?.name}」吗？此操作不可恢复。`
        }
        confirmText={deleteError ? '我知道了' : '删除'}
        variant={deleteError ? 'default' : 'danger'}
      />
    </div>
  );
}
