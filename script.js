let words = {};
let currentIdea = null; // { verb: string, noun: string, adjective: string, outcome: string }
const container = document.getElementById("word-container");

// Constants
const CENTER_PERCENT_MIN = 30;
const CENTER_PERCENT_MAX = 70;
const EDGE_PERCENT = 25;
const ROTATION_RANGE = 8; // -4 to +4 degrees
const CENTER_WORD_RATIO = 0.35;
const MIN_CENTER_WORDS = 3;
const HIGHLIGHT_POSITIONS = [25, 40, 60, 75]; // verb, adjective, noun, outcome
const HIGHLIGHT_VERTICAL_RANGE = 6; // -3% to +3%
const HIGHLIGHT_ROTATION_RANGE = 8; // -4 to +4 degrees

// Load from localStorage
function loadFromStorage() {
  const saved = localStorage.getItem("brainfogWords");
  if (saved) {
    try {
      const data = JSON.parse(saved);
      // Only use saved values if they have content, otherwise keep defaults
      if (data.verbs && data.verbs.trim()) {
        document.getElementById("verbs").value = data.verbs;
      }
      if (data.nouns && data.nouns.trim()) {
        document.getElementById("nouns").value = data.nouns;
      }
      if (data.adjectives && data.adjectives.trim()) {
        document.getElementById("adjectives").value = data.adjectives;
      }
      if (data.outcomes && data.outcomes.trim()) {
        document.getElementById("outcomes").value = data.outcomes;
      }
    } catch (e) {
      // If corrupted, ignore and use defaults
      console.warn("Failed to load saved words:", e);
    }
  }
}

// Save to localStorage
function saveToStorage() {
  try {
    localStorage.setItem("brainfogWords", JSON.stringify({
      verbs: document.getElementById("verbs").value,
      nouns: document.getElementById("nouns").value,
      adjectives: document.getElementById("adjectives").value,
      outcomes: document.getElementById("outcomes").value
    }));
  } catch (e) {
    console.warn("Failed to save words:", e);
  }
}

function randomPos(center = false) {
  let left, top;
  
  if (center) {
    left = CENTER_PERCENT_MIN + Math.random() * (CENTER_PERCENT_MAX - CENTER_PERCENT_MIN) + "%";
    top = CENTER_PERCENT_MIN + Math.random() * (CENTER_PERCENT_MAX - CENTER_PERCENT_MIN) + "%";
  } else {
    const edge = Math.random();
    if (edge < 0.25) {
      left = Math.random() * 100 + "%";
      top = Math.random() * EDGE_PERCENT + "%";
    } else if (edge < 0.5) {
      left = (100 - EDGE_PERCENT) + Math.random() * EDGE_PERCENT + "%";
      top = Math.random() * 100 + "%";
    } else if (edge < 0.75) {
      left = Math.random() * 100 + "%";
      top = (100 - EDGE_PERCENT) + Math.random() * EDGE_PERCENT + "%";
    } else {
      left = Math.random() * EDGE_PERCENT + "%";
      top = Math.random() * 100 + "%";
    }
  }
  
  return { 
    left, 
    top,
    rot: (Math.random() - 0.5) * ROTATION_RANGE
  };
}

function clearContainer() {
  while (container.firstChild) container.removeChild(container.firstChild);
}

function selectCenterWords() {
  const centerWords = {
    verb: [],
    noun: [],
    adjective: [],
    outcome: []
  };
  
  Object.entries(words).forEach(([type, list]) => {
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    const centerCount = Math.max(MIN_CENTER_WORDS, Math.floor(list.length * CENTER_WORD_RATIO));
    centerWords[type] = shuffled.slice(0, centerCount);
  });
  
  return centerWords;
}

function renderWords() {
  clearContainer();
  const centerWords = selectCenterWords();
  
  Object.entries(words).forEach(([type, list]) => {
    list.forEach(w => {
      const el = document.createElement("span");
      el.textContent = w.trim();
      el.className = type;
      el.dataset.wordType = type;
      el.dataset.word = w.trim();
      
      const isCenter = centerWords[type].includes(w.trim());
      const pos = randomPos(isCenter);
      
      el.style.left = pos.left;
      el.style.top = pos.top;
      el.style.setProperty("--rot", pos.rot + "deg");
      makeDraggable(el);
      container.appendChild(el);
    });
  });
}

function getRotation(el) {
  const computedStyle = window.getComputedStyle(el);
  const rotVar = computedStyle.getPropertyValue('--rot');
  if (rotVar) {
    return parseFloat(rotVar) || 0;
  }
  const transform = computedStyle.transform;
  if (transform && transform !== 'none') {
    const rotateMatch = transform.match(/rotate\(([^)]+)deg\)/);
    if (rotateMatch) {
      return parseFloat(rotateMatch[1]) || 0;
    }
  }
  return 0;
}

