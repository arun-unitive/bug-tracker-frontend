import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import type { Bug, BugStatus, BugPriority } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { Link, useNavigate } from 'react-router-dom';
import {
  BugIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  Loader2,
  Download,
  Grid,
  List,
  ChevronLeft,
  Calendar
} from 'lucide-react';
import { formatDate } from '../lib/utils';
import * as xlsx from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const STATUS_OPTIONS: (BugStatus | 'All')[] = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'];
const PRIORITY_OPTIONS: (BugPriority | 'All')[] = ['All', 'Low', 'Medium', 'High', 'Critical'];
const ITEMS_PER_PAGE = 5;

const Bugs = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [bugs, setBugs] = useState<Bug[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingBugId, setUpdatingBugId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tile' | 'table'>('tile');
  const [currentPage, setCurrentPage] = useState(1);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  const canViewBugs = user?.role === 'Developer' || user?.role === 'Tester' || user?.role === 'Admin';

  useEffect(() => {
    const fetchBugs = async () => {
      if (!user?.role || !canViewBugs) {
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get('/bugs/my');
        setBugs(response.data);
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Failed to fetch bugs';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBugs();
  }, [user?.role, canViewBugs]);

  const refetchBugs = async () => {
    if (!user?.role) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/bugs/my');
      setBugs(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch bugs');
    } finally {
      setIsLoading(false);
    }
  };

  const updateBugStatus = async (bugId: string, status: BugStatus) => {
    if (!user?.role) return;
    setUpdatingBugId(bugId);
    setError(null);
    try {
      await api.put(`/bugs/${bugId}/status`, { status });
      await refetchBugs();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update bug');
    } finally {
      setUpdatingBugId(null);
    }
  };

  const filteredBugs = useMemo(() => {
    console.log('DEBUG - filteredBugs called with:', {
      bugsCount: bugs.length,
      searchQuery,
      filterStatus,
      filterPriority,
      filterStartDate,
      filterEndDate
    });
    
    const filtered = bugs.filter((bug) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = q === '' || 
        (bug.title && bug.title.toLowerCase().includes(q)) || 
        (bug.description && bug.description.toLowerCase().includes(q));
      
      const matchesStatus = filterStatus === 'All' || bug.status === filterStatus;
      const matchesPriority = filterPriority === 'All' || bug.priority === filterPriority;
      
      let matchesDate = true;
      if (filterStartDate) {
        const start = new Date(filterStartDate);
        start.setHours(0, 0, 0, 0);
        matchesDate = new Date(bug.createdAt) >= start;
      }
      if (filterEndDate && matchesDate) {
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = new Date(bug.createdAt) <= end;
      }

      const result = matchesSearch && matchesStatus && matchesPriority && matchesDate;
      
      if (q) {
        console.log('DEBUG - Bug check:', {
          title: bug.title,
          q,
          matchesSearch,
          matchesStatus,
          matchesPriority,
          matchesDate,
          result
        });
      }
      
      return result;
    });
    
    console.log('DEBUG - Filtered bugs count:', filtered.length);
    return filtered;
  }, [bugs, searchQuery, filterStatus, filterPriority, filterStartDate, filterEndDate]);

  const totalPages = Math.ceil(filteredBugs.length / ITEMS_PER_PAGE);
  const currentBugs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBugs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBugs, currentPage]);

  const exportToExcel = () => {
    const data = filteredBugs.map(bug => ({
      'Bug ID': bug._id,
      'Title': bug.title,
      'Description': bug.description,
      'Priority': bug.priority,
      'Status': bug.status,
      'Reported By': bug.createdBy?.name || 'Unknown',
      'Assigned To': bug.assignedTo?.name || 'Unassigned',
      'Created At': formatDate(bug.createdAt),
    }));

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Bugs');
    xlsx.writeFile(workbook, `Bugs_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Bugs Report', 14, 22);

    const tableData = filteredBugs.map(bug => [
      bug.title,
      bug.priority,
      bug.status,
      bug.createdBy?.name || 'Unknown',
      bug.assignedTo?.name || 'Unassigned',
      formatDate(bug.createdAt)
    ]);

    autoTable(doc, {
      head: [['Title', 'Priority', 'Status', 'Reported By', 'Assigned To', 'Created At']],
      body: tableData,
      startY: 30,
      theme: 'grid',
    });

    doc.save(`Bugs_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterStatus('All');
    setFilterPriority('All');
    setFilterStartDate('');
    setFilterEndDate('');
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white border rounded-xl shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-red-500 mt-0.5" />
          <div>
            <p className="font-bold text-gray-900">Unable to load bugs</p>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user?.role || !canViewBugs) {
    return (
      <div className="p-6 bg-white border rounded-xl shadow-sm">
        <p className="font-bold text-gray-900">Bugs not available</p>
        <p className="text-sm text-gray-500 mt-1">Your role does not have access to this page.</p>
      </div>
    );
  }

  const title =
    user?.role === 'Developer'
      ? 'Bugs Assigned to Me'
      : user?.role === 'Tester'
        ? 'Bugs I Reported'
        : 'Bugs';

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {user?.role === 'Developer'
                ? 'View bugs assigned to you and resolve them.'
                : user?.role === 'Tester'
                  ? 'View bugs you created.'
                  : null}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            {user?.role === 'Tester' && (
              <Link
                to="/bugs/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                <BugIcon className="h-4 w-4" />
                New Bug
              </Link>
            )}
            <div className="flex gap-2">
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                Excel
              </button>
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                PDF
              </button>
            </div>
            {/* <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('tile')}
                className={`p-2 rounded-md border ${viewMode === 'tile' ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md border ${viewMode === 'table' ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div> */}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search bugs..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              className="pl-10 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white appearance-none"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              className="pl-10 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white appearance-none"
              value={filterPriority}
              onChange={(e) => {
                setFilterPriority(e.target.value);
                setCurrentPage(1);
              }}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="date"
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              value={filterStartDate}
              onChange={(e) => {
                setFilterStartDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="date"
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              value={filterEndDate}
              onChange={(e) => {
                setFilterEndDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <button
            onClick={resetFilters}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Reset Filters
          </button>
        </div>

        <div className="text-xs text-gray-500 mt-3">{filteredBugs.length} Results</div>
      </div>

      {viewMode === 'tile' ? (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50/50">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BugIcon className="h-5 w-5 text-red-600" />
              Bugs
            </h2>
          </div>

          <div className="divide-y max-h-[600px] overflow-y-auto">
            {currentBugs.length > 0 ? (
              currentBugs.map((bug) => (
                <Link
                  key={bug._id}
                  to={`/bugs/${bug._id}`}
                  className="p-4 flex items-start justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-gray-900">{bug.title}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{bug.description}</p>
                    <div className="flex items-center gap-3 pt-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          bug.status === 'Open'
                            ? 'bg-blue-100 text-blue-700'
                            : bug.status === 'In Progress'
                              ? 'bg-yellow-100 text-yellow-700'
                              : bug.status === 'Resolved'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {bug.status}
                      </span>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(bug.createdAt)}
                      </span>
                      {bug.priority === 'Critical' && (
                        <span className="text-[10px] font-bold text-red-600">Critical</span>
                      )}
                      {bug.priority === 'High' && (
                        <span className="text-[10px] font-bold text-orange-600">High</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {(user?.role === 'Developer' ||
                      user?.role === 'Tester' ||
                      user?.role === 'Admin') && (
                      <div className="flex flex-col items-end gap-2">
                        {(user?.role === 'Tester' || user?.role === 'Admin') && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(`/bugs/${bug._id}/edit`);
                            }}
                            className="px-3 py-1 text-xs font-bold rounded-lg bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                            title="Edit this bug"
                          >
                            Edit
                          </button>
                        )}
                        {(user?.role === 'Developer' || user?.role === 'Admin') && (
                          <button
                            type="button"
                            disabled={updatingBugId === bug._id || bug.status === 'Resolved' || bug.status === 'Closed'}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              updateBugStatus(bug._id, 'Resolved');
                            }}
                            className="px-3 py-1 text-xs font-bold rounded-lg bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-50"
                            title="Resolve this bug"
                          >
                            Resolve
                          </button>
                        )}
                        {(user?.role === 'Tester' || user?.role === 'Admin') && (
                          <button
                            type="button"
                            disabled={
                              updatingBugId === bug._id ||
                              bug.status !== 'Resolved' ||
                              bug.status === 'Closed'
                            }
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              updateBugStatus(bug._id, 'Closed');
                            }}
                            className="px-3 py-1 text-xs font-bold rounded-lg bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50"
                            title="Close this bug"
                          >
                            Close
                          </button>
                        )}
                      </div>
                    )}
                    <ChevronRight className="h-4 w-4 text-gray-400 mt-1" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-12 text-center text-gray-500">
                <CheckCircle2 className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p>No bugs found.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50/50">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BugIcon className="h-5 w-5 text-red-600" />
              Bugs
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Reported By</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned To</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {currentBugs.length > 0 ? (
                  currentBugs.map((bug) => (
                    <tr key={bug._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link to={`/bugs/${bug._id}`} className="font-medium text-gray-900 hover:text-primary">
                          {bug.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          bug.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                          bug.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                          bug.priority === 'Medium' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {bug.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          bug.status === 'Open' ? 'bg-blue-100 text-blue-700' :
                          bug.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                          bug.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {bug.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {bug.createdBy?.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {bug.assignedTo?.name || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(bug.createdAt)}
                      </td>
                      <td className="px-4 py-3 flex items-center gap-2">
                        {(user?.role === 'Tester' || user?.role === 'Admin') && (
                          <button
                            type="button"
                            onClick={() => navigate(`/bugs/${bug._id}/edit`)}
                            className="px-2 py-1 text-xs font-bold rounded bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                          >
                            Edit
                          </button>
                        )}
                        {(user?.role === 'Developer' || user?.role === 'Admin') && bug.status !== 'Resolved' && bug.status !== 'Closed' && (
                          <button
                            type="button"
                            disabled={updatingBugId === bug._id}
                            onClick={() => updateBugStatus(bug._id, 'Resolved')}
                            className="px-2 py-1 text-xs font-bold rounded bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-50"
                          >
                            Resolve
                          </button>
                        )}
                        {(user?.role === 'Tester' || user?.role === 'Admin') && bug.status === 'Resolved' && bug.status !== 'Closed' && (
                          <button
                            type="button"
                            disabled={updatingBugId === bug._id}
                            onClick={() => updateBugStatus(bug._id, 'Closed')}
                            className="px-2 py-1 text-xs font-bold rounded bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50"
                          >
                            Close
                          </button>
                        )}
                        <ChevronRight className="h-3 w-3 text-gray-400" />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      <CheckCircle2 className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                      <p>No bugs found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-2 border rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-8 h-8 rounded-md text-sm font-medium ${
                currentPage === page ? 'bg-primary text-white' : 'border hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-2 border rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Bugs;
