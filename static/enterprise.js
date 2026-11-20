(() => {
  'use strict';
  const menus = [...document.querySelectorAll('.ent-ecosystem')];
  document.addEventListener('click', event => {
    for (const menu of menus) if (!menu.contains(event.target)) menu.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') for (const menu of menus) {
      if (menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
    }
  });
  const tabs = [...document.querySelectorAll('[role="tab"][data-panel]')];
  function select(tab) {
    for (const item of tabs) {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      document.getElementById(item.dataset.panel).hidden = !active;
    }
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); select(tabs[next]); tabs[next].focus(); }
    });
  });
  const safeUrl = (value, store = false) => {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') return '';
      if (store && !['apps.microsoft.com', 'www.microsoft.com', 'microsoft.com'].includes(url.hostname)) return '';
      return url.href;
    } catch { return ''; }
  };
  if (document.querySelector('[data-release-channel]')) {
    fetch('/static/release.json', {cache:'no-store'}).then(r => {if (!r.ok) throw new Error(); return r.json();}).then(release => {
      for (const channel of ['windows', 'store']) {
        const url = safeUrl(release[channel]?.url || '', channel === 'store');
        if (!url) continue;
        const host = document.querySelector('[data-release-channel="' + channel + '"]');
        if (!host) continue;
        const link = document.createElement('a');
        link.className = 'ent-button'; link.href = url;
        if (channel === 'windows') link.setAttribute('download', '');
        link.textContent = channel === 'windows' ? 'Download for Windows ↓' : 'Get it from Microsoft Store ↗';
        host.querySelector('[data-release-action]').replaceChildren(link);
        host.querySelector('[data-release-state]').textContent = 'Available';
        host.querySelector('[data-release-status]').textContent = channel === 'windows' ? 'Official SYNBAI Nexus Windows installer.' : 'Open the official product listing in Microsoft Store.';
        for (const key of ['version', 'published', 'size', 'sha256']) {
          const field = host.querySelector('[data-release-field="' + key + '"]');
          if (field && release[channel]?.[key]) field.textContent = release[channel][key];
        }
      }
    }).catch(() => {});
  }
  if (document.querySelector('[data-plan-price]')) {
    const base = document.querySelector('meta[name="synbai-api-base"]')?.content;
    if (base) fetch(base + '/api/billing/pricing').then(r => {if (!r.ok) throw new Error(); return r.json();}).then(pricing => {
      for (const plan of ['starter', 'pro']) {
        const amount = pricing.plans?.[plan]?.monthly;
        if (!Number.isFinite(amount) || amount < 0) continue;
        const node = document.querySelector('[data-plan-price="' + plan + '"]');
        node.textContent = '$' + (amount/100).toFixed(2).replace(/\.00$/, '');
        const small = document.createElement('small'); small.textContent = ' / month'; node.append(small);
        const note = document.querySelector('[data-price-note="' + plan + '"]');
        if (note) {
          const regular = pricing.base_prices?.[plan]?.monthly;
          const money = cents => '$' + (cents/100).toFixed(2).replace(/\.00$/, '');
          note.replaceChildren();
          if (Number.isFinite(regular) && regular > amount) {
            const was = document.createElement('s');
            was.textContent = money(regular);
            was.setAttribute('aria-label', 'Regular price ' + money(regular) + ' per month');
            const offer = document.createElement('strong');
            const configured = pricing.discount_percent?.[plan]?.monthly;
            const percent = Number.isFinite(configured) ? configured : Math.round((regular-amount)/regular*100);
            offer.textContent = percent + '% off';
            note.append(was, ' / month · ', offer, ' · save ' + money(regular-amount) + '/month');
          } else {
            note.textContent = 'Current monthly price. Taxes may apply.';
          }
        }
      }
    }).catch(() => {});
  }
})();
