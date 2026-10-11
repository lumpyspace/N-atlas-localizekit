/*
 * LocalizeKit chat widget: add one line to any page.
 *
 *   <script src="https://YOUR-ASSISTANT-SERVER/widget.js"
 *           data-title="AsoStyle Boutique" data-color="#0b7f46" defer></script>
 *
 * data-endpoint  server URL (default: where this script was loaded from)
 * data-title     header text
 * data-color     accent colour
 * data-greeting  first message shown (not sent to the model)
 */
(function () {
  var script = document.currentScript;
  if (!script || window.__localizekitWidget) return;
  window.__localizekitWidget = true;

  var ds = script.dataset;
  var endpoint = (ds.endpoint || new URL(script.src).origin).replace(/\/+$/, "");
  var title = ds.title || "Customer support";
  var color = ds.color || "#0b7f46";
  var greeting = ds.greeting || "Hello! Ask me about delivery, payments, returns or opening hours. You can write in English, Pidgin, Yoruba, Hausa or Igbo.";
  var history = [];
  var busy = false;

  var host = document.createElement("div");
  host.setAttribute("data-localizekit", "");
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: "open" });

  root.innerHTML =
    "<style>" +
    ":host{all:initial}" +
    "*{box-sizing:border-box;font-family:Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}" +
    ".fab{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;background:" + color + ";color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.2);display:grid;place-items:center}" +
    ".fab:focus-visible,.send:focus-visible,textarea:focus-visible{outline:3px solid rgba(15,157,88,.45);outline-offset:2px}" +
    ".panel{position:fixed;right:20px;bottom:88px;z-index:2147483000;width:min(380px,calc(100vw - 24px));height:min(560px,calc(100vh - 120px));background:#fff;border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,.22);display:none;flex-direction:column;overflow:hidden;border:1px solid #e2e8f0}" +
    ".panel.open{display:flex}" +
    "@media (max-width:480px){.panel{right:12px;left:12px;width:auto;bottom:84px;height:calc(100vh - 110px)}}" +
    ".head{background:" + color + ";color:#fff;padding:14px 16px}" +
    ".head b{display:block;font-size:15px}.head span{font-size:12px;opacity:.85}" +
    ".log{flex:1;overflow-y:auto;padding:14px;background:#f8fafc;display:flex;flex-direction:column;gap:10px}" +
    ".msg{max-width:85%;padding:9px 12px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}" +
    ".bot{background:#fff;color:#0f172a;border:1px solid #e2e8f0;border-top-left-radius:4px;align-self:flex-start}" +
    ".me{background:#0b1220;color:#fff;border-top-right-radius:4px;align-self:flex-end}" +
    ".err{background:#fef2f2;color:#991b1b;border:1px solid #fecaca;align-self:flex-start}" +
    ".typing{font-size:12px;color:#64748b;align-self:flex-start}" +
    "form{display:flex;gap:8px;padding:10px;border-top:1px solid #e2e8f0;background:#fff}" +
    "textarea{flex:1;resize:none;border:1px solid #cbd5e1;border-radius:10px;padding:9px 10px;font-size:14px;max-height:96px}" +
    ".send{border:0;border-radius:10px;padding:0 14px;background:" + color + ";color:#fff;font-weight:600;cursor:pointer;font-size:14px}" +
    ".send:disabled{opacity:.5;cursor:default}" +
    ".foot{font-size:11px;color:#64748b;padding:0 12px 10px;background:#fff}" +
    "</style>" +
    '<button class="fab" aria-label="Open chat" aria-expanded="false">' +
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/></svg>' +
    "</button>" +
    '<div class="panel" role="dialog" aria-label="Chat with customer support">' +
    '<div class="head"><b></b><span>AI assistant powered by N-ATLAS</span></div>' +
    '<div class="log" aria-live="polite"></div>' +
    '<form><label style="flex:1;display:flex"><span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Your message</span>' +
    '<textarea rows="1" maxlength="1000" placeholder="Type your message…"></textarea></label>' +
    '<button class="send" type="submit">Send</button></form>' +
    '<div class="foot">AI answers can be wrong. For orders, refunds or complaints, contact a person.</div>' +
    "</div>";

  var fab = root.querySelector(".fab");
  var panel = root.querySelector(".panel");
  var log = root.querySelector(".log");
  var form = root.querySelector("form");
  var input = root.querySelector("textarea");
  var sendBtn = root.querySelector(".send");
  root.querySelector(".head b").textContent = title;

  function add(cls, text) {
    var el = document.createElement("div");
    el.className = cls;
    el.textContent = text; // textContent: model output is never treated as HTML
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  add("msg bot", greeting);

  fab.addEventListener("click", function () {
    var open = panel.classList.toggle("open");
    fab.setAttribute("aria-expanded", String(open));
    if (open) input.focus();
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || busy) return;
    busy = true;
    sendBtn.disabled = true;
    input.value = "";
    add("msg me", text);
    var typing = add("typing", "Assistant is typing…");
    var slow = setTimeout(function () {
      typing.textContent = "Still working: the first reply after a quiet period can take a couple of minutes.";
    }, 8000);

    var request = function () {
      return fetch(endpoint + "/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, history: history }),
      });
    };
    // One retry after a network blip (common on mobile data).
    request()
      .catch(function () {
        return new Promise(function (r) { setTimeout(r, 1500); }).then(request);
      })
      .then(function (r) {
        return r.json().then(function (d) {
          if (!r.ok) throw new Error(d.error || "Something went wrong.");
          return d;
        });
      })
      .then(function (d) {
        add("msg bot", d.reply);
        history.push({ role: "user", content: text }, { role: "assistant", content: d.reply });
        history = history.slice(-6);
      })
      .catch(function (err) {
        add("msg err", err.message || "Could not reach the assistant. Please try again.");
      })
      .finally(function () {
        clearTimeout(slow);
        typing.remove();
        busy = false;
        sendBtn.disabled = false;
        input.focus();
      });
  });
})();
