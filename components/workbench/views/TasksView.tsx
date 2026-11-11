"use client";

import { Clock3, Trash2 } from "lucide-react";
import { MediaPreview, StatusPill, providerStatusText } from "../shared";
import { useWorkbench } from "../store";

export function TasksView() {
  const { tasks, deleteTask, retryTask, clearCompletedTasks, refreshWorkspaceState } = useWorkbench();
  return (
    <div className="content-grid">
      <section className="data-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Async queue</span>
            <h2>任务流</h2>
          </div>
          <div className="button-row">
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                void refreshWorkspaceState();
              }}
            >
              刷新
            </button>
            <button
              className="primary-compact"
              type="button"
              onClick={() => {
                void clearCompletedTasks();
              }}
            >
              <Clock3 size={16} />
              清理完成
            </button>
          </div>
        </div>
        <div className="task-table">
          <div className="task-head">
            <span>任务</span>
            <span>类型</span>
            <span>模型</span>
            <span>成本</span>
            <span>状态</span>
            <span>操作</span>
          </div>
          {tasks.map((task) => (
            <div className="task-row" key={task.id}>
              <span className="task-title-cell">
                <strong>{task.title}</strong>
                <MediaPreview url={task.resultAssetUrl ?? task.providerResultUrl} type={task.type} compact />
                {task.providerWarning && <small>{task.providerWarning}</small>}
              </span>
              <span>{task.type}</span>
              <span className="task-model-cell">
                <strong>{task.model}</strong>
                {task.providerLabel && (
                  <small>
                    {task.providerLabel}
                    {providerStatusText(task.providerStatus) ? ` / ${providerStatusText(task.providerStatus)}` : ""}
                  </small>
                )}
              </span>
              <span>{task.cost}</span>
              <span className="task-status-cell">
                <StatusPill status={task.status} />
                {task.progress !== undefined && <small>{task.progress}%</small>}
              </span>
              <span className="task-actions">
                {task.prompt && task.status !== "已完成" && (
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`重试任务 ${task.title}`}
                    onClick={() => {
                      void retryTask(task.id);
                    }}
                  >
                    <Clock3 size={15} />
                  </button>
                )}
                <button
                  className="icon-button danger-icon"
                  type="button"
                  aria-label={`删除任务 ${task.title}`}
                  onClick={() => {
                    void deleteTask(task.id);
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
