document.addEventListener('DOMContentLoaded', function() {
    const isPostPage = window.location.pathname.endsWith('post.html');
    const isBlogPage = window.location.pathname.endsWith('blog-list.html');

    // Initialize dark mode
    initTheme();
    
    // Add event listener for dark mode toggle
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Initialize keyboard navigation
    initKeyboardNav();
    
    // Initialize analytics
    initAnalytics();

    if (isPostPage) {
        loadBlogPost();
        initReadingProgress();
    } else if (isBlogPage) {
        loadBlogList();
        initSearch();
    }
});

// Keyboard Navigation
function initKeyboardNav() {
    document.addEventListener('keydown', function(e) {
        // Alt + Left Arrow: Previous Page
        if (e.altKey && e.key === 'ArrowLeft') {
            const prevLink = document.querySelector('.pagination-button:first-child');
            if (prevLink) prevLink.click();
        }
        // Alt + Right Arrow: Next Page
        if (e.altKey && e.key === 'ArrowRight') {
            const nextLink = document.querySelector('.pagination-button:last-child');
            if (nextLink) nextLink.click();
        }
        // Alt + H: Home
        if (e.altKey && e.key === 'h') {
            window.location.href = 'index.html';
        }
        // Alt + B: Blog
        if (e.altKey && e.key === 'b') {
            window.location.href = 'blog.html';
        }
    });
}

