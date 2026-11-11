"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode
} from "react";
import {
  defaultProviderRoutingPolicy,
  GenerateResponse,
  GatewayProviderConfig,
  gatewayProviderPresets,
  providerConfigForModel,
  type ProviderRoutingPolicy
} from "@/lib/gateway-types";
import {
  Artifact,
  CharacterProfile,
  GenerationTask,
  MaterialAsset,
  Message,
  NavKey,
  ProductProfile,
  PublishPlanItem,
  RouteSkill,
  VisualGenerationSettings,
  WorkspaceMode,
  defaultVisualGenerationSettings,
  initialArtifacts,
  initialCharacterProfiles,
  initialLoraAssets,
  initialMessages,
  initialTasks,
  LoraAsset,
  modelEngines,
  productProfiles,
  routeSkills as initialRouteSkills
} from "@/lib/workbench-data";
import {
  appStorageKey,
  asyncModes,
  defaultBillingSummary,
  defaultPrompt,
  estimateCost,
  isToolSkill,
  isUploadedSkill,
  modeForSkill,
  modelIdForSkill,
  nextId,
  sanitizeProvidersForBrowser,
  skillNeedsProductContext,
  visualControlModes,
  visualSettingsFor
} from "./shared";
import type {
  BillingSummary,
  CampaignPackResponse,
  JobResponse,
  ProductImportResponse,
  SearchResult,
  SessionUser,
  WorkspaceDirectoryResponse,
  WorkspaceListItem,
  WorkspaceSnapshotPayload
} from "./shared";

function mergeDefaultSkills(skills: RouteSkill[]) {
  const existingIds = new Set(skills.map((skill) => skill.id));
  return [
    ...skills,
    ...initialRouteSkills.filter((skill) => !existingIds.has(skill.id))
  ];
}

