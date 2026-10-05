setTimeout(() => {
  const help = document.getElementById('boot-help');
  if (help) help.hidden = false;
}, 6000);
window.addEventListener('error', () => {
  const help = document.getElementById('boot-help');
  if (help) help.hidden = false;
});
