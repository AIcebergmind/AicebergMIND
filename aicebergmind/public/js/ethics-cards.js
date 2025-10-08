// Ethics Cards Expandable Functionality
document.addEventListener('DOMContentLoaded', function() {
  console.log('🃏 Ethics Cards JS Loading...');
  const ethicsCards = document.querySelectorAll('.ethics-card');
  console.log('📋 Found ethics cards:', ethicsCards.length);
  
  // Check if we're on mobile
  function isMobile() {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  // Function to toggle expanded state
  function toggleCard(card) {
    console.log('🔄 Toggling card:', card.querySelector('.ethics-card-title')?.textContent);
    const isExpanded = card.classList.contains('expanded');
    
    // Close all other cards first (accordion behavior)
    ethicsCards.forEach(otherCard => {
      if (otherCard !== card) {
        otherCard.classList.remove('expanded');
        otherCard.setAttribute('aria-expanded', 'false');
      }
    });
    
    // Toggle current card
    if (isExpanded) {
      card.classList.remove('expanded');
      card.setAttribute('aria-expanded', 'false');
      console.log('➖ Card collapsed');
    } else {
      card.classList.add('expanded');
      card.setAttribute('aria-expanded', 'true');
      console.log('➕ Card expanded');
    }
  }
  
  // Add event listeners for mobile touch interactions
  ethicsCards.forEach((card, index) => {
    console.log(`🎯 Setting up card ${index + 1}`);
    // Add aria-expanded attribute for accessibility
    card.setAttribute('aria-expanded', 'false');
    
    // Handle click/touch events
    card.addEventListener('click', function(e) {
      console.log('👆 Card clicked, mobile check:', isMobile(), 'window width:', window.innerWidth);
      
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
      ethicsCards.forEach(card => {
        card.classList.remove('expanded');
        card.setAttribute('aria-expanded', 'false');
      });
    }
  });
  
  console.log('✅ Ethics Cards JS Setup Complete');
});