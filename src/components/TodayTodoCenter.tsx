import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellRing,
  CalendarCheck,
  CalendarX,
  Sparkles,
  Wrench,
  FileSignature,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  MapPin,
  CheckCircle2,
  Circle,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import {
  TodoCategory,
  TodoCategoryLabels,
  TodoCategoryColors,
  TodoCategoryBadgeColors,
  type TodoItem,
} from '@/types';
import { todayStr, formatDateDisplay } from '@/utils/date';

const CategoryIcon: Record<TodoCategory, React.ElementType> = {
  checkIn: CalendarCheck,
  checkOut: CalendarX,
  cleaning: Sparkles,
  renewal: FileSignature,
  maintenance: Wrench,
  overdue: AlertTriangle,
};

interface Props {
  storeFilter?: string;
}

export default function TodayTodoCenter({ storeFilter = 'all' }: Props) {
  const navigate = useNavigate();
  const { stores } = useAppStore();
  const getTodayTodos = useAppStore((s) => s.getTodayTodos);
  const getTodoSummary = useAppStore((s) => s.getTodoSummary);
  const updateCleaningTaskStatus = useAppStore((s) => s.updateCleaningTaskStatus);
  const updateBookingStatus = useAppStore((s) => s.updateBookingStatus);

  const [expanded, setExpanded] = useState(true);
  const [activeCategory, setActiveCategory] = useState<TodoCategory | 'all'>('all');

  const todos = useMemo(() => getTodayTodos(storeFilter), [getTodayTodos, storeFilter]);
  const summary = useMemo(() => getTodoSummary(storeFilter), [getTodoSummary, storeFilter]);
  const today = todayStr();

  const visibleTodos = useMemo(() => {
    if (activeCategory === 'all') return todos;
    return todos.filter((t) => t.category === activeCategory);
  }, [todos, activeCategory]);

  const categories: (TodoCategory | 'all')[] = ['all', 'checkOut', 'checkIn', 'cleaning', 'renewal', 'overdue', 'maintenance'];

  const categoryBadge = (cat: TodoCategory | 'all') => {
    if (cat === 'all') return summary.total;
    return summary.byCategory[cat];
  };

  const handleTodoClick = (todo: TodoItem) => {
    navigate(todo.navigatePath);
  };

  const handleQuickComplete = (e: React.MouseEvent, todo: TodoItem) => {
    e.stopPropagation();
    if (todo.targetType === 'cleaning') {
      updateCleaningTaskStatus(todo.targetId, 'completed');
    } else if (todo.targetType === 'booking' && todo.category === 'checkIn') {
      updateBookingStatus(todo.targetId, 'checked-in');
    } else if (todo.targetType === 'booking' && todo.category === 'checkOut') {
      updateBookingStatus(todo.targetId, 'checked-out');
    }
  };

  const renderPriorityDot = (priority: TodoItem['priority']) => {
    if (priority === 'urgent') {
      return <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" /></span>;
    }
    if (priority === 'normal') {
      return <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />;
    }
    return <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />;
  };

  if (summary.total === 0) {
    return (
      <div className="card-base p-6 mb-8 border-2 border-dashed border-brand-brown/20 bg-gradient-to-br from-brand-beige/30 to-white">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-green/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-brand-green" />
          </div>
          <h3 className="font-display text-lg font-semibold text-brand-brown mb-1">
            今日待办全部完成！
          </h3>
          <p className="text-sm text-brand-taupe">
            {formatDateDisplay(today)} · 今天也要继续保持哦~
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-base mb-8 overflow-hidden border-2 border-brand-brown/15 shadow-soft">
      <div
        className="p-5 bg-gradient-to-r from-brand-brown via-brand-brown to-brand-brownLight cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="relative">
              <BellRing className="w-6 h-6" />
              {summary.urgentCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center border-2 border-brand-brown">
                  {summary.urgentCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                今日待办提醒中心
                <span className="text-sm font-normal bg-white/20 px-2.5 py-0.5 rounded-full">
                  共 {summary.total} 项待办
                </span>
              </h2>
              <p className="text-sm text-white/80 mt-0.5 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                {formatDateDisplay(today)}
                {summary.urgentCount > 0 && (
                  <span className="text-rose-200">· {summary.urgentCount} 项紧急</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {storeFilter !== 'all' && (
              <span className="text-xs bg-white/15 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {stores.find((s) => s.id === storeFilter)?.name || '单门店'}
              </span>
            )}
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-white/80" />
            ) : (
              <ChevronDown className="w-5 h-5 text-white/80" />
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2 mb-5 pb-4 border-b border-brand-brown/10">
            <Filter className="w-4 h-4 text-brand-taupe" />
            {categories.map((cat) => {
              const count = categoryBadge(cat);
              if (cat !== 'all' && count === 0) return null;
              const isActive = activeCategory === cat;
              const Icon = cat === 'all' ? BellRing : CategoryIcon[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? cat === 'all'
                        ? 'bg-brand-brown text-white shadow-soft'
                        : `${TodoCategoryBadgeColors[cat]} shadow-soft`
                      : 'bg-brand-beige/50 text-brand-taupe hover:bg-brand-beige'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat === 'all' ? '全部' : TodoCategoryLabels[cat]}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    isActive ? 'bg-white/25' : 'bg-white/70'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
            {visibleTodos.length === 0 ? (
              <div className="col-span-full py-10 text-center text-brand-taupe text-sm">
                当前分类暂无待办事项
              </div>
            ) : (
              visibleTodos.map((todo) => {
                const Icon = CategoryIcon[todo.category];
                const canQuickComplete =
                  todo.targetType === 'cleaning' ||
                  (todo.targetType === 'booking' && (todo.category === 'checkIn' || todo.category === 'checkOut'));
                const categoryColorClass = TodoCategoryColors[todo.category];
                const textColorMatch = categoryColorClass.match(/text-[^\s]+/)?.[0] || 'text-brand-brown';

                return (
                  <div
                    key={todo.id}
                    onClick={() => handleTodoClick(todo)}
                    className={`group relative p-4 rounded-xl border cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-soft ${categoryColorClass}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-white/80 shadow-sm">
                        <Icon className={`w-5 h-5 ${textColorMatch}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            {renderPriorityDot(todo.priority)}
                            <h4 className="font-semibold text-sm">
                              {todo.title}
                            </h4>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${TodoCategoryBadgeColors[todo.category]}`}>
                            {TodoCategoryLabels[todo.category]}
                          </span>
                        </div>

                        <p className="text-xs mb-2 text-brand-taupe">
                          {todo.subtitle}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                          {todo.roomInfo && (
                            <span className="flex items-center gap-1 text-brand-taupe">
                              <MapPin className="w-3 h-3" />
                              {todo.roomInfo}
                            </span>
                          )}
                          {todo.timeInfo && (
                            <span className="flex items-center gap-1 text-brand-taupe">
                              <Clock className="w-3 h-3" />
                              {todo.timeInfo.replace(/^(入住日期|退房日期|计划日期|到期日期|应缴日期):\s*/, '')}
                            </span>
                          )}
                          {todo.amount !== undefined && todo.amount > 0 && (
                            <span className="flex items-center gap-1 text-rose-600 font-medium">
                              <DollarSign className="w-3 h-3" />
                              ¥{todo.amount.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {canQuickComplete && (
                          <button
                            onClick={(e) => handleQuickComplete(e, todo)}
                            className="p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 bg-white/80 text-brand-taupe hover:bg-white hover:text-brand-green"
                            title="标记完成"
                          >
                            <Circle className="w-4 h-4" />
                          </button>
                        )}
                        <ArrowRight className="w-4 h-4 text-brand-taupe/50 group-hover:text-brand-brown transition-colors" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
