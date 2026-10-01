// ================= BOT FLOTANTE CROPPER =================
document.addEventListener('DOMContentLoaded', () => {
  const botWidget = document.getElementById('cropper-bot');
  const botHeader = document.getElementById('bot-header');
  const btnClose = document.getElementById('close-bot');
  
  const uploadPrompt = document.getElementById('upload-prompt');
  const fileInput = document.getElementById('bot-file-input');
  const cropperContainer = document.getElementById('cropper-container');
  const cropperImage = document.getElementById('cropper-image');
  const btnCropDownload = document.getElementById('btn-crop-download');

  let cropper = null;

  // --- DRAGGABLE LOGIC ---
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  botHeader.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - botWidget.getBoundingClientRect().left;
    offsetY = e.clientY - botWidget.getBoundingClientRect().top;
    botWidget.style.transition = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    
    // Bounds checking
    const maxX = window.innerWidth - botWidget.offsetWidth;
    const maxY = window.innerHeight - botWidget.offsetHeight;
    
    botWidget.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
    botWidget.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
    botWidget.style.bottom = 'auto'; // release bottom constraint
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // --- CLOSE ---
  btnClose.addEventListener('click', () => {
    botWidget.style.display = 'none';
  });

  // --- FILE HANDLING ---
  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      uploadPrompt.style.display = 'none';
      cropperContainer.style.display = 'block';
      cropperImage.src = e.target.result;
      
      if (cropper) cropper.destroy();
      
      cropper = new Cropper(cropperImage, {
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 1,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
      });
      
      btnCropDownload.disabled = false;
    };
    reader.readAsDataURL(file);
  };

  // Drag & Drop
  uploadPrompt.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadPrompt.classList.add('dragover');
  });
  uploadPrompt.addEventListener('dragleave', () => {
    uploadPrompt.classList.remove('dragover');
  });
  uploadPrompt.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadPrompt.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  // File Input
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      handleFile(e.target.files[0]);
    }
  });

  // Paste Support (Ctrl+V)
  document.addEventListener('paste', (e) => {
    if (!e.clipboardData || !e.clipboardData.items) return;
    for (let i = 0; i < e.clipboardData.items.length; i++) {
      let item = e.clipboardData.items[i];
      if (item.type.indexOf('image') !== -1) {
        handleFile(item.getAsFile());
        break;
      }
    }
  });

  // --- CROP & UPLOAD ---
  btnCropDownload.addEventListener('click', () => {
    if (!cropper) return;
    const canvas = cropper.getCroppedCanvas();
    if (canvas) {
      // Ask user for a filename
      const customName = prompt("Escribe el nombre para esta imagen (ej: arequipa, huanta):", "");
      if (customName === null) return; // User cancelled

      // Disable button during upload
      const originalText = btnCropDownload.innerText;
      btnCropDownload.innerText = "Guardando...";
      btnCropDownload.disabled = true;

      canvas.toBlob((blob) => {
        const formData = new FormData();
        formData.append('image', blob, 'recorte.png');
        if (customName.trim() !== '') {
          formData.append('filename', customName.trim());
        }

        fetch('/upload', {
          method: 'POST',
          body: formData
        })
        .then(response => response.json())
        .then(data => {
          if(data.success) {
            alert(`¡Guardado exitosamente!\nLa imagen está en: ${data.path}\n\nAhora puedes pedirle al asistente que use esta imagen.`);
            btnClose.click(); // Close bot
          } else {
            alert('Error al guardar la imagen.');
          }
        })
        .catch(err => {
          console.error(err);
          alert('Hubo un error de conexión al guardar.');
        })
        .finally(() => {
          btnCropDownload.innerText = originalText;
          btnCropDownload.disabled = false;
        });

      }, 'image/png');
    }
  });
});
