// Admin Analytics Dashboard
// Only accessible with correct credentials

// Simple authentication (you can change this password)
const ADMIN_PASSWORD = 'admin2024kerem'; // Change this to your preferred password

document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    setupAdminAuth();
});

function setupAdminAuth() {
    const loginForm = document.getElementById('admin-login-form');
    const loginSection = document.getElementById('login-section');
    const dashboard = document.getElementById('analytics-dashboard');
    
    // Check if already authenticated
    if (sessionStorage.getItem('admin_authenticated') === 'true') {
        showDashboard();
        return;
    }
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const password = document.getElementById('admin-password').value;
        const errorDiv = document.getElementById('login-error');
        
        if (password === ADMIN_PASSWORD) {
            sessionStorage.setItem('admin_authenticated', 'true');
            showDashboard();
        } else {
            errorDiv.textContent = 'Invalid access code. Please try again.';
            errorDiv.style.display = 'block';
            
            // Clear the error after 3 seconds
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 3000);
        }
    });
    
    function showDashboard() {
        loginSection.style.display = 'none';
        dashboard.style.display = 'block';
        loadAnalyticsData();
    }
}

function logout() {
    sessionStorage.removeItem('admin_authenticated');
    location.reload();
}

function loadAnalyticsData() {
    try {
        const analyticsData = JSON.parse(localStorage.getItem('blog_analytics') || '{}');
        
        // Load overview metrics
        loadOverviewMetrics(analyticsData);
        
        // Load page views
        loadPageViews(analyticsData.pageViews || {});
        
        // Load popular posts
        loadPopularPosts(analyticsData.popularPosts || {});
        
        // Load events
        loadEvents(analyticsData.events || []);
        
        // Load performance metrics
        loadPerformanceMetrics(analyticsData.events || []);
        
    } catch (error) {
        console.error('Error loading analytics data:', error);
        showError('Failed to load analytics data');
    }
}

function loadOverviewMetrics(data) {
    const container = document.getElementById('overview-metrics');
    
    const totalPageViews = Object.values(data.pageViews || {}).reduce((a, b) => a + b, 0);
    const totalPosts = Object.keys(data.popularPosts || {}).length;
    const totalEvents = (data.events || []).length;
    const sessionDuration = calculateSessionDuration(data);
    
    const metrics = [
        { label: 'Total Page Views', value: totalPageViews },
        { label: 'Posts Viewed', value: totalPosts },
        { label: 'User Interactions', value: totalEvents },
        { label: 'Avg Session (min)', value: sessionDuration }
    ];
    
    container.innerHTML = metrics.map(metric => `
        <div class="metric-card">
            <span class="metric-value">${metric.value}</span>
            <div class="metric-label">${metric.label}</div>
        </div>
    `).join('');
}

function loadPageViews(pageViews) {
    const tbody = document.querySelector('#page-views-table tbody');
    const total = Object.values(pageViews).reduce((a, b) => a + b, 0);
    
    const rows = Object.entries(pageViews)
        .sort(([,a], [,b]) => b - a)
        .map(([page, views]) => {
            const percentage = total > 0 ? Math.round((views / total) * 100) : 0;
            const pageName = getPageName(page);
            
            return `
                <tr>
                    <td>${pageName}</td>
                    <td>${views}</td>
                    <td>${percentage}%</td>
                </tr>
            `;
        });
    
    tbody.innerHTML = rows.join('');
}

function loadPopularPosts(popularPosts) {
    const tbody = document.querySelector('#popular-posts-table tbody');
    
    if (Object.keys(popularPosts).length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">No post data available</td></tr>';
        return;
    }
    
    const rows = Object.entries(popularPosts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([post, views]) => {
            const postName = getPostName(post);
            const engagementScore = calculateEngagementScore(post);
            
            return `
                <tr>
                    <td>${postName}</td>
                    <td>${views}</td>
                    <td>${engagementScore}</td>
                </tr>
            `;
        });
    
    tbody.innerHTML = rows.join('');
}

function loadEvents(events) {
    const tbody = document.querySelector('#events-table tbody');
    
    const eventCounts = {};
    events.forEach(event => {
        eventCounts[event.name] = (eventCounts[event.name] || 0) + 1;
    });
    
    const totalEvents = events.length;
    const rows = Object.entries(eventCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 15)
        .map(([eventName, count]) => {
            const frequency = totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0;
            
            return `
                <tr>
                    <td>${formatEventName(eventName)}</td>
                    <td>${count}</td>
                    <td>${frequency}%</td>
                </tr>
            `;
        });
    
    tbody.innerHTML = rows.length > 0 ? rows.join('') : '<tr><td colspan="3">No interaction data available</td></tr>';
}

