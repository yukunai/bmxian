"use client";

import { CalendarDays, Trash2 } from "lucide-react";
import { StatusPill, formatPublishDate } from "../shared";
import { useWorkbench } from "../store";

export function CalendarView() {
  const { publishPlan, updatePublishPlanItem, deletePublishPlan, setActiveNav } = useWorkbench();
  const sortedPlan = [...publishPlan].sort((a, b) => Date.parse(a.publishAt) - Date.parse(b.publishAt));
  const pendingCount = publishPlan.filter((item) => item.status === "待发布").length;

  return (
    <div className="content-grid">
      <section className="data-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Publishing calendar</span>
            <h2>发布计划</h2>
          </div>
          <div className="button-row">
            <StatusPill status={`${pendingCount} 待发布`} />
            <button className="primary-compact" type="button" onClick={() => setActiveNav("assets")}>
              <CalendarDays size={16} />
              从作品排期
            </button>
          </div>
        </div>

        {sortedPlan.length === 0 ? (
          <div className="empty-panel">
            <CalendarDays size={28} />
            <h3>暂无排期</h3>
            <p>先到作品集选择一条内容资产，点击“排期”生成发布计划。</p>
          </div>
        ) : (
          <div className="calendar-grid">
            {sortedPlan.map((item) => (
              <article className="calendar-card" key={item.id}>
                <div>
                  <span>{item.channel}</span>
                  <StatusPill status={item.status} />
                </div>
                <h3>{item.title}</h3>
                <dl className="calendar-facts">
                  <div>
                    <dt>发布时间</dt>
                    <dd>{formatPublishDate(item.publishAt)}</dd>
                  </div>
                  <div>
                    <dt>商品</dt>
                    <dd>{item.productName}</dd>
                  </div>
                </dl>
                <p>{item.note}</p>
                <footer>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => {
                      void updatePublishPlanItem({
                        ...item,
                        status: item.status === "已发布" ? "待发布" : "已发布"
                      });
                    }}
                  >
                    {item.status === "已发布" ? "转待发布" : "标记已发布"}
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => {
                      void updatePublishPlanItem({
                        ...item,
                        status: item.status === "暂缓" ? "待发布" : "暂缓"
                      });
                    }}
                  >
                    {item.status === "暂缓" ? "恢复" : "暂缓"}
                  </button>
                  <button
                    className="icon-button danger-icon"
                    type="button"
                    aria-label={`删除排期 ${item.title}`}
                    onClick={() => {
                      void deletePublishPlan(item.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
