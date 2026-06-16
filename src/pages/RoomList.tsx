import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Users, BedDouble, Wifi, DollarSign, Building2, Filter, Calendar } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { Room } from '@/types';
import { RoomTypeLabels, BedTypeLabels, RoomStatusLabels } from '@/types';
import Badge from '@/components/Badge';
import ConfirmDialog from '@/components/ConfirmDialog';
import RoomForm from './RoomForm';
import RoomRulesModal from './RoomRulesModal';

export default function RoomList() {
  const { stores, getRoomsByStore, addRoom, updateRoom, deleteRoom, getBookingsByRoom, getStoreById } = useAppStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [rulesRoom, setRulesRoom] = useState<Room | null>(null);

  const rooms = useMemo(() => getRoomsByStore(storeFilter), [getRoomsByStore, storeFilter]);

  const handleAdd = () => {
    setEditingRoom(null);
    setFormOpen(true);
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setFormOpen(true);
  };

  const handleDeleteClick = (room: Room) => {
    const bookings = getBookingsByRoom(room.id);
    const hasActive = bookings.some(
      (b) => b.status !== 'cancelled' && b.status !== 'checked-out'
    );
    if (hasActive) {
      setDeleteError('该房间存在有效预订，无法删除。请先取消或完成相关预订。');
      setDeleteTarget(room);
    } else {
      setDeleteError(null);
      setDeleteTarget(room);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget && !deleteError) {
      deleteRoom(deleteTarget.id);
    }
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const handleOpenRules = (room: Room) => {
    setRulesRoom(room);
    setRulesModalOpen(true);
  };

  const handleSubmit = (data: Omit<Room, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingRoom) {
      updateRoom(editingRoom.id, data);
    } else {
      addRoom(data);
    }
  };

  const getStatusBadge = (status: Room['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="green">{RoomStatusLabels[status]}</Badge>;
      case 'maintenance':
        return <Badge variant="warning">{RoomStatusLabels[status]}</Badge>;
      case 'inactive':
        return <Badge variant="default">{RoomStatusLabels[status]}</Badge>;
    }
  };

  const storeName = (storeId: string) => {
    const store = getStoreById(storeId);
    return store?.name || '未知门店';
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-brown">房间管理</h1>
          <p className="text-brand-taupe mt-1">管理所有民宿房间的档案信息</p>
        </div>
        <button onClick={handleAdd} className="btn-primary">
          <Plus className="w-4 h-4" />
          新增房间
        </button>
      </div>

      <div className="card-base p-4 mb-5">
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
          <span className="text-sm text-brand-taupe">
            共 {rooms.length} 间房间
          </span>
        </div>
      </div>

      {rooms.length === 0 ? (
        <div className="card-base p-12 text-center">
          <BedDouble className="w-16 h-16 mx-auto text-brand-brown/30 mb-4" />
          <h3 className="font-display text-lg text-brand-brown mb-2">暂无房间</h3>
          <p className="text-brand-taupe mb-6">点击上方按钮添加您的第一个房间</p>
          <button onClick={handleAdd} className="btn-primary">
            <Plus className="w-4 h-4" />
            新增房间
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {rooms.map((room, idx) => {
            const activeBookings = getBookingsByRoom(room.id).filter(
              (b) => b.status !== 'cancelled' && b.status !== 'checked-out'
            ).length;

            return (
              <div
                key={room.id}
                className="card-base p-5 hover:shadow-card transition-all duration-300 hover:-translate-y-0.5 animate-slide-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-display text-2xl font-bold text-brand-brown">
                        {room.roomNumber}
                      </span>
                      {getStatusBadge(room.status)}
                    </div>
                    <h3 className="text-lg font-medium text-gray-800">{room.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-brand-taupe mt-1">
                      <Building2 className="w-3 h-3" />
                      {storeName(room.storeId)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenRules(room)}
                      className="p-2 rounded-lg text-brand-taupe hover:bg-brand-sage/20 hover:text-brand-green transition-colors"
                      title="房间规则"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(room)}
                      className="p-2 rounded-lg text-brand-taupe hover:bg-brand-beige hover:text-brand-brown transition-colors"
                      title="编辑"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(room)}
                      className="p-2 rounded-lg text-brand-taupe hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-4 text-sm text-brand-taupe">
                    <span className="flex items-center gap-1">
                      <BedDouble className="w-4 h-4" />
                      {RoomTypeLabels[room.type]} · {BedTypeLabels[room.bedType]}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      可住{room.capacity}人
                    </span>
                  </div>
                  {activeBookings > 0 && (
                    <div className="text-sm text-brand-orange">
                      当前有 {activeBookings} 个有效预订
                    </div>
                  )}
                </div>

                {room.facilities.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-1 text-xs text-brand-taupe mb-2">
                      <Wifi className="w-3.5 h-3.5" />
                      设施配备
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {room.facilities.slice(0, 5).map((f) => (
                        <span
                          key={f}
                          className="px-2 py-0.5 text-xs bg-brand-beige text-brand-taupe rounded"
                        >
                          {f}
                        </span>
                      ))}
                      {room.facilities.length > 5 && (
                        <span className="px-2 py-0.5 text-xs bg-brand-beige text-brand-taupe rounded">
                          +{room.facilities.length - 5}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {room.description && (
                  <p className="text-sm text-brand-taupe/80 line-clamp-2 mb-4">
                    {room.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-brand-brown/10">
                  <div className="flex items-baseline gap-1">
                    <DollarSign className="w-4 h-4 text-brand-orange" />
                    <span className="font-display text-xl font-bold text-brand-orange">
                      {room.price}
                    </span>
                    <span className="text-xs text-brand-taupe">/晚</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RoomForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        room={editingRoom}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={deleteError ? '无法删除' : '确认删除房间'}
        message={
          deleteError ||
          `确定要删除房间 ${deleteTarget?.roomNumber} ${deleteTarget?.name} 吗？此操作不可恢复。`
        }
        confirmText={deleteError ? '我知道了' : '删除'}
        variant={deleteError ? 'default' : 'danger'}
      />

      <RoomRulesModal
        open={rulesModalOpen}
        onClose={() => setRulesModalOpen(false)}
        room={rulesRoom}
      />
    </div>
  );
}
