const DUE_BUCKETS = ["currently_due", "eventually_due", "past_due"];

// Normalizes a v1-shaped (webhook snapshot) or v2-shaped (Core Accounts) account
// into { chargesEnabled, payoutsEnabled, disabledReason, requirements } before
// the status rules below run, so the rest of this file reads one shape only.
function normalizeAccount(account) {
  if (account.object === "v2.core.account") {
    return normalizeV2Account(account);
  }
  return normalizeV1Account(account);
}

function normalizeV1Account(account) {
  const requirements = account.requirements || {};
  return {
    chargesEnabled: account.charges_enabled || false,
    payoutsEnabled: account.payouts_enabled || false,
    detailsSubmitted: account.details_submitted || false,
    disabledReason: requirements.disabled_reason || null,
    requirements: {
      currently_due: requirements.currently_due || [],
      eventually_due: requirements.eventually_due || [],
      past_due: requirements.past_due || [],
      pending_verification: requirements.pending_verification || [],
    },
  };
}

function normalizeV2Account(account) {
  const merchant = (account.configuration && account.configuration.merchant) || {};
  const capabilities = merchant.capabilities || {};
  const cardPayments = capabilities.card_payments;
  const payouts = capabilities.stripe_balance && capabilities.stripe_balance.payouts;

  const chargesEnabled = Boolean(cardPayments && cardPayments.status === "active");
  const payoutsEnabled = Boolean(payouts && payouts.status === "active");
  const capabilityStatuses = [cardPayments, payouts]
    .filter(Boolean)
    .map((capability) => capability.status);
  const capabilitiesPending =
    capabilityStatuses.length === 2 &&
    capabilityStatuses.includes("pending") &&
    capabilityStatuses.every((status) => status === "active" || status === "pending");

  // v2 reports disablement per-capability via status_details[].code (e.g.
  // "requirements_past_due", "rejected_fraud") rather than a single
  // account-level disabled_reason like v1 — pick the first rejection we see.
  const statusDetails = [
    ...((cardPayments && cardPayments.status_details) || []),
    ...((payouts && payouts.status_details) || []),
  ];
  const rejectedDetail = statusDetails.find((d) => d.code && d.code.startsWith("rejected"));
  const disabledReason = rejectedDetail ? rejectedDetail.code.replace("_", ".") : null;

  const requirements = {
    currently_due: [],
    eventually_due: [],
    past_due: [],
    pending_verification: [],
  };

  const entries = (account.requirements && account.requirements.entries) || [];
  for (const entry of entries) {
    const deadlineStatus = entry.minimum_deadline && entry.minimum_deadline.status;
    // "stripe" means the user already provided this and Stripe is verifying it —
    // the v2 equivalent of v1's pending_verification, regardless of deadline.
    if (entry.awaiting_action_from === "stripe") {
      requirements.pending_verification.push(entry.description);
    } else if (DUE_BUCKETS.includes(deadlineStatus)) {
      requirements[deadlineStatus].push(entry.description);
    } else {
      requirements.pending_verification.push(entry.description);
    }
  }

  // v1's details_submitted ~ "nothing outstanding is still waiting on the user" —
  // v2 doesn't have the field directly, so derive it from the same entries.
  const detailsSubmitted = !entries.some(
    (entry) => entry.awaiting_action_from === "user"
  );

  return {
    chargesEnabled,
    payoutsEnabled,
    capabilitiesPending,
    detailsSubmitted,
    disabledReason,
    requirements,
  };
}

// Account status derivation logic based on requirements
function deriveAccountStatus(account) {
  const {
    chargesEnabled,
    payoutsEnabled,
    capabilitiesPending = false,
    disabledReason,
    requirements,
  } = normalizeAccount(account);
  const hasRequirements = Object.values(requirements).some(
    (entries) => entries.length > 0
  );

  // Check if account is rejected
  if (disabledReason && disabledReason.includes("rejected")) {
    return {
      status: "Rejected",
      description: "The platform or Stripe has rejected the merchant account",
      capabilities: {
        payouts_enabled: false,
        charges_enabled: false,
      },
      requirements,
    };
  }

  // Both payouts and charges enabled
  if (payoutsEnabled && chargesEnabled) {
    if (requirements.pending_verification.length > 0) {
      return {
        status: "Pending",
        badge: "Enabled",
        description:
          "The account is currently being reviewed by Stripe; payouts and charges are enabled",
        capabilities: {
          payouts_enabled: true,
          charges_enabled: true,
        },
        requirements,
      };
    } else if (
      !disabledReason &&
      requirements.past_due.length === 0 &&
      requirements.currently_due.length === 0
    ) {
      return {
        status: "Enabled",
        description: "Account is in good standing",
        capabilities: {
          payouts_enabled: true,
          charges_enabled: true,
        },
        requirements,
      };
    } else {
      return {
        status: "Restricted",
        description:
          "The account has pay-ins or payouts disabled and requires additional information",
        capabilities: {
          payouts_enabled: payoutsEnabled,
          charges_enabled: chargesEnabled,
        },
        requirements,
      };
    }
  }
  // Only payouts enabled with currently due requirements
  else if (payoutsEnabled && requirements.currently_due.length > 0) {
    return {
      status: "Restricted Soon",
      description:
        "The merchant account has a due date for providing certain information",
      capabilities: {
        payouts_enabled: true,
        charges_enabled: false,
      },
      requirements,
    };
  }
  // Pending verification with disabled capabilities
  else if (requirements.pending_verification.length > 0) {
    return {
      status: "Pending",
      badge: "Disabled",
      description:
        "The account is currently being reviewed by Stripe; payouts and charges are disabled",
      capabilities: {
        payouts_enabled: false,
        charges_enabled: false,
      },
      requirements,
    };
  }
  // V2 capabilities can remain pending briefly after onboarding has collected
  // everything, while Stripe finishes activating them. This is not a request
  // for more information from the account holder.
  else if (capabilitiesPending && !hasRequirements) {
    return {
      status: "Pending",
      badge: "Disabled",
      description:
        "The account is currently being reviewed by Stripe; payouts and charges are disabled",
      capabilities: {
        payouts_enabled: payoutsEnabled,
        charges_enabled: chargesEnabled,
      },
      requirements,
    };
  }
  // Default to restricted
  else {
    return {
      status: "Restricted",
      description:
        "The account has pay-ins or payouts disabled and requires additional information",
      capabilities: {
        payouts_enabled: payoutsEnabled,
        charges_enabled: chargesEnabled,
      },
      requirements,
    };
  }
}

module.exports = {
  deriveAccountStatus,
  normalizeAccount,
};
