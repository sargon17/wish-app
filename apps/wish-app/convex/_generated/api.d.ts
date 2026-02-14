/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as http from "../http.js";
import type * as lib_apiKeys from "../lib/apiKeys.js";
import type * as lib_authorization from "../lib/authorization.js";
import type * as lib_projectPublic from "../lib/projectPublic.js";
import type * as projects from "../projects.js";
import type * as requestComments from "../requestComments.js";
import type * as requestStatuses from "../requestStatuses.js";
import type * as requestUpvotes from "../requestUpvotes.js";
import type * as requests from "../requests.js";
import type * as services_queries_projects_getProjectById from "../services/queries/projects/getProjectById.js";
import type * as services_queries_status_getStatusById from "../services/queries/status/getStatusById.js";
import type * as stats from "../stats.js";
import type * as users from "../users.js";
import type * as waitlist from "../waitlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  http: typeof http;
  "lib/apiKeys": typeof lib_apiKeys;
  "lib/authorization": typeof lib_authorization;
  "lib/projectPublic": typeof lib_projectPublic;
  projects: typeof projects;
  requestComments: typeof requestComments;
  requestStatuses: typeof requestStatuses;
  requestUpvotes: typeof requestUpvotes;
  requests: typeof requests;
  "services/queries/projects/getProjectById": typeof services_queries_projects_getProjectById;
  "services/queries/status/getStatusById": typeof services_queries_status_getStatusById;
  stats: typeof stats;
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
