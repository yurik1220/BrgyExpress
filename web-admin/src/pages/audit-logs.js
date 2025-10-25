import React, { useState, useEffect } from 'react';
import api from '../lib/fetch';
import '../styles/AuditLogs.css';

// Quick filter presets
const QUICK_FILTERS = [
    { label: 'Show All', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'Last 7 Days', value: 'recent' },
    { label: 'Last 30 Days', value: 'month30' }
];

// Action type filters
const ACTION_FILTERS = [
    { label: 'All Actions', value: '' },
    { label: 'Login', value: 'Admin Login' },
    { label: 'Logout', value: 'Admin Logout' },
    { label: 'Updates', value: 'Update' }
];

// Status filters
const STATUS_FILTERS = [
    { label: 'All Status', value: 'all' },
    { label: 'Success Only', value: 'success' },
    { label: 'Failed Only', value: 'failed' }
];

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
    });
    const [filters, setFilters] = useState({
        action: '',
        admin_username: '',
        start_date: '',
        end_date: '',
        status: 'all'
    });
    const [selectedQuickFilter, setSelectedQuickFilter] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                ...filters
            });

            const response = await api.get(`/api/admin/audit-logs?${params}`);
            
            if (response.data.success) {
                // Backend now handles the filtering, so use data directly
                setLogs(response.data.data || []);
                setPagination(response.data.pagination);
            } else {
                setError('Failed to fetch audit logs');
            }
        } catch (err) {
            console.error('Error fetching audit logs:', err);
            setError('Failed to fetch audit logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [pagination.page, filters]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
        setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    const clearFilters = () => {
        setFilters({
            action: '',
            admin_username: '',
            start_date: '',
            end_date: '',
            status: 'all'
        });
        setSelectedQuickFilter('');
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const applyQuickFilter = (filterValue) => {
        setSelectedQuickFilter(filterValue);
        
        const today = new Date();
        const startOfWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        let newFilters = {
            action: '',
            admin_username: '',
            start_date: '',
            end_date: '',
            status: 'all'
        };
        
        switch (filterValue) {
            case 'all':
                // Clear all filters - show everything
                break;
            case 'today':
                // Set to start and end of today in local timezone
                const startOfToday = new Date(today);
                startOfToday.setHours(0, 0, 0, 0);
                
                const endOfToday = new Date(today);
                endOfToday.setHours(23, 59, 59, 999);
                
                // Convert to ISO string for backend compatibility
                newFilters.start_date = startOfToday.toISOString();
                newFilters.end_date = endOfToday.toISOString();
                break;
            case 'week':
                // Get start of current week (Monday)
                const dayOfWeek = today.getDay();
                const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, so go back 6 days
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() + daysToMonday);
                startOfWeek.setHours(0, 0, 0, 0);
                
                const endOfWeek = new Date(today);
                endOfWeek.setHours(23, 59, 59, 999);
                
                newFilters.start_date = startOfWeek.toISOString();
                newFilters.end_date = endOfWeek.toISOString();
                break;
            case 'month':
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                startOfMonth.setHours(0, 0, 0, 0);
                
                const endOfTodayMonth = new Date(today);
                endOfTodayMonth.setHours(23, 59, 59, 999);
                
                newFilters.start_date = startOfMonth.toISOString();
                newFilters.end_date = endOfTodayMonth.toISOString();
                break;
            case 'recent':
                const startOfRecent = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
                startOfRecent.setHours(0, 0, 0, 0);
                
                const endOfRecent = new Date(today);
                endOfRecent.setHours(23, 59, 59, 999);
                
                newFilters.start_date = startOfRecent.toISOString();
                newFilters.end_date = endOfRecent.toISOString();
                break;
            case 'month30':
                const startOfMonth30 = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
                startOfMonth30.setHours(0, 0, 0, 0);
                
                const endOfMonth30 = new Date(today);
                endOfMonth30.setHours(23, 59, 59, 999);
                
                newFilters.start_date = startOfMonth30.toISOString();
                newFilters.end_date = endOfMonth30.toISOString();
                break;
            default:
                break;
        }
        
        setFilters(newFilters);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const formatTimestamp = (timestamp) => {
        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) {
                return 'Invalid date';
            }
            
            // Format the timestamp (already in Philippine timezone UTC+08:00 from backend)
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        } catch (error) {
            console.error('Error formatting timestamp:', error);
            return 'Invalid date';
        }
    };

    const getActionColor = (action) => {
        // Categorize actions into three main types
        if (action === 'Admin Login') return '#28a745'; // Green for login
        if (action === 'Admin Logout') return '#6c757d'; // Gray for logout
        if (action && action.includes('Update')) return '#007bff'; // Blue for all updates
        return '#6c757d'; // Default gray
    };

    const getActionIcon = (action) => {
        // Categorize actions into three main types
        if (action === 'Admin Login') return '•';
        if (action === 'Admin Logout') return '•';
        if (action && action.includes('Update')) return '•';
        return '•';
    };

    const getStatusFromDetails = (details) => {
        try {
            const parsed = JSON.parse(details);
            // Check if responseSuccess is explicitly false, otherwise consider it success
            return parsed.responseSuccess === false ? 'Failed' : 'Success';
        } catch {
            return 'Unknown';
        }
    };

    const getStatusClass = (details) => {
        try {
            const parsed = JSON.parse(details);
            // Check if responseSuccess is explicitly false, otherwise consider it success
            return parsed.responseSuccess === false ? 'failed' : 'success';
        } catch {
            return '';
        }
    };

    const getReferenceNumber = (log) => {
        if (log.action && log.action.includes('Update') && log.details) {
            try {
                const details = JSON.parse(log.details);
                
                // The reference number is stored directly in details.referenceNumber
                if (details.referenceNumber) {
                    return details.referenceNumber;
                }
                
                // Fallback: check if it's in the response data
                if (details.response && details.response.reference_number) {
                    return details.response.reference_number;
                }
                
                return 'N/A';
            } catch (error) {
                console.error('Error parsing audit log details:', error);
                return 'N/A';
            }
        }
        return 'N/A';
    };

    const handleViewDetails = (log) => {
        setSelectedLog(log);
        setShowDetailsModal(true);
    };

    const closeDetailsModal = () => {
        setShowDetailsModal(false);
        setSelectedLog(null);
    };

    const isFilterActive = () => {
        // Check if any filter is active
        return selectedQuickFilter !== '' || 
               filters.action !== '' || 
               filters.admin_username !== '' || 
               filters.start_date !== '' || 
               filters.end_date !== '' || 
               filters.status !== 'all';
    };

    const exportToPDF = async () => {
        // Only export if a filter is active
        if (!isFilterActive()) {
            return;
        }

        try {
            // Fetch all data with current filters (no pagination)
            const params = new URLSearchParams({
                page: 1,
                limit: 10000, // Large limit to get all records
                ...filters
            });

            const response = await api.get(`/api/admin/audit-logs?${params}`);
            
            if (!response.data.success) {
                alert('Failed to fetch data for export');
                return;
            }

            // Backend now handles the filtering, so use data directly
            const allLogs = response.data.data || [];

            // Create a new window for PDF generation
            const printWindow = window.open('', '_blank');
            const currentDate = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Get active filter information for the report
            const getFilterInfo = () => {
                if (selectedQuickFilter && selectedQuickFilter !== 'all') {
                    const filter = QUICK_FILTERS.find(f => f.value === selectedQuickFilter);
                    return `Filter: ${filter?.label || selectedQuickFilter}`;
                }
                
                const activeFilters = [];
                if (filters.action) activeFilters.push(`Action: ${filters.action}`);
                if (filters.admin_username) activeFilters.push(`Admin: ${filters.admin_username}`);
                if (filters.start_date) activeFilters.push(`From: ${new Date(filters.start_date).toLocaleDateString()}`);
                if (filters.end_date) activeFilters.push(`To: ${new Date(filters.end_date).toLocaleDateString()}`);
                if (filters.status && filters.status !== 'all') activeFilters.push(`Status: ${filters.status}`);
                
                return activeFilters.length > 0 ? `Filters: ${activeFilters.join(', ')}` : 'All Records';
            };


            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Audit Logs Report - ${currentDate}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .header h1 { color: #333; margin-bottom: 5px; }
                        .header p { color: #666; }
                        .filter-info { background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0; font-weight: bold; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                        th { background-color: #f5f5f5; font-weight: bold; }
                        .status-success { color: #28a745; font-weight: bold; }
                        .status-failed { color: #dc3545; font-weight: bold; }
                        .action-login { color: #28a745; }
                        .action-logout { color: #6c757d; }
                        .action-update { color: #007bff; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Audit Logs Report</h1>
                        <p>Generated on ${currentDate}</p>
                        <div class="filter-info">${getFilterInfo()}</div>
                        <p>Total Records: ${allLogs.length}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Admin</th>
                                <th>Action</th>
                                <th>Status</th>
                                <th>Reference Number</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allLogs.map(log => `
                                <tr>
                                    <td>${formatTimestamp(log.philippine_timestamp || log.timestamp)}</td>
                                    <td>${log.admin_username || 'System'}</td>
                                    <td class="action-${log.action.toLowerCase().replace(' ', '-')}">${log.action}</td>
                                    <td class="status-${getStatusClass(log.details)}">${getStatusFromDetails(log.details)}</td>
                                    <td>${getReferenceNumber(log)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
                </html>
            `);
            
            printWindow.document.close();
            printWindow.print();
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Failed to export data. Please try again.');
        }
    };

    if (loading && logs.length === 0) {
        return (
            <div className="audit-logs-container">
                <div className="loading">Loading audit logs...</div>
            </div>
        );
    }

    return (
        <div className="audit-logs-container">
            <div className="audit-logs-header">
                <div className="header-content">
                    <h1>Audit Logs</h1>
                    <p>Track all administrative actions and system activities</p>
                </div>
            </div>


            {/* Quick Filters */}
            <div className="quick-filters">
                <div className="filters-header">
                    <h3>Quick Filters</h3>
                    <button 
                        className={`export-btn ${!isFilterActive() ? 'disabled' : ''}`}
                        onClick={exportToPDF}
                        disabled={!isFilterActive()}
                        title={!isFilterActive() ? "Please select a filter to export" : "Export to PDF"}
                    >
                        📄 Export PDF
                    </button>
                </div>
                <div className="quick-filter-buttons">
                    {QUICK_FILTERS.map(filter => (
                        <button
                            key={filter.value}
                            className={`quick-filter-btn ${selectedQuickFilter === filter.value ? 'active' : ''}`}
                            onClick={() => applyQuickFilter(filter.value)}
                        >
                            {filter.label}
                        </button>
                    ))}
                    <button 
                        className="toggle-filters-btn"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        {showFilters ? 'Hide' : 'Show'} Advanced Filters
                    </button>
                </div>
                {selectedQuickFilter && (
                    <div className="active-filter-info">
                        <span>Active filter: {QUICK_FILTERS.find(f => f.value === selectedQuickFilter)?.label}</span>
                        <button 
                            className="clear-quick-filter-btn"
                            onClick={() => applyQuickFilter('all')}
                        >
                            Clear Filter
                        </button>
                    </div>
                )}
            </div>

            {/* Advanced Filters */}
            {showFilters && (
                <div className="audit-filters">
                    <div className="filter-section">
                        <h4>Time Range</h4>
                        <div className="filter-row">
                            <div className="filter-group">
                                <label>Start Date:</label>
                                <input
                                    type="date"
                                    name="start_date"
                                    value={filters.start_date}
                                    onChange={handleFilterChange}
                                />
                            </div>
                            <div className="filter-group">
                                <label>End Date:</label>
                                <input
                                    type="date"
                                    name="end_date"
                                    value={filters.end_date}
                                    onChange={handleFilterChange}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="filter-section">
                        <h4>Action Type</h4>
                        <div className="filter-row">
                            <div className="filter-group">
                                <label>Action:</label>
                                <select
                                    name="action"
                                    value={filters.action}
                                    onChange={handleFilterChange}
                                >
                                    {ACTION_FILTERS.map(filter => (
                                        <option key={filter.value} value={filter.value}>
                                            {filter.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="filter-group">
                                <label>Status:</label>
                                <select
                                    name="status"
                                    value={filters.status}
                                    onChange={handleFilterChange}
                                >
                                    {STATUS_FILTERS.map(filter => (
                                        <option key={filter.value} value={filter.value}>
                                            {filter.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="filter-section">
                        <div className="filter-row">
                            <div className="filter-group">
                                <label>Admin Username:</label>
                                <input
                                    type="text"
                                    name="admin_username"
                                    value={filters.admin_username}
                                    onChange={handleFilterChange}
                                    placeholder="Filter by username..."
                                />
                            </div>
                            <div className="filter-group">
                                <button className="clear-filters-btn" onClick={clearFilters}>
                                    Clear All Filters
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Logs Table */}
            <div className="audit-logs-table-container">
                <table className="audit-logs-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Admin</th>
                            <th>Action</th>
                            <th>Status</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id}>
                                <td className="timestamp">
                                    <div className="timestamp-content">
                                        <div className="time">{formatTimestamp(log.philippine_timestamp || log.timestamp)}</div>
                                        <div className="date">{new Date(log.philippine_timestamp || log.timestamp).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit'
                                        })}</div>
                                    </div>
                                </td>
                                <td className="admin">
                                    <div className="admin-info">
                                        <div className="admin-name">{log.admin_username || 'System'}</div>
                                        <div className="admin-role">{log.admin_role || 'Administrator'}</div>
                                    </div>
                                </td>
                                <td className="action">
                                    <div className="action-content">
                                        <span className="action-icon">{getActionIcon(log.action)}</span>
                                        <span 
                                            className="action-badge"
                                            style={{ backgroundColor: getActionColor(log.action) }}
                                        >
                                            {log.action === 'Admin Login' ? 'Login' : 
                                             log.action === 'Admin Logout' ? 'Logout' : 
                                             log.action}
                                        </span>
                                    </div>
                                </td>
                                <td className="status">
                                    <span className={`status-badge ${getStatusClass(log.details)}`}>
                                        {getStatusFromDetails(log.details)}
                                    </span>
                                </td>
                                <td className="details">
                                    <button 
                                        className="view-details-btn"
                                        onClick={() => handleViewDetails(log)}
                                        title="View detailed information"
                                    >
                                        View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="pagination">
                    <button 
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="pagination-btn"
                    >
                        Previous
                    </button>
                    
                    <span className="pagination-info">
                        Page {pagination.page} of {pagination.totalPages} 
                        ({pagination.total} total logs)
                    </span>
                    
                    <button 
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className="pagination-btn"
                    >
                        Next
                    </button>
                </div>
            )}

            {logs.length === 0 && !loading && (
                <div className="no-logs">
                    No audit logs found matching your criteria.
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedLog && (
                <div className="modal-overlay" onClick={closeDetailsModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Audit Log Details</h3>
                            <button className="close-btn" onClick={closeDetailsModal}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-item">
                                <span className="label">Timestamp:</span>
                                <span className="value">{formatTimestamp(selectedLog.philippine_timestamp || selectedLog.timestamp)}</span>
                            </div>
                            <div className="detail-item">
                                <span className="label">Admin:</span>
                                <span className="value">{selectedLog.admin_username || 'System'}</span>
                            </div>
                            <div className="detail-item">
                                <span className="label">Action:</span>
                                <span className="value">{selectedLog.action}</span>
                            </div>
                            <div className="detail-item">
                                <span className="label">Status:</span>
                                <span className="value">{getStatusFromDetails(selectedLog.details)}</span>
                            </div>
                            <div className="detail-item">
                                <span className="label">Reference Number:</span>
                                <span className="value">{getReferenceNumber(selectedLog)}</span>
                            </div>
                            
                            {selectedLog.details && (
                                <div className="detail-item" style={{ display: 'block' }}>
                                    <span className="label">Request Details:</span>
                                    <div style={{ marginTop: 8, padding: 12, backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                                        <pre style={{ margin: 0, fontSize: 12, color: '#374151', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                            {JSON.stringify(JSON.parse(selectedLog.details), null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={closeDetailsModal}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogs; 