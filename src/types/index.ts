export type RoomType = 'standard' | 'deluxe' | 'suite' | 'family';
export type BedType = 'single' | 'double' | 'twin' | 'king';
export type RoomStatus = 'active' | 'maintenance' | 'inactive';

export type UserRole = 'owner' | 'receptionist';

export const UserRoleLabels: Record<UserRole, string> = {
  owner: '老板',
  receptionist: '前台',
};

export type Permission =
  | 'store:view'
  | 'store:create'
  | 'store:update'
  | 'store:delete'
  | 'room:view'
  | 'room:create'
  | 'room:update'
  | 'room:delete'
  | 'room:rules'
  | 'room:closeddate:create'
  | 'room:closeddate:update'
  | 'room:closeddate:delete'
  | 'room:minstay:create'
  | 'room:minstay:update'
  | 'room:minstay:delete'
  | 'booking:view'
  | 'booking:create'
  | 'booking:update'
  | 'booking:cancel'
  | 'booking:checkin'
  | 'booking:checkout'
  | 'waitlist:view'
  | 'waitlist:create'
  | 'waitlist:update'
  | 'waitlist:cancel'
  | 'waitlist:confirm'
  | 'guest:view'
  | 'cleaning:view'
  | 'cleaning:update'
  | 'report:view'
  | 'report:export'
  | 'audit:view'
  | 'user:switch';

export const RolePermissions: Record<UserRole, Permission[]> = {
  owner: [
    'store:view',
    'store:create',
    'store:update',
    'store:delete',
    'room:view',
    'room:create',
    'room:update',
    'room:delete',
    'room:rules',
    'room:closeddate:create',
    'room:closeddate:update',
    'room:closeddate:delete',
    'room:minstay:create',
    'room:minstay:update',
    'room:minstay:delete',
    'booking:view',
    'booking:create',
    'booking:update',
    'booking:cancel',
    'booking:checkin',
    'booking:checkout',
    'waitlist:view',
    'waitlist:create',
    'waitlist:update',
    'waitlist:cancel',
    'waitlist:confirm',
    'guest:view',
    'cleaning:view',
    'cleaning:update',
    'report:view',
    'report:export',
    'audit:view',
    'user:switch',
  ],
  receptionist: [
    'store:view',
    'room:view',
    'room:rules',
    'room:closeddate:create',
    'room:closeddate:update',
    'room:closeddate:delete',
    'room:minstay:create',
    'room:minstay:update',
    'room:minstay:delete',
    'booking:view',
    'booking:create',
    'booking:update',
    'booking:cancel',
    'booking:checkin',
    'booking:checkout',
    'waitlist:view',
    'waitlist:create',
    'waitlist:update',
    'waitlist:cancel',
    'waitlist:confirm',
    'guest:view',
    'cleaning:view',
    'cleaning:update',
    'report:view',
  ],
};

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export type AuditAction =
  | 'store:create'
  | 'store:update'
  | 'store:delete'
  | 'room:create'
  | 'room:update'
  | 'room:delete'
  | 'room:closeddate:create'
  | 'room:closeddate:update'
  | 'room:closeddate:delete'
  | 'room:minstay:create'
  | 'room:minstay:update'
  | 'room:minstay:delete'
  | 'booking:create'
  | 'booking:update'
  | 'booking:cancel'
  | 'booking:checkin'
  | 'booking:checkout'
  | 'waitlist:create'
  | 'waitlist:update'
  | 'waitlist:cancel'
  | 'waitlist:match'
  | 'waitlist:confirm'
  | 'waitlist:expire'
  | 'cleaning:update'
  | 'user:switch';

export const AuditActionLabels: Record<AuditAction, string> = {
  'store:create': '创建门店',
  'store:update': '更新门店',
  'store:delete': '删除门店',
  'room:create': '创建房间',
  'room:update': '更新房间',
  'room:delete': '删除房间',
  'room:closeddate:create': '添加禁订日期',
  'room:closeddate:update': '更新禁订日期',
  'room:closeddate:delete': '删除禁订日期',
  'room:minstay:create': '添加最短连住规则',
  'room:minstay:update': '更新最短连住规则',
  'room:minstay:delete': '删除最短连住规则',
  'booking:create': '创建预订',
  'booking:update': '更新预订',
  'booking:cancel': '取消预订',
  'booking:checkin': '办理入住',
  'booking:checkout': '办理退房',
  'waitlist:create': '新增候补登记',
  'waitlist:update': '更新候补登记',
  'waitlist:cancel': '取消候补登记',
  'waitlist:match': '候补匹配成功',
  'waitlist:confirm': '候补确认预订',
  'waitlist:expire': '候补登记过期',
  'cleaning:update': '更新保洁',
  'user:switch': '切换角色',
};

