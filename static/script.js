function showFileName(input, targetId) {
  const fileName = input.files[0]?.name || '';
  document.getElementById(targetId).textContent = fileName ? `📄 ${fileName}` : '';
}

// Troca os ícones PNG com base no tema
function updateIconsForTheme() {
  const isDark = document.body.classList.contains('dark');
  document.querySelectorAll('.theme-switch').forEach(img => {
    const newSrc = isDark ? img.dataset.dark : img.dataset.light;
    if (newSrc) img.src = newSrc;
  });
}

// Modo escuro persistente + troca de ícones
const themeBtn = document.getElementById('toggleTheme');
themeBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  updateIconsForTheme();
});

if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
}
updateIconsForTheme();

// Pré-visualização com modal
document.querySelectorAll('input[type="file"]').forEach(input => {
  input.addEventListener('change', () => {
    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);

    fetch('/preview', {
      method: 'POST',
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      const card = input.closest('.card');
      const previewArea = card.querySelector('.preview');
      const fileNameDisplay = card.querySelector('.file-name');

      if (data.type === 'pdf') {
        previewArea.innerHTML = `<img src="data:image/png;base64,${data.preview}" alt="Prévia do PDF">`;
      } else if (data.type === 'docx') {
        previewArea.innerHTML = `<div class="doc-preview">${data.preview}</div>`;
      } else {
        previewArea.textContent = data.error || 'Não foi possível gerar prévia.';
      }

      fileNameDisplay.style.marginTop = '10px';
      previewArea.insertAdjacentElement('afterend', fileNameDisplay);

      previewArea.onclick = () => {
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = 0;
        modal.style.left = 0;
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.8)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = 9999;
        modal.onclick = () => document.body.removeChild(modal);

        const content = previewArea.cloneNode(true);
        content.style.maxWidth = '90%';
        content.style.maxHeight = '90%';
        content.style.overflow = 'auto';
        content.style.background = 'white';
        content.style.padding = '20px';
        content.style.borderRadius = '10px';
        modal.appendChild(content);
        document.body.appendChild(modal);
      };
    })
    .catch(() => {
      const previewArea = input.closest('.card').querySelector('.preview');
      previewArea.textContent = 'Erro ao gerar prévia.';
    });
  });
});

// Efeito visual de sucesso com botão embutido
function showSuccess(formId, statusId, downloadId, downloadUrl, fileName) {
  const isDark = document.body.classList.contains('dark');
  const sucessoIcon = isDark ? '/static/img/sucesso-d.png' : '/static/img/sucesso.png';

  const card = document.getElementById(formId).closest('.card');
  const previewArea = card.querySelector('.preview');
  const status = document.getElementById(statusId);

  previewArea.style.opacity = '0';
  setTimeout(() => {
    previewArea.style.display = 'none';
    status.innerHTML = `
      <div class="success-block">
        <img src="${sucessoIcon}" alt="Sucesso" class="success-icon">
        <p>Conversão concluída!</p>
        <a href="${downloadUrl}" download="${fileName}" class="download-btn" target="_blank">
          <img class="icon theme-switch" alt="Download"
               src="/static/img/baixar.png"
               data-light="/static/img/baixar.png"
               data-dark="/static/img/baixar-d.png">
          Baixar arquivo
        </a>
      </div>
    `;
    status.classList.add('active');
  }, 500);
}

// PDF para Word
document.getElementById('pdfForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const file = this.file.files[0];
  const formData = new FormData();
  formData.append('file', file);

  const progressBar = document.getElementById('pdfProgress');
  progressBar.style.display = 'block';
  progressBar.classList.add('active');

  const status = document.getElementById('pdfStatus');
  status.classList.remove('active');
  status.textContent = 'Convertendo...';

  fetch('/pdf-to-word', {
    method: 'POST',
    body: formData
  })
  .then(res => {
    if (!res.ok) throw new Error('Erro na conversão');
    return res.blob();
  })
  .then(blob => {
    const url = URL.createObjectURL(blob);
    const fileName = file.name.replace('.pdf', '.docx');
    showSuccess('pdfForm', 'pdfStatus', 'pdfDownload', url, fileName);
  })
  .catch(() => {
    status.textContent = 'Erro ao converter o arquivo.';
  })
  .finally(() => {
    progressBar.style.display = 'none';
    progressBar.classList.remove('active');
  });
});

// Word para PDF
document.getElementById('wordForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const file = this.file.files[0];
  const formData = new FormData();
  formData.append('file', file);

  const progressBar = document.getElementById('wordProgress');
  progressBar.style.display = 'block';
  progressBar.classList.add('active');

  const status = document.getElementById('wordStatus');
  status.classList.remove('active');
  status.textContent = 'Convertendo...';

  fetch('/word-to-pdf', {
    method: 'POST',
    body: formData
  })
  .then(res => {
    if (!res.ok) throw new Error('Erro na conversão');
    return res.blob();
  })
  .then(blob => {
    const url = URL.createObjectURL(blob);
    const fileName = file.name.replace('.docx', '.pdf');
    showSuccess('wordForm', 'wordStatus', 'wordDownload', url, fileName);
  })
  .catch(() => {
    status.textContent = 'Erro ao converter o arquivo.';
  })
  .finally(() => {
    progressBar.style.display = 'none';
    progressBar.classList.remove('active');
  });
});
