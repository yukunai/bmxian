import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { defaultProviderRoutingPolicy, gatewayProviderPresets, type GatewayProviderConfig, type ProviderRoutingPolicy } from "@/lib/gateway-types";
import {
  defaultVisualGenerationSettings,
  initialCharacterProfiles,
  initialLoraAssets,
  initialArtifacts,
  initialMessages,
  initialTasks,
  productProfiles,
  routeSkills
} from "@/lib/workbench-data";
import type { Artifact, CharacterProfile, GenerationTask, LoraAsset, MarketplaceSkill, Message, PaymentSession, PaymentSessionStatus, ProductProfile, PublishPlanItem, RouteSkill, SupplierInvoice, TeamMember, UsageEvent, VisualGenerationSettings, WorkspaceMode } from "@/lib/workbench-data";
import type { KeyVaultSecret, MaterialAsset } from "@/lib/workbench-data";
import { mergeUsageEvents } from "@/lib/billing";
import { createDatabaseAdapter } from "@/lib/server/database-adapter";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/server/crypto";
import { defaultSessionUser, readServerSession } from "@/lib/server/session";

export type WorkspaceSnapshot = {
  workspaceId: string;
  workspaceName: string;
  ownerEmail: string;
  activeMode: WorkspaceMode;
  selectedProductId: string;
  selectedSkillId: string;
  selectedToolSkillId: string;
  selectedModelId: string;
  selectedCharacterId: string;
  visualSettings: VisualGenerationSettings;
  messages: Message[];
  artifacts: Artifact[];
  tasks: GenerationTask[];
  products: ProductProfile[];
  materials: MaterialAsset[];
  loraAssets: LoraAsset[];
  characterProfiles: CharacterProfile[];
  publishPlan: PublishPlanItem[];
  skills: RouteSkill[];
  publishedSkills: MarketplaceSkill[];
  usageEvents: UsageEvent[];
  supplierInvoices: SupplierInvoice[];
  paymentSessions: PaymentSession[];
  keyVault: KeyVaultSecret[];
  teamMembers: TeamMember[];
  providerConfigs: GatewayProviderConfig[];
  routingPolicy: ProviderRoutingPolicy;
};

export type WorkspaceRecord = {
  id: string;
  name: string;
  ownerEmail: string;
  createdAt: string;
  updatedAt: string;
  workspace: WorkspaceSnapshot;
};

type DatabaseShape = {
  version: 2;
  activeWorkspaceId: string;
  workspaces: WorkspaceRecord[];
  updatedAt: string;
};

const dbPath = join(process.cwd(), "data", "bmxian-db.json");
const dbAdapter = createDatabaseAdapter(dbPath);
const defaultWorkspaceId = "workspace-default";
let mutationQueue: Promise<unknown> = Promise.resolve();

function defaultWorkspace(
  workspaceId = defaultWorkspaceId,
  workspaceName = "默认工作区",
  ownerEmail = defaultSessionUser.email
): WorkspaceSnapshot {
  const now = new Date().toISOString();
  return {
    workspaceId,
    workspaceName,
    ownerEmail,
    activeMode: "聊天",
    selectedProductId: productProfiles[0].id,
    selectedSkillId: "free-chat",
    selectedToolSkillId: "",
    selectedModelId: "auto",
    selectedCharacterId: initialCharacterProfiles[0].id,
    visualSettings: defaultVisualGenerationSettings,
    messages: initialMessages,
    artifacts: initialArtifacts,
    tasks: initialTasks,
    products: productProfiles,
    materials: [],
    loraAssets: initialLoraAssets,
    characterProfiles: initialCharacterProfiles,
    publishPlan: [],
    skills: routeSkills,
    publishedSkills: [],
    usageEvents: [],
    supplierInvoices: [],
    paymentSessions: [],
    keyVault: [],
    teamMembers: [{
      id: "member-owner",
      name: workspaceName,
      email: ownerEmail,
      role: "owner",
      status: "active",
      createdAt: now
    }],
    providerConfigs: gatewayProviderPresets,
    routingPolicy: defaultProviderRoutingPolicy
  };
}

