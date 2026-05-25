(function () {
  const statusEl = document.getElementById('status');
  const eventsEl = document.getElementById('events');
  const base = window.location.origin;
  const apiKey = new URLSearchParams(window.location.search).get('apiKey') || '';

  function headers() {
    const h = { Accept: 'application/json' };
    if (apiKey) h['X-API-Key'] = apiKey;
    return h;
  }

  function setMetric(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function pushEvent(text, blocked) {
    const li = document.createElement('li');
    li.textContent = text;
    if (blocked) li.classList.add('blocked');
    eventsEl.prepend(li);
    while (eventsEl.children.length > 80) eventsEl.removeChild(eventsEl.lastChild);
  }

  async function refreshRest() {
    try {
      const [instRes, costRes] = await Promise.all([
        fetch(base + '/api/instances', { headers: headers() }),
        fetch(base + '/api/cost', { headers: headers() }),
      ]);
      if (instRes.ok) {
        const instances = await instRes.json();
        const totalReq = instances.reduce((s, i) => s + (i.totalRequests || 0), 0);
        const totalBlocked = instances.reduce((s, i) => s + (i.blockedRequests || 0), 0);
        setMetric('metric-requests', String(totalReq));
        setMetric('metric-blocked', String(totalBlocked));
        setMetric('metric-instances', String(instances.length));
      }
      if (costRes.ok) {
        const cost = await costRes.json();
        const usd = cost.totalCostUsd ?? cost.totalUsd ?? cost.total ?? 0;
        setMetric('metric-cost', '$' + Number(usd).toFixed(4));
      }
    } catch (e) {
      statusEl.textContent = 'REST error: ' + e.message;
    }
  }

  function connectWs() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(proto + '//' + location.host + '/ws');
    ws.onopen = function () {
      statusEl.textContent = 'WebSocket connected';
      ws.send(JSON.stringify({
        type: 'subscribe',
        channels: ['policy', 'health', 'metrics', 'audit', 'ai', 'cost'],
      }));
    };
    ws.onclose = function () {
      statusEl.textContent = 'WebSocket disconnected — retrying…';
      setTimeout(connectWs, 3000);
    };
    ws.onerror = function () {
      statusEl.textContent = 'WebSocket error';
    };
    ws.onmessage = function (ev) {
      try {
        const msg = JSON.parse(ev.data);
        const ch = msg.channel || msg.type || 'event';
        const blocked = msg.action === 'block' || msg.blocked === true;
        pushEvent('[' + ch + '] ' + JSON.stringify(msg).slice(0, 120), blocked);
        if (msg.channel === 'metrics' || msg.type === 'metrics') refreshRest();
      } catch {
        pushEvent(ev.data.slice(0, 120), false);
      }
    };
  }

  refreshRest();
  setInterval(refreshRest, 5000);
  connectWs();
})();
