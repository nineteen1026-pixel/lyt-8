import { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Eye,
  Power,
  PowerOff,
  Tag,
  Building2,
  BedDouble,
  Check,
  X,
} from 'lucide-react';
import { format, getMonth, getYear, isToday } from 'date-fns';
import { useAppStore } from '@/store/useAppStore';
import {
  getMonthMatrix,
  getWeekDays,
  formatMonth,
  formatDateDisplay,
  calculateNights,
  todayStr,
} from '@/utils/date';
import type {
  HolidayPricingTemplate,
  PriceAdjustmentType,
  RoomType,
} from '@/types';
import {
  PriceAdjustmentTypeLabels,
  RoomTypeLabels,
} from '@/types';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function HolidayPricing() {
  const {
    stores,
    rooms,
    holidayPricingTemplates,
    addHolidayPricingTemplate,
    updateHolidayPricingTemplate,
    deleteHolidayPricingTemplate,
    getAdjustedPriceForRoom,
    getRoomById,
    getRoomsByStore,
    getStoreById,
    hasPermission,
  } = useAppStore();

  const canCreate = hasPermission('holidaypricing:create');
  const canUpdate = hasPermission('holidaypricing:update');
  const canDelete = hasPermission('holidaypricing:delete');

  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<HolidayPricingTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HolidayPricingTemplate | null>(null);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [previewRoomId, setPreviewRoomId] = useState<string | null>(null);
  const [previewRoomTypeFilter, setPreviewRoomTypeFilter] = useState<RoomType | 'all'>('all');
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareRoomIds, setCompareRoomIds] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [storeFilter, setStoreFilter] = useState<string>('all');

  const filteredRooms = useMemo(
    () => getRoomsByStore(storeFilter).filter((r) => r.status === 'active'),
    [getRoomsByStore, storeFilter]
  );

  const previewTemplate = holidayPricingTemplates.find((t) => t.id === previewTemplateId);
  const previewRoom = previewRoomId ? getRoomById(previewRoomId) : null;

  const getTemplateRoomTypes = (template: HolidayPricingTemplate): RoomType[] => {
    const types = new Set<RoomType>();
    template.roomIds.forEach((id) => {
      const room = getRoomById(id);
      if (room) types.add(room.type);
    });
    return Array.from(types);
  };

  const previewAvailableRooms = useMemo(() => {
    const baseRooms = previewTemplate && previewTemplate.roomIds.length > 0
      ? rooms.filter((r) => previewTemplate.roomIds.includes(r.id) && r.status === 'active')
      : filteredRooms;
    if (previewRoomTypeFilter === 'all') return baseRooms;
    return baseRooms.filter((r) => r.type === previewRoomTypeFilter);
  }, [previewTemplate, rooms, filteredRooms, previewRoomTypeFilter]);

  const compareRooms = useMemo(() => {
    return compareRoomIds
      .map((id) => getRoomById(id))
      .filter((r): r is NonNullable<typeof r> => r !== undefined);
  }, [compareRoomIds, getRoomById]);

  const handlePreview = (template: HolidayPricingTemplate) => {
    if (previewTemplateId === template.id) {
      setPreviewTemplateId(null);
      setPreviewRoomId(null);
      setCompareRoomIds([]);
      setIsCompareMode(false);
    } else {
      setPreviewTemplateId(template.id);
      const firstRoomId = template.roomIds[0];
      if (firstRoomId) {
        setPreviewRoomId(firstRoomId);
      } else if (filteredRooms.length > 0) {
        setPreviewRoomId(filteredRooms[0].id);
      } else {
        setPreviewRoomId(null);
      }
      setCompareRoomIds([]);
      setIsCompareMode(false);
    }
  };

  const toggleCompareRoom = (roomId: string) => {
    setCompareRoomIds((prev) => {
      if (prev.includes(roomId)) {
        return prev.filter((id) => id !== roomId);
      }
      if (prev.length >= 4) return prev;
      return [...prev, roomId];
    });
  };

  const getAdjustedPrice = (roomId: string, dateStr: string) => {
    if (!previewTemplate) return null;
    if (dateStr < previewTemplate.startDate || dateStr > previewTemplate.endDate) return null;
    return getAdjustedPriceForRoom(roomId, dateStr);
  };

  const handleAdd = () => {
    setEditingTemplate(null);
    setFormOpen(true);
  };

  const handleEdit = (template: HolidayPricingTemplate) => {
    setEditingTemplate(template);
    setFormOpen(true);
  };

  const handleToggle = (template: HolidayPricingTemplate) => {
    updateHolidayPricingTemplate(template.id, { enabled: !template.enabled });
  };

  const handleFormSubmit = (
    data: Omit<HolidayPricingTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (editingTemplate) {
      updateHolidayPricingTemplate(editingTemplate.id, data);
    } else {
      addHolidayPricingTemplate(data);
    }
    setFormOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteHolidayPricingTemplate(deleteTarget.id);
      if (previewTemplateId === deleteTarget.id) {
        setPreviewTemplateId(null);
        setPreviewRoomId(null);
      }
    }
    setDeleteTarget(null);
  };

  const getAdjustmentDescription = (template: HolidayPricingTemplate) => {
    switch (template.adjustmentType) {
      case 'fixed':
        return `设为 ¥${template.adjustmentValue}/晚`;
      case 'percentage':
        return template.adjustmentValue >= 0
          ? `上浮 ${template.adjustmentValue}%`
          : `下调 ${Math.abs(template.adjustmentValue)}%`;
      case 'add':
        return template.adjustmentValue >= 0
          ? `加价 ¥${template.adjustmentValue}/晚`
          : `减价 ¥${Math.abs(template.adjustmentValue)}/晚`;
    }
  };

  const getAdjustmentBadge = (template: HolidayPricingTemplate) => {
    const isUp =
      (template.adjustmentType === 'percentage' && template.adjustmentValue > 0) ||
      (template.adjustmentType === 'add' && template.adjustmentValue > 0) ||
      (template.adjustmentType === 'fixed');
    const isDown =
      (template.adjustmentType === 'percentage' && template.adjustmentValue < 0) ||
      (template.adjustmentType === 'add' && template.adjustmentValue < 0);

    if (isUp) return <Badge variant="danger">↑ {getAdjustmentDescription(template)}</Badge>;
    if (isDown) return <Badge variant="green">↓ {getAdjustmentDescription(template)}</Badge>;
    return <Badge>{getAdjustmentDescription(template)}</Badge>;
  };

  const year = getYear(currentDate);
  const month = getMonth(currentDate);
  const weeks = useMemo(() => getMonthMatrix(year, month), [year, month]);
  const weekDays = getWeekDays();

  const handlePrevMonth = () => {
    setCurrentDate((d) => {
      const nd = new Date(d);
      nd.setMonth(nd.getMonth() - 1);
      return nd;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate((d) => {
      const nd = new Date(d);
      nd.setMonth(nd.getMonth() + 1);
      return nd;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-brown">
            节假日调价
          </h1>
          <p className="text-brand-taupe mt-1">
            配置节假日调价模板，按日期区间一键应用至指定房型
          </p>
        </div>
        {canCreate && (
          <button onClick={handleAdd} className="btn-primary">
            <Plus className="w-4 h-4" />
            新增模板
          </button>
        )}
      </div>

      <div className="card-base p-4 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Building2 className="w-4 h-4 text-brand-taupe" />
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
            共 {holidayPricingTemplates.length} 个调价模板
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2">
          <div className="card-base p-5">
            <h2 className="font-display text-lg font-semibold text-brand-brown mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5" />
              调价模板
            </h2>

            {holidayPricingTemplates.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="w-12 h-12 mx-auto text-brand-brown/20 mb-3" />
                <p className="text-brand-taupe text-sm">暂无调价模板</p>
                <p className="text-brand-taupe/60 text-xs mt-1">
                  点击上方按钮创建第一个模板
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto">
                {holidayPricingTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-4 rounded-xl border transition-all ${
                      previewTemplateId === template.id
                        ? 'border-brand-brown/40 bg-brand-beige/50 shadow-soft'
                        : 'border-brand-brown/10 bg-white hover:shadow-sm'
                    } ${!template.enabled ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-semibold text-brand-brown">
                          {template.name}
                        </span>
                        {template.enabled ? (
                          <Badge variant="green">已启用</Badge>
                        ) : (
                          <Badge variant="default">已停用</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handlePreview(template)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            previewTemplateId === template.id
                              ? 'bg-brand-brown text-white'
                              : 'text-brand-taupe hover:bg-brand-sage/20 hover:text-brand-green'
                          }`}
                          title="日历预览"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canUpdate && (
                          <button
                            onClick={() => handleToggle(template)}
                            className="p-1.5 rounded-lg text-brand-taupe hover:bg-brand-beige hover:text-brand-brown transition-colors"
                            title={template.enabled ? '停用' : '启用'}
                          >
                            {template.enabled ? (
                              <PowerOff className="w-4 h-4" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        {canUpdate && (
                          <button
                            onClick={() => handleEdit(template)}
                            className="p-1.5 rounded-lg text-brand-taupe hover:bg-brand-beige hover:text-brand-brown transition-colors"
                            title="编辑"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteTarget(template)}
                            className="p-1.5 rounded-lg text-brand-taupe hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm text-brand-taupe flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {formatDateDisplay(template.startDate)} ~{' '}
                        {formatDateDisplay(template.endDate)}
                        <span className="text-xs">
                          ({calculateNights(template.startDate, template.endDate) + 1}天)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getAdjustmentBadge(template)}
                        <span className="text-xs text-brand-taupe">
                          {template.roomIds.length}间房间
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {getTemplateRoomTypes(template).map((type) => (
                          <span
                            key={type}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-cream text-xs text-brand-taupe"
                          >
                            <BedDouble className="w-3 h-3" />
                            {RoomTypeLabels[type]}
                          </span>
                        ))}
                      </div>
                      {template.description && (
                        <div className="text-xs text-brand-taupe/70">
                          {template.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-3">
          <div className="card-base p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-brand-brown flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                日历预览
              </h2>
              {previewTemplate && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setIsCompareMode(!isCompareMode)}
                    className={`btn-secondary !py-1.5 !text-sm ${
                      isCompareMode ? '!bg-brand-brown !text-white' : ''
                    }`}
                  >
                    {isCompareMode ? '退出对比' : '多房对比'}
                  </button>
                </div>
              )}
            </div>

            {previewTemplate ? (
              <>
                <div className="mb-4 p-3 rounded-xl bg-brand-orange/10 border border-brand-orange/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-brand-orange" />
                    <span className="font-medium text-brand-brown text-sm">
                      {previewTemplate.name}
                    </span>
                    <span className="text-xs text-brand-taupe">
                      ({PriceAdjustmentTypeLabels[previewTemplate.adjustmentType]})
                    </span>
                    <Badge variant={previewTemplate.enabled ? 'green' : 'default'}>
                      {previewTemplate.enabled ? '已启用' : '已停用'}
                    </Badge>
                  </div>
                  <div className="text-sm text-brand-taupe">
                    {formatDateDisplay(previewTemplate.startDate)} ~{' '}
                    {formatDateDisplay(previewTemplate.endDate)}
                    <span className="mx-2">·</span>
                    {getAdjustmentDescription(previewTemplate)}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-brand-taupe">房型筛选:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreviewRoomTypeFilter('all')}
                        className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                          previewRoomTypeFilter === 'all'
                            ? 'bg-brand-brown text-white'
                            : 'bg-brand-beige text-brand-taupe hover:bg-brand-brown/10'
                        }`}
                      >
                        全部
                      </button>
                      {(Object.keys(RoomTypeLabels) as RoomType[]).map((type) => (
                        <button
                          key={type}
                          onClick={() => setPreviewRoomTypeFilter(type)}
                          className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                            previewRoomTypeFilter === type
                              ? 'bg-brand-brown text-white'
                              : 'bg-brand-beige text-brand-taupe hover:bg-brand-brown/10'
                          }`}
                        >
                          {RoomTypeLabels[type]}
                        </button>
                      ))}
                    </div>
                  </div>
                  {!isCompareMode && (
                    <select
                      className="input-base !w-auto !py-1.5 !text-sm"
                      value={previewRoomId || ''}
                      onChange={(e) => setPreviewRoomId(e.target.value)}
                    >
                      {previewAvailableRooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.roomNumber} {r.name} (¥{r.price}/晚)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {isCompareMode && (
                  <div className="mb-3 p-3 bg-brand-cream/50 rounded-xl border border-brand-brown/10">
                    <div className="text-xs text-brand-taupe mb-2">
                      选择要对比的房间（最多4间）:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {previewAvailableRooms.slice(0, 8).map((room) => {
                        const selected = compareRoomIds.includes(room.id);
                        return (
                          <button
                            key={room.id}
                            onClick={() => toggleCompareRoom(room.id)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                              selected
                                ? 'bg-brand-brown text-white'
                                : 'bg-white text-brand-taupe hover:bg-brand-beige border border-brand-brown/10'
                            }`}
                          >
                            {room.roomNumber}
                          </button>
                        );
                      })}
                    </div>
                    {compareRoomIds.length === 0 && (
                      <p className="text-xs text-brand-taupe/60 mt-2">
                        请选择至少1间房间进行对比
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handlePrevMonth}
                      className="p-2 rounded-lg hover:bg-brand-beige text-brand-taupe hover:text-brand-brown transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h3 className="font-display text-xl font-semibold text-brand-brown min-w-[140px] text-center">
                      {formatMonth(currentDate)}
                    </h3>
                    <button
                      onClick={handleNextMonth}
                      className="p-2 rounded-lg hover:bg-brand-beige text-brand-taupe hover:text-brand-brown transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  <button onClick={handleToday} className="btn-secondary">
                    今天
                  </button>
                </div>

                {!isCompareMode && previewRoom ? (
                  <>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {weekDays.map((d) => (
                        <div
                          key={d}
                          className="text-center text-sm font-medium text-brand-taupe py-2"
                        >
                          周{d}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {weeks.map((week, wi) =>
                        week.map((date, di) => {
                          const isCurrentMonth = getMonth(date) === month;
                          const dateStr = format(date, 'yyyy-MM-dd');
                          const isInRange =
                            isCurrentMonth &&
                            dateStr >= previewTemplate.startDate &&
                            dateStr <= previewTemplate.endDate;
                          const adjustedPrice = isInRange
                            ? getAdjustedPriceForRoom(previewRoom.id, dateStr)
                            : null;
                          const isTodayCell = isToday(date);

                          return (
                            <div
                              key={`${wi}-${di}`}
                              className={`relative aspect-square min-h-[90px] p-2 rounded-xl text-left transition-all ${
                                !isCurrentMonth
                                  ? 'bg-white/30 text-gray-300'
                                  : isInRange && adjustedPrice !== null
                                  ? adjustedPrice > previewRoom.price
                                    ? 'bg-brand-orange/20 hover:bg-brand-orange/30 text-brand-brown'
                                    : adjustedPrice < previewRoom.price
                                    ? 'bg-brand-sage/30 hover:bg-brand-sage/50 text-brand-brown'
                                    : 'bg-brand-beige hover:bg-brand-beige/80 text-brand-brown'
                                  : 'bg-white hover:bg-brand-cream text-brand-brown'
                              } ${isInRange ? 'ring-1 ring-brand-orange/30' : ''}`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span
                                  className={`text-sm font-medium ${
                                    isTodayCell
                                      ? 'w-7 h-7 rounded-full bg-brand-brown text-white flex items-center justify-center'
                                      : ''
                                  }`}
                                >
                                  {format(date, 'd')}
                                </span>
                                {isInRange && (
                                  <span className="w-2 h-2 rounded-full bg-brand-orange" />
                                )}
                              </div>
                              {isCurrentMonth && (
                                <div className="space-y-0.5 mt-1">
                                  <div className="text-xs text-brand-taupe/70">
                                    ¥{previewRoom.price}
                                  </div>
                                  {isInRange && adjustedPrice !== null && (
                                    <div
                                      className={`text-xs font-semibold ${
                                        adjustedPrice > previewRoom.price
                                          ? 'text-brand-orange'
                                          : adjustedPrice < previewRoom.price
                                          ? 'text-brand-green'
                                          : 'text-brand-brown'
                                      }`}
                                    >
                                      → ¥{adjustedPrice}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-4 text-sm text-brand-taupe flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-white border border-brand-brown/20" />
                        原价
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-brand-orange/20" />
                        涨价
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-brand-sage/30" />
                        降价
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-brand-orange" />
                        在调价区间内
                      </span>
                    </div>
                  </>
                ) : isCompareMode && compareRooms.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {weekDays.map((d) => (
                        <div
                          key={d}
                          className="text-center text-sm font-medium text-brand-taupe py-2"
                        >
                          周{d}
                        </div>
                      ))}
                    </div>

                    {compareRooms.map((room, roomIdx) => (
                      <div key={room.id} className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={roomIdx === 0 ? 'default' : roomIdx === 1 ? 'green' : roomIdx === 2 ? 'danger' : 'warning'}
                          >
                            {room.roomNumber} {room.name}
                          </Badge>
                          <span className="text-xs text-brand-taupe">
                            基础价 ¥{room.price}/晚
                          </span>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {weeks.flat().map((date, di) => {
                            const isCurrentMonth = getMonth(date) === month;
                            const dateStr = format(date, 'yyyy-MM-dd');
                            const isInRange =
                              isCurrentMonth &&
                              dateStr >= previewTemplate.startDate &&
                              dateStr <= previewTemplate.endDate;
                            const adjustedPrice = isInRange
                              ? getAdjustedPriceForRoom(room.id, dateStr)
                              : null;
                            const isTodayCell = isToday(date);
                            const priceDiff = adjustedPrice !== null ? adjustedPrice - room.price : 0;

                            return (
                              <div
                                key={`${room.id}-${di}`}
                                className={`relative aspect-[2/1] min-h-[40px] p-1 rounded-lg text-center transition-all ${
                                  !isCurrentMonth
                                    ? 'bg-white/30'
                                    : isInRange && adjustedPrice !== null
                                    ? priceDiff > 0
                                      ? 'bg-brand-orange/20 text-brand-brown'
                                      : priceDiff < 0
                                      ? 'bg-brand-sage/30 text-brand-brown'
                                      : 'bg-brand-beige text-brand-brown'
                                    : 'bg-white text-brand-brown'
                                } ${isInRange ? 'ring-1 ring-brand-orange/20' : ''}`}
                              >
                                <div
                                  className={`text-xs font-medium ${
                                    isTodayCell ? 'text-brand-brown font-bold' : ''
                                  }`}
                                >
                                  {format(date, 'd')}
                                </div>
                                {isCurrentMonth && isInRange && adjustedPrice !== null && (
                                  <div
                                    className={`text-xs font-semibold ${
                                      priceDiff > 0
                                        ? 'text-brand-orange'
                                        : priceDiff < 0
                                        ? 'text-brand-green'
                                        : 'text-brand-brown'
                                    }`}
                                  >
                                    ¥{adjustedPrice}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center gap-4 mt-2 text-sm text-brand-taupe flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-white border border-brand-brown/20" />
                        原价
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-brand-orange/20" />
                        涨价
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-brand-sage/30" />
                        降价
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Eye className="w-12 h-12 mx-auto text-brand-brown/20 mb-3" />
                    <p className="text-brand-taupe text-sm">
                      {isCompareMode ? '请选择要对比的房间' : '选择房间查看调价效果'}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <Eye className="w-16 h-16 mx-auto text-brand-brown/20 mb-4" />
                <h3 className="font-display text-lg text-brand-brown mb-2">
                  选择模板预览调价效果
                </h3>
                <p className="text-brand-taupe text-sm">
                  点击左侧模板的预览按钮，在日历上查看调价前后价格对比
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <TemplateFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        template={editingTemplate}
        filteredRooms={filteredRooms}
        stores={stores}
        getStoreById={getStoreById}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="确认删除调价模板"
        message={`确定要删除调价模板「${deleteTarget?.name}」吗？此操作不可恢复。`}
        confirmText="删除"
        variant="danger"
      />
    </div>
  );
}

interface TemplateFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<HolidayPricingTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  template: HolidayPricingTemplate | null;
  filteredRooms: import('@/types').Room[];
  stores: import('@/types').Store[];
  getStoreById: (id: string) => import('@/types').Store | undefined;
}

interface QuickTemplate {
  name: string;
  startDate: string;
  endDate: string;
  adjustmentType: PriceAdjustmentType;
  adjustmentValue: number;
  description: string;
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  { name: '春节调价', startDate: '2026-01-28', endDate: '2026-02-04', adjustmentType: 'percentage', adjustmentValue: 50, description: '春节期间统一上浮50%' },
  { name: '五一假期', startDate: '2026-05-01', endDate: '2026-05-05', adjustmentType: 'add', adjustmentValue: 100, description: '五一假期每晚加价100元' },
  { name: '国庆黄金周', startDate: '2026-10-01', endDate: '2026-10-07', adjustmentType: 'percentage', adjustmentValue: 80, description: '国庆期间统一上浮80%' },
  { name: '端午假期', startDate: '2026-06-19', endDate: '2026-06-21', adjustmentType: 'percentage', adjustmentValue: 30, description: '端午期间上浮30%' },
  { name: '中秋假期', startDate: '2026-09-25', endDate: '2026-09-27', adjustmentType: 'percentage', adjustmentValue: 30, description: '中秋期间上浮30%' },
  { name: '淡季特惠', startDate: '2026-11-01', endDate: '2026-11-30', adjustmentType: 'percentage', adjustmentValue: -20, description: '淡季促销下调20%' },
];

function TemplateFormModal({
  open,
  onClose,
  onSubmit,
  template,
  filteredRooms,
  stores,
  getStoreById,
}: TemplateFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    adjustmentType: 'percentage' as PriceAdjustmentType,
    adjustmentValue: 30,
    roomIds: [] as string[],
    description: '',
    enabled: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [roomSelectAll, setRoomSelectAll] = useState(false);
  const [showQuickTemplates, setShowQuickTemplates] = useState(false);

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        startDate: template.startDate,
        endDate: template.endDate,
        adjustmentType: template.adjustmentType,
        adjustmentValue: template.adjustmentValue,
        roomIds: [...template.roomIds],
        description: template.description || '',
        enabled: template.enabled,
      });
      setRoomSelectAll(template.roomIds.length === filteredRooms.length);
    } else {
      setFormData({
        name: '',
        startDate: '',
        endDate: '',
        adjustmentType: 'percentage',
        adjustmentValue: 30,
        roomIds: filteredRooms.map((r) => r.id),
        description: '',
        enabled: true,
      });
      setRoomSelectAll(true);
    }
    setErrors({});
  }, [template, open, filteredRooms]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = '请输入模板名称';
    if (!formData.startDate) newErrors.startDate = '请选择开始日期';
    if (!formData.endDate) newErrors.endDate = '请选择结束日期';
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = '结束日期不能早于开始日期';
    }
    if (formData.adjustmentType === 'fixed' && formData.adjustmentValue <= 0) {
      newErrors.adjustmentValue = '固定价格必须大于0';
    }
    if (formData.adjustmentType === 'percentage' && formData.adjustmentValue === 0) {
      newErrors.adjustmentValue = '调价比例不能为0';
    }
    if (formData.roomIds.length === 0) {
      newErrors.roomIds = '请至少选择一个房间';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      name: formData.name.trim(),
      startDate: formData.startDate,
      endDate: formData.endDate,
      adjustmentType: formData.adjustmentType,
      adjustmentValue: formData.adjustmentValue,
      roomIds: formData.roomIds,
      description: formData.description.trim() || undefined,
      enabled: formData.enabled,
    });
  };

  const handleRoomToggle = (roomId: string) => {
    setFormData((prev) => {
      const newRoomIds = prev.roomIds.includes(roomId)
        ? prev.roomIds.filter((id) => id !== roomId)
        : [...prev.roomIds, roomId];
      setRoomSelectAll(newRoomIds.length === filteredRooms.length);
      return { ...prev, roomIds: newRoomIds };
    });
  };

  const handleSelectAll = () => {
    if (roomSelectAll) {
      setFormData((prev) => ({ ...prev, roomIds: [] }));
      setRoomSelectAll(false);
    } else {
      setFormData((prev) => ({ ...prev, roomIds: filteredRooms.map((r) => r.id) }));
      setRoomSelectAll(true);
    }
  };

  const handleSelectByRoomType = (type: RoomType) => {
    const typeRooms = filteredRooms.filter((r) => r.type === type);
    const typeRoomIds = typeRooms.map((r) => r.id);
    const allSelected = typeRoomIds.every((id) => formData.roomIds.includes(id));

    setFormData((prev) => {
      let newRoomIds: string[];
      if (allSelected) {
        newRoomIds = prev.roomIds.filter((id) => !typeRoomIds.includes(id));
      } else {
        newRoomIds = [...new Set([...prev.roomIds, ...typeRoomIds])];
      }
      setRoomSelectAll(newRoomIds.length === filteredRooms.length);
      return { ...prev, roomIds: newRoomIds };
    });
  };

  const handleApplyQuickTemplate = (qt: QuickTemplate) => {
    setFormData((prev) => ({
      ...prev,
      name: qt.name,
      startDate: qt.startDate,
      endDate: qt.endDate,
      adjustmentType: qt.adjustmentType,
      adjustmentValue: qt.adjustmentValue,
      description: qt.description,
    }));
    setShowQuickTemplates(false);
  };

  const roomsByType = useMemo(() => {
    const map = new Map<RoomType, typeof filteredRooms>();
    filteredRooms.forEach((r) => {
      const list = map.get(r.type) || [];
      list.push(r);
      map.set(r.type, list);
    });
    return map;
  }, [filteredRooms]);

  const roomTypeStats = useMemo(() => {
    const stats: Record<RoomType, { total: number; selected: number }> = {
      standard: { total: 0, selected: 0 },
      deluxe: { total: 0, selected: 0 },
      suite: { total: 0, selected: 0 },
      family: { total: 0, selected: 0 },
    };
    filteredRooms.forEach((r) => {
      stats[r.type].total++;
      if (formData.roomIds.includes(r.id)) {
        stats[r.type].selected++;
      }
    });
    return stats;
  }, [filteredRooms, formData.roomIds]);

  const getAdjustmentHint = () => {
    if (formData.adjustmentType === 'percentage') {
      return formData.adjustmentValue >= 0
        ? `在基础价上浮 ${formData.adjustmentValue}%`
        : `在基础价上下调 ${Math.abs(formData.adjustmentValue)}%`;
    }
    if (formData.adjustmentType === 'add') {
      return formData.adjustmentValue >= 0
        ? `在基础价上加 ¥${formData.adjustmentValue}/晚`
        : `在基础价上减 ¥${Math.abs(formData.adjustmentValue)}/晚`;
    }
    return `将价格设为 ¥${formData.adjustmentValue}/晚（忽略基础价）`;
  };

  const roomsByStore = useMemo(() => {
    const map = new Map<string, typeof filteredRooms>();
    filteredRooms.forEach((r) => {
      const list = map.get(r.storeId) || [];
      list.push(r);
      map.set(r.storeId, list);
    });
    return map;
  }, [filteredRooms]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={template ? '编辑调价模板' : '新增调价模板'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label-base !mb-0">快捷模板</label>
            <button
              type="button"
              onClick={() => setShowQuickTemplates(!showQuickTemplates)}
              className="text-xs text-brand-brown hover:text-brand-brownLight flex items-center gap-1 transition-colors"
            >
              <Tag className="w-3 h-3" />
              {showQuickTemplates ? '收起' : '使用快捷模板'}
            </button>
          </div>
          {showQuickTemplates && (
            <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-brand-cream/50 rounded-xl border border-brand-brown/10">
              {QUICK_TEMPLATES.map((qt) => (
                <button
                  key={qt.name}
                  type="button"
                  onClick={() => handleApplyQuickTemplate(qt)}
                  className="text-left p-2 rounded-lg bg-white hover:bg-brand-beige transition-colors border border-brand-brown/10 hover:border-brand-brown/30"
                >
                  <div className="text-sm font-medium text-brand-brown">{qt.name}</div>
                  <div className="text-xs text-brand-taupe mt-0.5">
                    {qt.adjustmentType === 'percentage'
                      ? `${qt.adjustmentValue >= 0 ? '+' : ''}${qt.adjustmentValue}%`
                      : qt.adjustmentType === 'add'
                      ? `${qt.adjustmentValue >= 0 ? '+' : ''}¥${qt.adjustmentValue}`
                      : `¥${qt.adjustmentValue}`}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="label-base">模板名称 *</label>
          <input
            type="text"
            className={`input-base ${errors.name ? 'border-red-400' : ''}`}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="如：春节调价、国庆黄金周"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-base">开始日期 *</label>
            <input
              type="date"
              className={`input-base ${errors.startDate ? 'border-red-400' : ''}`}
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            {errors.startDate && (
              <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>
            )}
          </div>
          <div>
            <label className="label-base">结束日期 *</label>
            <input
              type="date"
              className={`input-base ${errors.endDate ? 'border-red-400' : ''}`}
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
            {errors.endDate && (
              <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-base">调价方式 *</label>
            <select
              className="input-base"
              value={formData.adjustmentType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  adjustmentType: e.target.value as PriceAdjustmentType,
                  adjustmentValue:
                    e.target.value === 'percentage' ? 30 : e.target.value === 'add' ? 100 : 588,
                })
              }
            >
              {(Object.keys(PriceAdjustmentTypeLabels) as PriceAdjustmentType[]).map((type) => (
                <option key={type} value={type}>
                  {PriceAdjustmentTypeLabels[type]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-base">
              {formData.adjustmentType === 'fixed'
                ? '固定价格 (¥) *'
                : formData.adjustmentType === 'percentage'
                ? '调整比例 (%) *'
                : '加价金额 (¥) *'}
            </label>
            <input
              type="number"
              className={`input-base ${errors.adjustmentValue ? 'border-red-400' : ''}`}
              value={formData.adjustmentValue}
              onChange={(e) =>
                setFormData({ ...formData, adjustmentValue: Number(e.target.value) })
              }
              min={formData.adjustmentType === 'fixed' ? 1 : undefined}
              step={formData.adjustmentType === 'percentage' ? 5 : 10}
            />
            {errors.adjustmentValue && (
              <p className="text-red-500 text-xs mt-1">{errors.adjustmentValue}</p>
            )}
            <p className="text-xs text-brand-taupe mt-1">{getAdjustmentHint()}</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label-base !mb-0">
              应用房型 * <span className="text-xs font-normal">已选 {formData.roomIds.length}/{filteredRooms.length} 间</span>
            </label>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs text-brand-brown hover:text-brand-brownLight flex items-center gap-1 transition-colors"
            >
              {roomSelectAll ? (
                <>
                  <X className="w-3 h-3" />
                  取消全选
                </>
              ) : (
                <>
                  <Check className="w-3 h-3" />
                  全选
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {(Object.keys(roomTypeStats) as RoomType[]).map((type) => {
              const stat = roomTypeStats[type];
              if (stat.total === 0) return null;
              const allSelected = stat.selected === stat.total;
              const someSelected = stat.selected > 0 && stat.selected < stat.total;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSelectByRoomType(type)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    allSelected
                      ? 'bg-brand-brown text-white shadow-sm'
                      : someSelected
                      ? 'bg-brand-brown/60 text-white'
                      : 'bg-brand-beige text-brand-taupe hover:bg-brand-brown/10'
                  }`}
                >
                  <BedDouble className="w-3 h-3" />
                  {RoomTypeLabels[type]}
                  <span className="opacity-70">
                    {stat.selected}/{stat.total}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            className={`border rounded-xl p-3 max-h-48 overflow-y-auto ${
              errors.roomIds ? 'border-red-400' : 'border-brand-brown/10'
            }`}
          >
            {Array.from(roomsByType.entries()).map(([roomType, typeRooms]) => (
              <div key={roomType} className="mb-3 last:mb-0">
                <div className="flex items-center gap-1 text-xs text-brand-taupe mb-2 font-medium">
                  <BedDouble className="w-3 h-3" />
                  {RoomTypeLabels[roomType]}
                  <span className="text-brand-taupe/60 ml-1">
                    ({roomTypeStats[roomType].selected}/{roomTypeStats[roomType].total})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {typeRooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => handleRoomToggle(room.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        formData.roomIds.includes(room.id)
                          ? 'bg-brand-brown text-white shadow-sm'
                          : 'bg-brand-beige text-brand-taupe hover:bg-brand-brown/10'
                      }`}
                    >
                      {room.roomNumber} {room.name}
                      <span className="opacity-70">¥{room.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {filteredRooms.length === 0 && (
              <p className="text-sm text-brand-taupe text-center py-4">暂无可用房间</p>
            )}
          </div>
          {errors.roomIds && (
            <p className="text-red-500 text-xs mt-1">{errors.roomIds}</p>
          )}
        </div>

        <div>
          <label className="label-base">备注说明</label>
          <input
            type="text"
            className="input-base"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="可选，如：春节期间统一上浮"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="label-base !mb-0">是否启用</label>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.enabled ? 'bg-brand-green' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-brand-taupe">
            {formData.enabled ? '启用后调价将生效' : '停用后调价不会生效'}
          </span>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-brand-brown/10">
          <button type="button" onClick={onClose} className="btn-secondary">
            取消
          </button>
          <button type="submit" className="btn-primary">
            {template ? '保存修改' : '创建模板'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