function defaultWorkspaceRecord(): WorkspaceRecord {
  const now = new Date().toISOString();
  const workspace = defaultWorkspace(defaultWorkspaceId, "默认工作区", defaultSessionUser.email);
  return {
    id: defaultWorkspaceId,
    name: workspace.workspaceName,
    ownerEmail: workspace.ownerEmail,
    createdAt: now,
    updatedAt: now,
    workspace
  };
}

function defaultDb(): DatabaseShape {
  const workspace = defaultWorkspaceRecord();
  return {
    version: 2,
    activeWorkspaceId: workspace.id,
    workspaces: [workspace],
    updatedAt: new Date().toISOString()
  };
}

function normalizeWorkspace(
  workspace: Partial<WorkspaceSnapshot> | undefined,
  meta: { id: string; name: string; ownerEmail: string }
): WorkspaceSnapshot {
  const defaults = defaultWorkspace(meta.id, meta.name, meta.ownerEmail);

  return {
    ...defaults,
    ...workspace,
    workspaceId: meta.id,
    workspaceName: meta.name,
    ownerEmail: meta.ownerEmail,
    selectedCharacterId: workspace?.selectedCharacterId ?? initialCharacterProfiles[0].id,
    products: workspace?.products ?? productProfiles,
    materials: workspace?.materials ?? [],
    loraAssets: mergeDefaultLoraAssets(workspace?.loraAssets),
    characterProfiles: mergeDefaultCharacterProfiles(workspace?.characterProfiles),
    publishPlan: workspace?.publishPlan ?? [],
    skills: mergeDefaultSkills(workspace?.skills),
    publishedSkills: workspace?.publishedSkills ?? [],
    artifacts: workspace?.artifacts ?? initialArtifacts,
    tasks: workspace?.tasks ?? initialTasks,
    usageEvents: mergeUsageEvents(workspace?.usageEvents ?? [], workspace?.tasks ?? initialTasks),
    supplierInvoices: workspace?.supplierInvoices ?? [],
    paymentSessions: workspace?.paymentSessions ?? [],
    keyVault: normalizeKeyVault(workspace?.keyVault),
    teamMembers: normalizeTeamMembers(workspace?.teamMembers, meta),
    messages: workspace?.messages ?? initialMessages,
    visualSettings: workspace?.visualSettings ?? defaultVisualGenerationSettings,
    providerConfigs: mergeDefaultProviderConfigs(workspace?.providerConfigs),
    routingPolicy: workspace?.routingPolicy ?? defaultProviderRoutingPolicy
  };
}

function mergeDefaultSkills(existingSkills: RouteSkill[] | undefined) {
  const skillsById = new Map(routeSkills.map((skill) => [skill.id, skill]));
  const builtInRouteIds = new Set(routeSkills.map((skill) => skill.id));
  for (const skill of existingSkills ?? []) {
    if (builtInRouteIds.has(skill.id)) continue;
    skillsById.set(skill.id, skill);
  }
  return Array.from(skillsById.values());
}

function mergeDefaultLoraAssets(existingAssets: LoraAsset[] | undefined) {
  const assetsById = new Map(initialLoraAssets.map((asset) => [asset.id, asset]));
  for (const asset of existingAssets ?? []) {
    assetsById.set(asset.id, asset);
  }
  return Array.from(assetsById.values());
}

function mergeDefaultCharacterProfiles(existingProfiles: CharacterProfile[] | undefined) {
  const profilesById = new Map(initialCharacterProfiles.map((profile) => [profile.id, profile]));
  for (const profile of existingProfiles ?? []) {
    profilesById.set(profile.id, profile);
  }
  return Array.from(profilesById.values());
}

function mergeDefaultProviderConfigs(existingProviders: GatewayProviderConfig[] | undefined) {
  const providersById = new Map(gatewayProviderPresets.map((provider) => [provider.id, provider]));
  for (const provider of existingProviders ?? []) {
    const preset = providersById.get(provider.id);
    providersById.set(provider.id, {
      ...preset,
      ...provider,
      kind: provider.kind ?? preset?.kind ?? "chat",
      capabilities: provider.capabilities ?? preset?.capabilities
    });
  }
  return Array.from(providersById.values());
}

