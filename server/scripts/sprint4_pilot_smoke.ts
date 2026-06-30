import "dotenv/config";

type JsonRecord = Record<string, any>;

const baseUrl = process.env.SMOKE_BASE_URL || `http://127.0.0.1:${process.env.PORT || 5000}/api`;
const runId = Date.now();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function api(path: string, options: {
  method?: string;
  tenantId?: string;
  userId?: string;
  body?: JsonRecord;
} = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (options.tenantId) headers["x-tenant-id"] = options.tenantId;
  if (options.userId) headers["x-user-id"] = options.userId;

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${options.method || "GET"} ${path} returned non-JSON response ${response.status}: ${text.slice(0, 120)}`);
  }
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} failed ${response.status}: ${text}`);
  }
  return payload;
}

async function main() {
  console.log(`Sprint 4 pilot smoke: ${baseUrl}`);

  const bootstrap = await api("/platform/onboarding/bootstrap", {
    method: "POST",
    body: {
      tenantName: `Smoke Tenant ${runId}`,
      tenantCode: `SMOKE_${runId}`,
      companyName: "Smoke Manufacturing",
      plantName: "Smoke Plant",
      industryType: "discrete_manufacturing",
      adminEmail: `smoke-${runId}@example.com`,
      adminName: "Smoke Admin",
    },
  });
  const tenantId = bootstrap.tenant?.id;
  const userId = bootstrap.adminUser?.id;
  assert(tenantId, "bootstrap did not return tenant.id");
  assert(userId, "bootstrap did not return adminUser.id");

  const auth = { tenantId, userId };
  const workOrder = await api("/mes/work-orders", {
    ...auth,
    method: "POST",
    body: {
      workOrderNumber: `WO-SMOKE-${runId}`,
      title: "Sprint 4 Smoke Work Order",
      productCode: `FG-SMOKE-${runId}`,
      productName: "Smoke Finished Good",
      plannedQuantity: "1",
      status: "draft",
    },
  });
  assert(workOrder.id, "work order was not created");

  const released = await api(`/mes/work-orders/${workOrder.id}/status`, {
    ...auth,
    method: "PATCH",
    body: { status: "released", comment: "smoke release" },
  });
  assert(released.status === "released", "work order did not release");

  const execution = await api(`/mes/work-orders/${workOrder.id}/executions`, {
    ...auth,
    method: "POST",
    body: {
      executionNumber: `EX-SMOKE-${runId}`,
      plannedQuantity: "1",
      status: "planned",
    },
  });
  assert(execution.id, "execution was not created");

  const activeExecution = await api(`/mes/work-order-executions/${execution.id}/status`, {
    ...auth,
    method: "PATCH",
    body: { status: "active", comment: "smoke start" },
  });
  assert(activeExecution.status === "active", "execution did not become active");

  const inProgress = await api(`/mes/work-orders/${workOrder.id}/status`, {
    ...auth,
    method: "PATCH",
    body: { status: "in_progress", comment: "smoke execution started" },
  });
  assert(inProgress.status === "in_progress", "work order did not move to in_progress");

  const completedExecution = await api(`/mes/work-order-executions/${execution.id}/status`, {
    ...auth,
    method: "PATCH",
    body: { status: "completed", goodQuantity: "1", rejectedQuantity: "0", comment: "smoke complete" },
  });
  assert(completedExecution.status === "completed", "execution did not complete");

  const ledger = await api(`/inventory/stock/ledger?executionId=${execution.id}`, auth);
  const receipt = ledger.find((row: JsonRecord) => row.movementType === "produce_receipt" && row.executionId === execution.id);
  assert(receipt, "produce receipt was not posted for execution");

  const closed = await api(`/mes/work-orders/${workOrder.id}/close`, {
    ...auth,
    method: "POST",
    body: { comment: "smoke close" },
  });
  assert(closed.workOrder?.status === "completed", "work order did not close to completed");
  assert(closed.summary?.produceReceiptCount >= 1, "close summary did not include produce receipt");

  console.log("Sprint 4 pilot smoke passed", {
    tenantId,
    userId,
    workOrderId: workOrder.id,
    executionId: execution.id,
    receiptId: receipt.id,
  });
}

main().catch((error) => {
  console.error("Sprint 4 pilot smoke failed");
  console.error(error);
  process.exit(1);
});
