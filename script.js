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

    if (isPostPage) {
        loadBlogPost();
    } else if (isBlogPage) {
        loadBlogList();
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
    try {
        const response = await fetch('posts.json');
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

        const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
        const start = (currentPage - 1) * postsPerPage;
        const end = start + postsPerPage;
        const currentPosts = filteredPosts.slice(start, end);

        const blogList = document.getElementById('blog-list');
        if (!blogList) {
            console.error('Blog list container not found');
            return;
        }
        
        blogList.innerHTML = '';

        if (filteredPosts.length === 0) {
            blogList.innerHTML = `<p>No posts found${selectedCategory ? ` in category "${selectedCategory}"` : ''}.</p>`;
            return;
        }

        currentPosts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.className = 'blog-post';
            
            postElement.innerHTML = `
                <h2><a href="post.html?post=${encodeURIComponent(post.file)}">${post.title}</a></h2>
                <p>${post.description}</p>
                ${post.categories ? `
                <div class="categories-list">
                    ${post.categories.map(category => 
                        `<a href="?category=${encodeURIComponent(category)}" class="category-tag">${category}</a>`
                    ).join('')}
                </div>` : ''}
            `;
            blogList.appendChild(postElement);
        });

        updatePagination(currentPage, totalPages, selectedCategory);
        updateCategories(posts, selectedCategory);

    } catch (error) {
        console.error('Error loading blog list:', error);
        const blogList = document.getElementById('blog-list');
        if (blogList) {
            blogList.innerHTML = '<p>Error loading blog posts. Please try again later.</p>';
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

// Blog post loading
async function loadBlogPost() {
    const urlParams = new URLSearchParams(window.location.search);
    const postFile = urlParams.get('post');

    if (!postFile) {
        window.location.href = 'blog.html';
        return;
    }

    try {
        const response = await fetch(postFile);
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
        const postContent = document.getElementById('post-content');
        
        // Create main content
        postContent.innerHTML = `<article>${content}</article>`;
        
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
        document.getElementById('post-content').innerHTML = '<p>Error loading blog post. Please try again later.</p>';
    }
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