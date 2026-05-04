import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import type { Bug, BugStatus, BugPriority } from '../types';
import {
  BugIcon,
  Download,
  Filter,
  Search,
  ChevronDown,
  Loader2,
  Calendar,
  Clock,
  User as UserIcon,
  ChevronRight
} from 'lucide-react';
import { formatDate } from '../lib/utils';
import * as xlsx from 'xlsx';

const STATUS_OPTIONS: (BugStatus | 'All')[] = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'];
const PRIORITY_OPTIONS: (BugPriority | 'All')[] = ['All', 'Low', 'Medium', 'High', 'Critical'];

const AdminBugReport = () => {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    critical: 0,
    high: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterProject, setFilterProject] = useState<string>('All');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [bugsRes, statsRes] = await Promise.all([
        api.get('/bugs'),
        api.get('/bugs/stats')
      ]);
      setBugs(bugsRes.data);
      setStats(statsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const uniqueProjects = useMemo(() => {
    const projects = new Set<string>();
    bugs.forEach(bug => {
      const projectName = typeof bug.project === 'object' ? bug.project?.name : 'Unknown';
      if (projectName) projects.add(projectName);
    });
    return Array.from(projects);
  }, [bugs]);

  const filteredBugs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bugs.filter((bug) => {
      const matchesSearch =
        bug.title.toLowerCase().includes(q) || 
        bug.description.toLowerCase().includes(q);
      const matchesStatus = filterStatus === 'All' || bug.status === filterStatus;
      const matchesPriority = filterPriority === 'All' || bug.priority === filterPriority;
      const projectName = typeof bug.project === 'object' ? bug.project?.name : 'Unknown';
      const matchesProject = filterProject === 'All' || projectName === filterProject;
      return matchesSearch && matchesStatus && matchesPriority && matchesProject;
    });
  }, [bugs, searchQuery, filterStatus, filterPriority, filterProject]);

  const exportToExcel = () => {
    const data = filteredBugs.map(bug => ({
      'Bug ID': bug._id,
      'Title': bug.title,
      'Description': bug.description,
      'Priority': bug.priority,
      'Status': bug.status,
      'Project': typeof bug.project === 'object' ? bug.project?.name : 'Unknown',
      'Reported By': bug.createdBy?.name || 'Unknown',
      'Assigned To': bug.assignedTo?.name || 'Unassigned',
      'Resolved By': bug.resolvedBy?.name || 'N/A',
      'Created At': formatDate(bug.createdAt),
      'Resolved At': bug.resolvedAt ? formatDate(bug.resolvedAt) : 'N/A',
      'Application Type': bug.applicationType || 'N/A',
      'Menu': bug.menu || 'N/A'
    }));

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Bug Report');
    
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 30 }, { wch: 50 }, { wch: 12 },
      { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
      { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
      { wch: 20 }
    ];

    xlsx.writeFile(workbook, `Bug_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
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
          <BugIcon className="h-6 w-6 text-red-500 mt-0.5" />
          <div>
            <p className="font-bold text-gray-900">Unable to load reports</p>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    { name: 'Total Bugs', value: stats.total, color: 'bg-purple-500' },
    { name: 'Open', value: stats.open, color: 'bg-blue-500' },
    { name: 'In Progress', value: stats.inProgress, color: 'bg-yellow-500' },
    { name: 'Resolved', value: stats.resolved, color: 'bg-green-500' },
    { name: 'Closed', value: stats.closed, color: 'bg-gray-500' },
    { name: 'Critical', value: stats.critical, color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bug Report</h1>
            <p className="text-sm text-gray-500 mt-1">Detailed bug reporting and analytics</p>
          </div>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export to Excel
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
          {statCards.map((stat) => (
            <div key={stat.name} className="p-4 border rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.name}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-3 mt-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search bugs..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              className="pl-10 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white appearance-none"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              className="pl-10 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white appearance-none"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              className="pl-10 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white appearance-none"
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
            >
              <option value="All">All Projects</option>
              {uniqueProjects.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterStatus('All');
              setFilterPriority('All');
              setFilterProject('All');
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Reset Filters
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50/50 flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BugIcon className="h-5 w-5 text-red-600" />
            Bug Details
          </h2>
          <div className="text-xs text-gray-500">{filteredBugs.length} Results</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Bug</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Reported By</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned To</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredBugs.map((bug) => (
                <tr key={bug._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{bug.title}</div>
                    <div className="text-xs text-gray-500 line-clamp-1">{bug.description}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {typeof bug.project === 'object' ? bug.project?.name : 'Unknown'}
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
                    <Calendar className="h-3 w-3" />
                    {formatDate(bug.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredBugs.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <BugIcon className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p>No bugs found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBugReport;
