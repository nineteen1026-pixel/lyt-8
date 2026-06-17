import { useState, useMemo } from 'react';
import {
  Plus,
  Sparkles,
  Search,
  Filter,
  Trash2,
  Play,
  CheckCircle2,
  BedDouble,
  Building2,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { CleaningTask, CleaningTaskStatus } from '@/types';
import { CleaningTaskStatusLabels, CleaningTaskStatusColors } from '@/types';
import ConfirmDialog from '@/components/ConfirmDialog';
import Modal from '@/components/Modal';
import { formatDateDisplay } from '@/utils/date';

export default function CleaningTaskList() {
  const {
    stores,
    addCleaningTask,
    updateCleaningTaskStatus,
    deleteCleaningTask,
    getRoomById,
    getRoomsByStore,
    getCleaningTasksByStore,
    getStoreById,
    hasPermission,
  } = useAppStore();

  const canUpdateCleaning = hasPermission('cleaning:update');

  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<CleaningTaskStatus | 'all'>('all');
  const [deleteTarget, setDeleteTarget] = useState<CleaningTask | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [newTaskRoomId, setNewTaskRoomId] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTaskNotes, setNewTaskNotes] = useState('');

  const activeRooms = useMemo(() => getRoomsByStore(storeFilter).filter((r) => r.status === 'active'), [storeFilter, getRoomsByStore]);

  const filteredTasks = useMemo(() => getCleaningTasksByStore(storeFilter), [storeFilter, getCleaningTasksByStore])
    .filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (search) {
        const lower = search.toLowerCase();
        const room = getRoomById(t.roomId);
        return (
          (room?.roomNumber.toLowerCase().includes(lower) ?? false) ||
          (room?.name.toLowerCase().includes(lower) ?? false) ||
          (t.guestName?.toLowerCase().includes(lower) ?? false) ||
          (t.notes?.toLowerCase().includes(lower) ?? false)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (a.status === b.status) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      const statusOrder: Record<CleaningTaskStatus, number> = {
        pending: 0,
        'in-progress': 1,
        completed: 2,
      };
      return statusOrder[a.status] - statusOrder[b.status];
    });

  const allTasksByStore = useMemo(() => getCleaningTasksByStore(storeFilter), [storeFilter, getCleaningTasksByStore]);
  const pendingCount = allTasksByStore.filter((t) => t.status === 'pending').length;
  const inProgressCount = allTasksByStore.filter((t) => t.status === 'in-progress').length;
  const completedCount = allTasksByStore.filter((t) => t.status === 'completed').length;

  const getRoomNumber = (roomId: string) => {
    const room = getRoomById(roomId);
    return room ? `${room.roomNumber} ${room.name}` : '未知房间';
  };

  const handleDeleteClick = (task: CleaningTask) => {
    setDeleteTarget(task);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteCleaningTask(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  const handleStatusChange = (task: CleaningTask, status: CleaningTaskStatus) => {
    updateCleaningTaskStatus(task.id, status);
  };

  const handleOpenForm = () => {
    setNewTaskRoomId(activeRooms[0]?.id || '');
    setNewTaskDate(new Date().toISOString().split('T')[0]);
    setNewTaskNotes('');
    setFormOpen(true);
  };

  const handleSubmitNewTask = () => {
    if (!newTaskRoomId) return;
    addCleaningTask({
      roomId: newTaskRoomId,
      scheduledDate: newTaskDate,
      status: 'pending',
      notes: newTaskNotes || undefined,
    });
    setFormOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-brown">保洁工单管理</h1>
          <p className="text-brand-taupe mt-1">管理所有房间的保洁任务</p>
        </div>
        {canUpdateCleaning && (
          <button onClick={handleOpenForm} className="btn-primary">
            <Plus className="w-4 h-4" />
            新增保洁任务
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card-base p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="text-xs text-brand-taupe">待处理</div>
            <div className="font-display text-2xl font-bold text-amber-600">{pendingCount}</div>
          </div>
        </div>
        <div className="card-base p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <Play className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-xs text-brand-taupe">进行中</div>
            <div className="font-display text-2xl font-bold text-blue-600">{inProgressCount}</div>
          </div>
        </div>
        <div className="card-base p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <div className="text-xs text-brand-taupe">已完成</div>
            <div className="font-display text-2xl font-bold text-green-600">{completedCount}</div>
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
              placeholder="搜索房间号、房间名、客人姓名..."
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
              onChange={(e) => setStatusFilter(e.target.value as CleaningTaskStatus | 'all')}
            >
              <option value="all">全部状态</option>
              {(Object.keys(CleaningTaskStatusLabels) as CleaningTaskStatus[]).map((s) => (
                <option key={s} value={s}>
                  {CleaningTaskStatusLabels[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card-base overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="p-16 text-center">
            <Sparkles className="w-16 h-16 mx-auto text-brand-brown/30 mb-4" />
            <h3 className="font-display text-lg text-brand-brown mb-2">暂无保洁任务</h3>
            <p className="text-brand-taupe mb-6">退房后会自动生成保洁任务，也可手动添加</p>
            {canUpdateCleaning && (
              <button onClick={handleOpenForm} className="btn-primary">
                <Plus className="w-4 h-4" />
                新增保洁任务
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-brand-beige/60">
                <tr>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                    房间
                  </th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                    关联客人
                  </th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                    计划日期
                  </th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                    备注
                  </th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                    状态
                  </th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                    创建时间
                  </th>
                  <th className="text-right text-sm font-medium text-brand-taupe px-5 py-3">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task, idx) => {
                  const room = getRoomById(task.roomId);
                  return (
                    <tr
                      key={task.id}
                      className={`border-t border-brand-brown/5 hover:bg-brand-beige/30 transition-colors ${
                        idx % 2 === 1 ? 'bg-brand-cream/50' : ''
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-brand-beige/60 flex items-center justify-center">
                            <BedDouble className="w-5 h-5 text-brand-brown" />
                          </div>
                          <div>
                            <div className="font-medium text-brand-brown">
                              {room?.roomNumber} {room?.name}
                            </div>
                            <div className="text-xs text-brand-taupe flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {room ? (getStoreById(room.storeId)?.name || '未知门店') : '-'}
                              {room ? ` · ¥${room.price}/晚` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-brand-brown">
                          {task.guestName || '-'}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-brand-brown">
                          {formatDateDisplay(task.scheduledDate)}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-brand-taupe max-w-xs truncate">
                          {task.notes || '-'}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CleaningTaskStatusColors[task.status]}`}
                        >
                          {CleaningTaskStatusLabels[task.status]}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-brand-taupe">
                          {formatDateDisplay(task.createdAt)}
                        </div>
                        {task.completedAt && (
                          <div className="text-xs text-green-600">
                            完成: {formatDateDisplay(task.completedAt)}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {canUpdateCleaning && (
                            <>
                              {task.status === 'pending' && (
                                <button
                                  onClick={() => handleStatusChange(task, 'in-progress')}
                                  className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="开始保洁"
                                >
                                  <Play className="w-4 h-4" />
                                </button>
                              )}
                              {(task.status === 'pending' || task.status === 'in-progress') && (
                                <button
                                  onClick={() => handleStatusChange(task, 'completed')}
                                  className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                                  title="标记完成"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteClick(task)}
                                className="p-2 rounded-lg text-brand-taupe hover:bg-red-50 hover:text-red-500 transition-colors"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="确认删除保洁任务"
        message={`确定要删除房间 ${deleteTarget && getRoomNumber(deleteTarget.roomId)} 的保洁任务吗？`}
        confirmText="删除"
        variant="danger"
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="新增保洁任务"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="label-base">选择房间</label>
            <select
              className="input-base"
              value={newTaskRoomId}
              onChange={(e) => setNewTaskRoomId(e.target.value)}
            >
              {activeRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-base">计划日期</label>
            <input
              type="date"
              className="input-base"
              value={newTaskDate}
              onChange={(e) => setNewTaskDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label-base">备注</label>
            <textarea
              className="input-base resize-none"
              rows={3}
              value={newTaskNotes}
              onChange={(e) => setNewTaskNotes(e.target.value)}
              placeholder="可选：添加保洁备注..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setFormOpen(false)} className="btn-secondary">
              取消
            </button>
            <button onClick={handleSubmitNewTask} className="btn-primary">
              创建任务
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
