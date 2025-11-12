const WordData = {
  CATEGORIES: {
    DOM_IDS: ["verbs", "nouns", "adjectives", "outcomes"],
    OBJECT_KEYS: ["verb", "noun", "adjective", "outcome"],
    HIGHLIGHT_ORDER: ["verb", "adjective", "noun", "outcome"],
    
    get DOM_IDS() {
      return WordData.CATEGORIES.OBJECT_KEYS.map(key => key + 's');
    }
  },

  SELECTORS: {
    CATEGORY_INPUTS: (id) => document.getElementById(id)
  },

  DEFAULT_WORDS: {
    verbs: "analyze, refactor, automate, debug, test, monitor, optimize, deploy, review, document, scale, secure, improve, enhance, streamline",
    nouns: "pipeline, module, commit, build, bug, metric, system, code, test, deployment, feature, service, database, cache, API",
    adjectives: "efficient, reliable, scalable, secure, fast, maintainable, robust, flexible, clean, modular, automated, optimized, tested, documented, performant",
    outcomes: "efficiency, stability, quality, speed, insight, scalability, security, productivity, reliability, maintainability, performance, accuracy, consistency, clarity, innovation"
  },

  parse(text) {
    return text.split(/[,\n]+/).filter(Boolean);
  },

  ensureDefaults() {
    WordData.CATEGORIES.DOM_IDS.forEach(cat => {
      const el = WordData.SELECTORS.CATEGORY_INPUTS(cat);
      if (!el.value.trim()) {
        el.value = WordData.DEFAULT_WORDS[cat];
      }
    });
  },

  restoreDefaults() {
    WordData.CATEGORIES.DOM_IDS.forEach(cat => {
      WordData.SELECTORS.CATEGORY_INPUTS(cat).value = WordData.DEFAULT_WORDS[cat];
    });
    Storage.save();
  }
};

