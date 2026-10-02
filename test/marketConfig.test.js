const assert = require("assert");
const { getMarket, marketForAccount } = require("../src/config/markets");
const {
  buildIndividualAccountConfig,
  buildCompanyAccountConfig,
  getDemoProfiles,
} = require("../src/services/accountService");

const baseIndividual = {
  firstName: "Aoife",
  lastName: "Murphy",
  email: "test@example.com",
  phone: "+353 85 123 4567",
  dob: { day: 15, month: 6, year: 1985 },
  address: { line1: "12 Grafton Street", city: "Dublin", country: "IE" },
};

const ieIndividual = buildIndividualAccountConfig(baseIndividual, {}, "ie");
assert.strictEqual(ieIndividual.identity.country, "ie");
assert.strictEqual(ieIndividual.defaults.currency, "eur");
assert.strictEqual(
  ieIndividual._externalAccount.account_number,
  "IE29AIBK93115212345678"
);
assert.strictEqual(ieIndividual._externalAccount.routing_number, undefined);

const ieCompany = buildCompanyAccountConfig(
  {
    name: "Demo Ireland Ltd",
    email: "test@example.com",
    phone: "+353 85 123 4567",
    tax_id: "123456",
    address: { line1: "25 Grand Canal Street", city: "Dublin", country: "IE" },
  },
  {},
  "ie"
);
assert.strictEqual(ieCompany.identity.business_details.id_numbers[0].type, "ie_crn");

const gbIndividual = buildIndividualAccountConfig(baseIndividual);
assert.strictEqual(gbIndividual.identity.country, "gb");
assert.strictEqual(gbIndividual.defaults.currency, "gbp");
assert.strictEqual(gbIndividual._externalAccount.routing_number, "108800");

const ieProfiles = getDemoProfiles({ market: "ie" });
assert.strictEqual(ieProfiles.individual.address.country, "IE");
assert.strictEqual(ieProfiles.company.address.country, "IE");
assert.match(ieProfiles.individual.phone, /^\+353/);

assert.strictEqual(
  marketForAccount({ identity: { country: "IE" }, defaults: { currency: "eur" } }).code,
  "ie"
);
assert.throws(() => getMarket("us"), /Unsupported market/);

console.log("marketConfig tests passed");
