import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1, name: "创作台" })).toBeVisible();
  await expect(page.getByLabel("主路线")).toBeVisible();
});

test("斑马线工作台可以打开并生成一个草稿作品", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "创作台" })).toBeVisible();
  await expect(page.locator(".mode-strip")).toHaveCount(0);
  await expect(page.getByLabel("主路线")).toBeVisible();
  await page.getByLabel("主路线").selectOption("free-chat");
  await expect(page.locator('select[aria-label="商品档案"]')).toHaveCount(0);
  await expect(page.getByText("商品上下文")).toHaveCount(0);
  await expect(page.getByText("最近对话")).toBeVisible();
  await expect(page.getByText("常用技能")).toBeVisible();
  await expect(page.locator(".visual-control-panel")).toHaveCount(0);
  await expect(page.locator(".quick-skill").filter({ hasText: "淘宝详情页结构" })).toBeVisible();

  await page.locator(".quick-skill").filter({ hasText: "淘宝详情页结构" }).click();
  await expect(page.getByLabel("商品档案")).toBeVisible();
  await expect(page.getByText("商品上下文")).toBeVisible();
  await expect(page.locator(".visual-control-panel")).toHaveCount(0);
  await page.getByRole("button", { name: "生成", exact: true }).click();

  await expect(page.getByText("生成一份").first()).toBeVisible();
  await expect(page.locator(".message").filter({ hasText: "电商生成" }).last()).toBeVisible();
});

test("商品上下文右侧主要路线可以切回自由创作", async ({ page }) => {
  await page.getByLabel("主路线").selectOption("taobao-detail");
  await expect(page.getByLabel("主路线")).toHaveValue("taobao-detail");
  await expect(page.getByLabel("商品档案")).toBeVisible();
  await expect(page.getByText("主要路线")).toBeVisible();

  const routePanel = page.locator(".studio-side .context-panel").filter({ hasText: "主要路线" }).first();
  await expect(routePanel.locator(".quick-skill").filter({ hasText: "自由创作助理" })).toBeVisible();
  await routePanel.locator(".quick-skill").filter({ hasText: "自由创作助理" }).click();

  await expect(page.getByLabel("主路线")).toHaveValue("free-chat");
  await expect(page.locator('select[aria-label="商品档案"]')).toHaveCount(0);
  await expect(page.getByText("最近对话")).toBeVisible();
  await expect(page.getByText("常用技能")).toBeVisible();
});

test("核心导航页面都能切换", async ({ page }) => {
  await page.getByRole("button", { name: /商品档案/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "商品档案" })).toBeVisible();

  await page.getByRole("button", { name: /素材库/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "素材库" })).toBeVisible();

  await page.getByRole("button", { name: /路线库/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "路线库" })).toBeVisible();

  await page.getByRole("button", { name: /引擎中心/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "引擎中心" })).toBeVisible();

  await page.getByRole("button", { name: /作品集/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "作品集" })).toBeVisible();

  await page.getByRole("button", { name: /发布计划/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "发布计划" })).toBeVisible();
});

test("顶部工作区选择器可以创建并切回原工作区", async ({ page }) => {
  const selector = page.getByLabel("切换工作区");
  await expect(selector).toBeVisible();
  const originalWorkspaceId = await selector.inputValue();

  const createResponse = page.waitForResponse((response) =>
    response.url().includes("/api/workspaces") && response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "新建工作区" }).click();
  await createResponse;
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByLabel("切换工作区")).not.toHaveValue(originalWorkspaceId);

  const switchResponse = page.waitForResponse((response) =>
    response.url().includes("/api/session") && response.request().method() === "POST"
  );
  await page.getByLabel("切换工作区").selectOption(originalWorkspaceId);
  await switchResponse;
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByLabel("切换工作区")).toHaveValue(originalWorkspaceId);
  await expect(page.getByRole("heading", { level: 1, name: "创作台" })).toBeVisible();
});

test("底部技能下拉会切换对应模式和模型", async ({ page }) => {
  await expect(page.locator(".mode-strip")).toHaveCount(0);
  await page.getByLabel("主路线").selectOption("free-chat");
  await expect(page.locator('select[aria-label="商品档案"]')).toHaveCount(0);
  await expect(page.getByLabel("技能")).toBeVisible();
  await expect(page.getByLabel("技能")).toHaveValue("");
  await expect(page.getByLabel("技能").locator("option").filter({ hasText: "润色改写" })).toHaveCount(1);
  await expect(page.getByLabel("技能").locator("option").filter({ hasText: "翻译" })).toHaveCount(1);
  await page.getByLabel("主路线").selectOption("longform-article");
  await expect(page.getByLabel("技能").locator("option").filter({ hasText: "扩写成文" })).toHaveCount(1);
  await expect(page.getByLabel("技能").locator("option").filter({ hasText: "整理提纲" })).toHaveCount(1);
  await page.getByLabel("技能").selectOption("tool-polish-rewrite");
  await expect(page.locator(".route-summary")).toContainText("润色改写");
  await page.getByLabel("技能").selectOption("");
  await page.getByLabel("主路线").selectOption("free-chat");
  await expect(page.getByLabel("引擎")).toHaveCount(0);
  await page.getByLabel("更多").click();
  await expect(page.getByLabel("引擎")).toBeVisible();
  await page.getByLabel("更多").click();
  await expect(page.getByLabel("引擎")).toHaveCount(0);
  await expect.poll(async () =>
    page.evaluate(() => {
      const route = document.querySelector('select[aria-label="主路线"]');
      const skill = document.querySelector('select[aria-label="技能"]');
      const template = Array.from(document.querySelectorAll(".composer-controls button")).find((button) =>
        button.textContent?.includes("模板")
      );
      if (!route || !skill || !template) return false;
      return (
        Boolean(route.compareDocumentPosition(skill) & Node.DOCUMENT_POSITION_FOLLOWING) &&
        Boolean(skill.compareDocumentPosition(template) & Node.DOCUMENT_POSITION_FOLLOWING)
      );
    })
  ).toBe(true);
  await page.getByLabel("主路线").selectOption("image-visual-brief");
  await expect(page.locator(".mode-guide")).toHaveCount(0);
  await expect(page.getByLabel("主路线")).toHaveValue("image-visual-brief");
  await expect(page.getByLabel("主路线").locator("option:checked")).toHaveText("图片生成");
  await expect(page.locator(".sidebar")).toHaveCount(0);
  await expect(page.locator(".image-generator-topbar")).toBeVisible();
  await expect(page.locator(".character-os-shell")).toBeVisible();
  await expect(page.locator('select[aria-label="商品档案"]')).toHaveCount(0);
  await expect(page.locator(".visual-control-panel")).toHaveCount(1);
  await expect(page.locator(".composer")).toBeInViewport();
  await expect(page.getByRole("button", { name: /生成 \(4\)/ })).toBeInViewport();
  await expect.poll(async () =>
    page.evaluate(() => {
      const workspace = document.querySelector(".character-generation-main")?.getBoundingClientRect();
      const composer = document.querySelector(".composer")?.getBoundingClientRect();
      if (!workspace || !composer) return false;
      return composer.top >= workspace.top && composer.bottom <= window.innerHeight;
    })
  ).toBe(true);

  await page.getByLabel("主路线").selectOption("douyin-script");
  await expect(page.getByLabel("主路线")).toHaveValue("douyin-script");
  await expect(page.getByLabel("主路线").locator("option:checked")).toHaveText("视频生成");
  await expect(page.locator(".route-summary")).toContainText("可灵视频");
  await page.getByRole("button", { name: "模板" }).click();
  await expect(page.locator(".composer textarea")).toHaveValue(/生成一条 30 秒短视频/);

  await page.getByLabel("主路线").selectOption("poster-layout");
  await expect(page.getByLabel("主路线").locator("option:checked")).toHaveText("海报生成");
  await expect(page.locator(".visual-control-panel")).toHaveCount(1);
  await page.getByRole("button", { name: "模板" }).click();
  await expect(page.locator(".composer textarea")).toHaveValue(/生成一张电商海报/);

  await page.getByLabel("主路线").selectOption("ppt-outline");
  await expect(page.getByLabel("主路线").locator("option:checked")).toHaveText("PPT 生成");
  await expect(page.locator(".route-summary")).toContainText("智谱 GLM");
  await expect(page.locator(".visual-control-panel")).toHaveCount(0);
  await page.getByRole("button", { name: "模板" }).click();
  await expect(page.locator(".composer textarea")).toHaveValue(/生成一份 8 页电商增长 PPT/);
});

test("右侧图片海报控制面板会锁定比例和风格", async ({ page, request }) => {
  await expect(page.locator(".visual-control-panel")).toHaveCount(0);
  await page.getByLabel("主路线").selectOption("poster-layout");
  await expect(page.getByLabel("主路线")).toHaveValue("poster-layout");

  const visualPanel = page.locator(".visual-control-panel").first();
  await expect(visualPanel).toBeVisible();
  await expect(visualPanel.getByText("生成控制")).toBeVisible();
  await expect(visualPanel.locator(".style-thumb")).toHaveCount(8);

  await visualPanel.getByLabel("选择比例 16:9").click();
  await visualPanel.getByLabel("锁定风格 科技发布感").click();
  await visualPanel.getByLabel("角色 LoRA").selectOption("lora-commerce-model-clean");
  await visualPanel.getByLabel("角色名称").fill("测试角色");
  await visualPanel.getByLabel("角色参考图").fill("https://cdn.example.com/character.png");
  await visualPanel.getByLabel("角色强度").fill("0.88");
  await visualPanel.getByLabel("角色 Seed").fill("17815");
  await visualPanel.getByLabel("LoRA 权重").fill("0.76");
  await expect(visualPanel).toContainText("锁定 科技发布感");
  await expect(visualPanel).toContainText("备用角色 LoRA");

  const prompt = `E2E 风格锁海报 ${Date.now()}`;
  await page.locator("textarea").fill(prompt);
  await page.getByRole("button", { name: "生成", exact: true }).click();
  await expect(page.locator(".message").filter({ hasText: prompt.slice(0, 16) }).filter({ hasText: "海报生成任务包" }).first()).toBeVisible();

  const workspace = await request.get("/api/workspace");
  const snapshot = await workspace.json();
  const artifact = snapshot.artifacts.find((item: { title: string; body: string; source: string }) =>
    item.title.includes(prompt.slice(0, 18)) || item.body.includes(prompt)
  );
  expect(artifact?.body).toContain("尺寸比例：16:9");
  expect(artifact?.body).toContain("锁定风格：科技发布感");
  expect(artifact?.body).toContain("角色锁定：测试角色 / 强度 0.88");
  expect(artifact?.body).toContain("角色 LoRA：备用角色 LoRA / alternate-character-v1.safetensors / 权重 0.76");
  expect(artifact?.body).toContain("LoRA 文件：lora://local/character/alternate-character-v1.safetensors");
  expect(artifact?.source).toContain("科技发布感 16:9");
  const task = snapshot.tasks.find((item: { prompt?: string }) => item.prompt === prompt);
  expect(task?.visualSettings).toEqual(expect.objectContaining({
    characterLock: true,
    characterName: "测试角色",
    characterReferenceUrl: "https://cdn.example.com/character.png",
    characterStrength: 0.88,
    seed: "17815",
    characterLoraAssetId: "lora-commerce-model-clean",
    characterLoraName: "备用角色 LoRA",
    characterLoraId: "alternate-character-v1.safetensors",
    characterLoraUrl: "lora://local/character/alternate-character-v1.safetensors",
    characterLoraBaseModel: "SDXL / FLUX compatible",
    characterLoraTriggerWords: expect.arrayContaining(["alternate_character"]),
    characterLoraWeight: 0.76,
    styleLoraId: "reserved-tech-launch-v1",
    loraWeight: 0.7,
    triggerWords: expect.arrayContaining(["bmxian_tech_launch"]),
    baseModel: "image-base-tech",
    referenceImage: "style://tech-launch/reference-v1",
    styleVersion: "v1"
  }));

  await page.waitForTimeout(700);
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator(".visual-control-panel").first()).toContainText("锁定 科技发布感");
});

test("模型网关 API 没有密钥时会走 Demo fallback", async ({ request }) => {
  const response = await request.post("/api/generate", {
    data: {
      prompt: "帮我写一条防晒衣卖点",
      mode: "电商",
      product: {
        id: "test-product",
        name: "轻薄防晒衣",
        category: "服饰",
        price: "199",
        audience: "通勤女性",
        stage: "测试",
        platform: "小红书",
        tone: "清爽可信",
        assets: 0,
        notes: ["UPF50+ 防护", "冰感面料", "轻薄收纳"]
      },
      skill: {
        id: "test-skill",
        name: "小红书爆款笔记",
        category: "自媒体",
        description: "生成真实体验感笔记",
        fields: ["商品", "场景"],
        recommendedModel: "DeepSeek 写作",
        score: "测试"
      },
      model: {
        id: "auto",
        name: "自动路由",
        provider: "斑马线",
        lane: "默认",
        latency: "按任务选择",
        cost: "动态估算",
        status: "已接入",
        strengths: ["任务识别"]
      },
      provider: {
        id: "demo",
        label: "Demo 本地生成",
        baseUrl: "local://demo",
        model: "bmxian-demo",
        apiKey: "",
        enabled: true
      }
    }
  });

  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.fallback).toBe(true);
  expect(payload.artifact.body).toContain("轻薄防晒衣");
});

test("会话和工作区 API 可以创建并切换工作区", async ({ request }) => {
  const initial = await request.get("/api/session");
  await expect(initial).toBeOK();
  const initialPayload = await initial.json();
  expect(initialPayload).toEqual(expect.objectContaining({
    user: expect.objectContaining({ email: expect.any(String), name: expect.any(String) }),
    auth: expect.objectContaining({
      adapter: "local",
      authenticated: true,
      source: "local-cookie",
      productionReady: false
    }),
    activeWorkspaceId: expect.any(String),
    workspaces: expect.any(Array)
  }));

  const workspaceName = `E2E 工作区 ${Date.now()}`;
  const created = await request.post("/api/workspaces", { data: { name: workspaceName } });
  expect(created.status()).toBe(201);
  const createdPayload = await created.json();
  expect(createdPayload).toEqual(expect.objectContaining({
    activeWorkspaceId: expect.stringMatching(/^workspace-/),
    workspaces: expect.arrayContaining([
      expect.objectContaining({ name: workspaceName, counts: expect.objectContaining({ products: expect.any(Number) }) })
    ])
  }));

  const activeWorkspace = await request.get("/api/workspace");
  await expect(activeWorkspace).toBeOK();
  expect(await activeWorkspace.json()).toEqual(expect.objectContaining({
    workspaceId: createdPayload.activeWorkspaceId,
    workspaceName
  }));

  const switchedBack = await request.post("/api/session", {
    data: { workspaceId: initialPayload.activeWorkspaceId }
  });
  await expect(switchedBack).toBeOK();
  expect(await switchedBack.json()).toEqual(expect.objectContaining({
    activeWorkspaceId: initialPayload.activeWorkspaceId
  }));
});

