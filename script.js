// DOM Elements
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
const zoomSlider = document.getElementById('zoomSlider');
const rotateBtn = document.getElementById('rotateBtn');
const resetBtn = document.getElementById('resetBtn');
const generateBtn = document.getElementById('generateBtn');
const previewImage = document.getElementById('previewImage');
const downloadBtn = document.getElementById('downloadBtn');
const startOverBtn = document.getElementById('startOverBtn');
const startOverBtn2 = document.getElementById('startOverBtn2');
const toast = document.getElementById('toast');

// State
let userImage = null;
let userName = '';
let offsetX = 0, offsetY = 0;
let scale = 1;
let rotation = 0;
let isDragging = false;
let startX, startY, startOffsetX, startOffsetY;

// 🔴 LANDSCAPE CANVAS: 3795 x 3000
const CANVAS_WIDTH = 3795;
const CANVAS_HEIGHT = 3000;

const ctx = editorCanvas.getContext('2d');

// 🔴 REPLACE WITH YOUR LANDSCAPE FRAME (3795x3000 PNG)
const FRAME_URL = 'frame.png';

// ======================
// Utility Functions
// ======================

function showScreen(screenKey) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[screenKey].classList.add('active');
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function resetState() {
  userImage = null;
  userName = '';
  nameInput.value = '';
  offsetX = 0; offsetY = 0;
  scale = 1;
  rotation = 0;
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

// ======================
// File Upload & Name (same as before)
// ======================

uploadArea.addEventListener('click', () => fileInput.click());
uploadBtn.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.style.backgroundColor = 'rgba(143, 211, 199, 0.3)';
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.style.backgroundColor = '';
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.style.backgroundColor = '';
  if (e.dataTransfer.files.length) {
    handleImageUpload(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) {
    handleImageUpload(e.target.files[0]);
  }
});

function handleImageUpload(file) {
  if (!file.type.match('image.*')) {
    alert('Please upload an image file.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
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
    showToast(`Thanks ${name}! Your name is saved ✅`);
  } catch (err) {
    console.warn('Formspree submission may have failed', err);
  }

  setTimeout(() => {
    renderEditor();
    showScreen('editor');
  }, 800);
});

// ======================
// Editor: Updated for landscape
// ======================

function renderEditor() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (!userImage) return;

  ctx.save();
  // Center of LANDSCAPE canvas
  ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  ctx.rotate((rotation * Math.PI) / 180);

  const imgW = userImage.width * scale;
  const imgH = userImage.height * scale;
  ctx.drawImage(
    userImage,
    -imgW / 2 + offsetX,
    -imgH / 2 + offsetY,
    imgW,
    imgH
  );

  ctx.restore();

  const frame = new Image();
  frame.onload = () => {
    ctx.drawImage(frame, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  };
  frame.src = FRAME_URL;
}

// Drag with landscape scaling
function setupDragListeners() {
  const handleStart = (clientX, clientY) => {
    isDragging = true;
    startX = clientX;
    startY = clientY;
    startOffsetX = offsetX;
    startOffsetY = offsetY;
  };

  const handleMove = (clientX, clientY) => {
    if (!isDragging) return;
    const dx = clientX - startX;
    const dy = clientY - startY;
    // Scale drag to full canvas resolution
    const scaleX = CANVAS_WIDTH / editorCanvas.offsetWidth;
    const scaleY = CANVAS_HEIGHT / editorCanvas.offsetHeight;
    offsetX = startOffsetX + dx * scaleX;
    offsetY = startOffsetY + dy * scaleY;
    renderEditor();
  };

  const handleEnd = () => {
    isDragging = false;
  };

  editorCanvas.addEventListener('mousedown', (e) => handleStart(e.clientX, e.clientY));
  editorCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    handleStart(t.clientX, t.clientY);
  });

  window.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
  window.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    handleMove(t.clientX, t.clientY);
  }, { passive: false });

  window.addEventListener('mouseup', handleEnd);
  window.addEventListener('touchend', handleEnd);
}

setupDragListeners();

zoomSlider.addEventListener('input', () => {
  scale = parseFloat(zoomSlider.value);
  renderEditor();
});

rotateBtn.addEventListener('click', () => {
  rotation = (rotation + 90) % 360;
  renderEditor();
});

resetBtn.addEventListener('click', () => {
  offsetX = 0;
  offsetY = 0;
  scale = 1;
  rotation = 0;
  zoomSlider.value = 1;
  renderEditor();
});

// ======================
// Generate & Export (landscape resolution)
// ======================

generateBtn.addEventListener('click', async () => {
  showScreen('processing');

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = CANVAS_WIDTH;   // 3795
  finalCanvas.height = CANVAS_HEIGHT; // 3000
  const fctx = finalCanvas.getContext('2d');

  fctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (userImage) {
    fctx.save();
    fctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    fctx.rotate((rotation * Math.PI) / 180);
    const imgW = userImage.width * scale;
    const imgH = userImage.height * scale;
    fctx.drawImage(userImage, -imgW / 2 + offsetX, -imgH / 2 + offsetY, imgW, imgH);
    fctx.restore();
  }

  const frame = new Image();
  await new Promise((resolve) => {
    frame.onload = () => {
      fctx.drawImage(frame, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      resolve();
    };
    frame.src = FRAME_URL;
  });

  const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.95);
  previewImage.src = dataUrl;
  showScreen('preview');
});

downloadBtn.addEventListener('click', () => {
  const safeName = userName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  const link = document.createElement('a');
  link.download = `UPSA_MedicalOutreach_${safeName || 'Poster'}.jpg`;
  link.href = previewImage.src;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#0b6e4f', '#00a6fb', '#8fd3c7', '#ffffff']
    });
  }
});

showScreen('upload');