/* Sincronización bidireccional con Google Calendar para Hábitos Atómicos.
   - Acceso: Google Identity Services (token de 1 hora, sin servidor propio).
   - Alcance mínimo: calendar.app.created. La app solo ve y toca el calendario aparte que ella misma crea.
   - Comparte el ámbito global de index.html (S, itemsForDate, habitById, etc.). */
(function () {
  'use strict';
  var SCOPE = 'https://www.googleapis.com/auth/calendar.app.created';
  var API = 'https://www.googleapis.com/calendar/v3';
  var CAL_NAME = 'Hábitos Atómicos';
  var TICK = '✓ ';
  var BYD = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
  var TZ = (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota'; } catch (e) { return 'America/Bogota'; } })();
  var tok = null, tokExp = 0, tc = null, pend = null, busy = false, lastMsg = '';

  var CID = function () { return (window.SUITE_CFG && window.SUITE_CFG.gcalClientId) || ''; };
  var enc = encodeURIComponent;
  var p2 = function (n) { return String(n).padStart(2, '0'); };
  var today0 = function () { var d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  var calPath = function () { return '/calendars/' + enc(S.gcal.calId) + '/events'; };

  /* ---------- Acceso ---------- */
  function loadGis() {
    return new Promise(function (res, rej) {
      if (window.google && google.accounts && google.accounts.oauth2) return res();
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = function () { res(); };
      s.onerror = function () { rej(new Error('No se pudo cargar el acceso de Google. Revisa tu conexión.')); };
      document.head.appendChild(s);
    });
  }
  function getToken(interactive) {
    if (tok && Date.now() < tokExp - 60000) return Promise.resolve(tok);
    if (!interactive) return Promise.reject(new Error('Tu sesión con Google venció. Pulsa Sincronizar para volver a autorizar.'));
    if (!CID()) return Promise.reject(new Error('Falta configurar el ID de cliente de Google.'));
    return loadGis().then(function () {
      return new Promise(function (res, rej) {
        if (!tc) {
          tc = google.accounts.oauth2.initTokenClient({
            client_id: CID(), scope: SCOPE,
            callback: function (r) {
              var p = pend; pend = null; if (!p) return;
              if (r.error) p.rej(new Error(r.error_description || r.error));
              else { tok = r.access_token; tokExp = Date.now() + (+r.expires_in || 3600) * 1000; p.res(tok); }
            },
            error_callback: function (e) {
              var p = pend; pend = null; if (!p) return;
              var t = e && e.type;
              p.rej(new Error(t === 'popup_closed' ? 'Cerraste la ventana de Google antes de terminar.'
                : t === 'popup_failed_to_open' ? 'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.'
                : 'No se pudo conectar con Google.'));
            }
          });
        }
        pend = { res: res, rej: rej };
        tc.requestAccessToken({ prompt: S.gcal.on ? '' : 'consent' });
      });
    });
  }
  function api(method, path, body) {
    return fetch(API + path, {
      method: method,
      headers: Object.assign({ Authorization: 'Bearer ' + tok }, body ? { 'Content-Type': 'application/json' } : {}),
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      if (r.status === 204) return null;
      return r.json().catch(function () { return null; }).then(function (j) {
        if (!r.ok) {
          if (r.status === 401) { tok = null; tokExp = 0; }
          var e = new Error((j && j.error && j.error.message) || ('Google respondió ' + r.status));
          e.status = r.status; throw e;
        }
        return j;
      });
    });
  }
  function listAll(path) {
    var out = [];
    function next(tokn) {
      return api('GET', path + (path.indexOf('?') < 0 ? '?' : '&') + 'maxResults=250' + (tokn ? '&pageToken=' + enc(tokn) : '')).then(function (j) {
        out = out.concat((j && j.items) || []);
        return j && j.nextPageToken ? next(j.nextPageToken) : out;
      });
    }
    return next('');
  }
  function createCal() {
    return api('POST', '/calendars', { summary: CAL_NAME, description: 'Hábitos y eventos fijos de la app Hábitos Atómicos.', timeZone: TZ })
      .then(function (c) { S.gcal.calId = c.id; S.gcal.map = {}; });
  }

  /* ---------- Modelo: lo que la app quiere publicar ---------- */
  var sigOf = function (t, s, d, days) { return JSON.stringify([t, s, d, days]); };
  function desired() {
    var t = today0(), out = new Map();
    for (var i = 0; i < 7; i++) {
      var d = addDays(t, i);
      itemsForDate(d).forEach(function (it) {
        if (it.start == null) return;
        var o = out.get(it.key);
        if (!o) { o = { key: it.key, title: it.title, start: it.start, dur: Math.max(5, it.dur || 15), days: [], sub: it.sub || '', checkable: !!it.checkable, hid: it.habitId || '' }; out.set(it.key, o); }
        o.days.push(dayIdx(d));
      });
    }
    out.forEach(function (o) { o.days.sort(function (a, b) { return a - b; }); if (o.days.length === 7) o.days = []; });
    return out;
  }
  function ldt(d, min) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, min);
    return x.getFullYear() + '-' + p2(x.getMonth() + 1) + '-' + p2(x.getDate()) + 'T' + p2(x.getHours()) + ':' + p2(x.getMinutes()) + ':00';
  }
  function firstDate(o) {
    var b = addDays(today0(), -7);
    var h = o.key.charAt(0) === 'h' ? habitById(o.hid) : null;
    if (h && h.start) { var s = parseDk(h.start); if (s > b) b = s; }
    for (var i = 0; i < 7; i++) { var d = addDays(b, i); if (!o.days.length || o.days.indexOf(dayIdx(d)) >= 0) return d; }
    return b;
  }
  function bodyFor(o) {
    var d = firstDate(o);
    return {
      summary: o.title,
      description: (o.sub ? o.sub + '\n\n' : '') + 'Sincronizado con Hábitos Atómicos. Para marcar un día como hecho, escribe «' + TICK.trim() + '» al inicio del título de ese día.',
      start: { dateTime: ldt(d, o.start), timeZone: TZ },
      end: { dateTime: ldt(d, o.start + o.dur), timeZone: TZ },
      recurrence: [o.days.length ? 'RRULE:FREQ=WEEKLY;BYDAY=' + o.days.map(function (i) { return BYD[i]; }).join(',') : 'RRULE:FREQ=DAILY'],
      extendedProperties: { private: { ha_key: o.key } }
    };
  }
  function parseG(e, fallbackDays) {
    var s = e.start && e.start.dateTime, en = e.end && e.end.dateTime;
    if (!s || !en) return null;
    var m = /T(\d{2}):(\d{2})/.exec(s); if (!m) return null;
    var start = +m[1] * 60 + +m[2];
    var dur = Math.max(1, Math.round((new Date(en) - new Date(s)) / 60000));
    var days = fallbackDays, weekly = false;
    var r = (e.recurrence || []).filter(function (x) { return /^RRULE:/i.test(x); })[0];
    if (r) {
      if (/FREQ=DAILY/i.test(r)) { days = []; weekly = true; }
      else if (/FREQ=WEEKLY/i.test(r)) {
        weekly = true;
        var b = /BYDAY=([A-Z,]+)/i.exec(r);
        if (b) {
          var l = b[1].toUpperCase().split(',').map(function (x) { return BYD.indexOf(x); }).filter(function (i) { return i >= 0; }).sort(function (a, c) { return a - c; });
          days = l.length === 7 ? [] : l;
        } else days = [dayIdx(parseDk(s.slice(0, 10)))];
      }
    }
    return { title: (e.summary || '').replace(/^\s*✓\s*/, ''), start: start, dur: dur, days: days, weekly: weekly };
  }
  var gSigOf = function (e, days) { var p = parseG(e, days); return p ? sigOf(p.title, p.start, Math.max(5, p.dur), p.days) : ''; };

  function setQuiet(key, k, on) {
    var list = S.done[k] || (S.done[k] = []), i = list.indexOf(key);
    if (on && i < 0) {
      list.push(key);
      var sk = S.skips[k]; if (sk) { S.skips[k] = sk.filter(function (x) { return x !== key; }); if (!S.skips[k].length) delete S.skips[k]; }
      var sl = S.slips[k]; if (sl) { S.slips[k] = sl.filter(function (x) { return x !== key; }); if (!S.slips[k].length) delete S.slips[k]; }
      var h = habitById(keyHabitId(key));
      var late = k < dk(new Date()) && (Date.now() - parseDk(k).getTime()) > 36 * 3600 * 1000;
      (S.meta[k] || (S.meta[k] = {}))[key] = { t: new Date().toTimeString().slice(0, 5), lvl: h ? h.level : 1, late: late, ng: false };
    } else if (!on && i >= 0) {
      list.splice(i, 1); if (!list.length) delete S.done[k];
      if (S.meta[k]) { delete S.meta[k][key]; if (!Object.keys(S.meta[k]).length) delete S.meta[k]; }
    }
  }

  /* ---------- Sincronización ---------- */
  function sync(opts) {
    opts = opts || {};
    if (busy) return Promise.resolve(null);
    busy = true;
    var rep = { push: 0, pull: 0, add: 0, del: 0, done: 0, skipped: 0, gone: 0 };
    var changed = false, ok = false;
    return getToken(!!opts.interactive).then(function () {
      var g = S.gcal;
      return (g.calId ? Promise.resolve() : createCal()).then(function () { return run(); });
    }).then(function () { ok = true; return rep; }).then(function (r) {
      return r;
    }).then(function (r) { return finish(r); }, function (err) { finish(null); throw err; });

    function finish(r) {
      busy = false;
      if (ok) { S.gcal.on = true; S.gcal.last = Date.now(); }
      if (ok && changed) { commit(); if (typeof checkUnlocks === 'function') checkUnlocks(); }
      else persist();
      return r;
    }
    function listMasters() { return listAll(calPath() + '?showDeleted=true&singleEvents=false'); }
    function run() {
      var g = S.gcal;
      return listMasters().catch(function (e) {
        if (e.status === 404 || e.status === 410) return createCal().then(function () { return []; });
        throw e;
      }).then(function (all) {
        var masters = all.filter(function (e) { return !e.recurringEventId; });
        var byId = new Map(masters.map(function (e) { return [e.id, e]; }));
        var byKey = new Map();
        masters.forEach(function (e) {
          var k = e.extendedProperties && e.extendedProperties.private && e.extendedProperties.private.ha_key;
          if (k && e.status !== 'cancelled') byKey.set(k, e);
        });
        var des = desired();
        var chain = Promise.resolve();
        var step = function (fn) { chain = chain.then(fn); };

        des.forEach(function (o) {
          step(function () {
            var aSig = sigOf(o.title, o.start, o.dur, o.days);
            var m = g.map[o.key];
            if (m && m.dead && m.sig !== aSig) { delete g.map[o.key]; m = null; }
            if (m && m.dead) return;
            var ge = m ? byId.get(m.id) : null;
            if (m && (!ge || ge.status === 'cancelled')) {
              rep.gone++;
              if (o.key.charAt(0) === 'h') { var h = habitById(o.hid); if (h) { h.showCal = false; changed = true; } delete g.map[o.key]; }
              else g.map[o.key] = { id: m.id, sig: aSig, dead: true, dn: {} };
              return;
            }
            if (!m) {
              var ex = byKey.get(o.key);
              if (ex) { ge = ex; m = g.map[o.key] = { id: ex.id, sig: gSigOf(ex, o.days), dn: {} }; }
              else {
                return api('POST', calPath(), bodyFor(o)).then(function (e) { g.map[o.key] = { id: e.id, sig: aSig, dn: {} }; rep.push++; });
              }
            }
            var p = parseG(ge, o.days);
            if (!p) {
              return api('PUT', calPath() + '/' + enc(m.id), bodyFor(o)).then(function () { m.sig = aSig; rep.push++; });
            }
            var gSig = sigOf(p.title, p.start, Math.max(5, p.dur), p.days);
            if (gSig !== m.sig) {
              if (o.key.charAt(0) === 'h') {
                var hh = habitById(o.hid);
                if (hh) { hh.name = p.title || hh.name; hh.time = fromMin(p.start); hh.duration = p.dur; if (p.weekly) hh.days = p.days.slice(); changed = true; m.sig = gSig; rep.pull++; }
                return;
              }
              return api('PATCH', calPath() + '/' + enc(m.id), bodyFor(o)).then(function () { m.sig = aSig; rep.push++; });
            }
            if (aSig !== m.sig) {
              return api('PATCH', calPath() + '/' + enc(m.id), bodyFor(o)).then(function () { m.sig = aSig; rep.push++; });
            }
          });
        });

        /* Lo que ya no se publica: se quita de Google. */
        step(function () {
          var dels = [];
          Object.keys(g.map).forEach(function (k) {
            if (des.has(k)) return;
            var m = g.map[k];
            delete g.map[k];
            if (m.dead) return;
            dels.push(api('DELETE', calPath() + '/' + enc(m.id)).then(function () { rep.del++; }, function (e) { if (e.status !== 404 && e.status !== 410) throw e; }));
          });
          return Promise.all(dels);
        });

        /* Eventos nuevos creados en Google dentro del calendario. */
        step(function () {
          var mapped = new Set(Object.keys(g.map).map(function (k) { return g.map[k].id; }));
          var jobs = [];
          masters.forEach(function (e) {
            if (e.status === 'cancelled' || mapped.has(e.id)) return;
            var pk = e.extendedProperties && e.extendedProperties.private && e.extendedProperties.private.ha_key;
            if (pk) return;
            var p = parseG(e, []);
            if (!p || !p.weekly) { rep.skipped++; return; }
            var name = p.title || 'Evento';
            var h = newHabit({ name: name, kind: 'fijo', type: 'neu', time: fromMin(p.start), duration: p.dur, days: p.days.slice(), showCal: true });
            S.habits.push(h); changed = true;
            g.map['h:' + h.id] = { id: e.id, sig: sigOf(name, p.start, Math.max(5, p.dur), p.days), dn: {} };
            rep.add++;
            jobs.push(api('PATCH', calPath() + '/' + enc(e.id), { extendedProperties: { private: { ha_key: 'h:' + h.id } } }));
          });
          return Promise.all(jobs);
        });

        /* Días marcados como hechos (en ambos sentidos). */
        step(function () {
          resetCache();
          var t0 = today0();
          var path = calPath() + '?singleEvents=true&timeMin=' + enc(addDays(t0, -7).toISOString()) + '&timeMax=' + enc(addDays(t0, 1).toISOString());
          return listAll(path).then(function (inst) {
            var idToKey = new Map();
            Object.keys(g.map).forEach(function (k) { if (!g.map[k].dead) idToKey.set(g.map[k].id, k); });
            var jobs = [];
            inst.forEach(function (e) {
              if (!e.recurringEventId || e.status === 'cancelled') return;
              var key = idToKey.get(e.recurringEventId); if (!key) return;
              var o = des.get(key); if (!o || !o.checkable) return;
              var os = e.originalStartTime && e.originalStartTime.dateTime; if (!os) return;
              var dateK = os.slice(0, 10);
              if (!itemsForDate(parseDk(dateK)).some(function (i) { return i.key === key; })) return;
              var m = g.map[key]; m.dn = m.dn || {};
              var gDone = /^\s*✓/.test(e.summary || ''), aDone = isDone(dateK, key), last = !!m.dn[dateK], fin = last;
              if (gDone !== last) {
                if (aDone !== gDone) { setQuiet(key, dateK, gDone); changed = true; rep.done++; }
                fin = gDone;
              } else if (aDone !== last) {
                jobs.push(api('PATCH', calPath() + '/' + enc(e.id), aDone ? { summary: TICK + o.title, colorId: '10' } : { summary: o.title, colorId: null }));
                fin = aDone; rep.done++;
              }
              m.dn[dateK] = fin;
            });
            var cut = dk(addDays(t0, -10));
            Object.keys(g.map).forEach(function (k) { var dn = g.map[k].dn; if (dn) Object.keys(dn).forEach(function (d) { if (d < cut) delete dn[d]; }); });
            return Promise.all(jobs);
          });
        });
        return chain;
      });
    }
  }

  function summary(r) {
    if (!r) return '';
    var a = [];
    if (r.push) a.push(r.push + ' enviado' + (r.push === 1 ? '' : 's') + ' a Google');
    if (r.pull) a.push(r.pull + ' actualizado' + (r.pull === 1 ? '' : 's') + ' desde Google');
    if (r.add) a.push(r.add + ' evento' + (r.add === 1 ? '' : 's') + ' nuevo' + (r.add === 1 ? '' : 's') + ' traído' + (r.add === 1 ? '' : 's') + ' de Google');
    if (r.done) a.push(r.done + ' marca' + (r.done === 1 ? '' : 's') + ' de «hecho» sincronizada' + (r.done === 1 ? '' : 's'));
    if (r.del) a.push(r.del + ' quitado' + (r.del === 1 ? '' : 's') + ' de Google');
    if (r.gone) a.push(r.gone + ' borrado' + (r.gone === 1 ? '' : 's') + ' en Google (respetado' + (r.gone === 1 ? '' : 's') + ')');
    var s = a.length ? a.join('; ') + '.' : 'Todo estaba al día.';
    if (r.skipped) s += ' ' + r.skipped + ' evento' + (r.skipped === 1 ? '' : 's') + ' de Google no se trajo' + (r.skipped === 1 ? '' : 'ron') + ': solo se importan los que se repiten.';
    return s;
  }

  /* ---------- Interfaz ---------- */
  function fmtLast(ts) { if (!ts) return ''; var d = new Date(ts); return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) + ', ' + p2(d.getHours()) + ':' + p2(d.getMinutes()); }
  function section() {
    var g = S.gcal || {};
    if (!CID()) {
      return '<div class="settings-sec" id="gc-sec"><h4>Google Calendar</h4><p>La sincronización ya está construida, pero falta pegar el ID de cliente de Google en la configuración del sitio. Mientras tanto no se puede conectar.</p></div>';
    }
    var intro = 'Crea un calendario aparte llamado «' + CAL_NAME + '» en tu Google Calendar y mantiene sincronizados tus hábitos con hora, cadenas y eventos fijos. Los cambios de nombre, hora, duración y días que hagas en Google vuelven a la app, y un «✓» al inicio del título de un día lo marca como hecho. La app solo puede ver ese calendario, no el resto de tu cuenta.';
    var btns = g.on
      ? '<button type="button" class="btn primary sm" data-act="gc-sync">Sincronizar ahora</button><button type="button" class="btn ghost sm" data-act="gc-off">Desconectar</button><button type="button" class="btn danger sm" data-act="gc-off-del">Desconectar y borrar el calendario</button>'
      : '<button type="button" class="btn primary sm" data-act="gc-sync">Conectar con Google</button>';
    var st = g.on ? '<p class="hint" style="margin:0 0 8px">Conectado' + (g.last ? ' · última sincronización: ' + esc(fmtLast(g.last)) : '') + '</p>' : '';
    return '<div class="settings-sec" id="gc-sec"><h4>Google Calendar</h4><p>' + intro + '</p>' + st + '<div class="btns">' + btns + '</div><p class="hint" id="gc-out" role="status" aria-live="polite" style="margin:8px 0 0">' + esc(lastMsg) + '</p></div>';
  }
  function paint() { var el = document.getElementById('gc-sec'); if (el) el.outerHTML = section(); }
  function say(msg) { lastMsg = msg; var o = document.getElementById('gc-out'); if (o) o.textContent = msg; }
  function lock(on) { var el = document.getElementById('gc-sec'); if (el) el.querySelectorAll('button').forEach(function (b) { b.disabled = on; }); }

  function doSync() {
    if (busy) return;
    say('Sincronizando…'); lock(true);
    sync({ interactive: true }).then(function (r) {
      lastMsg = summary(r); paint(); toast('Google Calendar sincronizado');
    }, function (e) {
      lastMsg = (e && e.message) || 'No se pudo sincronizar.'; paint();
    });
  }
  function doOff(del) {
    var finish = function () { S.gcal.on = false; S.gcal.map = {}; if (del) S.gcal.calId = ''; lastMsg = del ? 'Desconectado. El calendario se borró de Google.' : 'Desconectado. Tu calendario sigue en Google; al reconectar se reutiliza.'; persist(); paint(); toast(del ? 'Calendario borrado de Google' : 'Google Calendar desconectado'); };
    if (!del) { try { if (tok && window.google) google.accounts.oauth2.revoke(tok); } catch (e) {} tok = null; tokExp = 0; return finish(); }
    say('Borrando…'); lock(true);
    getToken(true).then(function () { return api('DELETE', '/calendars/' + enc(S.gcal.calId)); })
      .then(function () { try { google.accounts.oauth2.revoke(tok); } catch (e) {} tok = null; tokExp = 0; finish(); },
        function (e) { if (e && (e.status === 404 || e.status === 410)) return finish(); lastMsg = (e && e.message) || 'No se pudo borrar el calendario.'; paint(); });
  }
  function modal() { openModal({ title: 'Google Calendar', body: section(), noCancel: true, submit: 'Cerrar', onSubmit: function () {} }); }

  Object.assign(ACT, {
    'gc-sync': doSync,
    'gc-off': function () { confirmModal('Se deja de sincronizar. Tu calendario «' + CAL_NAME + '» y sus eventos se quedan en Google.', function () { doOff(false); }, 'Desconectar'); },
    'gc-off-del': function () { confirmModal('Se borra el calendario «' + CAL_NAME + '» de tu Google Calendar junto con todos sus eventos. Tus hábitos en la app no se tocan.', function () { doOff(true); }, 'Borrar calendario'); },
    'gc-open': modal
  });
  window.GCal = { section: section, sync: sync, modal: modal };
})();
