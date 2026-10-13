// Apply the saved theme before React loads, so the page doesn't flash.
// Kept in its own file (not inline in index.html) so the server's Content
// Security Policy can forbid ALL inline scripts, a strong defence against XSS.
try {
  const theme = localStorage.getItem('planet-theme')
  if (theme) document.documentElement.dataset.theme = theme
} catch { /* storage unavailable: use the default theme */ }
