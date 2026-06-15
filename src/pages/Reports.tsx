import { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Calendar as CalendarIcon,
  Download,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Users,
  BedDouble,
  Percent,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { ReportGranularity, DailyReportItem, MonthlyReportItem } from '@/types';
import { formatDateDisplay, formatMonth, todayStr, getMonthKey, startOfMonthStr, endOfMonthStr } from '@/utils/date';
import { format, parseISO, subMonths } from 'date-fns';

export default function Reports() {
  const { getDailyReport, getMonthlyReport, getRevenueStats } = useAppStore();
  const [granularity, setGranularity] = useState<ReportGranularity>('month');
  const [currentDate, setCurrentDate] = useState(todayStr());

  const revenueStats = getRevenueStats();

  const { startDate, endDate } = useMemo(() => {
    if (granularity === 'day') {
      const start = format(
        new Date(parseISO(currentDate).getFullYear(), parseISO(currentDate).getMonth(), 1),
        'yyyy-MM-dd'
      );
      const end = format(
        new Date(parseISO(currentDate).getFullYear(), parseISO(currentDate).getMonth() + 1, 0),
        'yyyy-MM-dd'
      );
      return { startDate: start, endDate: end };
    } else {
      const currentMonth = getMonthKey(currentDate);
      const startMonth = format(subMonths(parseISO(currentMonth + '-01'), 5), 'yyyy-MM');
      return { startDate: startMonth, endDate: currentMonth };
    }
  }, [granularity, currentDate]);

  const dailyData = useMemo(() => {
    if (granularity === 'day') {
      return getDailyReport(startDate, endDate);
    }
    return [];
  }, [granularity, startDate, endDate, getDailyReport]);

  const monthlyData = useMemo(() => {
    if (granularity === 'month') {
      return getMonthlyReport(startDate, endDate);
    }
    return [];
  }, [granularity, startDate, endDate, getMonthlyReport]);

  const summary = useMemo(() => {
    const data = granularity === 'day' ? dailyData : monthlyData;
    if (data.length === 0) {
      return { totalRevenue: 0, avgOccupancy: 0, totalBookings: 0, avgDailyRate: 0 };
    }

    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
    const avgOccupancy =
      data.reduce((sum, item) => sum + (granularity === 'day' ? (item as DailyReportItem).occupancyRate : (item as MonthlyReportItem).avgOccupancyRate), 0) /
      data.length;
    const totalBookings = data.reduce(
      (sum, item) => sum + (granularity === 'day' ? (item as DailyReportItem).bookings : (item as MonthlyReportItem).totalBookings),
      0
    );
    const totalNights = data.reduce(
      (sum, item) => sum + (granularity === 'day' ? (item as DailyReportItem).occupiedRooms : (item as MonthlyReportItem).totalNights),
      0
    );
    const avgDailyRate = totalNights > 0 ? totalRevenue / totalNights : 0;

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgOccupancy: Math.round(avgOccupancy * 100) / 100,
      totalBookings,
      avgDailyRate: Math.round(avgDailyRate * 100) / 100,
    };
  }, [granularity, dailyData, monthlyData]);

  const maxRevenue = useMemo(() => {
    const data = granularity === 'day' ? dailyData : monthlyData;
    if (data.length === 0) return 1;
    return Math.max(...data.map((item) => item.revenue), 1);
  }, [granularity, dailyData, monthlyData]);

  const handlePrevPeriod = () => {
    if (granularity === 'day') {
      const date = parseISO(currentDate);
      date.setMonth(date.getMonth() - 1);
      setCurrentDate(format(date, 'yyyy-MM-dd'));
    } else {
      const date = parseISO(currentDate);
      date.setMonth(date.getMonth() - 6);
      setCurrentDate(format(date, 'yyyy-MM-dd'));
    }
  };

  const handleNextPeriod = () => {
    if (granularity === 'day') {
      const date = parseISO(currentDate);
      date.setMonth(date.getMonth() + 1);
      setCurrentDate(format(date, 'yyyy-MM-dd'));
    } else {
      const date = parseISO(currentDate);
      date.setMonth(date.getMonth() + 6);
      setCurrentDate(format(date, 'yyyy-MM-dd'));
    }
  };

  const exportCSV = () => {
    const data = granularity === 'day' ? dailyData : monthlyData;
    if (data.length === 0) return;

    let headers: string[];
    let rows: string[][];

    if (granularity === 'day') {
      headers = ['日期', '营收(元)', '入住率(%)', '已占用房间', '入住数', '退房数', '新预订'];
      rows = (data as DailyReportItem[]).map((item) => [
        formatDateDisplay(item.date),
        item.revenue.toFixed(2),
        item.occupancyRate.toFixed(2),
        item.occupiedRooms.toString(),
        item.checkIns.toString(),
        item.checkOuts.toString(),
        item.bookings.toString(),
      ]);
    } else {
      headers = ['月份', '营收(元)', '平均入住率(%)', '预订数', '入住间夜', '平均房价(元)'];
      rows = (data as MonthlyReportItem[]).map((item) => [
        formatMonth(item.month + '-01'),
        item.revenue.toFixed(2),
        item.avgOccupancyRate.toFixed(2),
        item.totalBookings.toString(),
        item.totalNights.toString(),
        item.avgDailyRate.toFixed(2),
      ]);
    }

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `经营报表_${granularity === 'day' ? '日报' : '月报'}_${todayStr()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    {
      label: '总营收',
      value: `¥${summary.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      gradient: 'from-brand-orange to-amber-400',
    },
    {
      label: '平均入住率',
      value: `${summary.avgOccupancy}%`,
      icon: Percent,
      gradient: 'from-brand-green to-brand-greenLight',
    },
    {
      label: '预订总数',
      value: summary.totalBookings.toString(),
      icon: Users,
      gradient: 'from-brand-brown to-brand-brownLight',
    },
    {
      label: '平均房价',
      value: `¥${summary.avgDailyRate.toLocaleString()}`,
      icon: BedDouble,
      gradient: 'from-brand-taupe to-brand-brownLight',
    },
  ];

  const periodLabel =
    granularity === 'day'
      ? `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`
      : `${formatMonth((monthlyData[0]?.month || '') + '-01')} - ${formatMonth((monthlyData[monthlyData.length - 1]?.month || '') + '-01')}`;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-brown">经营报表</h1>
          <p className="text-brand-taupe mt-1">查看营收与入住率统计数据</p>
        </div>
        <button
          onClick={exportCSV}
          className="btn-primary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          导出报表
        </button>
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
                <div className="font-display text-3xl font-bold">{card.value}</div>
              </div>
              <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/10" />
              <div className="absolute -right-2 -top-2 w-16 h-16 rounded-full bg-white/10" />
            </div>
          );
        })}
      </div>

      <div className="card-base p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="flex bg-brand-beige/50 rounded-lg p-1">
              <button
                onClick={() => setGranularity('day')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  granularity === 'day'
                    ? 'bg-white text-brand-brown shadow-sm'
                    : 'text-brand-taupe hover:text-brand-brown'
                }`}
              >
                按日统计
              </button>
              <button
                onClick={() => setGranularity('month')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  granularity === 'month'
                    ? 'bg-white text-brand-brown shadow-sm'
                    : 'text-brand-taupe hover:text-brand-brown'
                }`}
              >
                按月统计
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevPeriod}
              className="p-2 rounded-lg border border-brand-brown/10 text-brand-taupe hover:bg-brand-beige hover:text-brand-brown transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-brand-beige/30 rounded-lg">
              <CalendarIcon className="w-4 h-4 text-brand-taupe" />
              <span className="text-sm font-medium text-brand-brown">
                {periodLabel}
              </span>
            </div>
            <button
              onClick={handleNextPeriod}
              className="p-2 rounded-lg border border-brand-brown/10 text-brand-taupe hover:bg-brand-beige hover:text-brand-brown transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-brand-brown" />
            <h3 className="font-display text-lg font-semibold text-brand-brown">
              {granularity === 'day' ? '每日' : '每月'}营收趋势
            </h3>
          </div>
          <div className="h-64 flex items-end gap-2 px-2">
            {(granularity === 'day' ? dailyData : monthlyData).map((item, idx) => {
              const heightPercent = (item.revenue / maxRevenue) * 100;
              const label =
                granularity === 'day'
                  ? format((item as DailyReportItem).date, 'd')
                  : format((item as MonthlyReportItem).month + '-01', 'M月');

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center gap-2 group"
                >
                  <div className="text-xs text-brand-taupe opacity-0 group-hover:opacity-100 transition-opacity">
                    ¥{item.revenue.toFixed(0)}
                  </div>
                  <div
                    className="w-full bg-gradient-to-t from-brand-brown to-brand-brownLight rounded-t-lg transition-all duration-300 hover:from-brand-orange hover:to-amber-400 cursor-pointer"
                    style={{ height: `${Math.max(heightPercent, 2)}%` }}
                    title={`${label}: ¥${item.revenue.toFixed(2)}`}
                  />
                  <span className="text-xs text-brand-taupe">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-brand-brown" />
            <h3 className="font-display text-lg font-semibold text-brand-brown">
              {granularity === 'day' ? '每日' : '每月'}入住率
            </h3>
          </div>
          <div className="h-48 flex items-end gap-2 px-2">
            {(granularity === 'day' ? dailyData : monthlyData).map((item, idx) => {
              const rate =
                granularity === 'day'
                  ? (item as DailyReportItem).occupancyRate
                  : (item as MonthlyReportItem).avgOccupancyRate;
              const label =
                granularity === 'day'
                  ? format((item as DailyReportItem).date, 'd')
                  : format((item as MonthlyReportItem).month + '-01', 'M月');

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center gap-2 group"
                >
                  <div className="text-xs text-brand-taupe opacity-0 group-hover:opacity-100 transition-opacity">
                    {rate.toFixed(1)}%
                  </div>
                  <div
                    className="w-full bg-gradient-to-t from-brand-green to-brand-greenLight rounded-t-lg transition-all duration-300 hover:from-brand-green hover:to-emerald-300 cursor-pointer"
                    style={{ height: `${Math.max(rate, 2)}%` }}
                    title={`${label}: ${rate.toFixed(2)}%`}
                  />
                  <span className="text-xs text-brand-taupe">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card-base p-6">
        <h3 className="font-display text-lg font-semibold text-brand-brown mb-4">
          详细数据
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-brown/10">
                {granularity === 'day' ? (
                  <>
                    <th className="text-left py-3 px-4 font-medium text-brand-taupe">日期</th>
                    <th className="text-right py-3 px-4 font-medium text-brand-taupe">营收</th>
                    <th className="text-right py-3 px-4 font-medium text-brand-taupe">入住率</th>
                    <th className="text-right py-3 px-4 font-medium text-brand-taupe">已占用</th>
                    <th className="text-right py-3 px-4 font-medium text-brand-taupe">入住</th>
                    <th className="text-right py-3 px-4 font-medium text-brand-taupe">退房</th>
                    <th className="text-right py-3 px-4 font-medium text-brand-taupe">新预订</th>
                  </>
                ) : (
                  <>
                    <th className="text-left py-3 px-4 font-medium text-brand-taupe">月份</th>
                    <th className="text-right py-3 px-4 font-medium text-brand-taupe">营收</th>
                    <th className="text-right py-3 px-4 font-medium text-brand-taupe">平均入住率</th>
                    <th className="text-right py-3 px-4 font-medium text-brand-taupe">预订数</th>
                    <th className="text-right py-3 px-4 font-medium text-brand-taupe">入住间夜</th>
                    <th className="text-right py-3 px-4 font-medium text-brand-taupe">平均房价</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {(granularity === 'day' ? dailyData : monthlyData).map((item, idx) => (
                <tr
                  key={idx}
                  className="border-b border-brand-brown/5 hover:bg-brand-beige/30 transition-colors"
                >
                  {granularity === 'day' ? (
                    <>
                      <td className="py-3 px-4 text-brand-brown">
                        {formatDateDisplay((item as DailyReportItem).date)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-brand-orange">
                        ¥{(item as DailyReportItem).revenue.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1">
                          <span className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <span
                              className="h-full bg-brand-green rounded-full"
                              style={{ width: `${(item as DailyReportItem).occupancyRate}%` }}
                            />
                          </span>
                          <span className="text-brand-brown text-xs">
                            {(item as DailyReportItem).occupancyRate.toFixed(1)}%
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-brand-brown">
                        {(item as DailyReportItem).occupiedRooms} / {(item as DailyReportItem).totalRooms}
                      </td>
                      <td className="py-3 px-4 text-right text-brand-green">
                        {(item as DailyReportItem).checkIns}
                      </td>
                      <td className="py-3 px-4 text-right text-brand-orange">
                        {(item as DailyReportItem).checkOuts}
                      </td>
                      <td className="py-3 px-4 text-right text-brand-brown">
                        {(item as DailyReportItem).bookings}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 px-4 text-brand-brown">
                        {formatMonth((item as MonthlyReportItem).month + '-01')}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-brand-orange">
                        ¥{(item as MonthlyReportItem).revenue.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1">
                          <span className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <span
                              className="h-full bg-brand-green rounded-full"
                              style={{ width: `${(item as MonthlyReportItem).avgOccupancyRate}%` }}
                            />
                          </span>
                          <span className="text-brand-brown text-xs">
                            {(item as MonthlyReportItem).avgOccupancyRate.toFixed(1)}%
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-brand-brown">
                        {(item as MonthlyReportItem).totalBookings}
                      </td>
                      <td className="py-3 px-4 text-right text-brand-brown">
                        {(item as MonthlyReportItem).totalNights}
                      </td>
                      <td className="py-3 px-4 text-right text-brand-brown">
                        ¥{(item as MonthlyReportItem).avgDailyRate.toFixed(2)}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
