/**
 * Sticky Section Titles - Simple & Robust Version
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Sticky Titles initializing...');
  
  // Clean up any unwanted SVG elements in sticky titles
  function cleanupSVGs() {
    // Remove all SVGs from sticky titles
    document.querySelectorAll('.section-title-sticky svg, .section-title-text svg').forEach(svg => {
      svg.remove();
    });
    
    // Find and remove specific eye icon SVGs
    document.querySelectorAll('svg path[d*="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"]').forEach(path => {
      const svg = path.closest('svg');
      if (svg && !svg.closest('.audience-item')) {
        svg.remove();
      }
    });
    
    // Clean innerHTML of sticky title texts
    document.querySelectorAll('.section-title-text').forEach(el => {
      const originalText = el.textContent || el.innerText;
      if (el.innerHTML !== originalText) {
        el.innerHTML = originalText;
      }
    });
    
    // Clean up sticky title containers
    document.querySelectorAll('.section-title-sticky').forEach(sticky => {
      const svgs = sticky.querySelectorAll('svg');
      svgs.forEach(svg => svg.remove());
    });
  }
  
  // Execute cleanup immediately and with delays
  cleanupSVGs();
  setTimeout(cleanupSVGs, 100);
  setTimeout(cleanupSVGs, 500);
  
  if (window.innerWidth <= 1024) {
    console.log('📱 Mobile detected - skipping sticky titles');
    return;
  }

  // Section definitions in correct order
  const sectionsData = [
    { id: 'hero', title: 'Iceberg Mind' },
    { id: 'about', title: 'Behind the Surface' }, 
    { id: 'team', title: 'Who We Are' },
    { id: 'projects', title: 'Living Projects' },
    { id: 'philosophy', title: 'Philosophy' },
    { id: 'pillars', title: 'Core Pillars' },
    { id: 'channels', title: 'Channels' }
  ];

  let currentVisibleTitle = null;

  // Update sticky titles based on scroll position
  function updateStickyTitles() {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const midPoint = scrollY + (windowHeight / 2);
    
    let activeSection = null;
    let minDistance = Infinity;

    // Check if we're near the bottom of the page
    const nearBottom = (scrollY + windowHeight) >= (documentHeight - 100);

    // Find the section closest to viewport center
    sectionsData.forEach(({ id }) => {
      const section = document.getElementById(id);
      if (section) {
        const rect = section.getBoundingClientRect();
        const sectionTop = scrollY + rect.top;
        const sectionBottom = sectionTop + rect.height;
        
        // Check if midpoint is within section bounds
        if (midPoint >= sectionTop && midPoint <= sectionBottom) {
          const distanceFromTop = Math.abs(midPoint - sectionTop);
          if (distanceFromTop < minDistance) {
            minDistance = distanceFromTop;
            activeSection = id;
          }
        }
      }
    });

    // If near bottom and no active section found, show the last section
    if (nearBottom && !activeSection) {
      activeSection = sectionsData[sectionsData.length - 1].id;
    }

    // Update visibility only if section changed
    if (activeSection && activeSection !== currentVisibleTitle) {
      
      // Hide all titles
      sectionsData.forEach(({ id }) => {
        const stickyTitle = document.querySelector(`.section-title-sticky[data-section="${id}"]`);
        if (stickyTitle) {
          stickyTitle.classList.remove('active');
          stickyTitle.classList.add('hidden');
        }
      });

      // Show active title
      const activeStickyTitle = document.querySelector(`.section-title-sticky[data-section="${activeSection}"]`);
      if (activeStickyTitle) {
        activeStickyTitle.classList.remove('hidden');
        activeStickyTitle.classList.add('active');
        currentVisibleTitle = activeSection;
        
        console.log(`📍 Active section: ${activeSection}`);
      }
    }
  }

  // Initialize and check for elements
  let foundElements = 0;
  sectionsData.forEach(({ id, title }) => {
    const section = document.getElementById(id);
    const stickyTitle = document.querySelector(`.section-title-sticky[data-section="${id}"]`);
    
    if (section && stickyTitle) {
      foundElements++;
      // Ensure title is hidden initially
      stickyTitle.classList.add('hidden');
      stickyTitle.classList.remove('active');
      console.log(`✅ ${id}: section and sticky title found`);
    } else {
      console.log(`❌ ${id}: section=${!!section}, stickyTitle=${!!stickyTitle}`);
    }
  });

  console.log(`📊 Found ${foundElements} sticky title elements out of ${sectionsData.length} sections`);

  if (foundElements > 0) {
    // Update immediately
    updateStickyTitles();
    
    // Update on scroll with throttling
    let scrollTimeout;
    window.addEventListener('scroll', function() {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateStickyTitles, 50); // 20fps
    });

    console.log('✅ Sticky titles system activated');
  } else {
    console.log('❌ No sticky title elements found');
  }
});