import { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
  Building2,
  Filter,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { ReportGranularity, DailyReportItem, MonthlyReportItem } from '@/types';
import {
  formatDateDisplay,
  formatMonth,
  todayStr,
  getMonthKey,
  startOfMonthStr,
  endOfMonthStr,
} from '@/utils/date';
import { format, parseISO, subMonths, subDays, addDays, addMonths } from 'date-fns';

export default function Reports() {
  const location = useLocation();
  const {
    stores,
    getDailyReport,
    getMonthlyReport,
    hasPermission,
  } = useAppStore();
  const canExport = hasPermission('report:export');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [granularity, setGranularity] = useState<ReportGranularity>('day');
  const [startDate, setStartDate] = useState(() => {
    const d = subMonths(new Date(), 5);
    return format(startOfMonthStr(d), 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(todayStr());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const revenueTrendRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const start = params.get('startDate');
    const end = params.get('endDate');
    const scrollTo = params.get('scrollTo');

    if (start && end) {
      setStartDate(start);
      setEndDate(end);
      setGranularity('day');
    }

    if (scrollTo === 'revenue-trend' && revenueTrendRef.current && !hasScrolled) {
      setTimeout(() => {
        revenueTrendRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHasScrolled(true);
      }, 100);
    }
  }, [location.search, hasScrolled]);

  const displayStart = granularity === 'day' ? startDate : getMonthKey(startDate);
  const displayEnd = granularity === 'day' ? endDate : getMonthKey(endDate);

  const dailyData = useMemo(() => {
    if (granularity === 'day') {
      return getDailyReport(startDate, endDate, storeFilter);
    }
    return [];
  }, [granularity, startDate, endDate, getDailyReport, storeFilter]);

  const monthlyData = useMemo(() => {
    if (granularity === 'month') {
      return getMonthlyReport(getMonthKey(startDate), getMonthKey(endDate), storeFilter);
    }
    return [];
  }, [granularity, startDate, endDate, getMonthlyReport, storeFilter]);

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

  const handleGranularityChange = (g: ReportGranularity) => {
    setGranularity(g);
    if (g === 'day') {
      const today = new Date();
      setStartDate(format(subDays(today, 29), 'yyyy-MM-dd'));
      setEndDate(todayStr());
    } else {
      const today = new Date();
      setStartDate(startOfMonthStr(subMonths(today, 5)));
      setEndDate(todayStr());
    }
  };

  const handlePrevPeriod = () => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (granularity === 'day') {
      const newStart = subDays(start, diffDays);
      const newEnd = subDays(end, diffDays);
      setStartDate(format(newStart, 'yyyy-MM-dd'));
      setEndDate(format(newEnd, 'yyyy-MM-dd'));
    } else {
      const monthDiff =
        (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
      const newStart = subMonths(start, monthDiff);
      const newEnd = subMonths(end, monthDiff);
      setStartDate(format(newStart, 'yyyy-MM-dd'));
      setEndDate(format(newEnd, 'yyyy-MM-dd'));
    }
  };

  const handleNextPeriod = () => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (granularity === 'day') {
      const newStart = addDays(start, diffDays);
      const newEnd = addDays(end, diffDays);
      setStartDate(format(newStart, 'yyyy-MM-dd'));
      setEndDate(format(newEnd, 'yyyy-MM-dd'));
    } else {
      const monthDiff =
        (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
      const newStart = addMonths(start, monthDiff);
      const newEnd = addMonths(end, monthDiff);
      setStartDate(format(newStart, 'yyyy-MM-dd'));
      setEndDate(format(newEnd, 'yyyy-MM-dd'));
    }
  };

  const quickRanges = [
    { label: '今日', days: 0 },
    { label: '近7天', days: 6 },
    { label: '近30天', days: 29 },
    { label: '本月', isMonth: 'current' },
    { label: '上月', isMonth: 'last' },
  ];

  const handleQuickRange = (range: typeof quickRanges[0]) => {
    const today = new Date();
    if ('isMonth' in range) {
      if (range.isMonth === 'current') {
        setStartDate(startOfMonthStr(today));
        setEndDate(todayStr());
      } else {
        const lastMonth = subMonths(today, 1);
        setStartDate(startOfMonthStr(lastMonth));
        setEndDate(endOfMonthStr(lastMonth));
      }
    } else {
      setStartDate(format(subDays(today, range.days), 'yyyy-MM-dd'));
      setEndDate(todayStr());
    }
  };

  const exportCSV = () => {
    const data = granularity === 'day' ? dailyData : monthlyData;
    if (data.length === 0) return;

    let headers: string[];
    let rows: string[][];

    if (granularity === 'day') {
      headers = ['日期', '营收(元)', '入住率(%)', '已占用房间', '入住数', '退房数', '新预订(下单日)'];
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
      : `${formatMonth(displayStart + '-01')} - ${formatMonth(displayEnd + '-01')}`;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-brown">经营报表</h1>
          <p className="text-brand-taupe mt-1">查看营收与入住率统计数据</p>
        </div>
        {canExport && (
          <button
            onClick={exportCSV}
            className="btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出报表
          </button>
        )}
      </div>

      <div className="card-base p-4 mb-6">
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
          {storeFilter !== 'all' && (
            <span className="text-sm text-brand-taupe flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              当前查看单门店统计
            </span>
          )}
        </div>
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
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex bg-brand-beige/50 rounded-lg p-1">
                <button
                  onClick={() => handleGranularityChange('day')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    granularity === 'day'
                      ? 'bg-white text-brand-brown shadow-sm'
                      : 'text-brand-taupe hover:text-brand-brown'
                  }`}
                >
                  按日统计
                </button>
                <button
                  onClick={() => handleGranularityChange('month')}
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
                title="上一周期"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-beige/30 rounded-lg hover:bg-brand-beige/50 transition-colors"
                >
                  <CalendarIcon className="w-4 h-4 text-brand-taupe" />
                  <span className="text-sm font-medium text-brand-brown">
                    {periodLabel}
                  </span>
                </button>

                {showDatePicker && (
                  <div className="absolute right-0 top-full mt-2 z-20 bg-white rounded-xl shadow-lg border border-brand-brown/10 p-4 w-80">
                    <div className="mb-4">
                      <div className="text-sm font-medium text-brand-brown mb-2">快捷选择</div>
                      <div className="flex flex-wrap gap-2">
                        {granularity === 'day' ? (
                          <>
                            {quickRanges.map((range) => (
                              <button
                                key={range.label}
                                onClick={() => {
                                  handleQuickRange(range);
                                  setShowDatePicker(false);
                                }}
                                className="px-3 py-1.5 text-xs bg-brand-beige/50 text-brand-brown rounded-lg hover:bg-brand-beige transition-colors"
                              >
                                {range.label}
                              </button>
                            ))}
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                const today = new Date();
                                setStartDate(startOfMonthStr(subMonths(today, 2)));
                                setEndDate(todayStr());
                                setShowDatePicker(false);
                              }}
                              className="px-3 py-1.5 text-xs bg-brand-beige/50 text-brand-brown rounded-lg hover:bg-brand-beige transition-colors"
                            >
                              近3个月
                            </button>
                            <button
                              onClick={() => {
                                const today = new Date();
                                setStartDate(startOfMonthStr(subMonths(today, 5)));
                                setEndDate(todayStr());
                                setShowDatePicker(false);
                              }}
                              className="px-3 py-1.5 text-xs bg-brand-beige/50 text-brand-brown rounded-lg hover:bg-brand-beige transition-colors"
                            >
                              近6个月
                            </button>
                            <button
                              onClick={() => {
                                const today = new Date();
                                setStartDate(startOfMonthStr(today));
                                setEndDate(todayStr());
                                setShowDatePicker(false);
                              }}
                              className="px-3 py-1.5 text-xs bg-brand-beige/50 text-brand-brown rounded-lg hover:bg-brand-beige transition-colors"
                            >
                              本月
                            </button>
                            <button
                              onClick={() => {
                                const lastMonth = subMonths(new Date(), 1);
                                setStartDate(startOfMonthStr(lastMonth));
                                setEndDate(endOfMonthStr(lastMonth));
                                setShowDatePicker(false);
                              }}
                              className="px-3 py-1.5 text-xs bg-brand-beige/50 text-brand-brown rounded-lg hover:bg-brand-beige transition-colors"
                            >
                              上月
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="border-t border-brand-brown/10 pt-4">
                      <div className="text-sm font-medium text-brand-brown mb-3">自定义日期</div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-brand-taupe mb-1">开始日期</label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 border border-brand-brown/10 rounded-lg text-sm text-brand-brown focus:outline-none focus:border-brand-brown/30"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-brand-taupe mb-1">结束日期</label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 border border-brand-brown/10 rounded-lg text-sm text-brand-brown focus:outline-none focus:border-brand-brown/30"
                          />
                        </div>
                        <button
                          onClick={() => setShowDatePicker(false)}
                          className="w-full btn-primary py-2 text-sm"
                        >
                          确定
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleNextPeriod}
                className="p-2 rounded-lg border border-brand-brown/10 text-brand-taupe hover:bg-brand-beige hover:text-brand-brown transition-colors"
                title="下一周期"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6" ref={revenueTrendRef} id="revenue-trend">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-brand-brown" />
            <h3 className="font-display text-lg font-semibold text-brand-brown">
              {granularity === 'day' ? '每日' : '每月'}营收趋势
            </h3>
          </div>
          <div className="h-64 flex items-end gap-2 px-2 overflow-x-auto">
            {(granularity === 'day' ? dailyData : monthlyData).map((item, idx) => {
              const heightPercent = (item.revenue / maxRevenue) * 100;
              const label =
                granularity === 'day'
                  ? format((item as DailyReportItem).date, 'd')
                  : format((item as MonthlyReportItem).month + '-01', 'M月');

              return (
                <div
                  key={idx}
                  className="flex-1 min-w-[30px] flex flex-col items-center gap-2 group"
                >
                  <div className="text-xs text-brand-taupe opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
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
          <div className="h-48 flex items-end gap-2 px-2 overflow-x-auto">
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
                  className="flex-1 min-w-[30px] flex flex-col items-center gap-2 group"
                >
                  <div className="text-xs text-brand-taupe opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
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