function normalizeTeamMembers(
  members: TeamMember[] | undefined,
  meta: { name: string; ownerEmail: string }
) {
  const owner: TeamMember = {
    id: "member-owner",
    name: meta.name,
    email: meta.ownerEmail,
    role: "owner",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z"
  };
  const byEmail = new Map<string, TeamMember>([[owner.email, owner]]);

  for (const member of members ?? []) {
    byEmail.set(member.email, {
      ...member,
      role: member.email === owner.email ? "owner" : member.role
    });
  }

  return Array.from(byEmail.values());
}

function normalizeKeyVault(secrets: KeyVaultSecret[] | undefined) {
  return (secrets ?? []).map((secret) => ({
    ...secret,
    maskedValue: maskSecret(secret.secretCiphertext ?? secret.maskedValue)
  }));
}

function normalizeWorkspaceRecord(
  record: (Partial<Omit<WorkspaceRecord, "workspace">> & { workspace?: Partial<WorkspaceSnapshot> }) | undefined,
  index = 0
): WorkspaceRecord {
  const fallback = defaultWorkspaceRecord();
  const id = record?.id || (index === 0 ? defaultWorkspaceId : `workspace-${randomUUID().slice(0, 8)}`);
  const name = record?.name || record?.workspace?.workspaceName || (index === 0 ? "默认工作区" : `工作区 ${index + 1}`);
  const ownerEmail = record?.ownerEmail || record?.workspace?.ownerEmail || defaultSessionUser.email;
  const now = new Date().toISOString();

  return {
    id,
    name,
    ownerEmail,
    createdAt: record?.createdAt || fallback.createdAt || now,
    updatedAt: record?.updatedAt || now,
    workspace: normalizeWorkspace(record?.workspace, { id, name, ownerEmail })
  };
}

function normalizeDb(input: Partial<DatabaseShape> & { workspace?: Partial<WorkspaceSnapshot> }): DatabaseShape {
  const legacyWorkspace = input.workspace
    ? normalizeWorkspaceRecord({
        id: input.workspace.workspaceId || defaultWorkspaceId,
        name: input.workspace.workspaceName || "默认工作区",
        ownerEmail: input.workspace.ownerEmail || defaultSessionUser.email,
        workspace: input.workspace
      })
    : undefined;

  const workspaces = input.workspaces?.length
    ? input.workspaces.map((workspace, index) => normalizeWorkspaceRecord(workspace, index))
    : [legacyWorkspace ?? defaultWorkspaceRecord()];
  const activeWorkspaceId = workspaces.some((workspace) => workspace.id === input.activeWorkspaceId)
    ? input.activeWorkspaceId as string
    : workspaces[0].id;

  return {
    version: 2,
    activeWorkspaceId,
    workspaces,
    updatedAt: input.updatedAt ?? new Date().toISOString()
  };
}

async function readDb(): Promise<DatabaseShape> {
  try {
    const raw = await dbAdapter.readText();
    if (raw) {
      return normalizeDb(JSON.parse(raw) as DatabaseShape);
    }
  } catch {
    // Fall through to a fresh local database if the MVP JSON file is missing or corrupted.
  }

  const db = defaultDb();
  await writeDb(db);
  return db;
}

async function writeDb(db: DatabaseShape) {
  await dbAdapter.writeText(`${JSON.stringify(db, null, 2)}\n`);
}

function parseDatabaseText(raw: string | undefined): DatabaseShape {
  if (raw) {
    return normalizeDb(JSON.parse(raw) as DatabaseShape);
  }
  return defaultDb();
}

function stringifyDatabase(db: DatabaseShape) {
  return `${JSON.stringify(db, null, 2)}\n`;
}

async function waitForMutations() {
  await mutationQueue.catch(() => undefined);
}

function toClientProviders(providers: GatewayProviderConfig[]) {
  return providers.map((provider) => ({
    ...provider,
    apiKey: maskSecret(provider.apiKey)
  }));
}

