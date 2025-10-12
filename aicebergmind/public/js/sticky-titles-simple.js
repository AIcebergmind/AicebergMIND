/**
 * Sticky Section Titles - ULTRA SIMPLE & ROBUST VERSION
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 SIMPLE Sticky Titles initializing...');
  
  // PULIZIA ESTREMA: trova e distruggi l'icona dell'occhio ovunque sia!
  function puliziaEstrema() {
    console.log('🔥 PULIZIA ESTREMA DELL\'OCCHIO IN CORSO...');
    
    // 1. Rimuovi TUTTI i SVG negli sticky titles
    document.querySelectorAll('.section-title-sticky svg, .section-title-text svg').forEach(svg => {
      console.log('🧹 Rimozione SVG sticky:', svg);
      svg.remove();
    });
    
    // 2. Cerca SVG con path dell'occhio specifico
    document.querySelectorAll('svg path[d*="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"]').forEach(path => {
      const svg = path.closest('svg');
      if (svg && !svg.closest('.audience-item')) { // Non toccare quelli dell'audience
        console.log('🎯 Trovato e rimosso SVG occhio:', svg);
        svg.remove();
      }
    });
    
    // 3. Pulisci innerHTML completo degli sticky titles
    document.querySelectorAll('.section-title-text').forEach(el => {
      const originalText = el.textContent || el.innerText;
      if (el.innerHTML !== originalText) {
        console.log('🧹 Prima:', el.innerHTML);
        el.innerHTML = originalText;
        console.log('🧹 Dopo:', el.innerHTML);
      }
    });
    
    // 4. Pulisci anche .section-title-sticky completi
    document.querySelectorAll('.section-title-sticky').forEach(sticky => {
      const svgs = sticky.querySelectorAll('svg');
      svgs.forEach(svg => {
        console.log('🔥 Rimozione SVG da sticky:', svg);
        svg.remove();
      });
    });
    
    // 5. Log di debug per vedere cosa c'è negli sticky titles
    document.querySelectorAll('.section-title-sticky[data-section="about"]').forEach(el => {
      console.log('📋 Contenuto About sticky:', el.innerHTML);
    });
  }
  
  // Esegui immediatamente
  puliziaEstrema();
  
  // Esegui dopo 100ms
  setTimeout(puliziaEstrema, 100);
  
  // Esegui dopo 500ms per sicurezza
  setTimeout(puliziaEstrema, 500);
  
  if (window.innerWidth <= 1024) {
    console.log('📱 Mobile detected - skipping sticky titles');
    return;
  }

  // Definizione manuale delle sezioni nell'ordine giusto
  const sectionsData = [
    { id: 'hero', title: 'Iceberg Mind' },
    { id: 'about', title: 'Behind the Surface' }, 
    { id: 'team', title: 'Who We Are' },
    { id: 'projects', title: 'Living Projects' },
    { id: 'pillars', title: 'Core Pillars' },
    { id: 'ethics', title: 'Ethics' },
    { id: 'channels', title: 'Channels' }
  ];

  let currentVisibleTitle = null;

  // Funzione per aggiornare i titoli
  function updateStickyTitles() {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const midPoint = scrollY + (windowHeight / 2);
    
    let activeSection = null;
    let minDistance = Infinity;

    // Trova la sezione più vicina al centro della vista
    sectionsData.forEach(({ id }) => {
      const section = document.getElementById(id);
      if (section) {
        const rect = section.getBoundingClientRect();
        const sectionTop = scrollY + rect.top;
        const sectionBottom = sectionTop + rect.height;
        
        // Se il punto centrale è dentro la sezione
        if (midPoint >= sectionTop && midPoint <= sectionBottom) {
          const distanceFromTop = Math.abs(midPoint - sectionTop);
          if (distanceFromTop < minDistance) {
            minDistance = distanceFromTop;
            activeSection = id;
          }
        }
      }
    });

    // Aggiorna la visualizzazione solo se è cambiato
    if (activeSection && activeSection !== currentVisibleTitle) {
      
      // Nascondi tutti
      sectionsData.forEach(({ id }) => {
        const stickyTitle = document.querySelector(`.section-title-sticky[data-section="${id}"]`);
        if (stickyTitle) {
          stickyTitle.classList.remove('active');
          stickyTitle.classList.add('hidden');
        }
      });

      // Mostra quello attivo
      const activeStickyTitle = document.querySelector(`.section-title-sticky[data-section="${activeSection}"]`);
      if (activeStickyTitle) {
        activeStickyTitle.classList.remove('hidden');
        activeStickyTitle.classList.add('active');
        currentVisibleTitle = activeSection;
        
        console.log(`📍 Sezione ATTIVA: ${activeSection}`);
      }
    }
  }

  // Inizializza e controlla se ci sono elementi
  let foundElements = 0;
  sectionsData.forEach(({ id, title }) => {
    const section = document.getElementById(id);
    const stickyTitle = document.querySelector(`.section-title-sticky[data-section="${id}"]`);
    
    if (section && stickyTitle) {
      foundElements++;
      // Assicurati che il titolo sia nascosto all'inizio
      stickyTitle.classList.add('hidden');
      stickyTitle.classList.remove('active');
      console.log(`✅ ${id}: sezione e sticky title trovati`);
    } else {
      console.log(`❌ ${id}: sezione=${!!section}, stickyTitle=${!!stickyTitle}`);
    }
  });

  console.log(`📊 Trovati ${foundElements} elementi sticky title su ${sectionsData.length} sezioni`);

  if (foundElements > 0) {
    // Aggiorna immediatamente
    updateStickyTitles();
    
    // Aggiorna durante lo scroll con throttling
    let scrollTimeout;
    window.addEventListener('scroll', function() {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateStickyTitles, 50); // 20fps
    });

    console.log('✅ Sistema sticky titles SEMPLICE attivato');
  } else {
    console.log('❌ Nessun elemento sticky title trovato');
  }
});