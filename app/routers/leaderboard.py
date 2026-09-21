from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import logging

from app.core.database import get_db
from app.models.models import Chapter, KPISubmission
from app.utils import calculate_chapter_scores

router = APIRouter(tags=["Leaderboard & Archives"])
logger = logging.getLogger(__name__)

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


# ==========================================
# 2. 10-ASPECT KPI LEADERBOARD
# ==========================================
@router.get("/leaderboard/kpi")
def get_kpi_leaderboard(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    try:
        chapters = db.query(Chapter).all()
        kpi_subs = {}
        
        for k in db.query(KPISubmission).all():
            if k.chapter_name:
                clean_k_name = k.chapter_name.replace("JCI ", "").strip().lower()
                kpi_subs[clean_k_name] = k

        results = []
        for chap in chapters:
            c_name = getattr(chap, 'name', '') or ''
            clean_name = c_name.replace("JCI ", "").strip().lower()
            sub = kpi_subs.get(clean_name)

            mem = (sub.membership_data if (sub and sub.membership_data) else {}) or {}
            leg = (sub.legality_data if (sub and sub.legality_data) else {}) or {}
            poa = (sub.poa_data if (sub and sub.poa_data) else {}) or {}

            s1_mem = (mem.get("lbod_status_score", 0) or 0) + (mem.get("declare_status_score", 0) or 0) + (mem.get("dues_status_score", 0) or 0) + (mem.get("has_database_score", 0) or 0)
            s2_leg = (25 if leg.get("adart") else 0) + (10 if leg.get("notaris") else 0) + (25 if leg.get("sk") else 0) + (10 if leg.get("npwp") else 0) + (10 if leg.get("bank") else 0) + (25 if leg.get("pajak") else 0) + (25 if leg.get("keuangan") else 0) + (30 if leg.get("audit") else 0)
            s3_poa = (poa.get("time_score", 0) or 0)

            total_score = sub.evaluator_score if (sub and sub.evaluator_score) else 0
            s4_10_act = max(0, total_score - (max(0, s1_mem) + s2_leg + max(0, s3_poa)))

            results.append({
                "chapter_id": chap.id,
                "chapter_name": chap.name,
                "nvp_name": getattr(chap, 'nvp_name', 'Unassigned') or 'Unassigned',
                "evaluator_score": total_score,
                "status": sub.status if sub else "Not Submitted",
                "evaluated_at": sub.evaluated_at.strftime("%d %b %Y") if (sub and getattr(sub, 'evaluated_at', None)) else "-",
                "sections": {
                    "s1": max(0, s1_mem),
                    "s2": s2_leg,
                    "s3": max(0, s3_poa),
                    "s4_10": s4_10_act
                }
            })

        results.sort(key=lambda x: x["evaluator_score"], reverse=True)
        return results
    except Exception as e:
        logger.error(f"Error pada GET /leaderboard/kpi: {str(e)}", exc_info=True)
        return []