function toRuntimeProviders(providers: GatewayProviderConfig[]) {
  return providers.map((provider) => ({
    ...provider,
    apiKey: decryptSecret(provider.apiKey)
  }));
}

function toClientKeyVault(secrets: KeyVaultSecret[]) {
  return secrets.map(({ secretCiphertext, ...secret }) => ({
    ...secret,
    maskedValue: maskSecret(secretCiphertext ?? secret.maskedValue)
  }));
}

function toClientWorkspace(workspace: WorkspaceSnapshot) {
  return {
    ...workspace,
    keyVault: toClientKeyVault(workspace.keyVault),
    providerConfigs: toClientProviders(workspace.providerConfigs)
  };
}

function workspaceSummary(record: WorkspaceRecord) {
  return {
    id: record.id,
    name: record.name,
    ownerEmail: record.ownerEmail,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    counts: {
      products: record.workspace.products.length,
      artifacts: record.workspace.artifacts.length,
      tasks: record.workspace.tasks.length,
      publishPlan: record.workspace.publishPlan.length
    }
  };
}

async function activeWorkspaceIdForDb(db: DatabaseShape) {
  const session = await readServerSession();
  const cookieWorkspaceId = session.workspaceId;

  if (cookieWorkspaceId && db.workspaces.some((workspace) => workspace.id === cookieWorkspaceId)) {
    return cookieWorkspaceId;
  }

  if (db.workspaces.some((workspace) => workspace.id === db.activeWorkspaceId)) {
    return db.activeWorkspaceId;
  }

  return db.workspaces[0].id;
}

async function activeWorkspaceRecord(db: DatabaseShape) {
  const workspaceId = await activeWorkspaceIdForDb(db);
  return db.workspaces.find((workspace) => workspace.id === workspaceId) ?? db.workspaces[0];
}

async function mutateDatabase(mutator: (db: DatabaseShape) => DatabaseShape) {
  const run = mutationQueue.then(async () => {
    const nextText = await dbAdapter.mutateText((raw) => {
      const db = parseDatabaseText(raw);
      return stringifyDatabase(mutator(db));
    });
    return normalizeDb(JSON.parse(nextText) as DatabaseShape);
  });

  mutationQueue = run.then(() => undefined, () => undefined);
  return run;
}

async function mutateWorkspace(mutator: (workspace: WorkspaceSnapshot) => WorkspaceSnapshot) {
  const run = mutationQueue.then(async () => {
    let nextWorkspace: WorkspaceSnapshot | undefined;
    const nextText = await dbAdapter.mutateText(async (raw) => {
      const db = parseDatabaseText(raw);
      const record = await activeWorkspaceRecord(db);
      nextWorkspace = normalizeWorkspace(mutator(record.workspace), {
        id: record.id,
        name: record.name,
        ownerEmail: record.ownerEmail
      });
      const now = new Date().toISOString();
      const nextRecord: WorkspaceRecord = {
        ...record,
        name: nextWorkspace.workspaceName,
        ownerEmail: nextWorkspace.ownerEmail,
        updatedAt: now,
        workspace: nextWorkspace
      };
      const nextDb: DatabaseShape = {
        ...db,
        activeWorkspaceId: nextRecord.id,
        workspaces: db.workspaces.map((workspace) =>
          workspace.id === nextRecord.id ? nextRecord : workspace
        ),
        updatedAt: now
      };
      return stringifyDatabase(nextDb);
    });
    const normalizedNext = normalizeDb(JSON.parse(nextText) as DatabaseShape);
    const workspace = nextWorkspace ?? (await activeWorkspaceRecord(normalizedNext)).workspace;
    return toClientWorkspace(workspace);
  });

  mutationQueue = run.then(() => undefined, () => undefined);
  return run;
}

