(() => {
  const btn = document.getElementById('installAppBtn');
  let deferredPrompt = null;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW:', err));
    });
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredPrompt = e;
    if(btn && !standalone) btn.classList.add('ready');
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt=null; if(btn) btn.classList.remove('ready');
  });
  if(btn){
    if(standalone) btn.style.display='none';
    btn.addEventListener('click', async () => {
      if(deferredPrompt){
        deferredPrompt.prompt();
        try{ await deferredPrompt.userChoice; }catch(_){ }
        deferredPrompt=null; btn.classList.remove('ready');
      }else{
        alert('Untuk memasang di Android:\n\nChrome: ketuk menu ⋮ lalu pilih “Pasang aplikasi” atau “Tambahkan ke layar utama”.\n\nPastikan membuka alamat GitHub Pages dengan HTTPS.');
      }
    });
  }
})();
