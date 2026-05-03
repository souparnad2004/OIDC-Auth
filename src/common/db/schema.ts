import { pgTable, uuid, varchar,text, boolean, timestamp, pgEnum, primaryKey} from "drizzle-orm/pg-core";


export const roleEnum = pgEnum("role",["user", "admin"]);

export const users = pgTable("users", {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar().notNull(),
    email: varchar({length: 254}).unique().notNull(),
    password_hash: varchar({length: 255}).notNull(),
    role: roleEnum().default("user").notNull(),
    is_verified: boolean().default(false),
    created_at: timestamp({withTimezone: true}).defaultNow(),
    updated_at: timestamp({withTimezone: true}).defaultNow().$onUpdate(() => new Date()),
})

export const clients = pgTable("clients", {
    id: uuid().primaryKey().defaultRandom(),
    client_id:  varchar({length: 255}).notNull().unique(),
    name: varchar().notNull(),
    client_secret_hash: text(),
    redirect_uris: text().array().notNull(),
    is_confidential: boolean().default(true),
    allowed_origins: text().array(),
    created_at: timestamp({withTimezone: true}).defaultNow(),
    updated_at: timestamp({withTimezone: true}).defaultNow().$onUpdate(() => new Date())
})


export const sessions = pgTable("sessions", {
    session_id: varchar({length: 255}).primaryKey(),
    user_id: uuid().notNull().references(() => users.id),
    created_at: timestamp({withTimezone: true}).defaultNow(),
    expires_at: timestamp({withTimezone: true}).notNull(),
    last_used_at: timestamp({withTimezone: true})
})

export const authorizationCodes = pgTable("authorization_codes", {
    code: varchar("code", { length: 255 }).primaryKey(),

  client_id: varchar("client_id", { length: 255 })
    .notNull()
    .references(() => clients.client_id),

  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id),

  redirect_uri: text("redirect_uri").notNull(),

  code_challenge: text("code_challenge"),
  code_challenge_method: varchar("code_challenge_method", { length: 10 }),

  scopes: text(),
  nonce: text("nonce"),
  expires_at: timestamp("expires_at").notNull(),

  used: boolean("used").notNull().default(false),
})

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  verificationToken: text("verification_token").unique().notNull(),

  expiresAt: timestamp({ withTimezone: true }).notNull(),

  createdAt: timestamp({ withTimezone: true }).defaultNow(),
});


export const refreshTokens = pgTable("refresh_tokens", {
    id: uuid().primaryKey().defaultRandom(),
    
    token_hash: varchar({ length: 255 }).notNull().unique(),

    client_id: varchar({ length: 255 })
        .notNull()
        .references(() => clients.client_id),
    
    user_id: uuid()
        .notNull()
        .references(() => users.id),
    
    scopes: text().array(),
    created_at: timestamp({ withTimezone: true }).defaultNow(),
    expires_at: timestamp({ withTimezone: true }).notNull(),
    
    revoked_at: timestamp({ withTimezone: true }),
    
    last_used_ip: varchar({ length: 45 }),
    last_used_user_agent: text()
});

export const consents = pgTable("consents", {
    user_id: uuid("user_id").notNull(),
    client_id: varchar("client_id", { length: 255 }).notNull(),
    scopes: text("scopes").notNull(),
    granted_at: timestamp("granted_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.user_id, table.client_id] }),
  })
);