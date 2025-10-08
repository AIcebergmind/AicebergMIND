// Core Pillars Expandable Functionality
document.addEventListener('DOMContentLoaded', function() {
  console.log('🏛️ Core Pillars JS Loading...');
  const pillarCards = document.querySelectorAll('.pillar-card');
  console.log('📋 Found pillar cards:', pillarCards.length);
  
  // Check if we're on mobile
  function isMobile() {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  // Function to toggle expanded state
  function toggleCard(card) {
    console.log('🔄 Toggling pillar card:', card.querySelector('.pillar-card-title')?.textContent);
    const isExpanded = card.classList.contains('expanded');
    
    // Close all other cards first (accordion behavior)
    pillarCards.forEach(otherCard => {
      if (otherCard !== card) {
        otherCard.classList.remove('expanded');
        otherCard.setAttribute('aria-expanded', 'false');
      }
    });
    
    // Toggle current card
    if (isExpanded) {
      card.classList.remove('expanded');
      card.setAttribute('aria-expanded', 'false');
      console.log('➖ Pillar card collapsed');
    } else {
      card.classList.add('expanded');
      card.setAttribute('aria-expanded', 'true');
      console.log('➕ Pillar card expanded');
    }
  }
  
  // Add event listeners for mobile touch interactions
  pillarCards.forEach((card, index) => {
    console.log(`🎯 Setting up pillar card ${index + 1}`);
    // Add aria-expanded attribute for accessibility
    card.setAttribute('aria-expanded', 'false');
    
    // Handle click/touch events
    card.addEventListener('click', function(e) {
      console.log('👆 Pillar card clicked, mobile check:', isMobile(), 'window width:', window.innerWidth);
      
      // Handle click on mobile devices
      if (isMobile()) {
        e.preventDefault();
        e.stopPropagation();
        toggleCard(card);
      }
    });
    
    // Handle keyboard navigation (Enter/Space)
    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleCard(card);
      }
    });
    
    // Handle focus for keyboard navigation
    card.addEventListener('focus', function() {
      // On desktop, focus behavior can show expanded state
      if (!isMobile()) {
        card.classList.add('focused');
      }
    });
    
    card.addEventListener('blur', function() {
      card.classList.remove('focused');
    });
  });
  
  // Handle window resize to reset mobile behavior
  window.addEventListener('resize', function() {
    console.log('📱 Window resized, new width:', window.innerWidth, 'mobile:', isMobile());
    if (!isMobile()) {
      // Reset all expanded states on desktop
      pillarCards.forEach(card => {
        card.classList.remove('expanded');
        card.setAttribute('aria-expanded', 'false');
      });
    }
  });
  
  console.log('✅ Core Pillars JS Setup Complete');
});