const Layout = {
  CENTER_PERCENT_MIN: 40,
  CENTER_PERCENT_MAX: 60,
  EDGE_PERCENT: 20,
  ROTATION_RANGE: 8,
  SCALE_CENTER: 2.6,
  SCALE_EDGE: 0.6,

  randomPos(center = false) {
    let leftPercent, topPercent;
    
    if (center) {
      leftPercent = Layout.CENTER_PERCENT_MIN + Math.random() * (Layout.CENTER_PERCENT_MAX - Layout.CENTER_PERCENT_MIN);
      topPercent = Layout.CENTER_PERCENT_MIN + Math.random() * (Layout.CENTER_PERCENT_MAX - Layout.CENTER_PERCENT_MIN);
    } else {
      const edge = Math.random();
      if (edge < 0.25) {
        leftPercent = Math.random() * 100;
        topPercent = Math.random() * Layout.EDGE_PERCENT;
      } else if (edge < 0.5) {
        leftPercent = (100 - Layout.EDGE_PERCENT) + Math.random() * Layout.EDGE_PERCENT;
        topPercent = Math.random() * 100;
      } else if (edge < 0.75) {
        leftPercent = Math.random() * 100;
        topPercent = (100 - Layout.EDGE_PERCENT) + Math.random() * Layout.EDGE_PERCENT;
      } else {
        leftPercent = Math.random() * Layout.EDGE_PERCENT;
        topPercent = Math.random() * 100;
      }
    }
    
    return { 
      leftPercent, 
      topPercent,
      rotation: (Math.random() - 0.5) * Layout.ROTATION_RANGE
    };
  },

  calculateScaleFromPosition(leftPercent, topPercent) {
    const centerX = 50;
    const centerY = 50;
    const distanceX = Math.abs(leftPercent - centerX);
    const distanceY = Math.abs(topPercent - centerY);
    const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);
    
    const maxDistance = Math.sqrt(50 ** 2 + 50 ** 2);
    const normalizedDistance = distance / maxDistance;
    
    return Layout.SCALE_CENTER - (normalizedDistance * (Layout.SCALE_CENTER - Layout.SCALE_EDGE));
  },

  applyTransform(el, leftPercent, topPercent, rotation, scale) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const x = (viewportWidth * leftPercent / 100) - (viewportWidth / 2);
    const y = (viewportHeight * topPercent / 100) - (viewportHeight / 2);
    
    el.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`;
    
    el.dataset.leftPercent = leftPercent;
    el.dataset.topPercent = topPercent;
    el.dataset.rotation = rotation;
  }
};

const Renderer = {
  SELECTORS: {
    CONTAINER: "#word-container",
    WORD_SPANS: "#word-container span"
  },
  CENTER_WORD_RATIO: 0.25,
  MIN_CENTER_WORDS: 2,
  HIGHLIGHT_POSITIONS: [35, 47, 53, 65],
  HIGHLIGHT_VERTICAL_RANGE: 4,
  HIGHLIGHT_ROTATION_RANGE: 8,
  MIN_HIGHLIGHT_SPACING: 3,
  REPULSION_DISTANCE: 15,
  REPULSION_STRENGTH: 1.5,
  
  get container() {
    return document.querySelector(Renderer.SELECTORS.CONTAINER);
  },

  clearContainer() {
    while (Renderer.container.firstChild) Renderer.container.removeChild(Renderer.container.firstChild);
  },

  selectCenterWords(words) {
    const centerWords = {};
    WordData.CATEGORIES.OBJECT_KEYS.forEach(key => {
      centerWords[key] = [];
    });
    
    Object.entries(words).forEach(([type, list]) => {
      const shuffled = [...list].sort(() => Math.random() - 0.5);
      const centerCount = Math.max(Renderer.MIN_CENTER_WORDS, Math.floor(list.length * Renderer.CENTER_WORD_RATIO));
      centerWords[type] = shuffled.slice(0, centerCount);
    });
    
    return centerWords;
  },

  adjustHighlightedPositions(highlightedPositions) {
    const adjusted = [...highlightedPositions];
    const maxIterations = 10;
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let hasOverlap = false;
      
      for (let i = 0; i < adjusted.length; i++) {
        for (let j = i + 1; j < adjusted.length; j++) {
          const dx = adjusted[i].leftPercent - adjusted[j].leftPercent;
          const dy = adjusted[i].topPercent - adjusted[j].topPercent;
          const distance = Math.sqrt(dx ** 2 + dy ** 2);
          
          if (distance < Renderer.MIN_HIGHLIGHT_SPACING) {
            hasOverlap = true;
            const pushDistance = (Renderer.MIN_HIGHLIGHT_SPACING - distance) / 2;
            const angle = Math.atan2(dy, dx);
            
            adjusted[i].leftPercent += Math.cos(angle) * pushDistance;
            adjusted[i].topPercent += Math.sin(angle) * pushDistance;
            adjusted[j].leftPercent -= Math.cos(angle) * pushDistance;
            adjusted[j].topPercent -= Math.sin(angle) * pushDistance;
            
            adjusted[i].leftPercent = Math.max(30, Math.min(70, adjusted[i].leftPercent));
            adjusted[i].topPercent = Math.max(40, Math.min(60, adjusted[i].topPercent));
            adjusted[j].leftPercent = Math.max(30, Math.min(70, adjusted[j].leftPercent));
            adjusted[j].topPercent = Math.max(40, Math.min(60, adjusted[j].topPercent));
          }
        }
      }
      
      if (!hasOverlap) break;
    }
    
    return adjusted;
  },

  applyRepulsion(leftPercent, topPercent, highlightedPositions, isHighlighted = false) {
    if (!highlightedPositions?.length || isHighlighted) {
      return { leftPercent, topPercent };
    }
    
    let adjustedX = leftPercent;
    let adjustedY = topPercent;
    
    highlightedPositions.forEach(highlighted => {
      const dx = leftPercent - highlighted.leftPercent;
      const dy = topPercent - highlighted.topPercent;
      const distance = Math.sqrt(dx ** 2 + dy ** 2);
      
      if (distance < Renderer.REPULSION_DISTANCE && distance > 0) {
        const pushDistance = (Renderer.REPULSION_DISTANCE - distance) * Renderer.REPULSION_STRENGTH;
        const angle = Math.atan2(dy, dx);
        adjustedX += Math.cos(angle) * pushDistance;
        adjustedY += Math.sin(angle) * pushDistance;
      }
    });
    
    return {
      leftPercent: Math.max(0, Math.min(100, adjustedX)),
      topPercent: Math.max(0, Math.min(100, adjustedY))
    };
  },

  collectWordPositions(highlightWords, centerWords) {
    const highlightedPositions = [];
    const allWords = [];
    
    document.querySelectorAll(Renderer.SELECTORS.WORD_SPANS).forEach(el => {
      const wordType = el.dataset.wordType;
      const word = el.dataset.word;
      const isHighlighted = highlightWords?.[wordType] === word;
      
      let leftPercent, topPercent, rotation;
      
      if (isHighlighted) {
        const index = WordData.CATEGORIES.HIGHLIGHT_ORDER.indexOf(wordType);
        leftPercent = Renderer.HIGHLIGHT_POSITIONS[index] || 50;
        topPercent = 50 + (Math.random() - 0.5) * Renderer.HIGHLIGHT_VERTICAL_RANGE;
        rotation = (Math.random() - 0.5) * Renderer.HIGHLIGHT_ROTATION_RANGE;
        highlightedPositions.push({ leftPercent, topPercent, wordType, index });
      } else {
        const isCenter = centerWords?.[wordType]?.includes(word);
        const pos = Layout.randomPos(isCenter);
        leftPercent = pos.leftPercent;
        topPercent = pos.topPercent;
        rotation = pos.rotation;
      }
      
      allWords.push({ el, leftPercent, topPercent, rotation, isHighlighted, wordType });
    });
    
    return { highlightedPositions, allWords };
  },

  applyFinalPositions(allWords, highlightedPositions) {
    allWords.forEach(({ el, leftPercent, topPercent, rotation, isHighlighted, wordType }) => {
      let finalLeft = leftPercent;
      let finalTop = topPercent;
      
      if (isHighlighted) {
        const adjusted = highlightedPositions.find(h => h.wordType === wordType);
        if (adjusted) {
          finalLeft = adjusted.leftPercent;
          finalTop = adjusted.topPercent;
        }
      } else if (highlightedPositions.length > 0) {
        const repelled = Renderer.applyRepulsion(leftPercent, topPercent, highlightedPositions, isHighlighted);
        finalLeft = repelled.leftPercent;
        finalTop = repelled.topPercent;
      }
      
      const scale = Layout.calculateScaleFromPosition(finalLeft, finalTop);
      Layout.applyTransform(el, finalLeft, finalTop, rotation, scale);
    });
  },

  renderWords(words) {
    Renderer.clearContainer();
    const centerWords = Renderer.selectCenterWords(words);
    
    Object.entries(words).forEach(([type, list]) => {
      list.forEach(w => {
        const el = document.createElement("span");
        el.textContent = w.trim();
        el.className = type;
        el.dataset.wordType = type;
        el.dataset.word = w.trim();
        
        const isCenter = centerWords[type].includes(w.trim());
        const pos = Layout.randomPos(isCenter);
        const scale = Layout.calculateScaleFromPosition(pos.leftPercent, pos.topPercent);
        
        Layout.applyTransform(el, pos.leftPercent, pos.topPercent, pos.rotation, scale);
        Interaction.makeDraggable(el);
        Renderer.container.appendChild(el);
      });
    });
  },

  shuffleWords(words, highlightWords = null) {
    const centerWords = highlightWords ? null : Renderer.selectCenterWords(words);
    const { highlightedPositions, allWords } = Renderer.collectWordPositions(highlightWords, centerWords);
    const adjustedPositions = highlightedPositions.length > 0
      ? Renderer.adjustHighlightedPositions(highlightedPositions)
      : highlightedPositions;
    
    Renderer.applyFinalPositions(allWords, adjustedPositions);
  }
};

const Interaction = {
  makeDraggable(el) {
    let offsetX = 0, offsetY = 0, dragging = false;
    let initialRotation = 0;
    let initialLeftPercent = 50;
    let initialTopPercent = 50;

    el.addEventListener("pointerdown", e => {
      dragging = true;
      el.classList.add("dragging");
      
      initialLeftPercent = parseFloat(el.dataset.leftPercent) || 50;
      initialTopPercent = parseFloat(el.dataset.topPercent) || 50;
      initialRotation = parseFloat(el.dataset.rotation) || 0;
      
      const initialScale = Layout.calculateScaleFromPosition(initialLeftPercent, initialTopPercent);
      Layout.applyTransform(el, initialLeftPercent, initialTopPercent, initialRotation, initialScale);
      
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const elementCenterX = (viewportWidth * initialLeftPercent / 100);
      const elementCenterY = (viewportHeight * initialTopPercent / 100);
      
      offsetX = e.clientX - elementCenterX;
      offsetY = e.clientY - elementCenterY;
      
      el.setPointerCapture(e.pointerId);
    });

    el.addEventListener("pointermove", e => {
      if (!dragging) return;
      
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const elementCenterX = e.clientX - offsetX;
      const elementCenterY = e.clientY - offsetY;
      
      const leftPercent = Math.max(0, Math.min(100, (elementCenterX / viewportWidth) * 100));
      const topPercent = Math.max(0, Math.min(100, (elementCenterY / viewportHeight) * 100));
      
      const scale = Layout.calculateScaleFromPosition(leftPercent, topPercent);
      Layout.applyTransform(el, leftPercent, topPercent, initialRotation, scale);
    });

    el.addEventListener("pointerup", e => {
      dragging = false;
      el.classList.remove("dragging");
      el.releasePointerCapture(e.pointerId);
    });
  }
};

const Effects = {
  SELECTORS: {
    BUTTON_GROUP: "#button-group"
  },
  COLORS: [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#EA5455',
    '#2ECC71', '#3498DB', '#9B59B6', '#E74C3C', '#F39C12'
  ],

  triggerConfetti(centerOfScreen = false) {
    let centerX, centerY;
    
    if (centerOfScreen) {
      centerX = window.innerWidth / 2;
      centerY = window.innerHeight / 2;
    } else {
      const buttonGroup = document.querySelector(Effects.SELECTORS.BUTTON_GROUP);
      const rect = buttonGroup.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
    }
    
    const particleCount = centerOfScreen ? 80 : 50;
    
    for (let i = 0; i < particleCount; i++) {
      const c = document.createElement("div");
      c.className = "confetti";
      
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const distance = centerOfScreen ? (150 + Math.random() * 250) : (100 + Math.random() * 200);
      
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      const rotation = Math.random() * 720 - 360;
      
      c.style.left = centerX + "px";
      c.style.top = centerY + "px";
      c.style.background = Effects.COLORS[Math.floor(Math.random() * Effects.COLORS.length)];
      c.style.width = (centerOfScreen ? (8 + Math.random() * 8) : (6 + Math.random() * 6)) + "px";
      c.style.height = c.style.width;
      
      const duration = centerOfScreen ? (1.0 + Math.random() * 0.5) : (0.8 + Math.random() * 0.4);
      c.style.transition = `transform ${duration}s ease-out, opacity ${duration}s ease-out`;
      
      document.body.appendChild(c);
      
      requestAnimationFrame(() => {
        c.style.transform = `translate(${tx}px, ${ty}px) rotate(${rotation}deg) scale(0.5)`;
        c.style.opacity = "0";
      });
      
      setTimeout(() => c.remove(), (duration + 0.2) * 1000);
    }
  }
};

const Storage = {
  SELECTORS: {
    CATEGORY_INPUTS: (id) => WordData.SELECTORS.CATEGORY_INPUTS(id)
  },
  STORAGE_KEY: "brainfog-words",

  load() {
    const saved = localStorage.getItem(Storage.STORAGE_KEY);
    if (!saved) return;
    
    try {
      const data = JSON.parse(saved);
      WordData.CATEGORIES.DOM_IDS.forEach(cat => {
        if (data[cat]?.trim()) {
          Storage.SELECTORS.CATEGORY_INPUTS(cat).value = data[cat];
        }
      });
    } catch (e) {
      console.warn("Failed to load saved words:", e);
    }
  },

  save() {
    try {
      const data = {};
      WordData.CATEGORIES.DOM_IDS.forEach(cat => {
        data[cat] = Storage.SELECTORS.CATEGORY_INPUTS(cat).value;
      });
      localStorage.setItem(Storage.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to save words:", e);
    }
  }
};

const Brainfog = {
  SELECTORS: {
    UPDATE_BUTTON: "#update",
    RESTORE_DEFAULTS_BUTTON: "#restore-defaults",
    GENERATE_BUTTON: "#generate"
  },
  words: {},
  currentIdea: null,

  updateWords() {
    Brainfog.words = {};
    WordData.CATEGORIES.DOM_IDS.forEach((domId, i) => {
      const objectKey = WordData.CATEGORIES.OBJECT_KEYS[i];
      Brainfog.words[objectKey] = WordData.parse(WordData.SELECTORS.CATEGORY_INPUTS(domId).value);
    });
    Renderer.renderWords(Brainfog.words);
    Storage.save();
  },

  restoreDefaults() {
    WordData.restoreDefaults();
    Brainfog.updateWords();
  },

  generate() {
    const categories = WordData.CATEGORIES.OBJECT_KEYS;
    
    for (const key of categories) {
      const list = Brainfog.words[key] || [];
      if (list.length === 0) {
        alert("Add words in each category first!");
        return;
      }
    }
    
    const selected = {};
    categories.forEach(key => {
      const list = Brainfog.words[key];
      selected[key] = list[Math.floor(Math.random() * list.length)].trim();
    });
    
    Brainfog.currentIdea = selected;
    Renderer.shuffleWords(Brainfog.words, Brainfog.currentIdea);
    Storage.save();
    Effects.triggerConfetti(false);
  },

  init() {
    document.querySelector(Brainfog.SELECTORS.UPDATE_BUTTON).addEventListener("click", Brainfog.updateWords);
    document.querySelector(Brainfog.SELECTORS.RESTORE_DEFAULTS_BUTTON).addEventListener("click", Brainfog.restoreDefaults);
    document.querySelector(Brainfog.SELECTORS.GENERATE_BUTTON).addEventListener("click", Brainfog.generate);

    WordData.CATEGORIES.DOM_IDS.forEach(id => {
      WordData.SELECTORS.CATEGORY_INPUTS(id).addEventListener("input", Storage.save);
    });

    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        document.querySelectorAll(Renderer.SELECTORS.WORD_SPANS).forEach(el => {
          const leftPercent = parseFloat(el.dataset.leftPercent) || 50;
          const topPercent = parseFloat(el.dataset.topPercent) || 50;
          const rotation = parseFloat(el.dataset.rotation) || 0;
          const scale = Layout.calculateScaleFromPosition(leftPercent, topPercent);
          Layout.applyTransform(el, leftPercent, topPercent, rotation, scale);
        });
      }, 100);
    });

    Storage.load();
    WordData.ensureDefaults();
    Brainfog.updateWords();
    setTimeout(() => Brainfog.generate(), 200);
  }
};

Brainfog.init();