// Theme handling
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('.theme-toggle i');
    if (icon) {
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

// Blog list loading
async function loadBlogList() {
    const blogList = document.getElementById('blog-list');
    
    // Show loading skeleton
    showLoadingSkeleton(blogList);
    
    try {
        const response = await fetch('posts.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const posts = await response.json();
        
        const urlParams = new URLSearchParams(window.location.search);
        const currentPage = parseInt(urlParams.get('page')) || 1;
        const selectedCategory = urlParams.get('category');
        const postsPerPage = 5;

        // Filter posts by category if one is selected
        let filteredPosts = posts;
        if (selectedCategory) {
            filteredPosts = filteredPosts.filter(post => 
                post.categories && post.categories.includes(selectedCategory)
            );
        }
        
        // Apply sorting based on current selection
        const sortValue = document.getElementById('sort-select')?.value || 'date-desc';
        filteredPosts = sortPosts(filteredPosts, sortValue);

        const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
        const start = (currentPage - 1) * postsPerPage;
        const end = start + postsPerPage;
        const currentPosts = filteredPosts.slice(start, end);

        if (!blogList) {
            console.error('Blog list container not found');
            return;
        }

        // Clear loading state
        blogList.innerHTML = '';
        
        if (filteredPosts.length === 0) {
            blogList.innerHTML = `<p>No posts found${selectedCategory ? ` in category "${selectedCategory}"` : ''}.</p>`;
            return;
        }

        currentPosts.forEach((post, index) => {
            const postElement = document.createElement('div');
            postElement.className = 'blog-post';
            
            const postCategories = post.categories && post.categories.length > 0 
                ? post.categories.map(cat => `<span class="category-tag">${cat}</span>`).join('')
                : '';
            
            const readingTime = post.readingTime ? `${post.readingTime} min read` : '';
            
            postElement.innerHTML = `
                <h2><a href="post.html?post=${encodeURIComponent(post.file)}">${post.title}</a></h2>
                <div class="post-meta">
                    <span class="post-date">${post.date}</span>
                    ${readingTime ? `<span class="reading-time">${readingTime}</span>` : ''}
                    ${postCategories}
                </div>
                <p class="post-description">${post.description}</p>
            `;
            
            // Add fade-in animation with delay
            postElement.style.animationDelay = `${index * 0.1}s`;
            postElement.classList.add('fade-in');
            
            blogList.appendChild(postElement);
        });

        updatePagination(currentPage, totalPages, selectedCategory);
        updateCategories(posts, selectedCategory);

    } catch (error) {
        console.error('Error loading blog list:', error);
        if (blogList) {
            showErrorState(blogList, 'Failed to load blog posts', error.message, () => loadBlogList());
        }
    }
}

function updatePagination(currentPage, totalPages, selectedCategory = null) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    let paginationHTML = '';
    
    // Previous button
    if (currentPage > 1) {
        const prevPageUrl = selectedCategory 
            ? `?page=${currentPage - 1}&category=${encodeURIComponent(selectedCategory)}`
            : `?page=${currentPage - 1}`;
        paginationHTML += `<a href="${prevPageUrl}" class="pagination-button">
            <i class="fas fa-chevron-left"></i> Previous
        </a>`;
    }

    // Next button
    if (currentPage < totalPages) {
        const nextPageUrl = selectedCategory 
            ? `?page=${currentPage + 1}&category=${encodeURIComponent(selectedCategory)}`
            : `?page=${currentPage + 1}`;
        paginationHTML += `<a href="${nextPageUrl}" class="pagination-button">
            Next <i class="fas fa-chevron-right"></i>
        </a>`;
    }

    pagination.innerHTML = paginationHTML;
}

function updateCategories(posts, selectedCategory = null) {
    const categoriesList = document.getElementById('categories-list');
    if (!categoriesList) return;

    // Extract unique categories
    const categories = new Set();
    posts.forEach(post => {
        if (post.categories) {
            post.categories.forEach(category => categories.add(category));
        }
    });

    // Create category links without post counts
    const categoryHTML = Array.from(categories)
        .map(category => {
            const isActive = category === selectedCategory;
            return `
                <li class="sidebar-item">
                    <a href="?category=${encodeURIComponent(category)}" 
                       class="sidebar-link${isActive ? ' active' : ''}">
                        ${category}
                    </a>
                </li>
            `;
        })
        .sort()
        .join('');

    // Add "All Posts" link at the top
    const allPostsLink = `
        <li class="sidebar-item">
            <a href="?" class="sidebar-link${!selectedCategory ? ' active' : ''}">
                All Posts
            </a>
        </li>
    `;

    categoriesList.innerHTML = allPostsLink + categoryHTML || '<li class="sidebar-item">No categories found</li>';
}


// Helper function to format author names
function formatAuthors(authors) {
    return authors.split(' and ')
        .map(author => author.trim())
        .join(', ');
}

function updateResearchLinks(doi) {
    const linksContainer = document.querySelector('.research-links');
    if (!linksContainer) return;

    linksContainer.innerHTML = `
        <a href="https://doi.org/${doi}" class="research-link" target="_blank" rel="noopener">
            <i class="fas fa-external-link-alt"></i> DOI
        </a>
        <a href="https://scholar.google.com/scholar?q=${doi}" class="research-link" target="_blank" rel="noopener">
            <i class="fas fa-graduation-cap"></i> Google Scholar
        </a>
        <a href="https://arxiv.org/search/?query=${doi}" class="research-link" target="_blank" rel="noopener">
            <i class="fas fa-file-pdf"></i> arXiv
        </a>
        <a href="https://www.semanticscholar.org/search?q=${doi}" class="research-link" target="_blank" rel="noopener">
            <i class="fas fa-book"></i> Semantic Scholar
        </a>
    `;
}

// Search functionality
let allPosts = [];
let currentSearchTerm = '';

function initSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    // Load all posts for search
    loadAllPostsForSearch();

    searchInput.addEventListener('input', handleSearch);
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            searchInput.value = '';
            handleSearch({ target: { value: '' } });
        }
    });
}

async function loadAllPostsForSearch() {
    try {
        const response = await fetch('posts.json');
        allPosts = await response.json();
    } catch (error) {
        console.error('Error loading posts for search:', error);
    }
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    currentSearchTerm = searchTerm;

    if (!searchTerm) {
        // Reset to normal blog list
        loadBlogList();
        return;
    }

    const filteredPosts = allPosts.filter(post => {
        return post.title.toLowerCase().includes(searchTerm) ||
               post.description.toLowerCase().includes(searchTerm) ||
               (post.categories && post.categories.some(cat => cat.toLowerCase().includes(searchTerm)));
    });

    displaySearchResults(filteredPosts, searchTerm);
}

