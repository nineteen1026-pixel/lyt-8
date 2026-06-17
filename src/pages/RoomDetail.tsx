import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Users,
  BedDouble,
  DollarSign,
  Building2,
  Wifi,
  Image as ImageIcon,
  Calendar,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { Room } from '@/types';
import {
  RoomTypeLabels,
  BedTypeLabels,
  RoomStatusLabels,
  CommonFacilities,
} from '@/types';
import Badge from '@/components/Badge';
import RoomForm from './RoomForm';
import RoomRulesModal from './RoomRulesModal';

export default function RoomDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getRoomById, getStoreById, updateRoom, getBookingsByRoom, hasPermission } = useAppStore();
  const canUpdateRoom = hasPermission('room:update');
  const canManageRoomRules = hasPermission('room:rules');

  const room = id ? getRoomById(id) : undefined;
  const [formOpen, setFormOpen] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = room?.images || [];

  useEffect(() => {
    if (images.length === 0) {
      setCurrentImageIndex(0);
    } else if (currentImageIndex >= images.length) {
      setCurrentImageIndex(images.length - 1);
    }
  }, [images.length, currentImageIndex]);

  if (!room) {
    return (
      <div className="animate-fade-in">
        <button onClick={() => navigate('/rooms')} className="btn-ghost mb-6">
          <ArrowLeft className="w-4 h-4" />
          返回房间列表
        </button>
        <div className="card-base p-12 text-center">
          <BedDouble className="w-16 h-16 mx-auto text-brand-brown/30 mb-4" />
          <h3 className="font-display text-lg text-brand-brown mb-2">房间不存在</h3>
          <p className="text-brand-taupe">未找到该房间信息</p>
        </div>
      </div>
    );
  }

  const store = getStoreById(room.storeId);
  const activeBookings = getBookingsByRoom(room.id).filter(
    (b) => b.status !== 'cancelled' && b.status !== 'checked-out'
  );
  const hasImages = images.length > 0;

  const getStatusBadge = (status: Room['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="green">{RoomStatusLabels[status]}</Badge>;
      case 'maintenance':
        return <Badge variant="warning">{RoomStatusLabels[status]}</Badge>;
      case 'inactive':
        return <Badge variant="default">{RoomStatusLabels[status]}</Badge>;
    }
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === images.length - 1 ? 0 : prev + 1
    );
  };

  const handleSubmit = (data: Omit<Room, 'id' | 'createdAt' | 'updatedAt'>) => {
    updateRoom(room.id, data);
  };

  const isFacilityAvailable = (facility: string) => room.facilities.includes(facility);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/rooms')} className="btn-ghost">
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-brand-brown">
                {room.roomNumber} {room.name}
              </h1>
              {getStatusBadge(room.status)}
            </div>
            <div className="flex items-center gap-2 text-sm text-brand-taupe mt-1">
              <Building2 className="w-4 h-4" />
              {store?.name || '未知门店'}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {canManageRoomRules && (
            <button onClick={() => setRulesModalOpen(true)} className="btn-secondary">
              <Calendar className="w-4 h-4" />
              房间规则
            </button>
          )}
          {canUpdateRoom && (
            <button onClick={() => setFormOpen(true)} className="btn-primary">
              <Pencil className="w-4 h-4" />
              编辑房间
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card-base overflow-hidden">
            {hasImages ? (
              <div className="relative">
                <div className="aspect-[16/9] bg-brand-beige">
                  <img
                    src={images[currentImageIndex].url}
                    alt={images[currentImageIndex].name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {images.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-black/50 rounded-full">
                      <ImageIcon className="w-3.5 h-3.5 text-white" />
                      <span className="text-sm text-white">
                        {currentImageIndex + 1} / {images.length}
                      </span>
                    </div>
                  </>
                )}
                {images.length > 1 && (
                  <div className="p-4 border-t border-brand-brown/10">
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {images.map((img, idx) => (
                        <button
                          key={img.id}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                            idx === currentImageIndex
                              ? 'border-brand-brown'
                              : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={img.url}
                            alt={img.name}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-[16/9] bg-gradient-to-br from-brand-beige to-brand-cream flex items-center justify-center">
                <div className="text-center">
                  <ImageIcon className="w-16 h-16 mx-auto text-brand-brown/30 mb-3" />
                  <p className="text-brand-taupe/60">暂无房间图片</p>
                  {canUpdateRoom && (
                    <p className="text-sm text-brand-taupe/50 mt-1">
                      点击右上角「编辑房间」上传图片
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="card-base p-6">
            <h2 className="font-display text-lg font-semibold text-brand-brown mb-4">
              房间描述
            </h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {room.description || '暂无房间描述'}
            </p>
          </div>

          <div className="card-base p-6">
            <div className="flex items-center gap-2 mb-5">
              <Wifi className="w-5 h-5 text-brand-brown" />
              <h2 className="font-display text-lg font-semibold text-brand-brown">
                设施配备
              </h2>
              <span className="text-sm text-brand-taupe">
                ({room.facilities.length} 项)
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {CommonFacilities.map((facility) => {
                const available = isFacilityAvailable(facility);
                return (
                  <div
                    key={facility}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
                      available
                        ? 'bg-brand-green/10 text-brand-green'
                        : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        available ? 'bg-brand-green' : 'bg-gray-300'
                      }`}
                    />
                    <span className="text-sm">{facility}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-base p-6">
            <h2 className="font-display text-lg font-semibold text-brand-brown mb-5">
              房间信息
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-brand-brown/5">
                <span className="text-brand-taupe">房间类型</span>
                <span className="text-gray-800 font-medium">
                  {RoomTypeLabels[room.type]}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-brand-brown/5">
                <span className="text-brand-taupe">床型</span>
                <span className="text-gray-800 font-medium">
                  {BedTypeLabels[room.bedType]}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-brand-brown/5">
                <span className="text-brand-taupe flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  容纳人数
                </span>
                <span className="text-gray-800 font-medium">{room.capacity} 人</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-brand-brown/5">
                <span className="text-brand-taupe flex items-center gap-1.5">
                  <BedDouble className="w-4 h-4" />
                  房间状态
                </span>
                {getStatusBadge(room.status)}
              </div>
              <div className="flex items-center justify-between py-3 mt-2">
                <span className="text-brand-taupe flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  每晚价格
                </span>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-brand-orange font-display text-2xl font-bold">
                    ¥{room.price}
                  </span>
                  <span className="text-brand-taupe text-sm">/晚</span>
                </div>
              </div>
            </div>
          </div>

          {activeBookings.length > 0 && (
            <div className="card-base p-6">
              <h2 className="font-display text-lg font-semibold text-brand-brown mb-4">
                当前预订 ({activeBookings.length})
              </h2>
              <div className="space-y-3">
                {activeBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-3 bg-brand-beige/50 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-800">
                        {booking.guestName}
                      </span>
                      <Badge
                        variant={
                          booking.status === 'checked-in' ? 'green' : 'info'
                        }
                      >
                        {booking.status === 'checked-in' ? '已入住' : '已确认'}
                      </Badge>
                    </div>
                    <div className="text-sm text-brand-taupe">
                      {booking.checkIn} ~ {booking.checkOut}
                    </div>
                    <div className="text-sm text-brand-orange mt-1">
                      ¥{booking.totalPrice}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <RoomForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        room={room}
      />

      <RoomRulesModal
        open={rulesModalOpen}
        onClose={() => setRulesModalOpen(false)}
        room={room}
      />
    </div>
  );
}
