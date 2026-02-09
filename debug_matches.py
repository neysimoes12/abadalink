from sqlalchemy.orm import Session
from database_models import engine, User, AbadaListing, Base
import uuid

def debug_matches():
    session = Session(engine)
    email = "ney@gmail.com"
    user = session.query(User).filter(User.email == email).first()
    
    if not user:
        print("User not found")
        return

    print(f"🔍 Buscando matches para {user.name} ({user.id})...")
    
    my_listings = session.query(AbadaListing).filter(
        AbadaListing.seller_id == user.id,
        AbadaListing.status == "AVAILABLE"
    ).all()
    
    other_listings = session.query(AbadaListing).filter(
        AbadaListing.status == "AVAILABLE",
        AbadaListing.seller_id != user.id
    ).all()
    
    print(f"  - Meus Anúncios: {len(my_listings)}")
    print(f"  - Outros Anúncios: {len(other_listings)}")
    
    match_count = 0
    same_event_count = 0
    
    for my in my_listings:
        my_has = my.event_name
        my_wants = [x.strip() for x in (my.interest_event_name or "").split(",") if x.strip()]
        
        for other in other_listings:
            other_has = other.event_name
            other_wants = [x.strip() for x in (other.interest_event_name or "").split(",") if x.strip()]
            
            i_have_what_they_want = my_has in other_wants or any(my_has in w for w in other_wants)
            they_have_what_i_want = other_has in my_wants or any(other_has in w for w in my_wants)
            
            if i_have_what_they_want and they_have_what_i_want:
                print(f"  ✅ PERFECT: {my_has} <-> {other_has}")
                match_count += 1
            elif i_have_what_they_want or they_have_what_i_want:
                # print(f"  ⚠️ PARTIAL: {my_has} -> {other_has}")
                match_count += 1
            elif my.event_name == other.event_name and my.event_date == other.event_date:
                print(f"  🎉 SAME_EVENT: {my.event_name} ({my.event_date})")
                same_event_count += 1
                match_count += 1
    
    print(f"\n📊 Total Matches: {match_count}")
    print(f"📊 Same Event Matches: {same_event_count}")

if __name__ == "__main__":
    debug_matches()
