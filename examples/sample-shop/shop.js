// "Ask our assistant" buttons open the chat widget.
document.addEventListener("click", function (e) {
  if (!e.target.closest("[data-open-chat]")) return;
  var host = document.querySelector("[data-localizekit]");
  var fab = host && host.shadowRoot && host.shadowRoot.querySelector(".fab");
  var panel = host && host.shadowRoot && host.shadowRoot.querySelector(".panel");
  if (fab && panel && !panel.classList.contains("open")) fab.click();
});
