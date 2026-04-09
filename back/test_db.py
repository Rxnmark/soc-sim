from database import SessionLocal, engine, Base
import models
from sqlalchemy.exc import SQLAlchemyError

def test_connection():
    print("Testing database connection...")
    db = SessionLocal()
    try:
        # Test 1: Basic query
        count = db.query(models.Equipment).count()
        print(f"Successfully connected. Equipment count: {count}")

        # Test 2: The problematic query from get_all_equipment
        print("Testing RiskAssessment query...")
        if count > 0:
            eq = db.query(models.Equipment).first()
            print(f"Testing risk for equipment: {eq.name} (ID: {eq.id})")
            risk = db.query(models.RiskAssessment)\
                .filter(models.RiskAssessment.equipment_id == eq.id, models.RiskAssessment.is_resolved == False)\
                .order_by(models.RiskAssessment.risk_level.desc())\
                .first()
            if risk:
                print(f"Found risk: {risk.risk_level} - {risk.description}")
            else:
                print("No active risks found for this equipment.")
        
        print("All tests passed successfully!")
    except SQLAlchemyError as e:
        print(f"SQLAlchemy Error encountered: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_connection()