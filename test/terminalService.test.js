const assert = require("assert");
const terminalService = require("../src/services/terminalService");

assert.strictEqual(
  terminalService.normalizeRegistrationCode("  Apple  River TREE "),
  "apple-river-tree"
);
assert.strictEqual(
  terminalService.normalizeRegistrationCode("apple-river-tree"),
  "apple-river-tree"
);
assert.strictEqual(
  terminalService.normalizeRegistrationCode("simulated-s700"),
  "simulated-s700"
);
assert.strictEqual(terminalService.normalizeRegistrationCode("two words"), null);

async function run() {
  const createReaderCalls = [];
  const createLocationCalls = [];
  const accountSessionCalls = [];
  let locations = [];
  const stripeClient = {
    terminal: {
      readers: {
        list(params, options) {
          assert.deepStrictEqual(params, {
            limit: 100,
            expand: ["data.location"],
          });
          assert.deepStrictEqual(options, { stripeAccount: "acct_test" });
          return {
            async autoPagingToArray() {
              return [
                {
                  id: "tmr_phone",
                  label: "Tap to Pay",
                  device_type: "mobile_phone_reader",
                },
                {
                  id: "tmr_s700",
                  label: "Front desk",
                  status: "online",
                  device_type: "stripe_s700",
                  serial_number: "SN123",
                  location: { id: "tml_1", display_name: "London" },
                },
              ];
            },
          };
        },
        async create(params, options) {
          createReaderCalls.push({ params, options });
          return {
            id: "tmr_created",
            ...params,
            device_type: "simulated_stripe_s700",
            status: "online",
          };
        },
      },
      locations: {
        async list(params, options) {
          assert.deepStrictEqual(params, {});
          assert.deepStrictEqual(options, { stripeAccount: "acct_test" });
          return { data: locations };
        },
        async create(params, options) {
          createLocationCalls.push({ params, options });
          return { id: "tml_created", ...params };
        },
      },
    },
    v2: {
      core: {
        accounts: {
          async retrieve(id, params) {
            assert.strictEqual(id, "acct_test");
            assert.deepStrictEqual(params, { include: ["identity"] });
            return {
              display_name: "Example Shop",
              identity: {
                entity_type: "company",
                business_details: {
                  address: {
                    line1: "1 High Street",
                    city: "London",
                    postal_code: "SW1A 1AA",
                    country: "gb",
                  },
                },
              },
            };
          },
        },
      },
    },
    accountSessions: {
      async create(params) {
        accountSessionCalls.push(params);
        return { client_secret: "secret_test" };
      },
    },
  };

  const readers = await terminalService.listReaders("acct_test", stripeClient);
  assert.strictEqual(readers.length, 1);
  assert.deepStrictEqual(readers[0].location, {
    id: "tml_1",
    displayName: "London",
    address: null,
    configurationOverride: null,
  });

  const createdLocation = await terminalService.ensureLocation(
    "acct_test",
    stripeClient
  );
  assert.strictEqual(createdLocation.id, "tml_created");
  assert.strictEqual(createLocationCalls[0].params.address.country, "GB");
  assert.strictEqual(createLocationCalls[0].params.metadata.terminal_enabled, "true");

  locations = [{ id: "tml_existing", display_name: "Existing" }];
  const existingLocation = await terminalService.ensureLocation(
    "acct_test",
    stripeClient
  );
  assert.strictEqual(existingLocation.id, "tml_existing");
  assert.strictEqual(createLocationCalls.length, 1);

  const missingAddressClient = {
    ...stripeClient,
    terminal: {
      ...stripeClient.terminal,
      locations: {
        ...stripeClient.terminal.locations,
        async list() {
          return { data: [] };
        },
      },
    },
    v2: {
      core: {
        accounts: {
          async retrieve() {
            return { display_name: "Incomplete", identity: {} };
          },
        },
      },
    },
  };
  await assert.rejects(
    () => terminalService.ensureLocation("acct_test", missingAddressClient),
    (error) => error.code === "location_address_required"
  );

  const reader = await terminalService.registerReader(
    {
      accountId: "acct_test",
      locationId: "tml_existing",
      label: " Counter ",
      registrationCode: "One Two Three",
    },
    stripeClient
  );
  assert.strictEqual(reader.id, "tmr_created");
  assert.deepStrictEqual(createReaderCalls[0], {
    params: {
      location: "tml_existing",
      label: "Counter",
      registration_code: "one-two-three",
    },
    options: { stripeAccount: "acct_test" },
  });

  await terminalService.createHardwareAccountSession("acct_test", stripeClient);
  assert.deepStrictEqual(accountSessionCalls[0], {
    account: "acct_test",
    components: {
      terminal_hardware_shop: { enabled: true },
      terminal_hardware_orders: { enabled: true },
    },
  });

  assert.strictEqual(
    terminalService.accountLocationDetails({ identity: {} }),
    null
  );

  console.log("terminalService tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
