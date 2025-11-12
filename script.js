let words = {};
let currentIdea = null; // { verb: string, noun: string, adjective: string, outcome: string }
const container = document.getElementById("word-container");

// Constants
const CENTER_PERCENT_MIN = 40; // Increased from 30 - push center words further from edges
const CENTER_PERCENT_MAX = 60; // Decreased from 70 - make center area smaller/more airy
const EDGE_PERCENT = 20; // Decreased from 25 - push edge words further out
const ROTATION_RANGE = 8; // -4 to +4 degrees
const CENTER_WORD_RATIO = 0.25; // Decreased from 0.35 - fewer words in center
const MIN_CENTER_WORDS = 2; // Decreased from 3 - fewer words in center
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
  let leftPercent, topPercent;
  
  if (center) {
    leftPercent = CENTER_PERCENT_MIN + Math.random() * (CENTER_PERCENT_MAX - CENTER_PERCENT_MIN);
    topPercent = CENTER_PERCENT_MIN + Math.random() * (CENTER_PERCENT_MAX - CENTER_PERCENT_MIN);
  } else {
    const edge = Math.random();
    if (edge < 0.25) {
      leftPercent = Math.random() * 100;
      topPercent = Math.random() * EDGE_PERCENT;
    } else if (edge < 0.5) {
      leftPercent = (100 - EDGE_PERCENT) + Math.random() * EDGE_PERCENT;
      topPercent = Math.random() * 100;
    } else if (edge < 0.75) {
      leftPercent = Math.random() * 100;
      topPercent = (100 - EDGE_PERCENT) + Math.random() * EDGE_PERCENT;
    } else {
      leftPercent = Math.random() * EDGE_PERCENT;
      topPercent = Math.random() * 100;
    }
  }
  
  return { 
    leftPercent, 
    topPercent,
    rotation: (Math.random() - 0.5) * ROTATION_RANGE
  };
}

function calculateScaleFromPosition(leftPercent, topPercent) {
  // Distance from center (0% = center, 50% = corner)
  const centerX = 50;
  const centerY = 50;
  const distanceX = Math.abs(leftPercent - centerX);
  const distanceY = Math.abs(topPercent - centerY);
  const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);
  
  // Normalize to 0-1 (0 = center, ~70.7 = corner)
  const maxDistance = Math.sqrt(50 ** 2 + 50 ** 2); // ~70.7
  const normalizedDistance = distance / maxDistance; // 0 to 1
  
  // Map to scale: 2.6 at center (much bigger, roughly double), 0.6 at edges (bigger minimum)
  const scale = 2.6 - (normalizedDistance * 2.0); // 2.6 to 0.6
  
  return scale;
}

