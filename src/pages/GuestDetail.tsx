import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Calendar,
  DollarSign,
  Clock,
  BedDouble,
  TrendingUp,
  AlertTriangle,
  User,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { BookingStatusLabels, BookingStatusColors, RepurchaseLevelLabels } from '@/types';
import { formatDateDisplay, calculateNights } from '@/utils/date';

export default function GuestDetail() {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();
  const { getGuestProfileByPhone, bookings, getRoomById } = useAppStore();

  const profile = useMemo(
    () => (phone ? getGuestProfileByPhone(decodeURIComponent(phone)) : undefined),
    [phone, getGuestProfileByPhone]
  );

  const guestBookings = useMemo(() => {
    if (!phone) return [];
    return bookings
      .filter((b) => b.guestPhone === decodeURIComponent(phone))
      .sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());
  }, [phone, bookings]);

  if (!profile) {
    return (
      <div className="animate-fade-in">
        <div className="card-base p-12 text-center">
          <User className="w-16 h-16 mx-auto text-brand-brown/30 mb-4" />
          <h3 className="font-display text-lg text-brand-brown mb-2">未找到客人档案</h3>
          <button onClick={() => navigate('/guests')} className="btn-primary mt-4">
            <ArrowLeft className="w-4 h-4" />
            返回客人列表
          </button>
        </div>
      </div>
    );
  }

  const avgSpending =
    profile.validBookingCount > 0
      ? Math.round(profile.totalSpending / profile.validBookingCount)
      : 0;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/guests')}
          className="p-2 rounded-lg text-brand-taupe hover:bg-brand-beige hover:text-brand-brown transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-brown">
            客人档案
          </h1>
          <p className="text-brand-taupe mt-1">{profile.guestName} · {profile.guestPhone}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="lg:col-span-1">
          <div className="card-base p-6">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-brown to-brand-brownLight flex items-center justify-center text-white font-display font-bold text-2xl">
                {profile.guestName.charAt(0)}
              </div>
              <div>
                <div className="font-display text-xl font-bold text-brand-brown">
                  {profile.guestName}
                </div>
                <div className="text-sm text-brand-taupe flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {profile.guestPhone}
                </div>
              </div>
            </div>

            {profile.repurchaseReminder && (
              <div
                className={`p-3 rounded-lg mb-4 text-sm ${
                  profile.repurchaseReminder.level === 'churn-risk'
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : profile.repurchaseReminder.level === 'suggest'
                    ? 'bg-amber-50 text-amber-600 border border-amber-200'
                    : 'bg-green-50 text-green-600 border border-green-200'
                }`}
              >
                <div className="flex items-center gap-2 font-medium mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  {RepurchaseLevelLabels[profile.repurchaseReminder.level]}
                </div>
                <div>{profile.repurchaseReminder.message}</div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-brand-taupe flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  有效预订
                </span>
                <span className="font-medium text-brand-brown">{profile.validBookingCount} 次</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-brand-taupe flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  累计消费
                </span>
                <span className="font-display font-bold text-brand-orange">
                  ¥{profile.totalSpending.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-brand-taupe flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  累计晚数
                </span>
                <span className="font-medium text-brand-brown">{profile.totalNights} 晚</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-brand-taupe flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  客单价
                </span>
                <span className="font-medium text-brand-brown">¥{avgSpending.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-brand-taupe flex items-center gap-2">
                  <BedDouble className="w-4 h-4" />
                  即将到访
                </span>
                <span className="font-medium text-brand-green">
                  {profile.upcomingBookings > 0 ? `${profile.upcomingBookings} 个` : '无'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card-base overflow-hidden">
            <div className="px-5 py-4 border-b border-brand-brown/10">
              <h2 className="font-display text-lg font-semibold text-brand-brown">
                历史预订记录
              </h2>
            </div>
            {guestBookings.length === 0 ? (
              <div className="p-8 text-center text-brand-taupe">暂无预订记录</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-brand-beige/60">
                    <tr>
                      <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                        房间
                      </th>
                      <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                        入住
                      </th>
                      <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                        退房
                      </th>
                      <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                        晚数
                      </th>
                      <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                        金额
                      </th>
                      <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                        状态
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {guestBookings.map((b, idx) => {
                      const room = getRoomById(b.roomId);
                      const nights = calculateNights(b.checkIn, b.checkOut);
                      return (
                        <tr
                          key={b.id}
                          className={`border-t border-brand-brown/5 hover:bg-brand-beige/30 transition-colors ${
                            idx % 2 === 1 ? 'bg-brand-cream/50' : ''
                          }`}
                        >
                          <td className="px-5 py-3">
                            <div className="font-medium text-brand-brown text-sm">
                              {room?.roomNumber} {room?.name}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm text-brand-brown">
                            {formatDateDisplay(b.checkIn)}
                          </td>
                          <td className="px-5 py-3 text-sm text-brand-brown">
                            {formatDateDisplay(b.checkOut)}
                          </td>
                          <td className="px-5 py-3 text-sm text-brand-brown">
                            {nights}晚
                          </td>
                          <td className="px-5 py-3">
                            <span className="font-display font-bold text-brand-orange text-sm">
                              ¥{b.totalPrice}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${BookingStatusColors[b.status]}`}
                            >
                              {BookingStatusLabels[b.status]}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
