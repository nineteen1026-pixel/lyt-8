import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, Calendar, Clock, X } from 'lucide-react';
import type { Room, ClosedDate, ClosedDateReason, MinStayRule } from '@/types';
import { ClosedDateReasonLabels, ClosedDateReasonColors } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { formatDateDisplay, calculateNights } from '@/utils/date';

interface RoomRulesModalProps {
  open: boolean;
  onClose: () => void;
  room: Room | null;
}

type TabType = 'closedDates' | 'minStay';

export default function RoomRulesModal({ open, onClose, room }: RoomRulesModalProps) {
  const {
    getClosedDatesByRoom,
    addClosedDate,
    updateClosedDate,
    deleteClosedDate,
    getMinStayRulesByRoom,
    addMinStayRule,
    updateMinStayRule,
    deleteMinStayRule,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<TabType>('closedDates');
  const [closedDateFormOpen, setClosedDateFormOpen] = useState(false);
  const [editingClosedDate, setEditingClosedDate] = useState<ClosedDate | null>(null);
  const [deleteClosedDateTarget, setDeleteClosedDateTarget] = useState<ClosedDate | null>(null);

  const [minStayFormOpen, setMinStayFormOpen] = useState(false);
  const [editingMinStayRule, setEditingMinStayRule] = useState<MinStayRule | null>(null);
  const [deleteMinStayTarget, setDeleteMinStayTarget] = useState<MinStayRule | null>(null);

  const closedDates = useMemo(() => (room ? getClosedDatesByRoom(room.id) : []), [room, getClosedDatesByRoom]);
  const minStayRules = useMemo(() => (room ? getMinStayRulesByRoom(room.id) : []), [room, getMinStayRulesByRoom]);

  const handleAddClosedDate = () => {
    setEditingClosedDate(null);
    setClosedDateFormOpen(true);
  };

  const handleEditClosedDate = (cd: ClosedDate) => {
    setEditingClosedDate(cd);
    setClosedDateFormOpen(true);
  };

  const handleDeleteClosedDate = (cd: ClosedDate) => {
    setDeleteClosedDateTarget(cd);
  };

  const handleConfirmDeleteClosedDate = () => {
    if (deleteClosedDateTarget) {
      deleteClosedDate(deleteClosedDateTarget.id);
    }
    setDeleteClosedDateTarget(null);
  };

  const handleClosedDateSubmit = (data: Omit<ClosedDate, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!room) return;
    if (editingClosedDate) {
      updateClosedDate(editingClosedDate.id, data);
    } else {
      addClosedDate(data);
    }
    setClosedDateFormOpen(false);
  };

  const handleAddMinStayRule = () => {
    setEditingMinStayRule(null);
    setMinStayFormOpen(true);
  };

  const handleEditMinStayRule = (rule: MinStayRule) => {
    setEditingMinStayRule(rule);
    setMinStayFormOpen(true);
  };

  const handleDeleteMinStayRule = (rule: MinStayRule) => {
    setDeleteMinStayTarget(rule);
  };

  const handleConfirmDeleteMinStay = () => {
    if (deleteMinStayTarget) {
      deleteMinStayRule(deleteMinStayTarget.id);
    }
    setDeleteMinStayTarget(null);
  };

  const handleMinStaySubmit = (data: Omit<MinStayRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!room) return;
    if (editingMinStayRule) {
      updateMinStayRule(editingMinStayRule.id, data);
    } else {
      addMinStayRule(data);
    }
    setMinStayFormOpen(false);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`房间规则 - ${room?.roomNumber} ${room?.name || ''}`}
        size="xl"
      >
        <div className="flex border-b border-brand-brown/10 mb-5">
          <button
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 -mb-px ${
              activeTab === 'closedDates'
                ? 'text-brand-brown border-brand-brown'
                : 'text-brand-taupe border-transparent hover:text-brand-brown'
            }`}
            onClick={() => setActiveTab('closedDates')}
          >
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              禁订日期
            </span>
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 -mb-px ${
              activeTab === 'minStay'
                ? 'text-brand-brown border-brand-brown'
                : 'text-brand-taupe border-transparent hover:text-brand-brown'
            }`}
            onClick={() => setActiveTab('minStay')}
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              最短连住
            </span>
          </button>
        </div>

        {activeTab === 'closedDates' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-brand-taupe">
                设置房间不可预订的日期区间，如维护、节假日等
              </p>
              <button onClick={handleAddClosedDate} className="btn-primary !py-1.5 !px-3 text-sm">
                <Plus className="w-4 h-4" />
                添加禁订
              </button>
            </div>

            {closedDates.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 mx-auto text-brand-brown/20 mb-3" />
                <p className="text-brand-taupe text-sm">暂无禁订日期</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {closedDates.map((cd) => (
                  <div
                    key={cd.id}
                    className="p-3 rounded-xl border border-brand-brown/10 bg-white hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-rose-500" />
                        </div>
                        <div>
                          <div className="font-medium text-brand-brown text-sm">
                            {formatDateDisplay(cd.startDate)} - {formatDateDisplay(cd.endDate)}
                          </div>
                          <div className="text-xs text-brand-taupe">
                            共 {calculateNights(cd.startDate, cd.endDate) + 1} 天
                            {cd.description && ` · ${cd.description}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ClosedDateReasonColors[cd.reason]}`}>
                          {ClosedDateReasonLabels[cd.reason]}
                        </span>
                        <button
                          onClick={() => handleEditClosedDate(cd)}
                          className="p-1.5 rounded-lg text-brand-taupe hover:bg-brand-beige hover:text-brand-brown transition-colors"
                          title="编辑"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClosedDate(cd)}
                          className="p-1.5 rounded-lg text-brand-taupe hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'minStay' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-brand-taupe">
                设置特定日期区间的最短连住晚数要求
              </p>
              <button onClick={handleAddMinStayRule} className="btn-primary !py-1.5 !px-3 text-sm">
                <Plus className="w-4 h-4" />
                添加规则
              </button>
            </div>

            {minStayRules.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto text-brand-brown/20 mb-3" />
                <p className="text-brand-taupe text-sm">暂无最短连住规则</p>
                <p className="text-brand-taupe/60 text-xs mt-1">默认最短连住 1 晚</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {minStayRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3 rounded-xl border border-brand-brown/10 bg-white hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-brand-sage/20 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-brand-green" />
                        </div>
                        <div>
                          <div className="font-medium text-brand-brown text-sm">
                            最短连住 {rule.minNights} 晚
                          </div>
                          <div className="text-xs text-brand-taupe">
                            {formatDateDisplay(rule.startDate)} - {formatDateDisplay(rule.endDate)}
                            {rule.description && ` · ${rule.description}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditMinStayRule(rule)}
                          className="p-1.5 rounded-lg text-brand-taupe hover:bg-brand-beige hover:text-brand-brown transition-colors"
                          title="编辑"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMinStayRule(rule)}
                          className="p-1.5 rounded-lg text-brand-taupe hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <ClosedDateForm
        open={closedDateFormOpen}
        onClose={() => setClosedDateFormOpen(false)}
        onSubmit={handleClosedDateSubmit}
        closedDate={editingClosedDate}
        roomId={room?.id}
      />

      <MinStayForm
        open={minStayFormOpen}
        onClose={() => setMinStayFormOpen(false)}
        onSubmit={handleMinStaySubmit}
        rule={editingMinStayRule}
        roomId={room?.id}
      />

      <ConfirmDialog
        open={!!deleteClosedDateTarget}
        onClose={() => setDeleteClosedDateTarget(null)}
        onConfirm={handleConfirmDeleteClosedDate}
        title="确认删除禁订日期"
        message={`确定要删除该禁订日期（${deleteClosedDateTarget ? formatDateDisplay(deleteClosedDateTarget.startDate) + ' - ' + formatDateDisplay(deleteClosedDateTarget.endDate) : ''}）吗？`}
        confirmText="删除"
        variant="danger"
      />

      <ConfirmDialog
        open={!!deleteMinStayTarget}
        onClose={() => setDeleteMinStayTarget(null)}
        onConfirm={handleConfirmDeleteMinStay}
        title="确认删除最短连住规则"
        message={`确定要删除该最短连住规则（最短${deleteMinStayTarget?.minNights}晚）吗？`}
        confirmText="删除"
        variant="danger"
      />
    </>
  );
}

interface ClosedDateFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<ClosedDate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  closedDate: ClosedDate | null;
  roomId?: string;
}

function ClosedDateForm({ open, onClose, onSubmit, closedDate, roomId }: ClosedDateFormProps) {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: 'maintenance' as ClosedDateReason,
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (closedDate) {
      setFormData({
        startDate: closedDate.startDate,
        endDate: closedDate.endDate,
        reason: closedDate.reason,
        description: closedDate.description || '',
      });
    } else {
      setFormData({
        startDate: '',
        endDate: '',
        reason: 'maintenance',
        description: '',
      });
    }
    setErrors({});
  }, [closedDate, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.startDate) newErrors.startDate = '请选择开始日期';
    if (!formData.endDate) newErrors.endDate = '请选择结束日期';
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = '结束日期不能早于开始日期';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !roomId) return;
    onSubmit({
      roomId,
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: formData.reason,
      description: formData.description.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={closedDate ? '编辑禁订日期' : '添加禁订日期'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-base">开始日期 *</label>
            <input
              type="date"
              className={`input-base ${errors.startDate ? 'border-red-400' : ''}`}
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
          </div>
          <div>
            <label className="label-base">结束日期 *</label>
            <input
              type="date"
              className={`input-base ${errors.endDate ? 'border-red-400' : ''}`}
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
            {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
          </div>
        </div>

        <div>
          <label className="label-base">禁订原因</label>
          <select
            className="input-base"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value as ClosedDateReason })}
          >
            {(Object.keys(ClosedDateReasonLabels) as ClosedDateReason[]).map((reason) => (
              <option key={reason} value={reason}>
                {ClosedDateReasonLabels[reason]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label-base">备注说明</label>
          <input
            type="text"
            className="input-base"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="可选，填写备注信息"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-brand-brown/10">
          <button type="button" onClick={onClose} className="btn-secondary">
            取消
          </button>
          <button type="submit" className="btn-primary">
            {closedDate ? '保存修改' : '确认添加'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface MinStayFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<MinStayRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  rule: MinStayRule | null;
  roomId?: string;
}

function MinStayForm({ open, onClose, onSubmit, rule, roomId }: MinStayFormProps) {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    minNights: 2,
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (rule) {
      setFormData({
        startDate: rule.startDate,
        endDate: rule.endDate,
        minNights: rule.minNights,
        description: rule.description || '',
      });
    } else {
      setFormData({
        startDate: '',
        endDate: '',
        minNights: 2,
        description: '',
      });
    }
    setErrors({});
  }, [rule, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.startDate) newErrors.startDate = '请选择开始日期';
    if (!formData.endDate) newErrors.endDate = '请选择结束日期';
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = '结束日期不能早于开始日期';
    }
    if (formData.minNights < 1) newErrors.minNights = '最短连住至少1晚';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !roomId) return;
    onSubmit({
      roomId,
      startDate: formData.startDate,
      endDate: formData.endDate,
      minNights: formData.minNights,
      description: formData.description.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={rule ? '编辑最短连住规则' : '添加最短连住规则'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-base">开始日期 *</label>
            <input
              type="date"
              className={`input-base ${errors.startDate ? 'border-red-400' : ''}`}
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
          </div>
          <div>
            <label className="label-base">结束日期 *</label>
            <input
              type="date"
              className={`input-base ${errors.endDate ? 'border-red-400' : ''}`}
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
            {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
          </div>
        </div>

        <div>
          <label className="label-base">最短连住晚数 *</label>
          <input
            type="number"
            min={1}
            className={`input-base ${errors.minNights ? 'border-red-400' : ''}`}
            value={formData.minNights}
            onChange={(e) => setFormData({ ...formData, minNights: Number(e.target.value) })}
          />
          {errors.minNights && <p className="text-red-500 text-xs mt-1">{errors.minNights}</p>}
        </div>

        <div>
          <label className="label-base">规则说明</label>
          <input
            type="text"
            className="input-base"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="可选，如：旺季、节假日等"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-brand-brown/10">
          <button type="button" onClick={onClose} className="btn-secondary">
            取消
          </button>
          <button type="submit" className="btn-primary">
            {rule ? '保存修改' : '确认添加'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