function mergeProviders(
  previous: GatewayProviderConfig[],
  incoming: GatewayProviderConfig[]
) {
  return incoming.map((provider) => {
    const oldProvider = previous.find((item) => item.id === provider.id);
    const oldPlain = oldProvider ? decryptSecret(oldProvider.apiKey) : "";
    const incomingLooksMasked = provider.apiKey.includes("••••");
    const nextPlain = incomingLooksMasked ? oldPlain : provider.apiKey;

    return {
      ...provider,
      apiKey: nextPlain ? encryptSecret(nextPlain) : ""
    };
  });
}

export async function getWorkspaceForClient(): Promise<WorkspaceSnapshot> {
  await waitForMutations();
  const db = await readDb();
  const record = await activeWorkspaceRecord(db);
  return toClientWorkspace(record.workspace);
}

export function databaseAdapterInfo() {
  return dbAdapter.info;
}

export async function getWorkspaceForRuntime(): Promise<WorkspaceSnapshot> {
  await waitForMutations();
  const db = await readDb();
  const record = await activeWorkspaceRecord(db);
  return {
    ...record.workspace,
    providerConfigs: toRuntimeProviders(record.workspace.providerConfigs)
  };
}

export async function listWorkspaces() {
  await waitForMutations();
  const db = await readDb();
  const activeWorkspaceId = await activeWorkspaceIdForDb(db);

  return {
    activeWorkspaceId,
    workspaces: db.workspaces.map(workspaceSummary)
  };
}

export async function createWorkspace(name: string, ownerEmail = defaultSessionUser.email) {
  const now = new Date().toISOString();
  const id = `workspace-${randomUUID().slice(0, 8)}`;
  const safeName = name.trim() || `工作区 ${now.slice(5, 10)}`;
  const workspace = normalizeWorkspace(undefined, { id, name: safeName, ownerEmail });
  const record: WorkspaceRecord = {
    id,
    name: safeName,
    ownerEmail,
    createdAt: now,
    updatedAt: now,
    workspace
  };

  const db = await mutateDatabase((current) => ({
    ...current,
    activeWorkspaceId: id,
    workspaces: [record, ...current.workspaces],
    updatedAt: now
  }));

  return {
    activeWorkspaceId: id,
    workspace: toClientWorkspace(record.workspace),
    workspaces: db.workspaces.map(workspaceSummary)
  };
}

export async function setActiveWorkspace(id: string) {
  const db = await mutateDatabase((current) => {
    const exists = current.workspaces.some((workspace) => workspace.id === id);
    return exists
      ? {
          ...current,
          activeWorkspaceId: id,
          updatedAt: new Date().toISOString()
        }
      : current;
  });
  const record = db.workspaces.find((workspace) => workspace.id === id) ?? db.workspaces[0];

  return {
    activeWorkspaceId: record.id,
    workspace: toClientWorkspace(record.workspace),
    workspaces: db.workspaces.map(workspaceSummary)
  };
}

export async function saveWorkspaceSnapshot(snapshot: Partial<WorkspaceSnapshot>) {
  return mutateWorkspace((workspace) => ({
    ...workspace,
    ...snapshot,
    providerConfigs: snapshot.providerConfigs
      ? mergeProviders(workspace.providerConfigs, snapshot.providerConfigs)
      : workspace.providerConfigs
  }));
}

export async function resetWorkspace() {
  return mutateWorkspace((workspace) =>
    defaultWorkspace(workspace.workspaceId, workspace.workspaceName, workspace.ownerEmail)
  );
}

export async function saveProviders(providers: GatewayProviderConfig[]) {
  return mutateWorkspace((workspace) => ({
    ...workspace,
    providerConfigs: mergeProviders(workspace.providerConfigs, providers)
  }));
}

export async function addArtifact(artifact: Artifact, task: GenerationTask, message: Message) {
  return mutateWorkspace((workspace) => ({
    ...workspace,
    artifacts: [artifact, ...workspace.artifacts],
    tasks: [task, ...workspace.tasks],
    usageEvents: mergeUsageEvents(workspace.usageEvents, [task]),
    messages: [...workspace.messages, message]
  }));
}