function shuffleWords(highlightWords = null) {
  const centerWords = highlightWords ? null : selectCenterWords();
  
  document.querySelectorAll("#word-container span").forEach(el => {
    const wordType = el.dataset.wordType;
    const word = el.dataset.word;
    const isHighlighted = highlightWords?.[wordType] === word;
    
    if (isHighlighted) {
      el.classList.add('highlighted');
      el.dataset.highlightType = wordType;
      const currentRotation = getRotation(el);
      el.dataset.currentRotation = currentRotation;
      el.style.transform = `translate(0, 0) rotate(${currentRotation}deg)`;
    } else {
      el.classList.remove('highlighted');
      const isCenter = centerWords?.[wordType]?.includes(word);
      const pos = randomPos(isCenter);
      el.style.left = pos.left;
      el.style.top = pos.top;
      el.style.setProperty("--rot", pos.rot + "deg");
    }
  });
  
  // Position highlighted words - set final position in next frame for smooth transition
  if (highlightWords) {
    requestAnimationFrame(() => {
      const highlighted = document.querySelectorAll("#word-container span.highlighted");
      if (highlighted.length === 4) {
        const order = ['verb', 'adjective', 'noun', 'outcome'];
        const sorted = Array.from(highlighted).sort((a, b) => {
          return order.indexOf(a.dataset.highlightType) - order.indexOf(b.dataset.highlightType);
        });
        
        sorted.forEach((el, index) => {
          const leftPercent = HIGHLIGHT_POSITIONS[index] || 50;
          const verticalOffset = (Math.random() - 0.5) * HIGHLIGHT_VERTICAL_RANGE;
          const topPercent = 50 + verticalOffset;
          const rotation = (Math.random() - 0.5) * HIGHLIGHT_ROTATION_RANGE;
          
          el.style.left = leftPercent + "%";
          el.style.top = topPercent + "%";
          el.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
        });
      }
    });
  }
}

function generateIdea() {
  const verbs = words.verb || [];
  const nouns = words.noun || [];
  const adjectives = words.adjective || [];
  const outcomes = words.outcome || [];
  
  if (verbs.length === 0 || nouns.length === 0 || adjectives.length === 0 || outcomes.length === 0) {
    alert("Add words in each category first!");
    return;
  }
  
  const verb = verbs[Math.floor(Math.random() * verbs.length)].trim();
  const noun = nouns[Math.floor(Math.random() * nouns.length)].trim();
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)].trim();
  const outcome = outcomes[Math.floor(Math.random() * outcomes.length)].trim();
  
  // Store current idea
  currentIdea = { verb, noun, adjective, outcome };
  
  // Shuffle all words and highlight the generated ones
  shuffleWords(currentIdea);
  saveToStorage();
  
  // Trigger confetti from button
  triggerConfetti(false);
}

function updateWords() {
  words = {
    verb: document.getElementById("verbs").value.split(/[,\n]+/).filter(Boolean),
    noun: document.getElementById("nouns").value.split(/[,\n]+/).filter(Boolean),
    adjective: document.getElementById("adjectives").value.split(/[,\n]+/).filter(Boolean),
    outcome: document.getElementById("outcomes").value.split(/[,\n]+/).filter(Boolean)
  };
  renderWords();
  saveToStorage();
}

function triggerConfetti(centerOfScreen = false) {
  let centerX, centerY;
  
  if (centerOfScreen) {
    // Use center of the screen/viewport
    centerX = window.innerWidth / 2;
    centerY = window.innerHeight / 2;
  } else {
    // Get center point of the button area
    const buttonGroup = document.getElementById("button-group");
    const rect = buttonGroup.getBoundingClientRect();
    centerX = rect.left + rect.width / 2;
    centerY = rect.top + rect.height / 2;
  }
  
  // Vibrant color palette
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#EA5455',
    '#2ECC71', '#3498DB', '#9B59B6', '#E74C3C', '#F39C12'
  ];
  
  // More particles for center screen burst
  const particleCount = centerOfScreen ? 80 : 50;
  
  for (let i = 0; i < particleCount; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    
    // Random angle for explosion (0 to 360 degrees)
    const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
    // Random distance - larger for center screen burst
    const distance = centerOfScreen ? (150 + Math.random() * 250) : (100 + Math.random() * 200);
    
    // Calculate end position
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    const rotation = Math.random() * 720 - 360; // -360 to 360 degrees
    
    // Set initial position
    c.style.left = centerX + "px";
    c.style.top = centerY + "px";
    
    // Random color from palette
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    
    // Random size variation - larger for center screen burst
    const size = centerOfScreen ? (8 + Math.random() * 8) : (6 + Math.random() * 6);
    c.style.width = size + "px";
    c.style.height = size + "px";
    
    // Calculate animation duration - longer for center screen burst
    const duration = centerOfScreen ? (1.0 + Math.random() * 0.5) : (0.8 + Math.random() * 0.4);
    c.style.transition = `transform ${duration}s ease-out, opacity ${duration}s ease-out`;
    
    document.body.appendChild(c);
    
    // Trigger animation after element is in DOM
    requestAnimationFrame(() => {
      c.style.transform = `translate(${tx}px, ${ty}px) rotate(${rotation}deg) scale(0.5)`;
      c.style.opacity = "0";
    });
    
    setTimeout(() => c.remove(), (duration + 0.2) * 1000);
  }
}

