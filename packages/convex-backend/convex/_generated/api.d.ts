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
import type * as crons from "../crons.js";
import type * as githubWorkItemHandoffs from "../githubWorkItemHandoffs.js";
import type * as githubWorkTrackerCleanup from "../githubWorkTrackerCleanup.js";
import type * as githubWorkTrackerConnections from "../githubWorkTrackerConnections.js";
import type * as githubWorkTrackerOAuth from "../githubWorkTrackerOAuth.js";
import type * as githubWorkTrackerSettings from "../githubWorkTrackerSettings.js";
import type * as githubWorkTrackerWebhooks from "../githubWorkTrackerWebhooks.js";
import type * as http from "../http.js";
import type * as lib_apiKeys from "../lib/apiKeys.js";
import type * as lib_authorization from "../lib/authorization.js";
import type * as lib_changelogIntake from "../lib/changelogIntake.js";
import type * as lib_githubApp from "../lib/githubApp.js";
import type * as lib_githubConnection from "../lib/githubConnection.js";
import type * as lib_githubHandoffDelivery from "../lib/githubHandoffDelivery.js";
import type * as lib_githubIssue from "../lib/githubIssue.js";
import type * as lib_githubWebhook from "../lib/githubWebhook.js";
import type * as lib_linearConnection from "../lib/linearConnection.js";
import type * as lib_linearHandoffDelivery from "../lib/linearHandoffDelivery.js";
import type * as lib_linearIssue from "../lib/linearIssue.js";
import type * as lib_linearOAuth from "../lib/linearOAuth.js";
import type * as lib_mcpServer from "../lib/mcpServer.js";
import type * as lib_mcpToken from "../lib/mcpToken.js";
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
import type * as lib_workItemHandoff from "../lib/workItemHandoff.js";
import type * as lib_workItemHandoffPayload from "../lib/workItemHandoffPayload.js";
import type * as lib_workTrackerConfig from "../lib/workTrackerConfig.js";
import type * as lib_workTrackerConnection from "../lib/workTrackerConnection.js";
import type * as lib_workTrackerErrors from "../lib/workTrackerErrors.js";
import type * as lib_workTrackerGuards from "../lib/workTrackerGuards.js";
import type * as lib_workTrackerOAuthState from "../lib/workTrackerOAuthState.js";
import type * as lib_workTrackerSecrets from "../lib/workTrackerSecrets.js";
import type * as lib_workTrackerTypes from "../lib/workTrackerTypes.js";
import type * as linearWorkItemHandoffs from "../linearWorkItemHandoffs.js";
import type * as linearWorkTrackerCleanup from "../linearWorkTrackerCleanup.js";
import type * as linearWorkTrackerOAuth from "../linearWorkTrackerOAuth.js";
import type * as linearWorkTrackerSettings from "../linearWorkTrackerSettings.js";
import type * as mcpTokens from "../mcpTokens.js";
import type * as notificationConnectors from "../notificationConnectors.js";
import type * as notificationEvents from "../notificationEvents.js";
import type * as projects from "../projects.js";
import type * as rateLimits from "../rateLimits.js";
import type * as requestComments from "../requestComments.js";
import type * as requestStatuses from "../requestStatuses.js";
import type * as requestUpvotes from "../requestUpvotes.js";
import type * as requests from "../requests.js";
import type * as stats from "../stats.js";
import type * as suggestionPortals from "../suggestionPortals.js";
import type * as telegramBot from "../telegramBot.js";
import type * as telegramNotifications from "../telegramNotifications.js";
import type * as users from "../users.js";
import type * as waitlist from "../waitlist.js";
import type * as workItemHandoffs from "../workItemHandoffs.js";
import type * as workTrackerConnections from "../workTrackerConnections.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  apiKeys: typeof apiKeys;
  changelogEntries: typeof changelogEntries;
  crons: typeof crons;
  githubWorkItemHandoffs: typeof githubWorkItemHandoffs;
  githubWorkTrackerCleanup: typeof githubWorkTrackerCleanup;
  githubWorkTrackerConnections: typeof githubWorkTrackerConnections;
  githubWorkTrackerOAuth: typeof githubWorkTrackerOAuth;
  githubWorkTrackerSettings: typeof githubWorkTrackerSettings;
  githubWorkTrackerWebhooks: typeof githubWorkTrackerWebhooks;
  http: typeof http;
  "lib/apiKeys": typeof lib_apiKeys;
  "lib/authorization": typeof lib_authorization;
  "lib/changelogIntake": typeof lib_changelogIntake;
  "lib/githubApp": typeof lib_githubApp;
  "lib/githubConnection": typeof lib_githubConnection;
  "lib/githubHandoffDelivery": typeof lib_githubHandoffDelivery;
  "lib/githubIssue": typeof lib_githubIssue;
  "lib/githubWebhook": typeof lib_githubWebhook;
  "lib/linearConnection": typeof lib_linearConnection;
  "lib/linearHandoffDelivery": typeof lib_linearHandoffDelivery;
  "lib/linearIssue": typeof lib_linearIssue;
  "lib/linearOAuth": typeof lib_linearOAuth;
  "lib/mcpServer": typeof lib_mcpServer;
  "lib/mcpToken": typeof lib_mcpToken;
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
  "lib/workItemHandoff": typeof lib_workItemHandoff;
  "lib/workItemHandoffPayload": typeof lib_workItemHandoffPayload;
  "lib/workTrackerConfig": typeof lib_workTrackerConfig;
  "lib/workTrackerConnection": typeof lib_workTrackerConnection;
  "lib/workTrackerErrors": typeof lib_workTrackerErrors;
  "lib/workTrackerGuards": typeof lib_workTrackerGuards;
  "lib/workTrackerOAuthState": typeof lib_workTrackerOAuthState;
  "lib/workTrackerSecrets": typeof lib_workTrackerSecrets;
  "lib/workTrackerTypes": typeof lib_workTrackerTypes;
  linearWorkItemHandoffs: typeof linearWorkItemHandoffs;
  linearWorkTrackerCleanup: typeof linearWorkTrackerCleanup;
  linearWorkTrackerOAuth: typeof linearWorkTrackerOAuth;
  linearWorkTrackerSettings: typeof linearWorkTrackerSettings;
  mcpTokens: typeof mcpTokens;
  notificationConnectors: typeof notificationConnectors;
  notificationEvents: typeof notificationEvents;
  projects: typeof projects;
  rateLimits: typeof rateLimits;
  requestComments: typeof requestComments;
  requestStatuses: typeof requestStatuses;
  requestUpvotes: typeof requestUpvotes;
  requests: typeof requests;
  stats: typeof stats;
  suggestionPortals: typeof suggestionPortals;
  telegramBot: typeof telegramBot;
  telegramNotifications: typeof telegramNotifications;
  users: typeof users;
  waitlist: typeof waitlist;
  workItemHandoffs: typeof workItemHandoffs;
  workTrackerConnections: typeof workTrackerConnections;
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
