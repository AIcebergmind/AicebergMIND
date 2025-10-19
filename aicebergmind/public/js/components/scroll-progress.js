/**
 * Scroll Progress Bar Component - AIceberg Mind
 * Universal scroll progress indicator for all pages
 */

class ScrollProgress {
  constructor() {
    this.createProgressBar();
    this.initScrollProgress();
  }
  
  createProgressBar() {
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress-bar';
    progressBar.innerHTML = '<div class="scroll-progress-fill"></div>';
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .scroll-progress-bar {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
        background: rgba(255, 255, 255, 0.1);
        z-index: 1000;
        pointer-events: none;
      }
      
      .scroll-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--brand-mint), var(--brand-cyan));
        width: 0%;
        transition: width 0.1s ease;
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(progressBar);
    
    this.progressFill = progressBar.querySelector('.scroll-progress-fill');
  }
  
  initScrollProgress() {
    let ticking = false;
    
    const updateProgress = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
          const scrollProgress = (window.scrollY / scrollHeight) * 100;
          
          if (this.progressFill) {
            this.progressFill.style.width = `${Math.min(100, Math.max(0, scrollProgress))}%`;
          }
          
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', updateProgress, { passive: true });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ScrollProgress();
});