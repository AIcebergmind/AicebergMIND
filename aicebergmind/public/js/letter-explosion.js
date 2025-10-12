/**
 * Letter Explosion Animation System
 * Gestisce l'animazione spettacolare delle lettere del titolo hero
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('🎆 Letter Explosion initializing...');
  
  const letters = document.querySelectorAll('.letter-explosion .letter');
  
  if (letters.length === 0) {
    console.log('❌ Nessuna lettera trovata per l\'esplosione');
    return;
  }
  
  // Assegna delay casuali e attiva l'animazione
  letters.forEach((letter, index) => {
    const delay = letter.getAttribute('data-delay') || (index * 0.1);
    letter.style.setProperty('--delay', delay);
    
    // Aggiungi un po' di randomness extra
    const randomDelay = Math.random() * 0.05; // Piccola variazione casuale
    letter.style.animationDelay = `${parseFloat(delay) + randomDelay + 1}s`;
    
    console.log(`✨ Lettera "${letter.textContent}" - delay: ${delay}s`);
  });
  
  // Effetto sonoro simulato con console
  setTimeout(() => {
    console.log('💥 ESPLOSIONE DELLE LETTERE INIZIATA!');
  }, 1000);
  
  setTimeout(() => {
    console.log('🎯 Lettere ricomposte nel titolo!');
  }, 4000);
  
  // Attiva l'effetto AI dopo che l'animazione principale finisce
  setTimeout(() => {
    const aiLetters = document.querySelectorAll('.ai-letter');
    console.log(`🔍 Trovate ${aiLetters.length} lettere AI:`, aiLetters);
    
    aiLetters.forEach((letter, index) => {
      console.log(`📋 Lettera ${index}: "${letter.textContent}" - classi attuali:`, letter.classList.toString());
      
      setTimeout(() => {
        letter.classList.add('activated');
        
        // Forza gli stili via JavaScript come backup
        letter.style.fontWeight = '900';
        letter.style.color = '#00D4FF';
        letter.style.textShadow = '0 0 20px #00D4FF, 0 0 40px rgba(0, 212, 255, 0.5), 0 0 60px rgba(0, 212, 255, 0.3)';
        letter.style.opacity = '1';
        letter.style.transform = 'scale(1.15) translateZ(15px)';
        letter.style.transition = 'transform 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        
        console.log(`✨ "${letter.textContent}" trasformato in ACCENT! Nuove classi:`, letter.classList.toString());
        
        // Debug: controlla gli stili applicati
        const computedStyle = window.getComputedStyle(letter);
        console.log(`🎨 Colore di "${letter.textContent}":`, computedStyle.color);
        console.log(`📏 Font-weight di "${letter.textContent}":`, computedStyle.fontWeight);
        console.log(`👁️ Opacity di "${letter.textContent}":`, computedStyle.opacity);
      }, index * 200); // Stagger effect per A e I
    });
    
    console.log('🔥 AI ACCENT EFFECT ATTIVATO!');
  }, 4500); // Dopo 4.5 secondi
  
  // Inizializza l'animazione del subtitle
  const subtitleWords = document.querySelectorAll('.subtitle-reveal .word');
  if (subtitleWords.length > 0) {
    subtitleWords.forEach((word, index) => {
      const delay = word.getAttribute('data-delay') || (index * 0.15);
      word.style.setProperty('--delay', delay);
      console.log(`📝 Parola "${word.textContent}" - delay: ${delay}s`);
    });
    
    console.log(`📖 Subtitle animation attivata per ${subtitleWords.length} parole`);
    
    // Attiva effetto speciale per "nature" 
    setTimeout(() => {
      const natureWord = document.querySelector('.accent-word');
      if (natureWord) {
        natureWord.style.animation += ', glow 2s ease-in-out infinite';
        console.log('🌿 Effetto "nature" attivato!');
      }
    }, 7500); // Dopo che tutte le parole sono apparse
  }
  
  console.log(`🚀 Letter Explosion attivato per ${letters.length} lettere`);
});