test("服务端健康检查和产品 CRUD 可用", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
  await expect(health).toBeOK();

  const product = {
    id: `e2e-product-${Date.now()}`,
    name: "E2E 测试商品",
    category: "测试类目",
    price: "99",
    audience: "测试用户",
    stage: "测试中",
    platform: "小红书",
    tone: "清晰",
    assets: 0,
    notes: ["测试卖点"]
  };

  const created = await request.post("/api/products", { data: product });
  await expect(created).toBeOK();
  expect(await created.json()).toEqual(expect.objectContaining({
    products: expect.arrayContaining([expect.objectContaining({ id: product.id })])
  }));

  const updated = await request.put("/api/products", {
    data: { ...product, name: "E2E 测试商品已更新" }
  });
  await expect(updated).toBeOK();
  expect(await updated.json()).toEqual(expect.objectContaining({
    products: expect.arrayContaining([expect.objectContaining({ id: product.id, name: "E2E 测试商品已更新" })])
  }));

  const removed = await request.delete("/api/products", { data: { id: product.id } });
  await expect(removed).toBeOK();
  expect(JSON.stringify(await removed.json())).not.toContain(product.id);
});

test("商品导入 API 支持 CSV 和 JSON", async ({ request }) => {
  const stamp = Date.now();
  const csvId = `e2e-import-csv-${stamp}`;
  const jsonId = `e2e-import-json-${stamp}`;
  const duplicateId = `e2e-import-duplicate-${stamp}`;
  const csv = [
    "商品编号,商品名称,类目,价格,目标人群,阶段,平台,品牌语气,素材数,卖点",
    `${csvId},E2E CSV 导入商品 ${stamp},服饰,109,年轻通勤用户,测款,小红书,轻快可信,3,\"耐磨|轻便|适合日常通勤\"`
  ].join("\n");

  const csvResponse = await request.post("/api/products/import", {
    multipart: {
      file: {
        name: `products-${stamp}.csv`,
        mimeType: "text/csv",
        buffer: Buffer.from(csv)
      }
    }
  });
  expect(csvResponse.status()).toBe(201);
  expect(await csvResponse.json()).toEqual(expect.objectContaining({
    imported: 1,
    importedProducts: expect.arrayContaining([
      expect.objectContaining({ id: csvId, name: `E2E CSV 导入商品 ${stamp}`, assets: 3 })
    ])
  }));

  const jsonResponse = await request.post("/api/products/import", {
    data: {
      products: [
        {
          sku: jsonId,
          title: `E2E JSON 导入商品 ${stamp}`,
          category: "食品饮料",
          price: "88",
          audience: "办公室用户",
          stage: "新品",
          platform: "抖音",
          tone: "利落",
          assets: 1,
          notes: ["即饮", "低负担"]
        }
      ]
    }
  });
  expect(jsonResponse.status()).toBe(201);
  expect(await jsonResponse.json()).toEqual(expect.objectContaining({
    imported: 1,
    importedProducts: expect.arrayContaining([
      expect.objectContaining({ id: jsonId, name: `E2E JSON 导入商品 ${stamp}` })
    ])
  }));

  const duplicateResponse = await request.post("/api/products/import", {
    data: {
      products: [
        {
          sku: duplicateId,
          title: `E2E 重复 SKU 首条 ${stamp}`,
          category: "测试类目"
        },
        {
          sku: duplicateId,
          title: `E2E 重复 SKU 末条 ${stamp}`,
          category: "测试类目",
          price: "199"
        }
      ]
    }
  });
  expect(duplicateResponse.status()).toBe(201);
  const duplicatePayload = await duplicateResponse.json();
  expect(duplicatePayload.imported).toBe(1);
  expect(duplicatePayload.importedProducts).toEqual([
    expect.objectContaining({ id: duplicateId, name: `E2E 重复 SKU 末条 ${stamp}` })
  ]);
  expect(
    duplicatePayload.products.filter((product: { id: string }) => product.id === duplicateId)
  ).toHaveLength(1);

  await request.delete("/api/products", { data: { id: csvId } });
  await request.delete("/api/products", { data: { id: jsonId } });
  await request.delete("/api/products", { data: { id: duplicateId } });
});

test("内容套餐 API 可以为商品生成多平台资产", async ({ request }) => {
  const stamp = Date.now();
  const product = {
    id: `campaign-product-${stamp}`,
    name: `E2E 内容套餐商品 ${stamp}`,
    category: "家居",
    price: "299",
    audience: "学生家庭",
    stage: "上新",
    platform: "淘宝 / 小红书",
    tone: "可信清晰",
    assets: 0,
    notes: ["护眼", "耐用", "适合书桌"]
  };

  const response = await request.post("/api/campaigns", { data: { product } });
  expect(response.status()).toBe(201);
  const payload = await response.json();
  expect(payload).toEqual(expect.objectContaining({
    channels: ["小红书", "抖音", "淘宝详情", "私域"],
    artifacts: expect.arrayContaining([
      expect.objectContaining({ title: `小红书种草：${product.name}`, body: expect.stringContaining(product.name) }),
      expect.objectContaining({ title: `抖音口播：${product.name}`, body: expect.stringContaining("短视频口播脚本") })
    ]),
    tasks: expect.arrayContaining([
      expect.objectContaining({ status: "已完成", productName: product.name })
    ])
  }));

  const workspace = await request.get("/api/workspace");
  await expect(workspace).toBeOK();
  const snapshot = await workspace.json();
  expect(snapshot.artifacts).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: payload.artifacts[0].id })
  ]));

  await Promise.all(
    payload.artifacts.map((artifact: { id: string }) =>
      request.delete("/api/artifacts", { data: { id: artifact.id } })
    )
  );
  await Promise.all(
    payload.tasks.map((task: { id: string }) =>
      request.delete("/api/tasks", { data: { id: task.id } })
    )
  );
});

test("发布计划 API 可以从作品创建排期并更新删除", async ({ request }) => {
  const stamp = Date.now();
  const artifact = {
    id: `calendar-artifact-${stamp}`,
    type: "电商",
    title: `小红书种草：E2E 排期商品 ${stamp}`,
    source: `E2E 排期商品 ${stamp} / 内容套餐 / 小红书`,
    body: `E2E 发布计划正文 ${stamp}`,
    status: "待复核"
  };

  const artifactCreated = await request.post("/api/artifacts", { data: artifact });
  await expect(artifactCreated).toBeOK();

  const scheduled = await request.post("/api/calendar", { data: { artifactIds: [artifact.id] } });
  expect(scheduled.status()).toBe(201);
  const payload = await scheduled.json();
  expect(payload.items).toEqual([
    expect.objectContaining({
      artifactId: artifact.id,
      channel: "小红书",
      productName: `E2E 排期商品 ${stamp}`,
      status: "待发布"
    })
  ]);

  const item = payload.items[0];
  const updated = await request.put("/api/calendar", { data: { ...item, status: "已发布" } });
  await expect(updated).toBeOK();
  expect(await updated.json()).toEqual(expect.objectContaining({
    item: expect.objectContaining({ id: item.id, status: "已发布" })
  }));

  const search = await request.get(`/api/search?q=${encodeURIComponent(`E2E 排期商品 ${stamp}`)}`);
  await expect(search).toBeOK();
  expect(await search.json()).toEqual(expect.objectContaining({
    results: expect.arrayContaining([
      expect.objectContaining({ kind: "排期", nav: "calendar", targetId: item.id })
    ])
  }));

  const removed = await request.delete("/api/calendar", { data: { id: item.id } });
  await expect(removed).toBeOK();
  expect(JSON.stringify(await removed.json())).not.toContain(item.id);

  await request.delete("/api/artifacts", { data: { id: artifact.id } });
});

test("素材 API 可以上传列表和删除", async ({ request }) => {
  const fileName = `e2e-material-${Date.now()}.txt`;
  const created = await request.post("/api/materials", {
    multipart: {
      tags: "e2e, 商品图",
      file: {
        name: fileName,
        mimeType: "text/plain",
        buffer: Buffer.from("bmxian material api test")
      }
    }
  });
  expect(created.status()).toBe(201);
  const payload = await created.json();
  expect(payload.material).toEqual(expect.objectContaining({
    name: fileName,
    kind: "文档",
    tags: ["e2e", "商品图"]
  }));

  const listed = await request.get("/api/materials");
  await expect(listed).toBeOK();
  expect(await listed.json()).toEqual(expect.objectContaining({
    materials: expect.arrayContaining([expect.objectContaining({ id: payload.material.id })])
  }));

  const removed = await request.delete("/api/materials", { data: { id: payload.material.id } });
  await expect(removed).toBeOK();
  expect(JSON.stringify(await removed.json())).not.toContain(payload.material.id);
});

test("LoRA API 可以上传列表和删除", async ({ request }) => {
  const fileName = `e2e-character-${Date.now()}.safetensors`;
  const created = await request.post("/api/loras", {
    multipart: {
      name: "E2E 角色 LoRA",
      kind: "角色",
      baseModel: "SDXL / FLUX compatible",
      triggerWords: "e2e_character, same_face",
      defaultWeight: "0.81",
      file: {
        name: fileName,
        mimeType: "application/octet-stream",
        buffer: Buffer.from("bmxian lora api test")
      }
    }
  });
  expect(created.status()).toBe(201);
  const payload = await created.json();
  expect(payload.loraAsset).toEqual(expect.objectContaining({
    name: "E2E 角色 LoRA",
    kind: "角色",
    baseModel: "SDXL / FLUX compatible",
    fileName,
    defaultWeight: 0.81,
    triggerWords: ["e2e_character", "same_face"]
  }));
  expect(payload.loraAsset.url).toContain("/uploads/loras/");

  const listed = await request.get("/api/loras");
  await expect(listed).toBeOK();
  expect(await listed.json()).toEqual(expect.objectContaining({
    loraAssets: expect.arrayContaining([expect.objectContaining({ id: payload.loraAsset.id })])
  }));

  const search = await request.get(`/api/search?q=${encodeURIComponent("E2E 角色 LoRA")}`);
  await expect(search).toBeOK();
  expect(await search.json()).toEqual(expect.objectContaining({
    results: expect.arrayContaining([
      expect.objectContaining({ kind: "LoRA", nav: "materials", targetId: payload.loraAsset.id })
    ])
  }));

  const removed = await request.delete("/api/loras", { data: { id: payload.loraAsset.id } });
  await expect(removed).toBeOK();
  expect(JSON.stringify(await removed.json())).not.toContain(payload.loraAsset.id);
});

