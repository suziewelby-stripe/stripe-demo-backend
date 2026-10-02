const stripe = require("../config/stripe");

const TERMINAL_PREVIEW_API_VERSION =
  "2026-09-30.preview; embedded_connect_beta=v2;";

function locationSummary(location) {
  return {
    id: location.id,
    displayName: location.display_name || location.id,
    address: location.address || null,
    configurationOverride: location.configuration_overrides || null,
  };
}

function readerSummary(reader) {
  const location = reader.location;
  return {
    id: reader.id,
    label: reader.label || reader.id,
    status: reader.status || "unknown",
    deviceType: reader.device_type || "unknown",
    serialNumber: reader.serial_number || null,
    lastSeenAt: reader.last_seen_at || null,
    location:
      location && typeof location === "object"
        ? locationSummary(location)
        : location
          ? { id: location, displayName: location }
          : null,
  };
}

function normalizeRegistrationCode(value) {
  const trimmed = String(value || "").trim().toLowerCase();
  if (/^simulated-[a-z0-9-]+$/.test(trimmed)) {
    return trimmed;
  }

  const words = trimmed.split(/[\s-]+/).filter(Boolean);
  if (words.length !== 3 || words.some((word) => !/^[a-z0-9]+$/.test(word))) {
    return null;
  }
  return words.join("-");
}

function accountLocationDetails(account) {
  const identity = account.identity || {};
  const businessDetails = identity.business_details || {};
  const individual = identity.individual || {};
  const address =
    businessDetails.address ||
    businessDetails.registered_address ||
    individual.address ||
    individual.registered_address ||
    null;

  if (
    !address ||
    !address.line1 ||
    !address.city ||
    !address.postal_code ||
    !address.country
  ) {
    return null;
  }

  return {
    displayName: account.display_name || "Business Location",
    address: {
      line1: address.line1,
      line2: address.line2 || undefined,
      city: address.city,
      state: address.state || undefined,
      postal_code: address.postal_code,
      country: address.country.toUpperCase(),
    },
  };
}

/**
 * Create a default location for a connected account
 * @param {string} accountId - The account ID
 * @returns {Promise<object>} - Created location object
 */
async function createDefaultLocation(accountId, stripeClient = stripe) {
  try {
    const location = await stripeClient.terminal.locations.create(
      {
        display_name: "Business Location",
        address: {
          line1: "123 Business Street",
          city: "London",
          country: "GB",
          postal_code: "SW1A 1AA",
        },
      },
      {
        stripeAccount: accountId,
      }
    );

    console.info(
      `INFO: Created default location for account ${accountId}: ${location.id}`
    );
    return location;
  } catch (error) {
    console.error(
      `ERROR: Failed to create location for account ${accountId}: ${error.message}`
    );
    throw error;
  }
}

/**
 * Get locations for a connected account
 * @param {string} accountId - The account ID
 * @returns {Promise<object>} - List of locations
 */
async function getLocations(accountId, stripeClient = stripe) {
  const locations = await stripeClient.terminal.locations.list(
    {},
    {
      stripeAccount: accountId,
    }
  );

  return locations.data;
}

async function listLocationSummaries(accountId, stripeClient = stripe) {
  const locations = await getLocations(accountId, stripeClient);
  return locations.map(locationSummary);
}

async function ensureLocation(accountId, stripeClient = stripe) {
  const locations = await getLocations(accountId, stripeClient);
  if (locations.length > 0) {
    return locationSummary(locations[0]);
  }

  const account = await stripeClient.v2.core.accounts.retrieve(accountId, {
    include: ["identity"],
  });
  const details = accountLocationDetails(account);
  if (!details) {
    const error = new Error(
      "A complete business address is required before a Terminal location can be created"
    );
    error.code = "location_address_required";
    throw error;
  }

  const location = await stripeClient.terminal.locations.create(
    {
      display_name: details.displayName,
      address: details.address,
      metadata: {
        created_by: "bank_demo",
        terminal_enabled: "true",
      },
    },
    { stripeAccount: accountId }
  );
  return locationSummary(location);
}

async function listReaders(accountId, stripeClient = stripe) {
  const readerList = stripeClient.terminal.readers.list(
    { limit: 100, expand: ["data.location"] },
    { stripeAccount: accountId }
  );
  const readers = readerList.autoPagingToArray
    ? await readerList.autoPagingToArray({ limit: 100 })
    : (await readerList).data || [];

  return readers
    .filter((reader) => reader.device_type !== "mobile_phone_reader")
    .map(readerSummary);
}

async function registerReader(
  { accountId, locationId, label, registrationCode },
  stripeClient = stripe
) {
  const normalizedCode = normalizeRegistrationCode(registrationCode);
  if (!normalizedCode) {
    const error = new Error(
      "Registration code must contain three words separated by spaces or hyphens"
    );
    error.code = "invalid_registration_code";
    throw error;
  }

  const reader = await stripeClient.terminal.readers.create(
    {
      location: locationId,
      label: String(label).trim(),
      registration_code: normalizedCode,
    },
    { stripeAccount: accountId }
  );
  return readerSummary(reader);
}

async function createHardwareAccountSession(accountId, stripeClient) {
  const client =
    stripeClient ||
    require("stripe")(process.env.STRIPE_SECRET_KEY, {
      apiVersion: TERMINAL_PREVIEW_API_VERSION,
    });
  return client.accountSessions.create({
    account: accountId,
    components: {
      terminal_hardware_shop: { enabled: true },
      terminal_hardware_orders: { enabled: true },
    },
  });
}

/**
 * Create connection token for Terminal SDK
 * @param {string} accountId - The account ID
 * @returns {Promise<object>} - Connection token object
 */
async function createConnectionToken(accountId) {
  const connectionToken = await stripe.terminal.connectionTokens.create(
    {},
    {
      stripeAccount: accountId, // Create connection token for the connected account
    }
  );

  return connectionToken;
}

module.exports = {
  TERMINAL_PREVIEW_API_VERSION,
  createDefaultLocation,
  getLocations,
  listLocationSummaries,
  ensureLocation,
  listReaders,
  registerReader,
  createHardwareAccountSession,
  createConnectionToken,
  locationSummary,
  readerSummary,
  normalizeRegistrationCode,
  accountLocationDetails,
};
