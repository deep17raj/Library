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
  return { users, ...platformUserFunctions(users), ...libraryUserFunctions(users) };
}

/** The unscoped functions (auth, platform). */
function platformUserFunctions(users) {
  const all = () => [...users.values()];
  return {
    findUserByEmail: async (db, email) => all().find((u) => u.email === email) || null,
    findUserById: async (db, id) => users.get(id) || null,
    listUsersOfLibrary: async (db, tenantId) => all().filter((u) => u.tenantId === tenantId),
    countUsersWithRole: async (db, role) => all().filter((u) => u.role === role).length,
    insertUser: async (db, user) => {
      const defaults = { permissions: [], status: "active", tokenVersion: 0, library: null };
      users.set(user.id, { ...defaults, ...user });
    },
    touchLastLogin: async () => {},
    updatePassword: async (db, id, passwordHash) => {
      Object.assign(users.get(id), { passwordHash });
      users.get(id).tokenVersion += 1;
    },
    updateUserStatus: async (db, id, status) => {
      Object.assign(users.get(id), { status });
      users.get(id).tokenVersion += 1;
      return true;
    },
  };
}

/** The tenant-scoped functions (staff); like the SQL, they ignore other libraries' rows. */
function libraryUserFunctions(users) {
  const inLibrary = (tenantId, id) => {
    const user = users.get(id);
    return user && user.tenantId === tenantId ? user : null;
  };
  const changeAndSignOut = (tenantId, id, changes) => {
    const user = inLibrary(tenantId, id);
    if (!user) return;
    Object.assign(user, changes);
    user.tokenVersion += 1;
  };
  return {
    findLibraryUser: async (db, tenantId, id) => inLibrary(tenantId, id),
    updateLibraryUserProfile: async (db, tenantId, id, { name, permissions }) => {
      const user = inLibrary(tenantId, id);
      if (user && name) user.name = name;
      if (user && permissions) user.permissions = permissions;
    },
    setLibraryUserStatus: async (db, tenantId, id, status) =>
      changeAndSignOut(tenantId, id, { status }),
    setLibraryUserPassword: async (db, tenantId, id, passwordHash) =>
      changeAndSignOut(tenantId, id, { passwordHash }),
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
    storageDir: "",
    cronSecret: "test-cron-secret",
    db: {},
    auth: {
      jwtSecret: "test-secret-that-is-long-enough-for-hs256",
      staffCookie: "sl_staff",
      cookieSecure: false,
      staffTokenTtlSeconds: 3600,
      studentCookie: "sl_student",
      studentTokenTtlSeconds: 3600,
    },
    superAdmin: { email: "", password: "", name: "Platform Owner" },
    ...overrides,
  };
}