test("角色 API 可以创建更新和删除 Character Profile", async ({ request }) => {
  const stamp = Date.now();
  const character = {
    id: `char-e2e-${stamp}`,
    name: `E2E 角色 ${stamp}`,
    archetype: "Commercial",
    status: "可用",
    thumbnailUrl: "style://character/e2e-preview",
    identity: {
      encoder: "InsightFace",
      vectorId: `identity-e2e-${stamp}`,
      dimensions: 1024,
      faceReferenceUrls: ["https://cdn.example.com/e2e-face-1.png", "https://cdn.example.com/e2e-face-2.png"],
      strength: 0.86,
      consistencyScore: 91,
      structure: {
        eyeDistance: "balanced",
        jawShape: "soft oval",
        noseBridge: "medium",
        ageRange: "24-30"
      }
    },
    style: {
      presetId: "clean-commerce",
      styleName: "清透商品主图",
      styleVectorId: "style-e2e-clean",
      strength: 0.62,
      loraAssetId: "lora-character-default",
      triggerWords: ["e2e_character"]
    },
    memory: [{
      id: `mem-e2e-${stamp}`,
      scene: "studio headshot",
      prompt: "front portrait",
      pose: "front",
      successScore: 93,
      createdAt: new Date().toISOString()
    }],
    fusion: {
      identity: 0.86,
      style: 0.62,
      prompt: 1,
      state: 0.4
    },
    version: "v1",
    lastUsedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  const created = await request.post("/api/characters", { data: character });
  expect(created.status()).toBe(201);
  expect(await created.json()).toEqual(expect.objectContaining({
    selectedCharacterId: character.id,
    characterProfiles: expect.arrayContaining([expect.objectContaining({ id: character.id, name: character.name })])
  }));

  const updated = await request.put("/api/characters", { data: { ...character, name: `${character.name} 更新` } });
  await expect(updated).toBeOK();
  expect(await updated.json()).toEqual(expect.objectContaining({
    characterProfiles: expect.arrayContaining([expect.objectContaining({ id: character.id, name: `${character.name} 更新` })])
  }));

  const removed = await request.delete("/api/characters", { data: { id: character.id } });
  await expect(removed).toBeOK();
  expect(JSON.stringify(await removed.json())).not.toContain(character.id);
});

test("全局搜索 API 可以聚合工作区资源", async ({ request }) => {
  const response = await request.get("/api/search?q=小红书爆款笔记");
  await expect(response).toBeOK();
  expect(await response.json()).toEqual(expect.objectContaining({
    results: expect.arrayContaining([
      expect.objectContaining({ kind: "路线", title: "小红书爆款笔记", nav: "skills" })
    ])
  }));
});

test("指标 API 会返回真实工作区统计", async ({ request }) => {
  const response = await request.get("/api/metrics");
  await expect(response).toBeOK();
  expect(await response.json()).toEqual(expect.objectContaining({
    metrics: expect.arrayContaining([
      expect.objectContaining({ label: "作品总数", value: expect.any(String) }),
      expect.objectContaining({ label: "已保存路线", value: expect.any(String) }),
      expect.objectContaining({ label: "模型成本", value: expect.stringMatching(/^¥/) }),
      expect.objectContaining({ label: "素材资产", value: expect.any(String) }),
      expect.objectContaining({ label: "发布排期", value: expect.any(String) })
    ])
  }));
});

test("存储适配器 API 会返回当前本地数据库状态", async ({ request }) => {
  const response = await request.get("/api/system/storage");
  await expect(response).toBeOK();
  expect(await response.json()).toEqual(expect.objectContaining({
    storage: expect.objectContaining({
      id: "json",
      requestedId: expect.any(String),
      configured: true,
      persistent: true,
      productionReady: false,
      supportsAtomicMutations: false,
      availableAdapters: expect.arrayContaining(["json", "postgres", "supabase", "neon"]),
      requiredEnv: [],
      missingEnv: [],
      path: expect.stringContaining("data/bmxian-db.json")
    }),
    mediaStorage: expect.objectContaining({
      id: "local",
      requestedId: "local",
      configured: true,
      persistent: false,
      productionReady: false,
      uploadImplemented: true,
      publicPrefixes: expect.arrayContaining(["/generated/", "/uploads/"]),
      availableAdapters: expect.arrayContaining(["local", "s3", "r2", "oss", "cos"])
    }),
    productionAdapters: expect.arrayContaining(["postgres", "supabase", "neon"]),
    nextAdapters: expect.arrayContaining(["postgres", "supabase", "neon"])
  }));
});

test("媒体存储适配器 API 会返回本地和未来对象存储状态", async ({ request }) => {
  const response = await request.get("/api/system/media-storage");
  await expect(response).toBeOK();
  expect(await response.json()).toEqual(expect.objectContaining({
    mediaStorage: expect.objectContaining({
      id: "local",
      label: "Local media filesystem",
      generatedPath: expect.stringContaining("public/generated"),
      uploadsPath: expect.stringContaining("public/uploads"),
      remoteFetchEnabled: false,
      maxBytes: expect.any(Number),
      productionReady: false,
      availableAdapters: expect.arrayContaining(["s3", "r2", "oss", "cos"])
    }),
    productionAdapters: expect.arrayContaining(["s3", "r2", "oss", "cos"])
  }));
});

test("认证状态 API 会返回当前账号适配器状态", async ({ request }) => {
  const response = await request.get("/api/system/auth");
  await expect(response).toBeOK();
  expect(await response.json()).toEqual(expect.objectContaining({
    auth: expect.objectContaining({
      adapter: "local",
      authenticated: true,
      productionReady: false,
      missingEnv: []
    }),
    user: expect.objectContaining({
      email: expect.stringContaining("@")
    })
  }));
});

test("系统 readiness API 会汇总生产配置状态", async ({ request }) => {
  const response = await request.get("/api/system/readiness");
  await expect(response).toBeOK();
  expect(await response.json()).toEqual(expect.objectContaining({
    status: "warning",
    checks: expect.arrayContaining([
      expect.objectContaining({ id: "storage", status: "warning" }),
      expect.objectContaining({ id: "media-storage", status: "warning" }),
      expect.objectContaining({ id: "auth", status: "warning" }),
      expect.objectContaining({ id: "key-vault", status: "warning" }),
      expect.objectContaining({ id: "billing", status: "warning" }),
      expect.objectContaining({ id: "payment-checkout", status: "warning" }),
      expect.objectContaining({ id: "supplier-invoices", status: "warning" }),
      expect.objectContaining({ id: "integrations", status: "warning" })
    ]),
    storage: expect.objectContaining({ id: "json" }),
    auth: expect.objectContaining({ adapter: "local" })
  }));
});

test("Key Vault API 会加密保存并只返回脱敏密钥", async ({ request }) => {
  const stamp = Date.now();
  const secretValue = `sk-bmxian-${stamp}-secret`;
  let secretId = "";

  try {
    const created = await request.post("/api/key-vault", {
      data: {
        name: `E2E DeepSeek Key ${stamp}`,
        scope: "provider",
        linkedId: "deepseek",
        secretValue
      }
    });
    expect(created.status()).toBe(201);
    const createdPayload = await created.json();
    const createdText = JSON.stringify(createdPayload);
    expect(createdText).not.toContain(secretValue);
    expect(createdText).not.toContain("secretCiphertext");
    const secret = createdPayload.secrets.find((item: { linkedId?: string }) => item.linkedId === "deepseek");
    expect(secret).toEqual(expect.objectContaining({
      name: `E2E DeepSeek Key ${stamp}`,
      scope: "provider",
      linkedId: "deepseek",
      maskedValue: expect.stringContaining("••••")
    }));
    secretId = secret.id;

    const listed = await request.get("/api/key-vault");
    await expect(listed).toBeOK();
    const listedText = JSON.stringify(await listed.json());
    expect(listedText).not.toContain(secretValue);
    expect(listedText).not.toContain("secretCiphertext");

    const exported = await request.get("/api/workspace/export");
    await expect(exported).toBeOK();
    const exportedText = JSON.stringify(await exported.json());
    expect(exportedText).not.toContain(secretValue);
    expect(exportedText).not.toContain("secretCiphertext");

    const renamed = await request.put("/api/key-vault", {
      data: {
        id: secretId,
        name: `E2E DeepSeek Key Updated ${stamp}`,
        scope: "provider",
        linkedId: "deepseek"
      }
    });
    await expect(renamed).toBeOK();
    expect(await renamed.json()).toEqual(expect.objectContaining({
      secrets: expect.arrayContaining([
        expect.objectContaining({
          id: secretId,
          name: `E2E DeepSeek Key Updated ${stamp}`,
          maskedValue: secret.maskedValue
        })
      ])
    }));

    const rotatedValue = `sk-bmxian-rotated-${stamp}`;
    const rotated = await request.put("/api/key-vault", {
      data: {
        id: secretId,
        name: `E2E DeepSeek Key Updated ${stamp}`,
        scope: "provider",
        linkedId: "deepseek",
        secretValue: rotatedValue
      }
    });
    await expect(rotated).toBeOK();
    const rotatedText = JSON.stringify(await rotated.json());
    expect(rotatedText).not.toContain(rotatedValue);
    expect(rotatedText).toContain("••••");
  } finally {
    if (secretId) {
      const deleted = await request.delete("/api/key-vault", { data: { id: secretId } });
      await expect(deleted).toBeOK();
      expect(JSON.stringify(await deleted.json())).not.toContain(secretId);
    }
  }
});

test("团队成员 API 支持邀请更新和删除", async ({ request }) => {
  const stamp = Date.now();
  const email = `member-${stamp}@bmxian.local`;
  const created = await request.post("/api/team/members", {
    data: {
      name: `成员 ${stamp}`,
      email,
      role: "editor",
      status: "invited"
    }
  });
  await expect(created).toBeOK();
  const createdPayload = await created.json();
  const member = createdPayload.members.find((item: { email: string }) => item.email === email);
  expect(member).toEqual(expect.objectContaining({
    email,
    role: "editor",
    status: "invited"
  }));

  const updated = await request.put("/api/team/members", {
    data: {
      id: member.id,
      name: `成员更新 ${stamp}`,
      email,
      role: "viewer",
      status: "active"
    }
  });
  await expect(updated).toBeOK();
  expect(await updated.json()).toEqual(expect.objectContaining({
    members: expect.arrayContaining([
      expect.objectContaining({ id: member.id, role: "viewer", status: "active" })
    ])
  }));

  const removed = await request.delete("/api/team/members", { data: { id: member.id } });
  await expect(removed).toBeOK();
  const removedPayload = await removed.json();
  expect(removedPayload.members.some((item: { id: string }) => item.id === member.id)).toBe(false);
  expect(removedPayload.members).toEqual(expect.arrayContaining([
    expect.objectContaining({ role: "owner" })
  ]));
});

test("本地 RBAC 会限制 viewer 写入和 Provider 管理", async ({ request }) => {
  const stamp = Date.now();
  const viewerEmail = `viewer-${stamp}@bmxian.local`;
  const editorEmail = `editor-${stamp}@bmxian.local`;
  let viewerId = "";
  let editorId = "";
  const productId = `rbac-product-${stamp}`;

  try {
    const viewerCreated = await request.post("/api/team/members", {
      data: {
        name: `Viewer ${stamp}`,
        email: viewerEmail,
        role: "viewer",
        status: "active"
      }
    });
    await expect(viewerCreated).toBeOK();
    viewerId = ((await viewerCreated.json()).members.find((item: { email: string }) => item.email === viewerEmail) as { id: string }).id;

    const editorCreated = await request.post("/api/team/members", {
      data: {
        name: `Editor ${stamp}`,
        email: editorEmail,
        role: "editor",
        status: "active"
      }
    });
    await expect(editorCreated).toBeOK();
    editorId = ((await editorCreated.json()).members.find((item: { email: string }) => item.email === editorEmail) as { id: string }).id;

    await request.post("/api/session", { data: { email: viewerEmail, name: `Viewer ${stamp}` } });
    await expect(await request.get("/api/products")).toBeOK();
    const viewerWrite = await request.post("/api/products", {
      data: {
        id: productId,
        name: "RBAC 测试商品",
        category: "测试",
        price: "0",
        audience: "测试用户",
        stage: "测试",
        platform: "测试",
        tone: "测试",
        assets: 0,
        notes: ["viewer 不应写入"]
      }
    });
    expect(viewerWrite.status()).toBe(403);

    await request.post("/api/session", { data: { email: editorEmail, name: `Editor ${stamp}` } });
    const editorWrite = await request.post("/api/products", {
      data: {
        id: productId,
        name: "RBAC 测试商品",
        category: "测试",
        price: "0",
        audience: "测试用户",
        stage: "测试",
        platform: "测试",
        tone: "测试",
        assets: 0,
        notes: ["editor 可以写入内容"]
      }
    });
    expect(editorWrite.status()).toBe(201);

    const providers = await request.get("/api/providers");
    await expect(providers).toBeOK();
    const providerPayload = await providers.json();
    const editorPreferenceSave = await request.put("/api/workspace", { data: { selectedModelId: "qwen" } });
    await expect(editorPreferenceSave).toBeOK();
    expect(await editorPreferenceSave.json()).toEqual(expect.objectContaining({ selectedModelId: "qwen" }));
    const editorWorkspaceProviderWrite = await request.put("/api/workspace", { data: providerPayload });
    expect(editorWorkspaceProviderWrite.status()).toBe(403);
    const editorProviderWrite = await request.put("/api/providers", { data: providerPayload });
    expect(editorProviderWrite.status()).toBe(403);
  } finally {
    await request.post("/api/session", { data: { email: "owner@bmxian.local", name: "斑马线团队" } });
    if (productId) await request.delete("/api/products", { data: { id: productId } }).catch(() => undefined);
    if (viewerId) await request.delete("/api/team/members", { data: { id: viewerId } }).catch(() => undefined);
    if (editorId) await request.delete("/api/team/members", { data: { id: editorId } }).catch(() => undefined);
  }
});

test("合规 API 可以识别基础风险词", async ({ request }) => {
  const response = await request.post("/api/compliance", {
    data: { text: "这是全网第一的产品，100%保证有效。" }
  });
  await expect(response).toBeOK();
  expect(await response.json()).toEqual(expect.objectContaining({
    ok: false,
    riskLevel: expect.stringMatching(/中|高/),
    issues: expect.arrayContaining([
      expect.objectContaining({ label: "绝对化表达" }),
      expect.objectContaining({ label: "保证承诺" })
    ])
  }));
});

test("技能路线 API 可以创建编辑删除", async ({ request }) => {
  const skill = {
    id: `e2e-skill-${Date.now()}`,
    name: "E2E 直播脚本路线",
    category: "电商",
    description: "把商品卖点拆成直播间开场、痛点、证据和促单话术。",
    fields: ["商品", "人群", "平台"],
    recommendedModel: "DeepSeek 写作",
    score: "E2E"
  };

  const created = await request.post("/api/skills", { data: skill });
  await expect(created).toBeOK();
  expect(await created.json()).toEqual(expect.objectContaining({
    skills: expect.arrayContaining([expect.objectContaining({ id: skill.id })])
  }));

  const updated = await request.put("/api/skills", {
    data: { ...skill, name: "E2E 直播脚本路线已更新", fields: [...skill.fields, "预算"] }
  });
  await expect(updated).toBeOK();
  expect(await updated.json()).toEqual(expect.objectContaining({
    skills: expect.arrayContaining([
      expect.objectContaining({ id: skill.id, name: "E2E 直播脚本路线已更新" })
    ])
  }));

  const removed = await request.delete("/api/skills", { data: { id: skill.id } });
  await expect(removed).toBeOK();
  expect(JSON.stringify(await removed.json())).not.toContain(skill.id);
});

test("技能包 API 支持服务端导入和下载", async ({ request }) => {
  const skill = {
    id: `e2e-package-skill-${Date.now()}`,
    name: "E2E 技能包导入",
    category: "文章",
    description: "通过服务端技能包接口导入，用于以后远程技能市场分发。",
    fields: ["主题", "语气"],
    recommendedModel: "通义千问",
    score: "导入"
  };

  try {
    const imported = await request.post("/api/skills/package", {
      data: {
        kind: "bmxian.skill.package",
        version: "1.0.0",
        skill
      }
    });
    expect(imported.status()).toBe(201);
    expect(await imported.json()).toEqual(expect.objectContaining({
      imported: 1,
      importedSkillIds: [skill.id],
      skills: expect.arrayContaining([
        expect.objectContaining({ id: skill.id, source: "uploaded" })
      ])
    }));

    const downloaded = await request.get(`/api/skills/package?skillId=${skill.id}`);
    await expect(downloaded).toBeOK();
    expect(downloaded.headers()["content-disposition"]).toContain(`bmxian-skill-${skill.id}.json`);
    expect(await downloaded.json()).toEqual(expect.objectContaining({
      kind: "bmxian.skill.package",
      skill: expect.objectContaining({ id: skill.id, name: skill.name })
    }));
  } finally {
    await request.delete("/api/skills", { data: { id: skill.id } }).catch(() => undefined);
  }
});

test("技能市场 API 支持分类筛选", async ({ request }) => {
  const all = await request.get("/api/marketplace/skills");
  await expect(all).toBeOK();
  const allPayload = await all.json();
  expect(allPayload.categories).toEqual(expect.arrayContaining(["全部", "电商", "自媒体", "视觉"]));
  expect(allPayload.skills.length).toBeGreaterThan(3);

  const ecommerce = await request.get("/api/marketplace/skills?category=电商");
  await expect(ecommerce).toBeOK();
  const ecommercePayload = await ecommerce.json();
  expect(ecommercePayload.skills).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: "live-conversion-script", category: "电商" })
  ]));
  expect(ecommercePayload.skills.every((skill: { category: string }) => skill.category === "电商")).toBe(true);
});

test("技能市场 API 支持本地发布审核和下架", async ({ request }) => {
  const skill = {
    id: `e2e-publish-skill-${Date.now()}`,
    name: `E2E 发布技能 ${Date.now()}`,
    category: "文章",
    description: "发布到本地技能市场，用来验证审核和下架闭环。",
    fields: ["主题", "受众", "语气"],
    recommendedModel: "通义长文",
    score: "发布"
  };

  await expect(await request.post("/api/skills", { data: skill })).toBeOK();

  const published = await request.post("/api/marketplace/skills", {
    data: { skillId: skill.id, version: "1.2.0", tags: ["发布", "文章"] }
  });
  expect(published.status()).toBe(201);
  const publishedPayload = await published.json();
  expect(publishedPayload.skill).toEqual(expect.objectContaining({
    id: `local-${skill.id}`,
    name: skill.name,
    status: "待审核",
    version: "1.2.0",
    publisherSkillId: skill.id
  }));

  const approved = await request.patch("/api/marketplace/skills", {
    data: { id: `local-${skill.id}`, status: "已上架" }
  });
  await expect(approved).toBeOK();
  expect(await approved.json()).toEqual(expect.objectContaining({
    publishedSkills: expect.arrayContaining([
      expect.objectContaining({ id: `local-${skill.id}`, status: "已上架" })
    ])
  }));

  const listed = await request.get("/api/marketplace/skills?category=文章");
  await expect(listed).toBeOK();
  expect(await listed.json()).toEqual(expect.objectContaining({
    skills: expect.arrayContaining([
      expect.objectContaining({ id: `local-${skill.id}`, status: "已上架" })
    ])
  }));

  const delisted = await request.patch("/api/marketplace/skills", {
    data: { id: `local-${skill.id}`, status: "已下架" }
  });
  await expect(delisted).toBeOK();
  expect(await delisted.json()).toEqual(expect.objectContaining({
    publishedSkills: expect.arrayContaining([
      expect.objectContaining({ id: `local-${skill.id}`, status: "已下架" })
    ])
  }));

  await expect(await request.delete("/api/marketplace/skills", { data: { id: `local-${skill.id}` } })).toBeOK();
  await expect(await request.delete("/api/skills", { data: { id: skill.id } })).toBeOK();
});

