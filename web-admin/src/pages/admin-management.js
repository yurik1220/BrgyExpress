import React, { useState, useEffect } from 'react';
import api from '../lib/fetch';
import '../styles/AdminManagement.css';

const AdminManagement = () => {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        full_name: '',
        role: 'admin'
    });
    const [formErrors, setFormErrors] = useState({});
    const [actionLoading, setActionLoading] = useState({});

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/admin/accounts');
            setAdmins(response.data.admins);
        } catch (err) {
            console.error('Error fetching admins:', err);
            setError('Failed to fetch admin accounts');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
        if (formErrors[name]) {
            setFormErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const errors = {};
        
        if (!formData.username.trim()) {
            errors.username = 'Username is required';
        } else if (formData.username.length < 3) {
            errors.username = 'Username must be at least 3 characters';
        }
        
        if (!formData.password) {
            errors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            errors.password = 'Password must be at least 6 characters';
        }
        
        if (!formData.full_name.trim()) {
            errors.full_name = 'Full name is required';
        } else if (formData.full_name.length < 2) {
            errors.full_name = 'Full name must be at least 2 characters';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        try {
            setActionLoading({ create: true });
            await api.post('/api/admin/accounts', formData);
            
            // Reset form and close modal
            setFormData({ username: '', password: '', full_name: '', role: 'admin' });
            setFormErrors({});
            setShowAddForm(false);
            
            // Refresh admin list
            await fetchAdmins();
            
        } catch (err) {
            console.error('Error creating admin:', err);
            if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Failed to create admin account');
            }
        } finally {
            setActionLoading({ create: false });
        }
    };

    const handleToggleStatus = async (adminId, currentStatus) => {
        try {
            setActionLoading({ [adminId]: true });
            
            const endpoint = currentStatus === 'active' 
                ? `/api/admin/accounts/${adminId}/disable`
                : `/api/admin/accounts/${adminId}/enable`;
            
            await api.patch(endpoint);
            
            // Refresh admin list
            await fetchAdmins();
            
        } catch (err) {
            console.error('Error toggling admin status:', err);
            if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Failed to update admin status');
            }
        } finally {
            setActionLoading({ [adminId]: false });
        }
    };

    const getStatusBadge = (status) => {
        return status === 'active' ? 'success' : 'danger';
    };

    const getRoleBadge = (role) => {
        return role === 'super_admin' ? 'warning' : 'info';
    };

    if (loading) {
        return (
            <div className="admin-management-container">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading admin accounts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-management-container">
            <div className="page-header">
                <div className="header-content">
                    <h1>Manage Admin Accounts</h1>
                    <p>Create and manage administrator accounts</p>
                </div>
                <button 
                    className="btn btn-primary"
                    onClick={() => setShowAddForm(true)}
                >
                    <i className="fas fa-plus"></i>
                    Add New Admin
                </button>
            </div>

            {error && (
                <div className="alert alert-danger">
                    <i className="fas fa-exclamation-triangle"></i>
                    {error}
                    <button 
                        className="alert-close"
                        onClick={() => setError(null)}
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            )}

            <div className="admin-list">
                <div className="list-header">
                    <h3>Admin Accounts ({admins.length})</h3>
                </div>
                
                {admins.length === 0 ? (
                    <div className="empty-state">
                        <i className="fas fa-user-shield"></i>
                        <h3>No Admin Accounts</h3>
                        <p>No admin accounts found in the system.</p>
                    </div>
                ) : (
                    <div className="admin-grid">
                        {admins.map((admin) => (
                            <div key={admin.id} className="admin-card">
                                <div className="admin-header">
                                    <div className="admin-avatar">
                                        {admin.full_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="admin-info">
                                        <h4>{admin.full_name}</h4>
                                        <p className="admin-username">@{admin.username}</p>
                                    </div>
                                    <div className="admin-badges">
                                        <span className={`badge ${getRoleBadge(admin.role)}`}>
                                            {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                                        </span>
                                        <span className={`badge ${getStatusBadge(admin.status)}`}>
                                            {admin.status}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="admin-details">
                                    <div className="detail-item">
                                        <i className="fas fa-calendar"></i>
                                        <span>Created: {new Date(admin.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                
                                <div className="admin-actions">
                                    <button
                                        className={`btn ${admin.status === 'active' ? 'btn-warning' : 'btn-success'}`}
                                        onClick={() => handleToggleStatus(admin.id, admin.status)}
                                        disabled={actionLoading[admin.id]}
                                    >
                                        {actionLoading[admin.id] ? (
                                            <i className="fas fa-spinner fa-spin"></i>
                                        ) : (
                                            <i className={`fas ${admin.status === 'active' ? 'fa-ban' : 'fa-check'}`}></i>
                                        )}
                                        {admin.status === 'active' ? 'Disable' : 'Enable'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Admin Modal */}
            {showAddForm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Add New Admin Account</h3>
                            <button 
                                className="modal-close"
                                onClick={() => {
                                    setShowAddForm(false);
                                    setFormData({ username: '', password: '', full_name: '', role: 'admin' });
                                    setFormErrors({});
                                }}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="admin-form">
                            <div className="form-group">
                                <label htmlFor="username">Username</label>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    className={formErrors.username ? 'error' : ''}
                                    placeholder="Enter username"
                                />
                                {formErrors.username && (
                                    <span className="error-message">{formErrors.username}</span>
                                )}
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="password">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className={formErrors.password ? 'error' : ''}
                                    placeholder="Enter password"
                                />
                                {formErrors.password && (
                                    <span className="error-message">{formErrors.password}</span>
                                )}
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="full_name">Full Name</label>
                                <input
                                    type="text"
                                    id="full_name"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleInputChange}
                                    className={formErrors.full_name ? 'error' : ''}
                                    placeholder="Enter full name"
                                />
                                {formErrors.full_name && (
                                    <span className="error-message">{formErrors.full_name}</span>
                                )}
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="role">Role</label>
                                <select
                                    id="role"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleInputChange}
                                >
                                    <option value="admin">Admin</option>
                                    <option value="super_admin">Super Admin</option>
                                </select>
                                <small className="form-help">
                                    Super Admin can manage other admin accounts
                                </small>
                            </div>
                            
                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setFormData({ username: '', password: '', full_name: '', role: 'admin' });
                                        setFormErrors({});
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={actionLoading.create}
                                >
                                    {actionLoading.create ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin"></i>
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-plus"></i>
                                            Create Admin
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminManagement;
