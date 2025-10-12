/**
 * Universal Sticky Section Titles System - FIXED VERSION
 * Sistema esclusivo: solo un titolo visibile alla volta
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Sticky Titles System: Initializing...');
  
  // Solo su desktop (larghezza > 1024px)
  if (window.innerWidth > 1024) {
    
    // Trova tutti gli elementi sticky title e le sezioni corrispondenti
    const stickyTitles = document.querySelectorAll('.section-title-sticky');
    console.log(`🔍 Trovati ${stickyTitles.length} elementi .section-title-sticky`);
    
    const sections = [];
    
    stickyTitles.forEach((stickyTitle, index) => {
      const sectionId = stickyTitle.dataset.section;
      const section = document.getElementById(sectionId);
      
      console.log(`📋 Elemento ${index + 1}: section-id="${sectionId}", sezione trovata: ${!!section}`);
      
      if (section) {
        sections.push({
          stickyTitle,
          section,
          sectionId
        });
        
        // Inizializza tutti come nascosti
        stickyTitle.classList.add('hidden');
        stickyTitle.classList.remove('active');
      }
    });

    console.log(`✅ Inizializzati ${sections.length} sticky titles`);

    let currentActiveSection = null;
    
    // Crea un Intersection Observer per ogni sezione individualmente
    sections.forEach(({ stickyTitle, section, sectionId }) => {
      
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            
            // Se c'è una sezione già attiva e questa è diversa, cambia
            if (currentActiveSection && currentActiveSection !== sectionId) {
              // Nascondi il titolo precedente
              const prevSection = sections.find(s => s.sectionId === currentActiveSection);
              if (prevSection) {
                prevSection.stickyTitle.classList.remove('active');
                prevSection.stickyTitle.classList.add('hidden');
              }
            }
            
            // Attiva questa sezione
            stickyTitle.classList.remove('hidden');
            stickyTitle.classList.add('active');
            currentActiveSection = sectionId;
            
            console.log(`📍 Sezione ${sectionId} ATTIVA (ratio: ${entry.intersectionRatio.toFixed(2)})`);
            
          } else if (!entry.isIntersecting && currentActiveSection === sectionId) {
            // Solo se questa sezione era attiva e ora è completamente fuori
            stickyTitle.classList.remove('active');
            stickyTitle.classList.add('hidden');
            currentActiveSection = null;
            
            console.log(`↩️ Sezione ${sectionId} NASCOSTA`);
          }
        });
      }, {
        threshold: [0, 0.3, 0.5, 0.7],
        rootMargin: '-20% 0px -20% 0px' // Margini per evitare flickering
      });
      
      observer.observe(section);
    });


    console.log('✅ Sistema Sticky Section Titles attivato');
  } else {
    console.log('📱 Sistema Sticky Titles disabilitato su mobile/tablet');
  }
});

// Gestione del resize
window.addEventListener('resize', function() {
  const isDesktop = window.innerWidth > 1024;
  if (!isDesktop) {
    // Nascondi tutti i titoli su mobile
    document.querySelectorAll('.section-title-sticky').forEach(title => {
      title.classList.add('hidden');
      title.classList.remove('active');
    });
  }
});