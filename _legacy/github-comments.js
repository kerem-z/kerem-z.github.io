// GitHub Issues-based Comments System
// Automatically creates links to GitHub issues for blog post discussions

// Configuration - Update these with your GitHub details
const GITHUB_CONFIG = {
    username: 'kerem-z',  // Your GitHub username
    repository: 'kerem-z.github.io',  // Your repository name
    issueLabels: ['blog-comment', 'discussion']  // Labels to add to issues
};

document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.endsWith('post.html')) {
        initGitHubComments();
    }
});

function initGitHubComments() {
    const urlParams = new URLSearchParams(window.location.search);
    const postFile = urlParams.get('post');
    
    if (!postFile) return;
    
    // Generate issue title from post
    const postTitle = document.title.split(' - ')[0] || 'Blog Post Discussion';
    const postUrl = window.location.href;
    
    // Setup comment links
    setupCommentLinks(postTitle, postUrl, postFile);
    
    // Track comment clicks
    trackCommentInteractions();
}

function setupCommentLinks(postTitle, postUrl, postFile) {
    const viewCommentsLink = document.getElementById('view-comments-link');
    const newCommentLink = document.getElementById('new-comment-link');
    
    if (!viewCommentsLink || !newCommentLink) return;
    
    // Generate issue title for consistency
    const issueTitle = `Discussion: ${postTitle}`;
    
    // Setup "View Discussion" link - searches for existing issues
    const searchQuery = encodeURIComponent(`"${issueTitle}" in:title`);
    const searchUrl = `https://github.com/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repository}/issues?q=${searchQuery}`;
    viewCommentsLink.href = searchUrl;
    
    // Setup "Start Discussion" link - creates new issue
    const issueBody = generateIssueTemplate(postTitle, postUrl, postFile);
    const newIssueUrl = `https://github.com/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repository}/issues/new?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}&labels=${GITHUB_CONFIG.issueLabels.join(',')}`;
    newCommentLink.href = newIssueUrl;
}

function generateIssueTemplate(postTitle, postUrl, postFile) {
    return `## Discussion for: ${postTitle}

**Post URL:** ${postUrl}
**Post File:** \`${postFile}\`

---

### Comments and Discussion

Please share your thoughts, questions, or feedback about this blog post.

**Guidelines:**
- Feel free to ask questions or share related resources
- Code examples and technical discussions are welcome

---

*This issue was created for blog post discussions. You can reference specific parts of the post by quoting them.*

### Your Comment:

<!-- Write your comment below this line -->

`;
}

function trackCommentInteractions() {
    const commentButtons = document.querySelectorAll('.comments-btn');
    
    commentButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const action = button.id === 'view-comments-link' ? 'view_discussion' : 'start_discussion';
            
            // Track the interaction
            if (typeof trackEvent !== 'undefined') {
                trackEvent('github_comment_interaction', {
                    action: action,
                    post_title: document.title.split(' - ')[0],
                    post_url: window.location.href
                });
            }
        });
    });
}

// Utility function to check if issues exist for current post
async function checkExistingIssues(postTitle) {
    try {
        const query = encodeURIComponent(`"Discussion: ${postTitle}" in:title repo:${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repository}`);
        const searchUrl = `https://api.github.com/search/issues?q=${query}`;
        
        const response = await fetch(searchUrl);
        if (!response.ok) return null;
        
        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.warn('Failed to check existing issues:', error);
        return null;
    }
}

// Enhanced functionality to show issue count (optional)
async function updateCommentCounts() {
    const postTitle = document.title.split(' - ')[0];
    const issues = await checkExistingIssues(postTitle);
    
    if (issues && issues.length > 0) {
        const viewLink = document.getElementById('view-comments-link');
        if (viewLink) {
            const count = issues.length;
            const commentsText = count === 1 ? 'View Discussion (1 issue)' : `View Discussion (${count} issues)`;
            viewLink.innerHTML = `<i class="fas fa-comments"></i> ${commentsText}`;
            
            // Update the link to go directly to issues if only one exists
            if (count === 1) {
                viewLink.href = issues[0].html_url;
            }
        }
    }
}

// Initialize comment counts on page load (with rate limiting respect)
document.addEventListener('DOMContentLoaded', function() {
    // Only check for existing issues if we're not hitting rate limits
    const lastCheck = localStorage.getItem('github_comments_last_check');
    const now = Date.now();
    
    // Check at most once per hour to respect GitHub API rate limits
    if (!lastCheck || (now - parseInt(lastCheck)) > 3600000) {
        updateCommentCounts();
        localStorage.setItem('github_comments_last_check', now.toString());
    }
});

// Export configuration for admin panel
window.githubCommentsConfig = GITHUB_CONFIG;