function displaySearchResults(posts, searchTerm) {
    const blogList = document.getElementById('blog-list');
    const pagination = document.getElementById('pagination');
    
    if (!blogList) return;

    // Clear pagination for search results
    if (pagination) pagination.innerHTML = '';

    if (posts.length === 0) {
        blogList.innerHTML = `
            <div class="search-no-results">
                <p>No posts found for "${searchTerm}"</p>
                <p class="search-suggestion">Try searching for different keywords or browse by categories.</p>
            </div>
        `;
        return;
    }

    blogList.innerHTML = `
        <div class="search-results-header">
            <p class="search-results-count">${posts.length} post${posts.length !== 1 ? 's' : ''} found for "${searchTerm}"</p>
        </div>
    `;

    posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.className = 'blog-post';
        
        // Highlight search terms
        const highlightedTitle = highlightSearchTerm(post.title, searchTerm);
        const highlightedDescription = highlightSearchTerm(post.description, searchTerm);
        
        const postCategories = post.categories && post.categories.length > 0 
            ? post.categories.map(cat => `<span class="category-tag">${highlightSearchTerm(cat, searchTerm)}</span>`).join('')
            : '';
        
        const readingTime = post.readingTime ? `${post.readingTime} min read` : '';
        
        postElement.innerHTML = `
            <h2><a href="post.html?post=${encodeURIComponent(post.file)}">${highlightedTitle}</a></h2>
            <div class="post-meta">
                <span class="post-date">${post.date}</span>
                ${readingTime ? `<span class="reading-time">${readingTime}</span>` : ''}
                ${postCategories}
            </div>
            <p class="post-description">${highlightedDescription}</p>
        `;
        blogList.appendChild(postElement);
    });
}

function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Reading Progress Functionality
function initReadingProgress() {
    const progressBar = document.querySelector('.reading-progress');
    const progressFill = document.querySelector('.reading-progress-bar');
    
    if (!progressBar || !progressFill) return;
    
    let ticking = false;
    
    function updateProgress() {
        const article = document.querySelector('article');
        if (!article) return;
        
        const scrollTop = window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = scrollTop / docHeight;
        const clampedPercent = Math.min(Math.max(scrollPercent, 0), 1);
        
        progressFill.style.width = `${clampedPercent * 100}%`;
        
        // Show/hide progress bar based on scroll position
        if (scrollTop > 100) {
            progressBar.classList.add('visible');
        } else {
            progressBar.classList.remove('visible');
        }
        
        ticking = false;
    }
    
    function requestUpdateProgress() {
        if (!ticking) {
            requestAnimationFrame(updateProgress);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestUpdateProgress);
    window.addEventListener('resize', requestUpdateProgress);
}

// Table of Contents Generation
function generateTableOfContents() {
    const article = document.querySelector('article');
    if (!article) return;
    
    const headings = article.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) return;
    
    // Create TOC container
    const tocContainer = document.createElement('div');
    tocContainer.className = 'table-of-contents';
    tocContainer.innerHTML = '<h3>Table of Contents</h3>';
    
    const tocList = document.createElement('ul');
    tocList.className = 'toc-list';
    
    headings.forEach((heading, index) => {
        // Add ID to heading if it doesn't have one
        if (!heading.id) {
            const id = heading.textContent
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            heading.id = `heading-${index}-${id}`;
        }
        
        // Create TOC item
        const tocItem = document.createElement('li');
        tocItem.className = `toc-item toc-${heading.tagName.toLowerCase()}`;
        
        const tocLink = document.createElement('a');
        tocLink.href = `#${heading.id}`;
        tocLink.textContent = heading.textContent;
        tocLink.className = 'toc-link';
        
        // Smooth scroll behavior
        tocLink.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.getElementById(heading.id);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Update URL without page jump
                history.pushState(null, null, `#${heading.id}`);
            }
        });
        
        tocItem.appendChild(tocLink);
        tocList.appendChild(tocItem);
    });
    
    tocContainer.appendChild(tocList);
    
    // Insert TOC after the first heading
    const firstHeading = article.querySelector('h1');
    if (firstHeading && firstHeading.nextSibling) {
        firstHeading.parentNode.insertBefore(tocContainer, firstHeading.nextSibling);
    }
}

