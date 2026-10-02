/**
 * Profile Generator Service
 * Generates realistic customer profiles on the fly for demo purposes
 */

const { getMarket } = require("../config/markets");

// Base data for generating realistic profiles
const FIRST_NAMES = [
  "James",
  "Mary",
  "Robert",
  "Patricia",
  "John",
  "Jennifer",
  "Michael",
  "Linda",
  "David",
  "Elizabeth",
  "William",
  "Barbara",
  "Richard",
  "Susan",
  "Joseph",
  "Jessica",
  "Thomas",
  "Sarah",
  "Christopher",
  "Karen",
  "Charles",
  "Nancy",
  "Daniel",
  "Lisa",
  "Matthew",
  "Betty",
  "Anthony",
  "Helen",
  "Mark",
  "Sandra",
  "Donald",
  "Donna",
  "Steven",
  "Carol",
  "Paul",
  "Ruth",
  "Andrew",
  "Sharon",
  "Joshua",
  "Michelle",
  "Kenneth",
  "Laura",
  "Kevin",
  "Sarah",
  "Brian",
  "Kimberly",
  "George",
  "Deborah",
  "Timothy",
  "Dorothy",
  "Ronald",
  "Lisa",
  "Jason",
  "Nancy",
  "Edward",
  "Karen",
];

const LAST_NAMES = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Ramirez",
  "Lewis",
  "Robinson",
  "Walker",
  "Young",
  "Allen",
  "King",
  "Wright",
  "Scott",
  "Torres",
  "Nguyen",
  "Hill",
  "Flores",
  "Green",
  "Adams",
  "Nelson",
  "Baker",
  "Hall",
  "Rivera",
  "Campbell",
  "Mitchell",
  "Carter",
  "Roberts",
  "Gomez",
  "Phillips",
  "Evans",
  "Turner",
  "Diaz",
  "Parker",
];

const BUSINESS_TYPES = [
  "Consulting",
  "Services",
  "Solutions",
  "Technologies",
  "Systems",
  "Group",
  "Associates",
  "Partners",
  "Enterprises",
  "Industries",
  "Corporation",
  "Company",
  "Agency",
  "Studio",
  "Workshop",
  "Collective",
  "Network",
  "Alliance",
];

const BUSINESS_DESCRIPTORS = [
  "Digital",
  "Creative",
  "Professional",
  "Strategic",
  "Innovative",
  "Global",
  "Premium",
  "Elite",
  "Advanced",
  "Modern",
  "Expert",
  "Specialized",
  "Integrated",
  "Dynamic",
  "Comprehensive",
  "Custom",
  "Smart",
  "Efficient",
];

const INDUSTRY_TYPES = [
  {
    name: "Technology",
    mcc: "5734",
    description: "Software development and IT services",
  },
  {
    name: "Marketing",
    mcc: "7311",
    description: "Digital marketing and advertising services",
  },
  {
    name: "Consulting",
    mcc: "7392",
    description: "Business and management consulting",
  },
  {
    name: "Design",
    mcc: "7399",
    description: "Graphic design and creative services",
  },
  {
    name: "Legal",
    mcc: "8111",
    description: "Legal services and representation",
  },
  {
    name: "Healthcare",
    mcc: "8011",
    description: "Healthcare and medical services",
  },
  {
    name: "Education",
    mcc: "8220",
    description: "Educational services and training",
  },
  {
    name: "Finance",
    mcc: "6211",
    description: "Financial planning and advisory services",
  },
  {
    name: "Real Estate",
    mcc: "6513",
    description: "Real estate services and property management",
  },
  { name: "Retail", mcc: "5999", description: "Retail sales and merchandise" },
];

const COMPANY_SUFFIXES = [
  "Ltd",
  "LLC",
  "Inc",
  "Corp",
  "Group",
  "Associates",
  "Partners",
];

// Fixed data that won't change (only names will be randomized)
const FIXED_DATA = {
  individual: {
    phone: "+44 7400123456",
    address: {
      line1: "123 Demo Street",
      city: "London",
      postal_code: "SW1A 1AA",
      country: "GB",
    },
    dob: { day: 15, month: 6, year: 1985 },
    industry: {
      name: "Technology",
      mcc: "5734",
      description: "Software development and IT services",
    },
    product_description:
      "Professional software development and IT services for businesses and individuals",
  },
  company: {
    phone: "+44 7400123456",
    address: {
      line1: "456 Business Park",
      city: "Manchester",
      postal_code: "M1 1AA",
      country: "GB",
    },
    tax_id: "12345678",
    industry: {
      name: "Technology",
      mcc: "5734",
      description: "Software development and IT services",
    },
    representatives: {
      dob: { day: 20, month: 3, year: 1980 },
      phone: "+44 7400123456",
      titles: ["CEO", "Director", "CFO"],
      ownership_percentages: [50, 30, 20],
    },
    product_description:
      "Software development and IT services with focus on quality and customer satisfaction",
  },
};

const UK_CITIES = [
  { name: "London", postalPrefix: "SW", country: "GB" },
  { name: "Manchester", postalPrefix: "M", country: "GB" },
  { name: "Birmingham", postalPrefix: "B", country: "GB" },
  { name: "Leeds", postalPrefix: "LS", country: "GB" },
  { name: "Glasgow", postalPrefix: "G", country: "GB" },
  { name: "Liverpool", postalPrefix: "L", country: "GB" },
  { name: "Bristol", postalPrefix: "BS", country: "GB" },
  { name: "Edinburgh", postalPrefix: "EH", country: "GB" },
  { name: "Cardiff", postalPrefix: "CF", country: "GB" },
  { name: "Sheffield", postalPrefix: "S", country: "GB" },
];

