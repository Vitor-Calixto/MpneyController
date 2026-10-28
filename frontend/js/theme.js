// Alternador de tema claro/escuro. Preferencia salva localmente no navegador.
(function () {
  const saved = localStorage.getItem('ff_theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);

  window.toggleTheme = function () {
    const current = document.documentElement.getAttribute('data-theme')
      || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ff_theme', next);
  };
})();
