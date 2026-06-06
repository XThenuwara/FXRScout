import React, { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpDown, 
  RefreshCw, 
  Calendar, 
  Search, 
  Activity, 
  Check, 
  History, 
  ChevronLeft, 
  ChevronRight, 
  Info,
  Server,
  DollarSign,
  Award,
  Sun,
  Moon,
  Layers,
  Sparkles,
  Calculator,
  Download
} from 'lucide-react';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [chartRange, setChartRange] = useState('30d');
  const [activeCurrency, setActiveCurrency] = useState('USD'); // 'USD' | 'EUR' | 'GBP' | 'AUD'
  
  // Navigation & Page State
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'compare' | 'calculator'
  const [selectedBank, setSelectedBank] = useState('combank'); // 'combank' | 'sampath' | 'hnb'
  const [compareMetric, setCompareMetric] = useState('buy'); // 'buy' | 'sell'
  const [selectedCompareBanks, setSelectedCompareBanks] = useState(['combank', 'sampath', 'hnb', 'peoples', 'seylan']);
  
  // Exchange Calculator State
  const [calculatorAmount, setCalculatorAmount] = useState(1000);
  const [calculatorDirection, setCalculatorDirection] = useState('toLkr'); // 'toLkr' (I Sell FX -> get LKR) | 'fromLkr' (I Buy FX -> pay LKR)
  
  // Theme Management (Light / Dark)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('fxrscout_theme') || 'dark';
  });

  const [successToast, setSuccessToast] = useState(null);

  // Backward-compatible rates extractor for a bank
  const getBankRate = (dayItem, bankKey, currency = activeCurrency) => {
    if (!dayItem || !dayItem[bankKey]) return { buy: 0, sell: 0 };
    const bankData = dayItem[bankKey];
    if (bankData[currency]) {
      return bankData[currency];
    }
    // Backward compatibility for legacy USD entries
    if (currency === 'USD' && typeof bankData.buy === 'number') {
      return { buy: bankData.buy, sell: bankData.sell };
    }
    return { buy: 0, sell: 0 };
  };

  // Backward-compatible rates extractor for Google
  const getGoogleRate = (dayItem, currency = activeCurrency) => {
    if (!dayItem || !dayItem.google) return 0;
    const googleData = dayItem.google;
    if (googleData[currency]) {
      return googleData[currency];
    }
    // Backward compatibility for legacy USD entries
    if (currency === 'USD' && typeof googleData.rate === 'number') {
      return googleData.rate;
    }
    return 0;
  };

  // Rates extractor for Central Bank of Sri Lanka (CBSL)
  const getCbslRate = (dayItem, currency = activeCurrency) => {
    if (!dayItem || !dayItem.cbsl) return { buy: 0, sell: 0 };
    const cbslData = dayItem.cbsl;
    if (cbslData[currency]) {
      return cbslData[currency];
    }
    return { buy: 0, sell: 0 };
  };

  const itemsPerPage = 8;

  // Toggle Theme class on document element
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('fxrscout_theme', theme);
  }, [theme]);

  // Fetch multi-bank data
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.BASE_URL}data.json`);
      if (!response.ok) {
        throw new Error('Failed to load exchange rates database.');
      }
      const jsonData = await response.json();
      const sortedData = jsonData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      setData(sortedData);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not fetch exchange rates. Ensure public/data.json is formatted correctly.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const triggerToast = (message) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4500);
  };

  // Client-Side CSV Exporter for historical rates of active currency
  const exportToCSV = () => {
    if (data.length === 0) return;
    const banks = ['combank', 'sampath', 'hnb', 'peoples', 'seylan', 'union', 'amana', 'dfcc', 'nsb', 'pabc', 'ndb'];
    
    const headers = [
      'Date',
      `Google Reference (${activeCurrency})`,
      `CBSL Buy Reference (${activeCurrency})`,
      `CBSL Sell Reference (${activeCurrency})`,
      ...banks.flatMap(bk => [
        `${bankNames[bk]} Buy (${activeCurrency})`,
        `${bankNames[bk]} Sell (${activeCurrency})`
      ])
    ];

    const rows = data.map(item => {
      const dateStr = new Date(item.timestamp).toLocaleDateString('en-CA'); // YYYY-MM-DD
      const googleVal = getGoogleRate(item, activeCurrency);
      const cbslVal = getCbslRate(item, activeCurrency);
      
      const bankVals = banks.flatMap(bk => {
        const rates = getBankRate(item, bk, activeCurrency);
        return [rates.buy, rates.sell];
      });

      return [
        dateStr,
        googleVal,
        cbslVal.buy > 0 ? cbslVal.buy : '',
        cbslVal.sell > 0 ? cbslVal.sell : '',
        ...bankVals
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => (val !== undefined && val !== null ? val : '')).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fxrscout_${activeCurrency}_rates_history_${new Date().toLocaleDateString('en-CA')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast(`Exported ${activeCurrency} historical rates successfully to CSV!`);
  };

  // Client-Side JSON Exporter for entire database
  const exportToJSON = () => {
    if (data.length === 0) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const link = document.createElement('a');
    link.setAttribute('href', jsonString);
    link.setAttribute('download', `fxrscout_database_dump_${new Date().toLocaleDateString('en-CA')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Exported entire flat-file database successfully to JSON!");
  };

  // Human Readable Bank Names Mapping
  const bankNames = {
    combank: 'Commercial Bank',
    sampath: 'Sampath Bank',
    hnb: 'Hatton National Bank (HNB)',
    peoples: "People's Bank",
    seylan: 'Seylan Bank',
    union: 'Union Bank',
    amana: 'Amana Bank',
    dfcc: 'DFCC Bank',
    nsb: 'National Savings Bank (NSB)',
    pabc: 'Pan Asia Bank (PABC)',
    ndb: 'NDB Bank'
  };

  const bankColors = {
    cbsl: '#64748b',    // Slate Gray benchmark
    combank: '#10b981', // Emerald
    sampath: '#f97316', // Orange
    hnb: '#0ea5e9',     // Sky Blue
    peoples: '#84cc16', // Lime
    seylan: '#3b82f6',  // Blue
    union: '#8b5cf6',   // Purple/Violet
    amana: '#06b6d4',   // Cyan
    dfcc: '#ef4444',    // Crimson Red
    nsb: '#eab308',     // Gold Yellow
    pabc: '#14b8a6',    // Teal
    ndb: '#d946ef'      // Fuchsia Pink
  };

  const getBankColor = (bk) => bankColors[bk] || '#9ca3af';

  // Calculations for current bank metrics
  const currentMetrics = useMemo(() => {
    if (data.length === 0) return null;
    
    const latest = data[data.length - 1];
    const previous = data.length > 1 ? data[data.length - 2] : null;

    // Google benchmarks
    const googleBenchmark = getGoogleRate(latest, activeCurrency);
    const prevGoogle = previous ? getGoogleRate(previous, activeCurrency) : googleBenchmark;

    // CBSL benchmarks
    const cbslBenchmark = getCbslRate(latest, activeCurrency);
    const prevCbsl = previous ? getCbslRate(previous, activeCurrency) : cbslBenchmark;
    const cbslBuyDelta = cbslBenchmark.buy > 0 && prevCbsl.buy > 0 ? cbslBenchmark.buy - prevCbsl.buy : 0;
    const cbslSellDelta = cbslBenchmark.sell > 0 && prevCbsl.sell > 0 ? cbslBenchmark.sell - prevCbsl.sell : 0;

    // Bank specific parameters
    const bankData = getBankRate(latest, selectedBank, activeCurrency);
    const prevBankData = previous ? getBankRate(previous, selectedBank, activeCurrency) : null;

    if (!bankData || bankData.buy === 0) return null;

    const buy = bankData.buy;
    const sell = bankData.sell;
    const spread = sell - buy;
    const spreadPercentage = buy > 0 ? (spread / buy) * 100 : 0;

    // Bank deltas compared to yesterday
    let buyDelta = 0;
    let sellDelta = 0;
    if (prevBankData && prevBankData.buy > 0) {
      buyDelta = buy - prevBankData.buy;
      sellDelta = sell - prevBankData.sell;
    }

    // Benchmark comparison vs Google & CBSL
    const buyDiffVsGoogle = buy - googleBenchmark; // buy is under google, so this will be negative
    const sellDiffVsGoogle = sell - googleBenchmark; // sell is above google, so this will be positive

    const buyDiffVsCbsl = cbslBenchmark.buy > 0 ? buy - cbslBenchmark.buy : 0;
    const sellDiffVsCbsl = cbslBenchmark.sell > 0 ? sell - cbslBenchmark.sell : 0;

    return {
      timestamp: latest.timestamp,
      buy,
      sell,
      spread,
      spreadPercentage,
      buyDelta,
      sellDelta,
      googleRate: googleBenchmark,
      googleDelta: googleBenchmark - prevGoogle,
      buyDiffVsGoogle,
      sellDiffVsGoogle,
      cbslRate: cbslBenchmark,
      cbslBuyDelta,
      cbslSellDelta,
      buyDiffVsCbsl,
      sellDiffVsCbsl,
      totalEntries: data.length
    };
  }, [data, selectedBank, activeCurrency]);

  // Comparative Matrix calculations for all banks side by side
  const comparisonMatrix = useMemo(() => {
    if (data.length === 0) return [];
    
    const latest = data[data.length - 1];
    const googleBenchmark = getGoogleRate(latest, activeCurrency);

    const banks = ['combank', 'sampath', 'hnb', 'peoples', 'seylan', 'union', 'amana', 'dfcc', 'nsb', 'pabc', 'ndb'];
    const matrix = banks
      .filter(bk => selectedCompareBanks.includes(bk))
      .map(bk => {
        const bData = getBankRate(latest, bk, activeCurrency);
        if (!bData || bData.buy === 0) return null;

        const buy = bData.buy;
        const sell = bData.sell;
        const spread = sell - buy;
        const spreadPct = buy > 0 ? (spread / buy) * 100 : 0;

        // Calculate 7-day sparkline trend history
        const last7 = data.slice(-7);
        const sparklineData = last7.map(item => {
          const bRates = getBankRate(item, bk, activeCurrency);
          const rate = compareMetric === 'buy' ? bRates.buy : bRates.sell;
          return {
            timestamp: item.timestamp,
            rate: rate > 0 ? rate : null
          };
        }).filter(item => item.rate !== null);

        return {
          key: bk,
          name: bankNames[bk],
          buy,
          buyDiffVsGoogle: buy - googleBenchmark,
          sell,
          sellDiffVsGoogle: sell - googleBenchmark,
          spread,
          spreadPct,
          sparklineData
        };
      })
      .filter(Boolean);

    if (matrix.length === 0) return [];

    // Find the best indices among selected set
    let bestBuy = -Infinity;
    matrix.forEach(m => {
      if (m.buy > bestBuy) bestBuy = m.buy;
    });

    let bestSell = Infinity;
    matrix.forEach(m => {
      if (m.sell < bestSell) bestSell = m.sell;
    });

    let bestSpread = Infinity;
    matrix.forEach(m => {
      if (m.spread < bestSpread) bestSpread = m.spread;
    });

    return matrix.map(m => ({
      ...m,
      isBestBuy: m.buy === bestBuy && matrix.length > 1,
      isBestSell: m.sell === bestSell && matrix.length > 1,
      isBestSpread: m.spread === bestSpread && matrix.length > 1
    }));

  }, [data, selectedCompareBanks, activeCurrency, compareMetric]);

  // Aggregate stats across history for single bank focus
  const historicalMetrics = useMemo(() => {
    if (data.length === 0) return null;

    let minBuy = Infinity, maxBuy = -Infinity, sumBuy = 0;
    let minSell = Infinity, maxSell = -Infinity, sumSell = 0;
    let minSpread = Infinity, maxSpread = -Infinity, sumSpread = 0;
    let sumGoogle = 0;
    let validEntriesCount = 0;

    data.forEach(item => {
      const bRates = getBankRate(item, selectedBank, activeCurrency);
      const g = getGoogleRate(item, activeCurrency);
      if (!bRates || bRates.buy === 0) return;

      const b = bRates.buy;
      const s = bRates.sell;
      const sp = s - b;
      
      validEntriesCount++;

      if (b < minBuy) minBuy = b;
      if (b > maxBuy) maxBuy = b;
      sumBuy += b;

      if (s < minSell) minSell = s;
      if (s > maxSell) maxSell = s;
      sumSell += s;

      if (sp < minSpread) minSpread = sp;
      if (sp > maxSpread) maxSpread = sp;
      sumSpread += sp;

      sumGoogle += g;
    });

    if (validEntriesCount === 0) return null;

    return {
      minBuy,
      maxBuy,
      avgBuy: sumBuy / validEntriesCount,
      minSell,
      maxSell,
      avgSell: sumSell / validEntriesCount,
      minSpread,
      maxSpread,
      avgSpread: sumSpread / validEntriesCount,
      avgGoogle: sumGoogle / validEntriesCount
    };
  }, [data, selectedBank, activeCurrency]);

  // Filtered chart data based on date range selection
  const filteredChartData = useMemo(() => {
    if (data.length === 0) return [];
    if (chartRange === 'all') return data;
    const limit = chartRange === '7d' ? 7 : chartRange === '14d' ? 14 : 30;
    return data.slice(-limit);
  }, [data, chartRange]);

  // Format Chart Data for single-bank plots dynamically and compatibly
  const formattedSingleChartData = useMemo(() => {
    return filteredChartData.map(item => {
      const bRates = getBankRate(item, selectedBank, activeCurrency);
      const googleVal = getGoogleRate(item, activeCurrency);
      const cbslVal = getCbslRate(item, activeCurrency);
      return {
        timestamp: item.timestamp,
        buy: bRates && bRates.buy > 0 ? bRates.buy : null,
        sell: bRates && bRates.sell > 0 ? bRates.sell : null,
        google: googleVal > 0 ? googleVal : null,
        cbslBuy: cbslVal.buy > 0 ? cbslVal.buy : null,
        cbslSell: cbslVal.sell > 0 ? cbslVal.sell : null
      };
    });
  }, [filteredChartData, selectedBank, activeCurrency]);

  // Format Chart Data for comparative plots
  const formattedCompareChartData = useMemo(() => {
    return filteredChartData.map(item => {
      const googleVal = getGoogleRate(item, activeCurrency);
      const cbslVal = getCbslRate(item, activeCurrency);
      const cbslRateVal = compareMetric === 'buy' ? cbslVal.buy : cbslVal.sell;

      const entry = {
        timestamp: item.timestamp,
        google: googleVal > 0 ? googleVal : null,
        cbsl: cbslRateVal > 0 ? cbslRateVal : null,
      };
      Object.keys(bankNames).forEach(bk => {
        const bRates = getBankRate(item, bk, activeCurrency);
        if (bRates && bRates.buy > 0) {
          entry[bk] = compareMetric === 'buy' ? bRates.buy : bRates.sell;
        }
      });
      return entry;
    });
  }, [filteredChartData, compareMetric, activeCurrency]);

  // Filter log table list
  const filteredTableData = useMemo(() => {
    return data.filter(item => {
      const dateStr = new Date(item.timestamp).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).toLowerCase();
      const rawDate = item.timestamp.toLowerCase();
      const term = searchQuery.toLowerCase();
      return dateStr.includes(term) || rawDate.includes(term);
    }).reverse();
  }, [data, searchQuery]);

  // Paginated log entries
  const paginatedTableData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTableData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTableData, currentPage]);

  // Memoized calculations for the Exchange Calculator
  const calculatorResults = useMemo(() => {
    if (data.length === 0 || !calculatorAmount || isNaN(calculatorAmount) || calculatorAmount <= 0) return [];
    
    const latest = data[data.length - 1];
    const banks = ['combank', 'sampath', 'hnb', 'peoples', 'seylan', 'union', 'amana', 'dfcc', 'nsb', 'pabc', 'ndb'];
    
    const results = banks.map(bk => {
      const rates = getBankRate(latest, bk, activeCurrency);
      if (!rates || rates.buy === 0) return null;
      
      const rate = calculatorDirection === 'toLkr' ? rates.buy : rates.sell;
      const totalLKR = calculatorAmount * rate;
      
      return {
        key: bk,
        name: bankNames[bk],
        rate,
        totalLKR
      };
    }).filter(Boolean);

    if (results.length === 0) return [];

    // Sort: If toLkr (selling FX), higher LKR is better (descending). If fromLkr (buying FX), lower LKR is better (ascending).
    if (calculatorDirection === 'toLkr') {
      results.sort((a, b) => b.totalLKR - a.totalLKR);
    } else {
      results.sort((a, b) => a.totalLKR - b.totalLKR);
    }

    const bestVal = results[0].totalLKR;
    const worstVal = results[results.length - 1].totalLKR;
    const difference = Math.abs(bestVal - worstVal);

    return results.map((r, index) => {
      const deficit = Math.abs(r.totalLKR - bestVal);
      const relativePercent = bestVal > 0 ? (deficit / bestVal) * 100 : 0;
      
      let efficiency = 100;
      if (calculatorDirection === 'toLkr') {
        efficiency = bestVal > 0 ? (r.totalLKR / bestVal) * 100 : 0;
      } else {
        efficiency = r.totalLKR > 0 ? (bestVal / r.totalLKR) * 100 : 0;
      }

      return {
        ...r,
        rank: index + 1,
        isBest: index === 0,
        isWorst: index === results.length - 1,
        deficit,
        deficitPct: relativePercent,
        efficiency,
        maxDifference: difference
      };
    });
  }, [data, calculatorAmount, calculatorDirection, activeCurrency]);

  // Memoized calculations for the Market Signal Engine
  const marketSignal = useMemo(() => {
    if (data.length === 0) return null;

    const banks = ['combank', 'sampath', 'hnb', 'peoples', 'seylan', 'union', 'amana', 'dfcc', 'nsb', 'pabc', 'ndb'];
    const last30 = data.slice(-30);

    // Calculate optimal rate for each of the last 30 days
    const optimalRates = last30.map(dayItem => {
      let optimalVal = calculatorDirection === 'toLkr' ? -Infinity : Infinity;
      
      banks.forEach(bk => {
        const rates = getBankRate(dayItem, bk, activeCurrency);
        if (rates && rates.buy > 0) {
          const val = calculatorDirection === 'toLkr' ? rates.buy : rates.sell;
          if (calculatorDirection === 'toLkr') {
            if (val > optimalVal) optimalVal = val;
          } else {
            if (val < optimalVal) optimalVal = val;
          }
        }
      });
      
      return optimalVal;
    }).filter(val => val !== -Infinity && val !== Infinity);

    if (optimalRates.length === 0) return null;

    // Calculate the 30-day simple moving average (MA30)
    const sum = optimalRates.reduce((acc, val) => acc + val, 0);
    const ma30 = sum / optimalRates.length;

    // Get today's optimal rate
    const todayOptimal = calculatorResults.length > 0 ? calculatorResults[0].rate : null;
    if (!todayOptimal) return null;

    // Deficit/surplus percentage of today's optimal vs MA30
    const percentDiff = ((todayOptimal - ma30) / ma30) * 100;

    // Compute advice
    let signal = 'NEUTRAL';
    let label = 'HOLD';
    let colorClass = 'text-zinc-400 bg-zinc-500/15 border-zinc-500/25';
    let dotColor = 'bg-zinc-400';
    let description = '';

    const threshold = 0.05; // 0.05% buffer

    if (calculatorDirection === 'toLkr') {
      // Selling FX -> Want higher rate
      if (percentDiff > threshold) {
        signal = 'STRONG_SELL';
        label = 'STRONG SELL';
        colorClass = 'text-emerald-400 bg-emerald-500/15 border-emerald-500/25';
        dotColor = 'bg-emerald-400';
        description = `Today's rate of Rs. ${todayOptimal.toFixed(2)} is ${(percentDiff).toFixed(2)}% ABOVE the 30-day average optimal rate (Rs. ${ma30.toFixed(2)}). Highly favorable day to sell.`;
      } else if (percentDiff < -threshold) {
        signal = 'HOLD';
        label = 'HOLD / WAIT';
        colorClass = 'text-amber-400 bg-amber-500/15 border-amber-500/25';
        dotColor = 'bg-amber-400';
        description = `Today's rate of Rs. ${todayOptimal.toFixed(2)} is ${Math.abs(percentDiff).toFixed(2)}% BELOW the 30-day average optimal rate (Rs. ${ma30.toFixed(2)}). Consider holding if possible.`;
      } else {
        signal = 'NEUTRAL';
        label = 'NEUTRAL';
        colorClass = 'text-slate-400 bg-slate-500/15 border-slate-500/25';
        dotColor = 'bg-slate-400';
        description = `Today's rate of Rs. ${todayOptimal.toFixed(2)} is trading within normal range (${percentDiff.toFixed(2)}%) of the 30-day average optimal rate (Rs. ${ma30.toFixed(2)}).`;
      }
    } else {
      // Buying FX -> Want lower rate
      if (percentDiff < -threshold) {
        signal = 'STRONG_BUY';
        label = 'STRONG BUY';
        colorClass = 'text-emerald-400 bg-emerald-500/15 border-emerald-500/25';
        dotColor = 'bg-emerald-400';
        description = `Today's rate of Rs. ${todayOptimal.toFixed(2)} is ${Math.abs(percentDiff).toFixed(2)}% BELOW the 30-day average optimal rate (Rs. ${ma30.toFixed(2)}). Highly favorable day to buy (lower LKR cost).`;
      } else if (percentDiff > threshold) {
        signal = 'WAIT';
        label = 'WAIT / HOLD';
        colorClass = 'text-amber-400 bg-amber-500/15 border-amber-500/25';
        dotColor = 'bg-amber-400';
        description = `Today's rate of Rs. ${todayOptimal.toFixed(2)} is ${(percentDiff).toFixed(2)}% ABOVE the 30-day average optimal rate (Rs. ${ma30.toFixed(2)}). Rates are currently elevated; consider waiting.`;
      } else {
        signal = 'NEUTRAL';
        label = 'NEUTRAL';
        colorClass = 'text-slate-400 bg-slate-500/15 border-slate-500/25';
        dotColor = 'bg-slate-400';
        description = `Today's rate of Rs. ${todayOptimal.toFixed(2)} is trading within normal range (${percentDiff.toFixed(2)}%) of the 30-day average optimal rate (Rs. ${ma30.toFixed(2)}).`;
      }
    }

    return {
      ma30,
      todayOptimal,
      percentDiff,
      signal,
      label,
      colorClass,
      dotColor,
      description
    };
  }, [data, calculatorDirection, activeCurrency, calculatorResults]);

  const totalPages = Math.ceil(filteredTableData.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const formatLKR = (val) => `Rs. ${val.toFixed(2)}`;

  // Custom single-bank chart tooltip
  const CustomAnalyticsTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const buyVal = dataPoint.buy;
      const sellVal = dataPoint.sell;
      const googleVal = dataPoint.google;
      const cbslBuyVal = dataPoint.cbslBuy;
      const cbslSellVal = dataPoint.cbslSell;

      if (!buyVal || !sellVal) return null;
      const spreadVal = sellVal - buyVal;
      const formattedDate = new Date(dataPoint.timestamp).toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      return (
        <div className="theme-panel p-4 rounded-xl border border-border bg-card text-card-foreground shadow-premium flex flex-col gap-1.5 min-w-[210px] text-xs">
          <p className="text-muted-foreground font-semibold mb-1 border-b border-border pb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" /> {formattedDate}
          </p>
          <div className="flex justify-between items-center gap-4">
            <span className="flex items-center gap-1.5 text-buy font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-buy"></span> Buy Rate:
            </span>
            <span className="font-semibold font-mono">{formatLKR(buyVal)}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="flex items-center gap-1.5 text-sell font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-sell"></span> Sell Rate:
            </span>
            <span className="font-semibold font-mono">{formatLKR(sellVal)}</span>
          </div>
          <div className="flex justify-between items-center gap-4 border-t border-border mt-1 pt-1">
            <span className="flex items-center gap-1.5 text-google font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-google"></span> Google Rate:
            </span>
            <span className="font-semibold font-mono text-google">{formatLKR(googleVal)}</span>
          </div>
          {cbslBuyVal > 0 && (
            <div className="flex justify-between items-center gap-4 border-t border-border mt-1 pt-1">
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span> CBSL Buy Rate:
              </span>
              <span className="font-semibold font-mono text-slate-500 dark:text-slate-400">{formatLKR(cbslBuyVal)}</span>
            </div>
          )}
          {cbslSellVal > 0 && (
            <div className="flex justify-between items-center gap-4">
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span> CBSL Sell Rate:
              </span>
              <span className="font-semibold font-mono text-slate-500 dark:text-slate-400">{formatLKR(cbslSellVal)}</span>
            </div>
          )}
          <div className="flex justify-between items-center gap-4 border-t border-border mt-1 pt-1">
            <span className="flex items-center gap-1.5 text-spread font-semibold">
              <ArrowUpDown className="w-3.5 h-3.5 text-spread" /> Spread (Margin):
            </span>
            <span className="font-semibold font-mono text-spread">{formatLKR(spreadVal)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom compare bank rates tooltip
  const CustomCompareTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const formattedDate = new Date(dataPoint.timestamp).toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      return (
        <div className="theme-panel p-4 rounded-xl border border-border bg-card text-card-foreground shadow-premium flex flex-col gap-1.5 min-w-[210px] text-xs">
          <p className="text-muted-foreground font-semibold mb-1 border-b border-border pb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" /> {formattedDate}
          </p>
          {selectedCompareBanks.map(bk => {
            if (dataPoint[bk] === undefined || dataPoint[bk] === null) return null;
            return (
              <div key={bk} className="flex justify-between items-center gap-4">
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getBankColor(bk) }}></span>
                  {bk === 'cbsl' ? 'CBSL' : bk === 'combank' ? 'ComBank' : bk === 'peoples' ? "People's" : bk === 'seylan' ? 'Seylan' : bk === 'union' ? 'Union' : bk === 'amana' ? 'Amana' : bk === 'dfcc' ? 'DFCC' : bk === 'nsb' ? 'NSB' : bk === 'pabc' ? 'PABC' : bk === 'ndb' ? 'NDB' : bankNames[bk].split(' ')[0]}:
                </span>
                <span className="font-semibold font-mono text-foreground">{formatLKR(dataPoint[bk])}</span>
              </div>
            );
          })}
          <div className="flex justify-between items-center gap-4 border-t border-border mt-1 pt-1">
            <span className="flex items-center gap-1.5 text-google font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-google"></span> Google Rate:
            </span>
            <span className="font-semibold font-mono text-google">{formatLKR(dataPoint.google)}</span>
          </div>
          {dataPoint.cbsl && (
            <div className="flex justify-between items-center gap-4 border-t border-border mt-1 pt-1">
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span> CBSL Benchmark:
              </span>
              <span className="font-semibold font-mono text-slate-500 dark:text-slate-400">{formatLKR(dataPoint.cbsl)}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto select-none transition-colors duration-300" role="document">
      {/* Brand Header */}
      <header className="relative pt-6 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-20">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-card text-foreground shadow-sm" aria-hidden="true">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-sans tracking-tight text-foreground">FXRScout</h1>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
              <Server className="w-3 h-3 text-emerald-500 animate-pulse" aria-hidden="true" />
              SL BANKS REFERENCE
            </span>
          </div>
          <p className="text-muted-foreground text-xs max-w-xl">
            Compare daily exchange rates across Sri Lankan commercial banks relative to Google Interbank Reference Benchmarks.
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 self-stretch md:self-auto justify-between sm:justify-start">
          {/* Dynamic Currency Selector Dropdown */}
          <div className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-card border border-border shadow-sm">
            <label htmlFor="currency-selector" className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider">
              Currency:
            </label>
            <select
              id="currency-selector"
              value={activeCurrency}
              onChange={(e) => setActiveCurrency(e.target.value)}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
              aria-label="Active conversion currency"
            >
              <option value="USD" className="bg-card text-foreground">
                USD ($)
              </option>
              <option value="EUR" className="bg-card text-foreground">
                EUR (€)
              </option>
              <option value="GBP" className="bg-card text-foreground">
                GBP (£)
              </option>
              <option value="JPY" className="bg-card text-foreground">
                JPY (¥)
              </option>
              <option value="SGD" className="bg-card text-foreground">
                SGD (S$)
              </option>
              <option value="AUD" className="bg-card text-foreground">
                AUD (A$)
              </option>
              <option value="CHF" className="bg-card text-foreground">
                CHF (CHF)
              </option>
              <option value="KWD" className="bg-card text-foreground">
                KWD (KD)
              </option>
              <option value="OMR" className="bg-card text-foreground">
                OMR (RO)
              </option>
              <option value="SAR" className="bg-card text-foreground">
                SAR (SR)
              </option>
              <option value="AED" className="bg-card text-foreground">
                AED (DH)
              </option>
              <option value="QAR" className="bg-card text-foreground">
                QAR (QR)
              </option>
              <option value="JOD" className="bg-card text-foreground">
                JOD (JD)
              </option>
              <option value="BHD" className="bg-card text-foreground">
                BHD (BD)
              </option>
              <option value="INR" className="bg-card text-foreground">
                INR (Rs)
              </option>
              <option value="CAD" className="bg-card text-foreground">
                CAD (C$)
              </option>
              <option value="NZD" className="bg-card text-foreground">
                NZD (NZ$)
              </option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              title={theme === 'dark' ? 'Toggle Light Mode' : 'Toggle Dark Mode'}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
            </button>

            {/* Refreshes */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-all shadow-sm disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              title="Refresh database logs"
              aria-label="Refresh database logs"
              aria-busy={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Navigation Bar */}
      <nav
        className="mb-6 border-b border-border flex w-full items-center justify-between sm:justify-start gap-1 pb-px overflow-x-auto no-scrollbar z-10"
        role="tablist"
        aria-label="Dashboard navigation tabs"
      >
        {[
          { id: 'analytics', label: 'Dashboard Analytics', icon: Activity },
          { id: 'compare', label: 'Compare Bank Rates', icon: Layers },
          { id: 'calculator', label: 'Exchange Calculator', icon: Calculator },
        ].map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 py-3 sm:px-4 sm:py-3 border-b-2 text-[11px] sm:text-xs font-semibold transition-all shrink-0 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                isActive ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <TabIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Success Ingest toast */}
      {successToast && (
        <div
          className="fixed bottom-6 right-6 z-50 theme-panel p-4 rounded-xl border border-buy/30 bg-card text-card-foreground shadow-premium max-w-md animate-bounce"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <div className="p-1 rounded-md bg-buy/10 text-buy mt-0.5" aria-hidden="true">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-buy font-bold text-xs">Rates Synced</h4>
              <p className="text-muted-foreground text-[11px] mt-0.5 leading-relaxed">{successToast}</p>
            </div>
          </div>
        </div>
      )}

      <main id="main-content" className="focus-visible:outline-none">
        {loading && data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin mb-4" aria-hidden="true" />
            <h2 className="text-lg font-bold text-foreground">Reading Database...</h2>
            <p className="text-muted-foreground text-xs mt-1">Connecting flat-file assets from public/data.json</p>
          </div>
        ) : error && data.length === 0 ? (
          <div className="theme-panel p-8 rounded-2xl border border-destructive/20 bg-card text-center max-w-xl mx-auto my-12" role="alert">
            <h3 className="text-md font-bold text-foreground">Database Sync Failed</h3>
            <p className="text-muted-foreground text-xs mt-2 mb-6 leading-relaxed">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 mx-auto hover:scale-95 active:scale-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Retry Connection</span>
            </button>
          </div>
        ) : (
          <>
            {/* TAB A: SINGLE-BANK DETAILED ANALYTICS */}
            {activeTab === 'analytics' && currentMetrics && (
              <div id="panel-analytics" role="tabpanel" aria-labelledby="tab-analytics" tabIndex={0} className="animate-fadeIn focus-visible:outline-none">
                {/* Bank selector and quick stats row */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 p-4 rounded-xl bg-card border border-border shadow-sm">
                  <div className="flex items-center gap-3">
                    <label htmlFor="bank-selector" className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                      Active Bank Target
                    </label>
                    <select
                      id="bank-selector"
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus-visible:ring-ring focus-visible:outline-none transition-all cursor-pointer"
                      aria-label="Active bank target selection"
                    >
                      {Object.entries(bankNames).map(([key, name]) => (
                        <option key={key} value={key}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground border-t sm:border-t-0 pt-2 sm:pt-0 border-border self-stretch sm:self-auto justify-between">
                    <span>
                      Last Checked:{' '}
                      <span className="text-foreground font-bold">
                        {new Date(currentMetrics.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-border"></span>
                    <span>
                      Logs Size: <span className="text-foreground font-bold">{currentMetrics.totalEntries} Days</span>
                    </span>
                  </div>
                </div>

                {/* Key Metrics Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-6">
                  {/* Buy Card */}
                  <div className="theme-panel theme-panel-hover p-4 rounded-2xl bg-card text-card-foreground">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-muted-foreground font-semibold text-[10px] tracking-wider uppercase">{activeCurrency} Buying Rate (LKR)</span>
                      <span className="text-[10px] font-bold text-buy bg-buy/10 px-2 py-0.5 rounded-md">BUY RATE</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold font-sans tracking-tight text-buy" style={{ fontFamily: 'Outfit' }}>
                        {currentMetrics.buy.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground text-xs font-medium">LKR</span>
                    </div>

                    {/* Deltas vs Benchmarks */}
                    <div className="mt-2.5 border-t border-border pt-2 flex flex-col gap-1 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-medium">vs Google Interbank:</span>
                        <span className="font-semibold text-slate-500 dark:text-slate-400">{currentMetrics.buyDiffVsGoogle.toFixed(2)} LKR</span>
                      </div>
                      {currentMetrics.cbslRate.buy > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-medium">vs CBSL Reference:</span>
                          <span className={`font-semibold ${currentMetrics.buyDiffVsCbsl >= 0 ? 'text-buy' : 'text-rose-500 font-bold'}`}>
                            {currentMetrics.buyDiffVsCbsl >= 0 ? '+' : ''}
                            {currentMetrics.buyDiffVsCbsl.toFixed(2)} LKR
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sell Card */}
                  <div className="theme-panel theme-panel-hover p-4 rounded-2xl bg-card text-card-foreground">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-muted-foreground font-semibold text-[10px] tracking-wider uppercase">{activeCurrency} Selling Rate (LKR)</span>
                      <span className="text-[10px] font-bold text-sell bg-sell/10 px-2 py-0.5 rounded-md">SELL RATE</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold font-sans tracking-tight text-sell" style={{ fontFamily: 'Outfit' }}>
                        {currentMetrics.sell.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground text-xs font-medium">LKR</span>
                    </div>

                    {/* Deltas vs Benchmarks */}
                    <div className="mt-2.5 border-t border-border pt-2 flex flex-col gap-1 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-medium">vs Google Interbank:</span>
                        <span className="font-semibold text-slate-500 dark:text-slate-400">+{currentMetrics.sellDiffVsGoogle.toFixed(2)} LKR</span>
                      </div>
                      {currentMetrics.cbslRate.sell > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-medium">vs CBSL Reference:</span>
                          <span className={`font-semibold ${currentMetrics.sellDiffVsCbsl <= 0 ? 'text-buy' : 'text-rose-500 font-bold'}`}>
                            {currentMetrics.sellDiffVsCbsl > 0 ? '+' : ''}
                            {currentMetrics.sellDiffVsCbsl.toFixed(2)} LKR
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Spread Card */}
                  <div className="theme-panel theme-panel-hover p-4 rounded-2xl bg-card text-card-foreground">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-muted-foreground font-semibold text-[10px] tracking-wider uppercase">Selected Bank Spread</span>
                      <span className="text-[10px] font-bold text-spread bg-spread/10 px-2 py-0.5 rounded-md">SPREAD</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold font-sans tracking-tight text-spread" style={{ fontFamily: 'Outfit' }}>
                        {currentMetrics.spread.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground text-xs font-semibold">LKR ({currentMetrics.spreadPercentage.toFixed(2)}%)</span>
                    </div>

                    {/* Indicator Line */}
                    <div className="mt-3.5 w-full bg-zinc-200 dark:bg-zinc-800 h-1 rounded-full overflow-hidden flex">
                      <div className="bg-buy h-full" style={{ width: '48%' }}></div>
                      <div className="bg-transparent h-full" style={{ width: '4%' }}></div>
                      <div className="bg-sell h-full" style={{ width: '48%' }}></div>
                    </div>
                  </div>

                  {/* Google Benchmark Card */}
                  <div className="theme-panel theme-panel-hover p-4 rounded-2xl bg-card text-card-foreground">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-muted-foreground font-semibold text-[10px] tracking-wider uppercase">Google Interbank Rate</span>
                      <span className="text-[10px] font-bold text-google bg-google/10 px-2 py-0.5 rounded-md">BENCHMARK</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold font-sans tracking-tight text-google" style={{ fontFamily: 'Outfit' }}>
                        {currentMetrics.googleRate.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground text-xs font-medium">LKR</span>
                    </div>

                    {/* Google Delta compared to yesterday */}
                    <div className="mt-2.5 border-t border-border pt-2 flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground font-medium">Daily benchmark walk:</span>
                      {currentMetrics.googleDelta >= 0 ? (
                        <span className="font-bold text-buy">+{currentMetrics.googleDelta.toFixed(2)} LKR</span>
                      ) : (
                        <span className="font-bold text-sell">{currentMetrics.googleDelta.toFixed(2)} LKR</span>
                      )}
                    </div>
                  </div>

                  {/* CBSL Benchmark Card */}
                  <div className="theme-panel theme-panel-hover p-4 rounded-2xl bg-card text-card-foreground">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-muted-foreground font-semibold text-[10px] tracking-wider uppercase">CBSL Reference Rates</span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-500/10 px-2 py-0.5 rounded-md">BENCHMARK</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <span className="text-[9px] text-muted-foreground block font-bold uppercase tracking-wider">Buy Reference</span>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-lg font-extrabold text-foreground" style={{ fontFamily: 'Outfit' }}>
                            {currentMetrics.cbslRate.buy > 0 ? currentMetrics.cbslRate.buy.toFixed(2) : 'N/A'}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-medium ml-0.5">LKR</span>
                        </div>
                      </div>
                      <div className="border-l border-border pl-2.5">
                        <span className="text-[9px] text-muted-foreground block font-bold uppercase tracking-wider">Sell Reference</span>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-lg font-extrabold text-foreground" style={{ fontFamily: 'Outfit' }}>
                            {currentMetrics.cbslRate.sell > 0 ? currentMetrics.cbslRate.sell.toFixed(2) : 'N/A'}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-medium ml-0.5">LKR</span>
                        </div>
                      </div>
                    </div>

                    {/* CBSL Deltas compared to yesterday */}
                    <div className="mt-2 border-t border-border pt-1.5 flex flex-col gap-0.5 text-[9px]">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-medium">Buy Walk:</span>
                        {currentMetrics.cbslBuyDelta >= 0 ? (
                          <span className="font-bold text-buy">+{currentMetrics.cbslBuyDelta.toFixed(2)} LKR</span>
                        ) : (
                          <span className="font-bold text-sell">{currentMetrics.cbslBuyDelta.toFixed(2)} LKR</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-medium">Sell Walk:</span>
                        {currentMetrics.cbslSellDelta >= 0 ? (
                          <span className="font-bold text-buy">+{currentMetrics.cbslSellDelta.toFixed(2)} LKR</span>
                        ) : (
                          <span className="font-bold text-sell">{currentMetrics.cbslSellDelta.toFixed(2)} LKR</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Time Series Chart */}
                <div className="theme-panel p-5 rounded-2xl bg-card border border-border mb-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-border">
                    <div>
                      <h3 className="text-md font-bold text-foreground flex items-center gap-2">
                        <Activity className="w-4 h-4 text-google" /> Exchange Rate Time-Series
                      </h3>
                      <p className="text-muted-foreground text-[10px] mt-0.5">Plotting buying and selling price bands relative to Google Interbank Reference rates.</p>
                    </div>

                    {/* Range Selector */}
                    <div
                      className="inline-flex p-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 self-stretch sm:self-auto justify-between"
                      role="group"
                      aria-label="Select historical date range"
                    >
                      {[
                        { label: '7 Days', val: '7d' },
                        { label: '14 Days', val: '14d' },
                        { label: '30 Days', val: '30d' },
                        { label: 'All History', val: 'all' },
                      ].map((r) => (
                        <button
                          key={r.val}
                          onClick={() => setChartRange(r.val)}
                          aria-pressed={chartRange === r.val}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none focus:outline-none ${
                            chartRange === r.val ? 'bg-card text-foreground border border-border shadow-sm' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recharts Dual Area Graphic */}
                  <div
                    className="w-full h-[320px] sm:h-[350px]"
                    role="img"
                    aria-label={`Interactive area chart showing buying and selling exchange rates history for ${activeCurrency} at ${bankNames[selectedBank]}`}
                  >
                    {formattedSingleChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={formattedSingleChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gradientBuy" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--buy))" stopOpacity={0.12} />
                              <stop offset="95%" stopColor="hsl(var(--buy))" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradientSell" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--sell))" stopOpacity={0.12} />
                              <stop offset="95%" stopColor="hsl(var(--sell))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" vertical={false} />
                          <XAxis
                            dataKey="timestamp"
                            tickFormatter={(ts) =>
                              new Date(ts).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })
                            }
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 500 }}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                          />
                          <YAxis
                            domain={['auto', 'auto']}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 500, fontFamily: 'monospace' }}
                            axisLine={false}
                            tickLine={false}
                            dx={-10}
                            tickFormatter={(val) => val.toFixed(1)}
                          />
                          <Tooltip content={<CustomAnalyticsTooltip />} />
                          <Area type="monotone" dataKey="buy" stroke="hsl(var(--buy))" strokeWidth={2} fillOpacity={1} fill="url(#gradientBuy)" name="Bank Buy Rate" />
                          <Area type="monotone" dataKey="sell" stroke="hsl(var(--sell))" strokeWidth={2} fillOpacity={1} fill="url(#gradientSell)" name="Bank Sell Rate" />
                          {/* google interbank thread */}
                          <Area
                            type="monotone"
                            dataKey="google"
                            stroke="hsl(var(--google))"
                            strokeWidth={1.5}
                            strokeDasharray="3 3"
                            fill="transparent"
                            connectNulls={true}
                            name="Google Interbank benchmark"
                          />
                          {/* CBSL Buying Reference */}
                          <Area
                            type="monotone"
                            dataKey="cbslBuy"
                            stroke="#94a3b8"
                            strokeWidth={1.5}
                            strokeDasharray="4 4"
                            fill="transparent"
                            connectNulls={true}
                            name="CBSL Buy Reference"
                          />
                          {/* CBSL Selling Reference */}
                          <Area
                            type="monotone"
                            dataKey="cbslSell"
                            stroke="#64748b"
                            strokeWidth={1.5}
                            strokeDasharray="4 4"
                            fill="transparent"
                            connectNulls={true}
                            name="CBSL Sell Reference"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No chart data available.</div>
                    )}
                  </div>

                  {/* Custom Toned-Down Interactive Legends */}
                  <div className="flex flex-wrap justify-center items-center gap-6 mt-4 pt-4 border-t border-border text-[11px] font-semibold">
                    <div className="flex items-center gap-2 text-buy">
                      <span className="w-3.5 h-1.5 bg-buy rounded-md"></span>
                      <span>{bankNames[selectedBank]} Buy Rate</span>
                    </div>
                    <div className="flex items-center gap-2 text-sell">
                      <span className="w-3.5 h-1.5 bg-sell rounded-md"></span>
                      <span>{bankNames[selectedBank]} Sell Rate</span>
                    </div>
                    <div className="flex items-center gap-2 text-google">
                      <span className="w-3.5 h-0.5 border-t-2 border-dashed border-google"></span>
                      <span>Google Interbank reference benchmark</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <span className="w-3.5 h-0.5 border-t-2 border-dashed border-slate-500"></span>
                      <span>CBSL Buy reference benchmark</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-500">
                      <span className="w-3.5 h-0.5 border-t-2 border-dashed border-slate-600"></span>
                      <span>CBSL Sell reference benchmark</span>
                    </div>
                  </div>
                </div>

                {/* Stats & History Details Split Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Dynamically Calced Extreme Ranges */}
                  {historicalMetrics && (
                    <div className="theme-panel p-5 rounded-2xl bg-card text-card-foreground flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 pb-2 border-b border-border">
                          <Award className="w-4 h-4 text-google" /> Historical Limits ({bankNames[selectedBank]})
                        </h3>

                        <div className="flex flex-col gap-4">
                          {/* Buying Rates Limits */}
                          <div>
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-buy"></span> Buying Rate Records
                            </h4>
                            <div className="grid grid-cols-3 gap-2.5 text-center">
                              <div className="p-2 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                                <span className="block text-[9px] text-muted-foreground font-semibold mb-0.5">LOWEST</span>
                                <span className="block text-xs font-bold font-mono">{historicalMetrics.minBuy.toFixed(2)}</span>
                              </div>
                              <div className="p-2 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                                <span className="block text-[9px] text-muted-foreground font-semibold mb-0.5">AVERAGE</span>
                                <span className="block text-xs font-bold font-mono text-buy">{historicalMetrics.avgBuy.toFixed(2)}</span>
                              </div>
                              <div className="p-2 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                                <span className="block text-[9px] text-muted-foreground font-semibold mb-0.5">HIGHEST</span>
                                <span className="block text-xs font-bold font-mono">{historicalMetrics.maxBuy.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Selling Rates Limits */}
                          <div>
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-sell"></span> Selling Rate Records
                            </h4>
                            <div className="grid grid-cols-3 gap-2.5 text-center">
                              <div className="p-2 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                                <span className="block text-[9px] text-muted-foreground font-semibold mb-0.5">LOWEST</span>
                                <span className="block text-xs font-bold font-mono">{historicalMetrics.minSell.toFixed(2)}</span>
                              </div>
                              <div className="p-2 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                                <span className="block text-[9px] text-muted-foreground font-semibold mb-0.5">AVERAGE</span>
                                <span className="block text-xs font-bold font-mono text-sell">{historicalMetrics.avgSell.toFixed(2)}</span>
                              </div>
                              <div className="p-2 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                                <span className="block text-[9px] text-muted-foreground font-semibold mb-0.5">HIGHEST</span>
                                <span className="block text-xs font-bold font-mono">{historicalMetrics.maxSell.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Spreads Limits */}
                          <div>
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-spread"></span> Spreads (Margins)
                            </h4>
                            <div className="grid grid-cols-3 gap-2.5 text-center">
                              <div className="p-2 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                                <span className="block text-[9px] text-muted-foreground font-semibold mb-0.5">TIGHTEST</span>
                                <span className="block text-xs font-bold font-mono">{historicalMetrics.minSpread.toFixed(2)}</span>
                              </div>
                              <div className="p-2 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                                <span className="block text-[9px] text-muted-foreground font-semibold mb-0.5">AVERAGE</span>
                                <span className="block text-xs font-bold font-mono text-spread">{historicalMetrics.avgSpread.toFixed(2)}</span>
                              </div>
                              <div className="p-2 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                                <span className="block text-[9px] text-muted-foreground font-semibold mb-0.5">WIDEST</span>
                                <span className="block text-xs font-bold font-mono">{historicalMetrics.maxSpread.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] text-muted-foreground leading-relaxed flex gap-2">
                        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <span>Margins dynamically parsed across database sequences. Averages indicate standard overhead offsets relative to interbank liquidity benchmarks.</span>
                      </div>
                    </div>
                  )}

                  {/* Database Log table */}
                  <div className="theme-panel p-5 rounded-2xl bg-card text-card-foreground lg:col-span-2 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-2 border-b border-border">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                          <History className="w-4 h-4 text-primary" /> Flat-File Database Log
                        </h3>
                        {/* Search & Export Actions */}
                        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
                          <div className="relative shrink-0">
                            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                            <input
                              id="log-search-input"
                              type="text"
                              placeholder="Search log dates..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-32 pl-8 pr-3 py-1 text-[11px] rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-foreground placeholder-muted-foreground focus:outline-none transition-all focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1"
                              aria-label="Search historical log dates"
                            />
                          </div>
                          <button
                            onClick={exportToCSV}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg border border-border bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 text-foreground transition-all shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                            title={`Export all historical rates for ${activeCurrency} to CSV`}
                            aria-label={`Export all historical rates for ${activeCurrency} to CSV`}
                          >
                            <Download className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                            <span>CSV Export</span>
                          </button>
                          <button
                            onClick={exportToJSON}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg border border-border bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 text-foreground transition-all shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                            title="Export raw JSON database dump"
                            aria-label="Export raw JSON database dump"
                          >
                            <Download className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                            <span>JSON Export</span>
                          </button>
                        </div>
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-[10px] sm:text-[11px] border-collapse">
                          <thead>
                            <tr className="border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                              <th className="py-2 px-1 sm:px-2">Date Logged</th>
                              <th className="py-2 px-1 sm:px-2 text-right">Bank Buy</th>
                              <th className="py-2 px-1 sm:px-2 text-right">Bank Sell</th>
                              <th className="py-2 px-1 sm:px-2 text-right">Spread</th>
                              <th className="py-2 px-1 sm:px-2 text-right">CBSL Buy</th>
                              <th className="py-2 px-1 sm:px-2 text-right">CBSL Sell</th>
                              <th className="py-2 px-1 sm:px-2 text-right">Google Interbank</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {paginatedTableData.length > 0 ? (
                              paginatedTableData.map((item, idx) => {
                                const bRates = getBankRate(item, selectedBank, activeCurrency);
                                const googleRate = getGoogleRate(item, activeCurrency);
                                const cbsl = getCbslRate(item, activeCurrency);
                                if (!bRates || bRates.buy === 0) return null;
                                const buy = bRates.buy;
                                const sell = bRates.sell;
                                const spread = sell - buy;

                                return (
                                  <tr key={idx} className="hover:bg-zinc-150/40 dark:hover:bg-zinc-900/60 text-muted-foreground hover:text-foreground transition-colors">
                                    <td className="py-2.5 px-1 sm:px-2 font-medium flex items-center gap-1 text-foreground">
                                      <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground" />
                                      {new Date(item.timestamp).toLocaleDateString(undefined, {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                      })}
                                    </td>
                                    <td className="py-2.5 px-1 sm:px-2 text-right font-mono text-buy font-semibold">{formatLKR(buy)}</td>
                                    <td className="py-2.5 px-1 sm:px-2 text-right font-mono text-sell font-semibold">{formatLKR(sell)}</td>
                                    <td className="py-2.5 px-1 sm:px-2 text-right font-mono text-spread font-semibold">{formatLKR(spread)}</td>
                                    <td className="py-2.5 px-1 sm:px-2 text-right font-mono text-slate-500 dark:text-slate-400 font-semibold">{cbsl.buy > 0 ? formatLKR(cbsl.buy) : 'N/A'}</td>
                                    <td className="py-2.5 px-1 sm:px-2 text-right font-mono text-slate-500 dark:text-slate-400 font-semibold">{cbsl.sell > 0 ? formatLKR(cbsl.sell) : 'N/A'}</td>
                                    <td className="py-2.5 px-1 sm:px-2 text-right font-mono text-google font-semibold">{formatLKR(googleRate)}</td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan="7" className="py-10 text-center text-muted-foreground text-xs">
                                  No records found matching criteria.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-3 border-t border-border mt-3 text-[10px] font-semibold text-muted-foreground">
                        <span>
                          Page <span className="text-foreground">{currentPage}</span> of <span className="text-foreground">{totalPages}</span>
                        </span>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-850 transition-colors disabled:opacity-30"
                          >
                            <ChevronLeft className="w-3 h-3" /> Prev
                          </button>
                          <button
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-850 transition-colors disabled:opacity-30"
                          >
                            Next <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB B: MULTI-BANK COMPARISON HUB */}
            {activeTab === 'compare' && (
              <div id="panel-compare" role="tabpanel" aria-labelledby="tab-compare" tabIndex={0} className="animate-fadeIn focus-visible:outline-none">
                {/* Metric Type Selector & Comparison Graph */}
                <div className="theme-panel p-5 rounded-2xl bg-card text-card-foreground border border-border mb-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-border">
                    <div>
                      <h3 className="text-md font-bold text-foreground flex items-center gap-2">
                        <Layers className="w-4 h-4 text-google" /> Multi-Bank Rate Compare
                      </h3>
                      <p className="text-muted-foreground text-[10px] mt-0.5">Compare buying or selling LKR prices across 11 major Sri Lankan commercial banks.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 self-stretch sm:self-auto justify-between">
                      {/* Compare Metric Toggle */}
                      <div
                        className="inline-flex p-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                        role="group"
                        aria-label="Comparison rate type"
                      >
                        <button
                          onClick={() => setCompareMetric('buy')}
                          aria-pressed={compareMetric === 'buy'}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none focus:outline-none ${
                            compareMetric === 'buy' ? 'bg-card text-buy border border-border shadow-sm' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Buying Rates Comparison
                        </button>
                        <button
                          onClick={() => setCompareMetric('sell')}
                          aria-pressed={compareMetric === 'sell'}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none focus:outline-none ${
                            compareMetric === 'sell' ? 'bg-card text-sell border border-border shadow-sm' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Selling Rates Comparison
                        </button>
                      </div>

                      {/* Range Selector */}
                      <div
                        className="inline-flex p-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                        role="group"
                        aria-label="Select comparison date range"
                      >
                        {[
                          { label: '7D', val: '7d' },
                          { label: '14D', val: '14d' },
                          { label: '30D', val: '30d' },
                          { label: 'All', val: 'all' },
                        ].map((r) => (
                          <button
                            key={r.val}
                            onClick={() => setChartRange(r.val)}
                            aria-pressed={chartRange === r.val}
                            className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none focus:outline-none ${
                              chartRange === r.val ? 'bg-card text-foreground border border-border shadow-sm' : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Selection Toggles Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider" id="compare-targets-label">
                        Compare Targets:
                      </span>
                      <div className="flex flex-wrap items-center gap-2" role="group" aria-labelledby="compare-targets-label">
                        {Object.keys(bankNames).map((bk) => {
                          const isChecked = selectedCompareBanks.includes(bk);
                          return (
                            <button
                              key={bk}
                              onClick={() => {
                                setSelectedCompareBanks((prev) => {
                                  if (prev.includes(bk)) {
                                    if (prev.length === 1) return prev; // Safety clamp (keep at least one checked)
                                    return prev.filter((x) => x !== bk);
                                  }
                                  return [...prev, bk];
                                });
                              }}
                              aria-pressed={isChecked}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all active:scale-95 shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none focus:outline-none ${
                                isChecked ? 'border-border bg-card text-foreground shadow-sm' : 'border-transparent bg-transparent text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getBankColor(bk) }} />
                              <span>
                                {bk === 'cbsl'
                                  ? 'CBSL'
                                  : bk === 'combank'
                                    ? 'ComBank'
                                    : bk === 'peoples'
                                      ? "People's"
                                      : bk === 'seylan'
                                        ? 'Seylan'
                                        : bk === 'union'
                                          ? 'Union'
                                          : bk === 'amana'
                                            ? 'Amana'
                                            : bk === 'dfcc'
                                              ? 'DFCC'
                                              : bk === 'nsb'
                                                ? 'NSB'
                                                : bk === 'pabc'
                                                  ? 'PABC'
                                                  : bk === 'ndb'
                                                    ? 'NDB'
                                                    : bankNames[bk].split(' ')[0]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium hidden sm:block">Toggle pills to filter comparative chart lines and side-by-side matrices.</div>
                  </div>

                  {/* Comparative Chart Container */}
                  <div
                    className="w-full h-[320px] sm:h-[350px]"
                    role="img"
                    aria-label={`Interactive line chart comparing ${compareMetric === 'buy' ? 'buying' : 'selling'} exchange rates for ${activeCurrency} across selected Sri Lankan banks`}
                  >
                    {formattedCompareChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formattedCompareChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" vertical={false} />
                          <XAxis
                            dataKey="timestamp"
                            tickFormatter={(ts) =>
                              new Date(ts).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })
                            }
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 500 }}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                          />
                          <YAxis
                            domain={['auto', 'auto']}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 500, fontFamily: 'monospace' }}
                            axisLine={false}
                            tickLine={false}
                            dx={-10}
                            tickFormatter={(val) => val.toFixed(1)}
                          />
                          <Tooltip content={<CustomCompareTooltip />} />
                          <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '10px' }} />
                          {selectedCompareBanks.map((bk) => (
                            <Line key={bk} type="monotone" dataKey={bk} stroke={getBankColor(bk)} strokeWidth={2} dot={false} name={bankNames[bk]} />
                          ))}
                          <Line type="monotone" dataKey="google" stroke="hsl(var(--google))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Google Benchmark" />
                          <Line type="monotone" dataKey="cbsl" stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="CBSL Benchmark" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No comparative data available.</div>
                    )}
                  </div>
                </div>

                {/* Side-by-side Matrix Comparison Table with best values indicator */}
                <div className="theme-panel p-5 rounded-2xl bg-card text-card-foreground border border-border">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-2 border-b border-border">
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-google" /> Live Comparison Matrix (Today's Rates)
                      </h3>
                      <p className="text-muted-foreground text-[10px] mt-0.5">Analytic grid highlighting the optimal rates and spread indicators across active banks.</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-[10px] sm:text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[9px] sm:text-[10px]">
                          <th className="py-2.5 px-1.5 sm:px-3">Sri Lankan Bank</th>
                          <th className="py-2.5 px-1.5 sm:px-3 text-center">7-Day Trend</th>
                          <th className="py-2.5 px-1.5 sm:px-3 text-right">Buying Rate</th>
                          <th className="py-2.5 px-1.5 sm:px-3 text-right">Buy Difference vs Google</th>
                          <th className="py-2.5 px-1.5 sm:px-3 text-right">Selling Rate</th>
                          <th className="py-2.5 px-1.5 sm:px-3 text-right">Sell Difference vs Google</th>
                          <th className="py-2.5 px-1.5 sm:px-3 text-right">Spread (LKR)</th>
                          <th className="py-2.5 px-1.5 sm:px-3 text-right">Spread (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {comparisonMatrix.map((row) => (
                          <tr key={row.key} className="hover:bg-zinc-150/40 dark:hover:bg-zinc-900/60 text-muted-foreground hover:text-foreground transition-all">
                            {/* Bank Name */}
                            <td className="py-3 px-1.5 sm:px-3 font-semibold text-foreground flex items-center gap-2">
                              {row.name}

                              {/* Best Buy Star */}
                              {row.isBestBuy && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[8px] font-bold bg-buy/15 text-buy border border-buy/20 uppercase tracking-widest shadow-sm">
                                  ★ Best Buy
                                </span>
                              )}

                              {/* Best Sell Star */}
                              {row.isBestSell && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[8px] font-bold bg-sell/15 text-sell border border-sell/20 uppercase tracking-widest shadow-sm">
                                  ★ Best Sell
                                </span>
                              )}
                            </td>

                            {/* 7-Day Sparkline Trend */}
                            <td className="py-3 px-1.5 sm:px-3 align-middle text-center">
                              <div className="inline-block w-20 h-6">
                                {row.sparklineData && row.sparklineData.length > 0 ? (
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={row.sparklineData} margin={{ top: 2, bottom: 2, left: 2, right: 2 }}>
                                      <YAxis domain={['auto', 'auto']} hide />
                                      <XAxis dataKey="timestamp" hide />
                                      <Line type="monotone" dataKey="rate" stroke={getBankColor(row.key)} strokeWidth={1.5} dot={false} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">--</span>
                                )}
                              </div>
                            </td>

                            {/* Buy Rate */}
                            <td className={`py-3 px-1.5 sm:px-3 text-right font-mono font-bold ${row.isBestBuy ? 'text-buy' : 'text-foreground'}`}>{formatLKR(row.buy)}</td>

                            {/* Buy Margin vs Google */}
                            <td className="py-3 px-1.5 sm:px-3 text-right font-mono">
                              <span className="inline-flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-900 px-1.5 sm:px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-[10px]">
                                {row.buyDiffVsGoogle.toFixed(2)} LKR
                              </span>
                            </td>

                            {/* Sell Rate */}
                            <td className={`py-3 px-1.5 sm:px-3 text-right font-mono font-bold ${row.isBestSell ? 'text-sell' : 'text-foreground'}`}>{formatLKR(row.sell)}</td>

                            {/* Sell Margin vs Google */}
                            <td className="py-3 px-1.5 sm:px-3 text-right font-mono">
                              <span className="inline-flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-900 px-1.5 sm:px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-[10px]">
                                +{row.sellDiffVsGoogle.toFixed(2)} LKR
                              </span>
                            </td>

                            {/* Spread LKR */}
                            <td className={`py-3 px-1.5 sm:px-3 text-right font-mono font-semibold ${row.isBestSpread ? 'text-spread' : ''}`}>{formatLKR(row.spread)}</td>

                            {/* Spread % */}
                            <td className="py-3 px-3 text-right font-mono font-medium text-slate-500 dark:text-slate-400">{row.spreadPct.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] text-muted-foreground leading-relaxed flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground mb-0.5">Comparison Helper Rules:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>
                          For **Buying Rates**, higher is better. A higher buy rate means the bank pays you more LKR when purchasing your USD. The bank with the highest buying
                          price receives the <strong className="text-buy">★ Best Buy</strong> badge.
                        </li>
                        <li>
                          For **Selling Rates**, lower is better. A lower sell rate means you pay less LKR to buy USD from the bank. The bank with the lowest selling price receives
                          the <strong className="text-sell">★ Best Sell</strong> badge.
                        </li>
                        <li>A tighter spread represents more competitive internal bank currency operations.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB C: INTERACTIVE EXCHANGE CALCULATOR */}
            {activeTab === 'calculator' && (
              <div id="panel-calculator" role="tabpanel" aria-labelledby="tab-calculator" tabIndex={0} className="animate-fadeIn space-y-6 focus-visible:outline-none">
                {/* Controls Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Inputs Card */}
                  <div className="theme-panel p-5 rounded-2xl bg-card text-card-foreground border border-border md:col-span-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold flex items-center gap-2 mb-2 pb-2 border-b border-border">
                        <Calculator className="w-4 h-4 text-primary" /> Conversion Parameters
                      </h3>

                      {/* Amount Input */}
                      <div className="space-y-1.5">
                        <label htmlFor="calculator-amount" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Amount to Convert
                        </label>
                        <div className="relative">
                          <input
                            id="calculator-amount"
                            type="number"
                            value={calculatorAmount}
                            onChange={(e) => setCalculatorAmount(Math.max(1, parseFloat(e.target.value) || 0))}
                            className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus-visible:ring-ring focus-visible:outline-none text-foreground"
                            min="1"
                          />
                          <span className="absolute right-3.5 top-2.5 text-xs font-bold text-muted-foreground">{activeCurrency}</span>
                        </div>
                      </div>

                      {/* Presets */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-semibold text-muted-foreground" id="presets-label">
                          QUICK PRESETS
                        </span>
                        <div className="flex gap-1.5 flex-wrap" role="group" aria-labelledby="presets-label">
                          {[100, 500, 1000, 5000, 10000].map((val) => (
                            <button
                              key={val}
                              onClick={() => setCalculatorAmount(val)}
                              className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none focus:outline-none ${
                                calculatorAmount === val
                                  ? 'bg-primary text-primary-foreground border-transparent'
                                  : 'bg-transparent border-border text-muted-foreground hover:text-foreground'
                              }`}
                              aria-label={`Set conversion amount to ${val}`}
                            >
                              {val.toLocaleString()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Direction Switcher */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block" id="conversion-mode-label">
                          Conversion Mode
                        </label>
                        <div className="flex flex-col gap-2" role="group" aria-labelledby="conversion-mode-label">
                          <button
                            onClick={() => setCalculatorDirection('toLkr')}
                            aria-pressed={calculatorDirection === 'toLkr'}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold text-left transition-all focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none focus:outline-none ${
                              calculatorDirection === 'toLkr' ? 'border-buy/30 bg-buy/5 text-buy' : 'border-border bg-transparent text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <span className="flex flex-col">
                              <span>I want to SELL {activeCurrency}</span>
                              <span className="text-[9px] font-normal text-muted-foreground mt-0.5">Receive LKR (higher rate is better)</span>
                            </span>
                            <TrendingUp className="w-4 h-4 shrink-0" aria-hidden="true" />
                          </button>

                          <button
                            onClick={() => setCalculatorDirection('fromLkr')}
                            aria-pressed={calculatorDirection === 'fromLkr'}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold text-left transition-all focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none focus:outline-none ${
                              calculatorDirection === 'fromLkr' ? 'border-sell/30 bg-sell/5 text-sell' : 'border-border bg-transparent text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <span className="flex flex-col">
                              <span>I want to BUY {activeCurrency}</span>
                              <span className="text-[9px] font-normal text-muted-foreground mt-0.5">Pay LKR (lower rate is better)</span>
                            </span>
                            <TrendingDown className="w-4 h-4 shrink-0" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded-xl bg-zinc-150/40 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] text-muted-foreground leading-relaxed flex gap-2">
                      <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <span>
                        Calculations automatically incorporate live, direct exchange rate quotes for {activeCurrency} refreshed from current flat-file database registries.
                      </span>
                    </div>
                  </div>

                  {/* Best Deal Banner Card */}
                  <div className="theme-panel p-6 rounded-2xl md:col-span-2 border border-border flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 text-white dark:border-zinc-800/80 shadow-premium min-h-[300px]">
                    {/* Subtle Background Pattern */}
                    <div className="absolute right-[-40px] bottom-[-40px] w-64 h-64 bg-zinc-800/10 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="z-10">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-primary text-primary-foreground tracking-widest border border-white/10 mb-4">
                        <Sparkles className="w-3 h-3 text-yellow-400 animate-pulse" /> FXRScout Best Value Finder
                      </span>

                      {calculatorResults.length > 0 ? (
                        <div className="space-y-4">
                          <div>
                            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">RECOMMENDED INSTITUTION</p>
                            <h2 className="text-3xl font-black text-white tracking-tight mt-1 flex items-baseline gap-2">
                              {calculatorResults[0].name}
                              <span className="text-xs text-emerald-400 font-bold bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                Optimal Option
                              </span>
                            </h2>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Optimal Payoff Value</span>
                              <span className="text-2xl font-black text-white font-mono mt-1 block">{formatLKR(calculatorResults[0].totalLKR)}</span>
                              <span className="text-[10px] text-zinc-400 font-semibold mt-0.5 block">At rate of Rs. {calculatorResults[0].rate.toFixed(2)} per unit</span>
                            </div>

                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
                              <div>
                                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Scout Advantage (Savings)</span>
                                <span className="text-xl font-extrabold text-emerald-400 font-mono mt-1 block">{formatLKR(calculatorResults[0].maxDifference)}</span>
                              </div>
                              <span className="text-[9px] text-zinc-400 font-semibold block mt-1 leading-normal">
                                Extra money saved compared to the worst choice: **{calculatorResults[calculatorResults.length - 1].name}** (
                                {formatLKR(calculatorResults[calculatorResults.length - 1].totalLKR)}).
                              </span>
                            </div>
                          </div>

                          {marketSignal && (
                            <div className="mt-4 p-3.5 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-sm shadow-inner">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase border ${marketSignal.colorClass}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${marketSignal.dotColor} animate-pulse`}></span>
                                    {marketSignal.label}
                                  </span>
                                  <span className="text-[10px] font-bold text-zinc-300">Market Signal Advisory</span>
                                </div>
                                <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">{marketSignal.description}</p>
                              </div>
                              <div className="shrink-0 flex flex-col items-start sm:items-end justify-center text-left sm:text-right font-mono bg-black/30 px-3 py-2 rounded-lg border border-white/5 min-w-[125px]">
                                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">30D MA OPTIMAL</span>
                                <span className="text-xs font-black text-zinc-200 mt-0.5">Rs. {marketSignal.ma30.toFixed(2)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-zinc-400 text-xs">No conversion parameters resolved. Please enter a valid currency quantity.</div>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10 z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px] text-zinc-400 font-medium">
                      <span>
                        Active conversion currency: **{activeCurrency}** &bull; Direction: **{calculatorDirection === 'toLkr' ? 'Foreign Currency ➔ LKR' : 'LKR ➔ Foreign Currency'}
                        **
                      </span>
                      <span className="text-zinc-500">Calculations are client-side simulations. Indicative rates only.</span>
                    </div>
                  </div>
                </div>

                {/* Ranked Output Grid Table */}
                <div className="theme-panel p-5 rounded-2xl bg-card text-card-foreground border border-border">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-2 border-b border-border">
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-google" /> Full Value Efficiency Ranking
                      </h3>
                      <p className="text-muted-foreground text-[10px] mt-0.5">
                        Institutions ranked from best value payoff (Rank #1) to worst, incorporating absolute deflection margins.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Institution Rank</th>
                          <th className="py-2.5 px-3 text-right">LKR Exchange Rate</th>
                          <th className="py-2.5 px-3 text-right">Total Converted Value</th>
                          <th className="py-2.5 px-3 text-right">Deficit Loss vs Optimal</th>
                          <th className="py-2.5 px-3 text-right">Deficit %</th>
                          <th className="py-2.5 px-3 text-right">Relative Value Efficiency</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {calculatorResults.map((row) => (
                          <tr key={row.key} className="hover:bg-zinc-150/40 dark:hover:bg-zinc-900/60 text-muted-foreground hover:text-foreground transition-all">
                            {/* Rank & Bank Name */}
                            <td className="py-3 px-3 font-semibold text-foreground flex items-center gap-2.5">
                              <span
                                className={`flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-black ${
                                  row.isBest
                                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                    : row.isWorst
                                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                      : 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-muted-foreground'
                                }`}
                              >
                                #{row.rank}
                              </span>
                              <span>{row.name}</span>
                              {row.isBest && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider shadow-sm">
                                  Optimal Choice
                                </span>
                              )}
                              {row.isWorst && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase tracking-wider shadow-sm">
                                  Worst Value
                                </span>
                              )}
                            </td>

                            {/* Exchange Rate */}
                            <td className="py-3 px-3 text-right font-mono font-bold text-foreground">Rs. {row.rate.toFixed(4)}</td>

                            {/* Total Converted LKR */}
                            <td className={`py-3 px-3 text-right font-mono font-extrabold ${row.isBest ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                              {formatLKR(row.totalLKR)}
                            </td>

                            {/* Deficit Loss */}
                            <td className="py-3 px-3 text-right font-mono">
                              {row.isBest ? (
                                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                  Optimal (Rs. 0.00)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-[10px] text-rose-500 font-semibold">
                                  -{formatLKR(row.deficit)}
                                </span>
                              )}
                            </td>

                            {/* Deficit % */}
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-500 dark:text-slate-400">
                              {row.isBest ? '0.00%' : `-${row.deficitPct.toFixed(2)}%`}
                            </td>

                            {/* Efficiency Progress Bar */}
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-2.5">
                                <span className="font-mono text-[10px] font-bold text-muted-foreground">{row.efficiency.toFixed(1)}%</span>
                                <div className="w-20 bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden flex shrink-0">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      row.isBest ? 'bg-emerald-500' : row.isWorst ? 'bg-rose-500' : 'bg-zinc-400 dark:bg-zinc-500'
                                    }`}
                                    style={{ width: `${row.efficiency}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] text-muted-foreground leading-relaxed flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground mb-0.5">Scout Best Value Rules:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>When **selling foreign currency** (e.g. converting USD to LKR), the bank with the highest buy rate is optimal, as you receive more LKR in return.</li>
                        <li>When **buying foreign currency** (e.g. converting LKR to USD), the bank with the lowest sell rate is optimal, as you pay less LKR in return.</li>
                        <li>
                          Relative value efficiency indicates the proportion of optimal returns matched by that specific institution. Deficits show exact absolute financial
                          differences compared to the rank #1 optimal selection.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Toned Down Footer */}
      <footer className="text-center text-muted-foreground text-[10px] mt-12 pt-5 border-t border-border leading-relaxed">
        <p className="flex items-center justify-center gap-1.5 font-semibold">
          <span>FXRScout Platform</span> &bull; <span>Node.js v20 Automation</span> &bull; <span>Flat-File database Storage</span>
        </p>
        <p className="mt-0.5 text-muted-foreground/60">Daily bank rates are indicative and subject to change. Developed fully statically via Jamstack principles.</p>
      </footer>
    </div>
  );
}

export default App;
