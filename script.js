// MarketAI - Professional AI Marketing Content Generator
// Service Worker Registration and PWA Functionality

class MarketAI {
    constructor() {
        this.apiKey = null;
        this.isGenerating = false;
        this.currentContent = '';
        
        this.init();
    }

    async init() {
        this.initializeTheme();
        this.initializeEventListeners();
        this.initializeFeatherIcons();
        this.registerServiceWorker();
        this.setupPWAInstallation();
        this.loadAPIKey();
    }

    // Theme Management
    initializeTheme() {
        const savedTheme = localStorage.getItem('marketai-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('marketai-theme', newTheme);
        this.updateThemeIcon(newTheme);
    }

    updateThemeIcon(theme) {
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.setAttribute('data-feather', theme === 'dark' ? 'sun' : 'moon');
            feather.replace();
        }
    }

    // Event Listeners
    initializeEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        themeToggle?.addEventListener('click', () => this.toggleTheme());

        // Form submission
        const generatorForm = document.getElementById('generator-form');
        generatorForm?.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Copy button
        const copyBtn = document.getElementById('copy-btn');
        copyBtn?.addEventListener('click', () => this.copyToClipboard());

        // Regenerate button
        const regenerateBtn = document.getElementById('regenerate-btn');
        regenerateBtn?.addEventListener('click', () => this.regenerateContent());

