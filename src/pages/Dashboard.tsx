import { useNavigate } from 'react-router-dom';
import {
  BedDouble,
  CalendarCheck,
  CalendarX,
  Users,
  Plus,
  ClipboardList,
  ArrowRight,
  DollarSign,
  TrendingUp,
  BarChart3,
  AlertCircle,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import Badge from '@/components/Badge';
import { BookingStatusColors, BookingStatusLabels } from '@/types';
import { todayStr, isSameDayStr, formatDateDisplay } from '@/utils/date';

export default function Dashboard() {
  const navigate = useNavigate();
  const { getTodayStats, getRevenueStats, bookings, rooms, getPendingTasks, cleaningTasks, getRoomById } = useAppStore();
  const stats = getTodayStats();
  const revenueStats = getRevenueStats();
  const pendingTasks = getPendingTasks();
  const today = todayStr();

  const todayCheckIns = bookings.filter(
    (b) => b.status !== 'cancelled' && isSameDayStr(b.checkIn, today)
  );
  const todayCheckOuts = bookings.filter(
    (b) => b.status !== 'cancelled' && isSameDayStr(b.checkOut, today)
  );

  const getRoomNumber = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    return room ? `${room.roomNumber} ${room.name}` : '未知房间';
  };

  const statCards = [
    {
      label: '房间总数',
      value: stats.totalRooms,
      icon: BedDouble,
      gradient: 'from-brand-brown to-brand-brownLight',
    },
    {
      label: '今日入住',
      value: stats.checkInToday,
      icon: CalendarCheck,
      gradient: 'from-brand-green to-brand-greenLight',
    },
    {
      label: '今日退房',
      value: stats.checkOutToday,
      icon: CalendarX,
      gradient: 'from-brand-orange to-amber-400',
    },
    {
      label: '今日空房',
      value: stats.availableToday,
      icon: Users,
      gradient: 'from-brand-taupe to-brand-brownLight',
    },
    {
      label: '今日营收',
      value: `¥${Math.round(revenueStats.todayRevenue).toLocaleString()}`,
      icon: DollarSign,
      gradient: 'from-amber-500 to-orange-400',
    },
    {
      label: '本月营收',
      value: `¥${Math.round(revenueStats.monthRevenue).toLocaleString()}`,
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-teal-400',
    },
    {
      label: '待处理任务',
      value: pendingTasks.total,
      icon: AlertCircle,
      gradient: 'from-rose-500 to-pink-500',
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-brand-brown">仪表盘</h1>
        <p className="text-brand-taupe mt-1">
          {formatDateDisplay(today)} · 欢迎回来，今天也要元气满满哦~
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="relative overflow-hidden rounded-2xl p-4 text-white shadow-card animate-slide-up cursor-pointer hover:-translate-y-0.5 transition-transform"
              style={{
                background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                animationDelay: `${idx * 80}ms`,
              }}
              onClick={() => {
                if (card.label === '待处理任务') {
                  navigate('/cleaning-tasks');
                }
              }}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-90`}
              />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs opacity-90">{card.label}</span>
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="font-display text-2xl font-bold">{card.value}</div>
              </div>
              <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/10" />
              <div className="absolute -right-1 -top-1 w-12 h-12 rounded-full bg-white/10" />
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        <div className="lg:col-span-2 card-base p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-brand-brown">
              快捷操作
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/rooms')}
              className="group p-5 rounded-xl bg-gradient-to-br from-brand-beige to-white border border-brand-brown/10 hover:border-brand-brown/30 hover:shadow-soft transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-brown/10 flex items-center justify-center mb-3 group-hover:bg-brand-brown group-hover:text-white transition-colors">
                <BedDouble className="w-6 h-6 text-brand-brown group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-semibold text-brand-brown mb-1">房间管理</h3>
              <p className="text-sm text-brand-taupe">管理所有房间档案</p>
            </button>
            <button
              onClick={() => navigate('/calendar')}
              className="group p-5 rounded-xl bg-gradient-to-br from-brand-beige to-white border border-brand-brown/10 hover:border-brand-brown/30 hover:shadow-soft transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-green/10 flex items-center justify-center mb-3 group-hover:bg-brand-green group-hover:text-white transition-colors">
                <CalendarCheck className="w-6 h-6 text-brand-green group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-semibold text-brand-brown mb-1">日历视图</h3>
              <p className="text-sm text-brand-taupe">查看房间占用情况</p>
            </button>
            <button
              onClick={() => navigate('/bookings')}
              className="group p-5 rounded-xl bg-gradient-to-br from-brand-beige to-white border border-brand-brown/10 hover:border-brand-brown/30 hover:shadow-soft transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-orange/10 flex items-center justify-center mb-3 group-hover:bg-brand-orange group-hover:text-white transition-colors">
                <ClipboardList className="w-6 h-6 text-brand-orange group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-semibold text-brand-brown mb-1">预订管理</h3>
              <p className="text-sm text-brand-taupe">查看和管理预订</p>
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="group p-5 rounded-xl bg-gradient-to-br from-brand-beige to-white border border-brand-brown/10 hover:border-brand-brown/30 hover:shadow-soft transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <BarChart3 className="w-6 h-6 text-emerald-500 group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-semibold text-brand-brown mb-1">经营报表</h3>
              <p className="text-sm text-brand-taupe">营收与入住率统计</p>
            </button>
            <button
              onClick={() => navigate('/bookings?action=new')}
              className="group p-5 rounded-xl bg-gradient-to-br from-brand-brown/5 to-brand-brown/10 border border-brand-brown/20 hover:border-brand-brown/40 hover:shadow-soft transition-all text-left lg:col-span-2"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-brown flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-brand-brown mb-1">新增预订</h3>
              <p className="text-sm text-brand-taupe">快速登记客人入住</p>
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card-base p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-brand-brown">
                入住率概览
              </h2>
            </div>
            <div className="flex justify-around items-center mb-4">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="#F5F0E8"
                    strokeWidth="10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="#8B5A2B"
                    strokeWidth="10"
                    strokeDasharray={`${
                      stats.totalRooms > 0
                        ? (stats.occupiedToday / stats.totalRooms) * 264
                        : 0
                    } 264`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-xl font-bold text-brand-brown">
                    {stats.totalRooms > 0
                      ? Math.round((stats.occupiedToday / stats.totalRooms) * 100)
                      : 0}
                    %
                  </span>
                  <span className="text-xs text-brand-taupe">今日</span>
                </div>
              </div>
              <div className="relative w-24 h-24">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="#F5F0E8"
                    strokeWidth="10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="10"
                    strokeDasharray={`${
                      revenueStats.monthOccupancyRate * 2.64
                    } 264`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-xl font-bold text-brand-green">
                    {Math.round(revenueStats.monthOccupancyRate)}%
                  </span>
                  <span className="text-xs text-brand-taupe">本月</span>
                </div>
              </div>
            </div>
            <div className="w-full space-y-2 text-sm border-t border-brand-brown/10 pt-4">
              <div className="flex justify-between">
                <span className="text-brand-taupe">今日已占用</span>
                <span className="font-medium text-brand-brown">{stats.occupiedToday} 间</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-taupe">今日空闲</span>
                <span className="font-medium text-brand-green">{stats.availableToday} 间</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-taupe">本月环比</span>
                <span className={`font-medium ${
                  revenueStats.monthOccupancyRate >= revenueStats.lastMonthOccupancyRate
                    ? 'text-brand-green'
                    : 'text-red-500'
                }`}>
                  {revenueStats.monthOccupancyRate >= revenueStats.lastMonthOccupancyRate ? '+' : ''}
                  {(revenueStats.monthOccupancyRate - revenueStats.lastMonthOccupancyRate).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div className="card-base p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-brand-brown">
                营收概览
              </h2>
              <button
                onClick={() => navigate('/reports')}
                className="text-xs text-brand-brown hover:text-brand-brownLight flex items-center gap-1"
              >
                查看详情 <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl">
                <div className="text-xs text-brand-taupe mb-1">本月营收</div>
                <div className="font-display text-2xl font-bold text-brand-orange">
                  ¥{Math.round(revenueStats.monthRevenue).toLocaleString()}
                </div>
                <div className="text-xs text-brand-taupe mt-1">
                  环比上月 {revenueStats.lastMonthRevenue > 0
                    ? (revenueStats.monthRevenue - revenueStats.lastMonthRevenue) / revenueStats.lastMonthRevenue > 0
                      ? '+'
                      : ''
                    : '+0'}
                  {revenueStats.lastMonthRevenue > 0
                    ? Math.round(((revenueStats.monthRevenue - revenueStats.lastMonthRevenue) / revenueStats.lastMonthRevenue) * 100)
                    : 0}%
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-brand-beige/50 rounded-lg">
                  <div className="text-xs text-brand-taupe mb-1">今日营收</div>
                  <div className="font-display text-lg font-bold text-brand-brown">
                    ¥{Math.round(revenueStats.todayRevenue)}
                  </div>
                </div>
                <div className="p-3 bg-brand-beige/50 rounded-lg">
                  <div className="text-xs text-brand-taupe mb-1">本月预订</div>
                  <div className="font-display text-lg font-bold text-brand-brown">
                    {revenueStats.monthBookings} 笔
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card-base p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-brand-brown">
              今日入住 ({todayCheckIns.length})
            </h2>
            <button
              onClick={() => navigate('/bookings')}
              className="text-sm text-brand-brown hover:text-brand-brownLight flex items-center gap-1"
            >
              查看全部 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {todayCheckIns.length === 0 ? (
            <div className="text-center py-8 text-brand-taupe text-sm">
              今日暂无入住
            </div>
          ) : (
            <div className="space-y-3">
              {todayCheckIns.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-brand-beige/50 hover:bg-brand-beige transition-colors"
                >
                  <div>
                    <div className="font-medium text-brand-brown">{b.guestName}</div>
                    <div className="text-xs text-brand-taupe">{getRoomNumber(b.roomId)}</div>
                  </div>
                  <Badge
                    variant={
                      b.status === 'checked-in'
                        ? 'green'
                        : b.status === 'confirmed'
                        ? 'info'
                        : 'default'
                    }
                  >
                    {BookingStatusLabels[b.status]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-base p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-brand-brown">
              今日退房 ({todayCheckOuts.length})
            </h2>
            <button
              onClick={() => navigate('/bookings')}
              className="text-sm text-brand-brown hover:text-brand-brownLight flex items-center gap-1"
            >
              查看全部 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {todayCheckOuts.length === 0 ? (
            <div className="text-center py-8 text-brand-taupe text-sm">
              今日暂无退房
            </div>
          ) : (
            <div className="space-y-3">
              {todayCheckOuts.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-brand-beige/50 hover:bg-brand-beige transition-colors"
                >
                  <div>
                    <div className="font-medium text-brand-brown">{b.guestName}</div>
                    <div className="text-xs text-brand-taupe">{getRoomNumber(b.roomId)}</div>
                  </div>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full ${BookingStatusColors[b.status]}`}>
                    {BookingStatusLabels[b.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card-base p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-semibold text-brand-brown flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            待处理任务汇总
          </h2>
          <button
            onClick={() => navigate('/cleaning-tasks')}
            className="text-sm text-brand-brown hover:text-brand-brownLight flex items-center gap-1"
          >
            查看全部 <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-700 font-medium">待保洁</span>
            </div>
            <div className="font-display text-3xl font-bold text-amber-600">
              {pendingTasks.pendingCleaning}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-brand-green/10 border border-brand-green/30">
            <div className="flex items-center gap-2 mb-2">
              <CalendarCheck className="w-4 h-4 text-brand-green" />
              <span className="text-sm text-brand-green font-medium">今日入住</span>
            </div>
            <div className="font-display text-3xl font-bold text-brand-green">
              {pendingTasks.todayCheckIns}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-brand-orange/10 border border-brand-orange/30">
            <div className="flex items-center gap-2 mb-2">
              <CalendarX className="w-4 h-4 text-brand-orange" />
              <span className="text-sm text-brand-orange font-medium">今日退房</span>
            </div>
            <div className="font-display text-3xl font-bold text-brand-orange">
              {pendingTasks.todayCheckOuts}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4 text-rose-600" />
              <span className="text-sm text-rose-600 font-medium">维护中房间</span>
            </div>
            <div className="font-display text-3xl font-bold text-rose-600">
              {pendingTasks.maintenanceRooms}
            </div>
          </div>
        </div>

        {cleaningTasks.filter((t) => t.status !== 'completed').length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-brand-brown mb-3">待处理保洁任务</h3>
            <div className="space-y-2">
              {cleaningTasks
                .filter((t) => t.status !== 'completed')
                .slice(0, 5)
                .map((task) => {
                  const room = getRoomById(task.roomId);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200"
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <div>
                          <div className="font-medium text-brand-brown">
                            {room ? `${room.roomNumber} ${room.name}` : '未知房间'}
                          </div>
                          <div className="text-xs text-brand-taupe">
                            {task.guestName ? `${task.guestName} 退房后保洁` : '定期保洁'}
                            {task.notes ? ` · ${task.notes}` : ''}
                          </div>
                        </div>
                      </div>
                      <Badge variant={task.status === 'pending' ? 'warning' : 'info'}>
                        {task.status === 'pending' ? '待处理' : '进行中'}
                      </Badge>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
