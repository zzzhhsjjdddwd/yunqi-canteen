import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, CreditCard, MessageSquare, MapPin, Plus, AlertCircle } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { useOrderStore } from '../stores/orderStore';
import { useAuthStore } from '../stores/authStore';
import { useAddressStore } from '../stores/addressStore';
import { createOrder, getAddresses } from '../lib/api';
import { formatPrice } from '../lib/utils';
import { Button } from '../components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/Dialog';
import type { Address } from '../../../shared/types';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const items = useCartStore((state) => state.items);
  const getTotal = useCartStore((state) => state.getTotal);
  const clearCart = useCartStore((state) => state.clearCart);
  const addOrder = useOrderStore((state) => state.addOrder);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const user = useAuthStore((state) => state.user);
  const addresses = useAddressStore((state) => state.addresses);
  const setAddresses = useAddressStore((state) => state.setAddresses);
  const selectedAddressId = useAddressStore((state) => state.selectedAddressId);
  const setSelectedAddress = useAddressStore((state) => state.setSelectedAddress);
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddressTip, setShowAddressTip] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      loadAddresses();
    }
  }, [isLoggedIn]);

  const loadAddresses = async () => {
    try {
      const data = await getAddresses();
      setAddresses(data);
      // Set default address as selected
      const defaultAddr = data.find((a: Address) => a.isDefault) || data[0];
      if (defaultAddr) {
        setSelectedAddress(defaultAddr.id);
      }
    } catch (err) {
      console.error('Failed to load addresses:', err);
    }
  };

  // 获取当前选中的地址
  const selectedAddress = addresses.find((a: Address) => a.id === selectedAddressId);

  const handleCheckout = async () => {
    // 检查收货地址
    if (!selectedAddressId || !selectedAddress) {
      setShowAddressTip(true);
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        items: items.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
        })),
        total: getTotal(),
        remark: remark || undefined,
        userId: user?.id,
        addressId: selectedAddressId,
      };

      const order = await createOrder(orderData);
      addOrder(order);
      clearCart();
      // 提交订单后直接跳转到订单页
      navigate('/menu/orders');
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('创建订单失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
        <div className="glass-card flex flex-col items-center justify-center p-8 w-full max-w-sm">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted/50">
            <ShoppingBag className="h-10 w-10 text-muted-foreground opacity-60" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">购物车是空的</p>
          <p className="text-sm text-muted-foreground/70 mt-1">快去挑选美食吧</p>
          <div className="mt-6 flex gap-3 w-full">
            <Button 
              onClick={() => navigate('/menu')} 
              className="flex-1 glass-button"
            >
              去点餐
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/menu/orders')}
              className="flex-1 rounded-full bg-white/60 backdrop-blur-sm hover:bg-white/80"
            >
              我的订单
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* 头部 */}
      <header className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/menu')}
          className="glass-card flex h-11 w-11 items-center justify-center hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-bold gradient-text">确认订单</h1>
          <p className="text-sm text-muted-foreground">请核对您的订单信息</p>
        </div>
      </header>

      {/* 收货地址 */}
      {isLoggedIn && (
        <div className="glass-card mb-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/30">
            <h2 className="font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              收货地址
            </h2>
          </div>
          <div className="p-4">
            {addresses.length === 0 ? (
              <button
                onClick={() => navigate('/addresses/new?from=checkout')}
                className="flex items-center gap-2 text-primary"
              >
                <Plus className="h-4 w-4" />
                添加收货地址
              </button>
            ) : (
              <div className="space-y-2">
                {addresses.map((address: Address) => (
                  <label
                    key={address.id}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                      selectedAddressId === address.id
                        ? 'bg-primary/10 border border-primary/30'
                        : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === address.id}
                      onChange={() => setSelectedAddress(address.id)}
                      className="accent-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{address.name}</span>
                        <span className="text-sm">{address.phone}</span>
                        {address.isDefault && (
                          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-600 text-xs">默认</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {address.province} {address.city} {address.district} {address.detail}
                      </p>
                    </div>
                  </label>
                ))}
                <button
                  onClick={() => navigate('/addresses/new?from=checkout')}
                  className="flex items-center gap-2 text-primary text-sm mt-2"
                >
                  <Plus className="h-4 w-4" />
                  添加新地址
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 商品列表 */}
      <div className="glass-card mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/30">
          <h2 className="font-medium flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            商品明细
          </h2>
        </div>
        <div className="divide-y divide-white/20">
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="flex items-center gap-4 p-4">
              <img
                src={product.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}
                alt={product.name}
                className="h-16 w-16 rounded-xl object-cover shadow-md"
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100';
                }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{product.name}</h3>
                <p className="text-sm text-muted-foreground">x{quantity}</p>
              </div>
              <p className="font-semibold gradient-text">{formatPrice(product.price * quantity)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 备注 */}
      <div className="glass-card mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/30">
          <h2 className="font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            备注
          </h2>
        </div>
        <div className="p-4">
          <input
            type="text"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="有什么特殊需求吗？"
            className="glass-input w-full"
          />
        </div>
      </div>

      {/* 合计 */}
      <div className="glass-card mb-6 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/30">
          <h2 className="font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            订单金额
          </h2>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">合计</span>
            <span className="text-2xl font-bold gradient-text">{formatPrice(getTotal())}</span>
          </div>
        </div>
      </div>

      {/* 提交按钮 */}
      <button
        onClick={handleCheckout}
        disabled={loading || !selectedAddress}
        className={`w-full flex items-center justify-center gap-2 ${
          selectedAddress
            ? 'glass-button'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed rounded-full py-3 font-medium opacity-70'
        }`}
      >
        {loading ? (
          <>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            创建订单中...
          </>
        ) : (
          '提交订单'
        )}
      </button>

      {/* 收货地址提示弹窗 */}
      <Dialog open={showAddressTip} onOpenChange={setShowAddressTip}>
        <DialogContent className="sm:max-w-md rounded-2xl border-white/50 bg-white/90 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-lg font-semibold">请选择收货地址</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
              为了能将商品准确送达，请先添加或选择一个收货地址。
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowAddressTip(false)}
              className="flex-1 rounded-full bg-white/60 backdrop-blur-sm"
            >
              知道了
            </Button>
            <Button
              onClick={() => {
                setShowAddressTip(false);
                navigate('/addresses/new?from=checkout');
              }}
              className="flex-1 glass-button"
            >
              去添加
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}