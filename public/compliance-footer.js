(function mountComplianceFooter() {
  if (document.querySelector('.igem-footer')) return;

  var footer = document.createElement('footer');
  footer.className = 'igem-footer';

  var inner = document.createElement('div');
  inner.className = 'igem-footer__inner';
  inner.innerHTML =
    'Source code: <a href="https://gitlab.igem.org/2026/pekinghsc" target="_blank" rel="noopener noreferrer">gitlab.igem.org/2026/pekinghsc</a> · ' +
    'Team-created Wiki content is licensed under Creative Commons Attribution 4.0 (CC BY 4.0).';

  footer.appendChild(inner);
  document.body.appendChild(footer);
})();
