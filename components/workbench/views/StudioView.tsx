"use client";

import { useState, type FormEvent } from "react";
import {
  ChevronRight,
  CircleDot,
  Clock3,
  Download,
  Grid2X2,
  Heart,
  LockKeyhole,
  MoreHorizontal,
  Plus,
  RefreshCw,
  SendHorizontal,
  SlidersHorizontal,
  SquarePen,
  Trash2,
  WandSparkles,
  Workflow
} from "lucide-react";
import { modelEngines, visualAspectRatios, visualStylePresets } from "@/lib/workbench-data";
import type { Artifact, CharacterProfile, LoraAsset, MaterialAsset, RouteSkill, VisualAspectRatio, VisualGenerationSettings } from "@/lib/workbench-data";
import { MediaPreview, StatusPill, artifactMediaUrl, cx, formatBytes, isPrimaryRouteSkill, isToolSkill, modeForSkill, modeGuideFor, modelIdForSkill, skillNeedsProductContext, visualControlModes, visualSettingsFor } from "../shared";
import { routeSkills as initialRouteSkills } from "@/lib/workbench-data";
import { useWorkbench } from "../store";

export function StudioView() {
  const { activeMode, activeProduct, selectedProductId, setSelectedProductId, selectedSkillId, selectedToolSkillId, setSelectedToolSkillId, selectSkill, selectedModelId, setSelectedModelId, messages, artifacts, tasks, prompt, setPrompt, submitPrompt, submitBatchPrompts, busy, products, materials, uploadMaterial, loraAssets, uploadLoraAsset, characterProfiles, selectedCharacterId, activeCharacter, selectCharacterProfile, createCharacterProfile, updateCharacterProfile, deleteCharacterProfile, skills, activeSkill, activeToolSkill, activeModel, visualSettings, setVisualSettings } = useWorkbench();
  const visibleMessages = messages.slice(-30);
  const modeGuide = modeGuideFor(activeMode, activeProduct);
  const needsProductContext = skillNeedsProductContext(activeSkill);
  const showsVisualControls = visualControlModes.has(activeMode);
  const chatHistory = messages.slice(-8).reverse();
  const primarySkills = skills.filter(isPrimaryRouteSkill);
  const toolSkills = skills.filter(isToolSkill);
  const quickSkills = primarySkills.slice(0, 8);
  const selectedPrimarySkillId = primarySkills.some((skill) => skill.id === selectedSkillId)
    ? selectedSkillId
    : primarySkills[0]?.id ?? initialRouteSkills[0].id;
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchText, setBatchText] = useState("小红书标题 1：夏天通勤不闷的防晒衣\n小红书标题 2：旅行防晒穿搭清单\n详情页首屏：轻薄冰感卖点");

  function applyVisualPreset(styleId: string, aspectRatio: VisualAspectRatio) {
    const preset = visualSettingsFor(styleId, aspectRatio);
    setVisualSettings({
      ...visualSettings,
      aspectRatio: preset.aspectRatio,
      styleId: preset.styleId,
      styleName: preset.styleName,
      stylePrompt: preset.stylePrompt,
      lockStyle: preset.lockStyle,
      styleLoraId: preset.styleLoraId,
      loraWeight: preset.loraWeight,
      triggerWords: preset.triggerWords,
      baseModel: preset.baseModel,
      referenceImage: preset.referenceImage,
      styleVersion: preset.styleVersion
    });
  }

  function choosePrimarySkill(skillId: string) {
    setSelectedToolSkillId("");
    selectSkill(skillId);
  }

  function chooseToolSkill(skillId: string) {
    setSelectedToolSkillId(skillId);
    const nextSkill = toolSkills.find((skill) => skill.id === skillId);
    if (nextSkill) {
      setSelectedModelId(modelIdForSkill(nextSkill, modeForSkill(nextSkill)));
    }
  }

  function chooseAspectRatio(aspectRatio: VisualAspectRatio) {
    applyVisualPreset(visualSettings.styleId, aspectRatio);
  }

  function chooseVisualStyle(styleId: string) {
    applyVisualPreset(styleId, visualSettings.aspectRatio);
  }

  function updateCharacterSettings(patch: Partial<VisualGenerationSettings>) {
    setVisualSettings({ ...visualSettings, ...patch });
  }

  function selectCharacterLora(assetId: string) {
    const asset = loraAssets.find((item) => item.id === assetId);
    if (!asset) {
      updateCharacterSettings({
        characterLoraAssetId: "",
        characterLoraName: "",
        characterLoraId: "",
        characterLoraUrl: "",
        characterLoraBaseModel: "",
        characterLoraTriggerWords: [],
        characterLoraWeight: 0.72
      });
      return;
    }

    updateCharacterSettings({
      characterLock: true,
      characterName: visualSettings.characterName && visualSettings.characterName !== "固定角色"
        ? visualSettings.characterName
        : activeCharacter.name,
      characterLoraAssetId: asset.id,
      characterLoraName: asset.name,
      characterLoraId: asset.fileName,
      characterLoraUrl: asset.url,
      characterLoraBaseModel: asset.baseModel,
      characterLoraTriggerWords: asset.triggerWords,
      characterLoraWeight: asset.defaultWeight
    });
  }

  if (activeMode === "图片") {
    return (
      <CharacterImageWorkspace
        activeCharacter={activeCharacter}
        artifacts={artifacts}
        busy={busy}
        characterProfiles={characterProfiles}
        chooseAspectRatio={chooseAspectRatio}
        choosePrimarySkill={choosePrimarySkill}
        chooseToolSkill={chooseToolSkill}
        chooseVisualStyle={chooseVisualStyle}
        createCharacterProfile={createCharacterProfile}
        updateCharacterProfile={updateCharacterProfile}
        deleteCharacterProfile={deleteCharacterProfile}
        loraAssets={loraAssets}
        materials={materials}
        primarySkills={primarySkills}
        prompt={prompt}
        selectedCharacterId={selectedCharacterId}
        selectedModelId={selectedModelId}
        selectedPrimarySkillId={selectedPrimarySkillId}
        selectedToolSkillId={selectedToolSkillId}
        setPrompt={setPrompt}
        setSelectedModelId={setSelectedModelId}
        submitBatchPrompts={submitBatchPrompts}
        submitPrompt={submitPrompt}
        toolSkills={toolSkills}
        updateCharacterSettings={updateCharacterSettings}
        selectCharacterLora={selectCharacterLora}
        selectCharacterProfile={selectCharacterProfile}
        uploadMaterial={uploadMaterial}
        uploadLoraAsset={uploadLoraAsset}
        visualSettings={visualSettings}
      />
    );
  }

  return (
    <div className={cx("studio-grid", !needsProductContext && "chat-focused")}>
      <section className="studio-main">
        <div className="conversation-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">创作区</span>
              <h2>{needsProductContext ? "把一个想法推进到可交付内容" : "先像聊天一样把想法说出来"}</h2>
            </div>
            <div className="route-summary">
              <CircleDot size={15} />
              {activeSkill.name}
              {activeToolSkill && (
                <>
                  <ChevronRight size={14} />
                  {activeToolSkill.name}
                </>
              )}
              <ChevronRight size={14} />
              {activeModel.name}
            </div>
          </div>

          <div className="messages">
            {visibleMessages.map((message) => (
              <article className={cx("message", message.role === "user" && "user")} key={message.id}>
                <div className="message-meta">
                  <span>{message.role === "user" ? "你" : "斑马线"}</span>
                  {message.meta && <small>{message.meta}</small>}
                </div>
                <p>{message.text}</p>
              </article>
            ))}
          </div>
          <form className="composer" onSubmit={submitPrompt}>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={modeGuide.placeholder}
              rows={3}
            />
            <div className="composer-controls">
              {needsProductContext && (
                <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} aria-label="商品档案">
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              )}
              <select value={selectedPrimarySkillId} onChange={(event) => choosePrimarySkill(event.target.value)} aria-label="主路线">
                {primarySkills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
              <select
                value={toolSkills.some((skill) => skill.id === selectedToolSkillId) ? selectedToolSkillId : ""}
                onChange={(event) => chooseToolSkill(event.target.value)}
                aria-label="技能"
                disabled={toolSkills.length === 0}
              >
                <option value="">{toolSkills.length > 0 ? "不调用技能" : "暂无技能"}</option>
                {toolSkills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
              <button className="ghost-button" type="button" onClick={() => setPrompt(modeGuide.template)}>
                <SquarePen size={15} />
                模板
              </button>
              <button
                className="ghost-button composer-more-button"
                type="button"
                aria-label="更多"
                title="更多"
                aria-expanded={advancedOpen}
                onClick={() => setAdvancedOpen((value) => !value)}
              >
                <MoreHorizontal size={17} />
              </button>
              <button className="send-button" type="submit" disabled={busy}>
                {busy ? <Clock3 size={18} /> : <SendHorizontal size={18} />}
                {busy ? "生成中" : "生成"}
              </button>
            </div>
            {advancedOpen && (
              <div className="composer-advanced">
                <select value={selectedModelId} onChange={(event) => setSelectedModelId(event.target.value)} aria-label="引擎">
                  {modelEngines.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <button className="ghost-button" type="button" onClick={() => setBatchOpen((value) => !value)}>
                  <Workflow size={15} />
                  批量
                </button>
                {batchOpen && (
                  <div className="batch-box">
                    <textarea
                      value={batchText}
                      onChange={(event) => setBatchText(event.target.value)}
                      rows={4}
                      aria-label="批量生成内容"
                    />
                    <button
                      className="primary-compact"
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        await submitBatchPrompts(batchText);
                      }}
                    >
                      <Workflow size={16} />
                      批量生成
                    </button>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      </section>

      {needsProductContext ? (
        <aside className="studio-side">
          {showsVisualControls && (
            <VisualControlPanel
              settings={visualSettings}
              loraAssets={loraAssets}
              onSelectAspectRatio={chooseAspectRatio}
              onSelectStyle={chooseVisualStyle}
              onSelectLora={selectCharacterLora}
              onUploadLora={uploadLoraAsset}
              onUpdateCharacter={updateCharacterSettings}
            />
          )}

          <section className="context-panel">
            <div className="panel-heading compact">
              <div>
                <span className="eyebrow">技能</span>
                <h2>主要路线</h2>
              </div>
              <StatusPill status={activeSkill.name} />
            </div>
            <div className="quick-skill-list compact">
              {quickSkills.map((skill) => (
                <button
                  className={cx("quick-skill", selectedSkillId === skill.id && "active")}
                  key={skill.id}
                  type="button"
                  aria-label={`切换路线 ${skill.name}`}
                  onClick={() => choosePrimarySkill(skill.id)}
                >
                  <span>{skill.category}</span>
                  <strong>{skill.name}</strong>
                </button>
              ))}
            </div>
          </section>

          <section className="context-panel">
            <div className="panel-heading compact">
              <div>
                <span className="eyebrow">商品上下文</span>
                <h2>{activeProduct.name}</h2>
              </div>
              <StatusPill status={activeProduct.stage} />
            </div>
            <dl className="product-facts">
              <div>
                <dt>平台</dt>
                <dd>{activeProduct.platform}</dd>
              </div>
              <div>
                <dt>人群</dt>
                <dd>{activeProduct.audience}</dd>
              </div>
              <div>
                <dt>语气</dt>
                <dd>{activeProduct.tone}</dd>
              </div>
            </dl>
            <div className="tag-list">
              {activeProduct.notes.map((note) => (
                <span key={note}>{note}</span>
              ))}
            </div>
          </section>

          <section className="context-panel">
            <div className="panel-heading compact">
              <div>
                <span className="eyebrow">素材上下文</span>
                <h2>素材上下文</h2>
              </div>
              <StatusPill status={`${materials.length} 个`} />
            </div>
            <div className="material-mini-list">
              {materials.slice(0, 4).map((material) => (
                <a href={material.url} key={material.id} target="_blank" rel="noreferrer">
                  <span>{material.kind}</span>
                  <strong>{material.name}</strong>
                </a>
              ))}
              {materials.length === 0 && <p>暂无素材</p>}
            </div>
          </section>

          <section className="context-panel">
            <div className="panel-heading compact">
              <div>
                <span className="eyebrow">最近作品</span>
                <h2>最近作品</h2>
              </div>
              <button className="ghost-button" type="button">
                全部
              </button>
            </div>
            <div className="artifact-list">
              {artifacts.slice(0, 3).map((artifact) => (
                <article className="artifact-card" key={artifact.id}>
                  <div>
                    <span>{artifact.type}</span>
                    <StatusPill status={artifact.status} />
                  </div>
                  <h3>{artifact.title}</h3>
                  <MediaPreview url={artifactMediaUrl(artifact)} type={artifact.type} compact />
                  <p>{artifact.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="context-panel">
            <div className="panel-heading compact">
              <div>
                <span className="eyebrow">任务队列</span>
                <h2>任务流</h2>
              </div>
              <MoreHorizontal size={18} />
            </div>
            <div className="mini-tasks">
              {tasks.slice(0, 3).map((task) => (
                <div key={task.id}>
                  <span>{task.title}</span>
                  <StatusPill status={task.status} />
                </div>
              ))}
            </div>
          </section>
        </aside>
      ) : (
        <aside className={cx("studio-side chat-side", showsVisualControls && "has-visual-controls")}>
          {showsVisualControls && (
            <VisualControlPanel
              settings={visualSettings}
              loraAssets={loraAssets}
              onSelectAspectRatio={chooseAspectRatio}
              onSelectStyle={chooseVisualStyle}
              onSelectLora={selectCharacterLora}
              onUploadLora={uploadLoraAsset}
              onUpdateCharacter={updateCharacterSettings}
            />
          )}

          <section className="context-panel">
            <div className="panel-heading compact">
              <div>
                <span className="eyebrow">聊天历史</span>
                <h2>最近对话</h2>
              </div>
              <StatusPill status={`${chatHistory.length} 条`} />
            </div>
            <div className="chat-history-list">
              {chatHistory.map((message) => (
                <article className="chat-history-item" key={message.id}>
                  <span>{message.role === "user" ? "你" : "斑马线"}</span>
                  <p>{message.text.length > 82 ? `${message.text.slice(0, 82)}...` : message.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="context-panel">
            <div className="panel-heading compact">
              <div>
                <span className="eyebrow">技能</span>
                <h2>常用技能</h2>
              </div>
              <StatusPill status={activeSkill.name} />
            </div>
            <div className="quick-skill-list">
              {quickSkills.map((skill) => (
                <button
                  className={cx("quick-skill", selectedSkillId === skill.id && "active")}
                  key={skill.id}
                  type="button"
                  aria-label={`切换路线 ${skill.name}`}
                  onClick={() => choosePrimarySkill(skill.id)}
                >
                  <span>{skill.category}</span>
                  <strong>{skill.name}</strong>
                  <small>{skill.description}</small>
                </button>
              ))}
            </div>
          </section>
        </aside>
      )}
    </div>
  );
}

function CharacterImageWorkspace({
  activeCharacter,
  artifacts,
  busy,
  characterProfiles,
  chooseAspectRatio,
  choosePrimarySkill,
  chooseToolSkill,
  chooseVisualStyle,
  createCharacterProfile,
  updateCharacterProfile,
  deleteCharacterProfile,
  loraAssets,
  materials,
  primarySkills,
  prompt,
  selectedCharacterId,
  selectedModelId,
  selectedPrimarySkillId,
  selectedToolSkillId,
  setPrompt,
  setSelectedModelId,
  submitBatchPrompts,
  submitPrompt,
  toolSkills,
  updateCharacterSettings,
  selectCharacterLora,
  selectCharacterProfile,
  uploadMaterial,
  uploadLoraAsset,
  visualSettings
}: {
  activeCharacter: CharacterProfile;
  artifacts: Artifact[];
  busy: boolean;
  characterProfiles: CharacterProfile[];
  chooseAspectRatio: (aspectRatio: VisualAspectRatio) => void;
  choosePrimarySkill: (skillId: string) => void;
  chooseToolSkill: (skillId: string) => void;
  chooseVisualStyle: (styleId: string) => void;
  createCharacterProfile: () => Promise<CharacterProfile>;
  updateCharacterProfile: (character: CharacterProfile) => Promise<void>;
  deleteCharacterProfile: (id: string) => Promise<void>;
  loraAssets: LoraAsset[];
  materials: MaterialAsset[];
  primarySkills: RouteSkill[];
  prompt: string;
  selectedCharacterId: string;
  selectedModelId: string;
  selectedPrimarySkillId: string;
  selectedToolSkillId: string;
  setPrompt: (value: string) => void;
  setSelectedModelId: (value: string) => void;
  submitBatchPrompts: (value: string) => Promise<void>;
  submitPrompt: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  toolSkills: RouteSkill[];
  updateCharacterSettings: (patch: Partial<VisualGenerationSettings>) => void;
  selectCharacterLora: (assetId: string) => void;
  selectCharacterProfile: (id: string) => void;
  uploadMaterial: (file: File, tags: string[]) => Promise<MaterialAsset>;
  uploadLoraAsset: (file: File, options?: {
    name?: string;
    kind?: LoraAsset["kind"];
    baseModel?: string;
    triggerWords?: string[];
    defaultWeight?: number;
    previewUrl?: string;
  }) => Promise<LoraAsset>;
  visualSettings: VisualGenerationSettings;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploadingReference, setUploadingReference] = useState(false);
  const [referenceUploadError, setReferenceUploadError] = useState("");
  const generatedImages = artifacts.filter((artifact) => artifact.type === "图片" || artifact.type === "海报").slice(0, 4);
  const selectedLora = loraAssets.find((asset) => asset.id === visualSettings.characterLoraAssetId);
  const generationCount = visualSettings.generationCount ?? 4;
  const referenceUrls = activeCharacter.identity.faceReferenceUrls;

  async function submitImageGeneration(event: FormEvent<HTMLFormElement>) {
    if (generationCount <= 1) {
      await submitPrompt(event);
      return;
    }

    event.preventDefault();
    const basePrompt = prompt.trim() || "一个年轻亚洲女性，柔和自然光，户外公园，真实摄影风格，50mm 镜头，浅景深";
    await submitBatchPrompts(
      Array.from({ length: generationCount }, (_, index) => `${basePrompt}\n候选图 ${index + 1}，保持同一角色和同一风格`).join("\n")
    );
  }

  function deleteSelectedCharacter() {
    if (characterProfiles.length <= 1) return;
    if (!window.confirm(`删除角色「${activeCharacter.name}」？`)) return;
    void deleteCharacterProfile(activeCharacter.id);
  }

  async function uploadReferenceFace(files: FileList | null) {
    const file = files?.[0];
    if (!file || uploadingReference) return;

    if (!file.type.startsWith("image/")) {
      setReferenceUploadError("只能上传图片文件");
      return;
    }

    setUploadingReference(true);
    setReferenceUploadError("");
    try {
      const material = await uploadMaterial(file, ["角色参考脸", activeCharacter.name]);
      const nextUrls = [
        material.url,
        ...activeCharacter.identity.faceReferenceUrls.filter((url) => url !== material.url)
      ].slice(0, 20);
      const nextCharacter: CharacterProfile = {
        ...activeCharacter,
        identity: {
          ...activeCharacter.identity,
          faceReferenceUrls: nextUrls,
          consistencyScore: Math.max(activeCharacter.identity.consistencyScore, Math.min(96, 70 + nextUrls.length * 5))
        },
        lastUsedAt: new Date().toISOString()
      };
      await updateCharacterProfile(nextCharacter);
      updateCharacterSettings({
        characterReferenceUrl: material.url,
        referenceFaceUrls: nextUrls,
        identityConsistencyScore: nextCharacter.identity.consistencyScore
      });
    } catch (error) {
      setReferenceUploadError(error instanceof Error ? error.message : "参考图上传失败");
    } finally {
      setUploadingReference(false);
    }
  }

  return (
    <div className="character-os-shell">
      <aside className="character-generator-sidebar visual-control-panel">
        <div className="character-os-section">
          <div className="panel-heading compact">
            <div>
              <span className="eyebrow">Character</span>
              <h2>角色库</h2>
            </div>
            <div className="character-library-actions">
              <button
                className="icon-button"
                type="button"
                aria-label="创建角色"
                title="创建角色"
                onClick={() => {
                  void createCharacterProfile();
                }}
              >
                <Plus size={17} />
              </button>
              <button
                className="icon-button danger"
                type="button"
                aria-label={`删除当前角色 ${activeCharacter.name}`}
                title="删除当前角色"
                disabled={characterProfiles.length <= 1}
                onClick={deleteSelectedCharacter}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <div className="character-library-list">
            {characterProfiles.map((character) => (
              <button
                className={cx("character-card", selectedCharacterId === character.id && "active")}
                key={character.id}
                type="button"
                aria-label={`选择角色 ${character.name}`}
                onClick={() => selectCharacterProfile(character.id)}
              >
                <span className="character-avatar" aria-hidden="true">
                  <i />
                </span>
                <span>
                  <strong>{character.name}</strong>
                  <small>{character.archetype} / {character.identity.consistencyScore}%</small>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="character-os-section">
          <label className="character-field">
            <span>提示词 Prompt</span>
            <textarea
              aria-label="图片提示词"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={5}
              placeholder="一个年轻亚洲女性，柔和自然光，户外公园，真实摄影风格，50mm 镜头，浅景深"
            />
          </label>
          <label className="character-field">
            <span>反向提示词</span>
            <textarea
              aria-label="反向提示词"
              value={visualSettings.negativePrompt ?? ""}
              onChange={(event) => updateCharacterSettings({ negativePrompt: event.target.value })}
              rows={3}
              placeholder="模糊，低质量，畸形，过曝，变形，噪点"
            />
          </label>
        </div>

        <div className="character-os-section">
          <div className="panel-heading compact">
            <div>
              <span className="eyebrow">参考脸</span>
              <h2>Identity</h2>
            </div>
            <StatusPill status={`${activeCharacter.identity.consistencyScore}%`} />
          </div>
          <div className="reference-face-grid">
            {referenceUrls.slice(0, 4).map((url, index) => (
              <button
                className={cx("reference-face", visualSettings.characterReferenceUrl === url && "active")}
                key={url}
                type="button"
                aria-label={`选择参考脸 ${index + 1}`}
                onClick={() => updateCharacterSettings({ characterReferenceUrl: url })}
              >
                <ReferenceThumb url={url} />
                <span>{index + 1}</span>
              </button>
            ))}
            <label className={cx("reference-face add", uploadingReference && "disabled-control")} aria-label="添加参考脸">
              <Plus size={18} />
              <input
                type="file"
                accept="image/*"
                disabled={uploadingReference}
                onChange={(event) => {
                  void uploadReferenceFace(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          {referenceUploadError && <p className="lora-error">{referenceUploadError}</p>}
          <div className="identity-model-card">
            <strong>{activeCharacter.identity.encoder}</strong>
            <span>{activeCharacter.identity.vectorId}</span>
            <small>{activeCharacter.identity.dimensions} dim / {activeCharacter.identity.structure.jawShape}</small>
          </div>
        </div>

        <div className="character-os-section">
          <div className="style-library character-style-library" aria-label="风格库">
            {visualStylePresets.slice(0, 8).map((style) => (
              <button
                className={cx("style-card", visualSettings.styleId === style.id && "active")}
                key={style.id}
                type="button"
                aria-label={`锁定风格 ${style.name}`}
                onClick={() => chooseVisualStyle(style.id)}
              >
                <span className={cx("style-thumb", style.thumbnailClass)} aria-hidden="true">
                  <i />
                  <b />
                  <em />
                </span>
                <span className="style-copy">
                  <strong>{style.name}</strong>
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="character-generation-main">
        <div className="character-result-toolbar">
          <div>
            <span className="eyebrow">生成结果</span>
            <h2>{activeCharacter.name} / {visualSettings.styleName}</h2>
          </div>
          <div className="character-result-actions">
            <label className="checkbox-line">
              <input type="checkbox" />
              <span>仅看收藏</span>
            </label>
            <button className="icon-button" type="button" aria-label="宫格视图">
              <Grid2X2 size={17} />
            </button>
            <button className="icon-button" type="button" aria-label="高级设置" onClick={() => setShowAdvanced((value) => !value)}>
              <SlidersHorizontal size={17} />
            </button>
          </div>
        </div>

        <div className="character-result-grid">
          {Array.from({ length: 4 }, (_, index) => {
            const artifact = generatedImages[index];
            return (
              <article className="character-result-card" key={artifact?.id ?? `placeholder-${index}`}>
                {artifact ? (
                  <>
                    <MediaPreview url={artifactMediaUrl(artifact)} type={artifact.type} />
                    <h3>{artifact.title}</h3>
                  </>
                ) : (
                  <div className="portrait-placeholder">
                    <span>{activeCharacter.name}</span>
                  </div>
                )}
                <footer>
                  <button className="icon-button" type="button" aria-label="下载图片">
                    <Download size={16} />
                  </button>
                  <button className="icon-button" type="button" aria-label="收藏图片">
                    <Heart size={16} />
                  </button>
                  <button className="ghost-button" type="button">
                    <RefreshCw size={15} />
                    变体
                  </button>
                </footer>
              </article>
            );
          })}
        </div>

        <div className="reference-strip">
          <div>
            <span className="eyebrow">参考图</span>
            <strong>Identity Set</strong>
          </div>
          {referenceUrls.map((url, index) => (
            <button
              className={cx("reference-chip", visualSettings.characterReferenceUrl === url && "active")}
              key={url}
              type="button"
              onClick={() => updateCharacterSettings({ characterReferenceUrl: url })}
            >
              <ReferenceThumb url={url} />
              <span>{index + 1}</span>
            </button>
          ))}
          <label className={cx("reference-chip add", uploadingReference && "disabled-control")} aria-label="添加参考图">
            <Plus size={18} />
            <input
              type="file"
              accept="image/*"
              disabled={uploadingReference}
              onChange={(event) => {
                void uploadReferenceFace(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        {showAdvanced && (
          <div className="character-advanced-panel">
            <div>
              <span className="eyebrow">Memory</span>
              <strong>{activeCharacter.memory.map((entry) => entry.scene).join(" / ")}</strong>
            </div>
            <div>
              <span className="eyebrow">LoRA</span>
              <strong>{selectedLora?.name ?? "不使用 LoRA"}</strong>
              {selectedLora && <small>{selectedLora.triggerWords.join(", ") || selectedLora.baseModel}</small>}
            </div>
            <div className="material-mini-list">
              {materials.slice(0, 3).map((material) => (
                <a href={material.url} key={material.id} target="_blank" rel="noreferrer">
                  <span>{material.kind}</span>
                  <strong>{material.name}</strong>
                </a>
              ))}
              {materials.length === 0 && <p>暂无素材</p>}
            </div>
          </div>
        )}
      </main>

      <form className="composer character-os-controlbar" onSubmit={submitImageGeneration}>
        <select value={selectedPrimarySkillId} onChange={(event) => choosePrimarySkill(event.target.value)} aria-label="主路线">
          {primarySkills.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
            </option>
          ))}
        </select>
        <select
          value={toolSkills.some((skill) => skill.id === selectedToolSkillId) ? selectedToolSkillId : ""}
          onChange={(event) => chooseToolSkill(event.target.value)}
          aria-label="技能"
        >
          <option value="">{toolSkills.length > 0 ? "不调用技能" : "暂无技能"}</option>
          {toolSkills.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
            </option>
          ))}
        </select>
        <select value={selectedCharacterId} onChange={(event) => selectCharacterProfile(event.target.value)} aria-label="角色">
          {characterProfiles.map((character) => (
            <option key={character.id} value={character.id}>
              {character.name}
            </option>
          ))}
        </select>
        <select
          aria-label="角色 LoRA"
          value={visualSettings.characterLoraAssetId ?? ""}
          onChange={(event) => selectCharacterLora(event.target.value)}
        >
          <option value="">不使用 LoRA</option>
          {loraAssets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.name}
            </option>
          ))}
        </select>
        <label className="ghost-button lora-upload-control">
          上传
          <input
            type="file"
            accept=".safetensors,.ckpt,.pt,.bin"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void uploadLoraAsset(file, {
                  name: file.name.replace(/\.(safetensors|ckpt|pt|bin)$/i, ""),
                  kind: "角色",
                  baseModel: "SDXL / FLUX compatible",
                  triggerWords: [file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "_")],
                  defaultWeight: visualSettings.characterLoraWeight ?? 0.72
                });
              }
              event.currentTarget.value = "";
            }}
          />
        </label>
        <div className="control-slider">
          <span>Identity</span>
          <input
            aria-label="Identity 强度"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={visualSettings.identityStrength ?? visualSettings.characterStrength ?? 0.85}
            onChange={(event) => updateCharacterSettings({
              identityStrength: Number(event.target.value),
              characterStrength: Number(event.target.value)
            })}
          />
          <strong>{visualSettings.identityStrength ?? visualSettings.characterStrength ?? 0.85}</strong>
        </div>
        <div className="control-slider">
          <span>Style</span>
          <input
            aria-label="Style 强度"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={visualSettings.styleStrength ?? 0.62}
            onChange={(event) => updateCharacterSettings({ styleStrength: Number(event.target.value) })}
          />
          <strong>{visualSettings.styleStrength ?? 0.62}</strong>
        </div>
        <select
          aria-label="角色状态"
          value={visualSettings.statePreset ?? "calm"}
          onChange={(event) => updateCharacterSettings({ statePreset: event.target.value })}
        >
          <option value="calm">calm</option>
          <option value="smile">smile</option>
          <option value="confident">confident</option>
          <option value="dynamic">dynamic</option>
        </select>
        <div className="segmented-control" aria-label="尺寸 Size">
          {visualAspectRatios.map((ratio) => (
            <button
              className={cx(visualSettings.aspectRatio === ratio.id && "active")}
              key={ratio.id}
              type="button"
              onClick={() => chooseAspectRatio(ratio.id)}
            >
              {ratio.id}
            </button>
          ))}
        </div>
        <div className="segmented-control" aria-label="生成数量 Number">
          {([1, 2, 4, 8] as const).map((count) => (
            <button
              className={cx(generationCount === count && "active")}
              key={count}
              type="button"
              onClick={() => updateCharacterSettings({ generationCount: count })}
            >
              {count}
            </button>
          ))}
        </div>
        <select value={selectedModelId} onChange={(event) => setSelectedModelId(event.target.value)} aria-label="引擎">
          {modelEngines.filter((model) => model.lane.includes("图片") || model.id === "jimeng").map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
        <button className="send-button" type="submit" disabled={busy}>
          {busy ? <Clock3 size={18} /> : <WandSparkles size={18} />}
          {busy ? "生成中" : `生成 (${generationCount})`}
        </button>
      </form>
    </div>
  );
}

function ReferenceThumb({ url }: { url: string }) {
  const canRender = url.startsWith("/") || url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("blob:");
  if (!canRender) return null;
  return <img alt="" src={url} />;
}

function VisualControlPanel({
  settings,
  loraAssets,
  onSelectAspectRatio,
  onSelectStyle,
  onSelectLora,
  onUploadLora,
  onUpdateCharacter
}: {
  settings: VisualGenerationSettings;
  loraAssets: LoraAsset[];
  onSelectAspectRatio: (aspectRatio: VisualAspectRatio) => void;
  onSelectStyle: (styleId: string) => void;
  onSelectLora: (assetId: string) => void;
  onUploadLora: (file: File, options?: {
    name?: string;
    kind?: LoraAsset["kind"];
    baseModel?: string;
    triggerWords?: string[];
    defaultWeight?: number;
    previewUrl?: string;
  }) => Promise<LoraAsset>;
  onUpdateCharacter: (patch: Partial<VisualGenerationSettings>) => void;
}) {
  const activeStyle = visualStylePresets.find((style) => style.id === settings.styleId) ?? visualStylePresets[0];
  const selectedLora = loraAssets.find((asset) => asset.id === settings.characterLoraAssetId);
  const [uploadingLora, setUploadingLora] = useState(false);
  const [loraError, setLoraError] = useState("");

  async function handleLoraUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file || uploadingLora) return;

    setUploadingLora(true);
    setLoraError("");
    try {
      const created = await onUploadLora(file, {
        name: file.name.replace(/\.(safetensors|ckpt|pt|bin)$/i, ""),
        kind: "角色",
        baseModel: "SDXL / FLUX compatible",
        triggerWords: [file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "_")],
        defaultWeight: settings.characterLoraWeight ?? 0.72
      });
      onSelectLora(created.id);
    } catch (error) {
      setLoraError(error instanceof Error ? error.message : "LoRA 上传失败");
    } finally {
      setUploadingLora(false);
    }
  }

  return (
    <section className="context-panel visual-control-panel">
      <div className="panel-heading compact">
        <div>
          <span className="eyebrow">图片 / 海报</span>
          <h2>生成控制</h2>
        </div>
        <StatusPill status={`锁定 ${activeStyle.name}`} />
      </div>

      <div className="visual-control-body">
        <div className="ratio-picker" aria-label="尺寸比例">
          {visualAspectRatios.map((ratio) => (
            <button
              className={cx("ratio-button", settings.aspectRatio === ratio.id && "active")}
              key={ratio.id}
              type="button"
              aria-label={`选择比例 ${ratio.id}`}
              onClick={() => onSelectAspectRatio(ratio.id)}
            >
              <strong>{ratio.label}</strong>
            </button>
          ))}
        </div>

        <div className="style-lock-banner">
          <LockKeyhole size={15} />
          <span>强制风格统一</span>
          <strong>{settings.aspectRatio}</strong>
        </div>

        <div className="character-consistency-panel">
          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={settings.characterLock}
              onChange={(event) => onUpdateCharacter({ characterLock: event.target.checked })}
            />
            <span>角色一致性</span>
          </label>
          <input
            aria-label="角色名称"
            value={settings.characterName ?? ""}
            onChange={(event) => onUpdateCharacter({ characterName: event.target.value })}
            placeholder="角色名称"
          />
          <input
            aria-label="角色参考图"
            value={settings.characterReferenceUrl ?? ""}
            onChange={(event) => onUpdateCharacter({ characterReferenceUrl: event.target.value })}
            placeholder="角色参考图 URL"
          />
          <div className="character-grid">
            <input
              aria-label="角色强度"
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={settings.characterStrength ?? 0.82}
              onChange={(event) => onUpdateCharacter({ characterStrength: Number(event.target.value) })}
            />
            <input
              aria-label="角色 Seed"
              value={settings.seed ?? ""}
              onChange={(event) => onUpdateCharacter({ seed: event.target.value })}
              placeholder="Seed"
            />
          </div>
          <div className="lora-picker-row">
            <select
              aria-label="角色 LoRA"
              value={settings.characterLoraAssetId ?? ""}
              onChange={(event) => onSelectLora(event.target.value)}
            >
              <option value="">不使用 LoRA</option>
              {loraAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
            <label className="ghost-button lora-upload-control">
              {uploadingLora ? "上传中" : "上传"}
              <input
                type="file"
                accept=".safetensors,.ckpt,.pt,.bin"
                onChange={(event) => {
                  void handleLoraUpload(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <input
              aria-label="LoRA 权重"
              type="number"
              min="0"
              max="1.5"
              step="0.01"
              value={settings.characterLoraWeight ?? 0.72}
              onChange={(event) => onUpdateCharacter({ characterLoraWeight: Number(event.target.value) })}
            />
          </div>
          {selectedLora && (
            <div className="selected-lora-card">
              <strong>{selectedLora.name}</strong>
              <span>{selectedLora.baseModel}</span>
              <small>{selectedLora.size > 0 ? formatBytes(selectedLora.size) : "内置"} / {selectedLora.triggerWords.join(", ") || "无触发词"}</small>
            </div>
          )}
          {loraError && <p className="lora-error">{loraError}</p>}
        </div>

        <div className="style-library" aria-label="风格库">
          {visualStylePresets.map((style) => (
            <button
              className={cx("style-card", settings.styleId === style.id && "active")}
              key={style.id}
              type="button"
              aria-label={`锁定风格 ${style.name}`}
              onClick={() => onSelectStyle(style.id)}
            >
              <span className={cx("style-thumb", style.thumbnailClass)} aria-hidden="true">
                <i />
                <b />
                <em />
              </span>
              <span className="style-copy">
                <strong>{style.name}</strong>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
