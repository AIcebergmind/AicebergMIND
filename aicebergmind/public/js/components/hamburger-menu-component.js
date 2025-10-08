// Hamburger Menu Component - AIceberg Mind
// Dynamic hamburger menu with scroll behavior

class HamburgerMenu {
  constructor() {
    this.placeholder = document.getElementById('hamburger-menu-placeholder');
    this.lastScrollY = 0;
    this.isMenuVisible = true;
    this.hamburgerTrigger = null;
    this.init();
  }
  
  init() {
    if (!this.placeholder) return;
    
    this.createHamburgerMenu();
    this.bindEvents();
    this.initScrollBehavior();
  }
  
  createHamburgerMenu() {
    const menuHTML = `
      <div class="hamburger-menu-container" id="hamburgerMenu">
        <div class="hamburger-menu-overlay"></div>
        <div class="hamburger-menu-panel">
          <div class="hamburger-menu-header">
            <img src="/logo/AIceberg_mind_logo_gray.svg" alt="AIceberg Mind" class="hamburger-menu-logo">
          </div>
          <nav class="hamburger-menu-nav">
            <ul class="hamburger-menu-links">
              <li><a href="/" class="hamburger-link">Home</a></li>
              <li><a href="#projects" class="hamburger-link">Projects</a></li>
              <li><a href="#team" class="hamburger-link">Team</a></li>
              <li><a href="#ethics" class="hamburger-link">Ethics</a></li>
              <li><a href="/blog" class="hamburger-link">Blog</a></li>
              <li><a href="#faq" class="hamburger-link">FAQ</a></li>
            </ul>
          </nav>
          <div class="hamburger-menu-footer">
            <div class="hamburger-social-links">
              <a href="#" aria-label="Twitter">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
                </svg>
              </a>
              <a href="#" aria-label="GitHub">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
      
      <button class="hamburger-trigger" id="hamburgerTrigger" aria-label="Menu">
        <div class="hamburger-icon">
          <div class="hamburger-line"></div>
          <div class="hamburger-line"></div>
          <div class="hamburger-line"></div>
        </div>
      </button>
    `;
    
    this.placeholder.innerHTML = menuHTML;
  }
  
  bindEvents() {
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    this.hamburgerTrigger = document.getElementById('hamburgerTrigger');
    const overlay = hamburgerMenu?.querySelector('.hamburger-menu-overlay');
    const links = document.querySelectorAll('.hamburger-link');
    
    if (!hamburgerMenu || !this.hamburgerTrigger) return;
    
    // Toggle menu
    this.hamburgerTrigger.addEventListener('click', () => {
      const isActive = hamburgerMenu.classList.contains('active');
      
      if (isActive) {
        this.closeMenu(hamburgerMenu, this.hamburgerTrigger);
      } else {
        this.openMenu(hamburgerMenu, this.hamburgerTrigger);
      }
    });
    
    // Close on overlay click
    if (overlay) {
      overlay.addEventListener('click', () => {
        this.closeMenu(hamburgerMenu, this.hamburgerTrigger);
      });
    }
    
    // Close on link click
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        
        // If it's an anchor link, handle smooth scroll
        if (href.startsWith('#') && href !== '#faq') {
          e.preventDefault();
          const target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
          }
        }
        
        this.closeMenu(hamburgerMenu, this.hamburgerTrigger);
      });
    });
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && hamburgerMenu.classList.contains('active')) {
        this.closeMenu(hamburgerMenu, this.hamburgerTrigger);
      }
    });
  }

  initScrollBehavior() {
    if (!this.hamburgerTrigger) return;

    const updateHamburgerVisibility = () => {
      const currentScrollY = window.scrollY;
      
      // Show hamburger at the beginning
      if (currentScrollY <= 100) {
        this.showHamburger();
      }
      // Show hamburger when scrolling up
      else if (currentScrollY < this.lastScrollY && !this.isMenuVisible) {
        this.showHamburger();
      }
      // Hide hamburger when scrolling down
      else if (currentScrollY > this.lastScrollY && currentScrollY > 200 && this.isMenuVisible) {
        this.hideHamburger();
      }
      
      this.lastScrollY = currentScrollY;
    };

    // Throttle for performance
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateHamburgerVisibility);
        ticking = true;
        setTimeout(() => { ticking = false; }, 10);
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    // Show hamburger at the beginning
    this.showHamburger();
  }

  showHamburger() {
    if (this.hamburgerTrigger) {
      this.hamburgerTrigger.style.transform = 'translateY(0)';
      this.hamburgerTrigger.style.opacity = '1';
      this.isMenuVisible = true;
    }
  }

  hideHamburger() {
    if (this.hamburgerTrigger) {
      this.hamburgerTrigger.style.transform = 'translateY(-100px)';
      this.hamburgerTrigger.style.opacity = '0';
      this.isMenuVisible = false;
    }
  }
  
  openMenu(menu, trigger) {
    menu.classList.add('active');
    trigger.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  
  closeMenu(menu, trigger) {
    menu.classList.remove('active');
    trigger.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new HamburgerMenu();
});