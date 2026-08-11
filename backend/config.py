# -*- coding: utf-8 -*-
"""
大模型配置：DeepSeek / 通义千问 Qwen
=====================================
两者均提供 OpenAI 兼容的 Chat Completions 接口，
因此统一用 langchain_openai.ChatOpenAI 封装，仅切换 base_url / model / api_key。
通过环境变量 LLM_PROVIDER 选择默认模型，亦支持每次请求通过
请求头 X-LLM-Provider 或 query 参数 ?provider= 临时覆盖。
"""
import os
from langchain_openai import ChatOpenAI

# 各厂商对应的 OpenAI 兼容接入点与默认模型
PROVIDERS = {
    "deepseek": {
        "base_url": "https://api.deepseek.com",
        "model": os.environ.get("DEEPSEEK_MODEL", "deepseek-chat"),
        "api_key_env": "DEEPSEEK_API_KEY",
    },
    "qwen": {
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "model": os.environ.get("QWEN_MODEL", "qwen-plus"),
        "api_key_env": "QWEN_API_KEY",
    },
}

# 默认模型，取自环境变量，缺省为 deepseek
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "deepseek").strip().lower()


def get_llm(provider: str | None = None, temperature: float = 0.85):
    """返回一个 (ChatOpenAI 实例, api_key, 实际厂商名) 元组。

    - 若未显式指定 provider，使用 LLM_PROVIDER；
    - 若指定厂商不在 PROVIDERS 中，回退 deepseek；
    - api_key 缺失时返回空串，调用方据此走模板兜底。
    - 默认 temperature 由 0.7 提升到 0.85，让多次生成的差异化更明显；
      调用方按需可调整：报告 0.85 / 改写 0.4 / 聊天 0.75。
    """
    prov = (provider or LLM_PROVIDER).strip().lower()
    if prov not in PROVIDERS:
        prov = "deepseek"
    cfg = PROVIDERS[prov]
    api_key = os.environ.get(cfg["api_key_env"], "").strip()
    llm = ChatOpenAI(
        model=cfg["model"],
        api_key=api_key or "EMPTY",
        base_url=cfg["base_url"],
        temperature=temperature,
        max_tokens=4096,
        timeout=90,
    )
    return llm, api_key, prov


def get_vision_llm(temperature: float = 0.2):
    """OCR / 图片理解专用：使用 Qwen 视觉模型（默认 qwen-vl-plus，可用 OCR_MODEL 覆盖）。
    需要 QWEN_API_KEY；缺失时返回 (None, '')，调用方据此返回友好错误。"""
    cfg = PROVIDERS["qwen"]
    api_key = os.environ.get(cfg["api_key_env"], "").strip()
    if not api_key:
        return None, ""
    model = (os.environ.get("OCR_MODEL", "qwen-vl-plus") or "qwen-vl-plus").strip()
    llm = ChatOpenAI(
        model=model,
        api_key=api_key,
        base_url=cfg["base_url"],
        temperature=temperature,
        max_tokens=4096,
        timeout=120,
    )
    return llm, api_key
