import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { TrendingUp, AlertTriangle, DollarSign, Package, Users, BarChart2 } from 'lucide-react';
import { MOCK_DASHBOARD_DATA } from '../constants';

const Dashboard: React.FC = () => {
  const data = MOCK_DASHBOARD_DATA;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumSignificantDigits: 3
    }).format(val);
  };

  return (
    <div className="p-4 pb-24 space-y-6 bg-gray-50 min-h-screen">
      <header>
        <h1 className="text-2xl font-bold text-gray-800">My Business</h1>
        <p className="text-gray-500 text-sm">Today's Overview</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 text-green-600 mb-2">
            <TrendingUp size={18} />
            <span className="text-xs font-semibold uppercase">Sales</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(data.dailySales)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 text-red-500 mb-2">
            <DollarSign size={18} />
            <span className="text-xs font-semibold uppercase">Expenses</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(data.dailyExpenses)}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-500">Net Position</span>
            <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Good</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.netIncome)}</p>
      </div>

      {/* Alerts & Insights */}
      {data.alerts.length > 0 && (
        <div className="space-y-3">
           <div className="flex items-center space-x-2">
             <AlertTriangle className="text-amber-500" size={18} />
             <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">DARTA Insights</h2>
           </div>
           {data.alerts.map((alert, idx) => {
             const isAlert = alert.includes('Alert');
             return (
               <div key={idx} className={`${isAlert ? 'bg-red-50 border-red-400' : 'bg-blue-50 border-blue-400'} border-l-4 p-4 rounded-r-lg shadow-sm`}>
                 <p className={`text-sm ${isAlert ? 'text-red-900' : 'text-blue-900'} leading-relaxed font-medium`}>{alert}</p>
               </div>
             );
           })}
        </div>
      )}

      {/* Sector Benchmarking (New Feature) */}
      {data.benchmarks && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 mb-4">
             <BarChart2 size={18} className="text-purple-600"/>
             <h3 className="text-lg font-bold text-gray-800">Sector Benchmarks</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Gross Margin (You vs Sector)</span>
                <span className="font-bold text-purple-600">Lower than Avg</span>
              </div>
              <div className="flex items-center space-x-2">
                 <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div className="bg-blue-500 h-4 rounded-full" style={{width: `${data.benchmarks.grossMargin.you * 2}%`}}></div>
                 </div>
                 <span className="text-xs font-bold text-blue-600">{data.benchmarks.grossMargin.you}%</span>
              </div>
              <div className="flex items-center space-x-2 mt-1 opacity-60">
                 <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="bg-purple-500 h-3 rounded-full" style={{width: `${data.benchmarks.grossMargin.sector * 2}%`}}></div>
                 </div>
                 <span className="text-xs font-bold text-purple-600">{data.benchmarks.grossMargin.sector}% (Avg)</span>
              </div>
            </div>
            
            <div className="p-3 bg-purple-50 rounded-lg text-xs text-purple-900 leading-snug">
               <strong>DARTA Tip:</strong> Increasing prices on "Soap Bar" by 200 UGX would align your margin with the sector average.
            </div>
          </div>
        </div>
      )}

      {/* Sales Chart */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Weekly Trends</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.salesTrend}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB"/>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 12, fill: '#6B7280'}} 
                dy={10}
              />
              <YAxis hide />
              <Tooltip 
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
              />
              <Area 
                type="monotone" 
                dataKey="sales" 
                stroke="#10B981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorSales)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Fast Moving Items</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={data.topProducts}>
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={100} 
                axisLine={false} 
                tickLine={false}
                tick={{fontSize: 12, fill: '#374151', fontWeight: 500}}
              />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Bar dataKey="value" barSize={20} radius={[0, 4, 4, 0]}>
                {data.topProducts.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3B82F6' : '#60A5FA'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
