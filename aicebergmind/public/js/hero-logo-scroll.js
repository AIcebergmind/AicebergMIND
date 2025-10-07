// Hero Logo Scroll Effect - AIceberg Mind
// Animazione scroll per il logo hero con parallax

class HeroLogoScroll {
  constructor() {
    this.heroLogo = document.querySelector('.AicebergMindLogo.hero-logo-scroll');
    this.heroSection = document.querySelector('.hero');
    this.init();
  }
  
  init() {
    if (!this.heroLogo || !this.heroSection) return;
    
    this.bindScrollEffect();
    this.addHoverEffects();
  }
  
  bindScrollEffect() {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.updateLogoPosition();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
  }
  
  updateLogoPosition() {
    const scrollY = window.scrollY;
    const heroHeight = this.heroSection.offsetHeight;
    const scrollProgress = Math.min(scrollY / heroHeight, 1);
    
    // Calculate new properties based on scroll
    const opacity = 1 - (scrollProgress * 0.8);
    const scale = 1 - (scrollProgress * 0.2);
    const translateY = scrollProgress * 50;
    const blur = scrollProgress * 2;
    
    // Apply transforms
    this.heroLogo.style.opacity = Math.max(0.2, opacity);
    this.heroLogo.style.transform = `translateY(${translateY}px) scale(${Math.max(0.8, scale)})`;
    this.heroLogo.style.filter = `blur(${blur}px) drop-shadow(0 10px 30px rgba(0, 212, 255, ${0.2 * opacity}))`;
    
    // Add glow effect when scrolling
    if (scrollProgress > 0.3) {
      this.heroLogo.style.filter += ` brightness(${1 + scrollProgress * 0.3})`;
    }
  }
  
  addHoverEffects() {
    this.heroLogo.addEventListener('mouseenter', () => {
      this.heroLogo.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    });
    
    this.heroLogo.addEventListener('mouseleave', () => {
      this.heroLogo.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    });
  }
}

// Particles system for background
class ParticlesBackground {
  constructor() {
    this.canvas = document.getElementById('particles-background');
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.particleCount = 50;
    
    this.init();
  }
  
  init() {
    this.resizeCanvas();
    this.createParticles();
    this.animate();
    
    window.addEventListener('resize', () => this.resizeCanvas());
  }
  
  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  createParticles() {
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.2
      });
    }
  }
  
  updateParticles() {
    this.particles.forEach(particle => {
      particle.x += particle.speedX;
      particle.y += particle.speedY;
      
      // Wrap around edges
      if (particle.x > this.canvas.width) particle.x = 0;
      if (particle.x < 0) particle.x = this.canvas.width;
      if (particle.y > this.canvas.height) particle.y = 0;
      if (particle.y < 0) particle.y = this.canvas.height;
      
      // Subtle opacity pulse
      particle.opacity += (Math.random() - 0.5) * 0.02;
      particle.opacity = Math.max(0.1, Math.min(0.7, particle.opacity));
    });
  }
  
  drawParticles() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.particles.forEach(particle => {
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(0, 212, 255, ${particle.opacity})`;
      this.ctx.fill();
    });
    
    // Draw connections between nearby particles
    this.drawConnections();
  }
  
  drawConnections() {
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
          const opacity = (100 - distance) / 100 * 0.1;
          
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.strokeStyle = `rgba(94, 228, 195, ${opacity})`;
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        }
      }
    }
  }
  
  animate() {
    this.updateParticles();
    this.drawParticles();
    requestAnimationFrame(() => this.animate());
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check if reduced motion is preferred
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  const heroLogoScroll = new HeroLogoScroll();
  
  if (!prefersReducedMotion) {
    const particlesBackground = new ParticlesBackground();
  }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HeroLogoScroll, ParticlesBackground };
}