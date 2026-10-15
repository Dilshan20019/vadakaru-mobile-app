import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trash2, 
  Search, 
  RefreshCw, 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  Calendar, 
  ShieldAlert,
  Sparkles,
  Users,
  Building2,
  HardHat,
  Phone,
  Award,
  Clock,
  UserCheck,
  Check,
  User,
  Layers
} from 'lucide-react';
import './App.css';

const API_BASE = 'http://localhost:5000/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('listings'); // 'listings' | 'workers'
  const [listingSubFilter, setListingSubFilter] = useState('ALL'); // 'ALL' | 'EMPLOYERS' | 'WORKERS'
  
  const [listings, setListings] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [selectedEmployerId, setSelectedEmployerId] = useState('ALL');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dbStatus, setDbStatus] = useState('checking');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrade, setSelectedTrade] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Deletion modal state
  const [deletingId, setDeletingId] = useState(null);
  const [confirmModalListing, setConfirmModalListing] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  // Check backend & DB status
  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) throw new Error('Backend unreachable');
      const data = await res.json();
      setDbStatus(data.database === 'connected' ? 'connected' : 'disconnected');
    } catch (e) {
      setDbStatus('unreachable');
    }
  };

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      await checkHealth();

      const [listingsRes, employersRes, workersRes] = await Promise.all([
        fetch(`${API_BASE}/listings`),
        fetch(`${API_BASE}/employers`),
        fetch(`${API_BASE}/workers`),
      ]);

      const [listingsData, employersData, workersData] = await Promise.all([
        listingsRes.json(),
        employersRes.json(),
        workersRes.json(),
      ]);

      if (listingsData.success) {
        setListings(listingsData.data || []);
      }
      if (employersData.success) {
        setEmployers(employersData.data || []);
      }
      if (workersData.success) {
        setWorkers(workersData.data || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Cannot connect to Admin Express Backend (http://localhost:5000). Ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const triggerNotice = (text, type = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => {
      setActionNotice(null);
    }, 4500);
  };

  // Delete listing permanently
  const handleDeleteListing = async (listingId) => {
    setDeletingId(listingId);
    try {
      const res = await fetch(`${API_BASE}/listings/${listingId}`, {
        method: 'DELETE',
      });
      const result = await res.json();

      if (result.success) {
        setListings((prev) => prev.filter((item) => item._id !== listingId));
        triggerNotice(result.message || 'Listing deleted successfully from the app database.', 'success');
        setConfirmModalListing(null);
      } else {
        triggerNotice(result.message || 'Failed to delete listing', 'error');
      }
    } catch (err) {
      triggerNotice('Error executing delete request: ' + err.message, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Unique trades for listings filter
  const uniqueTrades = useMemo(() => {
    const set = new Set(listings.map((l) => l.trade).filter(Boolean));
    return Array.from(set).sort();
  }, [listings]);

  // Unique trades for workers filter
  const workerTrades = useMemo(() => {
    const set = new Set(workers.map((w) => w.primaryTrade).filter(Boolean));
    return Array.from(set).sort();
  }, [workers]);

  // Count listings by author role
  const employerListingsCount = useMemo(() => {
    return listings.filter((l) => (l.employer?.role || 'employer') === 'employer').length;
  }, [listings]);

  const workerListingsCount = useMemo(() => {
    return listings.filter((l) => l.employer?.role === 'worker').length;
  }, [listings]);

  // Filter listings
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      const posterRole = item.employer?.role || 'employer';
      
      // Separate by employee / worker
      if (listingSubFilter === 'EMPLOYERS' && posterRole !== 'employer') return false;
      if (listingSubFilter === 'WORKERS' && posterRole !== 'worker') return false;

      const empName = item.employer?.companyName || item.employer?.fullName || '';
      const matchesSearch =
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.district?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.town?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item._id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.trade?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        empName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTrade = selectedTrade === 'ALL' || item.trade === selectedTrade;
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      
      const employerId = typeof item.employer === 'object' ? item.employer?._id : item.employer;
      const matchesEmployer = selectedEmployerId === 'ALL' || String(employerId) === selectedEmployerId;

      return matchesSearch && matchesTrade && matchesStatus && matchesEmployer;
    });
  }, [listings, searchQuery, selectedTrade, statusFilter, selectedEmployerId, listingSubFilter]);

  // Filter workers
  const filteredWorkers = useMemo(() => {
    return workers.filter((worker) => {
      const matchesSearch =
        worker.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        worker.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        worker.phone?.includes(searchQuery) ||
        worker.homeDistrict?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        worker.nearestTown?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        worker.primaryTrade?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTrade = selectedTrade === 'ALL' || worker.primaryTrade === selectedTrade;

      return matchesSearch && matchesTrade;
    });
  }, [workers, searchQuery, selectedTrade]);

  return (
    <div className="admin-container">
      {/* Top Navbar */}
      <header className="admin-header">
        <div className="header-brand">
          <div className="brand-icon">
            <ShieldAlert size={22} color="#fff" />
          </div>
          <div>
            <div className="brand-title-wrap">
              <h1 className="brand-title">Vedakaru Mobile App</h1>
              <span className="badge-admin">Admin Portal</span>
            </div>
            <p className="brand-subtitle">Manage listings by employee & worker, and view registered workers</p>
          </div>
        </div>

        <div className="header-meta">
          {/* Main Navigation Tabs */}
          <nav className="nav-tabs">
            <button
              className={`nav-tab-btn ${activeTab === 'listings' ? 'active' : ''}`}
              onClick={() => { setActiveTab('listings'); setSearchQuery(''); setSelectedTrade('ALL'); }}
            >
              <Briefcase size={16} />
              <span>Job Listings</span>
              <span className="tab-pill">{listings.length}</span>
            </button>

            <button
              className={`nav-tab-btn ${activeTab === 'workers' ? 'active' : ''}`}
              onClick={() => { setActiveTab('workers'); setSearchQuery(''); setSelectedTrade('ALL'); }}
            >
              <HardHat size={16} />
              <span>Workers</span>
              <span className="tab-pill">{workers.length}</span>
            </button>
          </nav>

          <div className={`db-status-pill ${dbStatus}`}>
            <Database size={14} />
            <span>
              {dbStatus === 'connected' && 'Database Connected'}
              {dbStatus === 'disconnected' && 'DB Connecting'}
              {dbStatus === 'unreachable' && 'Express Server Offline'}
              {dbStatus === 'checking' && 'Checking...'}
            </span>
          </div>

          <button 
            className="btn-refresh" 
            onClick={fetchData} 
            disabled={loading}
            title="Refresh from MongoDB"
          >
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div className={`notification-toast ${actionNotice.type}`}>
          {actionNotice.type === 'success' ? (
            <CheckCircle2 size={18} color="#10b981" />
          ) : (
            <AlertTriangle size={18} color="#ef4444" />
          )}
          <span>{actionNotice.text}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="admin-main">
        {/* Controls Bar */}
        <section className="controls-panel">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder={activeTab === 'listings' ? "Search by title, posted by, trade, district..." : "Search worker by name, trade, phone, district..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>×</button>
            )}
          </div>

          <div className="filter-group">
            {activeTab === 'listings' ? (
              <>
                {/* Filter jobs by employer */}
                <div className="filter-item">
                  <label><Building2 size={14} style={{ display: 'inline', marginRight: 4 }} />Poster / Employer:</label>
                  <select 
                    value={selectedEmployerId} 
                    onChange={(e) => setSelectedEmployerId(e.target.value)}
                    className="employer-select"
                  >
                    <option value="ALL">All Posters ({employers.length})</option>
                    {employers.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.companyName ? `${emp.companyName} (${emp.fullName})` : emp.fullName} [{emp.jobCount || 0} jobs]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-item">
                  <label>Trade:</label>
                  <select value={selectedTrade} onChange={(e) => setSelectedTrade(e.target.value)}>
                    <option value="ALL">All Trades ({uniqueTrades.length})</option>
                    {uniqueTrades.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-item">
                  <label>Status:</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="ALL">All Status</option>
                    <option value="open">Open</option>
                    <option value="filled">Filled</option>
                    <option value="closed">Closed</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="filter-item">
                <label>Trade:</label>
                <select value={selectedTrade} onChange={(e) => setSelectedTrade(e.target.value)}>
                  <option value="ALL">All Trades ({workerTrades.length})</option>
                  {workerTrades.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        {/* TAB 1: LISTINGS */}
        {activeTab === 'listings' && (
          <>
            {/* SUB-FILTER TABS: All, Posted by Employers, Posted by Workers */}
            <div className="subfilter-container">
              <span className="subfilter-title">Filter by Origin:</span>
              <div className="subfilter-tabs">
                <button
                  className={`subfilter-btn ${listingSubFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setListingSubFilter('ALL')}
                >
                  <Layers size={14} />
                  <span>All Listings</span>
                  <span className="sub-count">{listings.length}</span>
                </button>

                <button
                  className={`subfilter-btn ${listingSubFilter === 'EMPLOYERS' ? 'active employer-theme' : ''}`}
                  onClick={() => setListingSubFilter('EMPLOYERS')}
                >
                  <Building2 size={14} />
                  <span>Posted by Employers</span>
                  <span className="sub-count">{employerListingsCount}</span>
                </button>

                <button
                  className={`subfilter-btn ${listingSubFilter === 'WORKERS' ? 'active worker-theme' : ''}`}
                  onClick={() => setListingSubFilter('WORKERS')}
                >
                  <HardHat size={14} />
                  <span>Posted by Workers</span>
                  <span className="sub-count">{workerListingsCount}</span>
                </button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="stats-row">
              <div className="stat-card">
                <span className="stat-label">Total Listings</span>
                <span className="stat-value">{listings.length}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Employer Posts</span>
                <span className="stat-value employer-stat">{employerListingsCount}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Worker Posts</span>
                <span className="stat-value worker-stat">{workerListingsCount}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Active / Open</span>
                <span className="stat-value status-open">
                  {listings.filter((l) => l.status === 'open').length}
                </span>
              </div>
            </div>

            {loading && listings.length === 0 ? (
              <div className="loading-state">
                <RefreshCw size={36} className="spinning" />
                <p>Loading listings from database...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <AlertTriangle size={40} color="#ef4444" />
                <h3>Connection Notice</h3>
                <p>{error}</p>
                <button className="btn-primary" onClick={fetchData}>Retry Connection</button>
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="empty-state">
                <Briefcase size={40} color="#6b7280" />
                <h3>No Listings Found</h3>
                <p>No listings match your search or filter criteria in this section.</p>
              </div>
            ) : (
              <div className="listings-grid">
                {filteredListings.map((job) => {
                  const isWorkerPost = job.employer?.role === 'worker';

                  return (
                    <div key={job._id} className={`listing-card ${isWorkerPost ? 'worker-post' : 'employer-post'}`}>
                      <div className="listing-card-header">
                        <div className="trade-pill">{job.trade || 'General'}</div>
                        
                        {/* Distinct author indicator */}
                        <div className={`origin-badge ${isWorkerPost ? 'origin-worker' : 'origin-employer'}`}>
                          {isWorkerPost ? (
                            <>
                              <HardHat size={13} />
                              <span>Worker Post</span>
                            </>
                          ) : (
                            <>
                              <Building2 size={13} />
                              <span>Employer Post</span>
                            </>
                          )}
                        </div>

                        <div className={`status-badge ${job.status}`}>
                          {job.status || 'open'}
                        </div>
                      </div>

                      <h3 className="listing-title" title={job.title}>{job.title}</h3>
                      
                      {/* Posted By Details */}
                      <div className={`employer-badge-card ${isWorkerPost ? 'worker-bg' : 'employer-bg'}`}>
                        {isWorkerPost ? (
                          <User size={15} className="emp-icon worker-icon" />
                        ) : (
                          <Building2 size={15} className="emp-icon" />
                        )}
                        <div className="emp-details">
                          <span className="emp-name">
                            {job.employer?.companyName || job.employer?.fullName || 'Poster Details N/A'}
                          </span>
                          <span className="emp-phone">
                            {job.employer?.phone ? `Tel: ${job.employer.phone}` : 'No phone listed'} 
                            {isWorkerPost && ' (Worker)'}
                          </span>
                        </div>
                        {job.employer?.brVerified && (
                          <span className="br-tag" title="Business Registered">BR Verified</span>
                        )}
                      </div>

                      {job.description && (
                        <p className="listing-desc">{job.description}</p>
                      )}

                      <div className="listing-details">
                        <div className="detail-row">
                          <MapPin size={15} className="detail-icon" />
                          <span>{job.district}{job.town ? `, ${job.town}` : ''}</span>
                        </div>

                        <div className="detail-row">
                          <DollarSign size={15} className="detail-icon" />
                          <span>LKR {job.dailyWage?.toLocaleString() || 0} / day</span>
                        </div>

                        <div className="detail-row">
                          <Calendar size={15} className="detail-icon" />
                          <span>
                            {job.startDate ? `Starts: ${job.startDate}` : 'Flexible start'} 
                            {job.days ? ` (${job.days} ${job.days === 1 ? 'day' : 'days'})` : ''}
                          </span>
                        </div>

                        <div className="detail-row">
                          <Users size={15} className="detail-icon" />
                          <span>{job.workersNeeded || 1} worker(s) needed</span>
                        </div>
                      </div>

                      {job.urgent && (
                        <div className="urgent-badge">
                          <Sparkles size={13} />
                          <span>Urgent Requirement</span>
                        </div>
                      )}

                      <div className="listing-footer">
                        <div className="id-container" title={`ID: ${job._id}`}>
                          <span className="id-label">ID:</span>
                          <span className="id-code">{job._id}</span>
                        </div>

                        <button
                          className="btn-delete"
                          disabled={deletingId === job._id}
                          onClick={() => setConfirmModalListing(job)}
                          title="Remove listing from database"
                        >
                          <Trash2 size={16} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* TAB 2: WORKERS */}
        {activeTab === 'workers' && (
          <>
            <div className="stats-row">
              <div className="stat-card">
                <span className="stat-label">Total Registered Workers</span>
                <span className="stat-value">{workers.length}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Available Today</span>
                <span className="stat-value status-open">
                  {workers.filter((w) => w.availableToday).length}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">NIC Verified</span>
                <span className="stat-value highlight">
                  {workers.filter((w) => w.nicVerified).length}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Trades Represented</span>
                <span className="stat-value">{workerTrades.length}</span>
              </div>
            </div>

            {loading && workers.length === 0 ? (
              <div className="loading-state">
                <RefreshCw size={36} className="spinning" />
                <p>Loading workers from database...</p>
              </div>
            ) : filteredWorkers.length === 0 ? (
              <div className="empty-state">
                <HardHat size={40} color="#6b7280" />
                <h3>No Workers Found</h3>
                <p>No registered workers matched the search or trade filter.</p>
              </div>
            ) : (
              <div className="workers-grid">
                {filteredWorkers.map((worker) => (
                  <div key={worker._id} className="worker-card">
                    <div className="worker-card-header">
                      <div className="worker-avatar">
                        {worker.fullName?.charAt(0) || 'W'}
                      </div>
                      <div className="worker-main-info">
                        <div className="worker-name-row">
                          <h3 className="worker-name">{worker.fullName}</h3>
                          {worker.displayName && (
                            <span className="worker-alias">({worker.displayName})</span>
                          )}
                        </div>
                        <div className="worker-trade-line">
                          <span className="trade-pill">{worker.primaryTrade || 'General Worker'}</span>
                          <span className="authority-tag">{worker.authority || 'Helper'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="worker-attributes">
                      <div className="detail-row">
                        <Phone size={15} className="detail-icon" />
                        <span className="phone-val">{worker.phone}</span>
                      </div>

                      <div className="detail-row">
                        <MapPin size={15} className="detail-icon" />
                        <span>{worker.homeDistrict || 'Not set'}{worker.nearestTown ? `, ${worker.nearestTown}` : ''}</span>
                      </div>

                      <div className="detail-row">
                        <DollarSign size={15} className="detail-icon" />
                        <span>LKR {worker.wage?.fullDay?.toLocaleString() || 3500} / day (Full day)</span>
                      </div>

                      <div className="detail-row">
                        <Award size={15} className="detail-icon" />
                        <span>{worker.experienceYears || 0} years experience • {worker.jobsCompleted || 0} jobs completed</span>
                      </div>
                    </div>

                    <div className="worker-card-footer">
                      <div className="worker-badges">
                        {worker.availableToday ? (
                          <span className="avail-badge ready">
                            <Check size={12} /> Available Today
                          </span>
                        ) : (
                          <span className="avail-badge not-ready">
                            <Clock size={12} /> Unavailable
                          </span>
                        )}

                        {worker.nicVerified && (
                          <span className="nic-badge">
                            <UserCheck size={12} /> NIC Verified
                          </span>
                        )}
                      </div>

                      <div className="id-container" title={`Worker ID: ${worker._id}`}>
                        <span className="id-code">{worker._id}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Confirmation Modal */}
      {confirmModalListing && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div className="modal-icon-danger">
              <AlertTriangle size={28} color="#ef4444" />
            </div>
            
            <h3 className="modal-title">Delete Listing Permanently?</h3>
            
            <p className="modal-description">
              You are about to remove this listing from the mobile application database:
            </p>

            <div className="modal-item-summary">
              <strong>{confirmModalListing.title}</strong>
              <div>
                Author Type: <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{confirmModalListing.employer?.role || 'Employer'}</span>
              </div>
              <div>Posted By: {confirmModalListing.employer?.companyName || confirmModalListing.employer?.fullName || 'N/A'}</div>
              <div>Trade: {confirmModalListing.trade} | District: {confirmModalListing.district}</div>
              <div className="item-id">ID: {confirmModalListing._id}</div>
            </div>

            <p className="modal-warning">
              This action directly deletes the document from MongoDB. It will instantly disappear from the mobile app for all workers and employers.
            </p>

            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setConfirmModalListing(null)}
                disabled={Boolean(deletingId)}
              >
                Cancel
              </button>
              <button
                className="btn-confirm-delete"
                onClick={() => handleDeleteListing(confirmModalListing._id)}
                disabled={Boolean(deletingId)}
              >
                {deletingId === confirmModalListing._id ? (
                  <>
                    <RefreshCw size={16} className="spinning" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Yes, Delete Listing</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