function makeDraggable(el) {
  let offsetX = 0, offsetY = 0, dragging = false;

  el.addEventListener("pointerdown", e => {
    dragging = true;
    el.classList.add("dragging");
    
    // Get the element's actual visual position (accounting for transforms)
    const rect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Calculate offset from mouse to element's top-left corner
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
    // Get current position in pixels (convert from % if needed)
    const computedStyle = window.getComputedStyle(el);
    let currentLeft = computedStyle.left;
    let currentTop = computedStyle.top;
    
    // Convert percentage to pixels if needed
    if (currentLeft.includes('%')) {
      const percent = parseFloat(currentLeft);
      currentLeft = (containerRect.width * percent / 100) + 'px';
    }
    if (currentTop.includes('%')) {
      const percent = parseFloat(currentTop);
      currentTop = (containerRect.height * percent / 100) + 'px';
    }
    
    // Extract current rotation from transform or CSS variable
    const currentRotation = getRotation(el);
    
    // Set position in pixels and preserve rotation
    el.style.left = currentLeft;
    el.style.top = currentTop;
    el.style.transform = `rotate(${currentRotation}deg)`;
    el.dataset.dragRotation = currentRotation; // Store for use during drag
    
    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener("pointermove", e => {
    if (!dragging) return;
    const containerRect = container.getBoundingClientRect();
    const x = e.clientX - containerRect.left - offsetX;
    const y = e.clientY - containerRect.top - offsetY;
    const rotation = parseFloat(el.dataset.dragRotation) || 0;
    el.style.left = Math.max(0, Math.min(x, containerRect.width - el.offsetWidth)) + "px";
    el.style.top = Math.max(0, Math.min(y, containerRect.height - el.offsetHeight)) + "px";
    el.style.transform = `rotate(${rotation}deg)`;
  });

  el.addEventListener("pointerup", e => {
    dragging = false;
    el.classList.remove("dragging");
    el.releasePointerCapture(e.pointerId);
  });
}

// Event listeners
document.getElementById("update").addEventListener("click", updateWords);
document.getElementById("generate").addEventListener("click", generateIdea);

// Auto-save on textarea changes
["verbs", "nouns", "adjectives", "outcomes"].forEach(id => {
  document.getElementById(id).addEventListener("input", saveToStorage);
});

// Default word lists
const DEFAULT_WORDS = {
  verbs: "analyze, refactor, automate, debug, test, monitor, optimize, deploy, review, document, scale, secure, improve, enhance, streamline",
  nouns: "pipeline, module, commit, build, bug, metric, system, code, test, deployment, feature, service, database, cache, API",
  adjectives: "efficient, reliable, scalable, secure, fast, maintainable, robust, flexible, clean, modular, automated, optimized, tested, documented, performant",
  outcomes: "efficiency, stability, quality, speed, insight, scalability, security, productivity, reliability, maintainability, performance, accuracy, consistency, clarity, innovation"
};

// Ensure defaults are present if fields are empty
function ensureDefaults() {
  if (!document.getElementById("verbs").value.trim()) {
    document.getElementById("verbs").value = DEFAULT_WORDS.verbs;
  }
  if (!document.getElementById("nouns").value.trim()) {
    document.getElementById("nouns").value = DEFAULT_WORDS.nouns;
  }
  if (!document.getElementById("adjectives").value.trim()) {
    document.getElementById("adjectives").value = DEFAULT_WORDS.adjectives;
  }
  if (!document.getElementById("outcomes").value.trim()) {
    document.getElementById("outcomes").value = DEFAULT_WORDS.outcomes;
  }
}

// Initialize
loadFromStorage();
ensureDefaults();
updateWords();
// Generate initial idea after words are rendered
setTimeout(() => {
  generateIdea();
}, 200);

