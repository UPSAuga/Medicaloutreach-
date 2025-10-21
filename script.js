// ======================
// CONFIG
// ======================
const CANVAS_WIDTH = 3795;   // Landscape: 32.14 cm @ 300 DPI
const CANVAS_HEIGHT = 3000;  //           25.4 cm
const FRAME_URL = 'frame.png'; // 🔴 REPLACE

// ======================
// DOM
// ======================
const screens = {
  upload: document.getElementById('screen1'),
  name: document.getElementById('screen2'),
  editor: document.getElementById('screen3'),
  processing: document.getElementById('screen4'),
  preview: document.getElementById('screen5'),
  thanks: document.getElementById('screen6')
};

const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const uploadBtn = document.getElementById('uploadBtn');
const nameInput = document.getElementById('nameInput');
const submitNameBtn = document.getElementById('submitNameBtn');
const editorCanvas = document.getElementById('editorCanvas');
const ctx = editorCanvas.getContext('2d');
const zoomSlider = document.getElementById('zoomSlider');
const zoomValue = document.getElementById('zoomValue');
const rotateBtn = document.getElementById('rotateBtn');
const resetBtn = document.getElementById('resetBtn');
const generateBtn = document.getElementById('generateBtn');
const previewImage = document.getElementById('previewImage');
const downloadBtn = document.getElementById('downloadBtn');
const startOverBtn = document.getElementById('startOverBtn');
const startOverBtn2 = document.getElementById('startOverBtn2');
const toast = document.getElementById('toast');

// ======================
// STATE
// ======================
let userImage = null;
let userName = '';
let offsetX = 0, offsetY = 0;
let scale = 1;
let rotation = 0;
let isDragging = false;
let startX, startY, startOffsetX, startOffsetY;
let renderScheduled = false;

// ======================
// UTILS
// ======================
function showScreen(key) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[key].classList.add('active');
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

function resetState() {
  userImage = null;
  userName = '';
  nameInput.value = '';
  offsetX = 0; offsetY = 0;
  scale = 1;
  rotation = 0;
  zoomSlider.value = 1;
  zoomValue.textContent = '100';
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

// ======================
// FILE & NAME
// ======================
uploadArea.addEventListener('click', () => fileInput.click());
uploadBtn.addEventListener('click', () => fileInput.click());

['dragover', 'dragenter'].forEach(evt => {
  uploadArea.addEventListener(evt, e => {
    e.preventDefault();
    uploadArea.style.backgroundColor = 'rgba(143, 211, 199, 0.3)';
  });
});

['dragleave', 'dragend'].forEach(evt => {
  uploadArea.addEventListener(evt, () => {
    uploadArea.style.backgroundColor = '';
  });
});

uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.style.backgroundColor = '';
  if (e.dataTransfer.files?.[0]) handleImageUpload(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', e => {
  if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
});

function handleImageUpload(file) {
  if (!file.type.match('image.*')) {
    alert('Please upload an image.');
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      userImage = img;
      showScreen('name');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

submitNameBtn.addEventListener('click', async () => {
  const name = nameInput.value.trim();
  if (!name) {
    alert('Please enter your name.');
    return;
  }
  userName = name;
  try {
    await fetch('https://formspree.io/f/myznjrpk', {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    showToast(`Thanks ${name}! Saved ✅`);
  } catch (e) {
    console.warn('Formspree may have failed (no-cors)', e);
  }
  setTimeout(() => {
    renderEditor();
    showScreen('editor');
  }, 700);
});

// ======================
// EDITOR RENDER
// ======================
function renderEditor() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  if (!userImage) return;

  ctx.save();
  ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  ctx.rotate((rotation * Math.PI) / 180);

  const w = userImage.width * scale;
  const h = userImage.height * scale;
  ctx.drawImage(userImage, -w / 2 + offsetX, -h / 2 + offsetY, w, h);
  ctx.restore();

  const frame = new Image();
  frame.src = FRAME_URL;
  frame.onload = () => {
    ctx.drawImage(frame, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  };
}

// ======================
// DRAG & ZOOM (FIXED)
// ======================
function setupDragListeners() {
  const start = (x, y) => {
    isDragging = true;
    startX = x;
    startY = y;
    startOffsetX = offsetX;
    startOffsetY = offsetY;
  };

  const move = (x, y) => {
    if (!isDragging) return;
    const rect = editorCanvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    offsetX = startOffsetX + (x - startX) * scaleX;
    offsetY = startOffsetY + (y - startY) * scaleY;
    scheduleRender();
  };

  const end = () => isDragging = false;

  // Mouse
  editorCanvas.addEventListener('mousedown', e => start(e.clientX, e.clientY));
  window.addEventListener('mousemove', e => move(e.clientX, e.clientY));
  window.addEventListener('mouseup', end);

  // Touch
  editorCanvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.touches[0];
    start(t.clientX, t.clientY);
  });
  window.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = e.touches[0];
    move(t.clientX, t.clientY);
  }, { passive: false });
  window.addEventListener('touchend', end);
}

zoomSlider.addEventListener('input', () => {
  scale = parseFloat(zoomSlider.value);
  zoomValue.textContent = Math.round(scale * 100);
  scheduleRender();
});

rotateBtn.addEventListener('click', () => {
  rotation = (rotation + 90) % 360;
  scheduleRender();
});

resetBtn.addEventListener('click', () => {
  offsetX = 0; offsetY = 0;
  scale = 1;
  rotation = 0;
  zoomSlider.value = 1;
  zoomValue.textContent = '100';
  scheduleRender();
});

function scheduleRender() {
  if (!renderScheduled) {
    renderScheduled = true;
    requestAnimationFrame(() => {
      renderEditor();
      renderScheduled = false;
    });
  }
}

// ======================
// GENERATE & EXPORT
// ======================
generateBtn.addEventListener('click', async () => {
  showScreen('processing');

  const finalCanvas = Object.assign(document.createElement('canvas'), {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT
  });
  const fctx = finalCanvas.getContext('2d');

  fctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (userImage) {
    fctx.save();
    fctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    fctx.rotate((rotation * Math.PI) / 180);
    const w = userImage.width * scale;
    const h = userImage.height * scale;
    fctx.drawImage(userImage, -w / 2 + offsetX, -h / 2 + offsetY, w, h);
    fctx.restore();
  }

  const frame = new Image();
  await new Promise(res => {
    frame.onload = () => {
      fctx.drawImage(frame, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      res();
    };
    frame.src = FRAME_URL;
  });

  previewImage.src = finalCanvas.toDataURL('image/jpeg', 0.95);
  showScreen('preview');
});

downloadBtn.addEventListener('click', () => {
  const safeName = userName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'Poster';
  const a = document.createElement('a');
  a.download = `UPSA_MedicalOutreach_${safeName}.jpg`;
  a.href = previewImage.src;
  a.click();
  setTimeout(() => showScreen('thanks'), 500);
});

[startOverBtn, startOverBtn2].forEach(btn => {
  btn.addEventListener('click', () => {
    resetState();
    showScreen('upload');
  });
});

screens.thanks.addEventListener('transitionend', () => {
  if (screens.thanks.classList.contains('active') && typeof confetti !== 'undefined') {
    confetti({ particleCount: 180, spread: 80, colors: ['#0b6e4f', '#00a6fb', '#8fd3c7'] });
  }
});

// ======================
// INIT
// ======================
setupDragListeners(); // ← Only once!
showScreen('upload');