# -*- coding: utf-8 -*-
"""
数据契约（Pydantic）
====================
与前端 normalizeReport / renderReport 期望的 report.tabs 结构、以及
extractBlockContent（读取 data.content）、callCozeBot（读取 choices[0].message.content）
完全对齐，确保后端返回可被前端既有解析逻辑直接消费，无需改动前端业务代码。
"""
from pydantic import BaseModel


class Block(BaseModel):
    title: str
    content: str


class Report(BaseModel):
    """六大模块报告。每个模块是一组内容卡片（标题 + 正文）。"""
    parse: list[Block]      # 经历核心信息
    skills: list[Block]     # 可迁移能力
    match: list[Block]      # 岗位匹配度
    resume: list[Block]     # 简历优化文案
    interview: list[Block]  # 面试问答素材
    tips: list[Block]       # 求职提升建议

    def to_dict(self) -> dict:
        """转成前端 renderReport 使用的 {tabs:{key:[{id,title,content}]}} 结构。"""
        out = {"tabs": {}}
        for key in ["parse", "skills", "match", "resume", "interview", "tips"]:
            blocks = getattr(self, key)
            out["tabs"][key] = [
                {"id": f"{key}-{i + 1}", "title": b.title, "content": b.content}
                for i, b in enumerate(blocks)
            ]
        return out


class RewriteResult(BaseModel):
    """局部改写结果：仅返回改写后的正文文本。"""
    content: str
