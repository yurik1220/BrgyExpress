import React, { useState, useEffect } from "react";
import api from "../lib/fetch";
import Watermark from "../components/Watermark";
import ProtectedUploadImage from "../components/ProtectedUploadImage";
import "../styles/IdRequests.css";

const IdRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [activeTab, setActiveTab] = useState("pending");
    const [showModal, setShowModal] = useState(false);
    const [showActionModal, setShowActionModal] = useState(false);
    const [actionType, setActionType] = useState("");
    const [actionNote, setActionNote] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [searchRef, setSearchRef] = useState("");
    const [analysis, setAnalysis] = useState({ id: null, selfie: null });
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisError, setAnalysisError] = useState(null);
    const [previewSrc, setPreviewSrc] = useState(null);
    const [blurredImages, setBlurredImages] = useState({
        governmentId: true,
        selfie: true,
        bill: true
    });

    // Utility: build absolute image URL from possible fields
    const API_BASE = process.env.REACT_APP_API_URL || window.__API_BASE__ || "http://localhost:5000";
    const toAbsoluteUrl = (value) => {
        if (!value || typeof value !== "string") return null;
        const v = value.trim();
        if (v.startsWith("http://") || v.startsWith("https://")) {
            return v; // honor absolute URLs
        }
        const path = v.startsWith("/") ? v : `/${v}`;
        return `${API_BASE}${path}`;
    };
    const pickFirst = (obj, keys) => {
        for (const k of keys) {
            if (obj && obj[k]) return obj[k];
        }
        return null;
    };

    // Fetch model analysis for a given image URL by proxying through backend
    // Deprecated remote analysis; prefer stored DB value from selectedRequest

    // Run analysis when opening the modal (selectedRequest changes)
    useEffect(() => {
        const run = async () => {
            if (!showModal || !selectedRequest) return;
            setAnalysisLoading(true);
            setAnalysisError(null);
            setAnalysis({ id: null, selfie: null, bill: null });
            const prob = typeof selectedRequest.bill_prob_tampered === 'number'
                ? selectedRequest.bill_prob_tampered
                : null;
            const threshold = typeof selectedRequest.bill_threshold_used === 'number' ? selectedRequest.bill_threshold_used : 0.7;
            setAnalysis({ id: null, selfie: null, bill: prob !== null ? { prob, threshold } : null });
            if (prob === null) {
                setAnalysisError('');
            }
            setAnalysisLoading(false);
        };
        run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showModal, selectedRequest]);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const response = await api.get("/api/requests");
            // Filter only ID requests from the response
            const idRequests = response.data
                .filter(item => item.type === 'Create ID')
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            // Auto-generate ID cards for approved requests that don't have them
            const approvedRequestsWithoutId = idRequests.filter(req => 
                req.status === 'approved' && !req.id_card_url
            );
            
            for (const request of approvedRequestsWithoutId) {
                try {
                    console.log('Auto-generating ID card for request:', request.id);
                    await api.post(`/api/id-requests/${request.id}/generate-id-card`);
                } catch (err) {
                    console.error('Failed to generate ID card for request:', request.id, err);
                }
            }
            
            // Refetch requests to get updated data with ID cards
            if (approvedRequestsWithoutId.length > 0) {
                const updatedResponse = await api.get("/api/requests");
                const updatedIdRequests = updatedResponse.data
                    .filter(item => item.type === 'Create ID')
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setRequests(updatedIdRequests);
            } else {
                setRequests(idRequests);
            }
            
            setLoading(false);
        } catch (err) {
            setError("Failed to fetch ID requests");
            setLoading(false);
        }
    };

    const handleAction = async (requestId, action) => {
        setActionType(action);
        setSelectedRequest(requests.find(req => req.id === requestId));
        setShowActionModal(true);
    };

    const submitAction = async () => {
        try {
            await api.patch(`/api/id-requests/${selectedRequest.id}`, {
                status: actionType,
                rejection_reason: actionNote,
                appointment_date: actionType === 'approved' ? new Date().toISOString() : null
            });
            await fetchRequests();
            setShowActionModal(false);
            setActionNote("");
        } catch (err) {
            setError("Failed to update request status");
        }
    };

    // Directly complete an approved request without opening the action modal
    const completeRequest = async (requestId) => {
        try {
            await api.patch(`/api/id-requests/${requestId}`, { status: 'completed' });
            await fetchRequests();
            setShowModal(false);
            setActiveTab('history');
        } catch (err) {
            setError("Failed to update request status");
        }
    };

    const generateIdCard = async (requestId) => {
        try {
            setLoading(true);
            await api.post(`/api/id-requests/${requestId}/generate-id-card`);
            await fetchRequests();
            setShowModal(false);
        } catch (err) {
            setError("Failed to generate ID card");
            setLoading(false);
        }
    };

    const filteredRequests = requests.filter(request => {
        if (activeTab === "pending") {
            return request.status === "pending";
        } else if (activeTab === "processing") {
            return request.status === "approved";
        } else if (activeTab === "history") {
            return request.status === "rejected" || request.status === "completed";
        }
        return true;
    }).filter(request =>
        searchRef.trim() === "" ||
        (request.reference_number && request.reference_number.toLowerCase().includes(searchRef.trim().toLowerCase()))
    );

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading ID requests...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <i className="fas fa-exclamation-circle"></i>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="id-requests-container">
            <Watermark />
            
            {/* Enhanced Header */}
            <div className="content-header">
                <div className="header-content">
                    <div className="header-icon-wrapper">
                        <i className="fas fa-id-card header-icon"></i>
                    </div>
                    <div className="header-text">
                        <h1>ID Requests</h1>
                        <p>Process and manage ID card requests from residents</p>
                    </div>
                </div>
                <div className="header-stats">
                    <div className="stat-badge pending">
                        <div className="stat-icon">
                            <i className="fas fa-clock"></i>
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{requests.filter(req => req.status === "pending").length}</span>
                            <span className="stat-label">Pending</span>
                        </div>
                    </div>
                    <div className="stat-badge approved">
                        <div className="stat-icon">
                            <i className="fas fa-check-circle"></i>
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{requests.filter(req => req.status === "approved").length}</span>
                            <span className="stat-label">Approved</span>
                        </div>
                    </div>
                    <div className="stat-badge total">
                        <div className="stat-icon">
                            <i className="fas fa-id-card"></i>
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{requests.length}</span>
                            <span className="stat-label">Total</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Tabs */}
            <div className="tabs-container">
                <div className="tabs-header">
                    <div className="tabs">
                        <button
                            className={`tab-button ${activeTab === "pending" ? "active" : ""}`}
                            onClick={() => setActiveTab("pending")}
                        >
                            <i className="fas fa-clock"></i>
                            <span>Pending Requests</span>
                            <span className="tab-count">{requests.filter(req => req.status === "pending").length}</span>
                        </button>
                        <button
                            className={`tab-button ${activeTab === "processing" ? "active" : ""}`}
                            onClick={() => setActiveTab("processing")}
                        >
                            <i className="fas fa-print"></i>
                            <span>For Processing</span>
                            <span className="tab-count">{requests.filter(req => req.status === "approved").length}</span>
                        </button>
                        <button
                            className={`tab-button ${activeTab === "history" ? "active" : ""}`}
                            onClick={() => setActiveTab("history")}
                        >
                            <i className="fas fa-history"></i>
                            <span>History</span>
                            <span className="tab-count">{requests.filter(req => req.status !== "pending").length}</span>
                        </button>
                    </div>

                    <div className="search-container">
                        <div className="search-wrapper">
                            <i className="fas fa-search search-icon"></i>
                            <input
                                type="text"
                                placeholder="Search by Reference Number..."
                                value={searchRef}
                                onChange={e => setSearchRef(e.target.value)}
                                className="search-input"
                            />
                            {searchRef && (
                                <button 
                                    className="clear-search"
                                    onClick={() => setSearchRef("")}
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                {activeTab === "history" && (
                    <div className="filter-container">
                        <select
                            className="filter-select"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Enhanced Requests Grid */}
            <div className="requests-grid">
                {filteredRequests.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <i className="fas fa-id-card"></i>
                        </div>
                        <h3>No ID Requests Found</h3>
                        <p>No {activeTab} ID requests available.</p>
                    </div>
                ) : (
                    filteredRequests.map(request => (
                        <div
                            key={request.id}
                            className={`request-card ${request.status}-card`}
                            onClick={() => {
                                setSelectedRequest(request);
                                setShowModal(true);
                            }}
                        >
                            <div className="card-header">
                                <div className="request-info">
                                    <span className="request-type">
                                        <i className="fas fa-id-card"></i>
                                        ID Request
                                    </span>
                                    <span className="reference-number">
                                        #{request.reference_number}
                                    </span>
                                </div>
                                <span className={`status-badge ${request.status}`}>
                                    <i className={`fas fa-${request.status === 'approved' ? 'check' : request.status === 'rejected' ? 'times' : 'clock'}`}></i>
                                    {request.status}
                                </span>
                            </div>
                            <div className="card-body">
                                <div className="info-section">
                                    <div className="info-row">
                                        <i className="fas fa-user"></i>
                                        <span className="label">Name:</span>
                                        <span className="value">{request.full_name}</span>
                                    </div>
                                    {/* Birth Date/Address/Contact moved to details modal */}
                                    <div className="info-row">
                                        <i className="fas fa-clock"></i>
                                        <span className="label">Requested:</span>
                                        <span className="value">{new Date(request.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {activeTab === 'processing' && (
                                        <div className="info-row">
                                            <i className="fas fa-id-card"></i>
                                            <span className="label">Digital ID:</span>
                                            {request.id_card_url ? (
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <a 
                                                        href={toAbsoluteUrl(request.id_card_url)} 
                                                        target="_blank" 
                                                        rel="noreferrer" 
                                                        className="value" 
                                                        style={{ color: '#2563eb', textDecoration: 'underline' }}
                                                    >
                                                        View
                                                    </a>
                                                    <a 
                                                        href={toAbsoluteUrl(request.id_card_url)} 
                                                        download={`ID_${request.reference_number || request.id}.png`}
                                                        className="value" 
                                                        style={{ color: '#059669', textDecoration: 'underline', fontSize: '12px' }}
                                                    >
                                                        <i className="fas fa-download"></i> Download
                                                    </a>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <span style={{ color: '#6b7280', fontSize: '12px' }}>Not generated</span>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            generateIdCard(request.id);
                                                        }}
                                                        style={{ 
                                                            background: '#3b82f6', 
                                                            color: 'white', 
                                                            border: 'none', 
                                                            padding: '4px 8px', 
                                                            borderRadius: '4px', 
                                                            fontSize: '11px',
                                                            cursor: 'pointer'
                                                        }}
                                                        disabled={loading}
                                                    >
                                                        <i className="fas fa-id-card"></i> Generate
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {/* Actions moved into detail modal */}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Enhanced Detail Modal */}
            {showModal && selectedRequest && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>ID Request Details</h3>
                            <button className="close-btn" onClick={() => setShowModal(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                                <div className="request-details">
                                <div className="detail-item">
                                    <span className="label">Reference Number:</span>
                                    <span className="value">#{selectedRequest.reference_number}</span>
                                </div>
                                <div className="detail-item">
                                        <span className="label">Full Name:</span>
                                        <span className="value">{selectedRequest.requester_name || selectedRequest.full_name}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Birth Date:</span>
                                    <span className="value">{new Date(selectedRequest.birth_date).toLocaleDateString()}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Address:</span>
                                    <span className="value">{selectedRequest.address}</span>
                                </div>
                                    <div className="detail-item">
                                        <span className="label">Contact Number:</span>
                                        <span className="value">{selectedRequest.requester_phone || selectedRequest.contact}</span>
                                    </div>
                                <div className="detail-item">
                                    <span className="label">Request Date:</span>
                                    <span className="value">{new Date(selectedRequest.created_at).toLocaleString()}</span>
                                </div>
                                {selectedRequest.status !== "pending" && (
                                    <div className="detail-item">
                                        <span className="label">Processed Date:</span>
                                        <span className="value">{new Date(selectedRequest.resolved_at).toLocaleString()}</span>
                                    </div>
                                )}
                                {selectedRequest.rejection_reason && (
                                    <div className="detail-item">
                                        <span className="label">Rejection Reason:</span>
                                        <span className="value">{selectedRequest.rejection_reason}</span>
                                    </div>
                                )}
                                {selectedRequest.appointment_date && (
                                    <div className="detail-item">
                                        <span className="label">Appointment Date:</span>
                                        <span className="value">{new Date(selectedRequest.appointment_date).toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            {/* Images Section */}
                            <div style={{ marginTop: 16 }}>
                                <h4 style={{ margin: 0, marginBottom: 8 }}>Submitted Images</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    {/* Government ID */}
                                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                            <i className="fas fa-id-card" style={{ color: '#6366f1' }}></i>
                                            <span style={{ fontWeight: 600 }}>Government ID</span>
                                            {analysisLoading && <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280' }}>Analyzing…</span>}
                                        </div>
                                        {(() => {
                                            const idVal = pickFirst(selectedRequest, [
                                                'id_image_url', 'id_image', 'idImageUrl', 'idImagePath', 'idImage'
                                            ]);
                                            const src = toAbsoluteUrl(idVal);
                                            return src ? (
                                                    <>
                                                    <div style={{ position: 'relative' }}>
                                                        <ProtectedUploadImage 
                                                            src={src} 
                                                            alt="Government ID" 
                                                            style={{ 
                                                                width: '100%', 
                                                                height: 200, 
                                                                objectFit: 'cover', 
                                                                borderRadius: 8,
                                                                filter: blurredImages.governmentId ? 'blur(10px)' : 'none',
                                                                transition: 'filter 0.3s ease'
                                                            }} 
                                                        />
                                                        {blurredImages.governmentId && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setBlurredImages(prev => ({ ...prev, governmentId: false })); }}
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: '50%',
                                                                    left: '50%',
                                                                    transform: 'translate(-50%, -50%)',
                                                                    background: 'rgba(0, 0, 0, 0.8)',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    padding: '10px 20px',
                                                                    borderRadius: 8,
                                                                    cursor: 'pointer',
                                                                    fontSize: 13,
                                                                    fontWeight: 600,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 6,
                                                                    zIndex: 10
                                                                }}
                                                            >
                                                                <i className="fas fa-eye"></i> View
                                                            </button>
                                                        )}
                                                        {!blurredImages.governmentId && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setPreviewSrc(src); }}
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: 8,
                                                                    right: 8,
                                                                    background: 'rgba(0, 0, 0, 0.7)',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    padding: '6px 12px',
                                                                    borderRadius: 6,
                                                                    cursor: 'pointer',
                                                                    fontSize: 12,
                                                                    fontWeight: 600,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 4
                                                                }}
                                                            >
                                                                <i className="fas fa-expand"></i> View Full
                                                            </button>
                                                        )}
                                                    </div>
                                                    {analysis?.id && !analysis?.id?.error && typeof analysis.id.prob === 'number' && (
                                                        (() => {
                                                            const threshold = Math.max(analysis.id.threshold || 0.7, 0.7);
                                                            const score = (analysis.id.prob * 100);
                                                            const isTampered = analysis.id.prob >= threshold;
                                                            return (
                                                                <div style={{ marginTop: 8 }}>
                                                                    <div style={{ fontSize: 13, fontWeight: 700, color: isTampered ? '#dc2626' : '#16a34a' }}>
                                                                        {isTampered ? `Possible Tampering (Score: ${score.toFixed(1)}%)` : `No Clear Signs of Tampering (Score: ${score.toFixed(1)}%)`}
                                                                    </div>
                                                                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                                                                        {isTampered ? 'This image may have been altered or manipulated.' : 'No significant signs of manipulation detected.'}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()
                                                    )}
                                                    {analysisError && (
                                                        <div style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>{analysisError}</div>
                                                    )}
                                                </>
                                            ) : (
                                                <div style={{ fontSize: 13, color: '#6b7280' }}>No ID image available</div>
                                            );
                                        })()}
                                    </div>

                                    {/* Live Selfie */}
                                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                            <i className="fas fa-camera" style={{ color: '#6366f1' }}></i>
                                            <span style={{ fontWeight: 600 }}>Live Selfie</span>
                                            {analysisLoading && <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280' }}>Analyzing…</span>}
                                        </div>
                                        {(() => {
                                            const selfieVal = pickFirst(selectedRequest, [
                                                'selfie_image_url', 'selfie_image', 'selfieImageUrl', 'selfieImagePath', 'selfieImage'
                                            ]);
                                            const src = toAbsoluteUrl(selfieVal);
                                            return src ? (
                                                    <>
                                                    <div style={{ position: 'relative' }}>
                                                        <ProtectedUploadImage 
                                                            src={src} 
                                                            alt="Live Selfie" 
                                                            style={{ 
                                                                width: '100%', 
                                                                height: 200, 
                                                                objectFit: 'cover', 
                                                                borderRadius: 8,
                                                                filter: blurredImages.selfie ? 'blur(10px)' : 'none',
                                                                transition: 'filter 0.3s ease'
                                                            }} 
                                                        />
                                                        {blurredImages.selfie && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setBlurredImages(prev => ({ ...prev, selfie: false })); }}
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: '50%',
                                                                    left: '50%',
                                                                    transform: 'translate(-50%, -50%)',
                                                                    background: 'rgba(0, 0, 0, 0.8)',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    padding: '10px 20px',
                                                                    borderRadius: 8,
                                                                    cursor: 'pointer',
                                                                    fontSize: 13,
                                                                    fontWeight: 600,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 6,
                                                                    zIndex: 10
                                                                }}
                                                            >
                                                                <i className="fas fa-eye"></i> View
                                                            </button>
                                                        )}
                                                        {!blurredImages.selfie && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setPreviewSrc(src); }}
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: 8,
                                                                    right: 8,
                                                                    background: 'rgba(0, 0, 0, 0.7)',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    padding: '6px 12px',
                                                                    borderRadius: 6,
                                                                    cursor: 'pointer',
                                                                    fontSize: 12,
                                                                    fontWeight: 600,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 4
                                                                }}
                                                            >
                                                                <i className="fas fa-expand"></i> View Full
                                                            </button>
                                                        )}
                                                    </div>
                                                    {analysis?.selfie && !analysis?.selfie?.error && typeof analysis.selfie.prob === 'number' && (
                                                        (() => {
                                                            const threshold = Math.max(analysis.selfie.threshold || 0.7, 0.7);
                                                            const score = (analysis.selfie.prob * 100);
                                                            const isTampered = analysis.selfie.prob >= threshold;
                                                            return (
                                                                <div style={{ marginTop: 8 }}>
                                                                    <div style={{ fontSize: 13, fontWeight: 700, color: isTampered ? '#dc2626' : '#16a34a' }}>
                                                                        {isTampered ? `Possible Tampering (Score: ${score.toFixed(1)}%)` : `Authentic (Score: ${score.toFixed(1)}%)`}
                                                                    </div>
                                                                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                                                                        {isTampered ? 'This image may have been altered or manipulated.' : 'No significant signs of manipulation detected.'}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()
                                                    )}
                                                    {analysisError && (
                                                        <div style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>{analysisError}</div>
                                                    )}
                                                </>
                                            ) : (
                                                <div style={{ fontSize: 13, color: '#6b7280' }}>No selfie image available</div>
                                            );
                                        })()}
                                    </div>
                                    {/* Meralco Bill */}
                                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                            <i className="fas fa-file-invoice-dollar" style={{ color: '#6366f1' }}></i>
                                            <span style={{ fontWeight: 600 }}>Meralco Bill</span>
                                            {analysisLoading && <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280' }}>Analyzing…</span>}
                                        </div>
                                        {(() => {
                                            const billVal = pickFirst(selectedRequest, [
                                                'bill_image_url', 'billImageUrl', 'bill_image'
                                            ]);
                                            const src = toAbsoluteUrl(billVal);
                                            return src ? (
                                                    <>
                                                    <div style={{ position: 'relative' }}>
                                                        <ProtectedUploadImage 
                                                            src={src} 
                                                            alt="Meralco Bill" 
                                                            style={{ 
                                                                width: '100%', 
                                                                height: 200, 
                                                                objectFit: 'cover', 
                                                                borderRadius: 8,
                                                                filter: blurredImages.bill ? 'blur(10px)' : 'none',
                                                                transition: 'filter 0.3s ease'
                                                            }} 
                                                        />
                                                        {blurredImages.bill && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setBlurredImages(prev => ({ ...prev, bill: false })); }}
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: '50%',
                                                                    left: '50%',
                                                                    transform: 'translate(-50%, -50%)',
                                                                    background: 'rgba(0, 0, 0, 0.8)',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    padding: '10px 20px',
                                                                    borderRadius: 8,
                                                                    cursor: 'pointer',
                                                                    fontSize: 13,
                                                                    fontWeight: 600,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 6,
                                                                    zIndex: 10
                                                                }}
                                                            >
                                                                <i className="fas fa-eye"></i> View
                                                            </button>
                                                        )}
                                                        {!blurredImages.bill && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setPreviewSrc(src); }}
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: 8,
                                                                    right: 8,
                                                                    background: 'rgba(0, 0, 0, 0.7)',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    padding: '6px 12px',
                                                                    borderRadius: 6,
                                                                    cursor: 'pointer',
                                                                    fontSize: 12,
                                                                    fontWeight: 600,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 4
                                                                }}
                                                            >
                                                                <i className="fas fa-expand"></i> View Full
                                                            </button>
                                                        )}
                                                    </div>
                                                    {analysis?.bill && !analysis?.bill?.error && typeof analysis.bill.prob === 'number' && (
                                                        (() => {
                                                            const threshold = Math.max(analysis.bill.threshold || 0.7, 0.7);
                                                            const score = (analysis.bill.prob * 100);
                                                            const isTampered = analysis.bill.prob >= threshold;
                                                            return (
                                                                <div style={{ marginTop: 8 }}>
                                                                    <div style={{ fontSize: 13, fontWeight: 700, color: isTampered ? '#dc2626' : '#16a34a' }}>
                                                                        {isTampered ? `Possible Tampering (Score: ${score.toFixed(1)}%)` : `Authentic (Score: ${score.toFixed(1)}%)`}
                                                                    </div>
                                                                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                                                                        {isTampered ? 'This image may have been altered or manipulated.' : 'No significant signs of manipulation detected.'}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()
                                                    )}
                                                    {!analysis?.bill || analysis?.bill?.error ? (
                                                        <div style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>Failed to analyze bill</div>
                                                    ) : null}
                                                </>
                                            ) : (
                                                <div style={{ fontSize: 13, color: '#6b7280' }}>No Meralco bill image available</div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            {selectedRequest?.status === 'pending' && (
                                <>
                                    <button 
                                        className="btn-success"
                                        onClick={() => handleAction(selectedRequest.id, 'approved')}
                                    >
                                        <i className="fas fa-check"></i>
                                        Approve
                                    </button>
                                    <button 
                                        className="btn-danger"
                                        onClick={() => handleAction(selectedRequest.id, 'rejected')}
                                    >
                                        <i className="fas fa-times"></i>
                                        Reject
                                    </button>
                                </>
                            )}
                            {selectedRequest?.status === 'approved' && (
                                <>
                                    {!selectedRequest.id_card_url && (
                                        <button 
                                            className="btn-primary"
                                            onClick={() => generateIdCard(selectedRequest.id)}
                                            disabled={loading}
                                        >
                                            <i className="fas fa-id-card"></i>
                                            {loading ? 'Generating...' : 'Generate ID'}
                                        </button>
                                    )}
                                    <button 
                                        className="btn-success"
                                        onClick={() => completeRequest(selectedRequest.id)}
                                    >
                                        <i className="fas fa-check-circle"></i>
                                        Completed
                                    </button>
                                </>
                            )}
                            <button className="btn-secondary" onClick={() => setShowModal(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Action Modal */}
            {showActionModal && selectedRequest && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>
                                {actionType === "approved" ? "Approve ID Request" : "Reject ID Request"}
                            </h3>
                            <button className="close-btn" onClick={() => setShowActionModal(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>
                                {actionType === "approved" 
                                    ? "Are you sure you want to approve this ID request?" 
                                    : "Please provide a reason for rejecting this ID request:"
                                }
                            </p>
                            {actionType === "rejected" && (
                                <textarea
                                    value={actionNote}
                                    onChange={(e) => setActionNote(e.target.value)}
                                    placeholder="Enter rejection reason..."
                                    className="rejection-textarea"
                                />
                            )}
                            {/* Summary removed; details are shown in the details modal */}
                        </div>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowActionModal(false)}>
                                Cancel
                            </button>
                            <button 
                                className={actionType === "approved" ? "btn-success" : "btn-danger"}
                                onClick={submitAction}
                                disabled={actionType === "rejected" && !actionNote.trim()}
                            >
                                {actionType === "approved" ? "Approve Request" : "Reject Request"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Preview Modal */}
            {previewSrc && (
                <div className="modal-overlay" onClick={() => setPreviewSrc(null)}>
                    <div className="modal" style={{ maxWidth: 900 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Image Preview</h3>
                            <button className="close-btn" onClick={() => setPreviewSrc(null)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <ProtectedUploadImage src={previewSrc} alt="Preview" style={{ width: '100%', maxHeight: 600, objectFit: 'contain', borderRadius: 8 }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IdRequests;