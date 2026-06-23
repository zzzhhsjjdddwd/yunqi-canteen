import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Image,
  ChevronDown,
  UtensilsCrossed,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/Dialog';
import { AdminProductsPageSkeleton, EmptyState } from '../components/Loading';
import {
  getProducts,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../lib/api';
import { formatPrice } from '../lib/utils';
import type { Product, Category } from '../../../shared/types';

export default function ProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prods);
      setCategories(cats);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!search) return true;
    const lower = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(lower) ||
      p.category?.name.toLowerCase().includes(lower) ||
      p.description?.toLowerCase().includes(lower)
    );
  });

  const handleSaveProduct = async (data: any) => {
    setSaving(true);
    try {
      if (editingProduct) {
        const updated = await updateProduct(editingProduct.id, data);
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await createProduct(data);
        setProducts((prev) => [...prev, { ...created, category: categories.find((c) => c.id === created.categoryId) }]);
      }
      setShowProductModal(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('确定要删除这个商品吗？')) return;
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('删除失败，请重试');
    }
  };

  const handleSaveCategory = async (data: { name: string; sortOrder?: number }) => {
    setSaving(true);
    try {
      if (editingCategory) {
        const updated = await updateCategory(editingCategory.id, data);
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await createCategory(data);
        setCategories((prev) => [...prev, created]);
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
    } catch (error) {
      console.error('Failed to save category:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('确定要删除这个分类吗？')) return;
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (error: any) {
      alert(error?.message || '删除失败，请重试');
    }
  };

  if (loading) {
    return <AdminProductsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 stagger-fade-in" style={{ animationDelay: '0ms' }}>
        <button onClick={() => navigate('/')} className="glass-card p-2 active:scale-95 transition-transform">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold gradient-text">商品管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理 {products.length} 个商品 · {categories.length} 个分类
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 stagger-fade-in" style={{ animationDelay: '60ms' }}>
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索商品..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={() => {
            setEditingCategory(null);
            setShowCategoryModal(true);
          }}
          variant="outline"
          className="rounded-full active:scale-95 transition-transform"
        >
          <ChevronDown className="h-4 w-4 mr-1" />
          管理分类
        </Button>
        <Button
          onClick={() => {
            setEditingProduct(null);
            setShowProductModal(true);
          }}
          className="rounded-full active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4 mr-1" />
          添加商品
        </Button>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="stagger-fade-in" style={{ animationDelay: '120ms' }}>
          <EmptyState
            icon={UtensilsCrossed}
            title={search ? '没有匹配的商品' : '还没有菜品'}
            description={search ? '试试其他关键词' : '添加第一个菜品开启菜单'}
            action={
              !search ? (
                <Button
                  onClick={() => {
                    setEditingProduct(null);
                    setShowProductModal(true);
                  }}
                  className="glass-button active:scale-95 transition-transform"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加第一个菜品
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product, i) => (
            <div
              key={product.id}
              className="glass-card overflow-hidden group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 stagger-fade-in"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="aspect-square bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center relative">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Image className="h-12 w-12 text-muted-foreground opacity-50" />
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingProduct(product);
                      setShowProductModal(true);
                    }}
                    className="glass-card p-1.5 hover:bg-primary/20 active:scale-95 transition-transform"
                  >
                    <Pencil className="h-3 w-3 text-primary" />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="glass-card p-1.5 hover:bg-destructive/20 active:scale-95 transition-transform"
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                </div>
                {product.status === 'inactive' && (
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs">
                    已下架
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="font-medium truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.category?.name || '未分类'}</p>
                <p className="text-lg font-bold gradient-text mt-1">{formatPrice(product.price)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Modal */}
      <Dialog open={showProductModal} onOpenChange={(open) => { setShowProductModal(open); if (!open) setEditingProduct(null); }}>
        <DialogContent className="rounded-2xl border-white/50 bg-white/90 backdrop-blur-xl max-w-md pop-in">
          <DialogHeader>
            <DialogTitle className="gradient-text">
              {editingProduct ? '编辑商品' : '添加商品'}
            </DialogTitle>
          </DialogHeader>
          <ProductForm
            product={editingProduct}
            categories={categories}
            onSave={handleSaveProduct}
            onCancel={() => { setShowProductModal(false); setEditingProduct(null); }}
            saving={saving}
          />
        </DialogContent>
      </Dialog>

      {/* Category Modal */}
      <Dialog open={showCategoryModal} onOpenChange={(open) => { setShowCategoryModal(open); if (!open) setEditingCategory(null); }}>
        <DialogContent className="rounded-2xl border-white/50 bg-white/90 backdrop-blur-xl max-w-sm pop-in">
          <DialogHeader>
            <DialogTitle className="gradient-text">管理分类</DialogTitle>
          </DialogHeader>
          <CategoryManager
            categories={categories}
            editingCategory={editingCategory}
            onSave={handleSaveCategory}
            onEdit={setEditingCategory}
            onDelete={handleDeleteCategory}
            saving={saving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductForm({
  product,
  categories,
  onSave,
  onCancel,
  saving,
}: {
  product: Product | null;
  categories: Category[];
  onSave: (data: any) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name: product?.name || '',
    categoryId: product?.categoryId || categories[0]?.id || '',
    price: product?.price?.toString() || '',
    description: product?.description || '',
    image: product?.image || '',
    status: product?.status || 'active',
    sortOrder: product?.sortOrder?.toString() || '0',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      price: Number(form.price),
      sortOrder: Number(form.sortOrder) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div>
        <label className="text-sm font-medium mb-1 block">商品名称</label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="例如：招牌奶茶"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">分类</label>
        <select
          value={form.categoryId}
          onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
          className="w-full rounded-xl border border-white/30 bg-white/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          required
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">价格 (元)</label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={form.price}
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          placeholder="18.00"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">图片 URL</label>
        <Input
          value={form.image}
          onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
          placeholder="https://..."
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">描述</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="商品描述..."
          rows={2}
          className="w-full rounded-xl border border-white/30 bg-white/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />
      </div>
      <div className="flex gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.status === 'active'}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.checked ? 'active' : 'inactive' }))}
          />
          上架销售
        </label>
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-full active:scale-95 transition-transform">
          取消
        </Button>
        <Button type="submit" disabled={saving} className="flex-1 rounded-full active:scale-95 transition-transform">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : '保存'}
        </Button>
      </div>
    </form>
  );
}

function CategoryManager({
  categories,
  editingCategory,
  onSave,
  onEdit,
  onDelete,
  saving,
}: {
  categories: Category[];
  editingCategory: Category | null;
  onSave: (data: { name: string; sortOrder?: number }) => void;
  onEdit: (c: Category | null) => void;
  onDelete: (id: string) => void;
  saving: boolean;
}) {
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('0');

  useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name);
      setSortOrder(editingCategory.sortOrder?.toString() || '0');
    } else {
      setName('');
      setSortOrder('0');
    }
  }, [editingCategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, sortOrder: Number(sortOrder) || 0 });
    setName('');
    setSortOrder('0');
    onEdit(null);
  };

  return (
    <div className="space-y-4 mt-2">
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center justify-between p-2 rounded-lg bg-white/50"
          >
            <div>
              <p className="font-medium text-sm">{cat.name}</p>
              <p className="text-xs text-muted-foreground">排序: {cat.sortOrder}</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => onEdit(cat)}
                className="p-1.5 rounded-lg hover:bg-primary/10 active:scale-95 transition-transform"
              >
                <Pencil className="h-3 w-3 text-primary" />
              </button>
              <button
                onClick={() => onDelete(cat.id)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 active:scale-95 transition-transform"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">暂无分类</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t border-white/30">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="分类名称"
          required
        />
        <Input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          placeholder="排序值"
        />
        <div className="flex gap-2">
          {editingCategory && (
            <Button
              type="button"
              variant="outline"
              onClick={() => { onEdit(null); setName(''); setSortOrder('0'); }}
              className="rounded-full text-xs active:scale-95 transition-transform"
            >
              取消
            </Button>
          )}
          <Button type="submit" disabled={saving} className="flex-1 rounded-full text-xs active:scale-95 transition-transform">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : editingCategory ? '更新分类' : '添加分类'}
          </Button>
        </div>
      </form>
    </div>
  );
}
