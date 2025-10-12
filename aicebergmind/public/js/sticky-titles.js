/**
 * Universal Sticky Section Titles System
 * Gestisce tutti i titoli sticky per tutte le sezioni del sito
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
    let currentActiveTitle = null;
    
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
        
        // Inizializza senza classi, lascia che l'observer gestisca
        stickyTitle.classList.remove('active', 'entering', 'leaving', 'hidden');
      }
    });

    console.log(`✅ Inizializzati ${sections.length} sticky titles per le sezioni:`, 
                sections.map(s => s.sectionId).join(', '));

    // Funzione per nascondere tutti i titoli tranne quello attivo
    function hideAllTitlesExcept(activeTitle) {
      stickyTitles.forEach(title => {
        if (title !== activeTitle) {
          title.classList.remove('active', 'entering');
          title.classList.add('hidden');
        }
      });
    }

    // Crea un Intersection Observer per ogni sezione
    sections.forEach(({ stickyTitle, section, sectionId }) => {
      
      const stickyObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            // Sezione è significativamente visibile - diventa attiva
            
            // Nascondi il titolo precedente immediatamente se ce n'è uno
            if (currentActiveTitle && currentActiveTitle !== stickyTitle) {
              currentActiveTitle.classList.remove('active', 'entering');
              currentActiveTitle.classList.add('hidden');
            }
            
            // Attiva il nuovo titolo
            stickyTitle.classList.remove('hidden', 'leaving');
            stickyTitle.classList.add('active');
            currentActiveTitle = stickyTitle;
            
            console.log(`� Sezione ${sectionId} ATTIVA - Altri titoli nascosti`);
            
          } else if (!entry.isIntersecting) {
            // Sezione completamente fuori dal viewport
            if (currentActiveTitle === stickyTitle) {
              stickyTitle.classList.remove('active', 'entering');
              stickyTitle.classList.add('hidden');
              currentActiveTitle = null;
              
              console.log(`↩️ Sezione ${sectionId} NASCOSTA`);
            }
          }
        });
      }, {
        threshold: [0, 0.1, 0.3, 0.5, 0.7],
        rootMargin: '-10% 0px -10% 0px' // Margini più stretti per transizioni più decise
      });
      
      // Inizia l'osservazione per questa sezione
      stickyObserver.observe(section);
    });

    // Test specifico per la sezione About
    const aboutSticky = document.querySelector('.section-title-sticky[data-section="about"]');
    const aboutSection = document.getElementById('about');
    console.log(`🧪 Test About: Sticky element exists: ${!!aboutSticky}, Section exists: ${!!aboutSection}`);
    
    if (aboutSticky && aboutSection) {
      console.log(`📝 About section title text: "${aboutSticky.querySelector('.section-title-text')?.textContent}"`);
    }

    console.log('✅ Sistema Sticky Section Titles esclusivo inizializzato');
  } else {
    console.log('📱 Sistema Sticky Titles disabilitato su mobile/tablet');
  }
});

// Gestione del resize per riattivare il sistema se si passa da mobile a desktop
window.addEventListener('resize', function() {
  // Ricarica la pagina se si passa da mobile a desktop o viceversa
  const wasDesktop = window.innerWidth > 1024;
  setTimeout(() => {
    const isDesktop = window.innerWidth > 1024;
    if (wasDesktop !== isDesktop) {
      console.log('🔄 Resize detected - Sistema sticky titles updated');
    }
  }, 100);
});