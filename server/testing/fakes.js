// In-memory stand-ins so service rules can be tested without MySQL.

/** A pool whose transactions do nothing — fakes below keep state in memory. */
export function fakeDb() {
  const connection = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
  };
  return { getConnection: async () => connection, query: async () => [[]] };
}

/** Mirrors modules/auth/users.repository.js. */
export function fakeUsersRepository(initial = []) {
  const users = new Map(initial.map((user) => [user.id, { ...user }]));
  return {
    users,
    findUserByEmail: async (db, email) =>
      [...users.values()].find((u) => u.email === email) || null,
    findUserById: async (db, id) => users.get(id) || null,
    listUsersOfLibrary: async (db, tenantId) =>
      [...users.values()].filter((u) => u.tenantId === tenantId),
    countUsersWithRole: async (db, role) =>
      [...users.values()].filter((u) => u.role === role).length,
    insertUser: async (db, user) => {
      users.set(user.id, {
        permissions: [],
        status: "active",
        tokenVersion: 0,
        library: null,
        ...user,
      });
    },
    touchLastLogin: async () => {},
    updatePassword: async (db, id, passwordHash) => {
      const user = users.get(id);
      user.passwordHash = passwordHash;
      user.tokenVersion += 1;
    },
    updateUserStatus: async (db, id, status) => {
      const user = users.get(id);
      user.status = status;
      user.tokenVersion += 1;
      return true;
    },
  };
}

export function fakeAudit() {
  const entries = [];
  return { entries, recordAudit: async (db, entry) => entries.push(entry) };
}

export function testConfig(overrides = {}) {
  return {
    isProduction: false,
    listenTarget: "0",
    appBaseUrl: "",
    trustProxy: false,
    db: {},
    auth: {
      jwtSecret: "test-secret-that-is-long-enough-for-hs256",
      staffCookie: "sl_staff",
      cookieSecure: false,
      staffTokenTtlSeconds: 3600,
    },
    superAdmin: { email: "", password: "", name: "Platform Owner" },
    ...overrides,
  };
}