export async function addCampaignPackage(artifacts: Artifact[], tasks: GenerationTask[], message: Message) {
  return mutateWorkspace((workspace) => ({
    ...workspace,
    artifacts: [...artifacts, ...workspace.artifacts],
    tasks: [...tasks, ...workspace.tasks],
    usageEvents: mergeUsageEvents(workspace.usageEvents, tasks),
    messages: workspace.messages.some((item) => item.id === message.id)
      ? workspace.messages
      : [...workspace.messages, message]
  }));
}

export async function completeGenerationJob(taskId: string, artifact: Artifact, message: Message) {
  return mutateWorkspace((workspace) => {
    const existingArtifact = workspace.artifacts.find((item) => item.id === artifact.id);
    const now = new Date().toISOString();
    let completedTask: GenerationTask | undefined;
    const tasks = workspace.tasks.map((task) => {
      if (task.id !== taskId) return task;
      completedTask = {
        ...task,
        status: "已完成",
        progress: 100,
        artifactId: artifact.id,
        updatedAt: now
      };
      return completedTask;
    });

    return {
      ...workspace,
      artifacts: existingArtifact
        ? workspace.artifacts.map((item) => (item.id === artifact.id ? artifact : item))
        : [artifact, ...workspace.artifacts],
      messages: workspace.messages.some((item) => item.id === message.id)
        ? workspace.messages
        : [...workspace.messages, message],
      tasks,
      usageEvents: completedTask
        ? mergeUsageEvents(workspace.usageEvents, [completedTask])
        : workspace.usageEvents
    };
  });
}

export async function upsertProduct(product: ProductProfile) {
  return mutateWorkspace((workspace) => {
    const exists = workspace.products.some((item) => item.id === product.id);
    const products = exists
      ? workspace.products.map((item) => (item.id === product.id ? product : item))
      : [product, ...workspace.products];

    return {
      ...workspace,
      products
    };
  });
}

export async function upsertProducts(incomingProducts: ProductProfile[]) {
  return mutateWorkspace((workspace) => {
    const dedupedIncoming = Array.from(
      new Map(incomingProducts.map((product) => [product.id, product])).values()
    );
    const existingIds = new Set(workspace.products.map((product) => product.id));
    const incomingById = new Map(dedupedIncoming.map((product) => [product.id, product]));
    const updatedProducts = workspace.products.map((product) => incomingById.get(product.id) ?? product);
    const newProducts = dedupedIncoming.filter((product) => !existingIds.has(product.id));

    return {
      ...workspace,
      products: [...newProducts, ...updatedProducts]
    };
  });
}

export async function deleteProduct(id: string) {
  return mutateWorkspace((workspace) => ({
    ...workspace,
    products: workspace.products.filter((product) => product.id !== id)
  }));
}

export async function upsertMaterial(material: MaterialAsset) {
  return mutateWorkspace((workspace) => {
    const exists = workspace.materials.some((item) => item.id === material.id);
    const materials = exists
      ? workspace.materials.map((item) => (item.id === material.id ? material : item))
      : [material, ...workspace.materials];

    return {
      ...workspace,
      materials
    };
  });
}

export async function deleteMaterial(id: string) {
  return mutateWorkspace((workspace) => ({
    ...workspace,
    materials: workspace.materials.filter((material) => material.id !== id)
  }));
}

export async function upsertLoraAsset(asset: LoraAsset) {
  return mutateWorkspace((workspace) => {
    const exists = workspace.loraAssets.some((item) => item.id === asset.id);
    const loraAssets = exists
      ? workspace.loraAssets.map((item) => (item.id === asset.id ? asset : item))
      : [asset, ...workspace.loraAssets];

    return {
      ...workspace,
      loraAssets
    };
  });
}

export async function deleteLoraAsset(id: string) {
  return mutateWorkspace((workspace) => ({
    ...workspace,
    loraAssets: workspace.loraAssets.filter((asset) => asset.id !== id)
  }));
}

export async function upsertCharacterProfile(character: CharacterProfile) {
  return mutateWorkspace((workspace) => {
    const exists = workspace.characterProfiles.some((item) => item.id === character.id);
    const characterProfiles = exists
      ? workspace.characterProfiles.map((item) => (item.id === character.id ? character : item))
      : [character, ...workspace.characterProfiles];

    return {
      ...workspace,
      characterProfiles,
      selectedCharacterId: character.id
    };
  });
}