// Related Posts Functionality
async function loadRelatedPosts(currentPostFile) {
    try {
        const response = await fetch('posts.json');
        const allPosts = await response.json();
        
        // Find current post
        const currentPost = allPosts.find(post => post.file === currentPostFile);
        if (!currentPost) return;
        
        // Find related posts based on categories and content similarity
        const relatedPosts = findRelatedPosts(currentPost, allPosts);
        
        displayRelatedPosts(relatedPosts);
        
    } catch (error) {
        console.error('Error loading related posts:', error);
        const container = document.getElementById('related-posts-container');
        if (container) {
            container.innerHTML = '<p class="related-posts-empty">Unable to load related posts.</p>';
        }
    }
}

function findRelatedPosts(currentPost, allPosts) {
    const otherPosts = allPosts.filter(post => post.file !== currentPost.file);
    
    // Score posts by relevance
    const scoredPosts = otherPosts.map(post => {
        let score = 0;
        
        // Category similarity (highest weight)
        if (currentPost.categories && post.categories) {
            const commonCategories = currentPost.categories.filter(cat => 
                post.categories.includes(cat)
            );
            score += commonCategories.length * 3;
        }
        
        // Title similarity
        const titleWords = currentPost.title.toLowerCase().split(' ');
        const postTitleWords = post.title.toLowerCase().split(' ');
        const commonTitleWords = titleWords.filter(word => 
            word.length > 3 && postTitleWords.includes(word)
        );
        score += commonTitleWords.length * 2;
        
        // Description similarity
        const descWords = currentPost.description.toLowerCase().split(' ');
        const postDescWords = post.description.toLowerCase().split(' ');
        const commonDescWords = descWords.filter(word => 
            word.length > 4 && postDescWords.includes(word)
        );
        score += commonDescWords.length * 1;
        
        return { ...post, relevanceScore: score };
    });
    
    // Sort by score and return top 3
    return scoredPosts
        .filter(post => post.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 3);
}

function displayRelatedPosts(relatedPosts) {
    const container = document.getElementById('related-posts-container');
    if (!container) return;
    
    if (relatedPosts.length === 0) {
        container.innerHTML = '<p class="related-posts-empty">No related posts found.</p>';
        return;
    }
    
    const postsGrid = document.createElement('div');
    postsGrid.className = 'related-posts-grid';
    
    relatedPosts.forEach(post => {
        const postCard = document.createElement('a');
        postCard.href = `post.html?post=${encodeURIComponent(post.file)}`;
        postCard.className = 'related-post-card';
        
        const categoriesHtml = post.categories ? 
            `<div class="related-post-categories">
                ${post.categories.map(cat => 
                    `<span class="related-category-tag">${cat}</span>`
                ).join('')}
            </div>` : '';
        
        const readingTimeHtml = post.readingTime ? 
            `<div class="related-post-meta">
                <i class="fas fa-clock"></i>
                <span>${post.readingTime} min read</span>
            </div>` : '';
        
        postCard.innerHTML = `
            <h3>${post.title}</h3>
            <p>${post.description}</p>
            ${readingTimeHtml}
            ${categoriesHtml}
        `;
        
        postsGrid.appendChild(postCard);
    });
    
    container.innerHTML = '';
    container.appendChild(postsGrid);
}

// Loading and Error State Utilities
function showLoadingSkeleton(container) {
    if (!container) return;
    
    const skeletonHTML = Array.from({ length: 3 }, () => `
        <div class="skeleton-post">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-description"></div>
            <div class="skeleton skeleton-description"></div>
        </div>
    `).join('');
    
    container.innerHTML = skeletonHTML;
}