export interface AuditLog {
  id: string;
  action: AuditAction;
  userId: string;
  userName: string;
  userRole: UserRole;
  targetId?: string;
  targetName?: string;
  details?: string;
  createdAt: string;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  storeId: string;
  roomNumber: string;
  name: string;
  type: RoomType;
  price: number;
  bedType: BedType;
  capacity: number;
  facilities: string[];
  description: string;
  status: RoomStatus;
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus = 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled';

export interface Booking {
  id: string;
  roomId: string;
  guestName: string;
  guestPhone: string;
  guestIdCard?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  roomPrice: number;
  extraServicesPrice: number;
  extraServices: SelectedExtraService[];
  status: BookingStatus;
  notes?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export const RoomTypeLabels: Record<RoomType, string> = {
  standard: '标准间',
  deluxe: '豪华间',
  suite: '套房',
  family: '家庭房',
};

export const BedTypeLabels: Record<BedType, string> = {
  single: '单人床',
  double: '双人床',
  twin: '双床',
  king: '大床',
};

export const RoomStatusLabels: Record<RoomStatus, string> = {
  active: '正常',
  maintenance: '维护中',
  inactive: '停用',
};

export const BookingStatusLabels: Record<BookingStatus, string> = {
  confirmed: '已确认',
  'checked-in': '已入住',
  'checked-out': '已退房',
  cancelled: '已取消',
};

export const BookingStatusColors: Record<BookingStatus, string> = {
  confirmed: 'bg-blue-100 text-blue-700',
  'checked-in': 'bg-brand-green/20 text-brand-green',
  'checked-out': 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};

export const CommonFacilities = [
  'WiFi',
  '空调',
  '电视',
  '独立卫浴',
  '24小时热水',
  '吹风机',
  '洗漱用品',
  '拖鞋',
  '保险箱',
  '迷你吧',
  '阳台',
  '山景',
  '海景',
  '咖啡机',
  '冰箱',
];

export interface DailyReportItem {
  date: string;
  revenue: number;
  occupancyRate: number;
  occupiedRooms: number;
  totalRooms: number;
  checkIns: number;
  checkOuts: number;
  bookings: number;
}

export interface MonthlyReportItem {
  month: string;
  revenue: number;
  avgOccupancyRate: number;
  totalBookings: number;
  totalNights: number;
  avgDailyRate: number;
}

export interface GuestProfile {
  guestPhone: string;
  guestName: string;
  bookingCount: number;
  validBookingCount: number;
  totalSpending: number;
  totalNights: number;
  lastCheckIn: string;
  lastCheckOut: string;
  lastVisitDate: string;
  upcomingBookings: number;
  repurchaseReminder: RepurchaseReminder | null;
}

export type RepurchaseLevel = 'recent' | 'suggest' | 'churn-risk';

export interface RepurchaseReminder {
  level: RepurchaseLevel;
  daysSinceLastVisit: number;
  message: string;
}

export const RepurchaseLevelLabels: Record<RepurchaseLevel, string> = {
  recent: '近期到访',
  suggest: '建议回访',
  'churn-risk': '流失风险',
};

export const RepurchaseLevelColors: Record<RepurchaseLevel, string> = {
  recent: 'bg-green-100 text-green-700',
  suggest: 'bg-amber-100 text-amber-700',
  'churn-risk': 'bg-red-100 text-red-600',
};

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export type ReportGranularity = 'day' | 'month';

export type ClosedDateReason = 'maintenance' | 'holiday' | 'private' | 'other';

export interface ClosedDate {
  id: string;
  roomId: string;
  startDate: string;
  endDate: string;
  reason: ClosedDateReason;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export const ClosedDateReasonLabels: Record<ClosedDateReason, string> = {
  maintenance: '维护保养',
  holiday: '节假日',
  private: '私用',
  other: '其他',
};

export const ClosedDateReasonColors: Record<ClosedDateReason, string> = {
  maintenance: 'bg-rose-100 text-rose-700',
  holiday: 'bg-amber-100 text-amber-700',
  private: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-700',
};

export interface MinStayRule {
  id: string;
  roomId: string;
  startDate: string;
  endDate: string;
  minNights: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type CleaningTaskStatus = 'pending' | 'in-progress' | 'completed';

export interface CleaningTask {
  id: string;
  roomId: string;
  bookingId?: string;
  guestName?: string;
  scheduledDate: string;
  status: CleaningTaskStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export const CleaningTaskStatusLabels: Record<CleaningTaskStatus, string> = {
  pending: '待处理',
  'in-progress': '进行中',
  completed: '已完成',
};

export const CleaningTaskStatusColors: Record<CleaningTaskStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
};

export type ExtraServiceChargeType = 'per_night' | 'per_stay' | 'per_person_per_night';

export const ExtraServiceChargeTypeLabels: Record<ExtraServiceChargeType, string> = {
  per_night: '每晚',
  per_stay: '每次入住',
  per_person_per_night: '每人每晚',
};

export interface ExtraService {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  chargeType: ExtraServiceChargeType;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

export interface SelectedExtraService {
  serviceId: string;
  quantity: number;
}

export type WaitlistStatus = 'waiting' | 'matched' | 'confirmed' | 'cancelled' | 'expired';

export interface WaitlistEntry {
  id: string;
  roomId: string;
  roomTypeId?: RoomType;
  guestName: string;
  guestPhone: string;
  guestIdCard?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  notes?: string;
  status: WaitlistStatus;
  priority: number;
  matchedRoomId?: string;
  matchedBookingId?: string;
  notifiedAt?: string;
  confirmedAt?: string;
  expiredAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export const WaitlistStatusLabels: Record<WaitlistStatus, string> = {
  waiting: '等待中',
  matched: '已匹配待确认',
  confirmed: '已确认预订',
  cancelled: '已取消',
  expired: '已过期',
};

export const WaitlistStatusColors: Record<WaitlistStatus, string> = {
  waiting: 'bg-amber-100 text-amber-700',
  matched: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
  expired: 'bg-red-100 text-red-600',
};

export interface WaitlistNotification {
  id: string;
  waitlistId: string;
  guestName: string;
  guestPhone: string;
  message: string;
  roomNumber?: string;
  checkIn: string;
  checkOut: string;
  totalPrice?: number;
  createdAt: string;
  read: boolean;
  confirmed: boolean;
  confirmedAt?: string;
}
