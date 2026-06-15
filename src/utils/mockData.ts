import type { Room, Booking } from '@/types';
import { generateId, todayStr, calculateNights } from './date';
import { addDays, format, subMonths, subDays } from 'date-fns';

export function getInitialRooms(): Room[] {
  const now = new Date().toISOString();
  return [
    {
      id: generateId(),
      roomNumber: '101',
      name: '听雨阁',
      type: 'standard',
      price: 288,
      bedType: 'double',
      capacity: 2,
      facilities: ['WiFi', '空调', '电视', '独立卫浴', '24小时热水', '吹风机'],
      description: '温馨舒适的标准间，配备一张双人床，适合情侣或闺蜜出行。',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      roomNumber: '102',
      name: '观云轩',
      type: 'standard',
      price: 288,
      bedType: 'twin',
      capacity: 2,
      facilities: ['WiFi', '空调', '电视', '独立卫浴', '24小时热水', '吹风机', '阳台'],
      description: '带独立阳台的标准间，两张单人床，适合朋友同住。',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      roomNumber: '201',
      name: '揽月楼',
      type: 'deluxe',
      price: 488,
      bedType: 'king',
      capacity: 2,
      facilities: ['WiFi', '空调', '电视', '独立卫浴', '24小时热水', '吹风机', '洗漱用品', '迷你吧', '山景', '保险箱'],
      description: '豪华大床房，全景落地窗，可欣赏远山美景。',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      roomNumber: '202',
      name: '望海居',
      type: 'deluxe',
      price: 528,
      bedType: 'king',
      capacity: 2,
      facilities: ['WiFi', '空调', '电视', '独立卫浴', '24小时热水', '吹风机', '洗漱用品', '迷你吧', '海景', '阳台', '咖啡机'],
      description: '豪华海景房，面朝大海，春暖花开。配备独立阳台和咖啡机。',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      roomNumber: '301',
      name: '竹韵套房',
      type: 'suite',
      price: 888,
      bedType: 'king',
      capacity: 2,
      facilities: ['WiFi', '空调', '电视', '独立卫浴', '24小时热水', '吹风机', '洗漱用品', '迷你吧', '山景', '阳台', '保险箱', '咖啡机', '冰箱', '拖鞋'],
      description: '顶级套房，独立起居室和卧室，配备大浴缸，尊享品质体验。',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      roomNumber: '302',
      name: '阖家欢',
      type: 'family',
      price: 688,
      bedType: 'double',
      capacity: 4,
      facilities: ['WiFi', '空调', '电视', '独立卫浴', '24小时热水', '吹风机', '洗漱用品', '迷你吧', '冰箱', '拖鞋'],
      description: '温馨家庭房，一张双人床+两张单人床，适合全家出行。',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

const guestNames = [
  '张先生', '李女士', '王总', '陈小姐', '赵先生', '孙女士',
  '周先生', '吴小姐', '郑先生', '冯女士', '陈先生', '褚小姐',
  '卫先生', '蒋女士', '沈先生', '韩小姐', '杨先生', '朱女士',
  '秦先生', '尤小姐', '许先生', '何女士', '吕先生', '施小姐',
];

const guestPhones = [
  '13800138001', '13900139002', '13700137003', '13600136004',
  '13500135005', '13400134006', '13300133007', '13200132008',
  '13100131009', '13000130010', '15800158011', '15900159012',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateHistoricalBookings(rooms: Room[]): Booking[] {
  if (rooms.length === 0) return [];
  const bookings: Booking[] = [];
  const now = new Date().toISOString();
  const today = new Date();

  for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
    const monthDate = subMonths(today, monthOffset);
    const daysInMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0
    ).getDate();

    const bookingsThisMonth = Math.floor(Math.random() * 8) + 10;

    for (let i = 0; i < bookingsThisMonth; i++) {
      const room = pickRandom(rooms);
      const startDay = Math.floor(Math.random() * (daysInMonth - 4)) + 1;
      const nights = Math.floor(Math.random() * 4) + 1;

      const checkInDate = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        startDay
      );
      const checkOutDate = addDays(checkInDate, nights);

      const isPast = checkOutDate < today;
      const isCurrent =
        checkInDate <= today && checkOutDate >= today;
      const isFuture = checkInDate > today;

      let status: Booking['status'] = 'checked-out';
      if (isFuture) {
        status = Math.random() > 0.1 ? 'confirmed' : 'cancelled';
      } else if (isCurrent) {
        status = Math.random() > 0.3 ? 'checked-in' : 'confirmed';
      } else {
        status = Math.random() > 0.05 ? 'checked-out' : 'cancelled';
      }

      const totalPrice = room.price * nights;

      bookings.push({
        id: generateId(),
        roomId: room.id,
        guestName: pickRandom(guestNames),
        guestPhone: pickRandom(guestPhones),
        checkIn: format(checkInDate, 'yyyy-MM-dd'),
        checkOut: format(checkOutDate, 'yyyy-MM-dd'),
        guests: Math.floor(Math.random() * 3) + 1,
        totalPrice,
        status,
        notes: Math.random() > 0.7 ? pickRandom(['需要安静的房间', '希望高层', '需要加床', '商务出行', '蜜月旅行', '']) : '',
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return bookings;
}

export function getInitialBookings(rooms: Room[]): Booking[] {
  if (rooms.length === 0) return [];
  const now = new Date().toISOString();
  const today = new Date();

  const historicalBookings = generateHistoricalBookings(rooms);

  const recentBookings: Booking[] = [
    {
      id: generateId(),
      roomId: rooms[0].id,
      guestName: '张先生',
      guestPhone: '13800138001',
      guestIdCard: '110101199001011234',
      checkIn: format(addDays(today, -2), 'yyyy-MM-dd'),
      checkOut: format(addDays(today, 1), 'yyyy-MM-dd'),
      guests: 2,
      totalPrice: 288 * 3,
      status: 'checked-in',
      notes: '需要安静的房间',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      roomId: rooms[1].id,
      guestName: '李女士',
      guestPhone: '13900139002',
      guestIdCard: '110101199203045678',
      checkIn: todayStr(),
      checkOut: format(addDays(today, 2), 'yyyy-MM-dd'),
      guests: 2,
      totalPrice: 288 * 2,
      status: 'confirmed',
      notes: '下午3点左右到店',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      roomId: rooms[2].id,
      guestName: '王总',
      guestPhone: '13700137003',
      guestIdCard: '310101198505069012',
      checkIn: format(addDays(today, 3), 'yyyy-MM-dd'),
      checkOut: format(addDays(today, 5), 'yyyy-MM-dd'),
      guests: 2,
      totalPrice: 488 * 2,
      status: 'confirmed',
      notes: '商务出行，需要发票',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      roomId: rooms[3].id,
      guestName: '陈小姐',
      guestPhone: '13600136004',
      checkIn: format(addDays(today, 1), 'yyyy-MM-dd'),
      checkOut: format(addDays(today, 4), 'yyyy-MM-dd'),
      guests: 2,
      totalPrice: 528 * 3,
      status: 'confirmed',
      notes: '蜜月旅行，希望房间有浪漫布置',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      roomId: rooms[5].id,
      guestName: '赵先生一家',
      guestPhone: '13500135005',
      checkIn: format(addDays(today, 7), 'yyyy-MM-dd'),
      checkOut: format(addDays(today, 10), 'yyyy-MM-dd'),
      guests: 4,
      totalPrice: 688 * 3,
      status: 'confirmed',
      notes: '两大两小，需要儿童用品',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      roomId: rooms[4].id,
      guestName: '孙先生',
      guestPhone: '13400134006',
      checkIn: format(addDays(today, -5), 'yyyy-MM-dd'),
      checkOut: format(addDays(today, -2), 'yyyy-MM-dd'),
      guests: 2,
      totalPrice: 888 * 3,
      status: 'checked-out',
      notes: '',
      createdAt: now,
      updatedAt: now,
    },
  ];

  return [...historicalBookings, ...recentBookings];
}
