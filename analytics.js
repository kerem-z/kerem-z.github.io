// Analytics System for Kerem Zengin's Blog
// Tracks user engagement, popular content, and performance metrics

// Initialize analytics when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initAnalytics();
});

// Analytics System
function initAnalytics() {
    trackPageView();
    trackInteractions();
    trackPerformance();
    trackPopularContent();
}

function trackPageView() {
    // Google Analytics (when configured)
    if (typeof gtag !== 'undefined') {
        gtag('event', 'page_view', {
            page_title: document.title,
            page_location: window.location.href,
            page_path: window.location.pathname
        });
    }
    
    // Custom analytics storage
    const analytics = getAnalyticsData();
    const pagePath = window.location.pathname;
    
    analytics.pageViews = analytics.pageViews || {};
    analytics.pageViews[pagePath] = (analytics.pageViews[pagePath] || 0) + 1;
    analytics.lastVisit = new Date().toISOString();
    analytics.sessionStart = analytics.sessionStart || new Date().toISOString();
    
    saveAnalyticsData(analytics);
}

function trackInteractions() {
    // Track blog post clicks
    document.addEventListener('click', (e) => {
        const target = e.target.closest('a');
        if (!target) return;
        
        // Track blog post clicks
        if (target.href && target.href.includes('post.html?post=')) {
            const postFile = new URL(target.href).searchParams.get('post');
            trackEvent('blog_post_click', { post_file: postFile });
        }
        
        // Track external links
        if (target.href && target.hostname !== window.location.hostname) {
            trackEvent('external_link_click', { url: target.href, domain: target.hostname });
        }
        
        // Track navigation clicks
        if (target.classList.contains('nav-button')) {
            trackEvent('navigation_click', { page: target.textContent.trim() });
        }
        
        // Track category clicks
        if (target.classList.contains('category-tag')) {
            trackEvent('category_click', { category: target.textContent.trim() });
        }
        
        // Track related post clicks
        if (target.classList.contains('related-post-card')) {
            const title = target.querySelector('h3')?.textContent || 'unknown';
            trackEvent('related_post_click', { post_title: title });
        }
        
        // Track social share clicks
        if (target.classList.contains('share-button')) {
            const platform = target.dataset.platform || 'unknown';
            trackEvent('social_share', { platform: platform });
        }
    });
    
    // Track search usage
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        let searchStartTime;
        
        searchInput.addEventListener('focus', () => {
            searchStartTime = Date.now();
            trackEvent('search_focus');
        });
        
        const debouncedSearchTrack = debounce((e) => {
            if (e.target.value.length > 2) {
                const resultsCount = document.querySelectorAll('.blog-post').length;
                trackEvent('search_query', { 
                    query_length: e.target.value.length,
                    results_count: resultsCount,
                    has_results: resultsCount > 0
                });
            }
        }, 1000);
        
        searchInput.addEventListener('input', debouncedSearchTrack);
    }
    
    // Track theme changes
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            trackEvent('theme_change', { 
                from_theme: currentTheme,
                to_theme: newTheme 
            });
        });
    }
    
    // Track scroll depth
    let maxScrollDepth = 0;
    const trackScrollDepth = debounce(() => {
        const scrollTop = window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = Math.round((scrollTop / docHeight) * 100);
        
        if (scrollPercent > maxScrollDepth) {
            maxScrollDepth = scrollPercent;
            
            // Track milestone scroll depths
            const milestones = [25, 50, 75, 90, 100];
            const milestone = milestones.find(m => m <= scrollPercent && m > (maxScrollDepth - scrollPercent));
            
            if (milestone) {
                trackEvent('scroll_depth', { 
                    depth: milestone,
                    page: window.location.pathname 
                });
            }
        }
    }, 500);
    
    window.addEventListener('scroll', trackScrollDepth);
}

function trackPerformance() {
    // Track page load time
    window.addEventListener('load', () => {
        setTimeout(() => {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                const loadTime = Math.round(navigation.loadEventEnd - navigation.fetchStart);
                const domContentLoaded = Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart);
                
                trackEvent('page_performance', {
                    load_time: loadTime,
                    dom_content_loaded: domContentLoaded,
                    page: window.location.pathname,
                    performance_score: getPerformanceScore(loadTime)
                });
            }
        }, 100);
    });
    
    // Track reading time for blog posts
    if (window.location.pathname.endsWith('post.html')) {
        let startTime = Date.now();
        let isActive = true;
        let totalReadingTime = 0;
        let engagementEvents = 0;
        
        // Track engagement events
        ['scroll', 'click', 'keydown'].forEach(event => {
            document.addEventListener(event, () => {
                engagementEvents++;
            }, { passive: true });
        });
        
        // Track when user becomes inactive
        let inactivityTimer;
        function resetInactivityTimer() {
            clearTimeout(inactivityTimer);
            if (!isActive) {
                isActive = true;
                startTime = Date.now();
            }
            
            inactivityTimer = setTimeout(() => {
                if (isActive) {
                    totalReadingTime += Date.now() - startTime;
                    isActive = false;
                }
            }, 30000); // 30 seconds of inactivity
        }
        
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetInactivityTimer, { passive: true });
        });
        
        resetInactivityTimer(); // Start the timer
        
        // Track reading time on page unload
        window.addEventListener('beforeunload', () => {
            if (isActive) {
                totalReadingTime += Date.now() - startTime;
            }
            
            const urlParams = new URLSearchParams(window.location.search);
            const postFile = urlParams.get('post');
            
            if (postFile && totalReadingTime > 5000) { // More than 5 seconds
                const readingTimeSeconds = Math.round(totalReadingTime / 1000);
                const completionPercentage = calculateReadingProgress();
                
                trackEvent('reading_session', {
                    post_file: postFile,
                    reading_time: readingTimeSeconds,
                    completion_percentage: completionPercentage,
                    engagement_events: engagementEvents,
                    engagement_score: calculateEngagementScore(readingTimeSeconds, completionPercentage, engagementEvents)
                });
            }
        });
    }
}