test("未来集成 API 会暴露 Scenelet 和 LoamTrace 预留状态", async ({ request }) => {
  const response = await request.get("/api/integrations");
  await expect(response).toBeOK();
  expect(await response.json()).toEqual(expect.objectContaining({
    integrations: expect.arrayContaining([
      expect.objectContaining({ id: "scenelet", capability: "video.generate" }),
      expect.objectContaining({ id: "loamtrace", capability: "source.verify" })
    ])
  }));
});

test("作品集导出 API 支持 Markdown 和 JSON", async ({ request }) => {
  const markdown = await request.get("/api/export?format=md");
  await expect(markdown).toBeOK();
  expect(await markdown.text()).toContain("# 斑马线作品集导出");

  const json = await request.get("/api/export?format=json");
  await expect(json).toBeOK();
  expect(await json.json()).toEqual(expect.objectContaining({
    exportedAt: expect.any(String),
    artifacts: expect.any(Array)
  }));
});

test("生成结果会保存到服务端工作区", async ({ request }) => {
  const prompt = `E2E 服务端保存 ${Date.now()}`;
  const response = await request.post("/api/generate", {
    data: {
      prompt,
      mode: "电商",
      product: {
        id: "test-product",
        name: "轻薄防晒衣",
        category: "服饰",
        price: "199",
        audience: "通勤女性",
        stage: "测试",
        platform: "小红书",
        tone: "清爽可信",
        assets: 0,
        notes: ["UPF50+ 防护", "冰感面料", "轻薄收纳"]
      },
      skill: {
        id: "test-skill",
        name: "小红书爆款笔记",
        category: "自媒体",
        description: "生成真实体验感笔记",
        fields: ["商品", "场景"],
        recommendedModel: "DeepSeek 写作",
        score: "测试"
      },
      model: {
        id: "auto",
        name: "自动路由",
        provider: "斑马线",
        lane: "默认",
        latency: "按任务选择",
        cost: "动态估算",
        status: "已接入",
        strengths: ["任务识别"]
      }
    }
  });
  await expect(response).toBeOK();
  const generated = await response.json();

  const workspace = await request.get("/api/workspace");
  await expect(workspace).toBeOK();
  const snapshot = await workspace.json();
  expect(snapshot.artifacts).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: generated.artifact.id })
  ]));
});

test("多模态任务 API 可以创建并轮询完成", async ({ request }) => {
  const prompt = `E2E 多模态任务 ${Date.now()}`;
  const created = await request.post("/api/jobs", {
    data: {
      prompt,
      mode: "海报",
      product: {
        id: "test-product",
        name: "轻薄防晒衣",
        category: "服饰",
        price: "199",
        audience: "通勤女性",
        stage: "测试",
        platform: "小红书",
        tone: "清爽可信",
        assets: 0,
        notes: ["UPF50+ 防护", "冰感面料", "轻薄收纳"]
      },
      skill: {
        id: "test-skill",
        name: "海报生成路线",
        category: "视觉",
        description: "生成电商海报任务包",
        fields: ["商品", "卖点"],
        recommendedModel: "自动路由",
        score: "测试"
      },
      model: {
        id: "auto",
        name: "自动路由",
        provider: "斑马线",
        lane: "默认",
        latency: "按任务选择",
        cost: "动态估算",
        status: "已接入",
        strengths: ["任务识别"]
      }
    }
  });
  expect(created.status()).toBe(202);
  const initial = await created.json();
  expect(initial.task).toEqual(expect.objectContaining({ status: "生成中", type: "海报" }));

  await new Promise((resolve) => setTimeout(resolve, 1000));
  const completed = await request.get(`/api/jobs?id=${initial.task.id}`);
  await expect(completed).toBeOK();
  expect(await completed.json()).toEqual(expect.objectContaining({
    task: expect.objectContaining({ status: "已完成", progress: 100 }),
    artifact: expect.objectContaining({ type: "海报", body: expect.stringContaining(prompt) })
  }));
});

test("媒体任务 API 会记录 Provider 路由和外部任务预留", async ({ request }) => {
  const prompt = `E2E 媒体 Provider ${Date.now()}`;
  const created = await request.post("/api/jobs", {
    data: {
      prompt,
      mode: "图片",
      product: {
        id: "test-product",
        name: "轻薄防晒衣",
        category: "服饰",
        price: "199",
        audience: "通勤女性",
        stage: "测试",
        platform: "小红书",
        tone: "清爽可信",
        assets: 0,
        notes: ["UPF50+ 防护", "冰感面料", "轻薄收纳"]
      },
      skill: {
        id: "image-visual-brief",
        name: "图片生成",
        category: "图片",
        description: "生成电商图片",
        fields: ["主体", "场景"],
        recommendedModel: "即梦视觉",
        score: "测试"
      },
      model: {
        id: "jimeng",
        name: "即梦视觉",
        provider: "火山引擎",
        lane: "图片 / 视频",
        latency: "异步",
        cost: "中高",
        status: "预留",
        strengths: ["海报草图", "视觉素材", "视频扩展"]
      },
      visualSettings: {
        aspectRatio: "1:1",
        styleId: "clean-commerce",
        styleName: "清透商品主图",
        stylePrompt: "统一商品摄影风格",
        lockStyle: true
      }
    }
  });
  expect(created.status()).toBe(202);
  const initial = await created.json();
  expect(initial.task).toEqual(expect.objectContaining({
    modelId: "jimeng",
    providerId: "jimeng",
    providerLabel: "即梦视觉",
    providerStatus: "demo",
    externalJobId: expect.stringMatching(/^demo-job-/)
  }));

  await new Promise((resolve) => setTimeout(resolve, 1000));
  const completed = await request.get(`/api/jobs?id=${initial.task.id}`);
  await expect(completed).toBeOK();
  const payload = await completed.json();
  expect(payload).toEqual(expect.objectContaining({
    task: expect.objectContaining({ status: "已完成", providerLabel: "即梦视觉" }),
    artifact: expect.objectContaining({
      type: "图片",
      body: expect.stringContaining("生成引擎：即梦视觉")
    })
  }));
});

test("媒体任务 webhook 可以把外部结果写入作品集", async ({ request }) => {
  const prompt = `E2E Webhook 图片完成 ${Date.now()}`;
  const created = await request.post("/api/jobs", {
    data: {
      prompt,
      mode: "图片",
      product: {
        id: "webhook-product",
        name: "轻薄防晒衣",
        category: "服饰",
        price: "199",
        audience: "通勤女性",
        stage: "测试",
        platform: "小红书",
        tone: "清爽可信",
        assets: 0,
        notes: ["UPF50+ 防护", "冰感面料", "轻薄收纳"]
      },
      skill: {
        id: "image-visual-brief",
        name: "图片生成",
        category: "图片",
        description: "生成电商图片",
        fields: ["主体", "场景"],
        recommendedModel: "即梦视觉",
        score: "测试"
      },
      model: {
        id: "jimeng",
        name: "即梦视觉",
        provider: "火山引擎",
        lane: "图片 / 视频",
        latency: "异步",
        cost: "中高",
        status: "预留",
        strengths: ["海报草图", "视觉素材", "视频扩展"]
      },
      visualSettings: {
        aspectRatio: "9:16",
        styleId: "clean-commerce",
        styleName: "清透商品主图",
        stylePrompt: "统一商品摄影风格",
        lockStyle: true
      }
    }
  });
  expect(created.status()).toBe(202);
  const initial = await created.json();
  const resultUrl = `https://cdn.example.com/bmxian/${initial.task.id}.png`;

  const callback = await request.post("/api/jobs/webhook", {
    data: {
      externalJobId: initial.task.externalJobId,
      status: "completed",
      resultUrl,
      providerLabel: "即梦视觉"
    }
  });
  await expect(callback).toBeOK();
  const payload = await callback.json();
  expect(payload).toEqual(expect.objectContaining({
    task: expect.objectContaining({
      id: initial.task.id,
      status: "已完成",
      progress: 100,
      providerStatus: "completed",
      providerResultUrl: resultUrl
    }),
    artifact: expect.objectContaining({
      type: "图片",
      mediaUrl: resultUrl,
      body: expect.stringContaining(`结果链接：${resultUrl}`)
    }),
    webhook: expect.objectContaining({ status: "completed" })
  }));

  const workspace = await request.get("/api/workspace");
  await expect(workspace).toBeOK();
  const snapshot = await workspace.json();
  expect(snapshot.artifacts).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: payload.artifact.id, body: expect.stringContaining(prompt) })
  ]));
  expect(snapshot.messages).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: `msg-${initial.task.id}`, text: expect.stringContaining("保存到作品集") })
  ]));
});

test("作品集和任务流会预览 webhook 图片结果", async ({ page, request }) => {
  const prompt = `E2E Webhook 图片预览 ${Date.now()}`;
  const resultUrl = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NDAiIGhlaWdodD0iNDAwIj48cmVjdCB3aWR0aD0iNjQwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2QyZWRlMyIvPjx0ZXh0IHg9IjMyMCIgeT0iMjAwIiBmb250LXNpemU9IjMyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMTYxODE5Ij5CbXhpYW48L3RleHQ+PC9zdmc+";
  const created = await request.post("/api/jobs", {
    data: {
      prompt,
      mode: "图片",
      product: {
        id: "webhook-preview-product",
        name: "轻薄防晒衣",
        category: "服饰",
        price: "199",
        audience: "通勤女性",
        stage: "测试",
        platform: "小红书",
        tone: "清爽可信",
        assets: 0,
        notes: ["UPF50+ 防护", "冰感面料", "轻薄收纳"]
      },
      skill: {
        id: "image-visual-brief",
        name: "图片生成",
        category: "图片",
        description: "生成电商图片",
        fields: ["主体", "场景"],
        recommendedModel: "即梦视觉",
        score: "测试"
      },
      model: {
        id: "jimeng",
        name: "即梦视觉",
        provider: "火山引擎",
        lane: "图片 / 视频",
        latency: "异步",
        cost: "中高",
        status: "预留",
        strengths: ["海报草图", "视觉素材", "视频扩展"]
      }
    }
  });
  expect(created.status()).toBe(202);
  const initial = await created.json();

  const callback = await request.post("/api/jobs/webhook", {
    data: {
      externalJobId: initial.task.externalJobId,
      status: "completed",
      resultUrl,
      providerLabel: "即梦视觉"
    }
  });
  await expect(callback).toBeOK();
  const callbackPayload = await callback.json();
  const storedUrl = callbackPayload.task.resultAssetUrl as string;
  expect(storedUrl).toMatch(/^\/generated\/job-.+\.svg$/);
  expect(callbackPayload.artifact).toEqual(expect.objectContaining({ mediaUrl: storedUrl }));
  expect(callbackPayload.webhook.mediaStorage).toEqual(expect.objectContaining({
    url: storedUrl,
    source: "data-url",
    mimeType: "image/svg+xml"
  }));
  const storedAsset = await request.get(storedUrl);
  await expect(storedAsset).toBeOK();
  expect(storedAsset.headers()["content-type"]).toContain("image/svg+xml");

  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: /作品集/ }).click();
  const assetCard = page.locator(".asset-card").filter({ hasText: prompt }).first();
  await expect(assetCard.locator(".media-preview img[alt='图片预览']")).toBeVisible();
  await expect(assetCard.getByRole("link", { name: "打开结果" })).toHaveAttribute("href", storedUrl);

  await page.getByRole("button", { name: "任务流 异步生成" }).click();
  const taskRow = page.locator(".task-row").filter({ has: page.locator(`a[href="${storedUrl}"]`) }).first();
  await expect(taskRow.locator(".media-preview.compact img[alt='图片预览']")).toBeVisible();
  await expect(taskRow.getByRole("link", { name: "打开结果" })).toHaveAttribute("href", storedUrl);
});

test("媒体任务 webhook 失败回调会标记任务失败", async ({ request }) => {
  const prompt = `E2E Webhook 图片失败 ${Date.now()}`;
  const created = await request.post("/api/jobs", {
    data: {
      prompt,
      mode: "图片",
      product: {
        id: "webhook-failed-product",
        name: "轻薄防晒衣",
        category: "服饰",
        price: "199",
        audience: "通勤女性",
        stage: "测试",
        platform: "小红书",
        tone: "清爽可信",
        assets: 0,
        notes: ["UPF50+ 防护", "冰感面料", "轻薄收纳"]
      },
      skill: {
        id: "image-visual-brief",
        name: "图片生成",
        category: "图片",
        description: "生成电商图片",
        fields: ["主体", "场景"],
        recommendedModel: "即梦视觉",
        score: "测试"
      },
      model: {
        id: "jimeng",
        name: "即梦视觉",
        provider: "火山引擎",
        lane: "图片 / 视频",
        latency: "异步",
        cost: "中高",
        status: "预留",
        strengths: ["海报草图", "视觉素材", "视频扩展"]
      }
    }
  });
  expect(created.status()).toBe(202);
  const initial = await created.json();

  const callback = await request.post("/api/jobs/webhook", {
    data: {
      externalJobId: initial.task.externalJobId,
      status: "failed",
      error: "供应商余额不足"
    }
  });
  await expect(callback).toBeOK();
  expect(await callback.json()).toEqual(expect.objectContaining({
    task: expect.objectContaining({
      id: initial.task.id,
      status: "失败",
      progress: 0,
      providerStatus: "failed",
      providerWarning: "供应商余额不足"
    }),
    webhook: expect.objectContaining({
      status: "failed",
      signature: "not_configured",
      errorCategory: "quota"
    })
  }));
});

