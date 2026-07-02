/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as apiKeys from "../apiKeys.js";
import type * as changelogEntries from "../changelogEntries.js";
import type * as complaintCases from "../complaintCases.js";
import type * as emailNotifications from "../emailNotifications.js";
import type * as http from "../http.js";
import type * as lib_apiKeys from "../lib/apiKeys.js";
import type * as lib_authorization from "../lib/authorization.js";
import type * as lib_notificationEventTypes from "../lib/notificationEventTypes.js";
import type * as lib_notificationTokens from "../lib/notificationTokens.js";
import type * as lib_notificationTypes from "../lib/notificationTypes.js";
import type * as lib_projectChangelog from "../lib/projectChangelog.js";
import type * as lib_projectKeyAuthorization from "../lib/projectKeyAuthorization.js";
import type * as lib_projectPublic from "../lib/projectPublic.js";
import type * as lib_projectSlug from "../lib/projectSlug.js";
import type * as lib_publicErrors from "../lib/publicErrors.js";
import type * as lib_requestInput from "../lib/requestInput.js";
import type * as lib_requestIntake from "../lib/requestIntake.js";
import type * as lib_requestKind from "../lib/requestKind.js";
import type * as lib_requestOverviewReadModel from "../lib/requestOverviewReadModel.js";
import type * as lib_requestStatusStarterData from "../lib/requestStatusStarterData.js";
import type * as lib_requestStatusWorkflow from "../lib/requestStatusWorkflow.js";
import type * as lib_requesterIdentity from "../lib/requesterIdentity.js";
import type * as lib_suggestionPortalReadModel from "../lib/suggestionPortalReadModel.js";
import type * as notificationConnectors from "../notificationConnectors.js";
import type * as notificationEvents from "../notificationEvents.js";
import type * as projects from "../projects.js";
import type * as rateLimits from "../rateLimits.js";
import type * as requestComments from "../requestComments.js";
import type * as requestStatuses from "../requestStatuses.js";
import type * as requestUpvotes from "../requestUpvotes.js";
import type * as requests from "../requests.js";
import type * as services_queries_projects_getProjectById from "../services/queries/projects/getProjectById.js";
import type * as services_queries_status_getStatusById from "../services/queries/status/getStatusById.js";
import type * as stats from "../stats.js";
import type * as suggestionPortals from "../suggestionPortals.js";
import type * as telegramBot from "../telegramBot.js";
import type * as telegramNotifications from "../telegramNotifications.js";
import type * as users from "../users.js";
import type * as waitlist from "../waitlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  apiKeys: typeof apiKeys;
  changelogEntries: typeof changelogEntries;
  complaintCases: typeof complaintCases;
  emailNotifications: typeof emailNotifications;
  http: typeof http;
  "lib/apiKeys": typeof lib_apiKeys;
  "lib/authorization": typeof lib_authorization;
  "lib/notificationEventTypes": typeof lib_notificationEventTypes;
  "lib/notificationTokens": typeof lib_notificationTokens;
  "lib/notificationTypes": typeof lib_notificationTypes;
  "lib/projectChangelog": typeof lib_projectChangelog;
  "lib/projectKeyAuthorization": typeof lib_projectKeyAuthorization;
  "lib/projectPublic": typeof lib_projectPublic;
  "lib/projectSlug": typeof lib_projectSlug;
  "lib/publicErrors": typeof lib_publicErrors;
  "lib/requestInput": typeof lib_requestInput;
  "lib/requestIntake": typeof lib_requestIntake;
  "lib/requestKind": typeof lib_requestKind;
  "lib/requestOverviewReadModel": typeof lib_requestOverviewReadModel;
  "lib/requestStatusStarterData": typeof lib_requestStatusStarterData;
  "lib/requestStatusWorkflow": typeof lib_requestStatusWorkflow;
  "lib/requesterIdentity": typeof lib_requesterIdentity;
  "lib/suggestionPortalReadModel": typeof lib_suggestionPortalReadModel;
  notificationConnectors: typeof notificationConnectors;
  notificationEvents: typeof notificationEvents;
  projects: typeof projects;
  rateLimits: typeof rateLimits;
  requestComments: typeof requestComments;
  requestStatuses: typeof requestStatuses;
  requestUpvotes: typeof requestUpvotes;
  requests: typeof requests;
  "services/queries/projects/getProjectById": typeof services_queries_projects_getProjectById;
  "services/queries/status/getStatusById": typeof services_queries_status_getStatusById;
  stats: typeof stats;
  suggestionPortals: typeof suggestionPortals;
  telegramBot: typeof telegramBot;
  telegramNotifications: typeof telegramNotifications;
  users: typeof users;
  waitlist: typeof waitlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
