# -*- coding: utf-8 -*-
"""
经历翻译官 · LangChain 后端（替代扣子 Coze）
============================================
模拟前端既有的两个扣子接口，使前端只需改配置即可接入，业务代码零改动：
  POST /workflow/run       -> 生成诊断报告 / 局部改写（兼容 Coze workflow 契约）
  POST /chat/completions   -> 多轮求职咨询对话（兼容 OpenAI/Cozechat 契约）
底层由 LangChain 调度 DeepSeek / 通义千问 Qwen。
"""
import os
from fastapi import FastAPI, Request, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from config import LLM_PROVIDER
from workflows import run_report, run_rewrite, run_chat
from knowledge import kb_status

# 与 index.html 中三个 workflow_id 对齐，用于路由意图
WF_REPORT_DEEP = "7666789168270114854"      # 深度精准模式 -> 报告
WF_REPORT_FAST = "7666812645421170714"      # 极速简历模式 -> 简历抽取后报告
WF_REWRITE = "7667030806602596388"           # 局部改写

# 可选后端鉴权：前端 COZE_API_TOKEN 需与之匹配；留空则不校验
BACKEND_API_KEY = os.environ.get("BACKEND_API_KEY", "").strip()

app = FastAPI(title="经历翻译官后端 (LangChain + DeepSeek/Qwen)")

# 允许前端以 file:// 或任意来源调用（本地联调；生产请收紧 allow_origins）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)


def _check_auth(authorization: str | None):
    if BACKEND_API_KEY:
        token = (authorization or "").replace("Bearer ", "", 1).strip()
        if token != BACKEND_API_KEY:
            raise HTTPException(status_code=401, detail="未授权：API Key 不匹配")


def _provider_override(request: Request) -> str | None:
    h = (request.headers.get("X-LLM-Provider") or "").strip()
    q = (request.query_params.get("provider") or "").strip()
    return h or q or None


@app.get("/health")
async def health():
    return {"service": "jingli-translator-backend", "status": "ok",
            "llm_provider": LLM_PROVIDER, "knowledge_base": kb_status()}


@app.get("/ping")
async def ping():
    """极简连通性检查（任何前端、curl、PowerShell 都能秒回；
    用于排查 file:// → 127.0.0.1:8000 的 CORS / 代理拦截问题）"""
    return {"pong": True}


@app.post("/workflow/run")
async def workflow_run(request: Request):
    _check_auth(request.headers.get("Authorization"))
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="请求体必须为 JSON")
    workflow_id = (body.get("workflow_id") or "").strip()
    parameters = body.get("parameters") or {}
    provider = _provider_override(request)

    try:
        if workflow_id == WF_REWRITE:
            data = await run_rewrite(parameters, provider)
        else:
            # 深度 / 极速简历抽取 共用同一套报告生成逻辑
            data = await run_report(parameters, provider)
    except Exception as e:  # noqa 双保险：任何意外都回退模板，绝不返回 5xx 让前端白屏
        print("[workflow/run] 异常回退：", e)
        data = template_fallback(workflow_id, parameters)

    # 兼容前端 parseCozeResponse / normalizeReport / extractBlockContent：
    # 统一返回 { code:0, data:{...} }
    return {"code": 0, "data": data}


@app.post("/chat/completions")
async def chat_completions(request: Request):
    _check_auth(request.headers.get("Authorization"))
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="请求体必须为 JSON")
    # 前端 callCozeBot 传 additional_messages；兼容通用 messages 字段
    messages = body.get("additional_messages") or body.get("messages") or []
    body_style = body.get("style") or body.get("communication_style")
    provider = _provider_override(request)

    try:
        reply = await run_chat(messages, provider, body_style=body_style)
    except Exception as e:  # noqa
        print("[chat/completions] 异常回退：", e)
        reply = ""  # 空串由前端兜底提示

    # 兼容前端 callCozeBot 解析：choices[0].message.content
    return {"choices": [{"message": {"role": "assistant", "content": reply}}]}


@app.post("/ocr")
async def ocr(request: Request, file: UploadFile = File(...)):
    """简历/经历图片 OCR：调用 Qwen 视觉模型识别文字，返回纯文本。
    图片仅在本机后端（LangChain）解析，不落盘、不外传第三方。"""
    _check_auth(request.headers.get("Authorization"))
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="空文件")
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="图片过大（>10MB），请压缩后重试")
    import base64
    mime = file.content_type or "image/jpeg"
    b64 = base64.b64encode(data).decode("utf-8")
    data_url = f"data:{mime};base64,{b64}"
    from config import get_vision_llm
    llm, _ = get_vision_llm()
    if not llm:
        raise HTTPException(status_code=503, detail="OCR 不可用：未配置 QWEN_API_KEY（视觉模型所需）")
    from langchain_core.messages import HumanMessage
    prompt = (
        "请识别这张简历/经历图片中的所有文字内容，尽量保持原有段落与排版顺序，"
        "直接输出识别出的纯文本，不要添加任何解释、编号或 Markdown 符号。"
    )
    try:
        resp = await llm.ainvoke([
            HumanMessage(content=[
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": data_url}},
            ])
        ])
        content = resp.content
        text = content if isinstance(content, str) else "".join(
            getattr(p, "text", "") for p in content
        )
    except Exception as e:  # noqa
        print("[ocr] 识别异常：", e)
        raise HTTPException(status_code=502, detail=f"OCR 识别失败：{e}")
    text = (text or "").strip()
    return {"code": 0, "text": text}


def template_fallback(workflow_id: str, parameters: dict) -> dict:
    from templates import template_report, template_rewrite
    if workflow_id == WF_REWRITE:
        return template_rewrite(parameters)
    return template_report(parameters)


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
