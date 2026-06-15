export type RoomType = 'standard' | 'deluxe' | 'suite' | 'family';
export type BedType = 'single' | 'double' | 'twin' | 'king';
export type RoomStatus = 'active' | 'maintenance' | 'inactive';

export interface Room {
  id: string;
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

export type ReportGranularity = 'day' | 'month';
