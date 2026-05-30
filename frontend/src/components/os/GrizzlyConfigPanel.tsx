import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { RiArrowDownSLine, RiCheckLine, RiRefreshLine, RiSearchLine, RiWallet3Line, RiGlobalLine, RiErrorWarningLine } from '@remixicon/react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { StatusBadge } from './StatusBadge';

interface GrizzlyConfigPanelProps {
  onCountrySelect: (countryCode: string) => void;
  selectedCountry: string;
}

interface SmsPriceItem {
  country: string;
  name: string;
  price: number;
  count: number;
}

export const GrizzlyConfigPanel: React.FC<GrizzlyConfigPanelProps> = ({ onCountrySelect, selectedCountry }) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [prices, setPrices] = useState<SmsPriceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const fetchSmsData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 请求你第一步在后端写的 /api/sms 接口
      const [balRes, priceRes] = await Promise.all([
        axios.get('/api/sms/balance'),
        axios.get('/api/sms/prices')
      ]);
      setBalance(balRes.data.balance);
      setPrices(priceRes.data);
      
      // 如果当前没有选中项，且有数据，默认选中最便宜的
      if (!selectedCountry && priceRes.data.length > 0) {
        onCountrySelect(priceRes.data[0].country);
      }
    } catch (err) {
      console.error(err);
      setError('无法连接接码平台，请检查后端 API 密钥是否配置');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSmsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedItem = useMemo(
    () => prices.find((item) => item.country === selectedCountry),
    [prices, selectedCountry]
  );

  const filteredPrices = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return prices;
    }

    return prices.filter((item) => {
      const fields = [
        item.name,
        item.country,
        `${item.price}`,
        `${item.count}`,
      ];

      return fields.some((field) => field.toLowerCase().includes(keyword));
    });
  }, [prices, search]);

  const formatOption = (item: SmsPriceItem) => (
    `${item.name} - 库存 ${item.count} - $${item.price} - 代码 ${item.country}`
  );

  const handleSelect = (countryCode: string) => {
    onCountrySelect(countryCode);
    setSearch('');
    setOpen(false);
  };

  const isBalanceLow = balance !== null && selectedItem ? balance < selectedItem.price : false;

  return (
    <Card className="border-white/[0.08] bg-[#0F131A]/70">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <RiWallet3Line className="size-5 text-indigo-400" />
          <CardTitle className="text-lg">GrizzlySMS 接码配置</CardTitle>
        </div>
        <div className="flex items-center gap-3">
          {balance !== null && (
            <StatusBadge tone={isBalanceLow ? "danger" : "success"} pulse={isBalanceLow}>
              余额: ${balance}
            </StatusBadge>
          )}
          <Button variant="secondary" size="sm" onClick={fetchSmsData} disabled={loading} className="size-8 rounded-full border-white/[0.1] bg-white/[0.05] p-0 hover:bg-white/[0.1]">
            <RiRefreshLine className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {error ? (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <RiErrorWarningLine className="size-4" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <RiGlobalLine className="size-4" />
              <label htmlFor="country-select">选择 OpenAI 接码国家</label>
            </div>
            
            <div ref={pickerRef} className="relative">
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
                <RiSearchLine className="size-4 shrink-0 text-white/45" />
                <input
                id="country-select"
                  className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setOpen(true);
                  }}
                  onFocus={() => setOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setOpen(false);
                      setSearch('');
                    }
                  }}
                  placeholder={selectedItem ? formatOption(selectedItem) : (loading ? '正在获取实时国家与价格...' : '搜索国家、代码、价格')}
                disabled={loading || prices.length === 0}
                />
                <button
                  type="button"
                  className="flex size-6 shrink-0 items-center justify-center rounded-full text-white/50 transition hover:bg-white/[0.08] hover:text-white"
                  onClick={() => setOpen((value) => !value)}
                  disabled={loading || prices.length === 0}
                  aria-label="展开国家列表"
                >
                  <RiArrowDownSLine className={`size-4 transition ${open ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {open && (
                <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-white/[0.1] bg-[#151922] p-1 shadow-2xl shadow-black/40">
                  {filteredPrices.length > 0 ? (
                    filteredPrices.map((item) => {
                      const active = item.country === selectedCountry;

                      return (
                        <button
                          key={item.country}
                          type="button"
                          className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${active ? 'bg-indigo-500/20 text-white' : 'text-white/80 hover:bg-white/[0.07] hover:text-white'}`}
                          onClick={() => handleSelect(item.country)}
                        >
                          <span className="min-w-0 truncate">{formatOption(item)}</span>
                          {active && <RiCheckLine className="size-4 shrink-0 text-indigo-300" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-3 text-sm text-white/55">没有匹配的国家</div>
                  )}
                </div>
              )}
            </div>
            
            {isBalanceLow && (
              <p className="text-xs text-red-400 mt-2">
                ⚠️ 您的余额过低，如果所选国家号码价格高于余额，任务将会失败。
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