        // API key input (if needed for configuration)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'K') {
                this.showAPIKeyModal();
            }
        });
    }

    // Feather Icons Initialization
    initializeFeatherIcons() {
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    // PWA Service Worker Registration
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                // Create service worker content
                const swCode = `
                    const CACHE_NAME = 'marketai-v1';
                    const urlsToCache = [
                        '/',
                        '/index.html',
                        '/style.css',
                        '/script.js'
                    ];

                    self.addEventListener('install', (event) => {
                        console.log('Service Worker installing...');
                        event.waitUntil(
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    console.log('Caching files');
                                    return cache.addAll(urlsToCache);
                                })
                        );
                    });

                    self.addEventListener('fetch', (event) => {
                        // Skip API calls and external resources
                        if (event.request.url.includes('/api/') || 
                            event.request.url.includes('openai.com') ||
                            event.request.url.includes('unpkg.com')) {
                            return;
                        }

                        event.respondWith(
                            caches.match(event.request)
                                .then((response) => {
                                    return response || fetch(event.request);
                                })
                        );
                    });
                `;

                const blob = new Blob([swCode], { type: 'application/javascript' });
                const swUrl = URL.createObjectURL(blob);
                
                const registration = await navigator.serviceWorker.register(swUrl);
                console.log('Service Worker registered successfully');
            } catch (error) {
                console.log('Service Worker registration failed:', error.message);
            }
        }
    }

    // PWA Installation
    setupPWAInstallation() {
        let deferredPrompt;
        const installBtn = document.getElementById('install-btn');

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installBtn.style.display = 'flex';
        });

        installBtn?.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                deferredPrompt = null;
                installBtn.style.display = 'none';
            }
        });
    }

    // API Key Management
    loadAPIKey() {
        // Try to get API key from various sources
        this.apiKey = this.getAPIKey();
    }

    getAPIKey() {
        // First check localStorage for user-provided key
        const localKey = localStorage.getItem('marketai-openai-key');
        if (localKey && localKey !== 'your-openai-api-key-here') {
            return localKey;
        }

        // For deployment environments, we'll check if an API key is available
        // In a real deployment, you'd want to handle this server-side
        // For now, we'll prompt the user to enter their key
        return null;
    }

    showAPIKeyModal() {
        const apiKey = prompt('Enter your OpenAI API Key:\n\nPress Ctrl+Shift+K to open this dialog again.');
        if (apiKey) {
            localStorage.setItem('marketai-openai-key', apiKey);
            this.apiKey = apiKey;
            this.showNotification('API Key saved successfully!', 'success');
        }
    }

    // Content Generation
    async handleFormSubmit(event) {
        event.preventDefault();
        
        if (this.isGenerating) return;

        const formData = new FormData(event.target);
        const contentType = formData.get('contentType');
        const productDescription = formData.get('productDescription');

        if (!productDescription.trim()) {
            this.showNotification('Please provide a product description.', 'error');
            return;
        }

        await this.generateContent(contentType, productDescription);
    }

    async generateContent(contentType, productDescription) {
        try {
            this.setGeneratingState(true);
            
            const prompt = this.buildPrompt(contentType, productDescription);
            const content = await this.callOpenAI(prompt);
            
            this.displayResult(content);
            this.currentContent = content;
            
        } catch (error) {
            console.error('Generation error:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
        } finally {
            this.setGeneratingState(false);
        }
    }

    buildPrompt(contentType, productDescription) {
        const prompts = {
            'slogan': {
                instruction: 'Create 3-5 catchy, memorable slogans that capture the essence of this product/service. Make them short, impactful, and brand-worthy.',
                format: 'List each slogan on a new line with a bullet point.'
            },
            'ad-copy': {
                instruction: 'Write compelling advertisement copy that highlights key benefits, creates urgency, and drives action. Include a strong call-to-action.',
                format: 'Provide a headline, main copy (2-3 paragraphs), and a clear call-to-action.'
            },
            'product-description': {
                instruction: 'Create a detailed, engaging product description that highlights features, benefits, and value proposition. Make it SEO-friendly and conversion-focused.',
                format: 'Provide a structured description with key features, benefits, and specifications if applicable.'
            },
            'hashtags': {
                instruction: 'Generate 15-20 relevant hashtags for social media marketing. Mix popular, niche, and branded hashtags for maximum reach.',
                format: 'List hashtags separated by spaces, starting with most popular/relevant ones.'
            },
            'email': {
                instruction: 'Write a complete marketing email including subject line, body copy, and call-to-action. Make it engaging and conversion-focused.',
                format: 'Provide: Subject Line, Email Body (with greeting, main content, and closing), and Call-to-Action.'
            }
        };

        const promptData = prompts[contentType] || prompts['slogan'];

        return `You are a professional marketing copywriter with expertise in creating high-converting content. 

CONTENT TYPE: ${contentType.replace('-', ' ').toUpperCase()}

PRODUCT/SERVICE DESCRIPTION:
${productDescription}

TASK: ${promptData.instruction}

FORMAT: ${promptData.format}

REQUIREMENTS:
- Make it professional and engaging
- Ensure it's suitable for the target audience
- Focus on benefits and value proposition
- Use persuasive language that drives action
- Keep the tone appropriate for marketing materials

Please provide only the requested content without any additional explanations or meta-commentary.`;
    }

    async callOpenAI(prompt) {
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.choices || data.choices.length === 0) {
                throw new Error('No content generated from OpenAI API');
            }

            return data.choices[0].message.content.trim();
            
        } catch (error) {
            console.error('API Error:', error);
            throw new Error(`Failed to generate content: ${error.message}`);
        }
    }

    displayResult(content) {
        const resultSection = document.getElementById('result-section');
        const resultContent = document.getElementById('result-content');
        
        if (resultSection && resultContent) {
            resultContent.textContent = content;
            resultSection.style.display = 'block';
            resultSection.scrollIntoView({ behavior: 'smooth' });
            resultSection.classList.add('fade-in-up');
        }
    }

    setGeneratingState(isGenerating) {
        this.isGenerating = isGenerating;
        const generateBtn = document.getElementById('generate-btn');
        const btnText = generateBtn?.querySelector('.btn-text');
        const spinner = generateBtn?.querySelector('.loading-spinner');
        
        if (generateBtn) {
            generateBtn.disabled = isGenerating;
        }
        
        if (btnText) {
            btnText.textContent = isGenerating ? 'Generating...' : 'Generate Content';
        }
        
        if (spinner) {
            spinner.style.display = isGenerating ? 'block' : 'none';
        }
    }

    async copyToClipboard() {
        if (!this.currentContent) {
            this.showNotification('No content to copy!', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(this.currentContent);
            this.showNotification('Content copied to clipboard!', 'success');
            
            // Visual feedback
            const copyBtn = document.getElementById('copy-btn');
            const originalIcon = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i data-feather="check"></i>';
            feather.replace();
            
            setTimeout(() => {
                copyBtn.innerHTML = originalIcon;
                feather.replace();
            }, 2000);
            
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = this.currentContent;
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                this.showNotification('Content copied to clipboard!', 'success');
            } catch (fallbackError) {
                this.showNotification('Failed to copy content', 'error');
            }
            
            document.body.removeChild(textArea);
        }
    }

    async regenerateContent() {
        const form = document.getElementById('generator-form');
        if (form) {
            const formData = new FormData(form);
            const contentType = formData.get('contentType');
            const productDescription = formData.get('productDescription');
            
            if (productDescription.trim()) {
                await this.generateContent(contentType, productDescription);
            }
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--accent-primary)'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-lg);
            z-index: 1001;
            max-width: 300px;
            font-weight: 500;
            animation: slideInRight 0.3s ease-out;
        `;
        
        notification.textContent = message;
        
        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Remove notification after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MarketAI();
});

// Handle online/offline status
window.addEventListener('online', () => {
    document.body.classList.remove('offline');
});

window.addEventListener('offline', () => {
    document.body.classList.add('offline');
});

// Performance optimization: Preload critical resources
const preloadResources = () => {
    const criticalResources = [
        'https://unpkg.com/feather-icons'
    ];
    
    criticalResources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'script';
        link.href = resource;
        document.head.appendChild(link);
    });
};

// Initialize performance optimizations
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', preloadResources);
} else {
    preloadResources();
}

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarketAI;
}
