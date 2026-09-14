"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  createHealthCheckHandler: () => createHealthCheckHandler,
  createPanelAgent: () => createPanelAgent
});
module.exports = __toCommonJS(index_exports);
var CONTACT_ENDPOINT = "/api/webhook/contact";
function createPanelAgent(options) {
  return {
    contactMessage: (payload) => post(options, CONTACT_ENDPOINT, payload)
  };
}
function createHealthCheckHandler(options) {
  return async function GET(request) {
    const auth = request.headers.get("Authorization") ?? "";
    const given = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!constantTimeEqual(given, options.token)) {
      return Response.json({ message: "Unauthorized." }, { status: 401 });
    }
    return Response.json({
      status: "ok",
      app_version: options.appVersion ?? null,
      runtime: `node ${typeof process !== "undefined" ? process.version : "edge"}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  };
}
function constantTimeEqual(a, b) {
  if (a.length !== b.length || a.length === 0) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
async function post(options, endpoint, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 5e3);
  try {
    const res = await fetch(`${options.panelUrl.replace(/\/$/, "")}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.token}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (res.ok) {
      return { ok: true, status: res.status, error: null };
    }
    const body = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: body || res.statusText };
  } catch (error) {
    return {
      ok: false,
      status: null,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    clearTimeout(timeout);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createHealthCheckHandler,
  createPanelAgent
});
