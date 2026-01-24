// Test data fixtures for E2E tests
export const testUsers = {
  newUser: {
    email: `test-${Date.now()}@example.com`,
    password: "TestPassword123!",
    displayName: "Test User",
  },
  existingUser: {
    email: "existing@example.com",
    password: "ExistingPass123!",
    displayName: "Existing User",
  },
  collaborator: {
    email: `collaborator-${Date.now()}@example.com`,
    password: "CollaboratorPass123!",
    displayName: "Collaborator User",
  },
};

export const testSchools = {
  school1: {
    name: "Duke Blue Devils",
    location: "Durham, NC",
    division: "D1",
    conference: "ACC",
    website: "https://goduke.com",
    status: "interested",
  },
  school2: {
    name: "Boston College",
    location: "Boston, MA",
    division: "D1",
    conference: "ACC",
    website: "https://bceagles.com",
    status: "researching",
  },
  school3: {
    name: "MIT Baseball",
    location: "Cambridge, MA",
    division: "D3",
    conference: "NEWMAC",
    website: "https://mitathletics.com",
    status: "contacted",
  },
};

export const testCoaches = {
  coach1: {
    firstName: "Coach",
    lastName: "Smith",
    role: "Head Coach",
    email: "smith@goduke.com",
    phone: "919-555-0001",
  },
  coach2: {
    firstName: "Assistant",
    lastName: "Johnson",
    role: "Assistant Coach",
    email: "johnson@goduke.com",
    phone: "919-555-0002",
  },
  coach3: {
    firstName: "Pitching",
    lastName: "Coach",
    role: "Pitching Coach",
    email: "pitching@bceagles.com",
    phone: "617-555-0001",
  },
};

export const testInteractions = {
  interaction1: {
    type: "Email",
    direction: "Outbound",
    subject: "Recruiting Inquiry",
    content: "Interested in your baseball program",
    sentiment: "Positive",
  },
  interaction2: {
    type: "Phone Call",
    direction: "Inbound",
    content: "Coach followed up about commitment",
    sentiment: "Positive",
  },
  interaction3: {
    type: "In Person Visit",
    direction: "Outbound",
    content: "Visited campus for recruiter day",
    sentiment: "Very Positive",
  },
};

export const testOffers = {
  fullRide: {
    type: "Full Ride",
    scholarshipAmount: 50000,
    scholarshipPercentage: 100,
    conditions: "Maintain 3.0 GPA",
    deadline: 30, // days from now
  },
  partial: {
    type: "Partial",
    scholarshipAmount: 25000,
    scholarshipPercentage: 50,
    conditions: "Maintain 2.5 GPA",
    deadline: 45,
  },
  walkOn: {
    type: "Walk-On",
    scholarshipAmount: 0,
    scholarshipPercentage: 0,
    conditions: "Open",
    deadline: null,
  },
};

export const testPerformanceMetrics = {
  metric1: {
    type: "Velocity",
    value: 92,
    unit: "mph",
    date: new Date().toISOString().split("T")[0],
  },
  metric2: {
    type: "Exit Velo",
    value: 88,
    unit: "mph",
    date: new Date().toISOString().split("T")[0],
  },
  metric3: {
    type: "60 Yard Dash",
    value: 6.8,
    unit: "sec",
    date: new Date().toISOString().split("T")[0],
  },
  metric4: {
    type: "Batting Average",
    value: 0.325,
    unit: "avg",
    date: new Date().toISOString().split("T")[0],
  },
};

export const testErrorScenarios = {
  invalidEmail: "not-an-email",
  weakPassword: "weak",
  emptySchoolName: "",
  futureDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0],
  pastDeadline: new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0],
};

export const testTimeouts = {
  short: 5000,
  medium: 15000,
  long: 30000,
};

export const apiBaseUrl = process.env.API_URL || "http://localhost:3000";
export const appBaseUrl = process.env.APP_URL || "http://localhost:3000";
