import os
import sys
from pathlib import Path

# Pastikan Root Project & folder app terdaftar di sys.path
CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent

if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from sqlalchemy.orm import Session
from app.core.database import engine, SessionLocal, Base, DB_PATH
from app.core.security import hash_password
from app.models.models import (
    User, 
    UserRole, 
    Chapter, 
    Standard, 
    Submission, 
    SubmissionStatus, 
    StarCategory
)

def seed_database():
    print(f"Targeting root database at: {DB_PATH}")
    engine.dispose()

    # Hapus file database lama jika ada
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
            print(f"File database '{DB_PATH}' berhasil dihapus.")
        except Exception as e:
            print(f"Gagal menghapus file db: {e}")

    # Buat ulang seluruh tabel database berdasarkan model terbaru
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("Seeding database based on JCI Indonesia Star Excellence Handbook V1...")

        # ==========================================
        # 1. SEED 18 OFFICIAL CHAPTERS
        # ==========================================
        chapters_list = [
            "Badung Bali", "Bali", "Bandung", "Batavia", "Bogor City", "Borobudur", 
            "Central Java", "Dewata", "East Java", "Femme", "Jakarta", "Jayakarta", 
            "Medan", "Nusantara", "Srikandi", "Solo", "West Sumatera", "Yogyakarta"
        ]
        for cname in chapters_list:
            db.add(Chapter(name=cname))
        db.commit()

        # ==========================================
        # 2. SEED ROOT ADMIN & PICS
        # ==========================================
        admin_email = "danielsetiawan22@gmail.com"
        admin_user = User(
            full_name="Daniel Setiawan (National Root Evaluator)",
            email=admin_email,
            username=admin_email,
            hashed_password=hash_password("admin123"),
            role=UserRole.ADMIN,
            chapter_name="National Board",
            is_approved=True
        )
        db.add(admin_user)

        sample_pics = [
            ("PIC JCI Jakarta", "pic.jakarta@jci.or.id", "Jakarta"),
            ("PIC JCI Solo", "pic.solo@jci.or.id", "Solo"),
            ("PIC JCI Bali", "pic.bali@jci.or.id", "Bali"),
            ("PIC JCI Surabaya", "pic.surabaya@jci.or.id", "East Java"),
            ("PIC JCI Bandung", "pic.bandung@jci.or.id", "Bandung"),
        ]
        
        pic_users = {}
        for name, email, chapter in sample_pics:
            u = User(
                full_name=name,
                email=email,
                username=email,
                hashed_password=hash_password("password123"),
                role=UserRole.CHAPTER_PIC,
                chapter_name=chapter,
                is_approved=True
            )
            db.add(u)
            pic_users[chapter] = u

        db.commit()

        # Refresh user ID untuk relasi
        db.refresh(admin_user)
        for c in pic_users:
            db.refresh(pic_users[c])

        # ==========================================
        # 3. SEED STANDARDS
        # ==========================================
        standards_seed = [
            # EFFICIENCY STAR
            ("EFF-01", "Chapter Leadership and Officer Information Update", StarCategory.EFFICIENCY, 
             "Ensure chapter leadership structure is properly recorded.", "System record, updated officer roster.", 5, "2026-03-31"),
            ("EFF-02", "Governance Documents and Compliance Submission", StarCategory.EFFICIENCY, 
             "Submit all required governance documents.", "Uploaded documents, proof of submission.", 15, "2026-04-15"),
            ("EFF-03", "Membership Renewal Progress", StarCategory.EFFICIENCY, 
             "Demonstrate renewal progress based on declared member base.", "Membership renewal records.", 10, "2026-05-31"),
            ("EFF-04", "Dues Payment and Financial Standing", StarCategory.EFFICIENCY, 
             "Complete required dues payment within the official payment period.", "Payment confirmation, finance records.", 10, "2026-06-30"),
            ("EFF-05", "Awards Participation Submission", StarCategory.EFFICIENCY, 
             "Submit required awards entry defined by JCI Indonesia.", "Awards submission record.", 10, "2026-07-15"),
            ("EFF-06", "JCI Indonesia Academy Participation", StarCategory.EFFICIENCY, 
             "Register and participate in JCI Indonesia Academy.", "Registration and attendance record.", 10, "2026-08-15"),
            ("EFF-07", "Board Meeting Governance and Reporting Discipline", StarCategory.EFFICIENCY, 
             "Conduct required board meetings and maintain proper governance records.", "Agenda, minutes, attendance list.", 15, "2026-08-31"),
            ("EFF-08", "Mid-Year Review and Performance Reporting", StarCategory.EFFICIENCY, 
             "Complete and submit mid-year review report.", "Mid-year review report.", 10, "2026-07-31"),
            ("EFF-09", "Local Leadership and Officer Training", StarCategory.EFFICIENCY, 
             "Organize or facilitate local officer training program.", "Event record, attendance list.", 10, "2026-09-15"),
            ("EFF-10", "Chapter Project Delivery and Reporting", StarCategory.EFFICIENCY, 
             "Complete required project planning and reporting process.", "Project plan, completion report.", 15, "2026-10-15"),
            ("EFF-11", "Chapter Expansion, Showcase, and Organizational Maturity", StarCategory.EFFICIENCY, 
             "Complete recognized activities showing expansion or maturity.", "Showcase participation record.", 10, "2026-10-31"),
            ("EFF-12", "Membership Survey Participation", StarCategory.EFFICIENCY, 
             "Achieve required response level in official membership surveys.", "Survey response data.", 5, "2026-11-15"),
            ("EFF-13", "Membership Declaration", StarCategory.EFFICIENCY, 
             "Submit official membership declaration according to requirements.", "Declaration form, system record.", 5, "2026-03-31"),
            ("EFF-14", "Membership Growth", StarCategory.EFFICIENCY, 
             "Achieve defined growth threshold against prior baseline.", "Membership records, growth summary.", 10, "2026-11-30"),

            # NETWORK STAR
            ("NET-01", "National Leadership Platform Participation", StarCategory.NETWORK, "Send representatives to national platform.", "Registration, attendance.", 20, "2026-04-30"),
            ("NET-02", "Area Convention Participation", StarCategory.NETWORK, "Send participants to area convention.", "Delegate registration.", 20, "2026-05-31"),
            ("NET-03", "National Convention Participation", StarCategory.NETWORK, "Send delegates to National Convention.", "Convention registration.", 35, "2026-10-31"),
            ("NET-04", "Strategic Delegation Participation", StarCategory.NETWORK, "Participate in strategic delegation.", "Registration, attendance.", 15, "2026-06-30"),
            ("NET-05", "ASPAC Participation", StarCategory.NETWORK, "Send delegates to ASPAC.", "Conference registration.", 35, "2026-06-15"),
            ("NET-06", "Other JCI Area Conference Participation", StarCategory.NETWORK, "Send participants to area conferences.", "Conference registration.", 20, "2026-07-31"),
            ("NET-07", "World Congress Participation", StarCategory.NETWORK, "Send delegates to JCI World Congress.", "World Congress registration.", 40, "2026-11-15"),
            ("NET-08", "Business and Leadership Program Participation", StarCategory.NETWORK, "Participate in business platforms.", "Program registration.", 20, "2026-08-31"),
            ("NET-09", "Entrepreneurship Representation", StarCategory.NETWORK, "Send representatives to CYE.", "Program registration.", 20, "2026-08-15"),
            ("NET-10", "National Recognition Representation", StarCategory.NETWORK, "Participate in recognition programs.", "Registration, attendance.", 25, "2026-09-15"),
            ("NET-11", "JCI Indonesia Academy Participation (Network)", StarCategory.NETWORK, "Send delegates to Academy.", "Academy registration.", 25, "2026-08-15"),
            ("NET-12", "General Membership Networking", StarCategory.NETWORK, "Organize networking activities.", "Event record, attendance.", 20, "2026-09-30"),
            ("NET-13", "Public Debate Representation", StarCategory.NETWORK, "Send participants to Public Debate.", "Participant list.", 25, "2026-07-31"),
            ("NET-14", "WFA Participation and Representation", StarCategory.NETWORK, "Participate in World Fellowship Academy.", "Registration, attendance.", 30, "2026-08-31"),

            # EXPERIENCE STAR
            ("EXP-01", "Foundational Member Experience", StarCategory.EXPERIENCE, "Provide entry experiences for new members.", "Training attendance.", 35, "2026-05-31"),
            ("EXP-02", "Continuing Member Development Journey", StarCategory.EXPERIENCE, "Provide development pathways.", "Training completion records.", 25, "2026-06-30"),
            ("EXP-03", "Public Speaking Competition Experience", StarCategory.EXPERIENCE, "Support Public Speaking competition.", "Participant record.", 30, "2026-07-15"),
            ("EXP-04", "Public Debate Competition Experience", StarCategory.EXPERIENCE, "Support Public Debate competition.", "Participant list, debate bracket.", 30, "2026-07-31"),
            ("EXP-05", "Project and Organizing Leadership Experience", StarCategory.EXPERIENCE, "Provide growth through Chair/OC roles.", "Role assignment.", 45, "2026-08-31"),
            ("EXP-06", "Member Leadership Recognition", StarCategory.EXPERIENCE, "Fulfill criteria for recognition milestones.", "Recognition record.", 20, "2026-09-15"),
            ("EXP-07", "Global Networking Experience", StarCategory.EXPERIENCE, "Facilitate global exchange experiences.", "Registration, role record.", 30, "2026-09-30"),
            ("EXP-08", "Youth Engagement Experience", StarCategory.EXPERIENCE, "Support youth developmental experiences.", "Event record.", 20, "2026-10-15"),
            ("EXP-09", "Alumni Engagement Experience", StarCategory.EXPERIENCE, "Involve alumni for member value.", "Event report.", 15, "2026-10-31"),
            ("EXP-10", "Trainer Development Pathway", StarCategory.EXPERIENCE, "Support members growing into trainers.", "Training records.", 35, "2026-11-15"),
            ("EXP-11", "National Leadership Exposure Experience", StarCategory.EXPERIENCE, "Support national leadership exposure.", "Role record.", 45, "2026-11-30"),

            # OUTREACH STAR
            ("OUT-01", "Impact Storytelling and Publication", StarCategory.OUTREACH, "Contribute stories and publications.", "Published article.", 25, "2026-05-31"),
            ("OUT-02", "External Engagement Program", StarCategory.OUTREACH, "Organize external engagement programs.", "Event record, report.", 25, "2026-06-30"),
            ("OUT-03", "JCI Brand Promotion in Media", StarCategory.OUTREACH, "Generate media presence for JCI.", "Media clipping, proof.", 40, "2026-07-31"),
            ("OUT-04", "Digital Promotion and Audience Reach", StarCategory.OUTREACH, "Promote programs via digital channels.", "Social media insights.", 35, "2026-08-15"),
            ("OUT-05", "Signature Nominations Platform", StarCategory.OUTREACH, "Participate in TYOP, CYE, Debate.", "Nomination records.", 45, "2026-08-31"),
            ("OUT-06", "Entrepreneurship Program Outreach", StarCategory.OUTREACH, "Support entrepreneurship platforms.", "Nomination record.", 35, "2026-09-15"),
            ("OUT-07", "Strategic Partnership", StarCategory.OUTREACH, "Activate partnerships for visibility.", "Partner confirmation, MOU.", 35, "2026-09-30"),
            ("OUT-08", "Resource Mobilization", StarCategory.OUTREACH, "Contribute to resource mobilization.", "Sponsor evidence.", 35, "2026-10-15"),
            ("OUT-09", "External Platform Alignment", StarCategory.OUTREACH, "Align with external platforms.", "Program record.", 25, "2026-10-31"),
            ("OUT-10", "Recognition Beyond JCI", StarCategory.OUTREACH, "Participate in external awards.", "Award record.", 30, "2026-11-15"),

            # IMPACT STAR
            ("IMP-01", "Strategic Impact Recognition", StarCategory.IMPACT, "Document initiatives into impact platforms.", "Submission record.", 25, "2026-05-31"),
            ("IMP-02", "Project and Community Outcome", StarCategory.IMPACT, "Complete community projects with results.", "Project report, beneficiary data.", 45, "2026-06-30"),
            ("IMP-03", "Membership Growth Contribution", StarCategory.IMPACT, "Achieve movement growth threshold.", "Member database comparison.", 20, "2026-11-30"),
            ("IMP-04", "Local Organization Development", StarCategory.IMPACT, "Mentoring or strengthening other chapters.", "Support record.", 35, "2026-07-31"),
            ("IMP-05", "National Project Hosting", StarCategory.IMPACT, "Host or co-host national initiatives.", "Program record, hosting proof.", 40, "2026-08-31"),
            ("IMP-06", "Stakeholder Collaboration", StarCategory.IMPACT, "Co-creation of value with stakeholders.", "Partner record.", 35, "2026-09-15"),
            ("IMP-07", "Service Beyond Local Chapter", StarCategory.IMPACT, "Demonstrate service to wider movement.", "Appointment records.", 30, "2026-09-30"),
            ("IMP-08", "Leadership Legacy", StarCategory.IMPACT, "Strengthen institutional continuity.", "Succession evidence.", 25, "2026-10-15"),
            ("IMP-09", "Long-Term Sustainability", StarCategory.IMPACT, "Meet sustainability criteria.", "Contribution record.", 25, "2026-10-31"),
            ("IMP-10", "Strategic Contribution to Movement", StarCategory.IMPACT, "Contribute to strategic movement.", "Official record.", 25, "2026-11-15"),
            ("IMP-11", "WFA Outcomes and Stakeholder Impact", StarCategory.IMPACT, "Demonstrate measurable WFA outcomes.", "Outcome records.", 25, "2026-08-31")
        ]

        for code, name, star, purpose, evidence, max_score, deadline in standards_seed:
            db.add(Standard(
                id=code,
                name=name,
                star=star,
                purpose=purpose,
                requirement=purpose,
                evidence_guide=evidence,
                max_score=max_score,
                deadline=deadline
            ))
        db.commit()

        # ==========================================
        # 4. SAMPLE SUBMISSIONS FOR TESTING
        # ==========================================
        sample_submissions = [
            # --- JCI JAKARTA ---
            ("EFF-01", "Jakarta", "LBOD 2026 Updated", "Officer roster updated in national portal", 5, SubmissionStatus.APPROVED),
            ("EFF-02", "Jakarta", "Governance Docs 2026", "AD/ART & SK Kemenkumham submitted", 15, SubmissionStatus.APPROVED),
            ("EFF-04", "Jakarta", "National Dues Payment 2026", "Financial dues fully paid for 2026", 10, SubmissionStatus.APPROVED),
            ("EFF-07", "Jakarta", "Board Meeting Q1-Q2 Minutes", "Minutes of 4 official board meetings", 15, SubmissionStatus.APPROVED),
            ("EFF-10", "Jakarta", "Flagship Project Delivery", "Completed Business Summit project report", 15, SubmissionStatus.APPROVED),
            ("EFF-13", "Jakarta", "Official Member Declaration", "Declared 120 active members", 5, SubmissionStatus.APPROVED),
            ("EFF-14", "Jakarta", "Membership Growth Achievement", "Achieved +25% active member growth", 10, SubmissionStatus.APPROVED),
            
            ("NET-01", "Jakarta", "Delegation to NBM 2026", "Sent 12 representatives to NBM", 20, SubmissionStatus.APPROVED),
            ("NET-03", "Jakarta", "National Convention Delegation", "Registered 25 members to NatCon", 35, SubmissionStatus.APPROVED),
            ("NET-05", "Jakarta", "ASPAC Cambodia Delegation", "Sent 8 delegates to ASPAC", 35, SubmissionStatus.APPROVED),
            ("NET-07", "Jakarta", "World Congress Delegation", "Registered 5 members for World Congress", 40, SubmissionStatus.APPROVED),
            ("NET-14", "Jakarta", "WFA Academy Delegation", "Participated in World Fellowship Academy", 30, SubmissionStatus.APPROVED),
            
            ("EXP-01", "Jakarta", "New Member Onboarding Bootcamp", "Trained 35 new members", 35, SubmissionStatus.APPROVED),
            ("EXP-03", "Jakarta", "Public Speaking Winner Submission", "Chapter winner for Public Speaking", 30, SubmissionStatus.APPROVED),
            ("EXP-05", "Jakarta", "Organizing Committee Leadership", "Assigned 15 members to Chair positions", 45, SubmissionStatus.APPROVED),
            ("EXP-10", "Jakarta", "Certified Trainer Pathway", "3 members passed Official Trainer track", 35, SubmissionStatus.APPROVED),
            
            ("OUT-03", "Jakarta", "Media Exposure in Kompas & CNBC", "5 published press releases on JCI initiatives", 40, SubmissionStatus.APPROVED),
            ("OUT-04", "Jakarta", "Digital Campaign & Reels Reach", "Reached 150k impressions on Instagram", 35, SubmissionStatus.APPROVED),
            ("OUT-05", "Jakarta", "TYOP 2026 Local Nominations", "Submitted 3 official TYOP candidates", 45, SubmissionStatus.APPROVED),
            ("OUT-07", "Jakarta", "Strategic Partnership with Kadin", "Signed MOU for Youth Entrepreneurship", 35, SubmissionStatus.APPROVED),
            
            ("IMP-02", "Jakarta", "Clean Water Project Action Framework", "Benefited 1,200 villagers in West Java", 45, SubmissionStatus.APPROVED),
            ("IMP-05", "Jakarta", "Hosted National Business Forum", "Hosted 400+ attendees national event", 40, SubmissionStatus.APPROVED),
            ("IMP-06", "Jakarta", "Corporate CSR Value Co-Creation", "Co-created digital literacy with Tech Corp", 35, SubmissionStatus.APPROVED),
            ("IMP-11", "Jakarta", "WFA Impact Report & Cross-Border Project", "Joint community action with JCI Japan", 25, SubmissionStatus.APPROVED),

            # --- JCI SOLO ---
            ("EFF-01", "Solo", "LBOD 2026 Officer List", "Official structure updated", 5, SubmissionStatus.APPROVED),
            ("EFF-02", "Solo", "Legal Compliance 2026", "All governance documents submitted", 15, SubmissionStatus.APPROVED),
            ("EFF-07", "Solo", "Board Meeting Minutes Batch 1", "Complete documentation of meetings", 15, SubmissionStatus.APPROVED),
            ("NET-01", "Solo", "NBM Leadership Platform Delegation", "Delegates registered for NBM", 20, SubmissionStatus.APPROVED),
            ("NET-03", "Solo", "National Convention Solo Contingent", "Registered 18 members", 35, SubmissionStatus.APPROVED),
            ("EXP-01", "Solo", "Solo Leadership Academy", "Onboarded 20 new members", 35, SubmissionStatus.APPROVED),
            ("EXP-04", "Solo", "Public Debate Competition Team", "Entered 2 debate teams", 30, SubmissionStatus.APPROVED),
            ("OUT-01", "Solo", "Impact Storytelling in Local Paper", "Feature story in Solopos", 25, SubmissionStatus.APPROVED),
            ("IMP-02", "Solo", "Herbal MSME Empowerment", "Assisted 40 local batik MSMEs", 45, SubmissionStatus.APPROVED),

            # --- JCI BALI ---
            ("EFF-01", "Bali", "Leadership Roster 2026", "Uploaded to system", 5, SubmissionStatus.APPROVED),
            ("EFF-04", "Bali", "Financial Dues Settlement", "Paid 2026 dues", 10, SubmissionStatus.APPROVED),
            ("NET-05", "Bali", "ASPAC Delegation Bali Chapter", "Sent 10 delegates to ASPAC", 35, SubmissionStatus.APPROVED),
            ("NET-07", "Bali", "World Congress Delegation", "Sent 4 delegates", 40, SubmissionStatus.APPROVED),
            ("OUT-03", "Bali", "Media Press Release in Bali Post", "Published local environment action", 40, SubmissionStatus.APPROVED),
            ("OUT-04", "Bali", "Eco-Tourism Digital Campaign", "Achieved 80k reach", 35, SubmissionStatus.APPROVED),
            ("IMP-01", "Bali", "Coral Reef Restoration Impact", "Planted 500 coral units", 25, SubmissionStatus.APPROVED),

            # --- PENDING & REVISION ---
            ("EFF-05", "East Java", "Awards Entry Draft", "Submitted initial awards draft", 0, SubmissionStatus.PENDING),
            ("NET-13", "Bandung", "Public Debate Candidate", "Waiting for video evidence check", 0, SubmissionStatus.REVISION_REQUESTED),
        ]

        for std_id, cname, title, desc, score, status in sample_submissions:
            user_obj = pic_users.get(cname, admin_user)
            db.add(Submission(
                standard_id=std_id,
                chapter_name=cname,
                title=title,
                description=desc,
                url="https://drive.google.com/sample_jci_evidence",
                score_earned=score,
                status=status,
                submitted_by_id=user_obj.id,
                evaluator_notes="Diverifikasi oleh National Evaluator Desk 2026" if status == SubmissionStatus.APPROVED else ("Memerlukan tambahan file bukti" if status == SubmissionStatus.REVISION_REQUESTED else "Menunggu verifikasi")
            ))

        db.commit()
        print(f"Database seeding completed successfully! DB generated at: {DB_PATH}")

    except Exception as e:
        print("Error during seeding:", e)
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()