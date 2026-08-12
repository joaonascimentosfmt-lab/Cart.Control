(function () {
  function icon(name, cls) {
    var c = cls ? " " + cls : "";
    return '<svg class="ic' + c + '" aria-hidden="true"><use href="#i-' + name + '" xlink:href="#i-' + name + '"></use></svg>';
  }
  window.icon = icon;
})();