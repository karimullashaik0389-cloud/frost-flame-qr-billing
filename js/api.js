(function (global) {
  function apiUrl() {
    return (global.FF_API_URL || '').replace(/\/$/, '');
  }
  function ready() {
    return !!apiUrl();
  }
  function call(payload) {
    var url = apiUrl();
    if (!url) return Promise.reject(new Error('API not configured'));
    return fetch(url, {
      method: 'POST',
      mode: 'cors',
      // text/plain avoids CORS preflight with Apps Script
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload || {})
    }).then(function (r) {
      return r.text().then(function (t) {
        var data;
        try { data = JSON.parse(t); } catch (e) {
          throw new Error('Bad API response');
        }
        if (data && data.ok === false) {
          var err = new Error(data.error || 'Request failed');
          err.code = data.code;
          throw err;
        }
        return data;
      });
    });
  }
  global.FFApi = { ready: ready, call: call, url: apiUrl };
})(window);