export async function deleteCharacterProfile(id: string) {
  return mutateWorkspace((workspace) => {
    const characterProfiles = workspace.characterProfiles.filter((character) => character.id !== id);
    const selectedCharacterId = workspace.selectedCharacterId === id
      ? characterProfiles[0]?.id ?? initialCharacterProfiles[0].id
      : workspace.selectedCharacterId;

    return {
      ...workspace,
      characterProfiles,
      selectedCharacterId
    };
  });
}

export async function upsertPublishPlanItem(item: PublishPlanItem) {
  return mutateWorkspace((workspace) => {
    const exists = workspace.publishPlan.some((planItem) => planItem.id === item.id);
    const publishPlan = exists
      ? workspace.publishPlan.map((planItem) => (planItem.id === item.id ? item : planItem))
      : [item, ...workspace.publishPlan];

    return {
      ...workspace,
      publishPlan
    };
  });
}

export async function upsertPublishPlanItems(items: PublishPlanItem[]) {
  return mutateWorkspace((workspace) => {
    const incomingById = new Map(items.map((item) => [item.id, item]));
    const existingIds = new Set(workspace.publishPlan.map((item) => item.id));
    const updatedPlan = workspace.publishPlan.map((item) => incomingById.get(item.id) ?? item);
    const newItems = items.filter((item) => !existingIds.has(item.id));

    return {
      ...workspace,
      publishPlan: [...newItems, ...updatedPlan]
    };
  });
}

export async function deletePublishPlanItem(id: string) {
  return mutateWorkspace((workspace) => ({
    ...workspace,
    publishPlan: workspace.publishPlan.filter((item) => item.id !== id)
  }));
}

export async function upsertArtifact(artifact: Artifact) {
  return mutateWorkspace((workspace) => {
    const exists = workspace.artifacts.some((item) => item.id === artifact.id);
    const artifacts = exists
      ? workspace.artifacts.map((item) => (item.id === artifact.id ? artifact : item))
      : [artifact, ...workspace.artifacts];

    return {
      ...workspace,
      artifacts
    };
  });
}

export async function deleteArtifact(id: string) {
  return mutateWorkspace((workspace) => ({
    ...workspace,
    artifacts: workspace.artifacts.filter((artifact) => artifact.id !== id)
  }));
}

export async function upsertTask(task: GenerationTask) {
  return mutateWorkspace((workspace) => {
    const exists = workspace.tasks.some((item) => item.id === task.id);
    const tasks = exists
      ? workspace.tasks.map((item) => (item.id === task.id ? task : item))
      : [task, ...workspace.tasks];

    return {
      ...workspace,
      tasks
    };
  });
}

export async function deleteTask(id: string) {
  return mutateWorkspace((workspace) => ({
    ...workspace,
    tasks: workspace.tasks.filter((task) => task.id !== id)
  }));
}

export async function upsertSkill(skill: RouteSkill) {
  return mutateWorkspace((workspace) => {
    const exists = workspace.skills.some((item) => item.id === skill.id);
    const skills = exists
      ? workspace.skills.map((item) => (item.id === skill.id ? skill : item))
      : [skill, ...workspace.skills];

    return {
      ...workspace,
      skills
    };
  });
}

export async function deleteSkill(id: string) {
  return mutateWorkspace((workspace) => {
    const skills = workspace.skills.filter((skill) => skill.id !== id);
    return {
      ...workspace,
      skills,
      selectedSkillId: workspace.selectedSkillId === id ? skills[0]?.id ?? "xiaohongshu-note" : workspace.selectedSkillId
    };
  });
}

