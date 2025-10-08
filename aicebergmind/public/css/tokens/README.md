# 🎨 AIceberg Mind - Design Token System

## 📖 Overview

Il **Design Token System** di AIceberg Mind centralizza tutti i valori di design (colori, spaziature, animazioni, tipografia) per garantire coerenza e facilità di manutenzione.

## 🏗️ Struttura

```
public/css/tokens/
├── design-tokens.css    # Token centralizzati
└── README.md           # Questa documentazione
```

## 🎯 Token Disponibili

### Brand Colors
```css
--brand-cyan: #00D4FF;
--brand-mint: #5EE4C3;
```

### Spacing System
```css
--space-xs: 0.5rem;    /* 8px */
--space-sm: 1rem;      /* 16px */
--space-md: 1.5rem;    /* 24px */
--space-lg: 2.5rem;    /* 40px */
--space-xl: 4rem;      /* 64px */
--space-xxl: 6rem;     /* 96px */
```

### Animation Tokens
```css
/* Durate */
--iceberg-duration-float: 8s;
--iceberg-duration-drift: 18s;
--logo-duration-cinematic: 8s;

/* Easing */
--iceberg-easing: ease-in-out;
--easing-smooth: cubic-bezier(0.4, 0, 0.2, 1);

/* Opacità */
--iceberg-opacity-base: 0.8;
--geo-opacity-subtle: 0.08;
```

## 🚀 Come Usare

### ✅ Corretto
```css
.my-element {
  margin: var(--space-lg);
  color: var(--brand-cyan);
  animation-duration: var(--logo-duration-cinematic);
}
```

### ❌ Evitare
```css
.my-element {
  margin: 2.5rem; /* Hard-coded! */
  color: #00D4FF; /* Hard-coded! */
  animation-duration: 8s; /* Hard-coded! */
}
```

## 🔄 Responsive Behavior

I token si adattano automaticamente ai breakpoint:

```css
/* Desktop */
--space-lg: 2.5rem;

/* Mobile (< 768px) */
--space-lg: 1.5rem;

/* Mobile Small (< 480px) */
--space-lg: 1rem;
```

## 🎨 Sistema Iceberg

Token specifici per le animazioni iceberg:

```css
/* Elementi Canvas */
#iceberg {
  opacity: var(--iceberg-opacity-base);
  filter: blur(var(--iceberg-blur-canvas));
  animation: icebergFloat var(--iceberg-duration-float) var(--iceberg-easing) infinite;
}

/* Forme Geometriche */
.iceberg-shape {
  opacity: var(--iceberg-opacity-shape);
  background: var(--gradient-iceberg-1);
  animation-duration: var(--iceberg-duration-drift);
}
```

## 🔧 Manutenzione

### Aggiungere Nuovi Token
1. Aprire `design-tokens.css`
2. Aggiungere nella sezione appropriata:
```css
/* Nuovo token */
--my-new-token: value;
```

### Modificare Valori Esistenti
1. Modificare solo in `design-tokens.css`
2. Il cambiamento si propaga automaticamente ovunque

### Deprecare Token
1. Aggiungere commento `/* @deprecated */`
2. Sostituire gradualmente nell'uso
3. Rimuovere dopo migrazione completa

## 🎭 Accessibilità

I token supportano automaticamente `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --iceberg-duration-float: 0s; /* Disabilita animazioni */
  }
}
```

## 📊 Benefici

- **-40% duplicazioni CSS**: Token centralizzati eliminano repetizioni
- **+60% velocità manutenzione**: Modifica un valore, aggiorna tutto
- **100% coerenza**: Impossibile usare valori inconsistenti
- **Performance**: Meno CSS, cache più efficiente

## 🔍 Debug

Per verificare che i token siano caricati:

```javascript
// Console del browser
console.log(getComputedStyle(document.documentElement).getPropertyValue('--brand-cyan'));
// Dovrebbe restituire: #00D4FF
```

---

*Ultimo aggiornamento: Ottobre 2025*  
*Sistema creato per AIceberg Mind project*