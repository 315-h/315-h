# -*- coding: utf-8 -*-
"""
知识库检索（轻量、纯 Python、无额外依赖）
========================================
把「产品资料（知识库）_五大岗位_扩充」下的 .txt 加载为文本块，
依据目标岗位 / 职业阶段 / 模块关键词做简单的关键词召回，
返回与当前请求最相关的能力模型与规则片段，作为提示词上下文注入。

设计取舍：
- 不引入向量库，避免重依赖；KB 体量（~10 个文件、每份 6-10KB）关键词召回足够；
- 文件按「章节分隔线」(全 = / ─ 行) 切分，保证召回块语义完整、不被句子切断；
- 召回后拼接为字符串，交给大模型「参考」而非「照搬」，保持生成灵活性。
"""
import os
import re
import glob

KB_DIR = os.path.join(os.path.dirname(__file__), "knowledge")
# 单个召回块的最大字符数，超出则进一步二分，避免单块过长
MAX_CHUNK_CHARS = 1400

# 章节分隔线：整行由 = / ─ / - 等构成（>=3 个）
_DIVIDER_RE = re.compile(r"^[=\-─\-－=_\*]{3,}\s*$")
# 子标题行：以【开头、】结尾，作为块的标题锚点
_HEADING_RE = re.compile(r"^【[^】]{1,40}】\s*$")


def _read_file(path: str) -> str:
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except Exception:
        return ""


def _split_into_blocks(text: str) -> list[str]:
    """按分隔线切分，并把紧跟分隔线后的标题行并入下文。"""
    lines = text.splitlines()
    blocks: list[str] = []
    buf: list[str] = []
    for ln in lines:
        if _DIVIDER_RE.match(ln.strip()):
            if buf:
                blocks.append("\n".join(buf).strip())
                buf = []
            continue
        buf.append(ln)
    if buf:
        blocks.append("\n".join(buf).strip())
    # 清理空块，并对超长块做二次切分
    out: list[str] = []
    for b in blocks:
        b = b.strip()
        if not b:
            continue
        if len(b) <= MAX_CHUNK_CHARS:
            out.append(b)
        else:
            # 按标题行或空行再切，尽量保留结构
            parts = re.split(r"(?=\n【[^】]{1,40}】|\n\s*\n)", b)
            cur = ""
            for p in parts:
                if len(cur) + len(p) <= MAX_CHUNK_CHARS:
                    cur += p
                else:
                    if cur.strip():
                        out.append(cur.strip())
                    cur = p if len(p) <= MAX_CHUNK_CHARS else p[:MAX_CHUNK_CHARS]
            if cur.strip():
                out.append(cur.strip())
    return out


def _load_all() -> list[dict]:
    chunks: list[dict] = []
    for path in sorted(glob.glob(os.path.join(KB_DIR, "*.txt"))):
        name = os.path.splitext(os.path.basename(path))[0]
        text = _read_file(path)
        if not text.strip():
            continue
        for blk in _split_into_blocks(text):
            chunks.append({"source": name, "text": blk})
    return chunks


CHUNKS = _load_all()


def _tokenize(s: str) -> set[str]:
    # 中文按 2-4 字滑动窗口取词，英文按单词；提升召回鲁棒性
    toks: set[str] = set()
    s = s or ""
    for m in re.findall(r"[A-Za-z][A-Za-z0-9+#./\-]{1,}", s):
        toks.add(m.lower())
    han = "".join(re.findall(r"[\u4e00-\u9fff]", s))
    # 2-gram + 3-gram
    for n in (2, 3):
        for i in range(len(han) - n + 1):
            toks.add(han[i:i + n])
    return {t for t in toks if len(t) >= 2}


def retrieve(target_direction: str = "", stage: str = "", top_k: int = 8) -> str:
    """依据岗位方向 + 阶段召回最相关知识块，返回拼接后的上下文字符串。"""
    if not CHUNKS:
        return ""
    query_terms = _tokenize(target_direction) | _tokenize(stage)
    # 方向关键词 boost：文件名含方向词时加分
    scored = []
    for c in CHUNKS:
        text = c["text"]
        # 跳过纯文件用途说明等噪声块
        if text.startswith("文件用途") or text.startswith("通用能力（跨部门"):
            continue
        score = 0
        for t in query_terms:
            if t in text:
                score += 1
        # 来源文件名与方向强相关
        if target_direction and target_direction[:2] in c["source"]:
            score += 4
        if score > 0:
            scored.append((score, c))
    scored.sort(key=lambda x: x[0], reverse=True)
    top = [c for _, c in scored[:top_k]]
    if not top:
        return ""
    return "\n\n".join(f"【知识库·{c['source']}】\n{c['text']}" for c in top)


def kb_status() -> dict:
    """返回知识库加载概况，供 /health 与调试使用。"""
    from collections import Counter
    srcs = Counter(c["source"] for c in CHUNKS)
    return {"loaded_chunks": len(CHUNKS), "sources": dict(srcs)}


if __name__ == "__main__":
    print("chunks:", len(CHUNKS))
    sample = retrieve("数据分析师", "3-5年工作经验", top_k=3)
    print(sample[:800])
