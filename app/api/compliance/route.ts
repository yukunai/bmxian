import { NextResponse } from "next/server";
import { z } from "zod";

const complianceRequestSchema = z.object({
  text: z.string().min(1)
});

const rules = [
  {
    id: "absolute-best",
    label: "绝对化表达",
    pattern: /(最好|最佳|最强|第一|顶级|极致|全网最低|全网第一)/g,
    suggestion: "改成有条件的体验描述或数据来源明确的比较表达。"
  },
  {
    id: "guarantee",
    label: "保证承诺",
    pattern: /(100%|百分百|永久|保证|无效退款|一定|彻底)/g,
    suggestion: "避免无条件承诺，改成使用场景、适用范围或服务规则。"
  },
  {
    id: "medical",
    label: "功效/医疗暗示",
    pattern: /(治疗|治愈|消炎|抗癌|降血糖|改善疾病|根治)/g,
    suggestion: "普通商品避免医疗功效暗示，保留合规功能或体验表述。"
  },
  {
    id: "scarcity",
    label: "紧迫性风险",
    pattern: /(最后一天|仅此一次|错过再等一年|马上抢光)/g,
    suggestion: "如果是真实活动信息，需要补充活动时间、库存或规则依据。"
  }
];

export async function POST(request: Request) {
  const parsed = complianceRequestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const issues = rules.flatMap((rule) => {
    const matches = Array.from(parsed.data.text.matchAll(rule.pattern));
    return matches.map((match) => ({
      id: `${rule.id}-${match.index ?? 0}`,
      ruleId: rule.id,
      label: rule.label,
      text: match[0],
      index: match.index ?? 0,
      suggestion: rule.suggestion
    }));
  });

  return NextResponse.json({
    ok: issues.length === 0,
    riskLevel: issues.length === 0 ? "低" : issues.length <= 2 ? "中" : "高",
    issues
  });
}
