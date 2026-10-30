import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Search,
  Key,
  Database,
  Lock,
  Clock,
  Terminal,
} from 'lucide-react';
import { auditApi } from '../../api';
import {
  Card,
  Button,
  Input,
  Select,
  Badge,
  Table,
  TableRow,
  TableCell,
  Pagination,
  SkeletonTable,
} from '../../components/common';
import { useToast } from '../../context/ToastContext';

export function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { showToast } = useToast();

  useEffect(() => {
    loadAuditLogs();
  }, [limit]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const data = await auditApi.getAuditLogs(limit);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Failed to fetch security audit trail', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        log.action?.toLowerCase().includes(q) ||
        log.details?.toLowerCase().includes(q) ||
        log.user_email?.toLowerCase().includes(q)
      );
    });
  }, [logs, searchTerm]);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const getActionBadgeVariant = (action) => {
    const act = String(action).toUpperCase();
    if (act.includes('SUCCESS') || act.includes('APPROVED')) return 'available';
    if (act.includes('FAILED') || act.includes('DELETED')) return 'unavailable';
    if (act.includes('CREATED') || act.includes('UPDATED')) return 'indigo';
    return 'default';
  };

  const columns = [
    { header: 'ID' },
    { header: 'Timestamp' },
    { header: 'Event Action' },
    { header: 'Triggered By' },
    { header: 'Audit Details' },
    { header: 'Origin IP' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Security & Audit Logs
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Immutable database audit trail of administrative modifications, logins, and approvals.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={loadAuditLogs}
          icon={RefreshCw}
          loading={loading}
        >
          Refresh Logs
        </Button>
      </div>

      {/* Database Security Badges Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
              Database Hardening
            </span>
            <strong className="text-sm font-semibold text-emerald-200">
              Least Privilege User Access
            </strong>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
              Password Security
            </span>
            <strong className="text-sm font-semibold text-indigo-200">
              Bcrypt Hash (10 Salt Rounds)
            </strong>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
              SQL Injection Defense
            </span>
            <strong className="text-sm font-semibold text-purple-200">
              100% Parameterized Queries
            </strong>
          </div>
        </div>
      </div>

      {/* Search and Limit bar */}
      <Card className="p-4 bg-[#141B2D]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:max-w-md">
            <Input
              placeholder="Search audit trail by action, details, user..."
              icon={Search}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="text-xs text-gray-400 whitespace-nowrap">Fetch Limit:</span>
            <Select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="py-1.5 text-xs w-28"
            >
              <option value={25}>25 entries</option>
              <option value={50}>50 entries</option>
              <option value={100}>100 entries</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      {loading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : (
        <div className="space-y-4">
          <Table
            columns={columns}
            empty={filteredLogs.length === 0}
            emptyMessage="No audit records match your query"
          >
            {paginatedLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <span className="font-mono text-xs text-gray-500">#{log.id}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-gray-300 font-mono text-xs">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span>{log.timestamp}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getActionBadgeVariant(log.action)} size="xs">
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <span className="font-semibold text-gray-200 block text-xs">
                      {log.user_email || 'System'}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase">
                      {log.user_role || 'automation'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-xs text-gray-300 max-w-md truncate" title={log.details}>
                    {log.details || '—'}
                  </p>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-gray-400">{log.ip_address}</span>
                </TableCell>
              </TableRow>
            ))}
          </Table>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredLogs.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}

export default AuditLogs;
