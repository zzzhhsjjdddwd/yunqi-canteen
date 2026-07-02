import { useEffect, useState, useMemo } from 'react';
import { financeAPI, formatPrice, formatPriceShort } from '../api/finance';
import { useToast } from '../components/ui/Toast';

const FinanceReportPage = () => {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [categoryReport, setCategoryReport] = useState<any>({ total: 0, list: [] });
  const [granularity, setGranularity] = useState('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [categoryType, setCategoryType] = useState<'income' | 'expense'>('income');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    loadReport();
  }, [granularity, selectedYear, startDate, endDate]);

  useEffect(() => {
    loadCategoryReport();
  }, [categoryType, startDate, endDate, selectedYear, granularity]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (granularity === 'monthly' || granularity === 'quarterly' || granularity === 'yearly') {
        params.year = selectedYear;
      }
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const data = await financeAPI.getReport(granularity, params);
      setReport(data);
    } catch (error) {
      console.error('Load report error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryReport = async () => {
    try {
      const params: any = { type: categoryType };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (!startDate && !endDate && (granularity === 'monthly' || granularity === 'quarterly')) {
        params.startDate = `${selectedYear}-01-01`;
        params.endDate = `${selectedYear}-12-31`;
      }
      const data = await financeAPI.getCategoryReport(params);
      setCategoryReport(data || { total: 0, list: [] });
    } catch (error) {
      console.error('Load category report error:', error);
    }
  };

  const handleExport = async () => {
    try {
      const params: any = {};
      if (granularity === 'monthly' || granularity === 'quarterly' || granularity === 'yearly') {
        params.year = selectedYear;
      }
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      await financeAPI.exportReport(granularity, params);
    } catch (e: any) {
      showToast(e.message || '导出失败');
    }
  };

  const maxValue = useMemo(() => {
    if (!report?.periods) return 100;
    return Math.max(...report.periods.map((p: any) => Math.max(p.income, p.expense)), 100);
  }, [report]);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 2, current - 1, current, current + 1];
  }, []);

  const granularityOptions = [
    { value: 'daily', label: '日报' },
    { value: 'weekly', label: '周报' },
    { value: 'monthly', label: '月报' },
    { value: 'quarterly', label: '季报' },
    { value: 'yearly', label: '年报' },
  ];

  const showYearSelect = ['monthly', 'quarterly', 'yearly'].includes(granularity);

  const getPeriodLabel = (period: string) => {
    if (granularity === 'daily') return period.slice(5);
    if (granularity === 'weekly') return period.slice(5);
    if (granularity === 'monthly') return `${parseInt(period.split('-')[1])}月`;
    if (granularity === 'quarterly') return period.split('-')[1];
    return period;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-white/20 rounded-lg mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-white/20 rounded-2xl" />
            ))}
          </div>
          <div className="h-96 bg-white/20 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text-gold">财务报表</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {granularity === 'daily' && '近30天经营数据'}
            {granularity === 'weekly' && '近12周经营数据'}
            {granularity === 'monthly' && `${selectedYear}年度经营数据`}
            {granularity === 'quarterly' && `${selectedYear}年季度数据`}
            {granularity === 'yearly' && '近5年经营数据'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExport}
            className="px-4 py-2 rounded-xl border border-white/50 bg-white/60 text-sm flex items-center gap-2 hover:bg-white/80 transition-colors active:scale-95"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            导出报表
          </button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/40">
            {granularityOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setGranularity(opt.value)}
                className={`px-4 py-1.5 rounded-lg text-sm transition-all ${granularity === opt.value ? 'bg-white shadow-sm font-medium text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {showYearSelect && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 rounded-xl bg-white/60 border border-white/50 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/60 border border-white/50 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <span className="text-muted-foreground">至</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/60 border border-white/50 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                清除
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card group">
          <div className="stat-card__glow" />
          <div className="stat-card__content">
            <span className="text-sm text-muted-foreground">总营收</span>
            <div className="text-2xl font-bold text-foreground mt-2">{formatPriceShort(report?.summary?.totalIncome || 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">{report?.summary?.totalOrders || 0} 笔订单</div>
          </div>
        </div>

        <div className="stat-card group">
          <div className="stat-card__glow" style={{ background: 'linear-gradient(135deg, rgba(196,112,112,0.2), transparent)' }} />
          <div className="stat-card__content">
            <span className="text-sm text-muted-foreground">总支出</span>
            <div className="text-2xl font-bold text-error mt-2">{formatPriceShort(report?.summary?.totalExpense || 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">运营成本</div>
          </div>
        </div>

        <div className="stat-card group">
          <div className="stat-card__glow" style={{ background: 'linear-gradient(135deg, rgba(201,169,110,0.2), transparent)' }} />
          <div className="stat-card__content">
            <span className="text-sm text-muted-foreground">净利润</span>
            <div className="text-2xl font-bold gradient-text-gold mt-2">{formatPriceShort(report?.summary?.totalProfit || 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">利润率 {report?.summary?.profitRate || 0}%</div>
          </div>
        </div>

        <div className="stat-card group">
          <div className="stat-card__glow" style={{ background: 'linear-gradient(135deg, rgba(139,126,200,0.2), transparent)' }} />
          <div className="stat-card__content">
            <span className="text-sm text-muted-foreground">平均客单价</span>
            <div className="text-2xl font-bold text-foreground mt-2">{formatPrice(report?.summary?.avgOrderPrice || 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">每单平均</div>
          </div>
        </div>
      </div>

      {/* 趋势图表 */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-6">收支趋势对比</h3>
        <div className="relative" style={{ height: '360px' }}>
          <div className="absolute inset-0 flex flex-col">
            <div className="flex-1 relative">
              {/* Y轴刻度 */}
              <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-muted-foreground/60 pr-2 text-right">
                <span>{formatPriceShort(maxValue)}</span>
                <span>{formatPriceShort(maxValue * 0.75)}</span>
                <span>{formatPriceShort(maxValue * 0.5)}</span>
                <span>{formatPriceShort(maxValue * 0.25)}</span>
                <span>¥0</span>
              </div>
              {/* 柱状图 */}
              <div className="ml-16 h-full flex items-end justify-between gap-1 md:gap-2">
                {report?.periods?.map((period: any, idx: number) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="w-full flex items-end justify-center gap-0.5 h-full">
                      <div
                        className="w-1/2 bg-gradient-to-t from-success/80 to-success/50 rounded-t-sm transition-all duration-500 group-hover:from-success group-hover:to-success/70"
                        style={{ height: `${(period.income / maxValue) * 100}%` }}
                        title={`${getPeriodLabel(period.period)} 收入: ${formatPrice(period.income)}`}
                      />
                      <div
                        className="w-1/2 bg-gradient-to-t from-error/70 to-error/40 rounded-t-sm transition-all duration-500 group-hover:from-error group-hover:to-error/60"
                        style={{ height: `${(period.expense / maxValue) * 100}%` }}
                        title={`${getPeriodLabel(period.period)} 支出: ${formatPrice(period.expense)}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* X轴 */}
            <div className="ml-16 flex justify-between mt-2 text-xs text-muted-foreground/60">
              {report?.periods?.map((p: any, i: number) => (
                <span key={i} className="flex-1 text-center truncate">{getPeriodLabel(p.period)}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-6 mt-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-gradient-to-t from-success/80 to-success/50" />
            <span className="text-muted-foreground">收入</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-gradient-to-t from-error/70 to-error/40" />
            <span className="text-muted-foreground">支出</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-gradient-to-t from-accent/80 to-accent/50" />
            <span className="text-muted-foreground">利润</span>
          </div>
        </div>
      </div>

      {/* 分类分析 + 明细表格 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 分类分析 */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold">分类分析</h3>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/40">
              <button
                onClick={() => setCategoryType('income')}
                className={`px-3 py-1 rounded-md text-xs transition-all ${categoryType === 'income' ? 'bg-success/20 text-success font-medium' : 'text-muted-foreground'}`}
              >
                收入
              </button>
              <button
                onClick={() => setCategoryType('expense')}
                className={`px-3 py-1 rounded-md text-xs transition-all ${categoryType === 'expense' ? 'bg-error/20 text-error font-medium' : 'text-muted-foreground'}`}
              >
                支出
              </button>
            </div>
          </div>
          
          {categoryReport.list && categoryReport.list.length > 0 ? (
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {categoryReport.list.map((item: any, idx: number) => (
                <div key={idx}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color || '#999' }} />
                      <span className="text-foreground/80 truncate">{item.category}</span>
                    </div>
                    <span className="font-medium flex-shrink-0 ml-2">{formatPriceShort(item.amount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/40 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${item.percentage}%`, backgroundColor: item.color || '#999', opacity: 0.8 }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 text-right">{item.percentage}%</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground/60 text-sm">
              暂无{categoryType === 'income' ? '收入' : '支出'}数据
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">总计</span>
              <span className={`font-bold ${categoryType === 'income' ? 'text-success' : 'text-error'}`}>
                {formatPrice(categoryReport.total || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* 明细表格 */}
        <div className="glass-card overflow-hidden lg:col-span-2">
          <div className="p-6 border-b border-white/10">
            <h3 className="text-lg font-semibold">明细数据</h3>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full">
              <thead className="sticky top-0 bg-white/80 backdrop-blur-sm">
                <tr className="border-b border-white/10 bg-white/30">
                  <th className="text-left py-3 px-5 text-sm font-medium text-muted-foreground">期间</th>
                  <th className="text-right py-3 px-5 text-sm font-medium text-muted-foreground">营收</th>
                  <th className="text-right py-3 px-5 text-sm font-medium text-muted-foreground">支出</th>
                  <th className="text-right py-3 px-5 text-sm font-medium text-muted-foreground">净利润</th>
                  <th className="text-right py-3 px-5 text-sm font-medium text-muted-foreground">利润率</th>
                  <th className="text-right py-3 px-5 text-sm font-medium text-muted-foreground">订单数</th>
                  <th className="text-right py-3 px-5 text-sm font-medium text-muted-foreground">客单价</th>
                </tr>
              </thead>
              <tbody>
                {report?.periods?.map((period: any, idx: number) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/30 transition-colors">
                    <td className="py-3.5 px-5 text-sm font-medium">{getPeriodLabel(period.period)}</td>
                    <td className="py-3.5 px-5 text-right text-sm text-success font-medium">{formatPrice(period.income)}</td>
                    <td className="py-3.5 px-5 text-right text-sm text-error">{formatPrice(period.expense)}</td>
                    <td className={`py-3.5 px-5 text-right text-sm font-semibold ${period.profit >= 0 ? 'gradient-text-gold' : 'text-error'}`}>
                      {formatPrice(period.profit)}
                    </td>
                    <td className="py-3.5 px-5 text-right text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                        period.profitRate >= 20 ? 'bg-success/10 text-success' :
                        period.profitRate >= 10 ? 'bg-accent/10 text-accent' :
                        'bg-error/10 text-error'
                      }`}>
                        {period.profitRate}%
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right text-sm text-muted-foreground">{period.orderCount}</td>
                    <td className="py-3.5 px-5 text-right text-sm">{formatPrice(period.avgOrderPrice)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-white/80 backdrop-blur-sm">
                <tr className="bg-gradient-to-r from-primary/5 to-accent/5">
                  <td className="py-4 px-5 text-sm font-bold">合计</td>
                  <td className="py-4 px-5 text-right text-sm font-bold text-success">{formatPrice(report?.summary?.totalIncome || 0)}</td>
                  <td className="py-4 px-5 text-right text-sm font-bold text-error">{formatPrice(report?.summary?.totalExpense || 0)}</td>
                  <td className="py-4 px-5 text-right text-sm font-bold gradient-text-gold">{formatPrice(report?.summary?.totalProfit || 0)}</td>
                  <td className="py-4 px-5 text-right text-sm font-bold">{report?.summary?.profitRate || 0}%</td>
                  <td className="py-4 px-5 text-right text-sm font-bold">{report?.summary?.totalOrders || 0}</td>
                  <td className="py-4 px-5 text-right text-sm font-bold">{formatPrice(report?.summary?.avgOrderPrice || 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceReportPage;
