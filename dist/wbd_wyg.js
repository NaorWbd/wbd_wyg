/* Webbed WYG 1.0.1. The textarea remains the form source of truth. */
(() => {
  'use strict';

  const instances = new WeakMap();
  const allowed = new Set(['P', 'BR', 'DIV', 'B', 'STRONG', 'U', 'I', 'EM', 'S', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'H2', 'H3', 'SPAN']);
  const discard = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'IMG', 'VIDEO', 'AUDIO', 'LINK', 'META', 'BASE', 'TEMPLATE']);
  const defaults = {
    dir: 'rtl',
    labels: {
      toolbar: 'Text formatting', bold: 'Bold', underline: 'Underline', larger: 'Larger',
      smaller: 'Smaller', code: 'Code view', visual: 'Visual view',
      help: 'Ctrl / Command + B: bold; Ctrl / Command + U: underline. Pasting adds plain text.'
    }
  };

  function sanitize(value) {
    const template = document.createElement('template');
    template.innerHTML = String(value ?? '');
    const clean = document.createElement('div');
    function copy(node, parent) {
      if (node.nodeType === 3) { parent.append(document.createTextNode(node.data)); return; }
      if (node.nodeType !== 1 || discard.has(node.tagName)) return;
      const tag = node.tagName === 'FONT' ? 'SPAN' : node.tagName;
      const output = allowed.has(tag) ? document.createElement(tag.toLowerCase()) : parent;
      if (tag === 'SPAN' && output !== parent) {
        const classes = ['wbd-wyg-large', 'wbd-wyg-small'].filter(name => node.classList.contains(name));
        if (node.tagName === 'FONT') {
          const size = Number(node.getAttribute('size'));
          if (size >= 5) classes.push('wbd-wyg-large');
          else if (size > 0 && size <= 2) classes.push('wbd-wyg-small');
        }
        output.className = [...new Set(classes)].join(' ');
      }
      if (output !== parent) parent.append(output);
      node.childNodes.forEach(child => copy(child, output));
    }
    template.content.childNodes.forEach(node => copy(node, clean));
    return clean.innerHTML;
  }

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function html(value) {
    const input = String(value ?? '');
    return /<\/?[a-z][^>]*>/i.test(input) ? sanitize(input) : escape(input).replace(/\r?\n/g, '<br>');
  }

  function text(value) {
    const container = document.createElement('div');
    container.innerHTML = sanitize(String(value ?? '').replace(/<br\s*\/?\s*>|<\/(?:p|div|li|h2|h3|blockquote)>/gi, '\n'));
    return container.textContent;
  }

  function init(scope = document, options = {}) {
    const config = { ...defaults, ...options, labels: { ...defaults.labels, ...options.labels } };
    const sources = scope.matches?.('textarea.wbd_wyg') ? [scope] : scope.querySelectorAll('textarea.wbd_wyg');
    sources.forEach(source => {
      if (instances.has(source)) return;
      const labels = config.labels;
      const wrapper = document.createElement('div');
      wrapper.className = 'wbd-wyg-wrapper';
      const toolbar = document.createElement('div');
      toolbar.className = 'wbd-wyg-toolbar';
      toolbar.setAttribute('role', 'group');
      toolbar.setAttribute('aria-label', labels.toolbar);
      const buttons = {};
      for (const name of ['bold', 'underline', 'larger', 'smaller', 'code']) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'wbd-wyg-button';
        button.dataset.webWygCommand = name;
        button.textContent = labels[name];
        button.setAttribute('aria-label', labels[name]);
        if (['bold', 'underline', 'code'].includes(name)) button.setAttribute('aria-pressed', 'false');
        toolbar.append(button);
        buttons[name] = button;
      }
      const body = document.createElement('div');
      body.className = 'wbd-wyg-body';
      const gutter = document.createElement('div');
      gutter.className = 'wbd-wyg-gutter';
      gutter.setAttribute('aria-hidden', 'true');
      gutter.hidden = true;
      const surface = document.createElement('div');
      surface.className = 'wbd-wyg-surface';
      surface.contentEditable = 'true';
      surface.setAttribute('role', 'textbox');
      surface.setAttribute('aria-multiline', 'true');
      surface.dir = source.dataset.webWygDir || config.dir;
      const label = source.id && document.querySelector(`label[for="${CSS.escape(source.id)}"]`);
      if (label?.textContent) surface.setAttribute('aria-label', label.textContent.trim());
      else surface.setAttribute('aria-label', source.getAttribute('aria-label') || labels.toolbar);
      const help = document.createElement('p');
      help.className = 'wbd-wyg-help';
      help.textContent = labels.help;
      source.before(wrapper);
      body.append(gutter, surface, source);
      wrapper.append(toolbar, body, help);
      source.classList.add('wbd-wyg-source');
      source.hidden = true;
      surface.innerHTML = html(source.value);
      const state = { code: false, range: null };

      function lines() {
        gutter.innerHTML = Array.from({ length: Math.max(1, source.value.split('\n').length) }, (_, i) => `<span>${i + 1}</span>`).join('');
      }
      function sync() {
        source.value = sanitize(state.code ? source.value : surface.innerHTML);
        lines();
      }
      function changed() {
        sync();
        source.dispatchEvent(new Event('input', { bubbles: true }));
      }
      function remember() {
        const selection = window.getSelection();
        if (selection?.rangeCount && surface.contains(selection.getRangeAt(0).commonAncestorContainer)) {
          state.range = selection.getRangeAt(0).cloneRange();
        }
      }
      function restore() {
        surface.focus();
        const selection = window.getSelection();
        if (!selection) return;
        const range = state.range && surface.contains(state.range.commonAncestorContainer) ? state.range : document.createRange();
        if (range !== state.range) { range.selectNodeContents(surface); range.collapse(false); }
        selection.removeAllRanges(); selection.addRange(range);
      }
      function toggleCode() {
        if (state.code) { source.value = sanitize(source.value); surface.innerHTML = html(source.value); }
        else sync();
        state.code = !state.code;
        state.range = null;
        source.hidden = !state.code;
        surface.hidden = state.code;
        gutter.hidden = !state.code;
        wrapper.classList.toggle('wbd-wyg-code', state.code);
        buttons.code.textContent = state.code ? labels.visual : labels.code;
        buttons.code.setAttribute('aria-pressed', String(state.code));
        lines();
        (state.code ? source : surface).focus();
      }
      function command(name) {
        if (name === 'code') { toggleCode(); return; }
        const tags = {
          bold: ['<b>', '</b>'], underline: ['<u>', '</u>'],
          larger: ['<span class="wbd-wyg-large">', '</span>'],
          smaller: ['<span class="wbd-wyg-small">', '</span>']
        };
        if (state.code) {
          const start = source.selectionStart, end = source.selectionEnd;
          if (start !== end) source.setRangeText(tags[name][0] + source.value.slice(start, end) + tags[name][1], start, end, 'select');
          changed(); source.focus(); return;
        }
        restore();
        let applied = false;
        if (typeof document.execCommand === 'function') {
          try {
            document.execCommand('styleWithCSS', false, false);
            applied = document.execCommand(['larger', 'smaller'].includes(name) ? 'fontSize' : name, false, name === 'larger' ? '5' : name === 'smaller' ? '2' : null);
          } catch { /* Use the range fallback below. */ }
        }
        if (!applied) {
          const selection = window.getSelection();
          if (!selection?.rangeCount || selection.isCollapsed) return;
          const range = selection.getRangeAt(0);
          const element = document.createElement(name === 'bold' ? 'b' : name === 'underline' ? 'u' : 'span');
          if (['larger', 'smaller'].includes(name)) element.className = name === 'larger' ? 'wbd-wyg-large' : 'wbd-wyg-small';
          element.append(range.extractContents()); range.insertNode(element); range.selectNodeContents(element);
          selection.removeAllRanges(); selection.addRange(range);
        }
        changed(); remember();
      }
      surface.addEventListener('input', changed);
      surface.addEventListener('mouseup', remember);
      surface.addEventListener('keyup', remember);
      surface.addEventListener('focusout', remember);
      surface.addEventListener('paste', event => {
        event.preventDefault();
        const plain = event.clipboardData?.getData('text/plain') || '';
        restore();
        let inserted = false;
        try { inserted = !!document.execCommand?.('insertText', false, plain); } catch { /* Use a text node. */ }
        if (!inserted) {
          const selection = window.getSelection();
          if (!selection?.rangeCount) return;
          const range = selection.getRangeAt(0), node = document.createTextNode(plain);
          range.deleteContents(); range.insertNode(node); range.setStartAfter(node); range.collapse(true);
          selection.removeAllRanges(); selection.addRange(range);
        }
        changed();
      });
      surface.addEventListener('drop', event => event.preventDefault());
      source.addEventListener('input', () => { if (state.code) lines(); });
      source.addEventListener('scroll', () => { gutter.scrollTop = source.scrollTop; });
      toolbar.addEventListener('mousedown', event => { if (event.target.closest('button')) event.preventDefault(); });
      toolbar.addEventListener('click', event => {
        const button = event.target.closest('[data-wbd-wyg-command]');
        if (button) command(button.dataset.webWygCommand);
      });
      wrapper.addEventListener('keydown', event => {
        if (!(event.ctrlKey || event.metaKey) || event.shiftKey) return;
        const key = event.key.toLowerCase();
        if (key === 'b' || key === 'u') { event.preventDefault(); command(key === 'b' ? 'bold' : 'underline'); }
      });
      label?.addEventListener('click', event => { if (!state.code) { event.preventDefault(); surface.focus(); } });
      instances.set(source, { sync, destroy() {
        sync(); wrapper.before(source); source.hidden = false;
        source.classList.remove('wbd-wyg-source'); wrapper.remove(); instances.delete(source);
      } });
      lines();
    });
  }

  function each(scope, method) {
    const sources = scope.matches?.('textarea.wbd_wyg') ? [scope] : scope.querySelectorAll('textarea.wbd_wyg');
    sources.forEach(source => instances.get(source)?.[method]());
  }
  window.WbdWyg = { version: '1.0.1', init, sync: scope => each(scope || document, 'sync'), destroy: scope => each(scope || document, 'destroy'), sanitize, html, text };
})();