const STREET_NAMES = [
  "High Street",
  "Church Lane",
  "Main Street",
  "Park Road",
  "Church Street",
  "Victoria Road",
  "Green Lane",
  "Manor Road",
  "Church Road",
  "Park Lane",
  "Victoria Street",
  "Queens Road",
  "New Road",
  "Grosvenor Road",
  "Kings Road",
  "Mill Lane",
  "Station Road",
  "York Road",
  "London Road",
  "Windsor Road",
];

/**
 * Generate a random selection from an array
 */
function randomSelection(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate a random number within a range
 */
function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate an email address using firstname.lastname@business-name.com pattern
 */
function generateEmailForBusiness(firstName, lastName, businessName) {
  const cleanBusinessName = businessName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 20);
  const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  return `${username}@${cleanBusinessName}.com`;
}

/**
 * Generate a business name
 */
function generateBusinessName(firstName, lastName) {
  const usePersonalName = Math.random() < 0.3; // 30% chance to use personal name

  if (usePersonalName) {
    const type = randomSelection(BUSINESS_TYPES);
    return `${firstName} ${lastName} ${type}`;
  } else {
    const descriptor = randomSelection(BUSINESS_DESCRIPTORS);
    const type = randomSelection(BUSINESS_TYPES);
    return `${descriptor} ${type}`;
  }
}

/**
 * Generate a company name
 */
function generateCompanyName() {
  const descriptor = randomSelection(BUSINESS_DESCRIPTORS);
  const industry = randomSelection(INDUSTRY_TYPES);
  const suffix = randomSelection(COMPANY_SUFFIXES);

  const patterns = [
    `${descriptor} ${industry.name} ${suffix}`,
    `${industry.name} ${descriptor} ${suffix}`,
    `${descriptor} ${suffix}`,
    `${industry.name} ${suffix}`,
  ];

  return randomSelection(patterns);
}

/**
 * Generate a website URL
 */
function generateWebsite(name, suffix = "co.uk") {
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "")
    .substring(0, 20);
  return `https://${cleanName}.${suffix}`;
}

/**
 * Generate an individual customer profile
 */
function generateIndividualProfile(marketCode = "gb") {
  const market = getMarket(marketCode);
  const firstName = randomSelection(FIRST_NAMES);
  const lastName = randomSelection(LAST_NAMES);
  const businessName = generateBusinessName(firstName, lastName);

  return {
    firstName,
    lastName,
    email: generateEmailForBusiness(firstName, lastName, businessName),
    phone: market.profile.phone,
    dob: FIXED_DATA.individual.dob,
    address: market.profile.individualAddress,
    businessName,
    website: generateWebsite(businessName, market.websiteSuffix),
    product_description: FIXED_DATA.individual.product_description,
  };
}

/**
 * Generate a company customer profile
 */
function generateCompanyProfile(marketCode = "gb") {
  const market = getMarket(marketCode);
  const companyName = generateCompanyName();

  const companyDomain =
    companyName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 15) + `.${market.websiteSuffix}`;

  // Generate fixed number of representatives (3) with fixed roles
  const representatives = [];
  const usedNames = new Set();

  for (let i = 0; i < 3; i++) {
    let repFirstName, repLastName, nameKey;

    // Ensure unique names
    do {
      repFirstName = randomSelection(FIRST_NAMES);
      repLastName = randomSelection(LAST_NAMES);
      nameKey = `${repFirstName}_${repLastName}`;
    } while (usedNames.has(nameKey));

    usedNames.add(nameKey);

    const isMainRep = i === 0; // First representative is the main one

    representatives.push({
      firstName: repFirstName,
      lastName: repLastName,
      email: `${repFirstName.toLowerCase()}.${repLastName.toLowerCase()}@${companyDomain}`,
      phone: market.profile.phone,
      dob: FIXED_DATA.company.representatives.dob,
      address: market.profile.companyAddress,
      title: FIXED_DATA.company.representatives.titles[i],
      relationship: {
        representative: isMainRep, // Only first rep is the main representative
        director: true,
        executive: i < 2, // First 2 are executives
        owner: true,
        percent_ownership:
          FIXED_DATA.company.representatives.ownership_percentages[i],
        title: isMainRep ? "Director" : "Owner",
      },
    });
  }

  return {
    name: companyName,
    email: `info@${companyDomain}`,
    phone: market.profile.phone,
    tax_id: market.profile.companyId,
    address: market.profile.companyAddress,
    representatives, // Use array instead of single representative
    representative: representatives[0], // Keep backward compatibility
    mcc: FIXED_DATA.company.industry.mcc,
    url: `https://${companyDomain}`,
    product_description: FIXED_DATA.company.product_description,
  };
}

/**
 * Generate profiles based on type
 */
function generateProfile(type, marketCode = "gb") {
  switch (type) {
    case "individual":
      return generateIndividualProfile(marketCode);
    case "company":
      return generateCompanyProfile(marketCode);
    default:
      throw new Error(
        'Invalid profile type. Must be "individual" or "company"'
      );
  }
}

/**
 * Generate multiple profiles
 */
function generateProfiles(count = 1, type = "individual", marketCode = "gb") {
  const profiles = [];
  for (let i = 0; i < count; i++) {
    profiles.push(generateProfile(type, marketCode));
  }
  return profiles;
}

module.exports = {
  generateProfile,
  generateProfiles,
  generateIndividualProfile,
  generateCompanyProfile,
};
