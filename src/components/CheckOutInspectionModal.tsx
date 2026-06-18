import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Camera, AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react';
import Modal from './Modal';
import type { Booking, DeductionItem, Deposit } from '@/types';
import { DeductionCategoryLabels, DepositStatusLabels, DepositStatusColors } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { generateId } from '@/utils/date';

interface CheckOutInspectionModalProps {
  open: boolean;
  onClose: () => void;
  booking: Booking | null;
  onComplete?: () => void;
}

export default function CheckOutInspectionModal({
  open,
  onClose,
  booking,
  onComplete,
}: CheckOutInspectionModalProps) {
  const {
    createDeposit,
    getDepositByBookingId,
    collectDeposit,
    completeCheckOutInspection,
    refundDeposit,
    hasPermission,
    getRoomById,
  } = useAppStore();

  const canManageDeposit = hasPermission('booking:deposit');

  const [deductionItems, setDeductionItems] = useState<DeductionItem[]>([]);
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [showDeductionForm, setShowDeductionForm] = useState(false);
  const [newDeduction, setNewDeduction] = useState({
    name: '',
    description: '',
    amount: 0,
    category: 'damage' as DeductionItem['category'],
  });
  const [depositAmount, setDepositAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('微信支付');
  const [depositNotes, setDepositNotes] = useState('');
  const [showCollectForm, setShowCollectForm] = useState(false);
  const [step, setStep] = useState<'inspection' | 'refund'>('inspection');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const deposit = useMemo(() => {
    if (!booking) return null;
    return getDepositByBookingId(booking.id);
  }, [booking, getDepositByBookingId]);

  const room = useMemo(() => {
    if (!booking) return null;
    return getRoomById(booking.roomId);
  }, [booking, getRoomById]);

  const defaultDepositAmount = useMemo(() => {
    if (!room) return 0;
    return Math.min(room.price * 2, 1000);
  }, [room]);

  const totalDeduction = useMemo(() => {
    return deductionItems.reduce((sum, item) => sum + item.amount, 0);
  }, [deductionItems]);

  const refundAmount = useMemo(() => {
    if (!deposit) return 0;
    return deposit.collectedAmount - totalDeduction - deposit.refundedAmount;
  }, [deposit, totalDeduction]);

  useEffect(() => {
    if (open && booking) {
      setDeductionItems([]);
      setInspectionNotes('');
      setShowDeductionForm(false);
      setNewDeduction({
        name: '',
        description: '',
        amount: 0,
        category: 'damage',
      });
      setDepositAmount(defaultDepositAmount);
      setPaymentMethod('微信支付');
      setDepositNotes('');
      setShowCollectForm(false);
      setErrors({});

      const existingDeposit = getDepositByBookingId(booking.id);
      if (existingDeposit && existingDeposit.checkOutInspection?.completed) {
        setDeductionItems(existingDeposit.checkOutInspection.deductionItems || []);
        setInspectionNotes(existingDeposit.checkOutInspection.notes || '');
        setStep('refund');
      } else if (existingDeposit && existingDeposit.collectedAmount > 0) {
        setStep('inspection');
      } else {
        setStep('inspection');
        setShowCollectForm(true);
      }
    }
  }, [open, booking, defaultDepositAmount, getDepositByBookingId]);

  const handleAddDeduction = () => {
    const newErrors: Record<string, string> = {};
    if (!newDeduction.name.trim()) {
      newErrors.name = '请输入扣款项目名称';
    }
    if (newDeduction.amount <= 0) {
      newErrors.amount = '请输入有效的扣款金额';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const item: DeductionItem = {
      id: generateId(),
      name: newDeduction.name.trim(),
      description: newDeduction.description.trim(),
      amount: newDeduction.amount,
      category: newDeduction.category,
    };

    setDeductionItems([...deductionItems, item]);
    setNewDeduction({
      name: '',
      description: '',
      amount: 0,
      category: 'damage',
    });
    setShowDeductionForm(false);
    setErrors({});
  };

  const handleRemoveDeduction = (id: string) => {
    setDeductionItems(deductionItems.filter((item) => item.id !== id));
  };

  const handleCreateDeposit = () => {
    if (!booking || !canManageDeposit) return;

    const existingDeposit = getDepositByBookingId(booking.id);
    if (existingDeposit) {
      setShowCollectForm(true);
      return;
    }

    const newDeposit = createDeposit({
      bookingId: booking.id,
      totalAmount: depositAmount,
    });

    if (newDeposit) {
      setShowCollectForm(true);
    }
  };

  const handleCollectDeposit = () => {
    if (!deposit || !canManageDeposit) return;

    const amountToCollect = depositAmount - deposit.collectedAmount;
    if (amountToCollect <= 0) {
      setShowCollectForm(false);
      return;
    }

    const success = collectDeposit(
      deposit.id,
      amountToCollect,
      paymentMethod,
      depositNotes
    );

    if (success) {
      setShowCollectForm(false);
      setDepositNotes('');
    }
  };

  const handleCompleteInspection = () => {
    if (!deposit || !canManageDeposit || !booking) return;

    const success = completeCheckOutInspection(deposit.id, {
      notes: inspectionNotes,
      deductionItems,
    });

    if (success) {
      setStep('refund');
    }
  };

  const handleRefundDeposit = () => {
    if (!deposit || !canManageDeposit || refundAmount < 0) return;

    const success = refundDeposit(
      deposit.id,
      Math.max(0, refundAmount),
      paymentMethod,
      depositNotes,
      deductionItems.length > 0 ? deductionItems : undefined
    );

    if (success) {
      onComplete?.();
      onClose();
    }
  };

  const handleBackToInspection = () => {
    setStep('inspection');
  };

  if (!booking || !room) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="退房核验 & 押金退还"
      size="lg"
    >
      <div className="space-y-5">
        <div className="p-4 bg-brand-beige/40 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-brand-taupe">客人：</span>
              <span className="font-medium text-brand-brown">{booking.guestName}</span>
            </div>
            <div>
              <span className="text-brand-taupe">房间：</span>
              <span className="font-medium text-brand-brown">{room.roomNumber} {room.name}</span>
            </div>
            <div>
              <span className="text-brand-taupe">入住日期：</span>
              <span className="font-medium text-brand-brown">{booking.checkIn} ~ {booking.checkOut}</span>
            </div>
            <div>
              <span className="text-brand-taupe">房费总计：</span>
              <span className="font-medium text-brand-brown">¥{booking.totalPrice}</span>
            </div>
          </div>
        </div>

        {deposit && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-brand-brown">押金信息</span>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${DepositStatusColors[deposit.status]}`}>
                {DepositStatusLabels[deposit.status]}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-brand-taupe mb-1">押金总额</div>
                <div className="font-display font-bold text-lg text-brand-brown">¥{deposit.totalAmount}</div>
              </div>
              <div>
                <div className="text-brand-taupe mb-1">已收取</div>
                <div className="font-display font-bold text-lg text-green-600">¥{deposit.collectedAmount}</div>
              </div>
              <div>
                <div className="text-brand-taupe mb-1">已退还</div>
                <div className="font-display font-bold text-lg text-blue-600">¥{deposit.refundedAmount}</div>
              </div>
              <div>
                <div className="text-brand-taupe mb-1">已扣款</div>
                <div className="font-display font-bold text-lg text-red-600">¥{deposit.deductedAmount}</div>
              </div>
            </div>
          </div>
        )}

        {showCollectForm && !deposit?.collectedAmount && (
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-amber-800 mb-1">尚未收取押金</div>
                <div className="text-sm text-amber-700">
                  请先收取客人押金，再进行退房核验。
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label-base">押金金额</label>
                <input
                  type="number"
                  className="input-base"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  min={0}
                />
              </div>
              <div>
                <label className="label-base">支付方式</label>
                <select
                  className="input-base"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="微信支付">微信支付</option>
                  <option value="支付宝">支付宝</option>
                  <option value="现金">现金</option>
                  <option value="银行卡">银行卡</option>
                  <option value="其他">其他</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label-base">备注</label>
              <textarea
                className="input-base resize-none"
                rows={2}
                value={depositNotes}
                onChange={(e) => setDepositNotes(e.target.value)}
                placeholder="可选..."
              />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreateDeposit}
                className="btn-primary"
                disabled={!canManageDeposit || depositAmount <= 0}
              >
                {deposit ? '确认收取押金' : '创建并收取押金'}
              </button>
            </div>
          </div>
        )}

        {showCollectForm && deposit?.collectedAmount && deposit.collectedAmount < deposit.totalAmount && (
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-amber-800 mb-1">押金未收齐</div>
                <div className="text-sm text-amber-700">
                  已收取 ¥{deposit.collectedAmount}，还需收取 ¥{deposit.totalAmount - deposit.collectedAmount}。
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label-base">本次收取金额</label>
                <input
                  type="number"
                  className="input-base"
                  value={depositAmount - deposit.collectedAmount}
                  onChange={(e) => setDepositAmount(deposit.collectedAmount + Number(e.target.value))}
                  min={0}
                  max={deposit.totalAmount - deposit.collectedAmount}
                />
              </div>
              <div>
                <label className="label-base">支付方式</label>
                <select
                  className="input-base"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="微信支付">微信支付</option>
                  <option value="支付宝">支付宝</option>
                  <option value="现金">现金</option>
                  <option value="银行卡">银行卡</option>
                  <option value="其他">其他</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label-base">备注</label>
              <textarea
                className="input-base resize-none"
                rows={2}
                value={depositNotes}
                onChange={(e) => setDepositNotes(e.target.value)}
                placeholder="可选..."
              />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowCollectForm(false)}
                className="btn-secondary"
              >
                跳过
              </button>
              <button
                type="button"
                onClick={handleCollectDeposit}
                className="btn-primary"
                disabled={!canManageDeposit || depositAmount <= deposit.collectedAmount}
              >
                确认收取
              </button>
            </div>
          </div>
        )}

        {!showCollectForm && step === 'inspection' && (
          <>
            <div className="border-t border-brand-brown/10 pt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-brand-taupe" />
                  <span className="font-medium text-brand-brown">退房核验</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeductionForm(!showDeductionForm)}
                  className="btn-primary !py-1.5 !px-3 text-sm"
                  disabled={!canManageDeposit}
                >
                  <Plus className="w-4 h-4" />
                  添加扣款
                </button>
              </div>

              {showDeductionForm && (
                <div className="p-4 bg-brand-beige/40 rounded-lg mb-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-brand-brown">新增扣款项目</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeductionForm(false);
                        setErrors({});
                      }}
                      className="p-1 text-brand-taupe hover:text-brand-brown"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label-base">项目名称 *</label>
                      <input
                        type="text"
                        className={`input-base ${errors.name ? 'border-red-400' : ''}`}
                        value={newDeduction.name}
                        onChange={(e) => setNewDeduction({ ...newDeduction, name: e.target.value })}
                        placeholder="如：毛巾损坏"
                      />
                      {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>
                    <div>
                      <label className="label-base">扣款类型</label>
                      <select
                        className="input-base"
                        value={newDeduction.category}
                        onChange={(e) => setNewDeduction({ ...newDeduction, category: e.target.value as DeductionItem['category'] })}
                      >
                        {Object.entries(DeductionCategoryLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label-base">扣款金额 (元) *</label>
                      <input
                        type="number"
                        className={`input-base ${errors.amount ? 'border-red-400' : ''}`}
                        value={newDeduction.amount || ''}
                        onChange={(e) => setNewDeduction({ ...newDeduction, amount: Number(e.target.value) })}
                        min={0}
                        step={0.01}
                        placeholder="0.00"
                      />
                      {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
                    </div>
                    <div>
                      <label className="label-base">详细描述</label>
                      <input
                        type="text"
                        className="input-base"
                        value={newDeduction.description}
                        onChange={(e) => setNewDeduction({ ...newDeduction, description: e.target.value })}
                        placeholder="可选"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeductionForm(false);
                        setErrors({});
                      }}
                      className="btn-secondary"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleAddDeduction}
                      className="btn-primary"
                    >
                      添加
                    </button>
                  </div>
                </div>
              )}

              {deductionItems.length > 0 ? (
                <div className="space-y-2">
                  {deductionItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-brand-brown">{item.name}</span>
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded">
                            {DeductionCategoryLabels[item.category]}
                          </span>
                        </div>
                        {item.description && (
                          <div className="text-sm text-brand-taupe mt-1">{item.description}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-display font-bold text-red-600">¥{item.amount}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDeduction(item.id)}
                          className="p-1.5 text-brand-taupe hover:bg-red-100 hover:text-red-500 rounded transition-colors"
                          disabled={!canManageDeposit}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-end p-3 bg-red-50/50 rounded-lg">
                    <span className="text-brand-taupe mr-4">扣款合计：</span>
                    <span className="font-display font-bold text-xl text-red-600">¥{totalDeduction}</span>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-brand-taupe bg-brand-beige/20 rounded-lg">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-green-400 mb-2" />
                  <p>房间设施完好，暂无扣款项目</p>
                </div>
              )}
            </div>

            <div>
              <label className="label-base">核验备注</label>
              <textarea
                className="input-base resize-none"
                rows={3}
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                placeholder="记录房间核验情况、物品清点等..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-brand-brown/10">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCompleteInspection}
                className="btn-primary"
                disabled={!canManageDeposit || !deposit}
              >
                完成核验，进入退款
              </button>
            </div>
          </>
        )}

        {step === 'refund' && deposit && (
          <>
            <div className="border-t border-brand-brown/10 pt-4">
              <div className="p-4 bg-green-50 rounded-lg mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">退房核验已完成</span>
                </div>
                {deposit.checkOutInspection?.notes && (
                  <div className="text-sm text-green-700 mb-2">
                    核验备注：{deposit.checkOutInspection.notes}
                  </div>
                )}
                {deposit.checkOutInspection?.deductionItems && deposit.checkOutInspection.deductionItems.length > 0 && (
                  <div className="space-y-1">
                    {deposit.checkOutInspection.deductionItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-green-700">{item.name}</span>
                        <span className="font-medium text-red-600">-¥{item.amount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-brand-beige/40 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-brand-taupe">已收取押金</span>
                  <span className="font-medium text-brand-brown">¥{deposit.collectedAmount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-brand-taupe">扣款合计</span>
                  <span className="font-medium text-red-600">-¥{totalDeduction}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-brand-taupe">已退还</span>
                  <span className="font-medium text-blue-600">-¥{deposit.refundedAmount}</span>
                </div>
                <div className="border-t border-brand-brown/10 pt-3 flex items-center justify-between">
                  <span className="font-medium text-brand-brown">应退还金额</span>
                  <span className={`font-display font-bold text-2xl ${refundAmount > 0 ? 'text-green-600' : 'text-brand-brown'}`}>
                    ¥{Math.max(0, refundAmount)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="label-base">退款方式</label>
                  <select
                    className="input-base"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="微信支付">微信支付</option>
                    <option value="支付宝">支付宝</option>
                    <option value="现金">现金</option>
                    <option value="银行卡">银行卡</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div>
                  <label className="label-base">退款金额</label>
                  <input
                    type="number"
                    className="input-base"
                    value={Math.max(0, refundAmount)}
                    onChange={(e) => {
                      const newRefund = Number(e.target.value);
                      const newTotalDeduction = deposit.collectedAmount - newRefund - deposit.refundedAmount;
                      if (newTotalDeduction >= 0) {
                        setDeductionItems(
                          deductionItems.length > 0 && newTotalDeduction === totalDeduction
                            ? deductionItems
                            : newTotalDeduction > 0
                            ? [...deductionItems.slice(0, 0), {
                                id: generateId(),
                                name: '其他扣款',
                                description: '退房结算调整',
                                amount: newTotalDeduction,
                                category: 'other',
                              }]
                            : []
                        );
                      }
                    }}
                    min={0}
                    max={deposit.collectedAmount - deposit.refundedAmount}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="label-base">退款备注</label>
                <textarea
                  className="input-base resize-none"
                  rows={2}
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  placeholder="可选..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-brand-brown/10">
              <button
                type="button"
                onClick={handleBackToInspection}
                className="btn-secondary"
              >
                返回修改
              </button>
              <button
                type="button"
                onClick={handleRefundDeposit}
                className="btn-primary !bg-green-600 !hover:bg-green-700"
                disabled={!canManageDeposit || refundAmount < 0}
              >
                <DollarSign className="w-4 h-4" />
                {refundAmount > 0 ? `确认退还 ¥${Math.max(0, refundAmount)}` : '完成押金结算'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
