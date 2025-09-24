/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as http from "../http.js";
import type * as projects from "../projects.js";
import type * as requestStatuses from "../requestStatuses.js";
import type * as requests from "../requests.js";
import type * as services_queries_projects_getProjectById from "../services/queries/projects/getProjectById.js";
import type * as services_queries_status_getStatusById from "../services/queries/status/getStatusById.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  http: typeof http;
  projects: typeof projects;
  requestStatuses: typeof requestStatuses;
  requests: typeof requests;
  "services/queries/projects/getProjectById": typeof services_queries_projects_getProjectById;
  "services/queries/status/getStatusById": typeof services_queries_status_getStatusById;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
