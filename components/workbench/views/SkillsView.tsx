"use client";

import { useEffect, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Download, SquarePen, Trash2, Upload } from "lucide-react";
import type { MarketplaceSkill, RouteSkill } from "@/lib/workbench-data";
import { StatusPill, cx, isPrimaryRouteSkill, isToolSkill, nextId, normalizeSkillFilePayload } from "../shared";
import { routeSkills as initialRouteSkills } from "@/lib/workbench-data";
import { useWorkbench } from "../store";

export function SkillsView() {
  const { skills, selectedSkillId, selectedToolSkillId, setSelectedToolSkillId, selectSkill, setActiveNav, createSkill, updateSkill, deleteSkill } = useWorkbench();
  const activeSkill =
    skills.find((skill) => skill.id === selectedToolSkillId) ??
    skills.find((skill) => skill.id === selectedSkillId) ??
    skills[0] ??
    initialRouteSkills[0];
  const [marketplace, setMarketplace] = useState<MarketplaceSkill[]>([]);
  const [marketCategories, setMarketCategories] = useState<string[]>(["全部"]);
  const [marketCategory, setMarketCategory] = useState("全部");
  const [skillImportStatus, setSkillImportStatus] = useState("");
  const [marketActionStatus, setMarketActionStatus] = useState("");
  const installedRoutes = skills.filter(isPrimaryRouteSkill);
  const callableSkills = skills.filter((skill) => isToolSkill(skill) && !isPrimaryRouteSkill(skill));

  const publishedActiveSkill = marketplace.find((skill) => skill.publisherSkillId === activeSkill.id);
  const canPublishActiveSkill =
    !initialRouteSkills.some((skill) => skill.id === activeSkill.id) &&
    activeSkill.source !== "market";

  async function refreshMarketplace(category = marketCategory) {
    const response = await fetch(`/api/marketplace/skills?category=${encodeURIComponent(category)}`);
    if (!response.ok) return;
    const payload = (await response.json()) as {
      categories: string[];
      skills: MarketplaceSkill[];
    };
    setMarketplace(payload.skills);
    setMarketCategories(payload.categories);
  }

  useEffect(() => {
    let ignore = false;

    async function loadMarketplace() {
      const response = await fetch(`/api/marketplace/skills?category=${encodeURIComponent(marketCategory)}`);
      if (!response.ok) return;
      const payload = (await response.json()) as {
        categories: string[];
        skills: MarketplaceSkill[];
      };
      if (ignore) return;
      setMarketplace(payload.skills);
      setMarketCategories(payload.categories);
    }

    void loadMarketplace();
    return () => {
      ignore = true;
    };
  }, [marketCategory]);

  function patchSkill(patch: Partial<RouteSkill>) {
    void updateSkill({ ...activeSkill, ...patch });
  }

  function focusLibrarySkill(skill: RouteSkill) {
    if (isToolSkill(skill) && !isPrimaryRouteSkill(skill)) {
      setSelectedToolSkillId(skill.id);
      return;
    }

    setSelectedToolSkillId("");
    selectSkill(skill.id);
  }

  function useLibrarySkill(skill: RouteSkill) {
    focusLibrarySkill(skill);
    setActiveNav("studio");
  }

  function handleCardKey(event: KeyboardEvent<HTMLElement>, skill: RouteSkill) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    focusLibrarySkill(skill);
  }

  function createNewSkill() {
    const skill: RouteSkill = {
      id: nextId("skill"),
      name: "新路线",
      category: "自定义",
      description: "描述这个技能适合什么任务、需要哪些输入、输出什么结果。",
      fields: ["商品", "平台", "语气"],
      recommendedModel: "自动路由",
      score: "自定义",
      source: "custom"
    };

    void createSkill(skill);
  }

  function marketSkillId(skill: MarketplaceSkill) {
    return `market-${skill.id}`;
  }

  function isInstalled(skill: MarketplaceSkill) {
    return skills.some((item) => item.id === marketSkillId(skill));
  }

  function marketStatus(skill: MarketplaceSkill) {
    return skill.status ?? "已上架";
  }

  function installMarketSkill(skill: MarketplaceSkill) {
    if (marketStatus(skill) !== "已上架") {
      setMarketActionStatus(`${skill.name} 还没有上架，暂时不能安装。`);
      return;
    }

    const installedId = marketSkillId(skill);
    const installed = skills.find((item) => item.id === installedId);

    if (installed) {
      selectSkill(installed.id);
      return;
    }

    void createSkill({
      id: installedId,
      name: skill.name,
      category: skill.category,
      description: skill.description,
      fields: skill.fields,
      recommendedModel: skill.recommendedModel,
      score: skill.score,
      source: "market"
    });
  }

  async function publishActiveSkill() {
    if (!canPublishActiveSkill) {
      setMarketActionStatus("内置路线或市场安装路线不需要重复发布。");
      return;
    }

    const response = await fetch("/api/marketplace/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        skillId: activeSkill.id,
        version: publishedActiveSkill?.version ?? "1.0.0",
        tags: [activeSkill.category, ...activeSkill.fields.slice(0, 2)]
      })
    });

    if (!response.ok) {
      setMarketActionStatus("发布失败，请稍后再试。");
      return;
    }

    setMarketActionStatus(`已提交「${activeSkill.name}」到技能市场审核。`);
    await refreshMarketplace();
  }

  async function updateMarketSkillStatus(skill: MarketplaceSkill, status: "已上架" | "待审核" | "已下架") {
    const response = await fetch("/api/marketplace/skills", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: skill.id, status })
    });

    if (!response.ok) {
      setMarketActionStatus("市场状态更新失败。");
      return;
    }

    setMarketActionStatus(`「${skill.name}」已更新为${status}。`);
    await refreshMarketplace();
  }

  function downloadSkill(skill: RouteSkill) {
    const payload = {
      schema: "bmxian.skill",
      version: 1,
      exportedAt: new Date().toISOString(),
      skill
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bmxian-skill-${skill.id}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function importSkillFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    try {
      const payload = JSON.parse(await file.text()) as unknown;
      const importedSkills = normalizeSkillFilePayload(payload);
      if (importedSkills.length === 0) {
        setSkillImportStatus("没有识别到可导入的技能。");
        return;
      }

      for (const skill of importedSkills) {
        if (skills.some((item) => item.id === skill.id)) {
          await updateSkill(skill);
        } else {
          await createSkill(skill, { select: false });
        }
      }

      setSelectedToolSkillId(importedSkills[importedSkills.length - 1].id);
      setSkillImportStatus(`已导入 ${importedSkills.length} 个技能。`);
    } catch (error) {
      setSkillImportStatus(error instanceof Error ? `导入失败：${error.message}` : "导入失败：文件格式错误。");
    }
  }

  return (
    <div className="content-grid two">
      <section className="data-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Route library</span>
            <h2>路线库</h2>
          </div>
          <div className="button-row">
            <label className="ghost-button upload-control">
              <Upload size={16} />
              上传技能
              <input type="file" accept=".json,.skill.json,application/json" onChange={importSkillFile} />
            </label>
            <button className="primary-compact" type="button" onClick={createNewSkill}>
              <SquarePen size={16} />
              保存新路线
            </button>
          </div>
        </div>
        {skillImportStatus && <p className="import-status">{skillImportStatus}</p>}
        {marketActionStatus && <p className="import-status">{marketActionStatus}</p>}
        <div className="section-title-row skill-section-title">
          <h3>已安装路线</h3>
          <span>{installedRoutes.length} 条</span>
        </div>
        <div className="skill-grid">
          {installedRoutes.map((skill) => (
            <article
              className={cx("skill-card", selectedSkillId === skill.id && "active")}
              key={skill.id}
              role="button"
              tabIndex={0}
              aria-label={`选择路线 ${skill.name}`}
              onClick={() => focusLibrarySkill(skill)}
              onKeyDown={(event) => handleCardKey(event, skill)}
            >
              <div>
                <span>{skill.category}</span>
                <strong>{skill.score}</strong>
              </div>
              <h3>{skill.name}</h3>
              <p>{skill.description}</p>
              <div className="tag-list">
                {skill.fields.map((field) => (
                  <span key={field}>{field}</span>
                ))}
              </div>
              <div className="skill-actions">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    focusLibrarySkill(skill);
                  }}
                >
                  编辑路线
                </button>
                <button
                  className="primary-compact"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    useLibrarySkill(skill);
                  }}
                >
                  使用
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    downloadSkill(skill);
                  }}
                >
                  <Download size={15} />
                  下载
                </button>
              </div>
            </article>
          ))}
        </div>
        {callableSkills.length > 0 && (
          <>
            <div className="section-title-row skill-section-title">
              <h3>可调用技能</h3>
              <span>{callableSkills.length} 个</span>
            </div>
            <div className="skill-grid">
              {callableSkills.map((skill) => (
                <article
                  className={cx("skill-card compact", selectedToolSkillId === skill.id && "active")}
                  key={skill.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`选择技能 ${skill.name}`}
                  onClick={() => focusLibrarySkill(skill)}
                  onKeyDown={(event) => handleCardKey(event, skill)}
                >
                  <div>
                    <span>{skill.category}</span>
                    <strong>{skill.score}</strong>
                  </div>
                  <h3>{skill.name}</h3>
                  <p>{skill.description}</p>
                  <div className="tag-list">
                    {skill.fields.map((field) => (
                      <span key={field}>{field}</span>
                    ))}
                  </div>
                  <div className="skill-actions">
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        focusLibrarySkill(skill);
                      }}
                    >
                      编辑技能
                    </button>
                    <button
                      className="primary-compact"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        useLibrarySkill(skill);
                      }}
                    >
                      使用
                    </button>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        downloadSkill(skill);
                      }}
                    >
                      <Download size={15} />
                      下载
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
        <div className="marketplace-block">
          <div className="section-title-row">
            <h3>技能市场</h3>
            <span>{marketplace.length} 个模板</span>
          </div>
          <div className="segment-row" aria-label="技能市场分类">
            {marketCategories.map((category) => (
              <button
                className={cx("segment-button", marketCategory === category && "active")}
                key={category}
                type="button"
                onClick={() => setMarketCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="marketplace-grid">
            {marketplace.map((skill) => {
              const installed = isInstalled(skill);
              const status = marketStatus(skill);
              const installDisabled = installed || status !== "已上架";
              return (
                <article className="market-skill-card" key={skill.id}>
                  <div>
                    <span>{skill.category}</span>
                    <StatusPill status={status} />
                  </div>
                  <h3>{skill.name}</h3>
                  <p>{skill.description}</p>
                  <div className="market-meta">
                    <span>{skill.author}</span>
                    <span>v{skill.version ?? "1.0.0"} / {skill.installs} 安装</span>
                  </div>
                  <div className="tag-list">
                    {skill.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <div className="skill-actions">
                    <button
                      className={installDisabled ? "ghost-button" : "primary-compact"}
                      type="button"
                      onClick={() => installMarketSkill(skill)}
                      disabled={installDisabled}
                      aria-label={`${installed ? "已安装" : status !== "已上架" ? status : "安装"} ${skill.name}`}
                    >
                      {installed ? "已安装" : status !== "已上架" ? status : "安装"}
                    </button>
                    {skill.publisherSkillId && (
                      <>
                        {status !== "已上架" && (
                          <button className="ghost-button" type="button" onClick={() => { void updateMarketSkillStatus(skill, "已上架"); }}>
                            审核通过
                          </button>
                        )}
                        {status !== "已下架" && (
                          <button className="ghost-button" type="button" onClick={() => { void updateMarketSkillStatus(skill, "已下架"); }}>
                            下架
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="data-panel detail">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Selected route</span>
            <h2>{activeSkill.name}</h2>
          </div>
          <div className="button-row">
            <button className="ghost-button" type="button" onClick={() => setActiveNav("studio")}>
              使用路线
            </button>
            <button className="ghost-button" type="button" onClick={() => downloadSkill(activeSkill)}>
              <Download size={15} />
              下载技能
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => { void publishActiveSkill(); }}
              disabled={!canPublishActiveSkill}
            >
              <Upload size={15} />
              发布到市场
            </button>
            {publishedActiveSkill && <StatusPill status={marketStatus(publishedActiveSkill)} />}
            <button
              className="danger-button"
              type="button"
              onClick={() => {
                void deleteSkill(activeSkill.id);
              }}
            >
              <Trash2 size={15} />
              删除
            </button>
          </div>
        </div>
        <div className="edit-form">
          <label>
            <span>路线名称</span>
            <input value={activeSkill.name} onChange={(event) => patchSkill({ name: event.target.value })} />
          </label>
          <label>
            <span>分类</span>
            <input value={activeSkill.category} onChange={(event) => patchSkill({ category: event.target.value })} />
          </label>
          <label>
            <span>推荐模型</span>
            <input value={activeSkill.recommendedModel} onChange={(event) => patchSkill({ recommendedModel: event.target.value })} />
          </label>
          <label>
            <span>评分/标签</span>
            <input value={activeSkill.score} onChange={(event) => patchSkill({ score: event.target.value })} />
          </label>
        </div>
        <div className="key-form">
          <label>
            <span>描述</span>
            <textarea
              value={activeSkill.description}
              onChange={(event) => patchSkill({ description: event.target.value })}
              rows={5}
            />
          </label>
          <label>
            <span>输入字段，逗号分隔</span>
            <input
              value={activeSkill.fields.join(", ")}
              onChange={(event) =>
                patchSkill({
                  fields: event.target.value.split(",").map((field) => field.trim()).filter(Boolean)
                })
              }
            />
          </label>
        </div>
      </section>
    </div>
  );
}
