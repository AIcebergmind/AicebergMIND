// Projects Bounce System - AIceberg Mind
// Animazioni per le project cards con bounce effects

class ProjectsBounce {
  constructor() {
    this.projectCards = document.querySelectorAll('.project-card');
    this.init();
  }
  
  init() {
    if (this.projectCards.length === 0) return;
    
    this.addHoverEffects();
    this.initIntersectionObserver();
    this.addClickEffects();
  }
  
  addHoverEffects() {
    this.projectCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        this.bounceCard(card);
        this.activateFrameBorders(card);
      });
      
      card.addEventListener('mouseleave', () => {
        this.resetCard(card);
      });
    });
  }
  
  bounceCard(card) {
    card.style.transform = 'translateY(-8px) scale(1.02)';
    
    // Add subtle rotation based on mouse position
    card.addEventListener('mousemove', this.handleCardMouseMove.bind(this));
  }
  
  resetCard(card) {
    card.style.transform = 'translateY(0) scale(1) rotateX(0) rotateY(0)';
    card.removeEventListener('mousemove', this.handleCardMouseMove);
  }
  
  handleCardMouseMove(e) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const rotateX = (e.clientY - centerY) / rect.height * 10;
    const rotateY = (e.clientX - centerX) / rect.width * 10;
    
    card.style.transform = `translateY(-8px) scale(1.02) rotateX(${-rotateX}deg) rotateY(${rotateY}deg)`;
  }
  
  activateFrameBorders(card) {
    const borders = card.querySelectorAll('[class^="frame-border-"]');
    borders.forEach(border => {
      border.style.opacity = '1';
    });
  }
  
  addClickEffects() {
    this.projectCards.forEach(card => {
      const button = card.querySelector('.project-btn');
      
      if (button) {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          this.animateCardClick(card);
        });
      }
    });
  }
  
  animateCardClick(card) {
    // Quick scale down and up effect
    card.style.transition = 'transform 0.1s ease';
    card.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
      card.style.transform = 'scale(1.05)';
      
      setTimeout(() => {
        card.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        card.style.transform = 'scale(1)';
      }, 100);
    }, 100);
  }
  
  initIntersectionObserver() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('animate-in');
            this.animateCardEntry(entry.target);
          }, index * 100);
        }
      });
    }, observerOptions);
    
    this.projectCards.forEach(card => observer.observe(card));
  }
  
  animateCardEntry(card) {
    card.style.opacity = '0';
    card.style.transform = 'translateY(40px) scale(0.9)';
    
    // Trigger animation
    requestAnimationFrame(() => {
      card.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0) scale(1)';
    });
  }
}

// Progress bar animation for project cards
class ProjectProgress {
  constructor() {
    this.progressBars = document.querySelectorAll('.progress-fill');
    this.init();
  }
  
  init() {
    this.animateProgressBars();
  }
  
  animateProgressBars() {
    const observerOptions = {
      threshold: 0.5,
      rootMargin: '0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.animateProgress(entry.target);
        }
      });
    }, observerOptions);
    
    this.progressBars.forEach(bar => observer.observe(bar));
  }
  
  animateProgress(progressFill) {
    const targetWidth = progressFill.style.width;
    progressFill.style.width = '0%';
    
    setTimeout(() => {
      progressFill.style.width = targetWidth;
    }, 300);
  }
}

// Accordion functionality for mobile projects
class ProjectsAccordion {
  constructor() {
    this.accordionHeaders = document.querySelectorAll('.accordion-header');
    this.init();
  }
  
  init() {
    this.bindEvents();
    this.animateProgressDots();
  }
  
  bindEvents() {
    this.accordionHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const item = header.parentElement;
        const wasOpen = item.classList.contains('open');
        
        // Close all other items
        document.querySelectorAll('.accordion-item').forEach(otherItem => {
          if (otherItem !== item) {
            otherItem.classList.remove('open');
          }
        });
        
        // Toggle current item
        if (!wasOpen) {
          item.classList.add('open');
        } else {
          item.classList.remove('open');
        }
      });
    });
  }
  
  animateProgressDots() {
    const progressDots = document.querySelectorAll('.progress-dots');
    
    progressDots.forEach(dots => {
      let i = 0;
      setInterval(() => {
        i = (i + 1) % 4;
        dots.textContent = '.'.repeat(i);
      }, 500);
    });
  }
}

// Channels slider animation
class ChannelsSlider {
  constructor() {
    this.channelsTrack = document.querySelector('.channels-track');
    this.channelLogos = document.querySelectorAll('.channel-logo');
    this.init();
  }
  
  init() {
    if (!this.channelsTrack) return;
    
    this.pauseOnHover();
    this.addClickEffects();
  }
  
  pauseOnHover() {
    this.channelsTrack.addEventListener('mouseenter', () => {
      this.channelsTrack.style.animationPlayState = 'paused';
    });
    
    this.channelsTrack.addEventListener('mouseleave', () => {
      this.channelsTrack.style.animationPlayState = 'running';
    });
  }
  
  addClickEffects() {
    this.channelLogos.forEach(logo => {
      logo.addEventListener('click', () => {
        logo.style.transform = 'translateY(-8px) scale(1.1)';
        
        setTimeout(() => {
          logo.style.transform = 'translateY(-4px) scale(1.05)';
        }, 150);
      });
    });
  }
}

// Initialize all project systems
document.addEventListener('DOMContentLoaded', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (!prefersReducedMotion) {
    new ProjectsBounce();
    new ProjectProgress();
    new ChannelsSlider();
  }
  
  new ProjectsAccordion();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ProjectsBounce, ProjectProgress, ProjectsAccordion, ChannelsSlider };
}