function useWorkbenchValue() {
  const [activeNav, setActiveNav] = useState<NavKey>("studio");
  const [activeMode, setActiveMode] = useState<WorkspaceMode>("聊天");
  const [selectedProductId, setSelectedProductId] = useState(productProfiles[0].id);
  const [selectedSkillId, setSelectedSkillId] = useState(initialRouteSkills[0].id);
  const [selectedToolSkillId, setSelectedToolSkillId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState(modelEngines[0].id);
  const [visualSettings, setVisualSettings] = useState<VisualGenerationSettings>(defaultVisualGenerationSettings);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [artifacts, setArtifacts] = useState<Artifact[]>(initialArtifacts);
  const [tasks, setTasks] = useState<GenerationTask[]>(initialTasks);
  const [products, setProducts] = useState<ProductProfile[]>(productProfiles);
  const [materials, setMaterials] = useState<MaterialAsset[]>([]);
  const [loraAssets, setLoraAssets] = useState<LoraAsset[]>(initialLoraAssets);
  const [characterProfiles, setCharacterProfiles] = useState<CharacterProfile[]>(initialCharacterProfiles);
  const [selectedCharacterId, setSelectedCharacterId] = useState(initialCharacterProfiles[0].id);
  const [publishPlan, setPublishPlan] = useState<PublishPlanItem[]>([]);
  const [skills, setSkills] = useState<RouteSkill[]>(initialRouteSkills);
  const [providerConfigs, setProviderConfigs] = useState<GatewayProviderConfig[]>(gatewayProviderPresets);
  const [routingPolicy, setRoutingPolicy] = useState<ProviderRoutingPolicy>(defaultProviderRoutingPolicy);
  const [billingSummary, setBillingSummary] = useState<BillingSummary>(defaultBillingSummary);
  const [sessionUser, setSessionUser] = useState<SessionUser>({ email: "owner@bmxian.local", name: "斑马线团队" });
  const [workspaceId, setWorkspaceId] = useState("workspace-default");
  const [workspaceName, setWorkspaceName] = useState("默认工作区");
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const skipNextSaveRef = useRef(false);

  const activeProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? products[0],
    [products, selectedProductId]
  );
  const activeSkill = useMemo(
    () => skills.find((skill) => skill.id === selectedSkillId) ?? skills[0] ?? initialRouteSkills[0],
    [selectedSkillId, skills]
  );
  const activeToolSkill = useMemo(
    () => skills.find((skill) => skill.id === selectedToolSkillId && isToolSkill(skill)),
    [selectedToolSkillId, skills]
  );
  const effectiveSkill = activeToolSkill ?? activeSkill;
  const activeModel = useMemo(
    () => modelEngines.find((model) => model.id === selectedModelId) ?? modelEngines[0],
    [selectedModelId]
  );
  const activeCharacter = useMemo(
    () => characterProfiles.find((character) => character.id === selectedCharacterId)
      ?? characterProfiles[0]
      ?? initialCharacterProfiles[0],
    [characterProfiles, selectedCharacterId]
  );
  const activeProvider = useMemo(
    () => providerConfigForModel(selectedModelId, providerConfigs, { routingPolicy }),
    [providerConfigs, routingPolicy, selectedModelId]
  );
  const lockedVisualSettings = useMemo(
    () => ({
      ...visualSettingsFor(visualSettings.styleId, visualSettings.aspectRatio),
      characterProfileId: visualSettings.characterProfileId,
      characterVersion: visualSettings.characterVersion,
      characterLock: visualSettings.characterLock,
      characterName: visualSettings.characterName,
      characterReferenceUrl: visualSettings.characterReferenceUrl,
      referenceFaceUrls: visualSettings.referenceFaceUrls,
      identityEncoder: visualSettings.identityEncoder,
      identityVectorId: visualSettings.identityVectorId,
      identityDimensions: visualSettings.identityDimensions,
      identityConsistencyScore: visualSettings.identityConsistencyScore,
      identityStrength: visualSettings.identityStrength,
      characterStrength: visualSettings.characterStrength,
      seed: visualSettings.seed,
      negativePrompt: visualSettings.negativePrompt,
      statePreset: visualSettings.statePreset,
      styleStrength: visualSettings.styleStrength,
      promptStrength: visualSettings.promptStrength,
      stateStrength: visualSettings.stateStrength,
      generationCount: visualSettings.generationCount,
      memorySceneIds: visualSettings.memorySceneIds,
      characterLoraAssetId: visualSettings.characterLoraAssetId,
      characterLoraName: visualSettings.characterLoraName,
      characterLoraId: visualSettings.characterLoraId,
      characterLoraUrl: visualSettings.characterLoraUrl,
      characterLoraBaseModel: visualSettings.characterLoraBaseModel,
      characterLoraTriggerWords: visualSettings.characterLoraTriggerWords,
      characterLoraWeight: visualSettings.characterLoraWeight
    }),
    [
      visualSettings.aspectRatio,
      visualSettings.characterProfileId,
      visualSettings.characterVersion,
      visualSettings.characterLock,
      visualSettings.identityConsistencyScore,
      visualSettings.identityDimensions,
      visualSettings.identityEncoder,
      visualSettings.identityStrength,
      visualSettings.identityVectorId,
      visualSettings.characterLoraAssetId,
      visualSettings.characterLoraBaseModel,
      visualSettings.characterLoraId,
      visualSettings.characterLoraName,
      visualSettings.characterLoraTriggerWords,
      visualSettings.characterLoraUrl,
      visualSettings.characterLoraWeight,
      visualSettings.characterName,
      visualSettings.generationCount,
      visualSettings.memorySceneIds,
      visualSettings.negativePrompt,
      visualSettings.promptStrength,
      visualSettings.referenceFaceUrls,
      visualSettings.characterReferenceUrl,
      visualSettings.characterStrength,
      visualSettings.seed,
      visualSettings.statePreset,
      visualSettings.stateStrength,
      visualSettings.styleStrength,
      visualSettings.styleId
    ]
  );
  const activeVisualSettings = visualControlModes.has(activeMode) ? lockedVisualSettings : undefined;

  useEffect(() => {
    const skillMode = modeForSkill(activeSkill);
    if (activeMode !== skillMode) {
      setActiveMode(skillMode);
    }
  }, [activeMode, activeSkill]);

  useEffect(() => {
    if (selectedToolSkillId && !skills.some((skill) => skill.id === selectedToolSkillId && isToolSkill(skill))) {
      setSelectedToolSkillId("");
    }
  }, [selectedToolSkillId, skills]);

  async function refreshWorkspaceDirectory() {
    const response = await fetch("/api/workspaces");
    if (!response.ok) return;

    const payload = (await response.json()) as WorkspaceDirectoryResponse;
    const activeWorkspace = payload.workspaces.find((workspace) => workspace.id === payload.activeWorkspaceId);
    setSessionUser(payload.user);
    setWorkspaces(payload.workspaces);
    setWorkspaceId(payload.activeWorkspaceId);
    if (activeWorkspace) setWorkspaceName(activeWorkspace.name);
  }

  async function refreshBillingSummary() {
    const response = await fetch("/api/billing/usage");
    if (!response.ok) return;

    const payload = (await response.json()) as { summary?: BillingSummary };
    if (payload.summary) setBillingSummary(payload.summary);
  }

  useEffect(() => {
    let cancelled = false;

    async function hydrateWorkspace() {
      // Server is the source of truth: every mutation goes through a dedicated
      // /api route and GET /api/workspace returns the full state. Hydrate from
      // the server FIRST so a reload reflects server-side changes (other tabs,
      // async job completion, out-of-band deletes). Fall back to the local
      // snapshot only when the server is unreachable.
      try {
        const response = await fetch("/api/workspace");
        if (!response.ok) throw new Error("workspace fetch failed");
        const parsed = (await response.json()) as Partial<{
          workspaceId: string;
          workspaceName: string;
          ownerEmail: string;
        }> & WorkspaceSnapshotPayload;
        if (!cancelled) applyWorkspaceSnapshot(parsed);
        await refreshWorkspaceDirectory();
        return;
      } catch {
        // server unreachable — fall back to the local snapshot below
      }

      const stored = window.localStorage.getItem(appStorageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as WorkspaceSnapshotPayload;
          if (!cancelled) applyWorkspaceSnapshot(parsed);
          return;
        } catch {
          window.localStorage.removeItem(appStorageKey);
        }
      }

      if (!cancelled) setHydrated(true);
    }

    function applyWorkspaceSnapshot(parsed: WorkspaceSnapshotPayload) {
      if (parsed.workspaceId) setWorkspaceId(parsed.workspaceId);
      if (parsed.workspaceName) setWorkspaceName(parsed.workspaceName);
      if (parsed.ownerEmail) {
        setSessionUser((current) => ({ ...current, email: parsed.ownerEmail as string }));
      }
      if (parsed.activeMode) setActiveMode(parsed.activeMode);
      if (parsed.selectedProductId) setSelectedProductId(parsed.selectedProductId);
      if (parsed.selectedSkillId) setSelectedSkillId(parsed.selectedSkillId);
      if (typeof parsed.selectedToolSkillId === "string") setSelectedToolSkillId(parsed.selectedToolSkillId);
      if (parsed.selectedModelId) setSelectedModelId(parsed.selectedModelId);
      if (parsed.selectedCharacterId) setSelectedCharacterId(parsed.selectedCharacterId);
      if (parsed.visualSettings) {
        setVisualSettings({
          ...visualSettingsFor(parsed.visualSettings.styleId, parsed.visualSettings.aspectRatio),
          characterProfileId: parsed.visualSettings.characterProfileId ?? initialCharacterProfiles[0].id,
          characterVersion: parsed.visualSettings.characterVersion ?? initialCharacterProfiles[0].version,
          characterLock: parsed.visualSettings.characterLock ?? true,
          characterName: parsed.visualSettings.characterName ?? initialCharacterProfiles[0].name,
          characterReferenceUrl: parsed.visualSettings.characterReferenceUrl ?? initialCharacterProfiles[0].identity.faceReferenceUrls[0],
          referenceFaceUrls: parsed.visualSettings.referenceFaceUrls ?? initialCharacterProfiles[0].identity.faceReferenceUrls,
          identityEncoder: parsed.visualSettings.identityEncoder ?? initialCharacterProfiles[0].identity.encoder,
          identityVectorId: parsed.visualSettings.identityVectorId ?? initialCharacterProfiles[0].identity.vectorId,
          identityDimensions: parsed.visualSettings.identityDimensions ?? initialCharacterProfiles[0].identity.dimensions,
          identityConsistencyScore: parsed.visualSettings.identityConsistencyScore ?? initialCharacterProfiles[0].identity.consistencyScore,
          identityStrength: parsed.visualSettings.identityStrength ?? initialCharacterProfiles[0].fusion.identity,
          characterStrength: parsed.visualSettings.characterStrength ?? initialCharacterProfiles[0].fusion.identity,
          seed: parsed.visualSettings.seed ?? "",
          negativePrompt: parsed.visualSettings.negativePrompt ?? "模糊，低质量，畸形，过曝，变形，噪点，换脸，脸部不一致",
          statePreset: parsed.visualSettings.statePreset ?? "calm",
          styleStrength: parsed.visualSettings.styleStrength ?? initialCharacterProfiles[0].fusion.style,
          promptStrength: parsed.visualSettings.promptStrength ?? initialCharacterProfiles[0].fusion.prompt,
          stateStrength: parsed.visualSettings.stateStrength ?? initialCharacterProfiles[0].fusion.state,
          generationCount: parsed.visualSettings.generationCount ?? 4,
          memorySceneIds: parsed.visualSettings.memorySceneIds ?? initialCharacterProfiles[0].memory.map((entry) => entry.id),
          characterLoraAssetId: parsed.visualSettings.characterLoraAssetId ?? initialLoraAssets[0].id,
          characterLoraName: parsed.visualSettings.characterLoraName ?? initialLoraAssets[0].name,
          characterLoraId: parsed.visualSettings.characterLoraId ?? initialLoraAssets[0].fileName,
          characterLoraUrl: parsed.visualSettings.characterLoraUrl ?? initialLoraAssets[0].url,
          characterLoraBaseModel: parsed.visualSettings.characterLoraBaseModel ?? initialLoraAssets[0].baseModel,
          characterLoraTriggerWords: parsed.visualSettings.characterLoraTriggerWords ?? initialLoraAssets[0].triggerWords,
          characterLoraWeight: parsed.visualSettings.characterLoraWeight ?? 0.72
        });
      }
      if (parsed.messages?.length) setMessages(parsed.messages);
      if (parsed.artifacts?.length) setArtifacts(parsed.artifacts);
      if (parsed.tasks?.length) setTasks(parsed.tasks);
      if (parsed.products?.length) setProducts(parsed.products);
      if (parsed.materials) setMaterials(parsed.materials);
      if (parsed.loraAssets) setLoraAssets(parsed.loraAssets.length ? parsed.loraAssets : initialLoraAssets);
      if (parsed.characterProfiles) setCharacterProfiles(parsed.characterProfiles.length ? parsed.characterProfiles : initialCharacterProfiles);
      if (parsed.publishPlan) setPublishPlan(parsed.publishPlan);
      if (parsed.skills?.length) setSkills(mergeDefaultSkills(parsed.skills));
      if (parsed.providerConfigs?.length) {
        setProviderConfigs(
          gatewayProviderPresets.map((preset) => ({
            ...preset,
            ...parsed.providerConfigs?.find((config) => config.id === preset.id)
          }))
        );
      }
      if (parsed.routingPolicy) setRoutingPolicy(parsed.routingPolicy);
      skipNextSaveRef.current = true;
      setHydrated(true);
    }

    hydrateWorkspace();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void refreshBillingSummary();
  }, [hydrated, tasks]);

  useEffect(() => {
    if (!hydrated) return;

    const snapshot = {
      workspaceId,
      workspaceName,
      ownerEmail: sessionUser.email,
      activeMode,
      selectedProductId,
      selectedSkillId,
      selectedToolSkillId,
      selectedModelId,
      selectedCharacterId,
      visualSettings: lockedVisualSettings,
      messages,
      artifacts,
      tasks,
      products,
      materials,
      loraAssets,
      characterProfiles,
      publishPlan,
      skills,
      providerConfigs,
      routingPolicy
    };

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      window.localStorage.setItem(
        appStorageKey,
        JSON.stringify({
          ...snapshot,
          providerConfigs: sanitizeProvidersForBrowser(providerConfigs)
        })
      );
      return;
    }

    window.localStorage.setItem(
      appStorageKey,
      JSON.stringify({
        ...snapshot,
        providerConfigs: sanitizeProvidersForBrowser(providerConfigs)
      })
    );

    const timeout = window.setTimeout(() => {
      void fetch("/api/workspace", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          workspaceId,
          workspaceName,
          ownerEmail: sessionUser.email,
          activeMode,
          selectedProductId,
          selectedSkillId,
          selectedToolSkillId,
          selectedModelId,
          selectedCharacterId,
          visualSettings: lockedVisualSettings,
          characterProfiles,
          providerConfigs,
          routingPolicy
        })
      });
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [
    activeMode,
    artifacts,
    hydrated,
    sessionUser.email,
    messages,
    materials,
    loraAssets,
    characterProfiles,
    publishPlan,
    products,
    skills,
    providerConfigs,
    routingPolicy,
    lockedVisualSettings,
    selectedModelId,
    selectedProductId,
    selectedSkillId,
    selectedToolSkillId,
    selectedCharacterId,
    tasks,
    workspaceId,
    workspaceName
  ]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    let ignore = false;
    const timeout = window.setTimeout(async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) return;
      const payload = (await response.json()) as { results: SearchResult[] };
      if (!ignore) setSearchResults(payload.results);
    }, 180);

    return () => {
      ignore = true;
      window.clearTimeout(timeout);
    };
  }, [searchQuery]);

  function openSearchResult(result: SearchResult) {
    if (result.nav === "products") setSelectedProductId(result.targetId);
    if (result.nav === "skills") selectSkill(result.targetId);
    setActiveNav(result.nav);
    setSearchQuery("");
    setSearchResults([]);
  }

  async function switchWorkspace(nextWorkspaceId: string) {
    if (!nextWorkspaceId || nextWorkspaceId === workspaceId || workspaceBusy) return;

    setWorkspaceBusy(true);
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: sessionUser.email,
        name: sessionUser.name,
        workspaceId: nextWorkspaceId
      })
    });

    if (!response.ok) {
      setWorkspaceBusy(false);
      return;
    }

    window.localStorage.removeItem(appStorageKey);
    window.location.reload();
  }

  async function createNewWorkspace() {
    if (workspaceBusy) return;

    setWorkspaceBusy(true);
    const response = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `工作区 ${workspaces.length + 1}` })
    });

    if (!response.ok) {
      setWorkspaceBusy(false);
      return;
    }

    window.localStorage.removeItem(appStorageKey);
    window.location.reload();
  }

  function applySkillSelection(skill: RouteSkill) {
    const nextMode = modeForSkill(skill);
    setSelectedSkillId(skill.id);
    setActiveMode(nextMode);
    setSelectedModelId(modelIdForSkill(skill, nextMode));
  }

  function selectSkill(skillId: string, skillList = skills) {
    const nextSkill = skillList.find((skill) => skill.id === skillId);
    if (nextSkill) {
      applySkillSelection(nextSkill);
      return;
    }

    setSelectedSkillId(skillId);
  }

  function visualSettingsForCharacter(character: CharacterProfile, currentSettings = visualSettings) {
    const characterLora = character.style.loraAssetId
      ? loraAssets.find((asset) => asset.id === character.style.loraAssetId)
      : undefined;
    const nextStyle = visualSettingsFor(character.style.presetId, currentSettings.aspectRatio);
    return {
      ...nextStyle,
      characterProfileId: character.id,
      characterVersion: character.version,
      characterLock: true,
      characterName: character.name,
      characterReferenceUrl: character.identity.faceReferenceUrls[0] ?? currentSettings.characterReferenceUrl ?? "",
      referenceFaceUrls: character.identity.faceReferenceUrls,
      identityEncoder: character.identity.encoder,
      identityVectorId: character.identity.vectorId,
      identityDimensions: character.identity.dimensions,
      identityConsistencyScore: character.identity.consistencyScore,
      identityStrength: character.fusion.identity,
      characterStrength: character.fusion.identity,
      seed: currentSettings.seed ?? "",
      negativePrompt: currentSettings.negativePrompt ?? "模糊，低质量，畸形，过曝，变形，噪点，换脸，脸部不一致",
      statePreset: currentSettings.statePreset ?? "calm",
      styleStrength: character.fusion.style,
      promptStrength: character.fusion.prompt,
      stateStrength: character.fusion.state,
      generationCount: currentSettings.generationCount ?? 4,
      memorySceneIds: character.memory.map((entry) => entry.id),
      characterLoraAssetId: characterLora?.id ?? currentSettings.characterLoraAssetId,
      characterLoraName: characterLora?.name ?? currentSettings.characterLoraName,
      characterLoraId: characterLora?.fileName ?? currentSettings.characterLoraId,
      characterLoraUrl: characterLora?.url ?? currentSettings.characterLoraUrl,
      characterLoraBaseModel: characterLora?.baseModel ?? currentSettings.characterLoraBaseModel,
      characterLoraTriggerWords: [
        ...(characterLora?.triggerWords ?? []),
        ...character.style.triggerWords
      ].filter((value, index, array) => value && array.indexOf(value) === index),
      characterLoraWeight: characterLora?.defaultWeight ?? currentSettings.characterLoraWeight ?? 0.72
    };
  }

  function selectCharacterProfile(id: string) {
    const character = characterProfiles.find((item) => item.id === id);
    if (!character) return;
    setSelectedCharacterId(character.id);
    setVisualSettings(visualSettingsForCharacter(character));
  }

  async function createCharacterProfile() {
    const now = new Date().toISOString();
    const base = activeCharacter ?? initialCharacterProfiles[0];
    const character: CharacterProfile = {
      ...base,
      id: nextId("char"),
      name: "新角色",
      status: "需补图",
      identity: {
        ...base.identity,
        vectorId: `identity-draft-${Date.now()}`,
        faceReferenceUrls: [],
        consistencyScore: 0
      },
      memory: [],
      version: "v1",
      createdAt: now,
      lastUsedAt: now
    };

    setCharacterProfiles((current) => [character, ...current]);
    setSelectedCharacterId(character.id);
    setVisualSettings(visualSettingsForCharacter(character));
    await fetch("/api/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(character)
    });
    return character;
  }

  async function updateCharacterProfile(character: CharacterProfile) {
    setCharacterProfiles((current) => current.map((item) => (item.id === character.id ? character : item)));
    if (selectedCharacterId === character.id) {
      setVisualSettings(visualSettingsForCharacter(character));
    }
    await fetch("/api/characters", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(character)
    });
  }

  async function deleteCharacterProfile(id: string) {
    const nextCharacters = characterProfiles.filter((character) => character.id !== id);
    setCharacterProfiles(nextCharacters);
    if (selectedCharacterId === id) {
      const fallback = nextCharacters[0] ?? initialCharacterProfiles[0];
      setSelectedCharacterId(fallback.id);
      setVisualSettings(visualSettingsForCharacter(fallback));
    }
    await fetch("/api/characters", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
  }

  async function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const userText = prompt.trim() || defaultPrompt;
    const taskId = nextId("task");
    let activeTaskId = taskId;
    const userMessage: Message = {
      id: nextId("msg"),
      role: "user",
      text: userText,
      meta: `${activeMode} / ${effectiveSkill.name}${skillNeedsProductContext(activeSkill) ? ` / ${activeProduct.name}` : ""}${activeVisualSettings ? ` / ${activeVisualSettings.styleName} ${activeVisualSettings.aspectRatio}` : ""}`
    };
    const newTask: GenerationTask = {
      id: taskId,
      title: `${activeMode}任务：${userText.slice(0, 16)}${userText.length > 16 ? "..." : ""}`,
      type: activeMode,
      model: activeModel.name,
      cost: estimateCost(activeMode),
      status: "生成中",
      progress: asyncModes.has(activeMode) ? 10 : undefined,
      visualSettings: activeVisualSettings
    };

    setBusy(true);
    setPrompt("");
    setMessages((current) => [...current, userMessage]);
    setTasks((current) => [newTask, ...current]);

    try {
      if (asyncModes.has(activeMode)) {
        const jobResponse = await fetch("/api/jobs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt: userText,
            mode: activeMode,
            product: activeProduct,
            skill: effectiveSkill,
            model: activeModel,
            visualSettings: activeVisualSettings,
            materials: materials.slice(0, 8)
          })
        });

        if (!jobResponse.ok) {
          const payload = (await jobResponse.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error ?? "异步任务创建失败");
        }

        const created = (await jobResponse.json()) as JobResponse;
        activeTaskId = created.task.id;
        setTasks((current) => current.map((task) => (task.id === taskId ? created.task : task)));
        await pollGenerationJob(created.task.id);
        return;
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: userText,
          mode: activeMode,
          product: activeProduct,
          skill: effectiveSkill,
          model: activeModel,
          provider: activeProvider,
          visualSettings: activeVisualSettings,
          history: messages.slice(-6),
          materials: materials.slice(0, 8)
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "生成请求失败");
      }

      const result = (await response.json()) as GenerateResponse;

      setArtifacts((current) => [result.artifact, ...current]);
      setTasks((current) =>
        current.map((task) => (task.id === taskId ? { ...result.task, id: taskId } : task))
      );
      setMessages((current) => [...current, result.assistantMessage]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成失败";
      const assistantMessage: Message = {
        id: nextId("msg"),
        role: "assistant",
        text: `这次生成没有完成：${message}`,
        meta: "模型网关错误"
      };

      setTasks((current) =>
        current.map((task) => (task.id === activeTaskId || task.id === taskId ? { ...task, status: "失败", cost: "未扣费" } : task))
      );
      setMessages((current) => [...current, assistantMessage]);
    } finally {
      setBusy(false);
    }
  }

  async function submitBatchPrompts(value: string) {
    const prompts = value.split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 12);
    if (busy || prompts.length === 0) return;

    setBusy(true);

    try {
      const response = await fetch("/api/batch/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompts,
          mode: activeMode,
          product: activeProduct,
          skill: effectiveSkill,
          model: activeModel,
          visualSettings: activeVisualSettings
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "批量生成失败");
      }

      const payload = (await response.json()) as {
        tasks: GenerationTask[];
        artifacts: Artifact[];
      };

      setTasks((current) => [...payload.tasks, ...current]);
      if (payload.artifacts.length) {
        setArtifacts((current) => [...payload.artifacts, ...current]);
      }
      setMessages((current) => [
        ...current,
        {
          id: nextId("msg"),
          role: "assistant",
          text: `已创建 ${payload.tasks.length} 个批量任务。${payload.artifacts.length ? "文本结果已进入作品集。" : "多模态任务已进入任务流。"}`,
          meta: "斑马线批量生成"
        }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: nextId("msg"),
          role: "assistant",
          text: `批量生成没有完成：${error instanceof Error ? error.message : "未知错误"}`,
          meta: "批量生成错误"
        }
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function pollGenerationJob(jobId: string) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      const response = await fetch(`/api/jobs?id=${encodeURIComponent(jobId)}`);

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "异步任务轮询失败");
      }

      const payload = (await response.json()) as JobResponse;
      setTasks((current) =>
        current.map((task) => (task.id === jobId ? payload.task : task))
      );

      if (payload.artifact) {
        setArtifacts((current) =>
          current.some((artifact) => artifact.id === payload.artifact?.id)
            ? current
            : [payload.artifact as Artifact, ...current]
        );
      }

      if (payload.assistantMessage) {
        setMessages((current) =>
          current.some((message) => message.id === payload.assistantMessage?.id)
            ? current
            : [...current, payload.assistantMessage as Message]
        );
      }

      if (payload.task.status === "已完成") {
        await refreshWorkspaceState();
        return;
      }
    }

    throw new Error("异步任务仍在生成，请稍后到任务流刷新。");
  }

  async function addProduct() {
    const product: ProductProfile = {
      id: nextId("product"),
      name: "未命名商品",
      category: "待填写",
      price: "待填写",
      audience: "待填写目标人群",
      stage: "草稿",
      platform: "待选择平台",
      tone: "待定义",
      assets: 0,
      notes: ["点击后续版本可编辑商品卖点", "当前 MVP 先预留商品档案结构"]
    };

    setProducts((current) => [product, ...current]);
    setSelectedProductId(product.id);
    setActiveNav("products");
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product)
    });
  }

  async function updateProduct(product: ProductProfile) {
    setProducts((current) => current.map((item) => (item.id === product.id ? product : item)));
    await fetch("/api/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product)
    });
  }

  async function deleteProduct(id: string) {
    const nextProducts = products.filter((product) => product.id !== id);
    setProducts(nextProducts);
    if (selectedProductId === id) {
      setSelectedProductId(nextProducts[0]?.id ?? productProfiles[0].id);
    }
    await fetch("/api/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
  }

  async function importProducts(file: File) {
    const form = new FormData();
    form.append("file", file);

    const response = await fetch("/api/products/import", {
      method: "POST",
      body: form
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? "商品导入失败");
    }

    const payload = (await response.json()) as ProductImportResponse;
    setProducts(payload.products);

    if (payload.importedProducts[0]) {
      setSelectedProductId(payload.importedProducts[0].id);
    }

    setActiveNav("products");
    return payload;
  }

  async function createCampaignPack(product: ProductProfile) {
    const response = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? "内容包生成失败");
    }

    const payload = (await response.json()) as CampaignPackResponse;
    setArtifacts((current) => [...payload.artifacts, ...current]);
    setTasks((current) => [...payload.tasks, ...current]);
    setMessages((current) => [...current, payload.assistantMessage]);
    return payload;
  }

  async function uploadMaterial(file: File, tags: string[]) {
    const form = new FormData();
    form.append("file", file);
    form.append("tags", tags.join(","));

    const response = await fetch("/api/materials", {
      method: "POST",
      body: form
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? "素材上传失败");
    }

    const payload = (await response.json()) as { material: MaterialAsset; materials: MaterialAsset[] };
    setMaterials(payload.materials);
    return payload.material;
  }

  async function uploadLoraAsset(file: File, options: {
    name?: string;
    kind?: LoraAsset["kind"];
    baseModel?: string;
    triggerWords?: string[];
    defaultWeight?: number;
    previewUrl?: string;
  } = {}) {
    const form = new FormData();
    form.append("file", file);
    if (options.name) form.append("name", options.name);
    if (options.kind) form.append("kind", options.kind);
    if (options.baseModel) form.append("baseModel", options.baseModel);
    if (options.triggerWords?.length) form.append("triggerWords", options.triggerWords.join(","));
    if (typeof options.defaultWeight === "number") form.append("defaultWeight", String(options.defaultWeight));
    if (options.previewUrl) form.append("previewUrl", options.previewUrl);

    const response = await fetch("/api/loras", {
      method: "POST",
      body: form
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? "LoRA 上传失败");
    }

    const payload = (await response.json()) as { loraAsset: LoraAsset; loraAssets: LoraAsset[] };
    setLoraAssets(payload.loraAssets);
    return payload.loraAsset;
  }

  async function deleteMaterialAsset(id: string) {
    setMaterials((current) => current.filter((material) => material.id !== id));
    await fetch("/api/materials", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
  }

  async function deleteLoraAssetById(id: string) {
    setLoraAssets((current) => current.filter((asset) => asset.id !== id));
    if (visualSettings.characterLoraAssetId === id) {
      setVisualSettings({
        ...visualSettings,
        characterLoraAssetId: "",
        characterLoraName: "",
        characterLoraId: "",
        characterLoraUrl: "",
        characterLoraBaseModel: "",
        characterLoraTriggerWords: [],
        characterLoraWeight: 0.72
      });
    }
    await fetch("/api/loras", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
  }

  async function updateArtifact(artifact: Artifact) {
    setArtifacts((current) => current.map((item) => (item.id === artifact.id ? artifact : item)));
    await fetch("/api/artifacts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(artifact)
    });
  }

  async function deleteArtifact(id: string) {
    setArtifacts((current) => current.filter((artifact) => artifact.id !== id));
    await fetch("/api/artifacts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
  }

  async function scheduleArtifact(artifact: Artifact) {
    const response = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artifactIds: [artifact.id] })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? "发布排期失败");
    }

    const payload = (await response.json()) as { items: PublishPlanItem[]; publishPlan: PublishPlanItem[] };
    setPublishPlan(payload.publishPlan);
    setActiveNav("calendar");
    return payload.items;
  }

  async function updatePublishPlanItem(item: PublishPlanItem) {
    setPublishPlan((current) => current.map((planItem) => (planItem.id === item.id ? item : planItem)));
    await fetch("/api/calendar", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    });
  }

  async function deletePublishPlan(id: string) {
    setPublishPlan((current) => current.filter((item) => item.id !== id));
    await fetch("/api/calendar", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
  }

  async function downloadArtifacts(format: "md" | "json") {
    const response = await fetch(`/api/export?format=${format}`);
    if (!response.ok) return;

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = format === "json" ? "bmxian-artifacts.json" : "bmxian-artifacts.md";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  }

  async function deleteTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
    await fetch("/api/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
  }

  async function retryTask(id: string) {
    const response = await fetch("/api/jobs/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });

    if (!response.ok) return;

    const payload = (await response.json()) as { task: GenerationTask };
    setTasks((current) => current.map((task) => (task.id === id ? payload.task : task)));

    try {
      await pollGenerationJob(id);
    } catch {
      setTasks((current) =>
        current.map((task) => (task.id === id ? { ...task, status: "失败", cost: "未扣费" } : task))
      );
    }
  }

  async function clearCompletedTasks() {
    const completedTaskIds = tasks.filter((task) => task.status === "已完成").map((task) => task.id);
    setTasks((current) => current.filter((task) => task.status !== "已完成"));
    await Promise.all(
      completedTaskIds.map((id) =>
        fetch("/api/tasks", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id })
        })
      )
    );
  }

  async function refreshWorkspaceState() {
    await fetch("/api/jobs").catch(() => undefined);
    const response = await fetch("/api/workspace");
    if (!response.ok) return;

    const snapshot = (await response.json()) as {
      tasks?: GenerationTask[];
      artifacts?: Artifact[];
      materials?: MaterialAsset[];
      loraAssets?: LoraAsset[];
      messages?: Message[];
      publishPlan?: PublishPlanItem[];
    };

    if (snapshot.tasks) setTasks(snapshot.tasks);
    if (snapshot.artifacts) setArtifacts(snapshot.artifacts);
    if (snapshot.materials) setMaterials(snapshot.materials);
    if (snapshot.loraAssets) setLoraAssets(snapshot.loraAssets);
    if (snapshot.messages) setMessages(snapshot.messages);
    if (snapshot.publishPlan) setPublishPlan(snapshot.publishPlan);
  }

  async function updateSkill(skill: RouteSkill) {
    setSkills((current) => current.map((item) => (item.id === skill.id ? skill : item)));
    await fetch("/api/skills", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(skill)
    });
  }

  async function createSkill(skill: RouteSkill, options: { select?: boolean } = {}) {
    setSkills((current) => [skill, ...current]);
    if (options.select ?? true) {
      applySkillSelection(skill);
    }
    await fetch("/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(skill)
    });
  }

  async function deleteSkill(id: string) {
    const nextSkills = skills.filter((skill) => skill.id !== id);
    setSkills(nextSkills);
    if (selectedToolSkillId === id) {
      setSelectedToolSkillId("");
    }
    if (selectedSkillId === id) {
      selectSkill(nextSkills[0]?.id ?? initialRouteSkills[0].id, nextSkills.length ? nextSkills : initialRouteSkills);
    }
    await fetch("/api/skills", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
  }

  return {
    activeNav,
    setActiveNav,
    activeMode,
    selectedProductId,
    setSelectedProductId,
    selectedSkillId,
    selectSkill,
    selectedToolSkillId,
    setSelectedToolSkillId,
    selectedModelId,
    setSelectedModelId,
    visualSettings: lockedVisualSettings,
    setVisualSettings,
    prompt,
    setPrompt,
    messages,
    artifacts,
    tasks,
    products,
    materials,
    loraAssets,
    characterProfiles,
    selectedCharacterId,
    publishPlan,
    skills,
    providerConfigs,
    setProviderConfigs,
    routingPolicy,
    setRoutingPolicy,
    billingSummary,
    sessionUser,
    workspaceId,
    workspaceName,
    workspaces,
    workspaceBusy,
    searchQuery,
    setSearchQuery,
    searchResults,
    busy,
    activeProduct,
    activeSkill,
    activeToolSkill,
    activeModel,
    activeCharacter,
    openSearchResult,
    switchWorkspace,
    createNewWorkspace,
    submitPrompt,
    submitBatchPrompts,
    addProduct,
    updateProduct,
    deleteProduct,
    importProducts,
    createCampaignPack,
    uploadMaterial,
    uploadLoraAsset,
    selectCharacterProfile,
    createCharacterProfile,
    updateCharacterProfile,
    deleteCharacterProfile,
    deleteMaterial: deleteMaterialAsset,
    deleteLoraAsset: deleteLoraAssetById,
    updateArtifact,
    deleteArtifact,
    scheduleArtifact,
    downloadArtifacts,
    updatePublishPlanItem,
    deletePublishPlan,
    deleteTask,
    retryTask,
    clearCompletedTasks,
    refreshWorkspaceState,
    createSkill,
    updateSkill,
    deleteSkill
  };
}

type WorkbenchValue = ReturnType<typeof useWorkbenchValue>;

const WorkbenchContext = createContext<WorkbenchValue | null>(null);

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const value = useWorkbenchValue();
  return <WorkbenchContext.Provider value={value}>{children}</WorkbenchContext.Provider>;
}

export function useWorkbench() {
  const context = useContext(WorkbenchContext);
  if (!context) {
    throw new Error("useWorkbench must be used within a WorkbenchProvider");
  }
  return context;
}
