const MARKETS = Object.freeze({
  gb: Object.freeze({
    code: "gb",
    country: "GB",
    currency: "gbp",
    locale: "en-GB",
    companyIdType: "gb_crn",
    websiteSuffix: "co.uk",
    profile: Object.freeze({
      phone: "+44 7400123456",
      individualAddress: Object.freeze({
        line1: "123 Demo Street",
        city: "London",
        postal_code: "SW1A 1AA",
        country: "GB",
      }),
      companyAddress: Object.freeze({
        line1: "456 Business Park",
        city: "Manchester",
        postal_code: "M1 1AA",
        country: "GB",
      }),
      companyId: "12345678",
    }),
    externalAccount: Object.freeze({
      object: "bank_account",
      account_number: "00012345",
      routing_number: "108800",
      country: "GB",
      currency: "gbp",
    }),
  }),
  ie: Object.freeze({
    code: "ie",
    country: "IE",
    currency: "eur",
    locale: "en-IE",
    companyIdType: "ie_crn",
    websiteSuffix: "ie",
    profile: Object.freeze({
      phone: "+353 85 123 4567",
      individualAddress: Object.freeze({
        line1: "12 Grafton Street",
        city: "Dublin",
        postal_code: "D02 XY76",
        country: "IE",
      }),
      companyAddress: Object.freeze({
        line1: "25 Grand Canal Street",
        city: "Dublin",
        postal_code: "D02 X525",
        country: "IE",
      }),
      companyId: "123456",
    }),
    externalAccount: Object.freeze({
      object: "bank_account",
      account_number: "IE29AIBK93115212345678",
      country: "IE",
      currency: "eur",
    }),
  }),
});

function normalizeMarketCode(value = "gb") {
  return String(value).trim().toLowerCase();
}

function getMarket(value = "gb") {
  const code = normalizeMarketCode(value);
  const market = MARKETS[code];
  if (!market) {
    const error = new Error(`Unsupported market: ${value}`);
    error.code = "invalid_market";
    throw error;
  }
  return market;
}

function marketForAccount(account) {
  const country = account && account.identity && account.identity.country;
  const byCountry = country && MARKETS[String(country).toLowerCase()];
  if (byCountry) return byCountry;

  const currency = account && account.defaults && account.defaults.currency;
  const byCurrency = Object.values(MARKETS).find(
    (market) => market.currency === String(currency || "").toLowerCase()
  );
  return byCurrency || MARKETS.gb;
}

module.exports = { MARKETS, getMarket, marketForAccount };