export async function upsertTeamMember(member: Omit<TeamMember, "id" | "createdAt"> & Partial<Pick<TeamMember, "id" | "createdAt">>) {
  return mutateWorkspace((workspace) => {
    const existing = workspace.teamMembers.find((item) => item.email === member.email || item.id === member.id);
    const nextMember: TeamMember = {
      id: existing?.id ?? member.id ?? `member-${randomUUID().slice(0, 8)}`,
      name: member.name,
      email: member.email,
      role: existing?.role === "owner" ? "owner" : member.role,
      status: member.status,
      createdAt: existing?.createdAt ?? member.createdAt ?? new Date().toISOString()
    };
    const teamMembers = existing
      ? workspace.teamMembers.map((item) => (item.id === existing.id ? nextMember : item))
      : [nextMember, ...workspace.teamMembers];

    return {
      ...workspace,
      teamMembers
    };
  });
}

export async function deleteTeamMember(id: string) {
  return mutateWorkspace((workspace) => ({
    ...workspace,
    teamMembers: workspace.teamMembers.filter((member) => member.id !== id || member.role === "owner")
  }));
}

export async function upsertKeyVaultSecret(
  secret: Omit<KeyVaultSecret, "id" | "maskedValue" | "secretCiphertext" | "createdAt" | "updatedAt"> & {
    id?: string;
    secretValue?: string;
  }
) {
  return mutateWorkspace((workspace) => {
    const existing = workspace.keyVault.find((item) => item.id === secret.id);
    const now = new Date().toISOString();
    const nextPlain = secret.secretValue?.trim();
    const secretCiphertext = nextPlain
      ? encryptSecret(nextPlain)
      : existing?.secretCiphertext ?? "";
    const nextSecret: KeyVaultSecret = {
      id: existing?.id ?? secret.id ?? `secret-${randomUUID().slice(0, 8)}`,
      name: secret.name,
      scope: secret.scope,
      linkedId: secret.linkedId,
      maskedValue: maskSecret(secretCiphertext),
      secretCiphertext,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      createdBy: existing?.createdBy ?? secret.createdBy,
      lastUsedAt: existing?.lastUsedAt
    };

    return {
      ...workspace,
      keyVault: existing
        ? workspace.keyVault.map((item) => (item.id === existing.id ? nextSecret : item))
        : [nextSecret, ...workspace.keyVault]
    };
  });
}

export async function deleteKeyVaultSecret(id: string) {
  return mutateWorkspace((workspace) => ({
    ...workspace,
    keyVault: workspace.keyVault.filter((secret) => secret.id !== id)
  }));
}

export async function upsertSupplierInvoices(invoices: SupplierInvoice[]) {
  return mutateWorkspace((workspace) => {
    const invoicesById = new Map(workspace.supplierInvoices.map((invoice) => [invoice.id, invoice]));
    for (const invoice of invoices) {
      invoicesById.set(invoice.id, invoice);
    }

    return {
      ...workspace,
      supplierInvoices: Array.from(invoicesById.values()).sort((a, b) =>
        Date.parse(b.importedAt) - Date.parse(a.importedAt)
      )
    };
  });
}

export async function deleteSupplierInvoice(id: string) {
  return mutateWorkspace((workspace) => ({
    ...workspace,
    supplierInvoices: workspace.supplierInvoices.filter((invoice) => invoice.id !== id)
  }));
}

export async function upsertPaymentSession(session: PaymentSession) {
  return mutateWorkspace((workspace) => {
    const sessionsById = new Map(workspace.paymentSessions.map((item) => [item.id, item]));
    sessionsById.set(session.id, session);

    return {
      ...workspace,
      paymentSessions: Array.from(sessionsById.values()).sort((a, b) =>
        Date.parse(b.createdAt) - Date.parse(a.createdAt)
      )
    };
  });
}

export async function updatePaymentSessionStatus(
  id: string,
  status: PaymentSessionStatus,
  note?: string
) {
  return mutateWorkspace((workspace) => {
    const now = new Date().toISOString();
    return {
      ...workspace,
      paymentSessions: workspace.paymentSessions.map((session) => {
        if (session.id !== id) return session;

        return {
          ...session,
          status,
          note: note?.trim() || session.note,
          updatedAt: now,
          paidAt: status === "paid" ? now : session.paidAt,
          cancelledAt: status === "cancelled" ? now : session.cancelledAt
        };
      })
    };
  });
}
