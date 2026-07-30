import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app.jsx";

/* Crash reporter (v2.1, founder item 6): any render or async failure shows the
   message with a copy button instead of a white screen, so a device-only bug
   can be reported without a debugger attached. */
function report(err, info) {
  const text = String((err && err.stack) || err) + (info && info.componentStack ? "\n" + info.componentStack : "");
  const box = document.createElement("div");
  box.style.cssText = "font-family:system-ui;padding:28px 20px;color:#29382F";
  box.innerHTML =
    "<h3 style='font-family:Georgia,serif'>Rambles hit an error</h3>" +
    "<p style='font-size:13px'>Copy this and send it to alexlycau@gmail.com.</p>" +
    "<pre id='lrerr' style='white-space:pre-wrap;font-size:11px;background:#F0EFE4;padding:12px;border-radius:8px;max-height:40vh;overflow:auto'></pre>" +
    "<button id='lrcopy' style='width:100%;padding:12px;border:none;border-radius:12px;background:#29382F;color:#F6F5EF;font-weight:700'>Copy error text</button>" +
    "<button id='lrreload' style='width:100%;margin-top:8px;padding:12px;border:1.5px solid #C9C6B4;border-radius:12px;background:none;font-weight:700'>Reload the app</button>";
  document.getElementById("root").innerHTML = "";
  document.getElementById("root").appendChild(box);
  document.getElementById("lrerr").textContent = text;
  document.getElementById("lrcopy").onclick = () => {
    try { navigator.clipboard.writeText(text); document.getElementById("lrcopy").textContent = "Copied ✓"; } catch (e) {}
  };
  document.getElementById("lrreload").onclick = () => location.reload();
}

class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { report(err, info); }
  render() { return this.state.err ? null : this.props.children; }
}

window.addEventListener("error", (e) => { if (e && e.error) report(e.error, null); });
window.addEventListener("unhandledrejection", (e) => { if (e && e.reason) report(e.reason, null); });

try {
  createRoot(document.getElementById("root")).render(
    React.createElement(ErrorBoundary, null, React.createElement(App))
  );
} catch (e) { report(e, null); }