test("计量 API 会记录媒体任务用量", async ({ request }) => {
  const prompt = `E2E 计量任务 ${Date.now()}`;
  const created = await request.post("/api/jobs", {
    data: {
      prompt,
      mode: "图片",
      product: {
        id: "billing-product",
        name: "轻薄防晒衣",
        category: "服饰",
        price: "199",
        audience: "通勤女性",
        stage: "测试",
        platform: "小红书",
        tone: "清爽可信",
        assets: 0,
        notes: ["UPF50+ 防护", "冰感面料", "轻薄收纳"]
      },
      skill: {
        id: "image-visual-brief",
        name: "图片生成",
        category: "图片",
        description: "生成电商图片",
        fields: ["主体", "场景"],
        recommendedModel: "即梦视觉",
        score: "测试"
      },
      model: {
        id: "jimeng",
        name: "即梦视觉",
        provider: "火山引擎",
        lane: "图片 / 视频",
        latency: "异步",
        cost: "中高",
        status: "预留",
        strengths: ["海报草图", "视觉素材", "视频扩展"]
      }
    }
  });
  expect(created.status()).toBe(202);
  const initial = await created.json();

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await expect(await request.get(`/api/jobs?id=${initial.task.id}`)).toBeOK();

  const usage = await request.get("/api/billing/usage");
  await expect(usage).toBeOK();
  const payload = await usage.json();
  expect(payload.summary).toEqual(expect.objectContaining({
    spentCents: expect.any(Number),
    eventCount: expect.any(Number)
  }));
  expect(payload.events).toEqual(expect.arrayContaining([
    expect.objectContaining({
      taskId: initial.task.id,
      amountCents: 60,
      providerLabel: "即梦视觉",
      status: "final"
    })
  ]));

  const invoice = await request.get("/api/billing/invoices");
  await expect(invoice).toBeOK();
  const invoicePayload = await invoice.json();
  const jimengLine = invoicePayload.invoice.lines.find((line: { providerLabel: string }) => line.providerLabel === "即梦视觉");
  expect(jimengLine).toEqual(expect.objectContaining({
    providerLabel: "即梦视觉",
    amountCents: expect.any(Number),
    finalCents: expect.any(Number)
  }));
  expect(jimengLine.amountCents).toBeGreaterThanOrEqual(60);
  expect(invoicePayload.invoice.supplierReconciliation).toEqual(expect.arrayContaining([
    expect.objectContaining({
      providerLabel: "即梦视觉",
      finalCents: expect.any(Number)
    })
  ]));
});

test("供应商账单 API 可以导入并生成对账差异", async ({ request }) => {
  const stamp = Date.now();
  const period = new Date().toISOString().slice(0, 7);
  let invoiceId = "";

  try {
    const imported = await request.post("/api/billing/supplier-invoices", {
      data: {
        period,
        invoices: [{
          id: `supplier-invoice-e2e-${stamp}`,
          providerId: "jimeng",
          providerLabel: "即梦视觉",
          period,
          amountCents: 12345,
          externalInvoiceId: `JM-${stamp}`,
          lineCount: 3,
          notes: ["E2E supplier import"]
        }]
      }
    });
    expect(imported.status()).toBe(201);
    const importedPayload = await imported.json();
    invoiceId = importedPayload.supplierInvoices.find((item: { externalInvoiceId?: string }) => item.externalInvoiceId === `JM-${stamp}`).id;
    expect(importedPayload).toEqual(expect.objectContaining({
      imported: 1,
      supplierInvoices: expect.arrayContaining([
        expect.objectContaining({
          id: invoiceId,
          providerLabel: "即梦视觉",
          amountCents: 12345,
          source: "json"
        })
      ]),
      reconciliation: expect.arrayContaining([
        expect.objectContaining({
          providerLabel: "即梦视觉",
          supplierCents: expect.any(Number),
          status: expect.stringMatching(/matched|needs_review|missing_internal/)
        })
      ])
    }));

    const listed = await request.get(`/api/billing/supplier-invoices?period=${period}`);
    await expect(listed).toBeOK();
    expect(await listed.json()).toEqual(expect.objectContaining({
      supplierInvoices: expect.arrayContaining([
        expect.objectContaining({ id: invoiceId, externalInvoiceId: `JM-${stamp}` })
      ])
    }));

    const invoice = await request.get(`/api/billing/invoices?period=${period}`);
    await expect(invoice).toBeOK();
    expect(await invoice.json()).toEqual(expect.objectContaining({
      supplierInvoices: expect.arrayContaining([
        expect.objectContaining({ id: invoiceId, providerLabel: "即梦视觉" })
      ]),
      supplierImportReconciliation: expect.arrayContaining([
        expect.objectContaining({ providerLabel: "即梦视觉" })
      ])
    }));
  } finally {
    if (invoiceId) {
      const deleted = await request.delete("/api/billing/supplier-invoices", { data: { id: invoiceId } });
      await expect(deleted).toBeOK();
      expect(JSON.stringify(await deleted.json())).not.toContain(invoiceId);
    }
  }
});

test("付款会话 API 可以创建并标记已支付", async ({ request }) => {
  const period = new Date().toISOString().slice(0, 7);
  const created = await request.post("/api/billing/checkout", {
    data: { period, note: "E2E checkout session" }
  });
  expect(created.status()).toBe(201);
  const createdPayload = await created.json();
  const session = createdPayload.session;
  expect(session).toEqual(expect.objectContaining({
    id: expect.stringMatching(/^pay-/),
    invoiceId: `bmxian-invoice-${period}`,
    period,
    currency: "CNY",
    provider: "manual",
    status: "pending",
    checkoutUrl: expect.stringContaining("/api/billing/checkout?sessionId=")
  }));

  const listed = await request.get(`/api/billing/checkout?period=${period}`);
  await expect(listed).toBeOK();
  expect(await listed.json()).toEqual(expect.objectContaining({
    paymentSessions: expect.arrayContaining([
      expect.objectContaining({ id: session.id, status: "pending" })
    ])
  }));

  const paid = await request.patch("/api/billing/checkout", {
    data: { id: session.id, status: "paid", note: "E2E paid" }
  });
  await expect(paid).toBeOK();
  const paidPayload = await paid.json();
  expect(paidPayload.session).toEqual(expect.objectContaining({
    id: session.id,
    status: "paid",
    paidAt: expect.any(String),
    note: "E2E paid"
  }));

  const invoice = await request.get(`/api/billing/invoices?period=${period}`);
  await expect(invoice).toBeOK();
  expect(await invoice.json()).toEqual(expect.objectContaining({
    paymentSessions: expect.arrayContaining([
      expect.objectContaining({ id: session.id, status: "paid" })
    ])
  }));
});

test("任务 retry API 可以重新执行失败任务", async ({ request }) => {
  const prompt = `E2E Retry API ${Date.now()}`;
  const task = {
    id: `retry-api-${Date.now()}`,
    title: `海报任务：${prompt}`,
    type: "海报",
    model: "自动路由",
    cost: "预估 0.80 元",
    status: "失败",
    progress: 0,
    prompt,
    productName: "轻薄防晒衣",
    skillName: "小红书爆款笔记",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const created = await request.post("/api/tasks", { data: task });
  await expect(created).toBeOK();

  const staleArtifact = {
    id: `artifact-${task.id}`,
    type: "海报",
    title: "旧 retry 产物",
    source: "E2E",
    body: `STALE RETRY ARTIFACT ${prompt}`,
    status: "待复核"
  };
  const staleCreated = await request.post("/api/artifacts", { data: staleArtifact });
  await expect(staleCreated).toBeOK();

  const retried = await request.post("/api/jobs/retry", { data: { id: task.id } });
  await expect(retried).toBeOK();
  expect(await retried.json()).toEqual(expect.objectContaining({
    task: expect.objectContaining({ id: task.id, status: "生成中", progress: 25 })
  }));

  await new Promise((resolve) => setTimeout(resolve, 1000));
  const completed = await request.get(`/api/jobs?id=${task.id}`);
  await expect(completed).toBeOK();
  const completedPayload = await completed.json();
  expect(completedPayload).toEqual(expect.objectContaining({
    task: expect.objectContaining({ id: task.id, status: "已完成", progress: 100 })
  }));
  expect(completedPayload.artifact.body).toContain(`海报生成任务包：${prompt}`);
  expect(completedPayload.artifact.body).not.toContain("STALE RETRY ARTIFACT");

  await request.delete("/api/artifacts", { data: { id: staleArtifact.id } });
});

test("批量生成 API 可以创建多条文本作品", async ({ request }) => {
  const stamp = Date.now();
  const response = await request.post("/api/batch/jobs", {
    data: {
      prompts: [`E2E 批量 API A ${stamp}`, `E2E 批量 API B ${stamp}`],
      mode: "电商",
      product: {
        id: "test-product",
        name: "轻薄防晒衣",
        category: "服饰",
        price: "199",
        audience: "通勤女性",
        stage: "测试",
        platform: "小红书",
        tone: "清爽可信",
        assets: 0,
        notes: ["UPF50+ 防护", "冰感面料", "轻薄收纳"]
      },
      skill: {
        id: "test-skill",
        name: "小红书爆款笔记",
        category: "自媒体",
        description: "生成真实体验感笔记",
        fields: ["商品", "场景"],
        recommendedModel: "DeepSeek 写作",
        score: "测试"
      },
      model: {
        id: "auto",
        name: "自动路由",
        provider: "斑马线",
        lane: "默认",
        latency: "按任务选择",
        cost: "动态估算",
        status: "已接入",
        strengths: ["任务识别"]
      }
    }
  });
  expect(response.status()).toBe(202);
  expect(await response.json()).toEqual(expect.objectContaining({
    tasks: expect.arrayContaining([
      expect.objectContaining({ title: expect.stringContaining("E2E 批量 API A") }),
      expect.objectContaining({ title: expect.stringContaining("E2E 批量 API B") })
    ]),
    artifacts: expect.any(Array)
  }));
});

test("Provider 配置会保存在本地", async ({ page }) => {
  await page.getByRole("button", { name: /引擎中心/ }).click();
  await page.getByRole("button", { name: /DeepSeek 写作/ }).click();

  await page.locator(".key-form input").nth(0).fill("DeepSeek 测试");
  await page.locator(".key-form input").nth(1).fill("https://api.deepseek.com");
  await page.locator(".key-form input").nth(2).fill("deepseek-v4-flash");
  await page.locator(".key-form input").nth(3).fill("test-key");
  await page.locator(".checkbox-line input").check();
  await page.waitForTimeout(800);

  await page.reload();
  await page.getByRole("button", { name: /引擎中心/ }).click();
  await page.getByRole("button", { name: /DeepSeek 写作/ }).click();

  await expect(page.locator(".key-form input").nth(0)).toHaveValue("DeepSeek 测试");
  await expect(page.locator(".key-form input").nth(1)).toHaveValue("https://api.deepseek.com");
  await expect(page.locator(".key-form input").nth(2)).toHaveValue("deepseek-v4-flash");
  await expect(page.locator(".key-form input").nth(3)).toHaveValue("••••");
  await expect(page.locator(".checkbox-line input")).toBeChecked();
});

test("引擎中心可以保存自动路由策略", async ({ page }) => {
  await page.getByRole("button", { name: /引擎中心/ }).click();
  await page.getByRole("group", { name: "自动路由策略" }).getByRole("button", { name: "国际优先" }).click();
  await expect(page.locator(".route-policy-box")).toContainText("国际优先");
  await expect(page.locator(".structured-box").filter({ hasText: "路由规则" })).toContainText("国际优先");

  await page.waitForTimeout(800);
  await page.reload();
  await page.getByRole("button", { name: /引擎中心/ }).click();
  await expect(page.locator(".route-policy-box")).toContainText("国际优先");

  await page.getByRole("group", { name: "自动路由策略" }).getByRole("button", { name: "均衡" }).click();
  await expect(page.locator(".route-policy-box")).toContainText("均衡");
});

test("引擎中心显示文本和图片 Provider", async ({ page, request }) => {
  await page.getByRole("button", { name: /引擎中心/ }).click();
  await expect(page.getByRole("button", { name: /ChatGPT \/ OpenAI/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /MiniMax/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Claude/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Gemini/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Midjourney/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /FLUX/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /GPT Image/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Stable Diffusion/ })).toBeVisible();

  const response = await request.get("/api/providers");
  await expect(response).toBeOK();
  const payload = await response.json();
  expect(payload.providers).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: "openai", label: "ChatGPT / OpenAI", model: "gpt-5.5" }),
    expect.objectContaining({ id: "minimax", label: "MiniMax", model: "MiniMax-M3" }),
    expect.objectContaining({ id: "claude", label: "Claude", model: "claude-sonnet-4-6" }),
    expect.objectContaining({ id: "gemini", label: "Gemini", model: "gemini-3.5-flash" }),
    expect.objectContaining({ id: "midjourney", label: "Midjourney 网关", model: "midjourney-v7" }),
    expect.objectContaining({ id: "flux", label: "FLUX / Black Forest Labs", model: "flux-pro-2" }),
    expect.objectContaining({ id: "gpt-image", label: "GPT Image", model: "gpt-image-1" }),
    expect.objectContaining({ id: "stable-diffusion", label: "Stable Diffusion + LoRA", model: "stable-image-ultra" })
  ]));
});

test("自动路由策略会影响文本 Provider 选择", async ({ request }) => {
  const providersResponse = await request.get("/api/providers");
  await expect(providersResponse).toBeOK();
  const { providers } = await providersResponse.json();
  const enabledTextProviders = providers.map((provider: { id: string; enabled: boolean; apiKey: string }) =>
    ["deepseek", "openai", "claude", "gemini", "minimax"].includes(provider.id)
      ? { ...provider, enabled: true, apiKey: "" }
      : provider
  );
  const product = {
    id: "routing-product",
    name: "路由测试商品",
    category: "测试",
    price: "199",
    audience: "运营团队",
    stage: "测试",
    platform: "小红书",
    tone: "清晰",
    assets: 0,
    notes: ["策略验证"]
  };
  const skill = {
    id: "routing-skill",
    name: "路由测试技能",
    category: "文章",
    description: "验证自动路由策略",
    fields: ["主题"],
    recommendedModel: "自动路由",
    score: "测试"
  };
  const model = {
    id: "auto",
    name: "自动路由",
    provider: "斑马线",
    lane: "默认",
    latency: "按任务选择",
    cost: "动态估算",
    status: "已接入",
    strengths: ["任务识别"]
  };

  await request.put("/api/workspace", {
    data: {
      providerConfigs: enabledTextProviders,
      routingPolicy: { textStrategy: "international-first" }
    }
  });
  const international = await request.post("/api/generate", {
    data: { prompt: "国际优先路由测试", mode: "文章", product, skill, model }
  });
  await expect(international).toBeOK();
  expect(await international.json()).toEqual(expect.objectContaining({
    fallback: true,
    warning: expect.stringContaining("ChatGPT / OpenAI")
  }));

  await request.put("/api/workspace", {
    data: {
      providerConfigs: enabledTextProviders,
      routingPolicy: { textStrategy: "domestic-first" }
    }
  });
  const domestic = await request.post("/api/generate", {
    data: { prompt: "国内优先路由测试", mode: "文章", product, skill, model }
  });
  await expect(domestic).toBeOK();
  expect(await domestic.json()).toEqual(expect.objectContaining({
    fallback: true,
    warning: expect.stringContaining("DeepSeek")
  }));

  await request.put("/api/workspace", {
    data: {
      providerConfigs: providers,
      routingPolicy: { textStrategy: "balanced" }
    }
  });
});

