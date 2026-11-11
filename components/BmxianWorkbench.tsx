"use client";

import { Plus, Search, Upload } from "lucide-react";
import { navItems } from "@/lib/workbench-data";
import { cx } from "./workbench/shared";
import { WorkbenchProvider, useWorkbench } from "./workbench/store";
import { StudioView } from "./workbench/views/StudioView";
import { ProductsView } from "./workbench/views/ProductsView";
import { MaterialsView } from "./workbench/views/MaterialsView";
import { SkillsView } from "./workbench/views/SkillsView";
import { ModelsView } from "./workbench/views/ModelsView";
import { AssetsView } from "./workbench/views/AssetsView";
import { CalendarView } from "./workbench/views/CalendarView";
import { TasksView } from "./workbench/views/TasksView";
import { SettingsView } from "./workbench/views/SettingsView";

export function BmxianWorkbench() {
  return (
    <WorkbenchProvider>
      <WorkbenchShell />
    </WorkbenchProvider>
  );
}

function WorkbenchShell() {
  const {
    activeNav,
    activeMode,
    setActiveNav,
    billingSummary,
    workspaceBusy,
    workspaceId,
    switchWorkspace,
    workspaces,
    workspaceName,
    sessionUser,
    createNewWorkspace,
    searchQuery,
    setSearchQuery,
    searchResults,
    openSearchResult,
    addProduct
  } = useWorkbench();
  const isImageGenerator = activeNav === "studio" && activeMode === "图片";

  return (
    <main className={cx("app-shell", isImageGenerator && "image-generator-shell")}>
      {!isImageGenerator && (
      <aside className="sidebar" aria-label="斑马线导航">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            <span />
          </div>
          <div>
            <strong>斑马线</strong>
            <small>Bmxian Studio</small>
          </div>
        </div>

        <button className="new-button" type="button" onClick={() => setActiveNav("studio")}>
          <Plus size={17} />
          新建创作
        </button>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={cx("nav-item", activeNav === item.id && "active")}
                key={item.id}
                type="button"
                onClick={() => setActiveNav(item.id)}
              >
                <Icon size={18} />
                <span>
                  <b>{item.label}</b>
                  <small>{item.description}</small>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="side-meter">
          <div>
            <span>本月额度</span>
            <strong>{billingSummary.percent}%</strong>
          </div>
          <i aria-hidden="true">
            <em style={{ width: `${billingSummary.percent}%` }} />
          </i>
          <p>{billingSummary.spentLabel} / {billingSummary.budgetLabel} · {billingSummary.eventCount} 条计量</p>
        </div>
      </aside>
      )}

      <section className="workspace">
        <header className={cx("topbar", isImageGenerator && "image-generator-topbar")}>
          {isImageGenerator ? (
            <div className="brand-block image-generator-brand">
              <div className="brand-mark" aria-hidden="true">
                <span />
              </div>
              <div>
                <strong>斑马线</strong>
                <small>Bmxian Studio</small>
              </div>
            </div>
          ) : (
          <>
          <div className="page-title">
            <span className="eyebrow">Bmxian.com</span>
            <h1>{navItems.find((item) => item.id === activeNav)?.label ?? "创作台"}</h1>
          </div>
          <div className="top-actions">
            <div className="workspace-switcher">
              <label>
                <span>工作区</span>
                <select
                  aria-label="切换工作区"
                  disabled={workspaceBusy}
                  value={workspaceId}
                  onChange={(event) => {
                    void switchWorkspace(event.target.value);
                  }}
                >
                  {(workspaces.length ? workspaces : [{
                    id: workspaceId,
                    name: workspaceName,
                    ownerEmail: sessionUser.email,
                    createdAt: "",
                    updatedAt: "",
                    counts: { products: 0, artifacts: 0, tasks: 0, publishPlan: 0 }
                  }]).map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="icon-button"
                type="button"
                aria-label="新建工作区"
                title="新建工作区"
                disabled={workspaceBusy}
                onClick={() => {
                  void createNewWorkspace();
                }}
              >
                <Plus size={17} />
              </button>
            </div>
            <div className="search-wrap">
              <label className="search-box">
                <Search size={16} />
                <input
                  placeholder="搜索商品、素材、LoRA、路线、作品"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </label>
              {searchQuery.trim() && (
                <div className="search-results">
                  {searchResults.map((result) => (
                    <button key={result.id} type="button" onClick={() => openSearchResult(result)}>
                      <span>{result.kind}</span>
                      <strong>{result.title}</strong>
                      <small>{result.subtitle}</small>
                    </button>
                  ))}
                  {searchResults.length === 0 && <p>暂无结果</p>}
                </div>
              )}
            </div>
            <button className="icon-button" type="button" aria-label="上传素材" onClick={() => setActiveNav("materials")}>
              <Upload size={18} />
            </button>
            <button className="primary-compact" type="button" onClick={addProduct}>
              <Plus size={16} />
              商品
            </button>
          </div>
          </>
          )}
        </header>

        {activeNav === "studio" && (
          <StudioView />
        )}
        {activeNav === "products" && (
          <ProductsView />
        )}
        {activeNav === "materials" && (
          <MaterialsView />
        )}
        {activeNav === "skills" && (
          <SkillsView />
        )}
        {activeNav === "models" && (
          <ModelsView />
        )}
        {activeNav === "assets" && (
          <AssetsView />
        )}
        {activeNav === "calendar" && (
          <CalendarView />
        )}
        {activeNav === "tasks" && (
          <TasksView />
        )}
        {activeNav === "settings" && <SettingsView />}
      </section>
    </main>
  );
}
