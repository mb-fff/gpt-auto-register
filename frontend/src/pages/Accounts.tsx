// 📁 frontend/src/pages/Accounts.tsx

import React, { useEffect, useMemo, useState } from 'react';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCheckboxBlankCircleLine,
  RiCheckboxCircleLine,
  RiDeleteBin6Line,
  RiFileCopyLine,
  RiShieldUserLine,
  RiRefreshLine,
  RiSearch2Line,
  RiMacbookLine,
  RiWindowsLine,
} from '@remixicon/react';
import axios from 'axios';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { StatusBadge } from '../components/os/StatusBadge';
import { copyValue } from '../components/os/TokenField';
import { WindowFrame } from '../components/os/WindowFrame';
import { Account, getAccountStatusTone } from '../lib/accountTypes';
import { cn } from '../lib/utils';

interface AccountPageResult {
  items: Account[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const pageSizeOptions = [10, 20, 50];

const Accounts: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | 'selected' | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await axios.get<AccountPageResult>('/api/accounts', {
        params: {
          page,
          pageSize,
          search: debouncedQuery || undefined,
        },
      });
      if (res.data.items.length === 0 && res.data.total > 0 && page > 1) {
        setPage(prev => Math.max(prev - 1, 1));
        return;
      }
      setAccounts(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setSelectedIds(prev => prev.filter(id => res.data.items.some(account => account.id === id)));
    } catch (err) {
      toast.error('获取账号列表失败');
    } finally {
      setLoading(false);
    }
  };