test("Provider 连接测试 API 会返回可读诊断", async ({ request }) => {
  const demo = await request.post("/api/providers/test", {
    data: {
      provider: {
        id: "demo",
        label: "Demo 本地生成",
        baseUrl: "local://demo",
        model: "bmxian-demo",
        apiKey: "",
        enabled: true
      }
    }
  });
  await expect(demo).toBeOK();
  expect(await demo.json()).toEqual(expect.objectContaining({
    ok: true,
    status: "demo",
    label: "Demo 本地生成"
  }));

  const missingKey = await request.post("/api/providers/test", {
    data: {
      provider: {
        id: "qwen-e2e-no-key",
        label: "通义 E2E 无 Key",
        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        model: "qwen-plus",
        apiKey: "",
        enabled: false
      }
    }
  });
  await expect(missingKey).toBeOK();
  expect(await missingKey.json()).toEqual(expect.objectContaining({
    ok: false,
    status: "missing-key",
    label: "通义 E2E 无 Key"
  }));

  const internationalProviders = [
    {
      id: "openai-e2e-no-key",
      label: "ChatGPT / OpenAI E2E 无 Key",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-5.5",
      expectedEndpoint: "https://api.openai.com/v1/responses"
    },
    {
      id: "minimax-e2e-no-key",
      label: "MiniMax E2E 无 Key",
      baseUrl: "https://api.minimax.io/v1",
      model: "MiniMax-M3",
      expectedEndpoint: "https://api.minimax.io/v1/chat/completions"
    },
    {
      id: "claude-e2e-no-key",
      label: "Claude E2E 无 Key",
      baseUrl: "https://api.anthropic.com/v1",
      model: "claude-sonnet-4-6",
      expectedEndpoint: "https://api.anthropic.com/v1/messages"
    },
    {
      id: "gemini-e2e-no-key",
      label: "Gemini E2E 无 Key",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      model: "gemini-3.5-flash",
      expectedEndpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent"
    }
  ];

  for (const provider of internationalProviders) {
    const response = await request.post("/api/providers/test", {
      data: {
        provider: {
          id: provider.id,
          label: provider.label,
          baseUrl: provider.baseUrl,
          model: provider.model,
          apiKey: "",
          enabled: false,
          kind: "chat",
          capabilities: ["text"]
        }
      }
    });
    await expect(response).toBeOK();
    expect(await response.json()).toEqual(expect.objectContaining({
      ok: false,
      status: "missing-key",
      label: provider.label,
      endpoint: provider.expectedEndpoint
    }));
  }

  const mediaConfig = await request.post("/api/providers/test", {
    data: {
      provider: {
        id: "jimeng",
        label: "即梦视觉",
        baseUrl: "https://media.example.com",
        model: "jimeng-image-video",
        apiKey: "test-key",
        enabled: true,
        kind: "media",
        capabilities: ["image", "poster", "video"]
      }
    }
  });
  await expect(mediaConfig).toBeOK();
  expect(await mediaConfig.json()).toEqual(expect.objectContaining({
    ok: true,
    status: "ok",
    label: "即梦视觉",
    endpoint: "https://media.example.com/jobs",
    message: expect.stringContaining("媒体 Provider 配置完整")
  }));
});

test("媒体 Provider 映射 API 会生成供应商请求预览", async ({ request }) => {
  const product = {
    id: "mapping-product",
    name: "轻薄防晒衣",
    category: "服饰",
    price: "199",
    audience: "通勤女性",
    stage: "测试",
    platform: "小红书",
    tone: "清爽可信",
    assets: 1,
    notes: ["UPF50+ 防护"]
  };
  const skill = {
    id: "image-visual-brief",
    name: "图片生成",
    category: "图片",
    description: "生成电商图片",
    fields: ["主体", "场景"],
    recommendedModel: "即梦视觉",
    score: "测试"
  };
  const model = {
    id: "jimeng",
    name: "即梦视觉",
    provider: "火山引擎",
    lane: "图片 / 视频",
    latency: "异步",
    cost: "中高",
    status: "预留",
    strengths: ["海报草图", "视觉素材"]
  };
  const visualSettings = {
    aspectRatio: "9:16",
    styleId: "clean-commerce",
    styleName: "清透商品主图",
    stylePrompt: "统一商品摄影风格",
    lockStyle: true,
    characterLock: true,
    characterName: "测试角色",
    characterReferenceUrl: "https://cdn.example.com/character.png",
    characterStrength: 0.88,
    seed: "17815",
    characterLoraAssetId: "lora-character-e2e",
    characterLoraName: "E2E 角色 LoRA",
    characterLoraId: "char-lora-17815",
    characterLoraUrl: "https://cdn.example.com/char-lora-17815.safetensors",
    characterLoraBaseModel: "SDXL / FLUX compatible",
    characterLoraTriggerWords: ["e2e_character", "same_face"],
    characterLoraWeight: 0.76,
    styleLoraId: "reserved-clean-commerce-v1",
    loraWeight: 0.68,
    triggerWords: ["bmxian_clean_commerce"]
  };

  const jimeng = await request.post("/api/providers/media-mapping", {
    data: {
      taskId: "preview-jimeng",
      prompt: "生成一张统一风格商品图",
      mode: "图片",
      product,
      skill,
      model,
      visualSettings,
      materials: [{
        id: "material-image",
        name: "参考图",
        kind: "图片",
        mimeType: "image/png",
        size: 1200,
        url: "https://cdn.example.com/ref.png",
        tags: ["参考"],
        createdAt: new Date().toISOString()
      }],
      provider: {
        id: "jimeng",
        label: "即梦视觉",
        baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
        model: "doubao-seedream-4-0-250828",
        apiKey: "sk-e2e-secret",
        enabled: true,
        kind: "media",
        capabilities: ["image", "poster", "video"]
      }
    }
  });
  await expect(jimeng).toBeOK();
  const jimengPayload = await jimeng.json();
  expect(jimengPayload.mapping).toEqual(expect.objectContaining({
    adapter: "jimeng",
    endpoint: "https://ark.cn-beijing.volces.com/api/v3/images/generations",
    headers: expect.objectContaining({ Authorization: "Bearer ••••" }),
    body: expect.objectContaining({
      model: "doubao-seedream-4-0-250828",
      size: "720x1280",
      response_format: "url",
      image: expect.arrayContaining(["https://cdn.example.com/character.png", "https://cdn.example.com/ref.png"])
    })
  }));
  expect(JSON.stringify(jimengPayload)).not.toContain("sk-e2e-secret");
  expect(jimengPayload.mapping.body.prompt).toContain("统一风格：清透商品主图");

  const kling = await request.post("/api/providers/media-mapping", {
    data: {
      taskId: "preview-kling",
      prompt: "生成 5 秒商品短视频",
      mode: "视频",
      product,
      skill: { ...skill, name: "视频生成", category: "视频", recommendedModel: "可灵视频" },
      model: { ...model, id: "kling", name: "可灵视频", provider: "快手" },
      visualSettings: { ...visualSettings, aspectRatio: "16:9" },
      provider: {
        id: "kling",
        label: "可灵视频",
        baseUrl: "https://api.klingai.com",
        model: "kling-v3-text-to-video",
        apiKey: "kling-e2e-secret",
        enabled: true,
        kind: "media",
        capabilities: ["video"]
      }
    }
  });
  await expect(kling).toBeOK();
  const klingPayload = await kling.json();
  expect(klingPayload.mapping).toEqual(expect.objectContaining({
    adapter: "kling",
    endpoint: "https://api.klingai.com/v1/videos/generations",
    headers: expect.objectContaining({ Authorization: "Bearer ••••" }),
    body: expect.objectContaining({
      model: "kling-v3-text-to-video",
      aspect_ratio: "16:9",
      duration: 5,
      quality: "720p"
    })
  }));
  expect(JSON.stringify(klingPayload)).not.toContain("kling-e2e-secret");

  const imageProviders = [
    {
      provider: {
        id: "midjourney",
        label: "Midjourney 网关",
        baseUrl: "https://media.example.com/midjourney",
        model: "midjourney-v7",
        apiKey: "example-test-key",
        enabled: true,
        kind: "media",
        capabilities: ["image", "poster"]
      },
      model: { ...model, id: "midjourney", name: "Midjourney", provider: "Midjourney 网关" },
      adapter: "midjourney",
      endpoint: "https://media.example.com/midjourney/imagine"
    },
    {
      provider: {
        id: "flux",
        label: "FLUX / Black Forest Labs",
        baseUrl: "https://api.bfl.ai/v1",
        model: "flux-pro-2",
        apiKey: "flux-e2e-secret",
        enabled: true,
        kind: "media",
        capabilities: ["image", "poster"]
      },
      model: { ...model, id: "flux", name: "FLUX", provider: "Black Forest Labs" },
      adapter: "flux",
      endpoint: "https://api.bfl.ai/v1/flux-pro-2"
    },
    {
      provider: {
        id: "gpt-image",
        label: "GPT Image",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-image-1",
        apiKey: "gpt-image-e2e-secret",
        enabled: true,
        kind: "media",
        capabilities: ["image", "poster"]
      },
      model: { ...model, id: "gpt-image", name: "GPT Image", provider: "OpenAI" },
      adapter: "gpt-image",
      endpoint: "https://api.openai.com/v1/images/generations"
    },
    {
      provider: {
        id: "stable-diffusion",
        label: "Stable Diffusion + LoRA",
        baseUrl: "https://sd.example.com",
        model: "sdxl-lora-gateway",
        apiKey: "sd-e2e-secret",
        enabled: true,
        kind: "media",
        capabilities: ["image", "poster"]
      },
      model: { ...model, id: "stable-diffusion", name: "Stable Diffusion + LoRA", provider: "SD Gateway" },
      adapter: "stable-diffusion",
      endpoint: "https://sd.example.com/generate"
    }
  ];

  for (const item of imageProviders) {
    const response = await request.post("/api/providers/media-mapping", {
      data: {
        taskId: `preview-${item.provider.id}`,
        prompt: "生成同一角色的商品海报",
        mode: "图片",
        product,
        skill,
        model: item.model,
        visualSettings,
        provider: item.provider
      }
    });
    await expect(response).toBeOK();
    const payload = await response.json();
    expect(payload.mapping).toEqual(expect.objectContaining({
      adapter: item.adapter,
      endpoint: item.endpoint,
      headers: expect.objectContaining({ Authorization: "Bearer ••••" })
    }));
    expect(JSON.stringify(payload)).not.toContain(item.provider.apiKey);
    expect(JSON.stringify(payload.mapping.body)).toContain("测试角色");
    expect(JSON.stringify(payload.mapping.body)).toContain("char-lora-17815");
    expect(JSON.stringify(payload.mapping.body)).toContain("https://cdn.example.com/char-lora-17815.safetensors");
  }
});

test("引擎中心可以测试 Provider 连接", async ({ page }) => {
  await page.getByRole("button", { name: /引擎中心/ }).click();
  await page.getByRole("button", { name: /可灵视频/ }).click();
  await page.getByRole("button", { name: "测试连接" }).click();

  await expect(page.locator(".provider-diagnostic")).toBeVisible();
  await expect(page.locator(".provider-diagnostic")).toContainText("连接可用");
});

test("商品档案可以在界面创建编辑删除", async ({ page }) => {
  await page.getByRole("button", { name: /商品档案/ }).click();
  await page.getByRole("button", { name: "新档案" }).click();

  const productName = `E2E UI 商品 ${Date.now()}`;
  await page.locator(".edit-form input").nth(0).fill(productName);
  await page.locator(".edit-form input").nth(1).fill("E2E 类目");
  await page.locator(".edit-form input").nth(3).fill("E2E 用户");
  await page.waitForTimeout(900);

  await expect(page.getByText(productName).first()).toBeVisible();

  await page.getByRole("button", { name: /删除/ }).click();
  await expect(page.getByText(productName)).toHaveCount(0);
});

test("商品档案可以从 CSV 导入 SKU", async ({ page }) => {
  const stamp = Date.now();
  const productName = `E2E UI 导入商品 ${stamp}`;
  const csv = [
    "商品编号,商品名称,类目,价格,目标人群,阶段,平台,品牌语气,素材数,卖点",
    `e2e-ui-import-${stamp},${productName},家居,269,学生家庭,上新,淘宝,稳重可信,4,\"护眼|耐用|适合书桌\"`
  ].join("\n");

  await page.getByRole("button", { name: /商品档案/ }).click();
  await page.getByLabel("导入 SKU 文件").setInputFiles({
    name: `ui-products-${stamp}.csv`,
    mimeType: "text/csv",
    buffer: Buffer.from(csv)
  });

  await expect(page.getByText("已导入 1 个商品")).toBeVisible();
  await expect(page.locator(".product-row").filter({ hasText: productName }).first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: productName })).toBeVisible();

  await page.getByRole("button", { name: /删除/ }).click();
  await expect(page.locator(".product-row").filter({ hasText: productName })).toHaveCount(0);
});

test("商品档案可以一键生成内容包到作品集", async ({ page, request }) => {
  const productName = `E2E 内容包 UI ${Date.now()}`;
  await page.getByRole("button", { name: /商品档案/ }).click();
  await page.getByRole("button", { name: "新档案" }).click();
  await page.locator(".edit-form input").nth(0).fill(productName);
  await page.locator(".edit-form input").nth(1).fill("E2E 内容包类目");
  await page.locator(".edit-form input").nth(3).fill("E2E 内容包用户");
  await page.waitForTimeout(900);

  await page.getByRole("button", { name: "生成内容包" }).click();
  await expect(page.getByText("已生成 4 条内容资产")).toBeVisible();

  await page.getByRole("button", { name: /作品集/ }).click();
  await expect(page.locator(".asset-card").filter({ hasText: `小红书种草：${productName}` }).first()).toBeVisible();
  await expect(page.locator(".asset-card").filter({ hasText: `抖音口播：${productName}` }).first()).toBeVisible();

  const workspace = await request.get("/api/workspace");
  const snapshot = await workspace.json();
  const generatedArtifacts = snapshot.artifacts.filter((artifact: { source: string }) =>
    artifact.source.includes(`${productName} / 内容套餐`)
  );
  const generatedTasks = snapshot.tasks.filter((task: { productName?: string; skillName?: string }) =>
    task.productName === productName && task.skillName === "电商内容套餐"
  );

  await Promise.all(
    generatedArtifacts.map((artifact: { id: string }) =>
      request.delete("/api/artifacts", { data: { id: artifact.id } })
    )
  );
  await Promise.all(
    generatedTasks.map((task: { id: string }) =>
      request.delete("/api/tasks", { data: { id: task.id } })
    )
  );
});

