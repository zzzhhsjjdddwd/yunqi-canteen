import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { createAddress, updateAddress, getAddresses } from '../lib/api';
import { useAddressStore } from '../stores/addressStore';
import type { Address } from '../../../shared/types';

const PROVINCES = ['北京市', '上海市', '天津市', '重庆市', '广东省', '江苏省', '浙江省', '四川省', '湖北省', '湖南省', '河南省', '河北省', '山东省', '陕西省', '福建省', '安徽省', '辽宁省', '吉林省', '黑龙江省', '内蒙古', '新疆', '宁夏', '青海省', '甘肃省', '西藏', '云南省', '贵州省', '广西省', '海南省', '江西省', '山西省', '广东省-广州市', '广东省-深圳市', '广东省-佛山市', '广东省-东莞市'];

const FIXED_REGION = {
  province: '云南省',
  city: '临沧市',
  district: '临翔区',
};

export default function AddressFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const fromCheckout = searchParams.get('from') === 'checkout';
  const { addAddress, updateAddress: updateStoreAddress, setSelectedAddress } = useAddressStore();
  const isEditing = !!id && id !== 'new';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    province: fromCheckout ? FIXED_REGION.province : '广东省',
    city: fromCheckout ? FIXED_REGION.city : '',
    district: fromCheckout ? FIXED_REGION.district : '',
    detail: '',
    isDefault: fromCheckout,
  });

  useEffect(() => {
    if (isEditing) {
      loadAddress();
    }
  }, [id]);

  const loadAddress = async () => {
    try {
      const addresses = await getAddresses();
      const address = addresses.find((a: Address) => a.id === id);
      if (address) {
        setForm({
          name: address.name,
          phone: address.phone,
          province: address.province,
          city: address.city,
          district: address.district,
          detail: address.detail,
          isDefault: address.isDefault,
        });
      }
    } catch (err) {
      console.error('Failed to load address:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.phone || !form.detail) {
      setError('请填写完整信息');
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(form.phone)) {
      setError('请输入正确的手机号');
      return;
    }

    setLoading(true);

    try {
      if (isEditing) {
        const updated = await updateAddress(id!, form);
        updateStoreAddress(updated);
      } else {
        const created = await createAddress(form);
        addAddress(created);
        if (fromCheckout) {
          setSelectedAddress(created.id);
        }
      }
      setSuccess(true);
      const targetPath = fromCheckout ? '/menu/checkout' : '/addresses';
      setTimeout(() => navigate(targetPath), 1000);
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (fromCheckout) {
      navigate('/menu/checkout');
    } else {
      navigate('/addresses');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-purple-50/30 to-blue-50/20 pb-20">
      <header className="glass-card sticky top-0 z-10 px-4 py-4">
        <div className="flex items-center gap-4">
          <button onClick={handleBack} className="glass-card p-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold gradient-text">
            {isEditing ? '编辑地址' : '新增地址'}
          </h1>
        </div>
      </header>

      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-600 text-sm animate-pulse">
              保存成功，即将返回...
            </div>
          )}

          <div className="glass-card p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">收货人</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="请输入收货人姓名"
                className="w-full px-4 py-3 rounded-xl glass-input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">手机号</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="请输入手机号"
                className="w-full px-4 py-3 rounded-xl glass-input"
                required
              />
            </div>

            {fromCheckout ? (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {FIXED_REGION.province} {FIXED_REGION.city} {FIXED_REGION.district}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    配送范围已固定，请填写下方详细地址
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">省份</label>
                  <select
                    value={form.province}
                    onChange={(e) => setForm({ ...form, province: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl glass-input"
                  >
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">城市</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="城市"
                      className="w-full px-4 py-3 rounded-xl glass-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">区县</label>
                    <input
                      type="text"
                      value={form.district}
                      onChange={(e) => setForm({ ...form, district: e.target.value })}
                      placeholder="区县"
                      className="w-full px-4 py-3 rounded-xl glass-input"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">详细地址</label>
              <textarea
                value={form.detail}
                onChange={(e) => setForm({ ...form, detail: e.target.value })}
                placeholder="街道、门牌号等详细地址"
                rows={3}
                className="w-full px-4 py-3 rounded-xl glass-input resize-none"
                required
              />
            </div>

            {!fromCheckout && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="w-5 h-5 rounded accent-primary"
                />
                <span className="text-sm">设为默认地址</span>
              </label>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-3 rounded-xl glass-button font-medium disabled:opacity-60"
          >
            {loading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              '保存地址'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
