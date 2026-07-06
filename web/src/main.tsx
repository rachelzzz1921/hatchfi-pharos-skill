import React from "react";
import { createRoot } from "react-dom/client";
import { Router, Route, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import App from "./App";
import AgentRun from "./AgentRun";
import { ErrorBoundary } from "./ErrorBoundary";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Router hook={useHashLocation}>
        <Switch>
          <Route path="/agent-run" component={AgentRun} />
          <Route path="/" component={App} />
        </Switch>
      </Router>
    </ErrorBoundary>
  </React.StrictMode>
);