test("素材库可以上传素材并进入创作上下文", async ({ page }) => {
  const fileName = `e2e-ui-material-${Date.now()}.txt`;
  await page.getByRole("button", { name: /素材库/ }).click();
  await page.locator(".data-panel").filter({ hasText: "素材库" }).locator(".upload-control input[type=file]").setInputFiles({
    name: fileName,
    mimeType: "text/plain",
    buffer: Buffer.from("bmxian material ui test")
  });

  const card = page.locator(".material-card").filter({ hasText: fileName }).first();
  await expect(card).toBeVisible();
  await expect(card).toContainText("文档");

  await page.getByRole("button", { name: "创作台 聊天和任务流" }).click();
  await page.getByLabel("主路线").selectOption("image-visual-brief");
  await page.getByRole("button", { name: "高级设置" }).click();
  await expect(page.locator(".material-mini-list").filter({ hasText: fileName })).toBeVisible();

  await page.getByLabel("主路线").selectOption("free-chat");
  await expect(page.locator(".sidebar")).toBeVisible();
  await page.getByRole("button", { name: /素材库/ }).click();
  await page.getByRole("button", { name: `删除素材 ${fileName}` }).click();
  await expect(page.locator(".material-card").filter({ hasText: fileName })).toHaveCount(0);
});

test("素材库可以上传 LoRA 并在图片面板选择", async ({ page }) => {
  const stamp = Date.now();
  const loraName = `e2e-ui-lora-${stamp}`;
  const fileName = `${loraName}.safetensors`;

  await page.getByRole("button", { name: /素材库/ }).click();
  const loraPanel = page.locator(".data-panel").filter({ hasText: "LoRA 资产" });
  await loraPanel.getByLabel("触发词").fill("e2e_ui_lora, same_face");
  await loraPanel.locator(".upload-control input[type=file]").setInputFiles({
    name: fileName,
    mimeType: "application/octet-stream",
    buffer: Buffer.from("bmxian lora ui test")
  });

  await expect(loraPanel.locator(".material-card").filter({ hasText: loraName }).first()).toBeVisible();

  await page.getByRole("button", { name: "创作台 聊天和任务流" }).click();
  await page.getByLabel("主路线").selectOption("image-visual-brief");
  await page.getByLabel("角色 LoRA").selectOption({ label: loraName });
  await page.getByRole("button", { name: "高级设置" }).click();
  await expect(page.locator(".character-advanced-panel")).toContainText("e2e_ui_lora");

  await page.getByLabel("主路线").selectOption("free-chat");
  await expect(page.locator(".sidebar")).toBeVisible();
  await page.getByRole("button", { name: /素材库/ }).click();
  await page.getByRole("button", { name: `删除 LoRA ${loraName}` }).click();
  await expect(loraPanel.locator(".material-card").filter({ hasText: loraName })).toHaveCount(0);
});

test("图片生成角色可以创建和删除", async ({ page }) => {
  await page.getByLabel("主路线").selectOption("image-visual-brief");
  await expect(page.locator(".character-os-shell")).toBeVisible();

  const characterSelect = page.getByLabel("角色", { exact: true });
  const beforeCount = await characterSelect.locator("option").count();

  await page.getByRole("button", { name: "创建角色" }).click();
  await expect(characterSelect.locator("option")).toHaveCount(beforeCount + 1);
  await expect(characterSelect.locator("option:checked")).toHaveText("新角色");

  const createdId = await characterSelect.inputValue();
  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: /删除当前角色/ }).click();

  await expect(characterSelect.locator("option")).toHaveCount(beforeCount);
  await expect(characterSelect).not.toHaveValue(createdId);
});

test("图片生成 Identity Set 加号可以上传参考脸图片", async ({ page }) => {
  await page.getByLabel("主路线").selectOption("image-visual-brief");
  await expect(page.locator(".character-os-shell")).toBeVisible();

  await page.getByRole("button", { name: "创建角色" }).click();
  await expect(page.getByLabel("角色", { exact: true }).locator("option:checked")).toHaveText("新角色");

  const materialResponse = page.waitForResponse((response) =>
    response.url().includes("/api/materials") && response.request().method() === "POST"
  );
  const characterResponse = page.waitForResponse((response) =>
    response.url().includes("/api/characters") && response.request().method() === "PUT"
  );
  await page.locator('label[aria-label="添加参考图"] input[type=file]').setInputFiles({
    name: `identity-reference-${Date.now()}.png`,
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64"
    )
  });

  const materialPayload = await (await materialResponse).json();
  await characterResponse;
  await expect(page.locator(`.reference-strip img[src="${materialPayload.material.url}"]`).first()).toBeVisible();

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: /删除当前角色/ }).click();
});

test("顶部搜索可以跳转到路线库结果", async ({ page }) => {
  await page.getByPlaceholder("搜索商品、素材、LoRA、路线、作品").fill("小红书爆款笔记");
  const result = page.locator(".search-results button").filter({ hasText: "小红书爆款笔记" }).first();
  await expect(result).toBeVisible();
  await result.click();

  await expect(page.getByRole("heading", { level: 1, name: "路线库" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "小红书爆款笔记" })).toBeVisible();
});

test("创作台可以批量生成文本作品", async ({ page }) => {
  const stamp = Date.now();
  await page.getByLabel("主路线").selectOption("taobao-detail");
  await page.getByLabel("更多").click();
  await page.getByRole("button", { name: "批量" }).click();
  await page.getByLabel("批量生成内容").fill(`E2E 批量 UI A ${stamp}\nE2E 批量 UI B ${stamp}`);
  await page.getByRole("button", { name: "批量生成" }).click();

  await expect(page.getByText("已创建 2 个批量任务")).toBeVisible();
  await page.getByRole("button", { name: /作品集/ }).click();
  await expect(page.locator(".asset-card").filter({ hasText: `E2E 批量 UI A ${stamp}`.slice(0, 18) }).first()).toBeVisible();
});

test("路线库可以在界面创建编辑删除并用于创作台", async ({ page }) => {
  await page.getByRole("button", { name: /路线库/ }).click();
  const routeGrid = page.locator(".skill-grid").first();
  await expect(routeGrid.locator(".skill-card").filter({ hasText: "润色改写" })).toHaveCount(0);
  await expect(page.getByText("可调用技能")).toBeVisible();
  await expect(page.locator(".skill-card").filter({ hasText: "润色改写" })).toBeVisible();

  await page.getByLabel("选择路线 长文结构拆解").click();
  await expect(page.locator(".data-panel.detail")).toContainText("长文结构拆解");
  await page.getByLabel("选择路线 图片生成").click();
  await expect(page.locator(".data-panel.detail")).toContainText("图片生成");
  await page.getByLabel("选择技能 翻译").click();
  await expect(page.locator(".data-panel.detail")).toContainText("翻译");
  await page.getByLabel("选择路线 图片生成").getByRole("button", { name: "使用" }).click();
  await expect(page.locator(".sidebar")).toHaveCount(0);
  await expect(page.locator(".image-generator-topbar")).toBeVisible();
  await expect(page.locator(".character-os-shell")).toBeVisible();
  await page.getByLabel("主路线").selectOption("free-chat");
  await expect(page.getByRole("heading", { level: 1, name: "创作台" })).toBeVisible();

  await page.getByRole("button", { name: /路线库/ }).click();
  await page.getByRole("button", { name: "保存新路线" }).click();

  const skillName = `E2E 路线 ${Date.now()}`;
  await page.locator(".edit-form input").nth(0).fill(skillName);
  await page.locator(".edit-form input").nth(1).fill("E2E 分类");
  await page.locator(".edit-form input").nth(2).fill("自动路由");
  await page.locator(".edit-form input").nth(3).fill("E2E");
  await page.locator(".key-form textarea").fill("E2E 自定义路线描述，用于验证技能市场可以扩展。");
  await page.locator(".key-form input").fill("商品, 平台, 人群, 预算");
  await page.waitForTimeout(900);

  await expect(page.getByText(skillName).first()).toBeVisible();

  await page.getByRole("button", { name: "使用路线" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "创作台" })).toBeVisible();
  await expect(page.locator(".route-summary")).toContainText(skillName);

  await page.getByRole("button", { name: /路线库/ }).click();
  await expect(page.locator(".skill-card").filter({ hasText: skillName })).toBeVisible();
  await page.getByRole("button", { name: /删除/ }).click();
  await expect(page.getByText(skillName)).toHaveCount(0);
});

test("路线库可以上传和下载技能文件", async ({ page }) => {
  await page.getByRole("button", { name: /路线库/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "路线库" })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.locator(".skill-card").filter({ hasText: "自由创作助理" }).first().getByRole("button", { name: /下载/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("bmxian-skill-free-chat.json");

  const importedSkillName = `E2E 导入技能 ${Date.now()}`;
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "bmxian-imported.skill.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      schema: "bmxian.skill",
      version: 1,
      skill: {
        id: `e2e-imported-skill-${Date.now()}`,
        name: importedSkillName,
        category: "文章",
        description: "通过本地 skill 文件导入，用来验证技能迁移。",
        fields: ["主题", "读者", "篇幅"],
        recommendedModel: "通义长文",
        score: "导入"
      }
    }))
  });

  await expect(page.getByText("已导入 1 个技能。")).toBeVisible();
  await expect(page.locator(".skill-card").filter({ hasText: importedSkillName })).toBeVisible();
  await page.getByRole("button", { name: "使用路线" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "创作台" })).toBeVisible();
  await expect(page.getByLabel("主路线")).toBeVisible();
  await expect(page.getByLabel("技能")).toHaveValue(/e2e-imported-skill-/);
  await expect(page.locator(".route-summary")).toContainText(importedSkillName);

  await page.getByRole("button", { name: /路线库/ }).click();
  await page.getByRole("button", { name: /删除/ }).click();
  await expect(page.getByText(importedSkillName)).toHaveCount(0);
});

test("路线库可以把自定义技能发布到市场并审核安装", async ({ page, request }) => {
  await page.getByRole("button", { name: /路线库/ }).click();
  await page.getByRole("button", { name: "保存新路线" }).click();

  const skillName = `E2E 市场发布 ${Date.now()}`;
  await page.locator(".edit-form input").nth(0).fill(skillName);
  await page.locator(".edit-form input").nth(1).fill("文章");
  await page.locator(".edit-form input").nth(2).fill("通义长文");
  await page.locator(".edit-form input").nth(3).fill("发布");
  await page.locator(".key-form textarea").fill("用于验证自定义技能发布到市场、审核和安装。");
  await page.locator(".key-form input").fill("主题, 受众, 语气");
  await page.waitForTimeout(900);

  await page.getByRole("button", { name: "发布到市场" }).click();
  await expect(page.getByText(`已提交「${skillName}」到技能市场审核。`)).toBeVisible();

  const pendingCard = page.locator(".market-skill-card").filter({ hasText: skillName }).first();
  await expect(pendingCard).toBeVisible();
  await expect(pendingCard).toContainText("待审核");
  await expect(pendingCard.getByRole("button", { name: `待审核 ${skillName}` })).toBeDisabled();

  await pendingCard.getByRole("button", { name: "审核通过" }).click();
  await expect(page.getByText(`「${skillName}」已更新为已上架。`)).toBeVisible();

  const approvedCard = page.locator(".market-skill-card").filter({ hasText: skillName }).first();
  await expect(approvedCard).toContainText("已上架");
  await approvedCard.getByRole("button", { name: `安装 ${skillName}` }).click();
  await expect(page.locator(".skill-card").filter({ hasText: skillName })).toHaveCount(2);

  await page.waitForTimeout(700);
  const workspace = await request.get("/api/workspace");
  const snapshot = await workspace.json();
  expect(snapshot.publishedSkills).toEqual(expect.arrayContaining([
    expect.objectContaining({
      name: skillName,
      status: "已上架",
      publisherSkillId: expect.stringMatching(/^skill-/)
    })
  ]));
});

test("技能市场可以安装路线并防重复", async ({ page, request }) => {
  await request.delete("/api/skills", { data: { id: "market-live-conversion-script" } });
  await page.reload();

  await page.getByRole("button", { name: /路线库/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "路线库" })).toBeVisible();
  await expect(page.getByText("技能市场")).toBeVisible();

  await page.locator(".segment-row").getByRole("button", { name: "电商", exact: true }).click();
  const marketCard = page.locator(".market-skill-card").filter({ hasText: "直播间促单脚本" }).first();
  await expect(marketCard).toBeVisible();
  await marketCard.getByRole("button", { name: "安装 直播间促单脚本" }).click();

  const installedCard = page.locator(".skill-card").filter({ hasText: "直播间促单脚本" }).first();
  await expect(installedCard).toBeVisible();
  await expect(marketCard.getByRole("button", { name: "已安装 直播间促单脚本" })).toBeDisabled();

  await installedCard.getByRole("button", { name: "编辑路线" }).click();
  await page.getByRole("button", { name: "使用路线" }).click();
  await expect(page.locator(".route-summary")).toContainText("直播间促单脚本");
});

test("设置页展示 Scenelet 和 LoamTrace 预留配置", async ({ page }) => {
  await page.getByRole("button", { name: /设置/ }).click();

  await expect(page.getByText("账号认证")).toBeVisible();
  await expect(page.locator(".auth-facts")).toContainText("本地会话");
  await expect(page.locator(".auth-facts")).toContainText("owner@bmxian.local");

  const metric = page.locator(".metric-card").filter({ hasText: "作品总数" }).first();
  await expect(metric).toBeVisible();
  await expect(metric.locator("strong")).toContainText(/\d+/);

  const scenelet = page.locator(".plugin-card").filter({ hasText: "Scenelet" }).first();
  await expect(scenelet).toBeVisible();
  await expect(scenelet).toContainText("video.generate");
  await expect(scenelet).toContainText("SCENELET_BASE_URL");

  const loamtrace = page.locator(".plugin-card").filter({ hasText: "LoamTrace" }).first();
  await expect(loamtrace).toBeVisible();
  await expect(loamtrace).toContainText("source.verify");
  await expect(loamtrace).toContainText("LOAMTRACE_BASE_URL");
});

test("设置页可以邀请团队成员", async ({ page }) => {
  const stamp = Date.now();
  await page.getByRole("button", { name: /设置/ }).click();
  await expect(page.getByText("团队权限")).toBeVisible();

  await page.getByPlaceholder("成员姓名").fill(`UI 成员 ${stamp}`);
  await page.getByPlaceholder("email@example.com").fill(`ui-${stamp}@bmxian.local`);
  await page.getByLabel("成员角色").selectOption("viewer");
  await page.getByRole("button", { name: "添加成员" }).click();

  await expect(page.getByText(`UI 成员 ${stamp}`)).toBeVisible();
  await expect(page.getByText(`ui-${stamp}@bmxian.local`)).toBeVisible();
  await expect(page.getByText("只读").first()).toBeVisible();

  const row = page.locator(".team-row").filter({ hasText: `UI 成员 ${stamp}` });
  await row.getByRole("button", { name: `删除成员 UI 成员 ${stamp}` }).click();
  await expect(row).toHaveCount(0);
});

