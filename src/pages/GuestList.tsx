import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Phone,
  User,
  Calendar,
  DollarSign,
  AlertTriangle,
  Clock,
  TrendingUp,
  Users,
  Filter,
  Building2,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { GuestProfile, RepurchaseLevel } from '@/types';
import { RepurchaseLevelLabels, RepurchaseLevelColors, normalizePhone } from '@/types';
import Badge from '@/components/Badge';
import { formatDateDisplay } from '@/utils/date';

type FilterType = 'all' | RepurchaseLevel;

export default function GuestList() {
  const navigate = useNavigate();
  const {
    stores,
    getGuestProfiles,
    getRepurchaseReminders,
    bookings,
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [filter, setFilter] = useState<FilterType>('all');

  const allProfiles = useMemo(() => getGuestProfiles(storeFilter), [getGuestProfiles, bookings, storeFilter]);
  const reminders = useMemo(() => getRepurchaseReminders(storeFilter), [getRepurchaseReminders, bookings, storeFilter]);

  const filteredProfiles = useMemo(() => {
    return allProfiles.filter((p) => {
      if (filter !== 'all') {
        if (!p.repurchaseReminder || p.repurchaseReminder.level !== filter)
          return false;
      }
      if (search) {
        const lower = search.toLowerCase();
        const normalizedSearch = normalizePhone(search);
        return (
          p.guestName.toLowerCase().includes(lower) ||
          p.guestPhone.includes(search) ||
          (normalizedSearch && p.guestPhone.includes(normalizedSearch))
        );
      }
      return true;
    });
  }, [allProfiles, search, filter]);

  const stats = useMemo(() => {
    const totalGuests = allProfiles.length;
    const totalSpending = allProfiles.reduce((s, p) => s + p.totalSpending, 0);
    const repeatGuests = allProfiles.filter(
      (p) => p.validBookingCount >= 2
    ).length;
    const repeatRate =
      totalGuests > 0
        ? Math.round((repeatGuests / totalGuests) * 10000) / 100
        : 0;
    return { totalGuests, totalSpending, repeatGuests, repeatRate };
  }, [allProfiles]);

  const getReminderBadge = (level: RepurchaseLevel) => {
    const variantMap: Record<RepurchaseLevel, 'success' | 'warning' | 'danger'> = {
      recent: 'success',
      suggest: 'warning',
      'churn-risk': 'danger',
    };
    return (
      <Badge variant={variantMap[level]}>
        {RepurchaseLevelLabels[level]}
      </Badge>
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-brown">
            客人档案
          </h1>
          <p className="text-brand-taupe mt-1">按手机号归并历史预订，追踪消费频次与复购状态</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
        <div className="card-base p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-brown/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-brand-brown" />
            </div>
            <div>
              <div className="text-xs text-brand-taupe">总客人数</div>
              <div className="font-display text-xl font-bold text-brand-brown">
                {stats.totalGuests}
              </div>
            </div>
          </div>
        </div>
        <div className="card-base p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-orange/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-brand-orange" />
            </div>
            <div>
              <div className="text-xs text-brand-taupe">累计消费</div>
              <div className="font-display text-xl font-bold text-brand-orange">
                ¥{stats.totalSpending.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
        <div className="card-base p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-xs text-brand-taupe">复购客人</div>
              <div className="font-display text-xl font-bold text-green-600">
                {stats.repeatGuests}
              </div>
            </div>
          </div>
        </div>
        <div className="card-base p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-xs text-brand-taupe">待回访</div>
              <div className="font-display text-xl font-bold text-amber-600">
                {reminders.length}
              </div>
            </div>
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
              placeholder="搜索客人姓名、手机号..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
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
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
            >
              <option value="all">全部状态</option>
              <option value="recent">近期到访</option>
              <option value="suggest">建议回访</option>
              <option value="churn-risk">流失风险</option>
            </select>
          </div>
        </div>
      </div>

      {filteredProfiles.length === 0 ? (
        <div className="card-base p-12 text-center">
          <Users className="w-16 h-16 mx-auto text-brand-brown/30 mb-4" />
          <h3 className="font-display text-lg text-brand-brown mb-2">
            暂无客人档案
          </h3>
          <p className="text-brand-taupe">客人预订后将自动建立档案</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProfiles.map((profile, idx) => (
            <div
              key={profile.guestPhone}
              className="card-base p-5 hover:shadow-card transition-all duration-300 hover:-translate-y-0.5 animate-slide-up cursor-pointer"
              style={{ animationDelay: `${idx * 40}ms` }}
              onClick={() =>
                navigate(`/guests/${encodeURIComponent(profile.guestPhone)}`)
              }
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-brown to-brand-brownLight flex items-center justify-center text-white font-display font-bold text-lg">
                    {profile.guestName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-display text-lg font-bold text-brand-brown">
                      {profile.guestName}
                    </div>
                    <div className="text-xs text-brand-taupe flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {profile.guestPhone}
                    </div>
                  </div>
                </div>
                {profile.repurchaseReminder && (
                  <div>
                    {getReminderBadge(profile.repurchaseReminder.level)}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center p-2 bg-brand-beige/50 rounded-lg">
                  <div className="font-display text-lg font-bold text-brand-brown">
                    {profile.validBookingCount}
                  </div>
                  <div className="text-xs text-brand-taupe">预订次数</div>
                </div>
                <div className="text-center p-2 bg-brand-beige/50 rounded-lg">
                  <div className="font-display text-lg font-bold text-brand-orange">
                    ¥{profile.totalSpending.toLocaleString()}
                  </div>
                  <div className="text-xs text-brand-taupe">累计消费</div>
                </div>
                <div className="text-center p-2 bg-brand-beige/50 rounded-lg">
                  <div className="font-display text-lg font-bold text-brand-brown">
                    {profile.totalNights}
                  </div>
                  <div className="text-xs text-brand-taupe">累计晚数</div>
                </div>
              </div>

              <div className="space-y-1.5 mb-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-brand-taupe flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    最近入住
                  </span>
                  <span className="text-brand-brown">
                    {profile.lastCheckIn
                      ? formatDateDisplay(profile.lastCheckIn)
                      : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-brand-taupe flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    最近退房
                  </span>
                  <span className="text-brand-brown">
                    {profile.lastCheckOut
                      ? formatDateDisplay(profile.lastCheckOut)
                      : '-'}
                  </span>
                </div>
              </div>

              {profile.upcomingBookings > 0 && (
                <div className="p-2 bg-brand-green/10 rounded-lg text-sm text-brand-green flex items-center gap-1 mb-3">
                  <Calendar className="w-3.5 h-3.5" />
                  有 {profile.upcomingBookings} 个即将到访的预订
                </div>
              )}

              {profile.repurchaseReminder && (
                <div
                  className={`p-2 rounded-lg text-xs ${
                    profile.repurchaseReminder.level === 'churn-risk'
                      ? 'bg-red-50 text-red-600'
                      : profile.repurchaseReminder.level === 'suggest'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-green-50 text-green-600'
                  }`}
                >
                  {profile.repurchaseReminder.message}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
