import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Check, MapPin } from 'lucide-react';
import { useAddressStore } from '../stores/addressStore';
import { getAddresses, deleteAddress, setDefaultAddress } from '../lib/api';
import type { Address } from '../../../shared/types';

export default function AddressesPage() {
  const navigate = useNavigate();
  const { addresses, setAddresses, removeAddress, updateAddress } = useAddressStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const data = await getAddresses();
      setAddresses(data);
    } catch (err) {
      console.error('Failed to load addresses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个地址吗？')) return;
    try {
      await deleteAddress(id);
      removeAddress(id);
    } catch (err) {
      console.error('Failed to delete address:', err);
      alert('删除失败');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const updated = await setDefaultAddress(id);
      updateAddress(updated);
      // Refresh all addresses to update isDefault
      loadAddresses();
    } catch (err) {
      console.error('Failed to set default address:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-purple-50/30 to-blue-50/20 pb-20">
      <header className="glass-card sticky top-0 z-10 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/profile')} className="glass-card p-2">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold gradient-text">收货地址</h1>
          </div>
          <button
            onClick={() => navigate('/addresses/new')}
            className="glass-button px-4 py-2 text-sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            新增
          </button>
        </div>
      </header>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">加载中...</div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-10">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">暂无收货地址</p>
            <button
              onClick={() => navigate('/addresses/new')}
              className="mt-4 text-primary font-medium"
            >
              添加第一个地址
            </button>
          </div>
        ) : (
          addresses.map((address: Address) => (
            <div key={address.id} className="glass-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{address.name}</span>
                    <span className="text-sm text-muted-foreground">{address.phone}</span>
                    {address.isDefault && (
                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-600 text-xs">
                        默认
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {address.province} {address.city} {address.district} {address.detail}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/20">
                {!address.isDefault && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600"
                  >
                    <Check className="h-4 w-4" />
                    设为默认
                  </button>
                )}
                <button
                  onClick={() => navigate(`/addresses/${address.id}`)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(address.id)}
                  className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 ml-auto"
                >
                  <Trash2 className="h-4 w-4" />
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