test("设置页可以保存和删除账号密钥", async ({ page }) => {
  const stamp = Date.now();
  const secretName = `E2E 密钥 ${stamp}`;
  const secretValue = `sk-ui-${stamp}-secret`;

  await page.getByRole("button", { name: /设置/ }).click();
  await expect(page.getByText("账号密钥库")).toBeVisible();

  await page.getByPlaceholder("密钥名称").fill(secretName);
  await page.getByLabel("密钥类型").selectOption("provider");
  await page.getByPlaceholder("关联 ID").fill("deepseek");
  await page.getByPlaceholder("密钥值").fill(secretValue);
  await page.getByRole("button", { name: "保存密钥" }).click();

  const row = page.locator(".team-row").filter({ hasText: secretName }).first();
  await expect(row).toBeVisible();
  await expect(row).toContainText("模型");
  await expect(row).toContainText("••••");
  await expect(page.getByText(secretValue)).toHaveCount(0);

  await row.getByRole("button", { name: `删除密钥 ${secretName}` }).click();
  await expect(page.locator(".team-row").filter({ hasText: secretName })).toHaveCount(0);
});

test("设置页可以导入和删除供应商账单 CSV", async ({ page }) => {
  const stamp = Date.now();
  const period = new Date().toISOString().slice(0, 7);
  const invoiceId = `UI-JM-${stamp}`;

  await page.getByRole("button", { name: /设置/ }).click();
  await expect(page.getByText("供应商账单")).toBeVisible();

  await page.getByLabel("导入供应商账单 CSV").setInputFiles({
    name: `supplier-${stamp}.csv`,
    mimeType: "text/csv",
    buffer: Buffer.from(`providerId,providerLabel,period,amountYuan,externalInvoiceId,lineCount,notes\njimeng,即梦视觉,${period},88.66,${invoiceId},2,E2E UI supplier invoice`)
  });

  const row = page.locator(".team-row").filter({ hasText: invoiceId }).first();
  await expect(row).toBeVisible();
  await expect(row).toContainText("即梦视觉");
  await expect(row).toContainText("¥88.66");

  await row.getByRole("button", { name: "删除账单 即梦视觉" }).click();
  await expect(page.locator(".team-row").filter({ hasText: invoiceId })).toHaveCount(0);
});

test("设置页可以生成并标记付款会话", async ({ page }) => {
  await page.getByRole("button", { name: /设置/ }).click();
  await expect(page.getByText("付款会话")).toBeVisible();

  await page.getByRole("button", { name: "生成付款单" }).click();
  const row = page.locator(".payment-row").filter({ hasText: "bmxian-invoice-" }).first();
  await expect(row).toBeVisible();
  await expect(row).toContainText("manual");
  await expect(row).toContainText("待支付");

  await row.getByRole("button", { name: /标记已支付/ }).click();
  await expect(row).toContainText("已支付");
});

test("设置页可以下载工作区备份", async ({ page }) => {
  await page.getByRole("button", { name: /设置/ }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出备份" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("bmxian-workspace-backup.json");
});

test("作品集可以下载 Markdown 导出", async ({ page }) => {
  await page.getByRole("button", { name: /作品集/ }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 MD" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("bmxian-artifacts.md");
});

test("作品集可以把作品加入发布计划", async ({ page, request }) => {
  const prompt = `E2E 发布计划 UI ${Date.now()}`;
  const titleSnippet = prompt.slice(0, 18);
  await page.locator("textarea").fill(prompt);
  await page.getByRole("button", { name: "生成", exact: true }).click();
  await expect(page.getByText("生成一份").first()).toBeVisible();

  await page.getByRole("button", { name: /作品集/ }).click();
  const card = page.locator(".asset-card").filter({ hasText: titleSnippet }).first();
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "排期" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "发布计划" })).toBeVisible();
  const planCard = page.locator(".calendar-card").filter({ hasText: titleSnippet }).first();
  await expect(planCard).toBeVisible();
  await expect(planCard).toContainText("待发布");

  await planCard.getByRole("button", { name: "标记已发布" }).click();
  await expect(planCard).toContainText("已发布");
  await planCard.getByRole("button", { name: /删除排期/ }).click();
  await expect(page.locator(".calendar-card").filter({ hasText: titleSnippet })).toHaveCount(0);

  const workspace = await request.get("/api/workspace");
  const snapshot = await workspace.json();
  const artifact = snapshot.artifacts.find((item: { title: string }) => item.title.includes(titleSnippet));
  if (artifact) {
    await request.delete("/api/artifacts", { data: { id: artifact.id } });
  }
});

test("作品集可以对单个作品做合规检查", async ({ page }) => {
  await page.getByRole("button", { name: /作品集/ }).click();
  const card = page.locator(".asset-card").first();
  await card.getByRole("button", { name: "合规" }).click();
  await expect(card.locator(".compliance-box")).toBeVisible();
});

test("海报模式会通过任务流生成作品", async ({ page }) => {
  const prompt = `E2E 海报 UI ${Date.now()}`;
  await page.getByLabel("主路线").selectOption("poster-layout");
  await page.locator("textarea").fill(prompt);
  await page.getByRole("button", { name: "生成", exact: true }).click();

  await expect(
    page.locator(".message").filter({ hasText: prompt.slice(0, 16) }).filter({ hasText: "海报生成任务包" }).first()
  ).toBeVisible();

  await page.getByRole("button", { name: /作品集/ }).click();
  await expect(page.locator(".asset-card").filter({ hasText: prompt }).first()).toBeVisible();

  await page.getByRole("button", { name: "任务流 异步生成" }).click();
  const taskRow = page.locator(".task-row").filter({ hasText: prompt.slice(0, 16) }).first();
  await expect(taskRow).toBeVisible();
  await expect(taskRow).toContainText("已完成");
});

test("视频生成路线会通过任务流生成视频作品", async ({ page, request }) => {
  const prompt = `E2E 视频生成 UI ${Date.now()}`;
  await page.getByLabel("主路线").selectOption("douyin-script");
  await expect(page.getByLabel("主路线").locator("option:checked")).toHaveText("视频生成");
  await expect(page.locator(".route-summary")).toContainText("可灵视频");
  await page.locator("textarea").fill(prompt);
  await page.getByRole("button", { name: "生成", exact: true }).click();

  await expect(
    page.locator(".message").filter({ hasText: prompt.slice(0, 16) }).filter({ hasText: "视频生成任务包" }).first()
  ).toBeVisible();

  const workspace = await request.get("/api/workspace");
  const snapshot = await workspace.json();
  const artifact = snapshot.artifacts.find((item: { title: string; body: string; source: string }) =>
    item.title.includes(prompt.slice(0, 18)) || item.body.includes(prompt)
  );
  expect(artifact?.type).toBe("视频");
  expect(artifact?.body).toContain("视频生成任务包");
  expect(artifact?.source).toContain("视频生成");

  const task = snapshot.tasks.find((item: { prompt?: string; type?: string; skillName?: string }) => item.prompt === prompt);
  expect(task).toEqual(expect.objectContaining({
    type: "视频",
    skillName: "视频生成"
  }));
});

test("图片生成路线会通过任务流生成图片作品", async ({ page, request }) => {
  const prompt = `E2E 图片生成 UI ${Date.now()}`;
  await page.getByLabel("主路线").selectOption("image-visual-brief");
  await expect(page.getByLabel("主路线").locator("option:checked")).toHaveText("图片生成");
  await expect(page.locator(".sidebar")).toHaveCount(0);
  await expect(page.locator(".character-os-shell")).toBeVisible();
  await expect(page.locator(".visual-control-panel")).toHaveCount(1);
  await page.getByLabel("生成数量 Number").getByRole("button", { name: "1" }).click();
  await page.getByLabel("图片提示词").fill(prompt);
  await page.getByRole("button", { name: /生成 \(1\)/ }).click();

  await expect(page.locator(".character-result-card").filter({ hasText: prompt.slice(0, 16) }).first()).toBeVisible();

  const workspace = await request.get("/api/workspace");
  const snapshot = await workspace.json();
  const artifact = snapshot.artifacts.find((item: { title: string; body: string; source: string }) =>
    item.title.includes(prompt.slice(0, 18)) || item.body.includes(prompt)
  );
  expect(artifact?.type).toBe("图片");
  expect(artifact?.body).toContain("图片生成任务包");
  expect(artifact?.body).toContain("生成指令");
  expect(artifact?.source).toContain("图片生成");

  const task = snapshot.tasks.find((item: { prompt?: string; type?: string; skillName?: string }) => item.prompt === prompt);
  expect(task).toEqual(expect.objectContaining({
    type: "图片",
    skillName: "图片生成"
  }));
});

test("作品可以保存和删除", async ({ page }) => {
  const prompt = `E2E 作品管理 ${Date.now()}`;
  await page.locator("textarea").fill(prompt);
  await page.getByRole("button", { name: "生成", exact: true }).click();
  await expect(page.getByText("生成一份").first()).toBeVisible();

  await page.getByRole("button", { name: /作品集/ }).click();
  const card = page.locator(".asset-card").filter({ hasText: "E2E 作品管理" }).first();
  await expect(card).toBeVisible();

  await card.getByRole("button", { name: "保存" }).click();
  await expect(card.getByText("已保存")).toBeVisible();

  await card.getByRole("button", { name: /复制/ }).click();
  await expect(card.getByText("已复制")).toBeVisible();

  await card.getByRole("button", { name: /删除/ }).click();
  await expect(page.locator(".asset-card").filter({ hasText: prompt })).toHaveCount(0);
});

test("任务流可以清理已完成任务", async ({ page }) => {
  await page.getByRole("button", { name: "任务流 异步生成" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "任务流" })).toBeVisible();
  await page.getByRole("button", { name: "清理完成" }).click();
  await expect(page.locator(".task-row").filter({ hasText: "已完成" })).toHaveCount(0);
});

test("任务流可以重试失败任务", async ({ page, request }) => {
  const prompt = `E2E UI Retry ${Date.now()}`;
  const task = {
    id: `retry-ui-${Date.now()}`,
    title: `海报任务：${prompt}`,
    type: "海报",
    model: "自动路由",
    cost: "预估 0.80 元",
    status: "失败",
    progress: 0,
    prompt,
    productName: "轻薄防晒衣",
    skillName: "小红书爆款笔记",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const created = await request.post("/api/tasks", { data: task });
  await expect(created).toBeOK();
  await page.getByRole("button", { name: "任务流 异步生成" }).click();
  await page.getByRole("button", { name: "刷新" }).click();
  const row = page.locator(".task-row").filter({ hasText: prompt.slice(0, 16) }).first();
  await expect(row).toContainText("失败");
  await row.getByRole("button", { name: /重试任务/ }).click();
  await expect(row).toContainText("已完成", { timeout: 5000 });
  await row.getByRole("button", { name: /删除任务/ }).click();
  await expect(page.locator(".task-row").filter({ hasText: prompt.slice(0, 16) })).toHaveCount(0);
});

test("工作区 API 可以导出重置再导入", async ({ request }) => {
  const exported = await request.get("/api/workspace/export");
  await expect(exported).toBeOK();
  const snapshot = await exported.json();
  expect(snapshot).toEqual(expect.objectContaining({
    products: expect.any(Array),
    skills: expect.any(Array),
    artifacts: expect.any(Array),
    publishPlan: expect.any(Array),
    generatedMedia: expect.objectContaining({
      assets: expect.any(Array)
    }),
    uploadedMedia: expect.objectContaining({
      assets: expect.any(Array)
    })
  }));
  const mediaUrl = `/generated/e2e-import-${Date.now()}.svg`;
  const mediaSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#d2ede3"/><text x="160" y="98" font-size="24" text-anchor="middle" fill="#161819">Bmxian Export</text></svg>`;
  const mediaArtifact = {
    id: `artifact-import-media-${Date.now()}`,
    type: "图片",
    title: "导入媒体作品",
    source: "E2E / workspace import",
    body: `图片生成任务包：导入媒体作品\n结果链接：${mediaUrl}`,
    status: "待复核",
    mediaUrl
  };
  const uploadUrl = `/uploads/e2e-import-material-${Date.now()}.txt`;
  const uploadText = "Bmxian upload bundle";
  const material = {
    id: `mat-import-${Date.now()}`,
    name: "导入素材.txt",
    kind: "文档",
    mimeType: "text/plain",
    size: Buffer.byteLength(uploadText),
    url: uploadUrl,
    tags: ["e2e", "backup"],
    createdAt: new Date().toISOString()
  };
  const snapshotWithMedia = {
    ...snapshot,
    artifacts: [mediaArtifact, ...snapshot.artifacts],
    materials: [material, ...snapshot.materials],
    generatedMedia: {
      version: 1,
      assets: [
        ...snapshot.generatedMedia.assets,
        {
          url: mediaUrl,
          mimeType: "image/svg+xml",
          dataBase64: Buffer.from(mediaSvg).toString("base64"),
          bytes: Buffer.byteLength(mediaSvg)
        }
      ]
    },
    uploadedMedia: {
      version: 1,
      assets: [
        ...snapshot.uploadedMedia.assets,
        {
          url: uploadUrl,
          mimeType: "text/plain",
          dataBase64: Buffer.from(uploadText).toString("base64"),
          bytes: Buffer.byteLength(uploadText)
        }
      ]
    }
  };

  const reset = await request.post("/api/workspace/reset");
  await expect(reset).toBeOK();
  expect(await reset.json()).toEqual(expect.objectContaining({
    products: expect.arrayContaining([expect.objectContaining({ id: "suncoat" })])
  }));

  const imported = await request.post("/api/workspace/import", { data: snapshotWithMedia });
  await expect(imported).toBeOK();
  const importedPayload = await imported.json();
  expect(importedPayload).toEqual(expect.objectContaining({
    products: expect.arrayContaining(snapshot.products.slice(0, 1)),
    artifacts: expect.arrayContaining([expect.objectContaining({ id: mediaArtifact.id, mediaUrl })]),
    materials: expect.arrayContaining([expect.objectContaining({ id: material.id, url: uploadUrl })]),
    generatedMediaRestored: expect.objectContaining({ restored: expect.any(Number) }),
    uploadedMediaRestored: expect.objectContaining({ restored: expect.any(Number) })
  }));
  const restoredMedia = await request.get(mediaUrl);
  await expect(restoredMedia).toBeOK();
  expect(await restoredMedia.text()).toContain("Bmxian Export");
  const restoredUpload = await request.get(uploadUrl);
  await expect(restoredUpload).toBeOK();
  expect(await restoredUpload.text()).toBe(uploadText);
});