function loadPerformanceMetrics(events) {
    const container = document.getElementById('performance-metrics');
    
    const perfEvents = events.filter(e => e.name === 'page_performance');
    const readingSessions = events.filter(e => e.name === 'reading_session');
    
    let performanceHTML = '';
    
    if (perfEvents.length > 0) {
        const loadTimes = perfEvents.map(e => e.parameters.load_time);
        const avgLoadTime = Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length);
        const minLoadTime = Math.min(...loadTimes);
        const maxLoadTime = Math.max(...loadTimes);
        
        performanceHTML += `
            <div class="analytics-grid">
                <div class="metric-card">
                    <span class="metric-value">${avgLoadTime}ms</span>
                    <div class="metric-label">Avg Load Time</div>
                </div>
                <div class="metric-card">
                    <span class="metric-value">${minLoadTime}ms</span>
                    <div class="metric-label">Best Load Time</div>
                </div>
                <div class="metric-card">
                    <span class="metric-value">${maxLoadTime}ms</span>
                    <div class="metric-label">Worst Load Time</div>
                </div>
            </div>
        `;
    }
    
    if (readingSessions.length > 0) {
        const readingTimes = readingSessions.map(e => e.parameters.reading_time);
        const completionRates = readingSessions.map(e => e.parameters.completion_percentage);
        
        const avgReadingTime = Math.round(readingTimes.reduce((a, b) => a + b, 0) / readingTimes.length);
        const avgCompletionRate = Math.round(completionRates.reduce((a, b) => a + b, 0) / completionRates.length);
        
        performanceHTML += `
            <div class="analytics-grid" style="margin-top: var(--space-lg);">
                <div class="metric-card">
                    <span class="metric-value">${avgReadingTime}s</span>
                    <div class="metric-label">Avg Reading Time</div>
                </div>
                <div class="metric-card">
                    <span class="metric-value">${avgCompletionRate}%</span>
                    <div class="metric-label">Avg Completion Rate</div>
                </div>
                <div class="metric-card">
                    <span class="metric-value">${readingSessions.length}</span>
                    <div class="metric-label">Total Reading Sessions</div>
                </div>
            </div>
        `;
    }
    
    if (!performanceHTML) {
        performanceHTML = '<p>No performance data available yet.</p>';
    }
    
    container.innerHTML = performanceHTML;
}

// Helper functions
function getPageName(path) {
    const pageNames = {
        '/': 'Home',
        '/index.html': 'Home',
        '/blog-list.html': 'Blog List',
        '/research.html': 'Research',
        '/post.html': 'Blog Post'
    };
    
    return pageNames[path] || path;
}

function getPostName(postPath) {
    return postPath.replace('blog/', '').replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatEventName(eventName) {
    return eventName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function calculateEngagementScore(postFile) {
    // Simple engagement score based on views and interactions
    const analyticsData = JSON.parse(localStorage.getItem('blog_analytics') || '{}');
    const events = analyticsData.events || [];
    const views = analyticsData.popularPosts[postFile] || 0;
    
    const postEvents = events.filter(e => e.parameters.post_file === postFile);
    const interactions = postEvents.length;
    
    // Score: views * 2 + interactions * 5
    return Math.round(views * 2 + interactions * 5);
}

function calculateSessionDuration(data) {
    const events = data.events || [];
    const sessionEvents = events.filter(e => e.name === 'time_on_page');
    
    if (sessionEvents.length === 0) return 0;
    
    const totalTime = sessionEvents.reduce((sum, event) => sum + (event.parameters.time_spent || 0), 0);
    return Math.round(totalTime / sessionEvents.length / 60); // Convert to minutes
}

// Export and utility functions
function exportAnalytics() {
    try {
        const analyticsData = JSON.parse(localStorage.getItem('blog_analytics') || '{}');
        const exportData = {
            ...analyticsData,
            exportDate: new Date().toISOString(),
            summary: {
                totalPageViews: Object.values(analyticsData.pageViews || {}).reduce((a, b) => a + b, 0),
                totalPosts: Object.keys(analyticsData.popularPosts || {}).length,
                totalEvents: (analyticsData.events || []).length
            }
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `blog-analytics-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        alert('Analytics data exported successfully!');
    } catch (error) {
        console.error('Export failed:', error);
        alert('Failed to export analytics data');
    }
}

function clearAnalytics() {
    if (confirm('Are you sure you want to clear all analytics data? This action cannot be undone.')) {
        localStorage.removeItem('blog_analytics');
        loadAnalyticsData();
        alert('Analytics data cleared successfully!');
    }
}

function showError(message) {
    const container = document.getElementById('overview-metrics');
    container.innerHTML = `<div class="error-message">${message}</div>`;
}

// Make functions available globally
window.exportAnalytics = exportAnalytics;
window.clearAnalytics = clearAnalytics;
window.logout = logout;
