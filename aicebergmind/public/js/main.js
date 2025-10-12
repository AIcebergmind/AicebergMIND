// Main JavaScript - AIceberg Mind
// Main interactions management, scroll and animations

class AicebergMain {
  constructor() {
    this.init();
  }
  
  init() {
    this.initScrollEffects();
    this.initVideoControls();
    this.initTextCollapseToggle();
    this.initSmoothScroll();
    this.initIntersectionObserver();
    this.initGlobalDropCapAnimation();
    this.initEditorialCaptionAnimation();
  }
  
  // Scroll effects for hero logo and other elements
  initScrollEffects() {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.updateScrollEffects();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
  }
  
  updateScrollEffects() {
    const scrollY = window.scrollY;
    const heroLogo = document.querySelector('.hero-logo-scroll');
    
    if (heroLogo) {
      const opacity = Math.max(0, 1 - (scrollY / 300));
      const scale = Math.max(0.8, 1 - (scrollY / 1000));
      
      heroLogo.style.opacity = opacity;
      heroLogo.style.transform = `scale(${scale})`;
    }
  }
  
  // Video controls for subhero section
  initVideoControls() {
    const videoToggle = document.getElementById('videoToggle');
    const videoContainer = document.querySelector('.video-container');
    
    if (videoToggle && videoContainer) {
      videoToggle.addEventListener('click', () => {
        const iframe = videoContainer.querySelector('iframe');
        
        if (iframe) {
          const currentSrc = iframe.src;
          
          if (currentSrc.includes('autoplay=1')) {
            // Pause video by removing autoplay
            iframe.src = currentSrc.replace('autoplay=1', 'autoplay=0');
            videoContainer.classList.add('video-paused');
          } else {
            // Play video by adding autoplay
            iframe.src = currentSrc.replace('autoplay=0', 'autoplay=1');
            videoContainer.classList.remove('video-paused');
          }
        }
      });
    }
  }
  
  // Text collapse toggle functionality
  initTextCollapseToggle() {
    const collapseHeaders = document.querySelectorAll('.collapse-header');
    
    collapseHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const textCollapse = header.closest('.text-collapse');
        if (textCollapse) {
          textCollapse.classList.toggle('expanded');
        }
      });
    });
  }
  
  // Smooth scroll behavior
  initSmoothScroll() {
    const scrollArrow = document.querySelector('.scroll-down-arrow');
    
    if (scrollArrow) {
      scrollArrow.addEventListener('click', () => {
        const nextSection = document.querySelector('#subhero');
        if (nextSection) {
          nextSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    }
  }
  
  // Intersection Observer for animations
  initIntersectionObserver() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Debug log
          console.log('Animating element:', entry.target);
          // Use existing CSS classes for parallax
          entry.target.classList.add('in-view');
          entry.target.classList.add('animate-in');
        }
      });
    }, observerOptions);
    
    // Observe elements with animation classes - expanded to include more elements
    const animatedElements = document.querySelectorAll(`
      .text-compose, 
      .content-block, 
      .ethics-card, 
      .parallax-text,
      .parallax-image,
      .pullquote,
      section[class*="parallax-section"],
      .editorial-section h2,
      .editorial-section p,
      .projects-container
    `);
    animatedElements.forEach(el => observer.observe(el));
  }
}

// Text composition effects
class TextComposer {
  constructor() {
    this.initTypewriter();
  }
  
  initTypewriter() {
    const typewriterElements = document.querySelectorAll('.typewriter-text');
    
    typewriterElements.forEach((element, index) => {
      setTimeout(() => {
        this.typeText(element);
      }, index * 500);
    });
  }
  
  typeText(element) {
    const text = element.textContent;
    element.textContent = '';
    element.style.opacity = '1';
    
    let i = 0;
    const typeInterval = setInterval(() => {
      element.textContent += text.charAt(i);
      i++;
      
      if (i >= text.length) {
        clearInterval(typeInterval);
      }
    }, 50);
  }
}

// Scroll progress indicator
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

  // Global animation system - unified for parallax and drop-cap
  initGlobalDropCapAnimation() {
    // Register ScrollTrigger plugin
    gsap.registerPlugin(ScrollTrigger);
    
    // Use GSAP ScrollTrigger for unified animations across the entire site
    console.log('Initializing GSAP ScrollTrigger animations...');
    
    // Parallax Text Animation
    gsap.utils.toArray('.parallax-text').forEach((element) => {
      gsap.fromTo(element, 
        {
          opacity: 0,
          y: 30
        },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: element,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse"
          }
        }
      );
    });

    // Drop Cap Animation - GSAP version
    gsap.utils.toArray('.drop-cap').forEach((element) => {
      gsap.fromTo(element,
        {
          opacity: 0,
          scale: 0.8,
          rotation: -5
        },
        {
          opacity: 1,
          scale: 1,
          rotation: 0,
          duration: 1.2,
          ease: "back.out(1.7)",
          scrollTrigger: {
            trigger: element,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse"
          }
        }
      );
      console.log('GSAP Drop-cap animation applied to:', element);
    });

    // Parallax Image Animation
    gsap.utils.toArray('.parallax-image').forEach((element) => {
      gsap.fromTo(element,
        {
          opacity: 0,
          scale: 0.95,
          y: 20
        },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: element,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse"
          }
        }
      );
    });
  }

  // Editorial Caption Animation System
  initEditorialCaptionAnimation() {
    const initCaptions = () => {
      const captionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const caption = entry.target;
            
            // Add staggered delay based on position
            const delay = Array.from(document.querySelectorAll('.editorial-caption')).indexOf(caption) * 200;
            
            setTimeout(() => {
              caption.classList.add('animate-text');
              console.log('✨ Editorial caption animated:', caption.textContent.slice(0, 30) + '...');
              console.log('🎯 Added animate-text class to:', caption.className);
            }, delay);
            
            // Unobserve after animation
            captionObserver.unobserve(caption);
          }
        });
      }, {
        threshold: 0.2,
        rootMargin: '0px 0px -20px 0px'
      });

      // Observe all editorial captions
      const captions = document.querySelectorAll('.editorial-caption');
      captions.forEach(caption => {
        captionObserver.observe(caption);
      });

      console.log(`🎭 Editorial Caption Animation System initialized - Found ${captions.length} captions`);
    };

    // Initialize immediately and after a short delay to catch dynamically loaded content
    initCaptions();
    setTimeout(initCaptions, 500);
  }
}

// Support sticky button
class SupportButton {
  constructor() {
    this.button = document.getElementById('supportStickyButton');
    this.initSupportButton();
  }
  
  initSupportButton() {
    if (!this.button) return;
    
    // Show button after some scrolling
    const showAfterScroll = 1000;
    
    const handleScroll = () => {
      if (window.scrollY > showAfterScroll) {
        this.button.classList.remove('hidden');
      } else {
        this.button.classList.add('hidden');
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
  }
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Check if reduced motion is preferred
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (!prefersReducedMotion) {
    new TextComposer();
    new ScrollProgress();
  }
  
  new AicebergMain();
  new SupportButton();
});

// Handle resize events
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    // Refresh animations or layouts if needed
    window.dispatchEvent(new Event('orientationchange'));
  }, 250);
});