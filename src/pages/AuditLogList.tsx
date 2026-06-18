import { useState, useMemo } from 'react';
import { FileText, Filter, Download, Clock, User, Shield } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { AuditAction, UserRole } from '@/types';
import { AuditActionLabels, UserRoleLabels } from '@/types';
import { formatDateTimeDisplay } from '@/utils/date';

const actionColorMap: Record<AuditAction, string> = {
  'store:create': 'bg-green-100 text-green-700',
  'store:update': 'bg-blue-100 text-blue-700',
  'store:delete': 'bg-red-100 text-red-700',
  'room:create': 'bg-green-100 text-green-700',
  'room:update': 'bg-blue-100 text-blue-700',
  'room:delete': 'bg-red-100 text-red-700',
  'room:closeddate:create': 'bg-green-100 text-green-700',
  'room:closeddate:update': 'bg-blue-100 text-blue-700',
  'room:closeddate:delete': 'bg-red-100 text-red-700',
  'room:minstay:create': 'bg-green-100 text-green-700',
  'room:minstay:update': 'bg-blue-100 text-blue-700',
  'room:minstay:delete': 'bg-red-100 text-red-700',
  'booking:create': 'bg-green-100 text-green-700',
  'booking:update': 'bg-blue-100 text-blue-700',
  'booking:cancel': 'bg-red-100 text-red-700',
  'booking:restore': 'bg-green-100 text-green-700',
  'booking:checkin': 'bg-brand-green/20 text-brand-green',
  'booking:checkout': 'bg-amber-100 text-amber-700',
  'waitlist:create': 'bg-amber-100 text-amber-700',
  'waitlist:update': 'bg-blue-100 text-blue-700',
  'waitlist:cancel': 'bg-gray-100 text-gray-600',
  'waitlist:match': 'bg-blue-100 text-blue-700',
  'waitlist:confirm': 'bg-green-100 text-green-700',
  'waitlist:expire': 'bg-red-100 text-red-600',
  'cleaning:update': 'bg-blue-100 text-blue-700',
  'user:switch': 'bg-purple-100 text-purple-700',
  'longterm:create': 'bg-indigo-100 text-indigo-700',
  'longterm:update': 'bg-blue-100 text-blue-700',
  'longterm:cancel': 'bg-red-100 text-red-700',
  'longterm:renew': 'bg-green-100 text-green-700',
  'longterm:payment': 'bg-amber-100 text-amber-700',
  'holidaypricing:create': 'bg-green-100 text-green-700',
  'holidaypricing:update': 'bg-blue-100 text-blue-700',
  'holidaypricing:delete': 'bg-red-100 text-red-700',
  'booking:deposit:collect': 'bg-green-100 text-green-700',
  'booking:deposit:refund': 'bg-blue-100 text-blue-700',
  'booking:deposit:deduct': 'bg-red-100 text-red-700',
  'longterm:deposit:collect': 'bg-green-100 text-green-700',
  'longterm:deposit:refund': 'bg-blue-100 text-blue-700',
  'longterm:deposit:deduct': 'bg-red-100 text-red-700',
};

export default function AuditLogList() {
  const { auditLogs, users } = useAppStore();
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (userFilter !== 'all' && log.userId !== userFilter) return false;
      if (roleFilter !== 'all' && log.userRole !== roleFilter) return false;
      return true;
    });
  }, [auditLogs, actionFilter, userFilter, roleFilter]);

  const exportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['时间', '操作人', '角色', '操作类型', '操作对象', '详情'];
    const rows = filteredLogs.map((log) => [
      formatDateTimeDisplay(log.createdAt),
      log.userName,
      UserRoleLabels[log.userRole],
      AuditActionLabels[log.action],
      log.targetName || '-',
      log.details || '-',
    ]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `操作审计日志_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-brown">操作审计</h1>
          <p className="text-brand-taupe mt-1">查看系统所有关键操作记录</p>
        </div>
        <button onClick={exportCSV} className="btn-primary flex items-center gap-2">
          <Download className="w-4 h-4" />
          导出日志
        </button>
      </div>

      <div className="card-base p-4 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-brand-taupe" />
          <select
            className="input-base !w-auto"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as AuditAction | 'all')}
          >
            <option value="all">全部操作</option>
            {(Object.keys(AuditActionLabels) as AuditAction[]).map((action) => (
              <option key={action} value={action}>
                {AuditActionLabels[action]}
              </option>
            ))}
          </select>
          <select
            className="input-base !w-auto"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
          >
            <option value="all">全部操作人</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select
            className="input-base !w-auto"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
          >
            <option value="all">全部角色</option>
            {(Object.keys(UserRoleLabels) as UserRole[]).map((role) => (
              <option key={role} value={role}>
                {UserRoleLabels[role]}
              </option>
            ))}
          </select>
          <span className="text-sm text-brand-taupe">共 {filteredLogs.length} 条记录</span>
        </div>
      </div>

      <div className="card-base overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="w-16 h-16 mx-auto text-brand-brown/30 mb-4" />
            <h3 className="font-display text-lg text-brand-brown mb-2">暂无操作记录</h3>
            <p className="text-brand-taupe">系统操作将在这里显示</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-brand-beige/60">
                <tr>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      时间
                    </div>
                  </th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      操作人
                    </div>
                  </th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">
                    <div className="flex items-center gap-1">
                      <Shield className="w-4 h-4" />
                      角色
                    </div>
                  </th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">操作类型</th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">操作对象</th>
                  <th className="text-left text-sm font-medium text-brand-taupe px-5 py-3">详情</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => (
                  <tr
                    key={log.id}
                    className={`border-t border-brand-brown/5 hover:bg-brand-beige/30 transition-colors ${
                      idx % 2 === 1 ? 'bg-brand-cream/50' : ''
                    }`}
                  >
                    <td className="px-5 py-4 text-sm text-brand-brown whitespace-nowrap">
                      {formatDateTimeDisplay(log.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-brand-brown">{log.userName}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          log.userRole === 'owner'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {UserRoleLabels[log.userRole]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${actionColorMap[log.action]}`}
                      >
                        {AuditActionLabels[log.action]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-brand-brown">
                      {log.targetName || '-'}
                    </td>
                    <td className="px-5 py-4 text-sm text-brand-taupe max-w-md">
                      <div className="line-clamp-2">{log.details || '-'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
