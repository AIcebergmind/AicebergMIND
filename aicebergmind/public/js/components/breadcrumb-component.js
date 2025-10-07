// Breadcrumb Component - AIceberg Mind
// Sistema di breadcrumb dinamico per navigazione

class BreadcrumbNavigation {
  constructor() {
    this.placeholder = document.getElementById('breadcrumb-placeholder');
    this.breadcrumbs = [];
    this.init();
  }
  
  init() {
    if (!this.placeholder) return;
    
    this.createBreadcrumbHTML();
    this.updateBreadcrumbs();
    this.bindScrollListener();
  }
  
  createBreadcrumbHTML() {
    const breadcrumbHTML = `
      <nav class="breadcrumb-nav" aria-label="Breadcrumb">
        <ol class="breadcrumb-list">
          <li class="breadcrumb-item">
            <a href="/" class="breadcrumb-link">Home</a>
          </li>
          <li class="breadcrumb-item current">
            <span class="breadcrumb-current">Current Section</span>
          </li>
        </ol>
      </nav>
    `;
    
    this.placeholder.innerHTML = breadcrumbHTML;
    this.addBreadcrumbStyles();
  }
  
  addBreadcrumbStyles() {
    if (document.getElementById('breadcrumb-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'breadcrumb-styles';
    style.textContent = `
      .breadcrumb-nav {
        position: fixed;
        top: 1rem;
        left: 2rem;
        z-index: 100;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 50px;
        padding: 0.5rem 1rem;
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.4s ease;
        pointer-events: none;
      }
      
      .breadcrumb-nav.visible {
        opacity: 1;
        transform: translateY(0);
        pointer-events: all;
      }
      
      .breadcrumb-list {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      
      .breadcrumb-item:not(:last-child)::after {
        content: '→';
        color: var(--text-tertiary);
        margin-left: 0.5rem;
        font-size: 0.8rem;
      }
      
      .breadcrumb-link {
        color: var(--text-secondary);
        text-decoration: none;
        font-size: 0.85rem;
        font-weight: 400;
        transition: color 0.3s ease;
      }
      
      .breadcrumb-link:hover {
        color: var(--brand-cyan);
      }
      
      .breadcrumb-current {
        color: var(--text-primary);
        font-size: 0.85rem;
        font-weight: 500;
      }
      
      @media (max-width: 768px) {
        .breadcrumb-nav {
          display: none;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  updateBreadcrumbs() {
    const sections = document.querySelectorAll('section[id]');
    const breadcrumbNav = document.querySelector('.breadcrumb-nav');
    const currentSpan = document.querySelector('.breadcrumb-current');
    
    if (!breadcrumbNav || !currentSpan) return;
    
    let currentSection = 'Home';
    
    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= 100 && rect.bottom >= 100) {
        currentSection = this.getSectionTitle(section.id);
      }
    });
    
    currentSpan.textContent = currentSection;
    
    // Show breadcrumb when not in hero section
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
      const heroRect = heroSection.getBoundingClientRect();
      if (heroRect.bottom <= 0) {
        breadcrumbNav.classList.add('visible');
      } else {
        breadcrumbNav.classList.remove('visible');
      }
    }
  }
  
  getSectionTitle(sectionId) {
    const titleMap = {
      'hero': 'Home',
      'subhero': 'Empowering Humans',
      'about': 'Behind the Surface',
      'projects': 'Our Living Projects',
      'team': 'Who We Are',
      'ethics': 'Ethics',
      'blog': 'FAQ'
    };
    
    return titleMap[sectionId] || sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
  }
  
  bindScrollListener() {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.updateBreadcrumbs();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new BreadcrumbNavigation();
});