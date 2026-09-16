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

    # Hapus file database lama di root directory jika ada
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
        db.add(User(
            full_name="Daniel Setiawan (National Root Evaluator)",
            email=admin_email,
            username=admin_email,
            hashed_password=hash_password("admin123"),
            role=UserRole.ADMIN,
            chapter_name="National Board",
            is_approved=True
        ))

        sample_pics = [
            ("PIC JCI Jakarta", "pic.jakarta@jci.or.id", "Jakarta"),
            ("PIC JCI Solo", "pic.solo@jci.or.id", "Solo"),
            ("PIC JCI Bali", "pic.bali@jci.or.id", "Bali"),
            ("PIC JCI Surabaya", "pic.surabaya@jci.or.id", "East Java"),
            ("PIC JCI Bandung", "pic.bandung@jci.or.id", "Bandung"),
        ]
        for name, email, chapter in sample_pics:
            db.add(User(
                full_name=name,
                email=email,
                username=email,
                hashed_password=hash_password("password123"),
                role=UserRole.CHAPTER_PIC,
                chapter_name=chapter,
                is_approved=True
            ))
        db.commit()

        # ==========================================
        # 3. SEED ALL 60 STANDARDS DIRECTLY FROM HANDBOOK V1
        # ==========================================
        standards_seed = [
            # ------------------------------------------
            # EFFICIENCY STAR (14 Standards - Target 100 Pts)
            # ------------------------------------------
            ("EFF-01", "Chapter Leadership and Officer Information Update", StarCategory.EFFICIENCY, 
             "Ensure chapter leadership structure is properly recorded and visible for governance and accountability.", 
             "System record, submission timestamp, updated officer roster.", 5, "2026-03-31"),
            
            ("EFF-02", "Governance Documents and Compliance Submission", StarCategory.EFFICIENCY, 
             "Submit all required governance and compliance documents (POA, budget, minutes, constitution).", 
             "Uploaded documents, proof of submission, completion acknowledgment.", 15, "2026-04-15"),
            
            ("EFF-03", "Membership Renewal Progress", StarCategory.EFFICIENCY, 
             "Demonstrate renewal progress against a defined renewal standard based on declared member base.", 
             "Membership renewal records, prior-year membership list, system renewal data.", 10, "2026-05-31"),
            
            ("EFF-04", "Dues Payment and Financial Standing", StarCategory.EFFICIENCY, 
             "Complete required dues payment within the official payment period.", 
             "Payment confirmation, finance records, verified transaction record.", 10, "2026-06-30"),
            
            ("EFF-05", "Awards Participation Submission", StarCategory.EFFICIENCY, 
             "Submit required awards entry or minimum participation defined by JCI Indonesia.", 
             "Awards submission record, confirmation from awards platform, approval record.", 10, "2026-07-15"),
            
            ("EFF-06", "JCI Indonesia Academy Participation", StarCategory.EFFICIENCY, 
             "Register and participate in JCI Indonesia Academy or approved national platform.", 
             "Registration record, attendance record, completion or participation record.", 10, "2026-08-15"),
            
            ("EFF-07", "Board Meeting Governance and Reporting Discipline", StarCategory.EFFICIENCY, 
             "Conduct required board meetings and maintain proper governance records (agenda, minutes).", 
             "Agenda, minutes, attendance list, circulation proof, submission record.", 15, "2026-08-31"),
            
            ("EFF-08", "Mid-Year Review and Performance Reporting", StarCategory.EFFICIENCY, 
             "Complete and submit mid-year review or equivalent performance report.", 
             "Mid-year review report, supporting progress summary, submission record.", 10, "2026-07-31"),
            
            ("EFF-09", "Local Leadership and Officer Training", StarCategory.EFFICIENCY, 
             "Organize or facilitate local officer or leadership training program recognized by JCI Indonesia.", 
             "Event record, attendance list, training agenda, event report.", 10, "2026-09-15"),
            
            ("EFF-10", "Chapter Project Delivery and Reporting", StarCategory.EFFICIENCY, 
             "Complete required project planning and reporting process for a valid chapter project.", 
             "Project plan, completion report, project documentation, basic result evidence.", 15, "2026-10-15"),
            
            ("EFF-11", "Chapter Expansion, Showcase, and Organizational Maturity", StarCategory.EFFICIENCY, 
             "Complete recognized activities showing expansion, showcase participation, or organizational maturity.", 
             "Showcase participation record, report, presentation submission.", 10, "2026-10-31"),
            
            ("EFF-12", "Membership Survey Participation", StarCategory.EFFICIENCY, 
             "Achieve required response level in official membership surveys or feedback instruments.", 
             "Survey response data, participation summary, verified response rate.", 5, "2026-11-15"),
            
            ("EFF-13", "Membership Declaration", StarCategory.EFFICIENCY, 
             "Submit official membership declaration according to national requirements.", 
             "Declaration form, system declaration record, submission confirmation.", 5, "2026-03-31"),
            
            ("EFF-14", "Membership Growth", StarCategory.EFFICIENCY, 
             "Achieve defined growth threshold against prior baseline.", 
             "Membership records, declaration comparison, growth calculation summary.", 10, "2026-11-30"),

            # ------------------------------------------
            # NETWORK STAR (14 Standards - Target 250 Pts)
            # ------------------------------------------
            ("NET-01", "National Leadership Platform Participation", StarCategory.NETWORK, 
             "Send eligible representatives to the recognized national leadership platform.", 
             "Registration, attendance, representative list.", 20, "2026-04-30"),
            
            ("NET-02", "Area Convention Participation", StarCategory.NETWORK, 
             "Send participants to the recognized area convention platform.", 
             "Delegate registration, attendance record.", 20, "2026-05-31"),
            
            ("NET-03", "National Convention Participation", StarCategory.NETWORK, 
             "Send delegates to the JCI Indonesia National Convention.", 
             "Convention registration, attendance data, delegate list.", 35, "2026-10-31"),
            
            ("NET-04", "Strategic Delegation Participation", StarCategory.NETWORK, 
             "Participate in designated strategic delegation opportunities recognized under the program.", 
             "Registration, attendance, representation record.", 15, "2026-06-30"),
            
            ("NET-05", "ASPAC Participation", StarCategory.NETWORK, 
             "Send delegates to the Asia-Pacific Conference (ASPAC).", 
             "Conference registration, attendance record, delegate confirmation.", 35, "2026-06-15"),
            
            ("NET-06", "Other JCI Area Conference Participation", StarCategory.NETWORK, 
             "Send participants to approved JCI area conferences beyond ASPAC.", 
             "Conference registration, attendance, participant record.", 20, "2026-07-31"),
            
            ("NET-07", "World Congress Participation", StarCategory.NETWORK, 
             "Send delegates to JCI World Congress.", 
             "World Congress registration, attendance, delegate list.", 40, "2026-11-15"),
            
            ("NET-08", "Business and Leadership Program Participation", StarCategory.NETWORK, 
             "Participate in designated business and leadership platforms recognized by the movement.", 
             "Program registration, attendance record.", 20, "2026-08-31"),
            
            ("NET-09", "Entrepreneurship and Recognition Program Representation", StarCategory.NETWORK, 
             "Send eligible participants/representatives to designated entrepreneurship programs (CYE, etc.).", 
             "Program registration, delegate list, event confirmation.", 20, "2026-08-15"),
            
            ("NET-10", "National Recognition Program Representation", StarCategory.NETWORK, 
             "Participate in designated recognition-facing national programs.", 
             "Registration, attendance, delegate record.", 25, "2026-09-15"),
            
            ("NET-11", "JCI Indonesia Academy Participation (Network)", StarCategory.NETWORK, 
             "Send delegates and participants to JCI Indonesia Academy.", 
             "Academy registration, attendance record, participation confirmation.", 25, "2026-08-15"),
            
            ("NET-12", "General Membership Networking and Engagement", StarCategory.NETWORK, 
             "Organize/facilitate networking-oriented member engagement activities beyond chapter administration.", 
             "Event record, attendance list, activity report.", 20, "2026-09-30"),
            
            ("NET-13", "Public Debate Representation", StarCategory.NETWORK, 
             "Send participants or representatives to Public Debate flagship platform.", 
             "Participant list, registration record, attendance or bracket.", 25, "2026-07-31"),
            
            ("NET-14", "WFA Participation and Representation", StarCategory.NETWORK, 
             "Participate in World Fellowship Academy (WFA) reflecting chapter representation.", 
             "Registration, attendance, chapter representation record.", 30, "2026-08-31"),

            # ------------------------------------------
            # EXPERIENCE STAR (11 Standards - Target 250 Pts)
            # ------------------------------------------
            ("EXP-01", "Foundational Member Experience", StarCategory.EXPERIENCE, 
             "Provide structured entry experiences for new members through learning and early involvement.", 
             "Training attendance, onboarding record, participation history.", 35, "2026-05-31"),
            
            ("EXP-02", "Continuing Member Development Journey", StarCategory.EXPERIENCE, 
             "Provide continuing development pathways beyond the initial new member experience.", 
             "Training completion records, pathway records, member progression data.", 25, "2026-06-30"),
            
            ("EXP-03", "Public Speaking Competition Experience", StarCategory.EXPERIENCE, 
             "Support member development through participation in Public Speaking competitions.", 
             "Participant record, competition results, event report.", 30, "2026-07-15"),
            
            ("EXP-04", "Public Debate Competition Experience", StarCategory.EXPERIENCE, 
             "Support member critical thinking and structured communication through Public Debate competition.", 
             "Participant list, debate bracket, results, event report.", 30, "2026-07-31"),
            
            ("EXP-05", "Project and Organizing Leadership Experience", StarCategory.EXPERIENCE, 
             "Provide growth through experiential roles like Project Director, Chair, or Organizing Committee.", 
             "Role assignment, project/event record, appointment confirmation.", 45, "2026-08-31"),
            
            ("EXP-06", "Member and Chapter Leadership Recognition", StarCategory.EXPERIENCE, 
             "Fulfill criteria for leadership or member development recognition milestones.", 
             "Recognition record, application, award result, official confirmation.", 20, "2026-09-15"),
            
            ("EXP-07", "Global Networking and Cross-Cultural Experience", StarCategory.EXPERIENCE, 
             "Facilitate member participation in broader JCI global networking or exchange experiences.", 
             "Registration, role record, participation confirmation.", 30, "2026-09-30"),
            
            ("EXP-08", "Junior and Youth Engagement Experience", StarCategory.EXPERIENCE, 
             "Support participation or delivery of youth/student-oriented developmental experiences.", 
             "Event record, participant list, report.", 20, "2026-10-15"),
            
            ("EXP-09", "Alumni Engagement Experience", StarCategory.EXPERIENCE, 
             "Organize activities intentionally involving alumni to create member learning value.", 
             "Event report, participant list, engagement documentation.", 15, "2026-10-31"),
            
            ("EXP-10", "Trainer and Facilitator Development Pathway", StarCategory.EXPERIENCE, 
             "Support members in growing into trainers, facilitators, and knowledge contributors.", 
             "Training records, certification path, facilitation record.", 35, "2026-11-15"),
            
            ("EXP-11", "National Leadership Exposure Experience", StarCategory.EXPERIENCE, 
             "Support members taking part in recognized leadership exposure opportunities beyond local level.", 
             "Role record, appointment record, participation confirmation.", 45, "2026-11-30"),

            # ------------------------------------------
            # OUTREACH STAR (10 Standards - Target 250 Pts)
            # ------------------------------------------
            ("OUT-01", "Impact Storytelling and Publication", StarCategory.OUTREACH, 
             "Contribute stories, publications, or approved narrative content about chapter work.", 
             "Published article, newsletter inclusion, approved media piece.", 25, "2026-05-31"),
            
            ("OUT-02", "Business and External Engagement Program", StarCategory.OUTREACH, 
             "Organize or participate in approved business or external engagement programs with stakeholders.", 
             "Event record, attendance, report, partner record.", 25, "2026-06-30"),
            
            ("OUT-03", "JCI Brand Promotion in Media", StarCategory.OUTREACH, 
             "Generate media presence (press/online/broadcast) highlighting JCI activities.", 
             "Media clipping, article, link, screenshot, publication proof.", 40, "2026-07-31"),
            
            ("OUT-04", "Digital Promotion and Audience Reach", StarCategory.OUTREACH, 
             "Promote approved programs or initiatives through official digital channels.", 
             "Social media insights, screenshots, post links, campaign records.", 35, "2026-08-15"),
            
            ("OUT-05", "Signature Nominations and Public Platforms", StarCategory.OUTREACH, 
             "Participate in outreach flagship platforms (TYOP, CYE, Debate, Public Speaking) for public visibility.", 
             "Nomination records, publicity, program records, event documentation.", 45, "2026-08-31"),
            
            ("OUT-06", "Entrepreneurship Program Outreach", StarCategory.OUTREACH, 
             "Participate in or support designated entrepreneurship outreach platforms.", 
             "Nomination, program record, publicity, attendance.", 35, "2026-09-15"),
            
            ("OUT-07", "Strategic Partnership and Public Engagement", StarCategory.OUTREACH, 
             "Establish or activate partnerships supporting public engagement and chapter visibility.", 
             "Partner confirmation, collaboration record, MOU if applicable.", 35, "2026-09-30"),
            
            ("OUT-08", "Resource Mobilization for JCI Development", StarCategory.OUTREACH, 
             "Contribute to designated resource mobilization, sponsorship, or support efforts.", 
             "Contribution record, sponsor evidence, approved finance documentation.", 35, "2026-10-15"),
            
            ("OUT-09", "External Platform Alignment and Collaboration", StarCategory.OUTREACH, 
             "Participate in or align with approved external platforms relevant to JCI mission.", 
             "Program record, partner/platform documentation, event report.", 25, "2026-10-31"),
            
            ("OUT-10", "Recognition Beyond JCI", StarCategory.OUTREACH, 
             "Participate in recognized external awards or public recognition pathways beyond internal JCI spaces.", 
             "Application record, award record, judging confirmation, recognition evidence.", 30, "2026-11-15"),

            # ------------------------------------------
            # IMPACT STAR (11 Standards - Target 250 Pts)
            # ------------------------------------------
            ("IMP-01", "Strategic Impact Recognition and Submission", StarCategory.IMPACT, 
             "Document and submit qualifying initiatives into recognized impact or strategic contribution platforms.", 
             "Submission record, accepted entry, project report.", 25, "2026-05-31"),
            
            ("IMP-02", "Project and Community Outcome Delivery", StarCategory.IMPACT, 
             "Complete community projects producing meaningful documented results (SDGs / Action Framework).", 
             "Project report, beneficiary/result data, supporting evidence.", 45, "2026-06-30"),
            
            ("IMP-03", "Membership Growth as Movement Contribution", StarCategory.IMPACT, 
             "Achieve growth threshold contributing to the overall strength of the national movement.", 
             "Member database, declaration comparison, growth summary.", 20, "2026-11-30"),
            
            ("IMP-04", "Local Organization Expansion and Development Support", StarCategory.IMPACT, 
             "Contribute to the development, mentoring, support, or strengthening of other chapters.", 
             "Support record, chapter development evidence, official acknowledgment.", 35, "2026-07-31"),
            
            ("IMP-05", "National and Strategic Project Hosting", StarCategory.IMPACT, 
             "Host or co-host approved strategic or national-level initiatives.", 
             "Program record, hosting confirmation, report, official recognition.", 40, "2026-08-31"),
            
            ("IMP-06", "Stakeholder Collaboration and Shared Value Creation", StarCategory.IMPACT, 
             "Demonstrate meaningful co-creation of value with external stakeholders.", 
             "Partner record, stakeholder letter, report, joint activity evidence.", 35, "2026-09-15"),
            
            ("IMP-07", "Service Beyond the Local Chapter", StarCategory.IMPACT, 
             "Demonstrate member or chapter service and contribution to the wider movement beyond local level.", 
             "Appointment records, role confirmation, official acknowledgment.", 30, "2026-09-30"),
            
            ("IMP-08", "Leadership Legacy and Institutional Advancement", StarCategory.IMPACT, 
             "Fulfill criteria strengthening institutional continuity, leadership legacy, or advancement.", 
             "Succession evidence, institutional records, approved submission.", 25, "2026-10-15"),
            
            ("IMP-09", "Long-Term Sustainability and Chapter Contribution", StarCategory.IMPACT, 
             "Meet approved sustainability or structural contribution criteria for JCI's long-term future.", 
             "Contribution record, sustainability evidence, official confirmation.", 25, "2026-10-31"),
            
            ("IMP-10", "Strategic Contribution to Movement Development", StarCategory.IMPACT, 
             "Contribute materially to the wider strategic development of the movement.", 
             "Official record, contribution evidence, submission, report.", 25, "2026-11-15"),
            
            ("IMP-11", "WFA Outcomes and Stakeholder Impact", StarCategory.IMPACT, 
             "Demonstrate measurable outcomes, stakeholder engagement, or broader value produced through WFA.", 
             "Event report, stakeholder evidence, outcome records.", 25, "2026-08-31")
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

            # --- PENDING & REVISION STATUS ---
            ("EFF-05", "East Java", "Awards Entry Draft", "Submitted initial awards draft", 0, SubmissionStatus.PENDING),
            ("NET-13", "Bandung", "Public Debate Candidate", "Waiting for video evidence check", 0, SubmissionStatus.REVISION_REQUESTED),
        ]

        for std_id, cname, title, desc, score, status in sample_submissions:
            db.add(Submission(
                standard_id=std_id,
                chapter_name=cname,
                title=title,
                description=desc,
                url="https://drive.google.com/sample_jci_evidence",
                score_earned=score,
                status=status,
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