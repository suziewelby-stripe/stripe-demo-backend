import { loadConnectAndInitialize } from "@stripe/connect-js";

const params = new URLSearchParams(window.location.search);
const accountId = params.get("account_id");
const status = document.getElementById("status");
const errorBox = document.getElementById("error");
const shopPanel = document.getElementById("shop-panel");
const ordersPanel = document.getElementById("orders-panel");
const shopTab = document.getElementById("shop-tab");
const ordersTab = document.getElementById("orders-tab");

function showError(message) {
  status.classList.add("hidden");
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function selectTab(name) {
  const showShop = name === "shop";
  shopPanel.classList.toggle("hidden", !showShop);
  ordersPanel.classList.toggle("hidden", showShop);
  shopTab.classList.toggle("active", showShop);
  ordersTab.classList.toggle("active", !showShop);
  shopTab.setAttribute("aria-selected", String(showShop));
  ordersTab.setAttribute("aria-selected", String(!showShop));
}

shopTab.addEventListener("click", () => selectTab("shop"));
ordersTab.addEventListener("click", () => selectTab("orders"));

async function fetchJSON(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

async function initialize() {
  if (!accountId) throw new Error("No connected account was provided.");
  const appInfo = await fetchJSON("/api/app_info");
  const stripeConnectInstance = loadConnectAndInitialize({
    publishableKey: appInfo.publishableKey,
    fetchClientSecret: async () => {
      const session = await fetchJSON("/api/terminal/hardware-account-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: accountId }),
      });
      return session.clientSecret;
    },
    appearance: {
      overlays: "dialog",
      variables: {
        colorPrimary: "#0033cc",
        borderRadius: "10px",
      },
    },
  });

  const shop = stripeConnectInstance.create("terminal-hardware-shop");
  const orders = stripeConnectInstance.create("terminal-hardware-orders");
  shop.setOnCheckoutFinished?.(() => selectTab("orders"));
  shop.setOnLoaderStart?.(() => status.classList.add("hidden"));
  orders.setOnLoaderStart?.(() => status.classList.add("hidden"));
  shopPanel.appendChild(shop);
  ordersPanel.appendChild(orders);
}

initialize().catch((error) => showError(error.message));
