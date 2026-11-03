import { Hono } from "hono";
import {incidentRecoveryRouter} from './routes/incident-recovery';
import {carrierQuotePoliciesRouter} from "./routes/carrier-quote-policies";
import {quoteConfirmationRouter} from "./routes/quote-confirmation";
import {carrierRegularDriversRouter} from "./routes/carrier-regular-drivers";
import { errorHandler } from "./middleware/error-handler";
import { healthRouter } from "./routes/health";
import { freightRequestsRouter } from "./routes/freight/requests";
import { intakeOptionsRouter } from "./routes/intake/options";
import { facilitiesRouter } from "./routes/facilities";
import { organizationsRouter } from "./routes/organizations";
import { declaredManifestsRouter } from "./routes/meta/declared-manifests";
import { catalogRouter } from "./routes/catalog";
import { workflowRouter } from "./routes/workflow";
import { identityRouter } from "./routes/identity";
import { carrierPortalRouter } from "./routes/carrier-portal";
import { carrierWorkflowRouter } from "./routes/carrier-workflow";
import { locationsRouter } from "./routes/locations";
import {loadingSessionsRouter} from './routes/meta/loading-sessions';
import {dockmindRouter} from './routes/meta/dockmind';
import {documentsRouter} from './routes/meta/documents';
import {declarationMediaRouter} from './routes/meta/declaration-media';

// ---------------------------------------------------------------------------
// CargoMesh V2 Hono application factory.
//
// The Vercel adapter retains the full pathname, so install the prefix before
// registering any logical routes:
//
//   /health                → GET  /api/v2/health
//   /freight/requests      → POST /api/v2/freight/requests
// ---------------------------------------------------------------------------

import { carrierRoadOperationRouter } from './routes/carrier-road-operation';
import { carrierRoadRouter } from './routes/carrier-road-routing';
import { carrierBordersRouter } from './routes/carrier-borders';
import {carrierOperationsRouter} from './routes/carrier-operations';

export function createHonoApp() {
  const app = new Hono().basePath("/api/v2");

  // Global error handler
  app.onError(errorHandler);

  // Routes
  app.route("/health", healthRouter);
  app.route('/',loadingSessionsRouter);
  app.route('/',dockmindRouter);
  app.route('/',documentsRouter);
  app.route('/declaration-media',declarationMediaRouter);
  app.route("/", declaredManifestsRouter);
  app.route('/',incidentRecoveryRouter);
  app.route("/", carrierRegularDriversRouter);
  app.route("/", carrierQuotePoliciesRouter);
  app.route("/", quoteConfirmationRouter);
  app.route("/", carrierOperationsRouter);
  app.route("/", carrierBordersRouter);
  app.route("/", carrierRoadRouter);
  app.route("/", carrierRoadOperationRouter);
  app.route("/", carrierPortalRouter);
  app.route("/", identityRouter);
  app.route("/", carrierWorkflowRouter);
  app.route("/locations", locationsRouter);
  app.route("/freight/requests", freightRequestsRouter);
  app.route("/intake/options", intakeOptionsRouter);
  app.route("/facilities", facilitiesRouter);
  app.route("/organizations", organizationsRouter);
  app.route("/", catalogRouter);
  app.route("/", workflowRouter);

  return app;
}