function showLoadingSpinner(container, message = 'Loading...') {
    if (!container) return;
    
    container.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner loading-large"></div>
            <span>${message}</span>
        </div>
    `;
}

function showErrorState(container, title, message, retryCallback) {
    if (!container) return;
    
    const errorHTML = `
        <div class="error-container">
            <div class="error-title">${title}</div>
            <div class="error-message">${message}</div>
            ${retryCallback ? '<button class="error-retry" onclick="this.disabled=true; (' + retryCallback.toString() + ')()">Try Again</button>' : ''}
        </div>
    `;
    
    container.innerHTML = errorHTML;
    
    // Add retry functionality
    if (retryCallback) {
        const retryButton = container.querySelector('.error-retry');
        if (retryButton) {
            retryButton.addEventListener('click', () => {
                retryButton.disabled = true;
                retryCallback();
            });
        }
    }
}

// Enhanced blog post loading with error handling
async function loadBlogPost() {
    const urlParams = new URLSearchParams(window.location.search);
    const postFile = urlParams.get('post');
    const postContent = document.getElementById('post-content');

    if (!postFile) {
        window.location.href = 'blog-list.html';
        return;
    }

    // Show loading state
    showLoadingSpinner(postContent, 'Loading post...');

    try {
        const response = await fetch(postFile);
        
        if (!response.ok) {
            throw new Error(`Post not found (${response.status})`);
        }
        
        // Continue with existing post loading logic...
        let markdownContent = await response.text();
        
        // Configure marked to handle math blocks and citations
        const renderer = new marked.Renderer();
        
        // Override code block rendering
        renderer.code = function(code, language) {
            if (language === 'math') {
                try {
                    return `<div class="math-block">${katex.renderToString(code, {
                        displayMode: true,
                        throwOnError: false
                    })}</div>`;
                } catch (err) {
                    console.error('KaTeX error:', err);
                    return `<pre><code>${code}</code></pre>`;
                }
            }
            if (language === 'bibtex') {
                const entries = code.split('\n\n').filter(entry => entry.trim());
                let refsHtml = '<div class="bibliography"><h2>References</h2>';
                
                entries.forEach(entry => {
                    const lines = entry.trim().split('\n');
                    const typeMatch = lines[0].match(/@(\w+)\{([^,]+),/);
                    if (typeMatch) {
                        const [_, type, citeKey] = typeMatch;
                        const fields = {};
                        
                        lines.slice(1).forEach(line => {
                            const match = line.match(/^\s*(\w+)\s*=\s*{([^}]+)}/);
                            if (match) {
                                fields[match[1]] = match[2];
                            }
                        });

                        refsHtml += `
                            <div class="reference-entry">
                                <div class="reference-authors">${formatAuthors(fields.author || '')}</div>
                                <div class="reference-title">"${fields.title || ''}"</div>
                                <div class="reference-details">
                                    ${fields.journal ? `<em>${fields.journal}</em>, ` : ''}
                                    ${fields.year ? `(${fields.year})` : ''}
                                </div>
                            </div>
                        `;
                    }
                });
                
                return refsHtml + '</div>';
            }
            return `<pre><code class="language-${language}">${code}</code></pre>`;
        };

        // Override image rendering for accessibility
        renderer.image = function(href, title, text) {
            return `
                <figure>
                    <img class="post-image" src="${href}" alt="${text}" title="${title || ''}" />
                    ${title ? `<figcaption class="image-caption">${title}</figcaption>` : ''}
                </figure>
            `;
        };

        // Override blockquote for citations
        renderer.blockquote = function(quote) {
            return `<div class="citation">${quote}</div>`;
        };

        marked.setOptions({
            renderer: renderer,
            gfm: true,
            breaks: true,
            smartLists: true
        });

        const content = marked.parse(markdownContent);
        
        // Create main content with fade-in animation
        postContent.innerHTML = `<article class="fade-in">${content}</article>`;
        
        // Generate table of contents
        generateTableOfContents();
        
        // Load related posts
        loadRelatedPosts(postFile);
        
        // Update page title
        const titleMatch = markdownContent.match(/^#\s+(.+)$/m);
        if (titleMatch) {
            document.title = titleMatch[1];
        }

        // Add research links if available
        if (postContent.dataset.doi) {
            updateResearchLinks(postContent.dataset.doi);
        }

    } catch (error) {
        console.error('Error loading blog post:', error);
        showErrorState(postContent, 'Failed to load post', error.message, () => loadBlogPost());
    }
}

// Performance optimization: Debounce search
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

// Update search to use debounced version
function initSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    // Load all posts for search
    loadAllPostsForSearch();

    // Use debounced search for better performance
    const debouncedSearch = debounce(handleSearch, 300);
    searchInput.addEventListener('input', debouncedSearch);
    
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            searchInput.value = '';
            handleSearch({ target: { value: '' } });
        }
    });
    
    // Initialize sort and filter controls
    initSortAndFilters();
}

function initSortAndFilters() {
    const sortSelect = document.getElementById('sort-select');
    const clearFiltersBtn = document.getElementById('clear-filters');
    
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            applySortAndFilter();
        });
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (sortSelect) sortSelect.value = 'date-desc';
            const searchInput = document.getElementById('search-input');
            if (searchInput) searchInput.value = '';
            
            // Reload the blog list with default settings
            loadBlogList(1);
        });
    }
}

function applySortAndFilter() {
    const sortValue = document.getElementById('sort-select')?.value || 'date-desc';
    const searchTerm = document.getElementById('search-input')?.value || '';
    
    if (searchTerm) {
        // If there's a search term, re-run search with new sort
        handleSearchWithSort(searchTerm, sortValue);
    } else {
        // Otherwise reload blog list with new sort - use the simpler approach
        window.location.reload(); // Simple reload to re-apply sorting
    }
}

// Enhanced search with sorting
function handleSearchWithSort(searchTerm, sortValue = 'date-desc') {
    if (!allPosts || allPosts.length === 0) {
        loadAllPostsForSearch().then(() => handleSearchWithSort(searchTerm, sortValue));
        return;
    }

    searchTerm = searchTerm.toLowerCase();
    
    let filteredPosts = allPosts.filter(post => {
        return post.title.toLowerCase().includes(searchTerm) ||
               post.description.toLowerCase().includes(searchTerm) ||
               (post.categories && post.categories.some(cat => cat.toLowerCase().includes(searchTerm)));
    });
    
    // Apply sorting
    filteredPosts = sortPosts(filteredPosts, sortValue);
    
    displaySearchResults(filteredPosts, searchTerm);
}

// Enhanced blog list loading with sorting
function loadBlogListWithSort(page = 1, category = null, sortValue = 'date-desc') {
    fetch('posts.json')
        .then(response => response.json())
        .then(posts => {
            let filteredPosts = posts;
            
            // Filter by category if specified
            if (category) {
                filteredPosts = filteredPosts.filter(post => 
                    post.categories && post.categories.includes(category)
                );
            }
            
            // Apply sorting
            filteredPosts = sortPosts(filteredPosts, sortValue);
            
            // Pagination
            const postsPerPage = 5;
            const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
            const start = (page - 1) * postsPerPage;
            const end = start + postsPerPage;
            const currentPosts = filteredPosts.slice(start, end);
            
            displayBlogPosts(currentPosts, totalPages, page, category);
        })
        .catch(error => {
            console.error('Error loading posts:', error);
            showErrorState('Failed to load blog posts');
        });
}

// Sorting function
function sortPosts(posts, sortValue) {
    const sortedPosts = [...posts]; // Create a copy
    
    switch (sortValue) {
        case 'date-desc':
            return sortedPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
            
        case 'date-asc':
            return sortedPosts.sort((a, b) => new Date(a.date) - new Date(b.date));
            
        case 'popular':
            // Sort by estimated popularity (this could be enhanced with actual analytics data)
            return sortedPosts.sort((a, b) => {
                const aPopularity = calculatePostPopularity(a);
                const bPopularity = calculatePostPopularity(b);
                return bPopularity - aPopularity;
            });
            
        case 'category':
            return sortedPosts.sort((a, b) => {
                const aCat = a.categories?.[0] || 'zzz';
                const bCat = b.categories?.[0] || 'zzz';
                return aCat.localeCompare(bCat);
            });
            
        case 'relevance':
            // For relevance, we'll use date as fallback when not in search context
            return sortedPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
            
        default:
            return sortedPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
}

// Calculate post popularity based on various factors
function calculatePostPopularity(post) {
    let score = 0;
    
    // More recent posts get higher score
    const daysSincePost = (new Date() - new Date(post.date)) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 100 - daysSincePost * 0.1);
    
    // Posts with more categories might be more comprehensive
    score += (post.categories?.length || 0) * 5;
    
    // Longer descriptions might indicate more detailed posts
    score += (post.description?.length || 0) * 0.1;
    
    // Technical posts might be more valuable (simple heuristic)
    const technicalTerms = ['neural', 'algorithm', 'machine learning', 'analysis', 'optimization', 'research'];
    const text = (post.title + ' ' + post.description).toLowerCase();
    technicalTerms.forEach(term => {
        if (text.includes(term)) score += 10;
    });
    
    return score;
} 