/**
 * 缓择星球 · Web SSE 客户端（P2）
 * 封装：取 token → POST /api/chat 流式读取 → 按事件名分发。
 * 事件契约与小程序 mmx-ws-client.js 对齐（同一 _run_session 双通道）：
 *   stage / message / form_card / options / tradeoff / rehearsal / mitigation / escalate / done / error
 * 表单提交：opts.form_data = { values: {...}, supplementary: "..." }（对齐 WS form_submit 契约）
 */
(function (global) {
  'use strict';

  function createClient(cfg) {
    cfg = cfg || {};
    var endpoint = cfg.endpoint || '/api/chat';
    var tokenUrl = cfg.tokenUrl || '/api/token';
    var userId = cfg.userId || 'web_visitor';
    var handlers = {};
    var _token = null;
    var _tokenTs = 0;

    function on(name, cb) {
      (handlers[name] = handlers[name] || []).push(cb);
      return api;
    }

    function emit(name, data) {
      (handlers[name] || []).forEach(function (cb) {
        try { cb(data); } catch (e) { console.error('[mmx-sse] handler error', name, e); }
      });
    }

    function getToken() {
      // 5 分钟内复用 token
      if (_token && Date.now() - _tokenTs < 300000) return Promise.resolve(_token);
      return fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j || !j.token) throw new Error('取 token 失败');
        _token = j.token;
        _tokenTs = Date.now();
        return _token;
      });
    }

    /**
     * 发起一轮 SSE。
     * @param {Object} opts { session_id, message?, scenario?, form_data?, preferences? }
     * @returns {Promise} resolve({ events:[{name,data}], done:true }) 流结束
     */
    function send(opts) {
      var body = {
        session_id: opts.session_id,
        user_id: userId,
        message: opts.message || '',
        scenario: opts.scenario || undefined,
      };
      if (opts.form_data) body.form_data = opts.form_data;
      if (opts.preferences) body.preferences = opts.preferences;

      return getToken().then(function (tok) {
        return fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + tok,
          },
          body: JSON.stringify(body),
        });
      }).then(function (resp) {
        if (!resp.ok) {
          return resp.json().catch(function () { return {}; }).then(function (j) {
            throw new Error((j && j.detail) || ('HTTP ' + resp.status));
          });
        }
        if (!resp.body || !resp.body.getReader) throw new Error('环境不支持流式读取');
        var reader = resp.body.getReader();
        var decoder = new TextDecoder('utf-8');
        var buf = '';
        var collected = [];
        var done = false;

        function pump() {
          return reader.read().then(function (res) {
            if (res.done) { done = true; return { events: collected, done: true }; }
            buf += decoder.decode(res.value, { stream: true });
            var idx;
            while ((idx = buf.indexOf('\n\n')) >= 0) {
              var chunk = buf.slice(0, idx);
              buf = buf.slice(idx + 2);
              var m = /event:\s*(.+)/.exec(chunk);
              var d = /data:\s*(.+)/.exec(chunk);
              if (m && d) {
                var name = m[1].trim();
                var data;
                try { data = JSON.parse(d[1]); } catch (e) { continue; }
                collected.push({ name: name, data: data });
                emit(name, data);
              }
            }
            return pump();
          });
        }
        return pump();
      });
    }

    var api = { on: on, send: send, getToken: getToken, _setUserId: function (id) { userId = id; } };
    return api;
  }

  global.ManManXuanWeb = { createClient: createClient };
})(window);
