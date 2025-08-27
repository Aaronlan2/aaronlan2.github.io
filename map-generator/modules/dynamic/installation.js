// module to prompt PWA installation
let installButton = null;
let deferredPrompt = null;

export function init(event) {
  const dontAskforInstallation = localStorage.getItem("installationDontAsk");
  if (dontAskforInstallation) return;

  installButton = createButton();
  deferredPrompt = event;

  window.addEventListener("appinstalled", () => {
    tip("应用已安装", false, "success", 8000);
    cleanup();
  });
}

function createButton() {
  const button = document.createElement("button");
  button.style = `
      position: fixed;
      top: 1em;
      right: 1em;
      padding: 0.6em 0.8em;
      width: auto;
    `;
  button.className = "options glow";
  button.innerHTML = "安装";
  button.onclick = openDialog;
  button.onmouseenter = () => tip("安装应用");
  document.getElementById("optionsContainer").appendChild(button);
  return button;
}

function openDialog() {
  alertMessage.innerHTML = /* html */ `您可以安装该工具，使其看起来像桌面应用程序：有自己的图标在您的桌面上，并且可以离线工作，但受到一些限制`;
  $("#alert").dialog({
    resizable: false,
    title: "安装应用",
    width: "38em",
    buttons: {
      安装: function () {
        $(this).dialog("close");
        deferredPrompt.prompt();
      },
      取消: function () {
        $(this).dialog("close");
      }
    },
    open: function () {
      const checkbox =
        '<span><input id="dontAsk" class="checkbox" type="checkbox"><label for="dontAsk" class="checkbox-label dontAsk"><i>不再询问</i></label><span>';
      const pane = this.parentElement.querySelector(".ui-dialog-buttonpane");
      pane.insertAdjacentHTML("afterbegin", checkbox);
    },
    close: function () {
      const box = this.parentElement.querySelector(".checkbox");
      if (box?.checked) {
        localStorage.setItem("installationDontAsk", true);
        cleanup();
      }
      $(this).dialog("destroy");
    }
  });

  function cleanup() {
    installButton.remove();
    installButton = null;
    deferredPrompt = null;
  }
}
