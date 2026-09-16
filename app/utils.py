from sqlalchemy.orm import Session
from app.models.models import Submission, Standard, SubmissionStatus

def send_reset_email(to_email: str, code: str):
    print(f"[EMAIL MOCK] Verification OTP Code for {to_email}: {code}")

def calculate_chapter_scores(db: Session, chapter_name: str):
    clean_chap = chapter_name.replace("JCI ", "").strip()

    submissions = db.query(Submission).filter(
        Submission.chapter_name.ilike(f"%{clean_chap}%"),
        Submission.status == SubmissionStatus.APPROVED.value
    ).all()

    breakdown = {
        "Efficiency": 0,
        "Network": 0,
        "Experience": 0,
        "Outreach": 0,
        "Impact": 0
    }

    for sub in submissions:
        std = db.query(Standard).filter(Standard.id == sub.standard_id).first()
        if std:
            raw_star = std.star.value if hasattr(std.star, 'value') else str(std.star)
            raw_star = raw_star.split('.')[-1].upper()

            star_map = {
                "EFFICIENCY": "Efficiency",
                "NETWORK": "Network",
                "EXPERIENCE": "Experience",
                "OUTREACH": "Outreach",
                "IMPACT": "Impact"
            }
            
            target_key = star_map.get(raw_star)
            if target_key:
                breakdown[target_key] += (sub.score_earned or 0)

    total_score = sum(breakdown.values())
    eff_score = breakdown["Efficiency"]

    if eff_score >= 135:
        band = "Ultra Efficient Local Organization Management"
    elif eff_score >= 120:
        band = "Super Efficient Local Organization Management"
    elif eff_score >= 100:
        band = "Efficient Local Organization Management"
    elif eff_score >= 90:
        band = "Good Local Organization Management"
    else:
        band = "Under Minimum Standard (<90 pts)"

    qualified_stars = 0
    if eff_score >= 100: qualified_stars += 1
    eff_passed = eff_score >= 90
    if eff_passed and breakdown["Network"] >= 250: qualified_stars += 1
    if eff_passed and breakdown["Experience"] >= 250: qualified_stars += 1
    if eff_passed and breakdown["Outreach"] >= 250: qualified_stars += 1
    if eff_passed and breakdown["Impact"] >= 250: qualified_stars += 1

    return {
        "chapter_name": chapter_name,
        "total_score": total_score,
        "efficiency_band": band,
        "qualified_stars": qualified_stars,
        "breakdown": breakdown
    }