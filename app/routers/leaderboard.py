import os
import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import logging

from app.core.database import get_db
from app.models.models import Chapter, KPISubmission
from app.utils import calculate_chapter_scores

router = APIRouter(tags=["Leaderboard & Archives"])
logger = logging.getLogger(__name__)

SCHEMA_FILE_PATH = "app/data/kpi_schema.json"

# ==========================================
# 1. STAR PROGRAM LEADERBOARD
# ==========================================
@router.get("/leaderboard")
@router.get("/leaderboard/")
def get_leaderboard(db: Session = Depends(get_db)):
    try:
        chapters = db.query(Chapter).all()
        leaderboard = []

        for chap in chapters:
            # Menggunakan utilitas kalkulasi bawaan Star Program Anda
            scores = calculate_chapter_scores(db, chap.name)
            leaderboard.append(scores)

        # Urutkan berdasarkan qualified stars lalu total score
        leaderboard.sort(key=lambda x: (x.get("qualified_stars", 0), x.get("total_score", 0)), reverse=True)

        for rank, item in enumerate(leaderboard, start=1):
            item["rank"] = rank

        return leaderboard
    except Exception as e:
        logger.error(f"Error pada GET /leaderboard: {str(e)}", exc_info=True)
        return []

## ==========================================
## 2. RENDER STAR PROGRAM LEADERBOARD
## ==========================================

def _compute_dynamic_kpi_sections(sub: KPISubmission, schema: list) -> Dict[str, int]:
    """Menghitung skor per section secara dinamis mengikuti jumlah tab di kpi_schema.json."""
    num_tabs = len(schema) if isinstance(schema, list) else 0
    sections = {f"s{i + 1}": 0 for i in range(num_tabs)}

    if not sub or num_tabs == 0:
        return sections

    raw_data = sub.form_data or sub.membership_data or {}
    if isinstance(raw_data, str):
        try:
            raw_data = json.loads(raw_data)
        except Exception:
            raw_data = {}

    if not isinstance(raw_data, dict):
        return sections

    saved_sec = raw_data.get("_section_scores", {}) if isinstance(raw_data.get("_section_scores"), dict) else {}

    for idx, tab in enumerate(schema):
        sec_key = f"s{idx + 1}"
        tab_id = tab.get("id") if isinstance(tab, dict) else sec_key
        tab_score = 0
        fields = tab.get("fields", []) if isinstance(tab, dict) else []

        # Hitung langsung dari field pada tab tersebut
        calculated_from_fields = False
        for field in fields:
            f_key = field.get("key") or field.get("id")
            if not f_key or f_key not in raw_data:
                continue

            val = raw_data.get(f_key)
            if val is None or val == "":
                continue

            calculated_from_fields = True
            f_type = field.get("type") or field.get("input_type") or ("select" if "options" in field else "text")

            if f_type == "select" and isinstance(field.get("options"), list):
                for opt in field["options"]:
                    opt_label = opt.get("label") or opt.get("value") if isinstance(opt, dict) else opt
                    if str(opt_label) == str(val):
                        opt_pts = opt.get("score") if isinstance(opt, dict) and "score" in opt else (opt.get("points", 0) if isinstance(opt, dict) else 0)
                        tab_score += int(opt_pts or 0)
                        break
            elif f_type == "number":
                try:
                    num = int(float(val))
                    max_pts = int(field.get("max_score") or field.get("max_points") or field.get("weight") or 25)
                    tab_score += min(max(0, num), max_pts)
                except (ValueError, TypeError):
                    pass

        # Jika ada kalkulasi field, pakai nilainya; jika tidak, fallback ke _section_scores
        if calculated_from_fields:
            sections[sec_key] = tab_score
        else:
            sections[sec_key] = int(saved_sec.get(sec_key) or saved_sec.get(tab_id) or 0)

    return sections


@router.get("/leaderboard/kpi")
def get_kpi_leaderboard(year: int = 2026, db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    try:
        schema = []
        if os.path.exists(SCHEMA_FILE_PATH):
            try:
                with open(SCHEMA_FILE_PATH, "r", encoding="utf-8") as f:
                    schema = json.load(f)
            except Exception as e:
                logger.warning(f"Gagal membaca kpi_schema.json: {e}")

        if not isinstance(schema, list):
            schema = []

        # Buat daftar metadata kolom berdasarkan tab yang ada di kpi_schema.json saat ini
        section_meta = []
        for idx, tab in enumerate(schema):
            sec_key = f"s{idx + 1}"
            full_title = (tab.get("title") or tab.get("id") or f"Section {idx + 1}") if isinstance(tab, dict) else f"Section {idx + 1}"
            # Buat label pendek untuk header tabel, misal: "S1", "S2", dst.
            short_label = f"S{idx + 1}"
            section_meta.append({
                "key": sec_key,
                "short_label": short_label,
                "title": full_title
            })

        chapters = db.query(Chapter).all()
        kpi_subs = {}
        
        for k in db.query(KPISubmission).filter(KPISubmission.year == year).all():
            if k.chapter_name:
                clean_k_name = k.chapter_name.replace("JCI ", "").strip().lower()
                kpi_subs[clean_k_name] = k

        results = []
        for chap in chapters:
            c_name = getattr(chap, 'name', '') or ''
            clean_name = c_name.replace("JCI ", "").strip().lower()
            sub = kpi_subs.get(clean_name)

            sections = _compute_dynamic_kpi_sections(sub, schema)
            calculated_total = sum(sections.values())

            total_score = 0
            if sub:
                total_score = sub.evaluator_score if (sub.evaluator_score and sub.evaluator_score > 0) else (sub.self_score or calculated_total)

            results.append({
                "chapter_id": chap.id,
                "chapter_name": chap.name,
                "nvp_name": getattr(chap, 'nvp_name', 'Unassigned') or 'Unassigned',
                "self_score": calculated_total,
                "evaluator_score": total_score,
                "status": sub.status if sub else "Not Submitted",
                "evaluated_at": sub.evaluated_at.strftime("%d %b %Y") if (sub and getattr(sub, 'evaluated_at', None)) else "-",
                "sections": sections,
                "section_meta": section_meta
            })

        results.sort(key=lambda x: x["evaluator_score"], reverse=True)
        return results
    except Exception as e:
        logger.error(f"Error pada GET /leaderboard/kpi: {str(e)}", exc_info=True)
        return []