function trackPopularContent() {
    const urlParams = new URLSearchParams(window.location.search);
    const postFile = urlParams.get('post');
    
    if (postFile) {
        const analytics = getAnalyticsData();
        analytics.popularPosts = analytics.popularPosts || {};
        analytics.popularPosts[postFile] = (analytics.popularPosts[postFile] || 0) + 1;
        saveAnalyticsData(analytics);
    }
    
    // Track time spent on different pages
    const startTime = Date.now();
    window.addEventListener('beforeunload', () => {
        const timeSpent = Math.round((Date.now() - startTime) / 1000);
        if (timeSpent > 5) { // Only track if spent more than 5 seconds
            trackEvent('time_on_page', {
                page: window.location.pathname,
                time_spent: timeSpent
            });
        }
    });
}

function trackEvent(eventName, parameters = {}) {
    // Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, parameters);
    }
    
    // Custom analytics storage
    const analytics = getAnalyticsData();
    analytics.events = analytics.events || [];
    analytics.events.push({
        name: eventName,
        parameters: parameters,
        timestamp: new Date().toISOString(),
        page: window.location.pathname,
        referrer: document.referrer,
        userAgent: navigator.userAgent.substring(0, 100) // Truncated for privacy
    });
    
    // Keep only last 200 events to prevent storage bloat
    if (analytics.events.length > 200) {
        analytics.events = analytics.events.slice(-200);
    }
    
    saveAnalyticsData(analytics);
}

function getAnalyticsData() {
    try {
        return JSON.parse(localStorage.getItem('blog_analytics') || '{}');
    } catch (e) {
        console.warn('Failed to parse analytics data:', e);
        return {};
    }
}

function saveAnalyticsData(data) {
    try {
        localStorage.setItem('blog_analytics', JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save analytics data:', e);
    }
}

function calculateReadingProgress() {
    const article = document.querySelector('article');
    if (!article) return 0;
    
    const scrollTop = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    return Math.min(Math.max(Math.round((scrollTop / docHeight) * 100), 0), 100);
}

function getPerformanceScore(loadTime) {
    if (loadTime < 1000) return 'excellent';
    if (loadTime < 3000) return 'good';
    if (loadTime < 5000) return 'average';
    return 'poor';
}

function calculateEngagementScore(readingTime, completionPercentage, engagementEvents) {
    let score = 0;
    
    // Reading time score (max 40 points)
    score += Math.min(readingTime / 10, 40);
    
    // Completion score (max 40 points)
    score += (completionPercentage / 100) * 40;
    
    // Engagement events score (max 20 points)
    score += Math.min(engagementEvents / 5, 20);
    
    return Math.round(score);
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Analytics Dashboard (for development/debugging)
function getAnalyticsSummary() {
    const analytics = getAnalyticsData();
    const events = analytics.events || [];
    
    return {
        overview: {
            totalPageViews: Object.values(analytics.pageViews || {}).reduce((a, b) => a + b, 0),
            totalEvents: events.length,
            sessionStart: analytics.sessionStart,
            lastVisit: analytics.lastVisit
        },
        pageViews: analytics.pageViews || {},
        popularPosts: getTopPosts(analytics.popularPosts || {}),
        topEvents: getTopEvents(events),
        recentActivity: events.slice(-10).reverse(),
        performanceMetrics: getPerformanceMetrics(events),
        engagementMetrics: getEngagementMetrics(events)
    };
}

function getTopPosts(popularPosts) {
    return Object.entries(popularPosts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([post, views]) => ({ post, views }));
}

function getTopEvents(events) {
    const eventCounts = {};
    events.forEach(event => {
        eventCounts[event.name] = (eventCounts[event.name] || 0) + 1;
    });
    
    return Object.entries(eventCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));
}

function getPerformanceMetrics(events) {
    const perfEvents = events.filter(e => e.name === 'page_performance');
    if (perfEvents.length === 0) return null;
    
    const loadTimes = perfEvents.map(e => e.parameters.load_time);
    return {
        averageLoadTime: Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length),
        minLoadTime: Math.min(...loadTimes),
        maxLoadTime: Math.max(...loadTimes),
        totalMeasurements: loadTimes.length
    };
}

function getEngagementMetrics(events) {
    const readingSessions = events.filter(e => e.name === 'reading_session');
    if (readingSessions.length === 0) return null;
    
    const readingTimes = readingSessions.map(e => e.parameters.reading_time);
    const completionRates = readingSessions.map(e => e.parameters.completion_percentage);
    
    return {
        averageReadingTime: Math.round(readingTimes.reduce((a, b) => a + b, 0) / readingTimes.length),
        averageCompletionRate: Math.round(completionRates.reduce((a, b) => a + b, 0) / completionRates.length),
        totalReadingSessions: readingSessions.length
    };
}

// Analytics functions are private - access via admin panel only
// Admin panel: /admin.html
