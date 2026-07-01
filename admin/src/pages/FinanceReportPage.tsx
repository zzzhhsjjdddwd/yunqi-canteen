import { useEffect, useState, useMemo } from 'react';
import { financeAPI, formatPrice, formatPriceShort } from '../api/finance';

const FinanceReportPage = () => {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadReport();
  }, [selectedYear]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await financeAPI.getMonthlyReport(selectedYear);
      setReport(data);
    } catch (error) {
      console.error('Load report error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      await financeAPI.exportMonthlyReport(selectedYear);
    } catch (e: any) {
      alert(e.message || '导出失败');
    }
  };

  const maxIncome = useMemo(() => {
    if (!report?.months) return 100;
    return Math.max(...report.months.map((m: any) => Math.max(m.income, m.expense)), 100);
  }, [report]);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 2, current - 1, current, current + 1];
  }, []);

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
          <p className="text-sm text-muted-foreground mt-1">{selectedYear}年度经营数据概览</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 rounded-xl bg-white/60 border border-white/50 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
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

      {/* 年度汇总卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card group">
          <div className="stat-card__glow" />
          <div className="stat-card__content">
            <span className="text-sm text-muted-foreground">年度总营收</span>
            <div className="text-2xl font-bold text-foreground mt-2">{formatPriceShort(report?.summary?.totalIncome || 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">{report?.summary?.totalOrders || 0} 笔订单</div>
          </div>
        </div>

        <div className="stat-card group">
          <div className="stat-card__glow" style={{ background: 'linear-gradient(135deg, rgba(196,112,112,0.2), transparent)' }} />
          <div className="stat-card__content">
            <span className="text-sm text-muted-foreground">年度总支出</span>
            <div className="text-2xl font-bold text-error mt-2">{formatPriceShort(report?.summary?.totalExpense || 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">运营成本</div>
          </div>
        </div>

        <div className="stat-card group">
          <div className="stat-card__glow" style={{ background: 'linear-gradient(135deg, rgba(201,169,110,0.2), transparent)' }} />
          <div className="stat-card__content">
            <span className="text-sm text-muted-foreground">年度净利润</span>
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

      {/* 月度对比图表 */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-6">月度收支对比</h3>
        <div className="relative" style={{ height: '360px' }}>
          <div className="absolute inset-0 flex flex-col">
            <div className="flex-1 relative">
              {/* Y轴刻度 */}
              <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-muted-foreground/60 pr-2 text-right">
                <span>{formatPriceShort(maxIncome)}</span>
                <span>{formatPriceShort(maxIncome * 0.75)}</span>
                <span>{formatPriceShort(maxIncome * 0.5)}</span>
                <span>{formatPriceShort(maxIncome * 0.25)}</span>
                <span>¥0</span>
              </div>
              {/* 柱状图 */}
              <div className="ml-16 h-full flex items-end justify-between gap-1 md:gap-2">
                {report?.months?.map((month: any, idx: number) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="w-full flex items-end justify-center gap-0.5 h-full">
                      <div
                        className="w-1/2 bg-gradient-to-t from-success/80 to-success/50 rounded-t-sm transition-all duration-500 group-hover:from-success group-hover:to-success/70"
                        style={{ height: `${(month.income / maxIncome) * 100}%` }}
                        title={`${month.month}月 收入: ${formatPrice(month.income)}`}
                      />
                      <div
                        className="w-1/2 bg-gradient-to-t from-error/70 to-error/40 rounded-t-sm transition-all duration-500 group-hover:from-error group-hover:to-error/60"
                        style={{ height: `${(month.expense / maxIncome) * 100}%` }}
                        title={`${month.month}月 支出: ${formatPrice(month.expense)}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* X轴 */}
            <div className="ml-16 flex justify-between mt-2 text-xs text-muted-foreground/60">
              {report?.months?.map((m: any, i: number) => (
                <span key={i} className="flex-1 text-center">{m.month}月</span>
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
        </div>
      </div>

      {/* 月度明细表格 */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold">月度明细</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/30">
                <th className="text-left py-3 px-5 text-sm font-medium text-muted-foreground">月份</th>
                <th className="text-right py-3 px-5 text-sm font-medium text-muted-foreground">营收</th>
                <th className="text-right py-3 px-5 text-sm font-medium text-muted-foreground">支出</th>
                <th className="text-right py-3 px-5 text-sm font-medium text-muted-foreground">净利润</th>
                <th className="text-right py-3 px-5 text-sm font-medium text-muted-foreground">利润率</th>
                <th className="text-right py-3 px-5 text-sm font-medium text-muted-foreground">订单数</th>
                <th className="text-right py-3 px-5 text-sm font-medium text-muted-foreground">客单价</th>
              </tr>
            </thead>
            <tbody>
              {report?.months?.map((month: any, idx: number) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/30 transition-colors">
                  <td className="py-3.5 px-5 text-sm font-medium">{month.month}月</td>
                  <td className="py-3.5 px-5 text-right text-sm text-success font-medium">{formatPrice(month.income)}</td>
                  <td className="py-3.5 px-5 text-right text-sm text-error">{formatPrice(month.expense)}</td>
                  <td className={`py-3.5 px-5 text-right text-sm font-semibold ${month.profit >= 0 ? 'gradient-text-gold' : 'text-error'}`}>
                    {formatPrice(month.profit)}
                  </td>
                  <td className="py-3.5 px-5 text-right text-sm">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                      month.profitRate >= 20 ? 'bg-success/10 text-success' :
                      month.profitRate >= 10 ? 'bg-accent/10 text-accent' :
                      'bg-error/10 text-error'
                    }`}>
                      {month.profitRate}%
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right text-sm text-muted-foreground">{month.orderCount}</td>
                  <td className="py-3.5 px-5 text-right text-sm">{formatPrice(month.avgOrderPrice)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
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
  );
};

export default FinanceReportPage;
