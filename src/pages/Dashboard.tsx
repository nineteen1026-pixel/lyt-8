import { useNavigate } from 'react-router-dom';
import {
  BedDouble,
  CalendarCheck,
  CalendarX,
  Users,
  Plus,
  ClipboardList,
  ArrowRight,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import Badge from '@/components/Badge';
import { BookingStatusColors, BookingStatusLabels } from '@/types';
import { todayStr, isSameDayStr, formatDateDisplay } from '@/utils/date';

export default function Dashboard() {
  const navigate = useNavigate();
  const { getTodayStats, bookings, rooms } = useAppStore();
  const stats = getTodayStats();
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
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-brand-brown">仪表盘</h1>
        <p className="text-brand-taupe mt-1">
          {formatDateDisplay(today)} · 欢迎回来，今天也要元气满满哦~
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="relative overflow-hidden rounded-2xl p-5 text-white shadow-card animate-slide-up"
              style={{
                background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                animationDelay: `${idx * 80}ms`,
              }}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-90`}
              />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm opacity-90">{card.label}</span>
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="font-display text-4xl font-bold">{card.value}</div>
              </div>
              <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/10" />
              <div className="absolute -right-2 -top-2 w-16 h-16 rounded-full bg-white/10" />
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
          <div className="grid grid-cols-2 gap-4">
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
              onClick={() => navigate('/bookings?action=new')}
              className="group p-5 rounded-xl bg-gradient-to-br from-brand-brown/5 to-brand-brown/10 border border-brand-brown/20 hover:border-brand-brown/40 hover:shadow-soft transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-brown flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-brand-brown mb-1">新增预订</h3>
              <p className="text-sm text-brand-taupe">快速登记客人入住</p>
            </button>
          </div>
        </div>

        <div className="card-base p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-brand-brown">
              入住率概览
            </h2>
          </div>
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative w-36 h-36">
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
                <span className="font-display text-3xl font-bold text-brand-brown">
                  {stats.totalRooms > 0
                    ? Math.round((stats.occupiedToday / stats.totalRooms) * 100)
                    : 0}
                  %
                </span>
                <span className="text-xs text-brand-taupe">今日入住率</span>
              </div>
            </div>
            <div className="mt-6 w-full space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-brand-taupe">已占用</span>
                <span className="font-medium text-brand-brown">{stats.occupiedToday} 间</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-taupe">空闲</span>
                <span className="font-medium text-brand-green">{stats.availableToday} 间</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-taupe">总房间数</span>
                <span className="font-medium text-brand-brown">{stats.totalRooms} 间</span>
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
    </div>
  );
}
