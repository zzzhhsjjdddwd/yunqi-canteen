import { useEffect, useState, useMemo } from 'react';
import { financeAPI, formatPrice, formatPriceShort } from '../api/finance';

const FinanceDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [incomeStats, setIncomeStats] = useState<any>({ total: 0, list: [] });
  const [expenseStats, setExpenseStats] = useState<any>({ total: 0, list: [] });
  const [trendPeriod, setTrendPeriod] = useState('30d');

  useEffect(() => {
    loadData();
  }, [trendPeriod]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ov, trend, incStats, expStats] = await Promise.all([
        financeAPI.getOverview(),
        financeAPI.getTrend({ period: trendPeriod }),
        financeAPI.getCategoryStats({ type: 'income', period: 'month' }),
        financeAPI.getCategoryStats({ type: 'expense', period: 'month' }),
      ]);
      setOverview(ov);
      setTrendData(trend);
      setIncomeStats(incStats);
      setExpenseStats(expStats);
    } catch (error) {
      console.error('Load finance data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const maxTrendValue = useMemo(() => {
    if (!trendData.length) return 100;
    return Math.max(...trendData.map(d => Math.max(d.income, d.expense)), 100);
  }, [trendData]);

  const buildSVGPath = (data: any[], key: string, height: number) => {
    if (!data.length) return '';
    const width = 100;
    const step = width / (data.length - 1 || 1);
    const points = data.map((d, i) => {
      const x = i * step;
      const y = height - (d[key] / maxTrendValue) * height * 0.85;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return `M ${points.join(' L ')}`;
  };

  const buildAreaPath = (data: any[], key: string, height: number) => {
    const linePath = buildSVGPath(data, key, height);
    if (!linePath) return '';
    return `${linePath} L 100,${height} L 0,${height} Z`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-white/20 rounded-lg mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-white/20 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-white/20 rounded-2xl" />
            <div className="h-80 bg-white/20 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text-gold">财务管理中心</h1>
          <p className="text-sm text-muted-foreground mt-1">实时监控财务数据，精准把控经营状况</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={trendPeriod}
            onChange={(e) => setTrendPeriod(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/60 border border-white/50 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="7d">近7天</option>
            <option value="30d">近30天</option>
            <option value="90d">近90天</option>
            <option value="12m">近12个月</option>
          </select>
        </div>
      </div>

      {/* 核心数据卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card group">
          <div className="stat-card__glow" />
          <div className="stat-card__content">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">账户余额</span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-lg shadow-primary/20">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <line x1="2" x2="22" y1="10" y2="10" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-foreground">{formatPriceShort(overview?.balance || 0)}</div>
              <div className="text-xs text-muted-foreground mt-1">当前可用余额</div>
            </div>
          </div>
        </div>

        <div className="stat-card group">
          <div className="stat-card__glow" style={{ background: 'linear-gradient(135deg, rgba(107,168,138,0.2), transparent)' }} />
          <div className="stat-card__content">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">今日收入</span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-success to-success-light flex items-center justify-center shadow-lg shadow-success/20">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-success">{formatPriceShort(overview?.today?.income || 0)}</div>
              <div className="text-xs text-muted-foreground mt-1">{overview?.today?.orders || 0} 笔订单</div>
            </div>
          </div>
        </div>

        <div className="stat-card group">
          <div className="stat-card__glow" style={{ background: 'linear-gradient(135deg, rgba(196,112,112,0.2), transparent)' }} />
          <div className="stat-card__content">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">今日支出</span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-error to-error-light flex items-center justify-center shadow-lg shadow-error/20">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-error">{formatPriceShort(overview?.today?.expense || 0)}</div>
              <div className="text-xs text-muted-foreground mt-1">今日开销</div>
            </div>
          </div>
        </div>

        <div className="stat-card group">
          <div className="stat-card__glow" style={{ background: 'linear-gradient(135deg, rgba(201,169,110,0.2), transparent)' }} />
          <div className="stat-card__content">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">今日利润</span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center shadow-lg shadow-accent/20">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <div className={`text-2xl font-bold ${(overview?.today?.profit || 0) >= 0 ? 'gradient-text-gold' : 'text-error'}`}>
                {formatPriceShort(overview?.today?.profit || 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">净收益</div>
            </div>
          </div>
        </div>
      </div>

      {/* 月度汇总 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <div className="text-sm text-muted-foreground mb-2">本月营收</div>
          <div className="text-3xl font-bold gradient-text-gold mb-1">{formatPrice(overview?.month?.income || 0)}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <span>共 {overview?.month?.orders || 0} 笔订单</span>
            <span className="text-muted-foreground/50">·</span>
            <span>客单价 {formatPrice(overview?.month?.avgOrderPrice || 0)}</span>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-sm text-muted-foreground mb-2">本月支出</div>
          <div className="text-3xl font-bold text-error mb-1">{formatPrice(overview?.month?.expense || 0)}</div>
          <div className="text-xs text-muted-foreground">运营成本合计</div>
        </div>
        <div className="glass-card p-5">
          <div className="text-sm text-muted-foreground mb-2">本月净利润</div>
          <div className="text-3xl font-bold text-success mb-1">{formatPrice(overview?.month?.profit || 0)}</div>
          <div className="text-xs text-muted-foreground">
            利润率 {overview?.month?.income > 0 ? ((overview.month.profit / overview.month.income) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 收支趋势图 */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold">收支趋势</h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-success/80" />
                <span className="text-muted-foreground">收入</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-error/70" />
                <span className="text-muted-foreground">支出</span>
              </div>
            </div>
          </div>
          <div className="relative" style={{ height: '220px' }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
              <defs>
                <linearGradient id="incomeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgb(107,168,138)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="rgb(107,168,138)" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgb(196,112,112)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="rgb(196,112,112)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 25, 50, 75, 100].map(y => (
                <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="rgba(0,0,0,0.04)" strokeWidth="0.3" />
              ))}
              <path d={buildAreaPath(trendData, 'income', 100)} fill="url(#incomeGrad)" />
              <path d={buildAreaPath(trendData, 'expense', 100)} fill="url(#expenseGrad)" />
              <path d={buildSVGPath(trendData, 'income', 100)} fill="none" stroke="rgb(107,168,138)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d={buildSVGPath(trendData, 'expense', 100)} fill="none" stroke="rgb(196,112,112)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-muted-foreground/60 px-1 pt-2">
              {trendData.length > 0 && (
                <>
                  <span>{trendData[0]?.date.slice(5)}</span>
                  <span>{trendData[Math.floor(trendData.length / 2)]?.date.slice(5)}</span>
                  <span>{trendData[trendData.length - 1]?.date.slice(5)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 收入分类 */}
        <div className="glass-card p-5">
          <h3 className="text-lg font-semibold mb-5">收入构成</h3>
          {incomeStats.list.length > 0 ? (
            <div className="space-y-4">
              {incomeStats.list.map((item: any, idx: number) => (
                <div key={idx}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-foreground/80">{item.category}</span>
                    </div>
                    <span className="font-medium">{formatPriceShort(item.amount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/40 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${item.percentage}%`, backgroundColor: item.color, opacity: 0.8 }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 text-right">{item.percentage}%</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground/60 text-sm">
              暂无收入数据
            </div>
          )}
        </div>
      </div>

      {/* 支出分类 + 年度数据 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="text-lg font-semibold mb-5">支出构成</h3>
          {expenseStats.list.length > 0 ? (
            <div className="space-y-4">
              {expenseStats.list.map((item: any, idx: number) => (
                <div key={idx}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-foreground/80">{item.category}</span>
                    </div>
                    <span className="font-medium">{formatPriceShort(item.amount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/40 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${item.percentage}%`, backgroundColor: item.color, opacity: 0.8 }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 text-right">{item.percentage}%</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground/60 text-sm">
              暂无支出数据
            </div>
          )}
        </div>

        <div className="glass-card p-5">
          <h3 className="text-lg font-semibold mb-5">年度概览</h3>
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-xl bg-success/5 border border-success/10">
                <div className="text-xs text-muted-foreground mb-1">年营收</div>
                <div className="text-lg font-bold text-success">{formatPriceShort(overview?.year?.income || 0)}</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-error/5 border border-error/10">
                <div className="text-xs text-muted-foreground mb-1">年支出</div>
                <div className="text-lg font-bold text-error">{formatPriceShort(overview?.year?.expense || 0)}</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-accent/5 border border-accent/10">
                <div className="text-xs text-muted-foreground mb-1">年利润</div>
                <div className="text-lg font-bold gradient-text-gold">{formatPriceShort(overview?.year?.profit || 0)}</div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">年度利润率</span>
                <span className="font-semibold gradient-text-gold">
                  {overview?.year?.income > 0 ? ((overview.year.profit / overview.year.income) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-white/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700"
                  style={{ width: `${Math.min(overview?.year?.income > 0 ? (overview.year.profit / overview.year.income) * 100 : 0, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboardPage;