function applyTransform(el, leftPercent, topPercent, rotation, scale) {
  // Use viewport dimensions for accurate positioning across all screen sizes
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Convert percentage to pixels relative to viewport center
  const x = (viewportWidth * leftPercent / 100) - (viewportWidth / 2);
  const y = (viewportHeight * topPercent / 100) - (viewportHeight / 2);
  
  // Single transform combining all operations
  el.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`;
  
  // Store position percentages for resize handling
  el.dataset.leftPercent = leftPercent;
  el.dataset.topPercent = topPercent;
  el.dataset.rotation = rotation;
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
      const scale = calculateScaleFromPosition(pos.leftPercent, pos.topPercent);
      
      applyTransform(el, pos.leftPercent, pos.topPercent, pos.rotation, scale);
      makeDraggable(el);
      container.appendChild(el);
    });
  });
}

function shuffleWords(highlightWords = null) {
  const centerWords = highlightWords ? null : selectCenterWords();
  
  document.querySelectorAll("#word-container span").forEach(el => {
    const wordType = el.dataset.wordType;
    const word = el.dataset.word;
    const isHighlighted = highlightWords?.[wordType] === word;
    
    let leftPercent, topPercent, rotation;
    
    if (isHighlighted) {
      // Highlighted words: use predefined center positions
      const order = ['verb', 'adjective', 'noun', 'outcome'];
      const index = order.indexOf(wordType);
      leftPercent = HIGHLIGHT_POSITIONS[index] || 50;
      topPercent = 50 + (Math.random() - 0.5) * HIGHLIGHT_VERTICAL_RANGE;
      rotation = (Math.random() - 0.5) * HIGHLIGHT_ROTATION_RANGE;
    } else {
      // Regular words: random position
      const isCenter = centerWords?.[wordType]?.includes(word);
      const pos = randomPos(isCenter);
      leftPercent = pos.leftPercent;
      topPercent = pos.topPercent;
      rotation = pos.rotation;
    }
    
    const scale = calculateScaleFromPosition(leftPercent, topPercent);
    applyTransform(el, leftPercent, topPercent, rotation, scale);
  });
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
  let initialRotation = 0;
  let initialScale = 1;
  let initialLeftPercent = 50;
  let initialTopPercent = 50;

  el.addEventListener("pointerdown", e => {
    dragging = true;
    el.classList.add("dragging");
    
    // Get current position from dataset (stored by applyTransform)
    initialLeftPercent = parseFloat(el.dataset.leftPercent) || 50;
    initialTopPercent = parseFloat(el.dataset.topPercent) || 50;
    initialRotation = parseFloat(el.dataset.rotation) || 0;
    
    // Ensure transform is exactly correct before starting drag
    // This prevents any mismatch between stored position and actual transform
    initialScale = calculateScaleFromPosition(initialLeftPercent, initialTopPercent);
    applyTransform(el, initialLeftPercent, initialTopPercent, initialRotation, initialScale);
    
    // Calculate element center from stored position (matches applyTransform calculation)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const elementCenterX = (viewportWidth * initialLeftPercent / 100);
    const elementCenterY = (viewportHeight * initialTopPercent / 100);
    
    // Calculate offset from mouse to element center
    offsetX = e.clientX - elementCenterX;
    offsetY = e.clientY - elementCenterY;
    
    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener("pointermove", e => {
    if (!dragging) return;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate new position based on mouse position minus offset
    // This gives us the element center position
    const elementCenterX = e.clientX - offsetX;
    const elementCenterY = e.clientY - offsetY;
    
    // Convert to percentage and clamp to viewport bounds
    const leftPercent = Math.max(0, Math.min(100, (elementCenterX / viewportWidth) * 100));
    const topPercent = Math.max(0, Math.min(100, (elementCenterY / viewportHeight) * 100));
    
    // Recalculate scale based on new position (scale changes as word moves)
    const scale = calculateScaleFromPosition(leftPercent, topPercent);
    applyTransform(el, leftPercent, topPercent, initialRotation, scale);
  });

  el.addEventListener("pointerup", e => {
    dragging = false;
    el.classList.remove("dragging");
    el.releasePointerCapture(e.pointerId);
  });
}

// Event listeners
document.getElementById("update").addEventListener("click", updateWords);
document.getElementById("restore-defaults").addEventListener("click", restoreDefaults);
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

// Restore default words
function restoreDefaults() {
  document.getElementById("verbs").value = DEFAULT_WORDS.verbs;
  document.getElementById("nouns").value = DEFAULT_WORDS.nouns;
  document.getElementById("adjectives").value = DEFAULT_WORDS.adjectives;
  document.getElementById("outcomes").value = DEFAULT_WORDS.outcomes;
  saveToStorage();
  updateWords();
}

// Handle window resize - recalculate all transforms
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    document.querySelectorAll("#word-container span").forEach(el => {
      const leftPercent = parseFloat(el.dataset.leftPercent) || 50;
      const topPercent = parseFloat(el.dataset.topPercent) || 50;
      const rotation = parseFloat(el.dataset.rotation) || 0;
      const scale = calculateScaleFromPosition(leftPercent, topPercent);
      applyTransform(el, leftPercent, topPercent, rotation, scale);
    });
  }, 100);
});

// Initialize
loadFromStorage();
ensureDefaults();
updateWords();
// Generate initial idea after words are rendered
setTimeout(() => {
  generateIdea();
}, 200);