  const removeAccount = async (account: Account) => {
    setDeleting(account.id);
    try {
      await axios.delete(`/api/accounts/${account.id}`);
      toast.success('账号已删除');
      setSelectedIds(prev => prev.filter(id => id !== account.id));
      await fetchAccounts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || '删除账号失败');
    } finally {
      setDeleting(null);
      setDeleteTarget(null);
    }
  };

  const removeSelectedAccounts = async () => {
    if (!selectedIds.length) return;
    setDeleting('batch');
    try {
      await axios.delete('/api/accounts/batch', { data: { ids: selectedIds } });
      toast.success(`已删除 ${selectedIds.length} 个账号`);
      setSelectedIds([]);
      await fetchAccounts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || '批量删除失败');
    } finally {
      setDeleting(null);
      setDeleteTarget(null);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    fetchAccounts();
  }, [page, pageSize, debouncedQuery]);

  const visibleIds = useMemo(() => accounts.map(account => account.id), [accounts]);
  const selectedOnPageCount = visibleIds.filter(id => selectedIds.includes(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && selectedOnPageCount === visibleIds.length;
  const pageStart = total ? (page - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(page * pageSize, total);

  const toggleAccount = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const toggleCurrentPage = () => {
    setSelectedIds(prev => {
      if (allVisibleSelected) {
        return prev.filter(id => !visibleIds.includes(id));
      }
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  return (
    <WindowFrame
      title="账号资产库"
      subtitle=""
      status={`${total} 个账号`}
    >
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-end">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <RiSearch2Line className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/35" />
            <Input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="搜索邮箱、状态、代理..."
              className="pl-10 sm:w-72"
            />
          </div>
          <Button variant="secondary" onClick={fetchAccounts} disabled={loading}>
            <RiRefreshLine className={loading ? 'size-5 animate-spin' : 'size-5'} />
            刷新
          </Button>
          <Button variant="danger" onClick={() => setDeleteTarget('selected')} disabled={!selectedIds.length || deleting === 'batch'}>
            <RiDeleteBin6Line className="size-5" />
            删除选中
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-white/[0.07] px-5 py-4 text-sm text-white/48 lg:flex-row lg:items-center lg:justify-between">
            <button
              type="button"
              onClick={toggleCurrentPage}
              className="inline-flex items-center gap-2 text-left transition-colors hover:text-white"
            >
              {allVisibleSelected ? <RiCheckboxCircleLine className="size-5 text-[#9D7CFF]" /> : <RiCheckboxBlankCircleLine className="size-5" />}
              当前页已选 {selectedOnPageCount} 个，合计已选 {selectedIds.length} 个
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <span>每页</span>
              <div className="flex rounded-2xl border border-white/[0.08] bg-white/[0.04] p-1">
                {pageSizeOptions.map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setPageSize(option);
                      setPage(1);
                    }}
                    className={cn(
                      'rounded-xl px-3 py-1.5 text-xs transition-all',
                      pageSize === option ? 'bg-white/12 text-white shadow-[0_0_24px_rgba(110,123,255,0.18)]' : 'text-white/45 hover:text-white'
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {loading && (
              <div className="p-8 text-center text-sm text-white/48">正在同步账号资产...</div>
            )}
            {!loading && accounts.length === 0 && (
              <div className="p-10 text-center">
                <RiShieldUserLine className="mx-auto mb-4 size-10 text-white/28" />
                <div className="text-lg font-normal text-white">{debouncedQuery ? '没有匹配账号' : '暂无账号资产'}</div>
                <div className="mt-2 text-sm text-white/45">{debouncedQuery ? '换个关键词试试。' : '创建任务后，账号会出现在这个空间面板里。'}</div>
              </div>
            )}
            {!loading && accounts.map(account => {
              const selected = selectedIds.includes(account.id);

              return (
	                <div
	                  key={account.id}
	                  className={cn(
	                    'min-w-0 px-5 py-4 transition-all hover:bg-white/[0.045]',
	                    selected && 'bg-[#6E7BFF]/[0.08]'
	                  )}
	                >
                    <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleAccount(account.id)}
                          className="mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-white/45 transition-all hover:text-white"
                          aria-label={selected ? '取消选择账号' : '选择账号'}
                        >
                          {selected ? <RiCheckboxCircleLine className="size-5 text-[#9D7CFF]" /> : <RiCheckboxBlankCircleLine className="size-5" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => copyValue('账号名', account.email)}
                              className="min-w-0 truncate text-left text-sm font-medium text-white transition-colors hover:text-emerald-100"
                              title={account.email}
                            >
                              {account.email}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyValue('账号名', account.email)}
                              className="inline-flex size-7 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05] text-white/45 transition-all hover:border-white/16 hover:bg-white/[0.09] hover:text-white"
                              aria-label="复制账号名"
                              title="复制账号名"
                            >
                              <RiFileCopyLine className="size-3.5" />
                            </button>
                          </div>
                          <div className="mt-1 truncate text-xs text-white/38">{account.proxy || '未绑定代理'}</div>
                          
                          {/* 👇 增加日期旁边的设备小徽章 */}
                          <div className="mt-1 flex items-center gap-2">
                            <div className="text-xs text-white/32">{new Date(account.createdAt).toLocaleString()}</div>
                            {account.fingerprint ? (
                              <div className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-white/60">
                                {account.fingerprint.platform === 'macOS' ? (
                                  <RiMacbookLine className="size-3 text-white/80" />
                                ) : (
                                  <RiWindowsLine className="size-3 text-white/80" />
                                )}
                                {account.fingerprint.platform}
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 rounded-md border border-dashed border-white/10 px-1.5 py-0.5 text-[10px] text-white/30">
                                无设备指纹
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <StatusBadge tone={getAccountStatusTone(account.status) as any} pulse={account.status === 'success'}>
                          {account.status}
                        </StatusBadge>
                        <Link to={`/accounts/${account.id}`}>
                          <Button size="sm" variant="secondary">
                            查看详情
                          </Button>
                        </Link>
                        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(account)} disabled={deleting === account.id}>
                          <RiDeleteBin6Line className="size-4" />
                          删除
                        </Button>
                      </div>
                    </div>
	                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 border-t border-white/[0.07] px-5 py-4 text-sm text-white/48 md:flex-row md:items-center md:justify-between">
            <div>
              显示 {pageStart}-{pageEnd} / 共 {total} 个账号
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setPage(prev => Math.max(prev - 1, 1))} disabled={page <= 1 || loading}>
                <RiArrowLeftSLine className="size-4" />
                上一页
              </Button>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs text-white/64">
                {page} / {totalPages}
              </div>
              <Button size="sm" variant="secondary" onClick={() => setPage(prev => Math.min(prev + 1, totalPages))} disabled={page >= totalPages || loading}>
                下一页
                <RiArrowRightSLine className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090D]/70 px-4 backdrop-blur-xl">
          <div className="w-full max-w-md rounded-[30px] border border-white/[0.1] bg-[#111722]/85 p-6 shadow-[0_32px_100px_rgba(0,0,0,0.6),0_0_70px_rgba(157,124,255,0.16)]">
            <div className="mb-3 inline-flex size-12 items-center justify-center rounded-2xl border border-red-300/20 bg-red-500/15 text-red-100">
              <RiDeleteBin6Line className="size-6" />
            </div>
            <div className="text-xl font-medium text-white">确认删除账号</div>
            <div className="mt-2 text-sm leading-6 text-white/55">
              {deleteTarget === 'selected'
                ? `将删除选中的 ${selectedIds.length} 个账号记录，请确认后继续。`
                : `将删除 ${deleteTarget.email} 的账号记录，请确认后继续。`}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={!!deleting}>
                取消
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteTarget === 'selected' ? removeSelectedAccounts() : removeAccount(deleteTarget)}
                disabled={!!deleting}
              >
                <RiDeleteBin6Line className="size-4" />
                确认删除
              </Button>
            </div>
          </div>
        </div>
      )}
    </WindowFrame>
  );
};

export default Accounts;