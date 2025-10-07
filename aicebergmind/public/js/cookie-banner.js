// Cookie Banner JavaScript
// Gestione consenso cookies con localStorage

class CookieBanner {
  constructor() {
    this.banner = document.getElementById('cookie-banner');
    this.acceptBtn = document.getElementById('cookie-accept');
    this.declineBtn = document.getElementById('cookie-decline');
    this.storageKey = 'aiceberg-cookies-consent';
    
    this.init();
  }
  
  init() {
    // Check if consent was already given
    const consent = localStorage.getItem(this.storageKey);
    
    if (!consent) {
      this.showBanner();
    }
    
    this.bindEvents();
  }
  
  bindEvents() {
    if (this.acceptBtn) {
      this.acceptBtn.addEventListener('click', () => this.acceptCookies());
    }
    
    if (this.declineBtn) {
      this.declineBtn.addEventListener('click', () => this.declineCookies());
    }
  }
  
  showBanner() {
    if (this.banner) {
      this.banner.classList.remove('hidden');
      
      // Animate in after a short delay
      setTimeout(() => {
        this.banner.style.transform = 'translateY(0)';
      }, 500);
    }
  }
  
  hideBanner() {
    if (this.banner) {
      this.banner.style.transform = 'translateY(100%)';
      
      setTimeout(() => {
        this.banner.classList.add('hidden');
      }, 500);
    }
  }
  
  acceptCookies() {
    localStorage.setItem(this.storageKey, 'accepted');
    this.hideBanner();
    
    // Enable analytics/tracking here
    this.enableAnalytics();
  }
  
  declineCookies() {
    localStorage.setItem(this.storageKey, 'declined');
    this.hideBanner();
    
    // Disable analytics/tracking here
    this.disableAnalytics();
  }
  
  enableAnalytics() {
    // Add Google Analytics or other tracking code here
    console.log('Analytics enabled');
  }
  
  disableAnalytics() {
    // Disable tracking
    console.log('Analytics disabled');
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new CookieBanner();
});

// FAQ Toggle functionality
document.addEventListener('DOMContentLoaded', () => {
  const faqSection = document.getElementById('faqSection');
  const faqCloseBtn = document.getElementById('faqCloseBtn');
  const faqTrigger = document.querySelector('a[href="#faq"]');
  
  // Open FAQ
  if (faqTrigger) {
    faqTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      if (faqSection) {
        faqSection.classList.add('open');
      }
    });
  }
  
  // Close FAQ
  if (faqCloseBtn) {
    faqCloseBtn.addEventListener('click', () => {
      if (faqSection) {
        faqSection.classList.remove('open');
      }
    });
  }
  
  // Close FAQ when clicking overlay
  if (faqSection) {
    faqSection.addEventListener('click', (e) => {
      if (e.target === faqSection) {
        faqSection.classList.remove('open');
      }
    });
  }
  
  // FAQ items toggle
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        // Close other items
        faqItems.forEach(otherItem => {
          if (otherItem !== item) {
            otherItem.classList.remove('open');
          }
        });
        
        // Toggle current item
        item.classList.toggle('open');
      });
    }
  });
});

// Smooth scroll for anchor links
document.addEventListener('DOMContentLoaded', () => {
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  
  anchorLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      
      // Skip FAQ link as it's handled separately
      if (href === '#faq') return;
      
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
});