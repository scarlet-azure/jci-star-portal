from app.models import StarCategory, Standard, Submission, SubmissionStatus
from sqlalchemy.orm import Session


def calculate_chapter_scores(db: Session, chapter_id: int):
    submissions = (
        db.query(Submission)
        .filter(
            Submission.chapter_id == chapter_id,
            Submission.status == SubmissionStatus.APPROVED,
        )
        .all()
    )

    totals = {
        "Efficiency": 0,
        "Network": 0,
        "Experience": 0,
        "Outreach": 0,
        "Impact": 0,
    }

    for sub in submissions:
        if sub.standard:
            cat_name = sub.standard.star.value
            totals[cat_name] += sub.score_earned

    total_score = sum(totals.values())

    # Kualifikasi Star Rules
    eff_qualified = totals["Efficiency"] >= 100
    net_qualified = (totals["Efficiency"] >= 90) and (totals["Network"] >= 250)
    exp_qualified = (totals["Efficiency"] >= 90) and (
        totals["Experience"] >= 250
    )
    out_qualified = (totals["Efficiency"] >= 90) and (totals["Outreach"] >= 250)
    imp_qualified = (totals["Efficiency"] >= 90) and (totals["Impact"] >= 250)

    stars_status = {
        "Efficiency": eff_qualified,
        "Network": net_qualified,
        "Experience": exp_qualified,
        "Outreach": out_qualified,
        "Impact": imp_qualified,
    }

    qualified_stars_count = sum(1 for v in stars_status.values() if v)

    # Calculation Efficiency Band
    eff_score = totals["Efficiency"]
    if eff_score >= 135:
        eff_band = "Ultra Efficient (135+ pts)"
    elif eff_score >= 120:
        eff_band = "Super Efficient (120-134 pts)"
    elif eff_score >= 100:
        eff_band = "Efficient Management (100-119 pts)"
    elif eff_score >= 90:
        eff_band = "Good Management (90-99 pts)"
    else:
        eff_band = "Under Minimum Standard (<90 pts)"

    return {
        "totals": totals,
        "total_score": total_score,
        "stars_status": stars_status,
        "qualified_stars": qualified_stars_count,
        "eff_band": eff_band,
    }