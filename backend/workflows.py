# -*- coding: utf-8 -*-
"""
三大能力（报告 / 改写 / 对话）的 LangChain 实现
=============================================
- 优先用 DeepSeek / Qwen（OpenAI 兼容）通过结构化输出生成；
- 无密钥或调用异常时，自动回退 templates.py 的离线模板，保证链路永不断。
- 报告与聊天都接受 style 参数（默认「通用平衡」），注入完整 voice profile。
"""
import re
import json
from config import get_llm
from schemas import Report, RewriteResult
from prompts import (
    build_report_system_prompt, build_report_user_prompt,
    build_rewrite_system_prompt, build_rewrite_user_prompt,
    build_chat_system_prompt,
)
from templates import template_report, template_rewrite, template_chat
from knowledge import retrieve

# 与前端 STYLES 对齐；命中不到则回落通用平衡
_VALID_STYLES = ("通用平衡", "逻辑严谨型", "共情叙事型", "务实落地型", "灵活探索型")


def _extract_chat_style(messages: list, body_style: str | None = None) -> str:
    """优先取 body_style（前端显式传入），其次在首条 user 消息中解析【沟通风格】标注。"""
    if body_style and body_style in _VALID_STYLES:
        return body_style
    for m in messages or []:
        if m.get("role") == "user":
            txt = m.get("content") or ""
            m1 = re.search(r"【沟通风格】\s*([^\n\r【】]+)", txt)
            if m1:
                cand = m1.group(1).strip()
                # 兼容带括号注解的情况："逻辑严谨型（数据驱动…）"
                cand = re.split(r"[（(]", cand, 1)[0].strip()
                if cand in _VALID_STYLES:
                    return cand
            break
    return "通用平衡"


async def run_report(parameters: dict, provider: str | None = None) -> dict:
    llm, api_key, _ = get_llm(provider)
    style = parameters.get("style") if parameters.get("style") in _VALID_STYLES else "通用平衡"
    if not api_key:
        return template_report(parameters)
    try:
        # 节点3 等效：依据目标岗位 + 阶段检索知识库能力模型，作为分析依据
        kb = retrieve(parameters.get("job", ""), parameters.get("stage", ""))
        # 使用 json_object response_format（DeepSeek/Qwen 均支持），并显式要求 JSON 结构；
        # 避免 response_format: json_schema（deepseek-chat 不支持，会直接 400）
        raw = await llm.ainvoke([
            {"role": "system", "content": build_report_system_prompt(style)},
            {"role": "user", "content": build_report_user_prompt(parameters, kb)
             + "\n\n【输出硬约束】必须且只能返回合法 JSON，"
               "顶层为对象，键固定为 parse/skills/match/resume/interview/tips，"
               "每个键对应一个数组（2-3 个元素），元素结构 {{\"title\":\"\",\"content\":\"\"}}。"}
        ], response_format={"type": "json_object"})
        text = (raw.content or "").strip()
        # 兼容模型偶尔在 JSON 外加 ```json 围栏
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
        obj = json.loads(text)
        # 用 Pydantic 做结构校验（缺模块就补空，确保前端 6 模块契约）
        rep = Report.model_validate(obj)
        return rep.to_dict()
    except Exception as e:  # noqa
        print("[report] LLM 失败，回退模板：", e)
        return template_report(parameters)


async def run_rewrite(parameters: dict, provider: str | None = None) -> dict:
    llm, api_key, _ = get_llm(provider)
    text = (parameters.get("block_content") or "").strip()
    if not api_key or not text:
        return template_rewrite(parameters)
    try:
        # 同样改用 json_object response_format，避免 schema 类型不被支持
        raw = await llm.ainvoke([
            {"role": "system", "content": build_rewrite_system_prompt(parameters)},
            {"role": "user", "content": build_rewrite_user_prompt(parameters)
             + "\n\n【输出硬约束】必须且只能返回合法 JSON：{\"content\":\"...\"}。"}
        ], response_format={"type": "json_object"})
        s = (raw.content or "").strip()
        if s.startswith("```"):
            s = re.sub(r"^```(?:json)?\s*", "", s)
            s = re.sub(r"\s*```$", "", s)
        obj = json.loads(s)
        res = RewriteResult.model_validate(obj)
        return {"content": res.content}
    except Exception as e:  # noqa
        print("[rewrite] LLM 失败，回退模板：", e)
        return template_rewrite(parameters)


async def run_chat(messages: list, provider: str | None = None,
                   body_style: str | None = None) -> str:
    llm, api_key, _ = get_llm(provider)
    style = _extract_chat_style(messages, body_style)
    if not api_key or not messages:
        return template_chat(messages or [])
    try:
        full = [{"role": "system", "content": build_chat_system_prompt(style)}] + messages
        res = await llm.ainvoke(full)
        return res.content
    except Exception as e:  # noqa
        print("[chat] LLM 失败，回退模板：", e)
        return template_chat(messages)
